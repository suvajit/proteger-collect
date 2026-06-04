import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';

@Injectable()
export class AdminUsersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.user.findMany({
      select: { id: true, fullName: true, username: true, email: true, role: true, siteId: true, isActive: true, mustResetPw: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: { id: true, fullName: true, username: true, email: true, role: true, siteId: true, isActive: true, mustResetPw: true, createdAt: true },
    });
  }

  async create(data: { fullName: string; username: string; email?: string; role: Role; siteId?: string; tempPassword: string }) {
    const exists = await this.prisma.user.findUnique({ where: { username: data.username } });
    if (exists) throw new ConflictException('Username already taken');
    const passwordHash = await argon2.hash(data.tempPassword);
    return this.prisma.user.create({
      data: { fullName: data.fullName, username: data.username, email: data.email, role: data.role, siteId: data.siteId, passwordHash, mustResetPw: true },
      select: { id: true, fullName: true, username: true, role: true, mustResetPw: true },
    });
  }

  async update(id: string, data: { fullName?: string; email?: string; siteId?: string; isActive?: boolean }) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: { id: true, fullName: true, username: true, email: true, role: true, siteId: true, isActive: true, mustResetPw: true },
    });
  }

  async resetPassword(id: string, tempPassword: string) {
    const passwordHash = await argon2.hash(tempPassword);
    await this.prisma.user.update({ where: { id }, data: { passwordHash, mustResetPw: true } });
    return { message: 'Password reset. User must change on next login.' };
  }
}
