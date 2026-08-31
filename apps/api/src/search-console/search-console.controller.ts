import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { ApiAuthGuard } from '../shared/api-auth.guard';
import { CurrentUserId } from '../shared/current-user.decorator';
import { SearchConsoleService } from './search-console.service';

class PrepareSearchConsoleDto { @IsString() projectId!: string; @IsString() property!: string; }

@Controller('integrations/google-search-console')
export class SearchConsoleController {
  constructor(private readonly service: SearchConsoleService) {}
  @UseGuards(ApiAuthGuard)
  @Get('status') status(@CurrentUserId() userId: string, @Query('projectId') projectId: string) { return this.service.list(userId, projectId); }
  @UseGuards(ApiAuthGuard)
  @Post('prepare') prepare(@CurrentUserId() userId: string, @Body() dto: PrepareSearchConsoleDto) { return this.service.prepare(userId, dto.projectId, dto.property); }
  @Get('callback') callback(@Query('state') state: string, @Query('code') code: string, @Query('error') error?: string) { return this.service.completeCallback(state, code, error); }
}
