import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Frequency, SheetStatus, EntryStatus } from '@prisma/client';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class SheetsService {
  constructor(
    private prisma: PrismaService,
    private email: EmailService,
  ) {}

  async getOrCreateToday(supervisorId: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let sheet = await this.prisma.dailySheet.findFirst({
      where: { supervisorId, sheetDate: today },
      include: { entries: { orderBy: { createdAt: 'asc' }, include: { item: { select: { requiresPhoto: true } } } } },
    });

    if (!sheet) {
      const dueItems = await this.getDueItems(today);
      sheet = await this.prisma.dailySheet.create({
        data: {
          supervisorId,
          sheetDate: today,
          status: SheetStatus.draft,
          entries: {
            create: dueItems.map((item) => ({
              itemId: item.id,
              itemTitle: item.title,
              categoryName: item.category.name,
              status: EntryStatus.pending,
            })),
          },
        },
        include: { entries: { orderBy: { createdAt: 'asc' }, include: { item: { select: { requiresPhoto: true } } } } },
      });
    }

    return this.formatSheet(sheet);
  }

  async updateEntry(
    sheetId: string,
    entryId: string,
    supervisorId: string,
    dto: UpdateEntryDto,
  ) {
    const sheet = await this.prisma.dailySheet.findUnique({ where: { id: sheetId } });
    if (!sheet) throw new NotFoundException('Sheet not found');
    if (sheet.supervisorId !== supervisorId) throw new ForbiddenException();
    if (sheet.status === SheetStatus.submitted)
      throw new ForbiddenException('Sheet is already submitted');

    const entry = await this.prisma.checkEntry.findFirst({
      where: { id: entryId, sheetId },
      include: { item: true },
    });
    if (!entry) throw new NotFoundException('Entry not found');

    if (dto.status === 'issue' && !dto.remark?.trim()) {
      throw new BadRequestException('Remark is required when status is Issue Found');
    }

    if (dto.status === 'done' && entry.item.requiresPhoto && !dto.photoUrl && !entry.photoUrl) {
      throw new BadRequestException('Photo is required for this item');
    }

    const wasStatusChange =
      dto.status && dto.status !== 'pending' && entry.status === 'pending';

    return this.prisma.checkEntry.update({
      where: { id: entryId },
      data: {
        ...(dto.status && { status: dto.status as EntryStatus }),
        ...(dto.remark !== undefined && { remark: dto.remark }),
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl }),
        ...(wasStatusChange && { completedAt: new Date() }),
      },
    });
  }

  async submitSheet(sheetId: string, supervisorId: string) {
    const sheet = await this.prisma.dailySheet.findUnique({ where: { id: sheetId } });
    if (!sheet) throw new NotFoundException('Sheet not found');
    if (sheet.supervisorId !== supervisorId) throw new ForbiddenException();
    if (sheet.status === SheetStatus.submitted)
      throw new ForbiddenException('Sheet already submitted');

    const updated = await this.prisma.dailySheet.update({
      where: { id: sheetId },
      data: { status: SheetStatus.submitted, submittedAt: new Date() },
    });

    // Send notification email (non-blocking)
    const fullSheet = await this.prisma.dailySheet.findUnique({
      where: { id: sheetId },
      include: {
        supervisor: { select: { fullName: true, username: true } },
        entries: {
          select: {
            itemTitle: true,
            categoryName: true,
            status: true,
            remark: true,
            completedAt: true,
          },
        },
      },
    });
    if (fullSheet) {
      this.email.sendSheetSubmittedEmail(fullSheet as any).catch(() => {});
    }
    return updated;
  }

  async resolveEntry(
    sheetId: string,
    entryId: string,
    supervisorId: string,
    dto: { resolutionRemark?: string; resolutionPhotoUrl?: string },
  ) {
    const sheet = await this.prisma.dailySheet.findUnique({ where: { id: sheetId } });
    if (!sheet) throw new NotFoundException('Sheet not found');
    if (sheet.supervisorId !== supervisorId) throw new ForbiddenException();

    const entry = await this.prisma.checkEntry.findFirst({
      where: { id: entryId, sheetId },
    });
    if (!entry) throw new NotFoundException('Entry not found');
    if (entry.status !== 'issue') throw new BadRequestException('Only issue entries can be resolved');
    if (entry.isResolved) throw new BadRequestException('Entry is already resolved');

    return this.prisma.checkEntry.update({
      where: { id: entryId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
        resolutionRemark: dto.resolutionRemark,
        resolutionPhotoUrl: dto.resolutionPhotoUrl,
      },
    });
  }

  async getMyHistory(supervisorId: string, from?: string, to?: string) {
    const where: Record<string, unknown> = { supervisorId };
    if (from || to) {
      where['sheetDate'] = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(to) }),
      };
    }

    const sheets = await this.prisma.dailySheet.findMany({
      where,
      orderBy: { sheetDate: 'desc' },
      include: {
        entries: { orderBy: { createdAt: 'asc' }, include: { item: { select: { requiresPhoto: true } } } },
      },
    });

    return sheets.map((s) => this.formatSheet(s));
  }

  async getSheetWithEntries(sheetId: string, supervisorId: string) {
    const sheet = await this.prisma.dailySheet.findUnique({
      where: { id: sheetId },
      include: { entries: { orderBy: { createdAt: 'asc' } } },
    });
    if (!sheet) throw new NotFoundException('Sheet not found');
    if (sheet.supervisorId !== supervisorId) throw new ForbiddenException();
    return this.formatSheet(sheet);
  }

  private async getDueItems(date: Date) {
    const dayOfWeek = date.getDay();
    const dayOfMonth = date.getDate();

    const items = await this.prisma.checklistItem.findMany({
      where: { isActive: true },
      include: { category: true },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });

    return items.filter((item) => {
      if (item.frequency === Frequency.daily) return true;
      if (item.frequency === Frequency.weekly) {
        return item.weekday === null || item.weekday === dayOfWeek;
      }
      if (item.frequency === Frequency.monthly) {
        return item.dayOfMonth === null || item.dayOfMonth === dayOfMonth;
      }
      return false;
    });
  }

  private formatSheet(sheet: any) {
    const grouped: Record<string, { categoryName: string; entries: any[] }> = {};

    for (const entry of sheet.entries) {
      if (!grouped[entry.categoryName]) {
        grouped[entry.categoryName] = { categoryName: entry.categoryName, entries: [] };
      }
      const { item, ...rest } = entry;
      grouped[entry.categoryName].entries.push({
        ...rest,
        requiresPhoto: item?.requiresPhoto ?? false,
      });
    }

    const total = sheet.entries.length;
    const completed = sheet.entries.filter(
      (e: any) => e.status !== 'pending',
    ).length;

    return {
      id: sheet.id,
      sheetDate: sheet.sheetDate,
      status: sheet.status,
      submittedAt: sheet.submittedAt,
      progress: { completed, total },
      categories: Object.values(grouped),
    };
  }
}
