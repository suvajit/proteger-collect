import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminItemsService } from './admin-items.service';
import { IsString, IsOptional, IsBoolean, IsEnum, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { Frequency } from '@prisma/client';

class CreateItemDto {
  @IsString() categoryId: string;
  @IsString() title: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(Frequency) frequency?: Frequency;
  @IsOptional() @IsBoolean() requiresPhoto?: boolean;
  @IsOptional() @IsNumber() sortOrder?: number;
}
class UpdateItemDto {
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsEnum(Frequency) frequency?: Frequency;
  @IsOptional() @IsBoolean() requiresPhoto?: boolean;
  @IsOptional() @IsNumber() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}
class ReorderItemDto { @IsString() id: string; @IsNumber() sortOrder: number; }
class ReorderDto { @IsArray() @ValidateNested({ each: true }) @Type(() => ReorderItemDto) items: ReorderItemDto[]; }

@Controller('admin/items')
@UseGuards(AuthGuard('jwt-access'), RolesGuard)
@Roles('admin')
export class AdminItemsController {
  constructor(private service: AdminItemsService) {}

  @Get() findAll(@Query('categoryId') categoryId?: string) { return this.service.findAll(categoryId); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateItemDto) { return this.service.create(dto); }
  @Patch('reorder') reorder(@Body() dto: ReorderDto) { return this.service.reorder(dto.items); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateItemDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
