import { Module } from '@nestjs/common';
import { AdminSettingsController } from './settings/admin-settings.controller';
import { AdminSheetsController } from './sheets/admin-sheets.controller';
import { AdminSheetsService } from './sheets/admin-sheets.service';
import { AdminCategoriesController } from './categories/admin-categories.controller';
import { AdminCategoriesService } from './categories/admin-categories.service';
import { AdminItemsController } from './items/admin-items.controller';
import { AdminItemsService } from './items/admin-items.service';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';

@Module({
  controllers: [
    AdminSettingsController,
    AdminSheetsController,
    AdminCategoriesController,
    AdminItemsController,
    AdminUsersController,
  ],
  providers: [
    AdminSheetsService,
    AdminCategoriesService,
    AdminItemsService,
    AdminUsersService,
  ],
})
export class AdminModule {}
