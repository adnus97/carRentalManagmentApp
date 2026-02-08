import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  Inject,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { BlacklistCustomerDto } from './dto/blacklist.dto';
import { RateCustomerDto } from './dto/rating.dto';
import { Auth, CurrentUser } from 'src/auth/auth.guard';
import { CustomUser } from 'src/auth/auth.guard';
import { BaseController } from 'src/common/base.controller';

@Auth()
@Controller('customers')
export class CustomerController extends BaseController {
  constructor(
    @Inject(CustomerService) private readonly customerService: CustomerService, // ✅ Add @Inject()
  ) {
    super();
    console.log('🔧 CustomerController constructor called');
    console.log('🔧 CustomerService injected:', !!this.customerService);
  }

  /* Create a new customer (orgId resolved from userId) */
  @Post()
  async create(
    @CurrentUser() user: CustomUser,
    @Body() dto: CreateCustomerDto,
  ) {
    try {
      return await this.customerService.create(user.id, dto);
    } catch (error) {
      this.handleControllerError(error);
    }
  }

  /*Get all customers by org (orgId resolved from userId) */
  @Get('/org')
  async findCustomersByOrgId(
    @CurrentUser() user: CustomUser,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    try {
      const pageNum = Math.max(1, parseInt(page || '1', 10));
      const pageSizeNum = Math.max(1, parseInt(pageSize || '20', 10));

      return await this.customerService.findAllCustomersByOrg(
        user.id,
        pageNum,
        pageSizeNum,
      );
    } catch (error) {
      this.handleControllerError(error);
    }
  }

  /** Get one customer */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      return await this.customerService.findOne(id);
    } catch (error) {
      this.handleControllerError(error);
    }
  }

  /** Update customer */
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    try {
      return await this.customerService.update(id, dto);
    } catch (error) {
      this.handleControllerError(error);
    }
  }

  /** Soft delete customer */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      return await this.customerService.remove(id);
    } catch (error) {
      this.handleControllerError(error);
    }
  }

  /** Restore a soft-deleted customer */
  @Put(':id/restore')
  async restore(@Param('id') id: string) {
    try {
      return await this.customerService.restore(id);
    } catch (error) {
      this.handleControllerError(error);
    }
  }

  /** Blacklist a customer */
  @Post(':id/blacklist')
  async blacklist(@Param('id') id: string, @Body() dto: BlacklistCustomerDto) {
    try {
      return await this.customerService.blacklistCustomer(id, dto);
    } catch (error) {
      this.handleControllerError(error);
    }
  }

  /** Get blacklist with pagination */
  @Get('blacklist/all')
  async getBlacklist(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    try {
      const pageNum = Math.max(1, parseInt(page || '1', 10));
      const pageSizeNum = Math.max(1, parseInt(pageSize || '20', 10));

      return await this.customerService.getBlacklist(pageNum, pageSizeNum);
    } catch (error) {
      this.handleControllerError(error);
    }
  }

  /** Rate a customer */
  @Post(':id/rate')
  async rateCustomer(@Param('id') id: string, @Body() dto: RateCustomerDto) {
    try {
      return await this.customerService.rateCustomer(id, dto);
    } catch (error) {
      this.handleControllerError(error);
    }
  }

  /** Get customer ratings with pagination */
  @Get(':id/ratings')
  async getRatings(
    @Param('id') id: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    try {
      const pageNum = Math.max(1, parseInt(page || '1', 10));
      const pageSizeNum = Math.max(1, parseInt(pageSize || '10', 10));

      return await this.customerService.getCustomerRatings(
        id,
        pageNum,
        pageSizeNum,
      );
    } catch (error) {
      this.handleControllerError(error);
    }
  }
  @Put(':id/unblacklist')
  async unblacklist(@Param('id') id: string) {
    return await this.customerService.unblacklistCustomer(id);
  }

  @Get('customer/:customerId')
  async getRentsByCustomer(
    @Param('customerId') customerId: string,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
  ) {
    try {
      const pageNum = Math.max(1, parseInt(page || '1', 10));
      const pageSizeNum = Math.max(1, parseInt(pageSize || '20', 10));

      return await this.customerService.findByCustomer(
        customerId,
        pageNum,
        pageSizeNum,
      );
    } catch (error) {
      this.handleControllerError(error);
    }
  }

  @Get(':id/with-files')
  async findOneWithFiles(@Param('id') id: string) {
    try {
      return await this.customerService.findOneWithFiles(id);
    } catch (error) {
      this.handleControllerError(error);
    }
  }
  @Get('blacklist/org')
  async getOrgBlacklist(
    @CurrentUser() user: CustomUser,
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('q') q?: string,
  ) {
    try {
      const pageNum = Math.max(1, parseInt(page || '1', 10));
      const pageSizeNum = Math.max(1, parseInt(pageSize || '20', 10));

      return await this.customerService.getBlacklistByOrg(
        user.id,
        pageNum,
        pageSizeNum,
        q,
      );
    } catch (error) {
      this.handleControllerError(error);
    }
  }

  /** Get global blacklist */
  @Get('blacklist/global')
  async getGlobalBlacklist(
    @Query('page') page: string,
    @Query('pageSize') pageSize: string,
    @Query('q') q?: string,
  ) {
    try {
      const pageNum = Math.max(1, parseInt(page || '1', 10));
      const pageSizeNum = Math.max(1, parseInt(pageSize || '20', 10));

      return await this.customerService.getGlobalBlacklist(
        pageNum,
        pageSizeNum,
        q,
      );
    } catch (error) {
      this.handleControllerError(error);
    }
  }
}
