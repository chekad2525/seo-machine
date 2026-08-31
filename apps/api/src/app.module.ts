import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { InternalAuthGuard } from './shared/internal-auth.guard';
import { HealthController } from './health.controller';
import { ApiAuthGuard } from './shared/api-auth.guard';
import { IdentityController } from './identity/identity.controller';
import { IdentityService } from './identity/identity.service';
import { SmsService } from './identity/sms.service';
import { OnboardingController } from './onboarding/onboarding.controller';
import { OnboardingService } from './onboarding/onboarding.service';
import { OrganizationController } from './organization/organization.controller';
import { OrganizationService } from './organization/organization.service';
import { WorkspaceController } from './workspace/workspace.controller';
import { WorkspaceService } from './workspace/workspace.service';
import { ProjectController } from './project/project.controller';
import { ProjectService } from './project/project.service';
import { SearchConsoleController } from './search-console/search-console.controller';
import { SearchConsoleService } from './search-console/search-console.service';
import { SearchConsoleSyncService } from './search-console/search-console-sync.service';
import { SearchConsoleTokenService } from './search-console/search-console-token.service';
import { SearchConsoleSchedulerService } from './search-console/search-console-scheduler.service';

@Module({
  controllers: [HealthController, IdentityController, OnboardingController, OrganizationController, WorkspaceController, ProjectController, SearchConsoleController],
  providers: [{ provide: APP_GUARD, useClass: InternalAuthGuard }, ApiAuthGuard, IdentityService, SmsService, OnboardingService, OrganizationService, WorkspaceService, ProjectService, SearchConsoleService, SearchConsoleSyncService, SearchConsoleTokenService, SearchConsoleSchedulerService],
})
export class AppModule {}
