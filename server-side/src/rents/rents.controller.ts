import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ValidationPipe,
  Put,
  Query,
  Res,
  Header,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { RentsService } from './rents.service';
import { CreateRentDto } from './dto/create-rent.dto';
import { UpdateRentDto } from './dto/update-rent.dto';
import { Auth, CurrentUser, CustomUser } from 'src/auth/auth.guard';
import { ContractsService } from 'src/contracts/contracts.service';
import { Response } from 'express';

function ensureDate(val: any) {
  if (val && typeof val === 'string') return new Date(val);
  return val;
}

@Auth()
@Controller('rents')
export class RentsController {
  constructor(
    private readonly rentsService: RentsService,
    private readonly contractsService: ContractsService,
  ) {}

  @Post()
  async create(
    @Body(ValidationPipe) createRentDto: CreateRentDto,
    @CurrentUser() user: CustomUser,
  ) {
    const userId = user.id;
    const result = await this.rentsService.create(createRentDto, userId);
    return {
      ...result,
      contractUrl: `/contracts/${result.data.id}`, // Add contract URL for frontend navigation
    };
  }

  @Get()
  findAll() {
    return this.rentsService.findAll({});
  }

  @Get('/with-car-and-customer')
  async getAllRentsWithCarAndCustomer(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @CurrentUser() user: CustomUser,
  ) {
    const orgId = user.org_id;
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const pageSizeNum = Math.max(1, parseInt(pageSize || '20', 10));
    return this.rentsService.getAllRentsWithCarAndCustomer(
      orgId,
      pageNum,
      pageSizeNum,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.rentsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateRentDto: UpdateRentDto) {
    return this.rentsService.update(id, updateRentDto);
  }

  @Put(':id')
  updateRent(
    @Param('id') id: string,
    @Body(ValidationPipe) updateData: Partial<CreateRentDto>,
  ) {
    return this.rentsService.update(id, updateData);
  }
  @Put(':id/soft-delete')
  async softDelete(@Param('id') id: string) {
    return this.rentsService.remove(id);
  }

  @Get(':id/contract')
  async getContract(@Param('id') id: string) {
    return this.rentsService.getRentContract(id);
  }

  // 🆕 Get contract as HTML
  @Get(':id/contract/html')
  async getContractHTML(@Param('id') id: string) {
    const html = await this.contractsService.getContractHTML(id);
    return { html };
  }

  // 🆕 Download contract as PDF
  @Get(':id/contract-pdf')
  async downloadPDF(
    @Param('id') id: string,
    @Res() res: Response, // not passthrough so we control raw write
  ) {
    try {
      const pdfBuffer = await this.contractsService.generateContractPDF(id);
      if (!pdfBuffer || !(pdfBuffer instanceof Buffer)) {
        throw new HttpException(
          'PDF generation failed',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="contrat-${id}.pdf"`,
      );
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      return res.send(pdfBuffer);
    } catch (err) {
      console.error('downloadPDF error:', err);
      // You can be more specific if your service throws KnownError/NotFound
      return res.status(500).json({
        statusCode: 500,
        error: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      });
    }
  }
}
