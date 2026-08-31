import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { HealthController } from './health.controller';
import { OrganizationsModule } from './organizations/organizations.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ProjectsModule } from './projects/projects.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    DatabaseModule,
    OrganizationsModule,
    WorkspacesModule,
    ProjectsModule,
    AuthModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
