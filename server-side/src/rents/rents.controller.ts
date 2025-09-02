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
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const pageSizeNum = Math.max(1, parseInt(pageSize || '20', 10));
    return this.rentsService.getAllRentsWithCarAndCustomer(
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
  @Get(':id/pdf')
  @Header('Content-Type', 'application/pdf')
  async downloadPDF(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const pdfBuffer = await this.contractsService.generateContractPDF(id);

    res.setHeader(
      'Content-Disposition',
      `attachment; filename="contrat-${id}.pdf"`,
    );
    return pdfBuffer;
  }
}
