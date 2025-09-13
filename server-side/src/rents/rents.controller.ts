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
  UseInterceptors,
  BadRequestException,
  UploadedFiles,
  Req,
} from '@nestjs/common';
import { RentsService } from './rents.service';
import { CreateRentDto } from './dto/create-rent.dto';
import { UpdateRentDto } from './dto/update-rent.dto';
import { Auth, CurrentUser, CustomUser } from 'src/auth/auth.guard';
import { ContractsService } from 'src/contracts/contracts.service';
import { Response } from 'express';
import { FilesInterceptor } from '@nestjs/platform-express';

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
  @UseInterceptors(
    FilesInterceptor('carImages', 4, {
      limits: {
        fileSize: 10 * 1024 * 1024,
        files: 4,
      },
      fileFilter: (req, file, cb) => {
        console.log('🔍 FileFilter called with file:', {
          fieldname: file.fieldname,
          originalname: file.originalname,
          encoding: file.encoding,
          mimetype: file.mimetype,
          size: file.size,
        });

        if (!/^image\/(jpeg|jpg|png|webp|gif)$/.test(file.mimetype)) {
          console.log('❌ File rejected - invalid type:', file.mimetype);
          return cb(
            new BadRequestException(
              `Invalid image type ${file.mimetype}. Allowed: jpeg, jpg, png, webp, gif`,
            ),
            false,
          );
        }
        console.log('✅ File accepted by filter');
        cb(null, true);
      },
    }),
  )
  async create(
    @Body() body: any,
    @CurrentUser() user: CustomUser,
    @UploadedFiles() carImages?: Express.Multer.File[],
    @Req() req?: any,
  ) {
    console.log('🔍 Controller Debug:');
    console.log('   Content-Type:', req.headers['content-type']);
    console.log('   Content-Length:', req.headers['content-length']);
    console.log('   Files received by interceptor:', carImages?.length || 0);
    console.log('   Body keys:', Object.keys(body || {}));
    console.log('   Raw body type:', typeof body);

    // Check if images are in body instead of files
    if (body.carImages) {
      console.log('   ⚠️ Images found in body (not as files):', {
        type: typeof body.carImages,
        isArray: Array.isArray(body.carImages),
        content: body.carImages,
      });
    }

    // Log received files
    if (carImages && carImages.length > 0) {
      console.log('   ✅ Files processed by interceptor:');
      carImages.forEach((file, idx) => {
        console.log(`      File ${idx + 1}:`, {
          fieldname: file.fieldname,
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
          hasBuffer: !!file.buffer,
        });
      });
    }

    // Manual transformation and validation
    try {
      const createRentDto: CreateRentDto = {
        carId: body.carId,
        customerId: body.customerId,
        startDate: new Date(body.startDate),
        expectedEndDate: body.expectedEndDate
          ? new Date(body.expectedEndDate)
          : undefined,
        returnedAt: body.returnedAt ? new Date(body.returnedAt) : undefined,
        isOpenContract:
          body.isOpenContract === 'true' || body.isOpenContract === true,
        totalPrice: body.totalPrice ? Number(body.totalPrice) : undefined,
        deposit: body.deposit ? Number(body.deposit) : 0,
        guarantee: body.guarantee ? Number(body.guarantee) : 0,
        lateFee: body.lateFee ? Number(body.lateFee) : 0,
        totalPaid: body.totalPaid ? Number(body.totalPaid) : 0,
        isFullyPaid: body.isFullyPaid === 'true' || body.isFullyPaid === true,
        status: body.status || 'reserved',
        damageReport: body.damageReport || '',
        isDeleted: false,
      };

      // Validate required fields
      if (!createRentDto.carId) {
        throw new BadRequestException('Car ID is required');
      }
      if (!createRentDto.customerId) {
        throw new BadRequestException('Customer ID is required');
      }
      if (
        !createRentDto.startDate ||
        isNaN(createRentDto.startDate.getTime())
      ) {
        throw new BadRequestException('Valid start date is required');
      }

      console.log('✅ Calling createWithImages with:', {
        dto: createRentDto,
        userId: user.id,
        imageCount: carImages?.length || 0,
      });

      return await this.rentsService.createWithImages(
        createRentDto,
        user.id,
        carImages,
      );
    } catch (error) {
      console.log('❌ Controller error:', error);
      throw error;
    }
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
    return this.rentsService.getAllRentsWithCarAndCustomerAndImages(
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
  @Patch(':id/images')
  @UseInterceptors(
    FilesInterceptor('carImages', 4, {
      limits: {
        fileSize: 10 * 1024 * 1024,
        files: 4,
      },
      fileFilter: (req, file, callback) => {
        if (!file.mimetype.match(/^image\/(jpeg|jpg|png|webp|gif)$/)) {
          return callback(
            new BadRequestException(
              `File ${file.originalname} is not a valid image. Only JPEG, PNG, WEBP, and GIF are allowed.`,
            ),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  async updateImages(
    @Param('id') id: string,
    @CurrentUser() user: CustomUser,
    @UploadedFiles() carImages?: Express.Multer.File[],
  ) {
    try {
      if (!carImages || carImages.length === 0) {
        throw new BadRequestException('No images provided for update');
      }

      return await this.rentsService.updateRentImages(id, user.id, carImages);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      console.error('Update rent images error:', error);
      throw new BadRequestException(
        'Failed to update car images. Please try again.',
      );
    }
  }

  // 🆕 Get rent with images
  @Get(':id/with-images')
  async getRentWithImages(@Param('id') id: string) {
    return this.rentsService.getRentWithImages(id);
  }

  @Get(':id/images')
  async getRentImages(@Param('id') id: string) {
    try {
      const images = await this.rentsService.getRentImages(id);
      return {
        success: true,
        data: images,
      };
    } catch (error) {
      throw new BadRequestException('Failed to retrieve rent images');
    }
  }
}
