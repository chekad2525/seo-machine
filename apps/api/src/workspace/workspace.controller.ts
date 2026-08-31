import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../shared/api-auth.guard';
import { CurrentUserId } from '../shared/current-user.decorator';
import { CreateWorkspaceDto } from './workspace.dto';
import { WorkspaceService } from './workspace.service';

@Controller('workspaces') @UseGuards(ApiAuthGuard)
export class WorkspaceController {
  constructor(private readonly service: WorkspaceService) {}
  @Get() list(@CurrentUserId() userId: string, @Query('organizationId') organizationId: string) { return this.service.list(userId, organizationId); }
  @Post() create(@CurrentUserId() userId: string, @Body() dto: CreateWorkspaceDto) { return this.service.create(userId, dto); }
}
