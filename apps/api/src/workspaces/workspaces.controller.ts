import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { CreateWorkspaceDto } from './create-workspace.dto';
import { WorkspacesService } from './workspaces.service';

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Get()
  list(@Query('organizationId') organizationId?: string) {
    return this.workspaces.list(organizationId);
  }

  @Post()
  create(@Body() dto: CreateWorkspaceDto) {
    return this.workspaces.create(dto);
  }
}
