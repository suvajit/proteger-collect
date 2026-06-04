import { Controller, Get, Post, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AdminSheetsService } from './admin-sheets.service';

@Controller('admin')
@UseGuards(AuthGuard('jwt-access'), RolesGuard)
@Roles('admin')
export class AdminSheetsController {
  constructor(private service: AdminSheetsService) {}

  @Get('dashboard/summary')
  summary(@Query('date') date?: string) {
    return this.service.getDashboardSummary(date);
  }

  @Get('sheets')
  findAll(
    @Query('date') date?: string,
    @Query('supervisorId') supervisorId?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.findAll({
      date, supervisorId, status,
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
    });
  }

  @Get('sheets/:id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post('sheets/:id/unlock')
  unlock(@Param('id') id: string) {
    return this.service.unlockSheet(id);
  }

  @Get('issues/stats')
  getIssueStats(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getIssueStats(from, to);
  }

  @Get('issues')
  getIssues(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('siteId') siteId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.service.getIssues({ from, to, siteId, page: page ? +page : 1, limit: limit ? +limit : 50 });
  }
}
