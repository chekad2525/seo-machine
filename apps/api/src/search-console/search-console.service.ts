import { Injectable } from '@nestjs/common';
import { prisma } from '@seo-machine/db';

export const GSC_READONLY_SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';

@Injectable()
export class SearchConsoleService {
  async list(userId: string, projectId: string) {
    return prisma.searchConsoleConnection.findMany({ where: { projectId, userId } });
  }

  async prepare(userId: string, projectId: string, property: string) {
    const project = await prisma.project.findFirst({ where: { id: projectId, workspace: { organization: { memberships: { some: { userId } } } } } });
    if (!project) return null;
    return prisma.searchConsoleConnection.upsert({
      where: { projectId_property: { projectId, property } },
      create: { projectId, userId, property, scopes: [GSC_READONLY_SCOPE], status: 'PENDING' },
      update: { userId, scopes: [GSC_READONLY_SCOPE], status: 'PENDING' },
    });
  }
}
