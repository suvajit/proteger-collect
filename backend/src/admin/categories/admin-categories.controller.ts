import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminCategoriesService } from './admin-categories.service';
import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

class CreateCategoryDto {
  @IsString() name: string;
  @IsOptional() @IsNumber() sortOrder?: number;
}
class UpdateCategoryDto {
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsNumber() sortOrder?: number;
  @IsOptional() @IsBoolean() isActive?: boolean;
}

@Controller('admin/categories')
@UseGuards(AuthGuard('jwt-access'), RolesGuard)
@Roles('admin')
export class AdminCategoriesController {
  constructor(private service: AdminCategoriesService) {}

  @Get() findAll() { return this.service.findAll(); }
  @Get(':id') findOne(@Param('id') id: string) { return this.service.findOne(id); }
  @Post() create(@Body() dto: CreateCategoryDto) { return this.service.create(dto); }
  @Patch(':id') update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) { return this.service.update(id, dto); }
  @Delete(':id') remove(@Param('id') id: string) { return this.service.remove(id); }
}
