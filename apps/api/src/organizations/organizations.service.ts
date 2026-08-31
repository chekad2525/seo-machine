import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { normalizeSlug } from '../common/slug';
import { CreateOrganizationDto } from './create-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateOrganizationDto) {
    return this.prisma.organization.create({
      data: {
        name: dto.name.trim(),
        slug: normalizeSlug(dto.slug),
      },
    });
  }
}
