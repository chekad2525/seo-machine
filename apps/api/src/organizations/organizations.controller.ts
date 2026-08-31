import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateOrganizationDto } from './create-organization.dto';
import { OrganizationsService } from './organizations.service';

@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Get()
  list() {
    return this.organizations.list();
  }

  @Post()
  create(@Body() dto: CreateOrganizationDto) {
    return this.organizations.create(dto);
  }
}
