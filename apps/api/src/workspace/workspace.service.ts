import { Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@seo-machine/db';
import slugify from 'slugify';
import { CreateWorkspaceDto } from './workspace.dto';

@Injectable()
export class WorkspaceService {
  async list(userId: string, organizationId: string) { return prisma.workspace.findMany({ where: { organizationId, organization: { memberships: { some: { userId } } } }, include: { projects: true } }); }
  async create(userId: string, dto: CreateWorkspaceDto) {
    const member = await prisma.membership.findUnique({ where: { userId_organizationId: { userId, organizationId: dto.organizationId } } });
    if (!member) throw new NotFoundException('Organization membership not found.');
    return prisma.workspace.create({ data: { organizationId: dto.organizationId, name: dto.name.trim(), slug: slugify(dto.name.trim(), { lower: true, strict: true }), createdById: userId } });
  }
}
