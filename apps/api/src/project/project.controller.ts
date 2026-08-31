import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../shared/api-auth.guard';
import { CurrentUserId } from '../shared/current-user.decorator';
import { CreateProjectDto } from './project.dto';
import { ProjectService } from './project.service';

@Controller('projects') @UseGuards(ApiAuthGuard)
export class ProjectController {
  constructor(private readonly service: ProjectService) {}
  @Get() list(@CurrentUserId() userId: string, @Query('workspaceId') workspaceId: string) { return this.service.list(userId, workspaceId); }
  @Post() create(@CurrentUserId() userId: string, @Body() dto: CreateProjectDto) { return this.service.create(userId, dto); }
}
