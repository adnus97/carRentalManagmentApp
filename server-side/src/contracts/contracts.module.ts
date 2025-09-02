// src/contracts/contracts.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { RentsModule } from '../rents/rents.module';
import { DatabaseModule } from 'src/db/database.module';

@Module({
  imports: [
    DatabaseModule,
    forwardRef(() => RentsModule), // Use forwardRef to avoid circular dependency
  ],
  controllers: [ContractsController],
  providers: [ContractsService],
  exports: [ContractsService],
})
export class ContractsModule {}
