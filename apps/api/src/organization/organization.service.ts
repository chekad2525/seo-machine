import { ConflictException, Injectable } from '@nestjs/common';
import { prisma } from '@seo-machine/db';
import slugify from 'slugify';
import { CreateOrganizationDto } from './organization.dto';

@Injectable()
export class OrganizationService {
  async list(userId: string) { return prisma.organization.findMany({ where: { memberships: { some: { userId } } }, include: { memberships: true, workspaces: true } }); }
  async create(userId: string, dto: CreateOrganizationDto) {
    const slug = slugify(dto.name.trim(), { lower: true, strict: true });
    try { return await prisma.organization.create({ data: { name: dto.name.trim(), slug, createdById: userId, memberships: { create: { userId, role: 'OWNER' } } } }); }
    catch { throw new ConflictException('An organization with this name already exists.'); }
  }
}
