import { Body, Controller, Get, NotFoundException, Post, Query, UseGuards } from '@nestjs/common';
import { IsString } from 'class-validator';
import { ApiAuthGuard } from '../shared/api-auth.guard';
import { CurrentUserId } from '../shared/current-user.decorator';
import { SearchConsoleService } from './search-console.service';

class PrepareSearchConsoleDto { @IsString() projectId!: string; @IsString() property!: string; }

@Controller('integrations/google-search-console') @UseGuards(ApiAuthGuard)
export class SearchConsoleController {
  constructor(private readonly service: SearchConsoleService) {}
  @Get('status') status(@CurrentUserId() userId: string, @Query('projectId') projectId: string) { return this.service.list(userId, projectId); }
  @Post('prepare') async prepare(@CurrentUserId() userId: string, @Body() dto: PrepareSearchConsoleDto) { const result = await this.service.prepare(userId, dto.projectId, dto.property); if (!result) throw new NotFoundException('Project not found.'); return { ...result, authorizationUrl: this.authorizationUrl(dto.property) }; }
  private authorizationUrl(property: string) { const base = process.env.GSC_REDIRECT_URI ?? 'http://localhost:3001/api/v1/integrations/google-search-console/callback'; return `${base}?property=${encodeURIComponent(property)}`; }
}
