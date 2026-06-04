import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Frequency } from '@prisma/client';

@Injectable()
export class AdminItemsService {
  constructor(private prisma: PrismaService) {}

  findAll(categoryId?: string) {
    return this.prisma.checklistItem.findMany({
      where: categoryId ? { categoryId } : undefined,
      include: { category: { select: { id: true, name: true } } },
      orderBy: [{ category: { sortOrder: 'asc' } }, { sortOrder: 'asc' }],
    });
  }

  findOne(id: string) {
    return this.prisma.checklistItem.findUniqueOrThrow({
      where: { id },
      include: { category: true },
    });
  }

  create(data: {
    categoryId: string;
    title: string;
    description?: string;
    frequency?: Frequency;
    requiresPhoto?: boolean;
    sortOrder?: number;
  }) {
    return this.prisma.checklistItem.create({ data: { ...data, sortOrder: data.sortOrder ?? 999 } });
  }

  update(id: string, data: {
    categoryId?: string;
    title?: string;
    description?: string;
    frequency?: Frequency;
    requiresPhoto?: boolean;
    sortOrder?: number;
    isActive?: boolean;
  }) {
    return this.prisma.checklistItem.update({ where: { id }, data });
  }

  remove(id: string) {
    return this.prisma.checklistItem.update({ where: { id }, data: { isActive: false } });
  }

  async reorder(items: { id: string; sortOrder: number }[]) {
    await Promise.all(
      items.map((item) =>
        this.prisma.checklistItem.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } }),
      ),
    );
    return { updated: items.length };
  }
}
