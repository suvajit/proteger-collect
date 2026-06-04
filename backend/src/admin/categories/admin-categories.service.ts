import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminCategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.checklistCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { items: { where: { isActive: true } } } } },
    });
  }

  findOne(id: string) {
    return this.prisma.checklistCategory.findUniqueOrThrow({ where: { id } });
  }

  create(data: { name: string; sortOrder?: number }) {
    return this.prisma.checklistCategory.create({
      data: { name: data.name, sortOrder: data.sortOrder ?? 999 },
    });
  }

  async update(id: string, data: { name?: string; sortOrder?: number; isActive?: boolean }) {
    return this.prisma.checklistCategory.update({ where: { id }, data });
  }

  async remove(id: string) {
    return this.prisma.checklistCategory.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
