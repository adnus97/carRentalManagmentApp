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

  @Get(':id/doc')
  async getContractDOC(@Param('id') id: string, @Res() res: Response) {
    const html = await this.contractsService.getContractHTML(id);

    // Wrap with minimal Word-compatible header to help Word render CSS
    const docHtml = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <style>
      /* Keep your CSS as-is; Word will render much of it for HTML .doc */
    </style>
  </head>
  <body>${html}</body>
  </html>`;

    res.set({
      'Content-Type': 'application/msword',
      'Content-Disposition': `attachment; filename=contract-${id}.doc`,
      'Cache-Control': 'no-store',
    });
    res.send(Buffer.from(docHtml, 'utf8'));
  }
}
