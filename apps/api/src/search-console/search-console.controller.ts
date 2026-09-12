import { Body, Controller, Get, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ApiAuthGuard } from '../shared/api-auth.guard';
import { PublicApi } from '../shared/internal-auth.guard';
import { CurrentUserId } from '../shared/current-user.decorator';
import { SearchConsoleConnectionError, SearchConsoleService } from './search-console.service';
import { SearchConsoleSyncService } from './search-console-sync.service';
import { ExactRankService } from './exact-rank.service';

class PrepareSearchConsoleDto { @IsString() projectId!: string; @IsString() property!: string; }
class SyncSearchConsoleDto { @IsString() projectId!: string; @IsOptional() @IsDateString() startDate?: string; @IsOptional() @IsDateString() endDate?: string; }
class MetricsQueryDto { @IsString() projectId!: string; @IsOptional() @IsIn(['query', 'page']) dimension: 'query' | 'page' = 'query'; @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(1000) limit = 100; @IsOptional() @IsDateString() startDate?: string; @IsOptional() @IsDateString() endDate?: string; }
class SummaryQueryDto { @IsString() projectId!: string; @IsOptional() @IsDateString() startDate?: string; @IsOptional() @IsDateString() endDate?: string; }
class TrackKeywordDto { @IsString() projectId!: string; @IsIn(['add', 'remove', 'exact-refresh', 'exact-collect']) action!: 'add' | 'remove' | 'exact-refresh' | 'exact-collect'; @IsOptional() @IsString() @MaxLength(250) query?: string; @IsOptional() @IsString() @MaxLength(2000) targetPage?: string; @IsOptional() @IsString() id?: string; }

@Controller('integrations/google-search-console')
export class SearchConsoleController {
  constructor(private readonly service: SearchConsoleService, private readonly syncService: SearchConsoleSyncService, private readonly rankService: ExactRankService) {}
  @UseGuards(ApiAuthGuard)
  @Get('status') status(@CurrentUserId() userId: string, @Query('projectId') projectId: string) { return this.service.list(userId, projectId); }
  @UseGuards(ApiAuthGuard)
  @Post('prepare') prepare(@CurrentUserId() userId: string, @Body() dto: PrepareSearchConsoleDto) { return this.service.prepare(userId, dto.projectId, dto.property); }
  @UseGuards(ApiAuthGuard)
  @Post('sync') sync(@CurrentUserId() userId: string, @Body() dto: SyncSearchConsoleDto) { return this.syncService.sync(userId, dto.projectId, { startDate: dto.startDate ? new Date(dto.startDate) : undefined, endDate: dto.endDate ? new Date(dto.endDate) : undefined }); }
  @UseGuards(ApiAuthGuard)
  @Get('metrics') metrics(@CurrentUserId() userId: string, @Query() query: MetricsQueryDto) { return this.syncService.metrics(userId, query.projectId, query.dimension, query.limit, { startDate: query.startDate ? new Date(query.startDate) : undefined, endDate: query.endDate ? new Date(query.endDate) : undefined }); }
  @UseGuards(ApiAuthGuard)
  @Get('summary') summary(@CurrentUserId() userId: string, @Query() query: SummaryQueryDto) { return this.syncService.summary(userId, query.projectId, { startDate: query.startDate ? new Date(query.startDate) : undefined, endDate: query.endDate ? new Date(query.endDate) : undefined }); }
  @UseGuards(ApiAuthGuard)
  @Get('insights') insights(@CurrentUserId() userId: string, @Query() query: SummaryQueryDto) { return this.syncService.insights(userId, query.projectId, { startDate: query.startDate ? new Date(query.startDate) : undefined, endDate: query.endDate ? new Date(query.endDate) : undefined }); }
  @UseGuards(ApiAuthGuard)
  @Get('keyword-tracking') keywordTracking(@CurrentUserId() userId: string, @Query('projectId') projectId: string) { return this.syncService.keywordTracking(userId, projectId); }
  @UseGuards(ApiAuthGuard)
  @Post('keyword-tracking') trackKeyword(@CurrentUserId() userId: string, @Body() dto: TrackKeywordDto) {
    if (dto.action === 'add') return this.syncService.addTrackedKeyword(userId, dto.projectId, dto.query ?? '', dto.targetPage);
    if (dto.action === 'remove') return this.syncService.removeTrackedKeyword(userId, dto.projectId, dto.id ?? '');
    if (dto.action === 'exact-collect') return this.rankService.collect(userId, dto.projectId);
    return this.rankService.enqueue(userId, dto.projectId);
  }
  @UseGuards(ApiAuthGuard)
  @Get('sync/latest') latestSync(@CurrentUserId() userId: string, @Query('projectId') projectId: string) { return this.syncService.latestRun(userId, projectId); }
  @PublicApi()
  @Get('callback') async callback(@Query('state') state: string, @Query('code') code: string, @Query('error') error: string | undefined, @Res() response: Response) {
    const dashboard = new URL('/dashboard', process.env.APP_ORIGIN ?? 'http://localhost:3000');
    try {
      const connection = await this.service.completeCallback(state, code, error);
      dashboard.searchParams.set('gsc', 'connected');
      dashboard.searchParams.set('projectId', connection.projectId);
    } catch (callbackError) {
      const message = callbackError instanceof Error ? callbackError.message : '';
      const reason = callbackError instanceof SearchConsoleConnectionError ? callbackError.reason
        : message.includes('No matching Search Console property')
        ? 'property-not-found'
          : message.includes('reach Google') || message.includes('unreadable') || message.includes('verify the Search Console property with Google')
            ? 'google-unavailable'
            : message.includes('not completed')
              ? 'cancelled'
              : 'connection-failed';
      dashboard.searchParams.set('gsc', 'error');
      dashboard.searchParams.set('reason', reason);
    }
    return response.redirect(dashboard.toString());
  }
}
