import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../shared/api-auth.guard';
import { CurrentUserId } from '../shared/current-user.decorator';
import { CreateOrganizationDto } from './organization.dto';
import { OrganizationService } from './organization.service';

@Controller('organizations') @UseGuards(ApiAuthGuard)
export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}
  @Get() list(@CurrentUserId() userId: string) { return this.service.list(userId); }
  @Post() create(@CurrentUserId() userId: string, @Body() dto: CreateOrganizationDto) { return this.service.create(userId, dto); }
}
