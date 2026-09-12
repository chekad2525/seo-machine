import { Body, Controller, Get, Headers, Post, Query, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsIn, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { ApiAuthGuard } from '../shared/api-auth.guard';
import { CurrentUserId } from '../shared/current-user.decorator';
import { PublicApi } from '../shared/internal-auth.guard';
import { ExactRankService } from '../search-console/exact-rank.service';
import { KeywordRankSchedulerService } from '../search-console/keyword-rank-scheduler.service';
import { KeywordTrackingService } from './keyword-tracking.service';

class ImportedKeywordDto { @IsString() @MaxLength(250) query!: string; @IsOptional() @IsString() @MaxLength(2000) targetPage?: string; }
class TrackKeywordDto {
  @IsString() projectId!: string;
  @IsIn(['add', 'remove', 'bulk-import', 'exact-refresh', 'exact-collect']) action!: 'add' | 'remove' | 'bulk-import' | 'exact-refresh' | 'exact-collect';
  @IsOptional() @IsString() @MaxLength(250) query?: string;
  @IsOptional() @IsString() @MaxLength(2000) targetPage?: string;
  @IsOptional() @IsString() id?: string;
  @IsOptional() @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100) @ValidateNested({ each: true }) @Type(() => ImportedKeywordDto) keywords?: ImportedKeywordDto[];
}

@Controller('keyword-tracking')
export class KeywordTrackingController {
  constructor(private readonly service: KeywordTrackingService, private readonly ranks: ExactRankService, private readonly scheduler: KeywordRankSchedulerService) {}

  @UseGuards(ApiAuthGuard)
  @Get() report(@CurrentUserId() userId: string, @Query('projectId') projectId: string) { return this.service.report(userId, projectId); }

  @UseGuards(ApiAuthGuard)
  @Post() mutate(@CurrentUserId() userId: string, @Body() dto: TrackKeywordDto) {
    if (dto.action === 'add') return this.service.add(userId, dto.projectId, dto.query ?? '', dto.targetPage);
    if (dto.action === 'bulk-import') return this.service.bulkAdd(userId, dto.projectId, dto.keywords ?? []);
    if (dto.action === 'remove') return this.service.remove(userId, dto.projectId, dto.id ?? '');
    if (dto.action === 'exact-collect') return this.ranks.collect(userId, dto.projectId);
    return this.ranks.enqueue(userId, dto.projectId);
  }

  @PublicApi()
  @Get('cron') async cron(@Headers('authorization') authorization?: string) {
    const secret = process.env.CRON_SECRET?.trim();
    if (!secret || authorization !== `Bearer ${secret}`) throw new UnauthorizedException();
    await this.scheduler.tick();
    return { success: true };
  }
}
