import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { prisma } from '@seo-machine/db';
import { randomUUID } from 'crypto';
import slugify from 'slugify';
import { CompleteOnboardingDto } from './onboarding.dto';

const slug = (value: string) => slugify(value.trim(), { lower: true, strict: true }) || `workspace-${Date.now()}`;
const domain = (value: string) => {
  const candidate = value.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').toLowerCase();
  if (!candidate || !candidate.includes('.')) throw new BadRequestException('Enter a valid website domain.');
  return candidate;
};

@Injectable()
export class OnboardingService {
  async status(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { memberships: { include: { organization: { include: { workspaces: { include: { projects: true } } } } } } },
    });
    if (!user) throw new NotFoundException('Canonical user not found.');
    return { completed: Boolean(user.onboardingCompletedAt), user: { id: user.id, name: user.name, email: user.email }, organizations: user.memberships.map((m) => m.organization) };
  }

  async complete(userId: string, dto: CompleteOnboardingDto) {
    const website = domain(dto.domain);
    const current = await prisma.user.findUnique({ where: { id: userId } });
    if (!current) throw new NotFoundException('Canonical user not found.');
    if (current.onboardingCompletedAt) {
      const project = await prisma.project.findFirst({
        where: { workspace: { organization: { memberships: { some: { userId } } } } },
        include: { workspace: { include: { organization: true } }, searchConsoleConnections: { where: { userId }, take: 1 } },
        orderBy: { createdAt: 'asc' },
      });
      if (project) {
        const connection = project.searchConsoleConnections[0];
        return {
          user: { id: current.id, onboardingComplete: true },
          organization: project.workspace.organization,
          workspace: project.workspace,
          project,
          searchConsole: connection ? { status: connection.status, property: connection.property } : null,
        };
      }
    }
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user) throw new NotFoundException('Canonical user not found.');
      const organization = await tx.organization.create({ data: { name: dto.organizationName.trim(), slug: `${slug(dto.organizationName)}-${randomUUID().slice(0, 8)}`, createdById: userId, memberships: { create: { userId, role: 'OWNER' } } } });
      const workspace = await tx.workspace.create({ data: { organizationId: organization.id, name: dto.workspaceName.trim(), slug: slug(dto.workspaceName), createdById: userId } });
      const project = await tx.project.create({ data: { organizationId: organization.id, workspaceId: workspace.id, name: dto.projectName.trim(), slug: slug(dto.projectName), domain: website, createdById: userId } });
      if (dto.property?.trim()) await tx.searchConsoleConnection.create({ data: { projectId: project.id, userId, property: dto.property.trim(), scopes: ['https://www.googleapis.com/auth/webmasters.readonly'], status: 'PENDING' } });
      const updated = await tx.user.update({ where: { id: userId }, data: { onboardingCompletedAt: new Date() } });
      return { user: { id: updated.id, onboardingComplete: true }, organization, workspace, project, searchConsole: dto.property ? { status: 'PENDING', property: dto.property.trim() } : null };
    });
  }
}
