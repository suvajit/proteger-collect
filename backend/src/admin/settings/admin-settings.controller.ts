import { Controller, Get, Patch, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PrismaService } from '../../prisma/prisma.service';
import { IsEmail, IsOptional } from 'class-validator';

class UpdateSettingsDto {
  @IsOptional() @IsEmail() notification_email?: string;
}

@Controller('admin/settings')
@UseGuards(AuthGuard('jwt-access'), RolesGuard)
@Roles('admin')
export class AdminSettingsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getAll() {
    const settings = await this.prisma.setting.findMany();
    return Object.fromEntries(settings.map((s) => [s.key, s.value]));
  }

  @Patch()
  async update(@Body() dto: UpdateSettingsDto) {
    const updates = Object.entries(dto).filter(([, v]) => v !== undefined);
    await Promise.all(
      updates.map(([key, value]) =>
        this.prisma.setting.upsert({
          where: { key },
          update: { value: value as string },
          create: { key, value: value as string },
        }),
      ),
    );
    return { updated: updates.length };
  }
}
