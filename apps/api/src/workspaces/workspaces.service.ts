import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { normalizeSlug } from '../common/slug';
import { CreateWorkspaceDto } from './create-workspace.dto';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId?: string) {
    return this.prisma.workspace.findMany({
      where: organizationId ? { organizationId } : undefined,
      include: { organization: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateWorkspaceDto) {
    return this.prisma.workspace.create({
      data: {
        organizationId: dto.organizationId,
        name: dto.name.trim(),
        slug: normalizeSlug(dto.slug),
      },
    });
  }
}
