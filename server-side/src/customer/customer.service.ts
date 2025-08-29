import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService, organization } from 'src/db';
import {
  customers,
  customerBlacklist,
  customerRatings,
} from '../db/schema/customers';

import { eq, sql, and } from 'drizzle-orm';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { BlacklistCustomerDto } from './dto/blacklist.dto';
import { RateCustomerDto } from './dto/rating.dto';
import { createId } from '@paralleldrive/cuid2';

@Injectable()
export class CustomerService {
  constructor(private readonly dbService: DatabaseService) {}

  /** Helper: safe JSON return */
  private safeReturn<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
  }

  /** ✅ Create customer (orgId resolved from userId) */
  async create(userId: string, dto: CreateCustomerDto) {
    if (!userId) throw new BadRequestException('User ID is required');

    // Find org for this user
    const userOrg = await this.dbService.db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.userId, userId));

    if (!userOrg.length) {
      throw new BadRequestException('No organization found for this user.');
    }

    const orgId = userOrg[0].id;

    // ✅ Check uniqueness of documentId within org
    const existing = await this.dbService.db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.orgId, orgId),
          eq(customers.documentId, dto.documentId),
        ),
      );

    if (existing.length > 0) {
      throw new BadRequestException(
        `A customer with document ID "${dto.documentId}" already exists in your organization.`,
      );
    }

    const newCustomer = {
      id: createId(),
      orgId,
      ...dto,
      rating: 0,
      ratingCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    };

    await this.dbService.db.insert(customers).values(newCustomer);
    return this.safeReturn(newCustomer);
  }
  /** ✅ Get all customers by org (orgId resolved from userId) */
  async findAllCustomersByOrg(userId: string, page = 1, pageSize = 20) {
    if (!userId) throw new BadRequestException('User ID is required');

    const offset = (page - 1) * pageSize;

    const userOrg = await this.dbService.db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.userId, userId));

    if (!userOrg.length || !userOrg[0]?.id) {
      // ✅ return empty result instead of crashing
      return {
        data: [],
        page,
        pageSize,
        total: 0,
        totalPages: 0,
      };
    }

    const orgId = userOrg[0].id;

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(customers)
      .where(and(eq(customers.orgId, orgId), eq(customers.isDeleted, false)));

    const rows = await this.dbService.db
      .select()
      .from(customers)
      .where(and(eq(customers.orgId, orgId), eq(customers.isDeleted, false)))
      .orderBy(sql`${customers.createdAt} DESC`)
      .offset(offset)
      .limit(pageSize);

    return this.safeReturn({
      data: rows,
      page,
      pageSize,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / pageSize),
    });
  }
  /** Get one customer (excluding deleted) */
  async findOne(id: string) {
    const [customer] = await this.dbService.db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.isDeleted, false)));

    if (!customer) throw new NotFoundException('Customer not found');
    return this.safeReturn(customer);
  }

  /** Update customer */

  async update(id: string, dto: UpdateCustomerDto) {
    const [customer] = await this.dbService.db
      .select()
      .from(customers)
      .where(eq(customers.id, id));

    if (!customer) throw new NotFoundException('Customer not found');

    // ✅ If updating documentId, check uniqueness within org
    if (dto.documentId && dto.documentId !== customer.documentId) {
      const existing = await this.dbService.db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.orgId, customer.orgId),
            eq(customers.documentId, dto.documentId),
          ),
        );

      if (existing.length > 0) {
        throw new BadRequestException(
          `A customer with document ID "${dto.documentId}" already exists in your organization.`,
        );
      }
    }

    await this.dbService.db
      .update(customers)
      .set({ ...dto, updatedAt: new Date() })
      .where(eq(customers.id, id));

    return this.safeReturn({ ...customer, ...dto });
  }

  /** Soft delete customer */
  async remove(id: string) {
    const [customer] = await this.dbService.db
      .select()
      .from(customers)
      .where(eq(customers.id, id));

    if (!customer) throw new NotFoundException('Customer not found');

    await this.dbService.db
      .update(customers)
      .set({
        isDeleted: true,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id));

    return { success: true, message: 'Customer soft-deleted' };
  }

  /** Restore soft-deleted customer */
  async restore(id: string) {
    const [customer] = await this.dbService.db
      .select()
      .from(customers)
      .where(eq(customers.id, id));

    if (!customer) throw new NotFoundException('Customer not found');

    await this.dbService.db
      .update(customers)
      .set({
        isDeleted: false,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id));

    return { success: true, message: 'Customer restored' };
  }

  /** Blacklist a customer */
  async blacklistCustomer(id: string, dto: BlacklistCustomerDto) {
    const entry = {
      id: createId(),
      customerId: id,
      reason: dto.reason,
      isActive: true,
      createdAt: new Date(),
    };
    await this.dbService.db.insert(customerBlacklist).values(entry);
    return this.safeReturn(entry);
  }

  /** Get blacklist with pagination */
  async getBlacklist(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(customerBlacklist)
      .where(eq(customerBlacklist.isActive, true));

    const rows = await this.dbService.db
      .select()
      .from(customerBlacklist)
      .where(eq(customerBlacklist.isActive, true))
      .orderBy(sql`${customerBlacklist.createdAt} DESC`)
      .offset(offset)
      .limit(pageSize);

    return this.safeReturn({
      data: rows,
      page,
      pageSize,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / pageSize),
    });
  }

  /** Rate a customer */
  async rateCustomer(id: string, dto: RateCustomerDto) {
    const ratingEntry = {
      id: createId(),
      customerId: id,
      rating: dto.rating,
      comment: dto.comment,
      createdAt: new Date(),
    };
    await this.dbService.db.insert(customerRatings).values(ratingEntry);

    const ratings = await this.dbService.db
      .select()
      .from(customerRatings)
      .where(eq(customerRatings.customerId, id));

    if (!ratings.length) {
      throw new NotFoundException('No ratings found for this customer');
    }

    // Compute average
    const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

    await this.dbService.db
      .update(customers)
      .set({
        rating: avg,
        ratingCount: ratings.length,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id));

    return { average: avg, count: ratings.length };
  }

  /** Get customer ratings with pagination */
  async getCustomerRatings(id: string, page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(customerRatings)
      .where(eq(customerRatings.customerId, id));

    const rows = await this.dbService.db
      .select()
      .from(customerRatings)
      .where(eq(customerRatings.customerId, id))
      .orderBy(sql`${customerRatings.createdAt} DESC`)
      .offset(offset)
      .limit(pageSize);

    return this.safeReturn({
      data: rows,
      page,
      pageSize,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / pageSize),
    });
  }
}
