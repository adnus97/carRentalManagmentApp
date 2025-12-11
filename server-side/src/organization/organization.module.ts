import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { OrganizationRepository } from './organization.repository';
import { FilesModule } from 'src/files/files.module'; // Import FilesModule
import { DatabaseModule } from 'src/db';

@Module({
  imports: [FilesModule, DatabaseModule], // Add FilesModule to imports
  controllers: [OrganizationController],
  providers: [OrganizationService, OrganizationRepository],
  exports: [OrganizationService, OrganizationRepository],
})
export class OrganizationModule {}
