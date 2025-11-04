// src/contracts/contracts.controller.ts
import { Controller, Get, Param, Res } from '@nestjs/common';
import { Response } from 'express';
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
  @Get(':id/html')
  async html(@Param('id') id: string) {
    const html = await this.contractsService.getContractHTML(id);
    return { html };
  }

  @Get(':id/pdf')
  async pdf(@Param('id') id: string, @Res() res: Response) {
    const buf = await this.contractsService.generateContractPDF(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename=contract-${id}.pdf`,
    });
    res.send(buf);
  }
}
