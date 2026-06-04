import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { SheetsService } from './sheets.service';
import { UpdateEntryDto } from './dto/update-entry.dto';
import { ResolveEntryDto } from './dto/resolve-entry.dto';

@Controller('sheets')
@UseGuards(AuthGuard('jwt-access'), RolesGuard)
@Roles('supervisor')
export class SheetsController {
  constructor(private sheetsService: SheetsService) {}

  @Get('today')
  getToday(@CurrentUser() user: { sub: string }) {
    return this.sheetsService.getOrCreateToday(user.sub);
  }

  @Get('mine')
  getHistory(
    @CurrentUser() user: { sub: string },
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.sheetsService.getMyHistory(user.sub, from, to);
  }

  @Get(':id')
  getOne(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.sheetsService.getSheetWithEntries(id, user.sub);
  }

  @Patch(':id/entries/:entryId')
  updateEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdateEntryDto,
  ) {
    return this.sheetsService.updateEntry(id, entryId, user.sub, dto);
  }

  @Post(':id/entries/:entryId/resolve')
  resolveEntry(
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: ResolveEntryDto,
  ) {
    return this.sheetsService.resolveEntry(id, entryId, user.sub, dto);
  }

  @Post(':id/submit')
  submit(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.sheetsService.submitSheet(id, user.sub);
  }
}
