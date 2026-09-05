import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@seo-machine/db';
import slugify from 'slugify';
import { CreateProjectDto } from './project.dto';

@Injectable()
export class ProjectService {
  async list(userId: string, workspaceId: string) { return prisma.project.findMany({ where: { workspaceId, workspace: { organization: { memberships: { some: { userId } } } } }, include: { searchConsoleConnections: true } }); }
  async create(userId: string, dto: CreateProjectDto) {
    const workspace = await prisma.workspace.findFirst({ where: { id: dto.workspaceId, organization: { memberships: { some: { userId } } } } });
    if (!workspace) throw new NotFoundException('Workspace not found.');
    const domain = dto.domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
    return prisma.project.create({ data: { organizationId: workspace.organizationId, workspaceId: workspace.id, name: dto.name.trim(), slug: slugify(dto.name.trim(), { lower: true, strict: true }), domain, createdById: userId } });
  }
}
