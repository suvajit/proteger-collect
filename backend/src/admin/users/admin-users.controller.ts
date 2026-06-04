import { Controller, Get, Post, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminUsersService } from './admin-users.service';
import { IsString, IsOptional, IsEmail, IsEnum, IsBoolean, MinLength } from 'class-validator';
import { Role } from '@prisma/client';

class CreateUserDto {
  @IsString() fullName: string;
  @IsString() username: string;
  @IsOptional() @IsEmail() email?: string;
  @IsEnum(Role) role: Role;
  @IsOptional() @IsString() siteId?: string;
  @IsString() @MinLength(8) tempPassword: string;
}
class UpdateUserDto {
  @IsOptional() @IsString() fullName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() siteId?: string;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class ResetPasswordDto { @IsString() @MinLength(8) tempPassword: string; }

@Controller('admin/users')
@UseGuards(AuthGuard('jwt-access'), RolesGuard)
@Roles('admin')
export class AdminUsersController {
  constructor(private service: AdminUsersService) {}

  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateUserDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateUserDto) { return this.service.update(id, dto); }
  @Post(':id/reset-password') resetPassword(@Param('id') id: string, @Body() dto: ResetPasswordDto) { return this.service.resetPassword(id, dto.tempPassword); }
}
