// src/contracts/contracts.controller.ts
import { Controller, Get, Param } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { Auth } from 'src/auth/auth.guard';

@Auth()
@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get(':id')
  async getContractHTML(@Param('id') id: string) {
    const html = await this.contractsService.getContractHTML(id);
    return { html };
  }
}
