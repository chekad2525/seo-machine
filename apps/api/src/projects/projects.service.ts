import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { normalizeSlug } from '../common/slug';
import { CreateProjectDto } from './create-project.dto';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  list(workspaceId?: string) {
    return this.prisma.project.findMany({
      where: workspaceId ? { workspaceId } : undefined,
      include: {
        workspace: {
          include: { organization: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        workspaceId: dto.workspaceId,
        name: dto.name.trim(),
        slug: normalizeSlug(dto.slug),
        domain: dto.domain?.trim() || null,
        language: dto.language?.trim() || 'en',
        country: dto.country?.trim() || null,
        timezone: dto.timezone?.trim() || 'UTC',
      },
    });
  }
}
