// src/contracts/contracts.module.ts

import { Module } from '@nestjs/common';
import { FilesService } from './files.service';
import { FilesController } from './files.controller';
import { FilesRepository } from './files.repository';
import { DatabaseModule } from 'src/db';
import { R2Module } from 'src/r2/r2.module';

@Module({
  imports: [
    DatabaseModule, // ✅ Add this - needed for DatabaseService
    R2Module, // ✅ Add this - needed for R2Service
  ],
  controllers: [FilesController],
  providers: [FilesService, FilesRepository],
  exports: [FilesService],
})
export class FilesModule {}
