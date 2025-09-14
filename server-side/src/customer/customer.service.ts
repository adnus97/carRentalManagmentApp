import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { cars, DatabaseService, organization, rents } from 'src/db';
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
import { NotificationsService } from 'src/notifications/notifications.service';
import { FilesService } from 'src/files/files.service';

@Injectable()
export class CustomerService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly notificationsService: NotificationsService,
    private readonly filesService: FilesService, // Add this
  ) {}
  async findOneWithFiles(id: string) {
    try {
      const customer = await this.findOne(id);

      // Helper to get file data
      const getFileData = async (fileId?: string | null) => {
        if (!fileId) return null;
        try {
          const f = await this.filesService.findOne(fileId);
          return { ...f, url: f?.url || `/api/v1/files/${f?.id}/serve` };
        } catch (error: any) {
          console.warn(
            `Failed to fetch file ${fileId}:`,
            error?.message || error,
          );
          return null;
        }
      };

      const populatedCustomer: any = { ...customer };

      // Fetch file data for document images
      if (customer.idCardId) {
        const fileData = await getFileData(customer.idCardId);
        if (fileData) {
          populatedCustomer.idCardFile = fileData;
        }
      }

      if (customer.driversLicenseId) {
        const fileData = await getFileData(customer.driversLicenseId);
        if (fileData) {
          populatedCustomer.driversLicenseFile = fileData;
        }
      }

      return populatedCustomer;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to fetch customer with files',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  private safeReturn<T>(data: T): T {
    return JSON.parse(JSON.stringify(data));
  }
  private async getOrgOwner(orgId: string) {
    const [org] = await this.dbService.db
      .select({ userId: organization.userId })
      .from(organization)
      .where(eq(organization.id, orgId));

    return org;
  }
  /** ✅ Create customer */
  async create(userId: string, dto: CreateCustomerDto) {
    if (!userId) throw new BadRequestException('User ID is required');

    const userOrg = await this.dbService.db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.userId, userId));

    if (!userOrg.length) {
      throw new BadRequestException('No organization found for this user.');
    }

    const orgId = userOrg[0].id;

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
      isBlacklisted: false,
      blacklistReason: null,
    };

    await this.dbService.db.insert(customers).values(newCustomer);
    await this.notificationsService.createNotification({
      userId,
      orgId,
      category: 'CUSTOMER',
      type: 'CUSTOMER_REGISTERED',
      priority: 'LOW',
      title: 'New Customer Registered',
      message: `${dto.firstName} ${dto.lastName} has been added to your customer base`,
      actionUrl: `/customers/${newCustomer.id}`,
      actionLabel: 'View Customer',
      metadata: {
        customerId: newCustomer.id,
        customerName: `${dto.firstName} ${dto.lastName}`,
      },
    });
    return this.safeReturn(newCustomer);
  }

  /** ✅ Get all customers by org */
  async findAllCustomersByOrg(userId: string, page = 1, pageSize = 20) {
    if (!userId) throw new BadRequestException('User ID is required');

    const offset = (page - 1) * pageSize;

    const userOrg = await this.dbService.db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.userId, userId));

    if (!userOrg.length || !userOrg[0]?.id) {
      return { data: [], page, pageSize, total: 0, totalPages: 0 };
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

  /** ✅ Get one customer */
  async findOne(id: string) {
    const [customer] = await this.dbService.db
      .select()
      .from(customers)
      .where(and(eq(customers.id, id), eq(customers.isDeleted, false)));

    if (!customer) throw new NotFoundException('Customer not found');
    return this.safeReturn(customer);
  }

  /** ✅ Update customer */
  async update(id: string, dto: UpdateCustomerDto) {
    const [customer] = await this.dbService.db
      .select()
      .from(customers)
      .where(eq(customers.id, id));

    if (!customer) throw new NotFoundException('Customer not found');

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

  /** ✅ Soft delete customer */
  async remove(id: string) {
    const [customer] = await this.dbService.db
      .select()
      .from(customers)
      .where(eq(customers.id, id));

    if (!customer) throw new NotFoundException('Customer not found');

    await this.dbService.db
      .update(customers)
      .set({ isDeleted: true, updatedAt: new Date() })
      .where(eq(customers.id, id));

    return { success: true, message: 'Customer soft-deleted' };
  }

  /** ✅ Restore soft-deleted customer */
  async restore(id: string) {
    const [customer] = await this.dbService.db
      .select()
      .from(customers)
      .where(eq(customers.id, id));

    if (!customer) throw new NotFoundException('Customer not found');

    await this.dbService.db
      .update(customers)
      .set({ isDeleted: false, updatedAt: new Date() })
      .where(eq(customers.id, id));

    return { success: true, message: 'Customer restored' };
  }

  /** ✅ Blacklist a customer (persist + history) */
  async blacklistCustomer(id: string, dto: BlacklistCustomerDto) {
    const [customer] = await this.dbService.db
      .select()
      .from(customers)
      .where(eq(customers.id, id));

    if (!customer) throw new NotFoundException('Customer not found');

    // deactivate old blacklist entries
    await this.dbService.db
      .update(customerBlacklist)
      .set({ isActive: false })
      .where(
        and(
          eq(customerBlacklist.customerId, id),
          eq(customerBlacklist.isActive, true),
        ),
      );

    // insert new blacklist entry (history)
    const entry = {
      id: createId(),
      customerId: id,
      reason: dto.reason,
      isActive: true,
      createdAt: new Date(),
    };
    await this.dbService.db.insert(customerBlacklist).values(entry);

    // update customer flag
    await this.dbService.db
      .update(customers)
      .set({
        isBlacklisted: true,
        blacklistReason: dto.reason,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id));
    // 🔔 Enhanced notification
    const orgOwner = await this.getOrgOwner(customer.orgId);
    if (orgOwner) {
      await this.notificationsService.createNotification({
        userId: orgOwner.userId,
        orgId: customer.orgId,
        category: 'CUSTOMER',
        type: 'CUSTOMER_BLACKLISTED',
        priority: 'HIGH',
        title: 'Customer Blacklisted',
        message: `${customer.firstName} ${customer.lastName} has been blacklisted: ${dto.reason}`,
        level: 'warning',
        actionUrl: `/customers/${id}`,
        actionLabel: 'View Customer',
        metadata: {
          customerId: id,
          customerName: `${customer.firstName} ${customer.lastName}`,
          reason: dto.reason,
        },
      });
    }
    return this.safeReturn(entry);
  }

  /** ✅ Unblacklist a customer (persist + history) */
  async unblacklistCustomer(id: string) {
    const [customer] = await this.dbService.db
      .select()
      .from(customers)
      .where(eq(customers.id, id));

    if (!customer) throw new NotFoundException('Customer not found');

    // deactivate active blacklist entries
    await this.dbService.db
      .update(customerBlacklist)
      .set({ isActive: false })
      .where(
        and(
          eq(customerBlacklist.customerId, id),
          eq(customerBlacklist.isActive, true),
        ),
      );

    // update customer flag
    await this.dbService.db
      .update(customers)
      .set({
        isBlacklisted: false,
        blacklistReason: null,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id));
    // 🔔 Add notification
    const orgOwner = await this.getOrgOwner(customer.orgId);
    if (orgOwner) {
      await this.notificationsService.createNotification({
        userId: orgOwner.userId,
        orgId: customer.orgId,
        category: 'CUSTOMER',
        type: 'CUSTOMER_RATING_CHANGED',
        priority: 'MEDIUM',
        title: 'Customer Unblacklisted',
        message: `${customer.firstName} ${customer.lastName} has been removed from blacklist`,
        level: 'success',
        actionUrl: `/customers/${id}`,
        actionLabel: 'View Customer',
        metadata: {
          customerId: id,
          customerName: `${customer.firstName} ${customer.lastName}`,
        },
      });
    }
    return { success: true, message: 'Customer unblacklisted' };
  }

  /** ✅ Get blacklist history with pagination */
  async getBlacklist(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(customerBlacklist);

    const rows = await this.dbService.db
      .select()
      .from(customerBlacklist)
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

  /** ✅ Rate a customer */
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

    const avg = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

    await this.dbService.db
      .update(customers)
      .set({
        rating: avg,
        ratingCount: ratings.length,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, id));
    // 🔔 Add notification for extreme ratings (very low or very high)
    if (dto.rating <= 2 || dto.rating >= 5) {
      const [customer] = await this.dbService.db
        .select()
        .from(customers)
        .where(eq(customers.id, id));

      if (customer) {
        const orgOwner = await this.getOrgOwner(customer.orgId);
        if (orgOwner) {
          await this.notificationsService.createNotification({
            userId: orgOwner.userId,
            orgId: customer.orgId,
            category: 'CUSTOMER',
            type: 'CUSTOMER_RATING_CHANGED',
            priority: dto.rating <= 2 ? 'HIGH' : 'MEDIUM',
            title:
              dto.rating <= 2
                ? 'Low Customer Rating'
                : 'Excellent Customer Rating',
            message: `${customer.firstName} ${customer.lastName} received a ${dto.rating}-star rating`,
            level: dto.rating <= 2 ? 'warning' : 'success',
            actionUrl: `/customers/${id}`,
            actionLabel: 'View Customer',
            metadata: {
              customerId: id,
              customerName: `${customer.firstName} ${customer.lastName}`,
              rating: dto.rating,
              averageRating: avg,
            },
          });
        }
      }
    }
    return { average: avg, count: ratings.length };
  }

  /** ✅ Get customer ratings with pagination */
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
  async findByCustomer(customerId: string, page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;

    const data = await this.dbService.db
      .select({
        id: rents.id,
        startDate: rents.startDate,
        expectedEndDate: rents.expectedEndDate,
        returnedAt: rents.returnedAt,
        totalPrice: rents.totalPrice,
        totalPaid: rents.totalPaid,
        deposit: rents.deposit,
        guarantee: rents.guarantee,
        lateFee: rents.lateFee,
        damageReport: rents.damageReport,
        isFullyPaid: rents.isFullyPaid,
        isOpenContract: rents.isOpenContract,
        status: rents.status,
        car: {
          id: cars.id,
          make: cars.make,
          model: cars.model,
          year: cars.year,
        },
      })
      .from(rents)
      .leftJoin(cars, eq(rents.carId, cars.id))
      .where(eq(rents.customerId, customerId))
      .limit(pageSize)
      .offset(offset);

    const total = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(rents)
      .where(eq(rents.customerId, customerId));

    const totalSpent = await this.dbService.db
      .select({ sum: sql<number>`COALESCE(SUM(${rents.totalPaid}),0)` })
      .from(rents)
      .where(eq(rents.customerId, customerId));

    return {
      data,
      total: total[0].count,
      totalPages: Math.ceil(total[0].count / pageSize),
      stats: {
        totalRentals: total[0].count,
        totalSpent: totalSpent[0].sum,
        avgSpend: total[0].count > 0 ? totalSpent[0].sum / total[0].count : 0,
      },
    };
  }
  async getBlacklistByOrg(userId: string, page = 1, pageSize = 20) {
    if (!userId) throw new BadRequestException('User ID is required');

    const offset = (page - 1) * pageSize;

    const userOrg = await this.dbService.db
      .select({ id: organization.id })
      .from(organization)
      .where(eq(organization.userId, userId));

    if (!userOrg.length || !userOrg[0]?.id) {
      return { data: [], page, pageSize, total: 0, totalPages: 0 };
    }

    const orgId = userOrg[0].id;

    // Fixed: Join with customers and filter by organization
    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(customerBlacklist)
      .innerJoin(customers, eq(customerBlacklist.customerId, customers.id))
      .where(
        and(
          eq(customers.orgId, orgId),
          eq(customers.isDeleted, false), // Exclude deleted customers
        ),
      );

    const rows = await this.dbService.db
      .select({
        id: customerBlacklist.id,
        customerId: customerBlacklist.customerId,
        reason: customerBlacklist.reason,
        isActive: customerBlacklist.isActive,
        createdAt: customerBlacklist.createdAt,
        customerName: sql<string>`CONCAT(${customers.firstName}, ' ', ${customers.lastName})`,
        customerPhone: customers.phone,
        customerEmail: customers.email,
        customerDocumentId: customers.documentId,
      })
      .from(customerBlacklist)
      .innerJoin(customers, eq(customerBlacklist.customerId, customers.id))
      .where(
        and(
          eq(customers.orgId, orgId),
          eq(customers.isDeleted, false), // Exclude deleted customers
        ),
      )
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

  /** ✅ Get global blacklist with customer details (admin view) */
  async getGlobalBlacklist(page = 1, pageSize = 20) {
    const offset = (page - 1) * pageSize;

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(customerBlacklist)
      .innerJoin(customers, eq(customerBlacklist.customerId, customers.id))
      .where(eq(customers.isDeleted, false)); // Exclude deleted customers

    const rows = await this.dbService.db
      .select({
        id: customerBlacklist.id,
        customerId: customerBlacklist.customerId,
        reason: customerBlacklist.reason,
        isActive: customerBlacklist.isActive,
        createdAt: customerBlacklist.createdAt,
        customerName: sql<string>`CONCAT(${customers.firstName}, ' ', ${customers.lastName})`,
        customerPhone: customers.phone,
        customerEmail: customers.email,
        customerDocumentId: customers.documentId,
        orgName: organization.name,
      })
      .from(customerBlacklist)
      .innerJoin(customers, eq(customerBlacklist.customerId, customers.id))
      .leftJoin(organization, eq(customers.orgId, organization.id))
      .where(eq(customers.isDeleted, false)) // Exclude deleted customers
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
}
