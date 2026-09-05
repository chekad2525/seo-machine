import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiAuthGuard } from '../shared/api-auth.guard';
import { CurrentUserId } from '../shared/current-user.decorator';
import { CompleteOnboardingDto } from './onboarding.dto';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
@UseGuards(ApiAuthGuard)
export class OnboardingController {
  constructor(private readonly service: OnboardingService) {}
  @Get() status(@CurrentUserId() userId: string) { return this.service.status(userId); }
  @Post('complete') complete(@CurrentUserId() userId: string, @Body() dto: CompleteOnboardingDto) { return this.service.complete(userId, dto); }
}
