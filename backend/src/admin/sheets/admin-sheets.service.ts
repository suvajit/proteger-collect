import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminSheetsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filters: {
    date?: string;
    supervisorId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { date, supervisorId, status, page = 1, limit = 20 } = filters;
    const where: any = {};
    if (date) where.sheetDate = new Date(date);
    if (supervisorId) where.supervisorId = supervisorId;
    if (status) where.status = status;

    const [sheets, total] = await Promise.all([
      this.prisma.dailySheet.findMany({
        where,
        include: {
          supervisor: { select: { id: true, fullName: true, username: true } },
          site: { select: { id: true, name: true } },
          entries: { select: { status: true } },
        },
        orderBy: { sheetDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.dailySheet.count({ where }),
    ]);

    return {
      data: sheets.map((s) => {
        const total = s.entries.length;
        const completed = s.entries.filter((e) => e.status !== 'pending').length;
        const issues = s.entries.filter((e) => e.status === 'issue').length;
        return {
          id: s.id,
          sheetDate: s.sheetDate,
          status: s.status,
          submittedAt: s.submittedAt,
          supervisor: s.supervisor,
          site: s.site,
          progress: { completed, total },
          issueCount: issues,
          completionPct: total ? Math.round((completed / total) * 100) : 0,
        };
      }),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string) {
    return this.prisma.dailySheet.findUniqueOrThrow({
      where: { id },
      include: {
        supervisor: { select: { id: true, fullName: true, username: true } },
        site: { select: { id: true, name: true } },
        entries: { orderBy: { createdAt: 'asc' } },
      },
    });
  }

  async unlockSheet(id: string) {
    return this.prisma.dailySheet.update({
      where: { id },
      data: { status: 'draft', submittedAt: null },
      select: { id: true, status: true, submittedAt: true },
    });
  }

  async getIssues(filters: { from?: string; to?: string; siteId?: string; page?: number; limit?: number }) {
    const { from, to, siteId, page = 1, limit = 50 } = filters;
    const where: any = { status: 'issue' };
    if (siteId) where.sheet = { siteId };
    if (from || to) {
      where.sheet = { ...where.sheet, sheetDate: {} };
      if (from) where.sheet.sheetDate.gte = new Date(from);
      if (to) where.sheet.sheetDate.lte = new Date(to);
    }

    const [entries, total] = await Promise.all([
      this.prisma.checkEntry.findMany({
        where,
        include: {
          sheet: {
            include: {
              supervisor: { select: { id: true, fullName: true } },
              site: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.checkEntry.count({ where }),
    ]);

    return { data: entries, total, page, limit };
  }

  async getIssueStats(from?: string, to?: string) {
    const where: any = { status: 'issue' };
    if (from || to) {
      where.sheet = { sheetDate: {} };
      if (from) where.sheet.sheetDate.gte = new Date(from);
      if (to) where.sheet.sheetDate.lte = new Date(to);
    }

    const issues = await this.prisma.checkEntry.findMany({
      where,
      select: {
        id: true,
        categoryName: true,
        itemTitle: true,
        isResolved: true,
        completedAt: true,
        resolvedAt: true,
        createdAt: true,
      },
    });

    // Pareto: count by category
    const categoryCount: Record<string, number> = {};
    for (const i of issues) {
      categoryCount[i.categoryName] = (categoryCount[i.categoryName] ?? 0) + 1;
    }
    const pareto = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({ category, count }));
    const totalIssues = issues.length;
    let cumulative = 0;
    const paretoWithCumulative = pareto.map((p) => {
      cumulative += p.count;
      return { ...p, cumulativePct: Math.round((cumulative / totalIssues) * 100) };
    });

    // Age buckets for open issues (in hours)
    const now = new Date();
    const ageBuckets = { '<1d': 0, '1-3d': 0, '3-7d': 0, '>7d': 0 };
    for (const i of issues.filter((x) => !x.isResolved)) {
      const ageHours = (now.getTime() - new Date(i.createdAt).getTime()) / 3_600_000;
      if (ageHours < 24) ageBuckets['<1d']++;
      else if (ageHours < 72) ageBuckets['1-3d']++;
      else if (ageHours < 168) ageBuckets['3-7d']++;
      else ageBuckets['>7d']++;
    }
    const ageChart = Object.entries(ageBuckets).map(([bucket, count]) => ({ bucket, count }));

    // MTTR: mean time to resolve in hours (resolved issues with both completedAt and resolvedAt)
    const resolved = issues.filter((i) => i.isResolved && i.resolvedAt && i.completedAt);
    const mttrHours =
      resolved.length > 0
        ? resolved.reduce((sum, i) => {
            return sum + (new Date(i.resolvedAt!).getTime() - new Date(i.completedAt!).getTime()) / 3_600_000;
          }, 0) / resolved.length
        : null;

    // MTBF: mean time between consecutive issues (hours between issue occurrences, globally)
    const sortedByTime = [...issues]
      .filter((i) => i.completedAt)
      .sort((a, b) => new Date(a.completedAt!).getTime() - new Date(b.completedAt!).getTime());
    let mtbfHours: number | null = null;
    if (sortedByTime.length >= 2) {
      const gaps: number[] = [];
      for (let i = 1; i < sortedByTime.length; i++) {
        const gap =
          (new Date(sortedByTime[i].completedAt!).getTime() -
            new Date(sortedByTime[i - 1].completedAt!).getTime()) /
          3_600_000;
        gaps.push(gap);
      }
      mtbfHours = gaps.reduce((s, g) => s + g, 0) / gaps.length;
    }

    return {
      totalIssues,
      openIssues: issues.filter((i) => !i.isResolved).length,
      resolvedIssues: issues.filter((i) => i.isResolved).length,
      paretoChart: paretoWithCumulative,
      ageChart,
      mttrHours: mttrHours !== null ? Math.round(mttrHours * 10) / 10 : null,
      mtbfHours: mtbfHours !== null ? Math.round(mtbfHours * 10) / 10 : null,
    };
  }

  async getDashboardSummary(date?: string) {
    const d = date ? new Date(date) : new Date();
    d.setHours(0, 0, 0, 0);

    const [totalSheets, submittedSheets, entries] = await Promise.all([
      this.prisma.dailySheet.count({ where: { sheetDate: d } }),
      this.prisma.dailySheet.count({ where: { sheetDate: d, status: 'submitted' } }),
      this.prisma.checkEntry.findMany({
        where: { sheet: { sheetDate: d } },
        select: { status: true },
      }),
    ]);

    const totalEntries = entries.length;
    const completedEntries = entries.filter((e) => e.status !== 'pending').length;
    const openIssues = entries.filter((e) => e.status === 'issue').length;

    return {
      date: d,
      totalSheets,
      submittedSheets,
      totalEntries,
      completedEntries,
      openIssues,
      completionPct: totalEntries ? Math.round((completedEntries / totalEntries) * 100) : 0,
    };
  }
}
