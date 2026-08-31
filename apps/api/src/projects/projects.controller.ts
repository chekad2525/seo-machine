import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateProjectDto } from './create-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Get()
  list(@Query('workspaceId') workspaceId?: string) {
    return this.projects.list(workspaceId);
  }

  @Post()
  create(@Body() dto: CreateProjectDto) {
    return this.projects.create(dto);
  }
}
