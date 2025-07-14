import { Injectable } from '@nestjs/common';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { eq, and, ne } from 'drizzle-orm';
import { cars, DatabaseService, organization } from 'src/db';
import { customers } from 'src/db/schema/customers';

@Injectable()
export class CustomerService {
  constructor(private readonly dbService: DatabaseService) {}

  create(createCustomerDto: CreateCustomerDto) {
    return 'This action adds a new customer';
  }

  async findAllCustomersByOrg(userId: string) {
    const result = await this.dbService.db
      .select()
      .from(customers)
      .leftJoin(organization, eq(customers.orgId, organization.id))
      .where(eq(organization.userId, userId));

    return result.map((row) => row.customers);
  }

  findOne(id: number) {
    return `This action returns a #${id} customer`;
  }

  update(id: number, updateCustomerDto: UpdateCustomerDto) {
    return `This action updates a #${id} customer`;
  }

  remove(id: number) {
    return `This action removes a #${id} customer`;
  }
}
