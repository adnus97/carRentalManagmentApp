import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateRentDto } from './dto/create-rent.dto';
import { UpdateRentDto } from './dto/update-rent.dto';
import { createId } from '@paralleldrive/cuid2';
import { cars, DatabaseService, organization, users } from 'src/db';
import { eq, sql, and, ne } from 'drizzle-orm';
import { rentCounters, rents } from 'src/db/schema/rents';
import { customers } from 'src/db/schema/customers';
import { RentStatus } from 'src/types/rent-status.type';
import { NotificationsService } from 'src/notifications/notifications.service';
import { FilesService } from 'src/files/files.service';
import { CreateRentData, RentsRepository } from './rents.repository';
import { Rent, RentWithDetails, CarImage } from '../types/rent.types';
import { I18nService } from 'nestjs-i18n';

function ensureDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;

  // Handle string dates
  if (typeof value === 'string') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }

  // Handle timestamp numbers
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }

  return undefined;
}
// Helper: whole-day difference in UTC (avoid DST/local-time issues)
function daysBetweenUTC(startDate: Date, endDate: Date): number {
  const start = new Date(
    Date.UTC(
      startDate.getUTCFullYear(),
      startDate.getUTCMonth(),
      startDate.getUTCDate(),
    ),
  );

  const end = new Date(
    Date.UTC(
      endDate.getUTCFullYear(),
      endDate.getUTCMonth(),
      endDate.getUTCDate(),
    ),
  );

  // Add 1 to include both start and end days in the rental period
  const diffInMs = end.getTime() - start.getTime();
  const diffInDays = Math.ceil(diffInMs / (1000 * 60 * 60 * 24));

  return Math.max(1, diffInDays + 1); // +1 for inclusive counting
}

@Injectable()
export class RentsService {
  private readonly logger = new Logger(RentsService.name);
  constructor(
    @Inject(DatabaseService) private readonly dbService: DatabaseService, // ✅ Add @Inject()
    @Inject(NotificationsService)
    private readonly notificationsService: NotificationsService, // ✅ Add @Inject()
    @Inject(FilesService) private filesService: FilesService, // ✅ Add @Inject()
    @Inject(RentsRepository) private readonly rentsRepository: RentsRepository, // ✅ Add @Inject()
    @Inject(I18nService) private readonly i18n: I18nService, // ✅ Add @Inject()
  ) {
    console.log('🔧 RentsService constructor called');
    console.log('🔧 DatabaseService injected:', !!this.dbService);
    console.log('🔧 DatabaseService.db exists:', !!this.dbService?.db);
    console.log(
      '🔧 NotificationsService injected:',
      !!this.notificationsService,
    );
    console.log('🔧 FilesService injected:', !!this.filesService);
    console.log('🔧 RentsRepository injected:', !!this.rentsRepository);
    console.log('🔧 I18nService injected:', !!this.i18n);
  }
  private async generateRentId(orgId: string): Promise<{
    id: string;
    rentContractId: string;
    rentNumber: number;
    year: number;
  }> {
    const currentYear = new Date().getFullYear();

    // Get or create counter for this year and org
    const [existingCounter] = await this.dbService.db
      .select()
      .from(rentCounters)
      .where(
        and(eq(rentCounters.orgId, orgId), eq(rentCounters.year, currentYear)),
      );

    let nextNumber: number;

    if (existingCounter) {
      // Increment existing counter
      nextNumber = existingCounter.counter + 1;
      await this.dbService.db
        .update(rentCounters)
        .set({
          counter: nextNumber,
          updatedAt: new Date(),
        })
        .where(eq(rentCounters.id, existingCounter.id));
    } else {
      // Create new counter for this year
      nextNumber = 1;
      await this.dbService.db.insert(rentCounters).values({
        id: createId(),
        orgId,
        year: currentYear,
        counter: nextNumber,
      });
    }

    // ✅ Generate normal UUID for primary key
    const id = createId();

    // ✅ Format the contract ID: 001/2025, 002/2025, etc.
    const rentContractId = `${nextNumber.toString().padStart(3, '0')}/${currentYear}`;

    return {
      id, // ✅ Normal UUID
      rentContractId, // ✅ Formatted display ID
      rentNumber: nextNumber,
      year: currentYear,
    };
  }
  private async getOrgOwner(orgId: string) {
    const [org] = await this.dbService.db
      .select({ userId: organization.userId })
      .from(organization)
      .where(eq(organization.id, orgId));

    return org;
  }
  private getAutoStatus(
    startDate: Date,
    returnedAt: Date | null,
    expectedEndDate: Date | null,
    currentStatus: RentStatus,
  ): RentStatus {
    const now = new Date();

    if (currentStatus === 'canceled') return 'canceled';
    if (returnedAt && returnedAt <= now) return 'completed';
    if (startDate > now) return 'reserved';
    return 'active';
  }

  private async getUserLocale(userId: string): Promise<string> {
    try {
      if (!userId) return 'en';
      const [u] = await this.dbService.db
        .select({ locale: users.locale })
        .from(users)
        .where(eq(users.id, userId));
      return u?.locale || 'en';
    } catch {
      return 'en';
    }
  }

  // Translate with optional explicit language.
  // If `lang` is omitted, i18n will use the request-scoped language.
  private tr(
    key: string,
    args?: Record<string, any>,
    lang?: string,
  ): Promise<string> {
    return this.i18n.translate(key, { lang, args });
  }

  private async isCarAvailableForRange(
    carId: string,
    startDate: Date,
    endDate: Date,
    excludeRentId?: string,
  ): Promise<boolean> {
    try {
      const conditions = [
        eq(rents.carId, carId),
        eq(rents.isDeleted, false),
        ne(rents.status, 'canceled'),
      ];

      if (excludeRentId) {
        conditions.push(ne(rents.id, excludeRentId));
      }

      // Improved overlap detection
      conditions.push(
        sql`(
          ${rents.startDate} < ${endDate} AND 
          COALESCE(${rents.returnedAt}, ${rents.expectedEndDate}) > ${startDate}
        )`,
      );

      const overlappingRents = await this.dbService.db
        .select({ id: rents.id })
        .from(rents)
        .where(and(...conditions));

      return overlappingRents.length === 0;
    } catch (error) {
      console.error('Error checking car availability:', error);
      throw new BadRequestException(
        'Unable to check car availability. Please try again.',
      );
    }
  }

  // Helper method to get user-friendly field names
  private getFieldDisplayName(field: string): string {
    const fieldNames: Record<string, string> = {
      carId: 'car',
      customerId: 'customer',
      startDate: 'start date',
      expectedEndDate: 'expected end date',
      returnedAt: 'return date',
      isOpenContract: 'contract type',
      totalPrice: 'total price',
      deposit: 'deposit',
      guarantee: 'guarantee',
      lateFee: 'late fee',
      totalPaid: 'amount paid',
      isFullyPaid: 'payment status',
      status: 'rental status',
      damageReport: 'damage report',
      isDeleted: 'deletion status',
    };

    return fieldNames[field] || field;
  }

  // Helper method to get user-friendly status-based error messages
  private getStatusBasedErrorMessage(
    currentStatus: RentStatus,
    operation: 'update' | 'delete',
    attemptedFields?: string[],
  ): string {
    switch (currentStatus) {
      case 'active':
        if (operation === 'delete') {
          return 'Cannot delete an active rental. Please complete or cancel it first.';
        } else {
          return 'This rental is currently active. You can only update payment information, damage reports, or change the status to completed/canceled.';
        }

      case 'completed':
        if (operation === 'delete') {
          return 'Completed rentals can be deleted for record management purposes.';
        } else {
          return 'This rental is completed. You can only update payment records and damage reports.';
        }

      case 'canceled':
        if (operation === 'update') {
          return 'Canceled rentals cannot be modified. Please create a new rental if needed.';
        }
        break;

      case 'reserved':
        // Reserved rentals can be fully modified and deleted
        break;
    }

    return `Cannot ${operation} this rental in its current state.`;
  }

  // Helper method to determine which fields can be updated based on rent status
  private getAllowedUpdateFields(rent: any): string[] {
    const currentStatus = this.getAutoStatus(
      rent.startDate,
      rent.returnedAt,
      rent.expectedEndDate,
      rent.status,
    );

    switch (currentStatus) {
      case 'reserved':
        // Reserved rents can be fully modified
        return [
          'carId',
          'customerId',
          'startDate',
          'expectedEndDate',
          'returnedAt',
          'isOpenContract',
          'totalPrice',
          'deposit',
          'guarantee',
          'lateFee',
          'totalPaid',
          'isFullyPaid',
          'status',
          'damageReport',
        ];

      case 'active':
        // Active rents can only update payments, damage reports, and status
        return [
          'totalPrice', // Allow price adjustments for open contracts
          'lateFee',
          'totalPaid',
          'isFullyPaid',
          'damageReport',
          'status', // Allow changing to completed/canceled
          'returnedAt', // Allow setting return date to complete
        ];

      case 'completed':
        // Completed rents can only update payment records and damage reports
        return ['totalPaid', 'isFullyPaid', 'damageReport', 'lateFee'];

      case 'canceled':
        // Canceled rents cannot be modified
        return [];

      default:
        return [];
    }
  }

  async create(createRentDto: CreateRentDto, userId: string) {
    try {
      // Validate user and get organization
      const currentUserOrgId = await this.dbService.db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.userId, userId));

      if (!currentUserOrgId.length) {
        throw new BadRequestException(
          await this.tr('rents.errors.org_not_found'),
        );
      }

      const orgId = currentUserOrgId[0].id;
      const { id, rentContractId, rentNumber, year } =
        await this.generateRentId(orgId);
      // Validate and convert dates
      const startDate = ensureDate(createRentDto.startDate);
      const expectedEndDate = ensureDate(createRentDto.expectedEndDate);
      const returnedAt = ensureDate(createRentDto.returnedAt);

      if (!startDate) {
        throw new BadRequestException(
          await this.tr('rents.errors.start_required'),
        );
      }

      // Validate date logic
      const endDate = returnedAt || expectedEndDate;
      if (!endDate) {
        throw new BadRequestException(
          await this.tr('rents.errors.end_required'),
        );
      }

      // Ensure start date is not after end date
      if (startDate >= endDate) {
        throw new BadRequestException(
          await this.tr('rents.errors.start_after_end'),
        );
      }

      // Validate that dates are not too far in the past (optional business rule)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      if (startDate < oneYearAgo) {
        throw new BadRequestException(
          await this.tr('rents.errors.start_too_old'),
        );
      }

      // Verify car exists and belongs to the organization
      const carExists = await this.dbService.db
        .select()
        .from(cars)
        .where(
          and(eq(cars.id, createRentDto.carId), ne(cars.status, 'deleted')),
        );

      if (!carExists.length) {
        throw new BadRequestException(
          await this.tr('rents.errors.car_not_found'),
        );
      }

      if (carExists[0].orgId !== orgId) {
        throw new BadRequestException(
          await this.tr('rents.errors.car_wrong_org'),
        );
      }

      // Verify customer exists and belongs to the organization
      const customerExists = await this.dbService.db
        .select({ id: customers.id, orgId: customers.orgId })
        .from(customers)
        .where(eq(customers.id, createRentDto.customerId));

      if (!customerExists.length) {
        throw new BadRequestException(
          await this.tr('rents.errors.customer_not_found'),
        );
      }

      if (customerExists[0].orgId !== orgId) {
        throw new BadRequestException(
          await this.tr('rents.errors.customer_wrong_org'),
        );
      }

      // Check car availability
      const available = await this.isCarAvailableForRange(
        createRentDto.carId,
        startDate,
        endDate,
      );

      if (!available) {
        throw new BadRequestException(
          await this.tr('rents.errors.car_unavailable'),
        );
      }

      // Validate financial data
      if (
        createRentDto.totalPrice !== undefined &&
        createRentDto.totalPrice < 0
      ) {
        throw new BadRequestException(
          await this.tr('rents.errors.negative_total_price'),
        );
      }

      if (createRentDto.deposit !== undefined && createRentDto.deposit < 0) {
        throw new BadRequestException(
          await this.tr('rents.errors.negative_deposit'),
        );
      }

      if (
        createRentDto.guarantee !== undefined &&
        createRentDto.guarantee < 0
      ) {
        throw new BadRequestException(
          await this.tr('rents.errors.negative_guarantee'),
        );
      }

      if (
        createRentDto.totalPaid !== undefined &&
        createRentDto.totalPaid < 0
      ) {
        throw new BadRequestException(
          await this.tr('rents.errors.negative_paid'),
        );
      }

      // Validate that total paid doesn't exceed total price (if both are provided)
      if (
        !createRentDto.isOpenContract && // Only for fixed contracts
        createRentDto.totalPrice !== undefined &&
        createRentDto.totalPaid !== undefined &&
        createRentDto.totalPaid > createRentDto.totalPrice
      ) {
        throw new BadRequestException(
          await this.tr('rents.errors.paid_exceeds_total'),
        );
      }

      // Auto-determine initial status
      const autoStatus: RentStatus = this.getAutoStatus(
        startDate,
        returnedAt || null,
        expectedEndDate || null,
        'reserved',
      );

      // Prepare data with properly converted dates
      const rentData = {
        id, // ✅ Normal UUID
        rentContractId, // ✅ Formatted contract ID
        rentNumber,
        year,
        orgId,
        status: autoStatus,
        carId: createRentDto.carId,
        customerId: createRentDto.customerId,
        startDate,
        expectedEndDate,
        returnedAt,
        isOpenContract: createRentDto.isOpenContract ?? false,
        totalPrice: createRentDto.totalPrice,
        deposit: createRentDto.deposit,
        guarantee: createRentDto.guarantee,
        lateFee: createRentDto.lateFee,
        totalPaid: createRentDto.totalPaid,
        isFullyPaid: createRentDto.isFullyPaid ?? false,
        damageReport: createRentDto.damageReport,
        isDeleted: false,
      };

      // Remove undefined values
      Object.keys(rentData).forEach(
        (key) =>
          rentData[key as keyof typeof rentData] === undefined &&
          delete rentData[key as keyof typeof rentData],
      );

      await this.dbService.db.insert(rents).values(rentData);
      // 🔔 Add notification
      const orgOwner = await this.getOrgOwner(orgId);
      if (orgOwner) {
        // Get customer and car details for better notification
        const [customer] = await this.dbService.db
          .select({
            firstName: customers.firstName,
            lastName: customers.lastName,
          })
          .from(customers)
          .where(eq(customers.id, createRentDto.customerId));

        const [car] = await this.dbService.db
          .select({ make: cars.make, model: cars.model })
          .from(cars)
          .where(eq(cars.id, createRentDto.carId));

        const ownerLang = await this.getUserLocale(orgOwner.userId);
        const title = await this.tr(
          'rents.notifications.created.title',
          {},
          ownerLang,
        );
        const message = await this.tr(
          'rents.notifications.created.message',
          {
            firstName: customer?.firstName || '',
            lastName: customer?.lastName || '',
            make: car?.make || '',
            model: car?.model || '',
            contractId: rentContractId,
          },
          ownerLang,
        );
        const actionLabel = await this.tr(
          'rents.notifications.created.action_label',
          {},
          ownerLang,
        );

        await this.notificationsService.createNotification({
          userId: orgOwner.userId,
          orgId,
          category: 'RENTAL',
          type: 'RENT_STARTED',
          priority: 'MEDIUM',
          title,
          message,
          actionUrl: `/rents`,
          actionLabel,
          metadata: {
            rentalId: id,
            rentContractId,
            customerId: createRentDto.customerId,
            carId: createRentDto.carId,
            totalPrice: createRentDto.totalPrice,
          },
        });
      }

      return {
        success: true,
        message: await this.tr('rents.success.created'),
        data: { id, rentContractId, ...rentData },
      };
    } catch (error) {
      // If it's already a BadRequestException, re-throw it
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Handle database constraint errors with user-friendly messages
      if (error.code === '23505') {
        throw new BadRequestException(
          await this.tr('rents.errors.create_failed'),
        );
      }

      if (error.code === '23503') {
        throw new BadRequestException(
          await this.tr('rents.errors.car_not_found'),
        );
      }

      if (error.code === '23514') {
        throw new BadRequestException(
          await this.tr('rents.errors.create_failed'),
        );
      }

      if (error.code === '23502') {
        throw new BadRequestException(
          await this.tr('rents.errors.create_failed'),
        );
      }

      // Generic error for any other unexpected issues
      throw new BadRequestException(
        await this.tr('rents.errors.create_failed'),
      );
    }
  }

  async getAllRentsWithCarAndCustomer(orgId: string, page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(rents)
      .where(and(eq(rents.isDeleted, false), eq(rents.orgId, orgId)));

    const rawData = await this.dbService.db
      .select({
        id: rents.id,
        rentContractId: rents.rentContractId,
        rentNumber: rents.rentNumber,
        year: rents.year,
        carId: rents.carId,
        customerId: rents.customerId,
        startDate: rents.startDate,
        expectedEndDate: rents.expectedEndDate,
        isOpenContract: rents.isOpenContract,
        returnedAt: rents.returnedAt,
        totalPrice: rents.totalPrice,
        deposit: rents.deposit,
        guarantee: rents.guarantee,
        lateFee: rents.lateFee,
        totalPaid: rents.totalPaid,
        isFullyPaid: rents.isFullyPaid,
        status: rents.status,
        damageReport: rents.damageReport,
        carModel: cars.model,
        carMake: cars.make,
        pricePerDay: cars.pricePerDay,
        customerName: sql<string>`CONCAT(${customers.firstName}, ' ', ${customers.lastName})`,
        customerEmail: customers.email,
        // 🆕 Add car image IDs
        carImg1Id: rents.carImg1Id,
        carImg2Id: rents.carImg2Id,
        carImg3Id: rents.carImg3Id,
        carImg4Id: rents.carImg4Id,
      })
      .from(rents)
      .leftJoin(cars, eq(rents.carId, cars.id))
      .leftJoin(customers, eq(rents.customerId, customers.id))
      .where(and(eq(rents.isDeleted, false), eq(rents.orgId, orgId)))
      .orderBy(sql`${rents.startDate} DESC`)
      .offset(offset)
      .limit(pageSize);

    const data = rawData.map((rent) => ({
      ...rent,
      status: this.getAutoStatus(
        rent.startDate,
        rent.returnedAt,
        rent.expectedEndDate,
        rent.status,
      ),
      // 🆕 Add car images count for frontend display
      carImagesCount: [
        rent.carImg1Id,
        rent.carImg2Id,
        rent.carImg3Id,
        rent.carImg4Id,
      ].filter(Boolean).length,
    }));

    return {
      data,
      page,
      pageSize,
      total: Number(count),
      totalPages: Math.ceil(Number(count) / pageSize),
    };
  }

  async findAll({ page = 1, pageSize = 10 }) {
    const offset = (page - 1) * pageSize;
    const rentsList = await this.dbService.db
      .select()
      .from(rents)
      .where(eq(rents.isDeleted, false))
      .limit(pageSize)
      .offset(offset);

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(rents);

    const dataWithAutoStatus = rentsList.map((rent) => ({
      ...rent,
      status: this.getAutoStatus(
        rent.startDate,
        rent.returnedAt,
        rent.expectedEndDate,
        rent.status,
      ),
    }));

    return {
      data: dataWithAutoStatus,
      total: Number(count),
      page,
      pageSize,
    };
  }

  async findOne(id: string) {
    const result = await this.dbService.db
      .select({
        // Rent data
        id: rents.id,
        rentContractId: rents.rentContractId,
        rentNumber: rents.rentNumber,
        year: rents.year,
        orgId: rents.orgId,
        carId: rents.carId,
        customerId: rents.customerId,
        startDate: rents.startDate,
        expectedEndDate: rents.expectedEndDate,
        returnedAt: rents.returnedAt,
        isOpenContract: rents.isOpenContract,
        totalPrice: rents.totalPrice,
        deposit: rents.deposit,
        guarantee: rents.guarantee,
        lateFee: rents.lateFee,
        totalPaid: rents.totalPaid,
        isFullyPaid: rents.isFullyPaid,
        status: rents.status,
        damageReport: rents.damageReport,
        isDeleted: rents.isDeleted,
        // 🆕 Car image IDs
        carImg1Id: rents.carImg1Id,
        carImg2Id: rents.carImg2Id,
        carImg3Id: rents.carImg3Id,
        carImg4Id: rents.carImg4Id,
        // Car data
        carMake: cars.make,
        carModel: cars.model,
        pricePerDay: cars.pricePerDay,
        // Customer data
        customerName: sql<string>`CONCAT(${customers.firstName}, ' ', ${customers.lastName})`,
        customerFirstName: customers.firstName,
        customerLastName: customers.lastName,
        customerEmail: customers.email,
        customerPhone: customers.phone,
      })
      .from(rents)
      .leftJoin(cars, eq(rents.carId, cars.id))
      .leftJoin(customers, eq(rents.customerId, customers.id))
      .where(and(eq(rents.id, id), eq(rents.isDeleted, false)));

    if (result.length > 0) {
      const rent = result[0];

      // 🆕 Build car images array with URLs
      const carImages = [];
      const imageIds = [
        rent.carImg1Id,
        rent.carImg2Id,
        rent.carImg3Id,
        rent.carImg4Id,
      ];

      for (const imageId of imageIds) {
        if (imageId) {
          try {
            const imageFile = await this.filesService.findOne(imageId);
            if (imageFile) {
              carImages.push({
                id: imageFile.id,
                name: imageFile.name,
                url: imageFile.url || `/api/v1/files/${imageFile.id}/serve`,
                size: imageFile.size,
                path: imageFile.path,
              });
            }
          } catch (error) {
            console.warn(`Failed to fetch car image ${imageId}:`, error);
            // Continue with other images, don't fail the entire request
          }
        }
      }

      return [
        {
          ...rent,
          status: this.getAutoStatus(
            rent.startDate,
            rent.returnedAt,
            rent.expectedEndDate,
            rent.status,
          ),
          // 🆕 Add car images data
          carImages,
          carImagesCount: carImages.length,
        },
      ];
    }

    return result;
  }
  async update(id: string, updateRentDto: Partial<CreateRentDto>) {
    try {
      // 1) Load current rent
      const currentRent = await this.dbService.db
        .select()
        .from(rents)
        .where(and(eq(rents.id, id), eq(rents.isDeleted, false)));

      if (currentRent.length === 0) {
        throw new BadRequestException(
          await this.tr('rents.errors.rent_not_found'),
        );
      }

      const rent = currentRent[0];

      // 2) Status-based allowed fields checks (kept from your logic)
      const currentStatus = this.getAutoStatus(
        rent.startDate,
        rent.returnedAt,
        rent.expectedEndDate,
        rent.status,
      );
      const allowedFields = this.getAllowedUpdateFields(rent);

      const attemptedFields = Object.keys(updateRentDto);
      const disallowedFields = attemptedFields.filter(
        (field) => !allowedFields.includes(field),
      );
      if (disallowedFields.length > 0) {
        throw new BadRequestException(
          this.getStatusBasedErrorMessage(
            currentStatus,
            'update',
            disallowedFields,
          ),
        );
      }

      // 3) Prepare update data
      const updateData: any = {};
      let datesChanged = false;

      // Convert dates safely
      if (
        updateRentDto.startDate !== undefined &&
        allowedFields.includes('startDate')
      ) {
        const d = ensureDate(updateRentDto.startDate);
        if (d) {
          updateData.startDate = d;
          datesChanged = true;
        }
      }
      if (
        updateRentDto.expectedEndDate !== undefined &&
        allowedFields.includes('expectedEndDate')
      ) {
        const d = ensureDate(updateRentDto.expectedEndDate);
        if (d) {
          updateData.expectedEndDate = d;
          datesChanged = true;
        }
      }
      if (
        updateRentDto.returnedAt !== undefined &&
        allowedFields.includes('returnedAt')
      ) {
        const d = ensureDate(updateRentDto.returnedAt);
        if (d) {
          updateData.returnedAt = d;
          datesChanged = true;
        }
      }

      // Non-date fields
      const nonDateFields = [
        'carId',
        'customerId',
        'rentNumber',
        'rentContractId',
        'isOpenContract',
        'totalPrice',
        'deposit',
        'guarantee',
        'lateFee',
        'totalPaid',
        'isFullyPaid',
        'status',
        'damageReport',
        'isDeleted',
      ] as const;

      for (const field of nonDateFields) {
        if (
          updateRentDto[field as keyof CreateRentDto] !== undefined &&
          allowedFields.includes(field)
        ) {
          updateData[field] = updateRentDto[field as keyof CreateRentDto];
        }
      }

      // 4) Date-change availability check
      if (datesChanged) {
        const newStartDate = updateData.startDate || rent.startDate;
        const newEndDate =
          updateData.returnedAt ||
          updateData.expectedEndDate ||
          rent.returnedAt ||
          rent.expectedEndDate;

        if (newStartDate && newEndDate) {
          const available = await this.isCarAvailableForRange(
            rent.carId,
            newStartDate,
            newEndDate,
            id,
          );
          if (!available) {
            throw new BadRequestException(
              await this.tr('rents.errors.car_unavailable'),
            );
          }
        }
      }

      // 5) Keep billed-to-date current for open contracts (sets totalPrice)
      // helper for whole-day diff in UTC
      // function daysBetweenUTC(a: Date, b: Date) {
      //   const A = new Date(
      //     Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()),
      //   );
      //   const B = new Date(
      //     Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()),
      //   );
      //   return Math.max(0, Math.ceil((B.getTime() - A.getTime()) / 86400000));
      // }

      const openNowOrLater =
        rent.isOpenContract || updateRentDto.isOpenContract;

      if (openNowOrLater && updateRentDto.totalPrice === undefined) {
        const [carRow] = await this.dbService.db
          .select({ pricePerDay: cars.pricePerDay })
          .from(cars)
          .where(eq(cars.id, rent.carId));

        if (carRow?.pricePerDay != null) {
          const start = updateRentDto.startDate
            ? ensureDate(updateRentDto.startDate)!
            : rent.startDate;

          // If returning now, use returnedAt in payload; else use stored; if none => bill to NOW
          const endCandidate = updateRentDto.returnedAt
            ? ensureDate(updateRentDto.returnedAt)!
            : rent.returnedAt || new Date();

          const billedDays = daysBetweenUTC(start, endCandidate);
          const computedBilled = billedDays * carRow.pricePerDay;

          updateData.totalPrice = computedBilled;
        }
      }

      // 6) Normalize when fully paid / completed
      const willBeCompleted =
        (updateRentDto.status && updateRentDto.status === 'completed') ||
        (!!updateRentDto.returnedAt &&
          ensureDate(updateRentDto.returnedAt)! <= new Date());

      const finalBilledCandidate =
        updateRentDto.totalPrice ??
        updateData.totalPrice ??
        rent.totalPrice ??
        0;

      const willBeFullyPaid =
        updateRentDto.isFullyPaid === true ||
        (updateRentDto.totalPaid !== undefined &&
          finalBilledCandidate > 0 &&
          updateRentDto.totalPaid >= finalBilledCandidate);

      if (willBeCompleted || willBeFullyPaid) {
        // Recompute billed one last time for open contracts
        if (rent.isOpenContract || updateRentDto.isOpenContract) {
          const [carRow] = await this.dbService.db
            .select({ pricePerDay: cars.pricePerDay })
            .from(cars)
            .where(eq(cars.id, rent.carId));

          const start = updateRentDto.startDate
            ? ensureDate(updateRentDto.startDate)!
            : rent.startDate;

          const finalEnd = updateRentDto.returnedAt
            ? ensureDate(updateRentDto.returnedAt)!
            : rent.returnedAt || new Date();

          const billedDays = daysBetweenUTC(start, finalEnd);
          const recomputedBilled = (carRow?.pricePerDay ?? 0) * billedDays;

          updateData.totalPrice = recomputedBilled;
        }

        const finalBilled =
          updateRentDto.totalPrice ??
          updateData.totalPrice ??
          rent.totalPrice ??
          0;

        // If fully paid and totalPaid not provided, align it with final billed
        if (updateRentDto.totalPaid === undefined && willBeFullyPaid) {
          updateData.totalPaid = finalBilled;
        }

        // Flip isFullyPaid if implied
        if (updateRentDto.isFullyPaid === undefined && willBeFullyPaid) {
          updateData.isFullyPaid = true;
        }
      }

      // 7) Auto-status if not explicitly 'canceled' or set by payload
      const finalStartDate = updateData.startDate || rent.startDate;
      const finalReturnedAt = updateData.returnedAt || rent.returnedAt;
      const finalExpectedEndDate =
        updateData.expectedEndDate || rent.expectedEndDate;
      const newStatus = updateData.status || rent.status;

      if (newStatus !== 'canceled' && !updateRentDto.status) {
        const autoStatus: RentStatus = this.getAutoStatus(
          finalStartDate,
          finalReturnedAt,
          finalExpectedEndDate,
          newStatus as RentStatus,
        );
        updateData.status = autoStatus;
      }

      // 8) Persist
      const result = await this.dbService.db
        .update(rents)
        .set(updateData)
        .where(eq(rents.id, id));

      // 9) Notifications
      const orgOwner = await this.getOrgOwner(rent.orgId);
      if (orgOwner) {
        // Payment received (compare new vs old if provided)
        if (
          updateRentDto.totalPaid !== undefined &&
          updateRentDto.totalPaid > (rent.totalPaid || 0)
        ) {
          const paymentAmount = updateRentDto.totalPaid - (rent.totalPaid || 0);
          const ownerLang = await this.getUserLocale(orgOwner.userId);
          const pTitle = await this.tr(
            'rents.notifications.payment_received.title',
            {},
            ownerLang,
          );
          const pMessage = await this.tr(
            'rents.notifications.payment_received.message',
            { amount: paymentAmount, contractId: rent.rentContractId },
            ownerLang,
          );
          const pLabel = await this.tr(
            'rents.notifications.payment_received.action_label',
            {},
            ownerLang,
          );

          await this.notificationsService.createNotification({
            userId: orgOwner.userId,
            orgId: rent.orgId,
            category: 'PAYMENT',
            type: 'PAYMENT_RECEIVED',
            priority: 'MEDIUM',
            title: pTitle,
            message: pMessage,
            level: 'success',
            actionUrl: `/rents`,
            actionLabel: pLabel,
            metadata: {
              rentalId: id,
              paymentAmount,
              totalPaid: updateRentDto.totalPaid,
            },
          });
        }

        // Status change

        if (updateRentDto.status && updateRentDto.status !== rent.status) {
          let notificationType = 'RENT_STARTED';
          let titleKey = 'rents.notifications.status_changed.title';
          let messageKey = 'rents.notifications.status_changed.message';
          let priority: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM';
          let level: 'info' | 'success' | 'warning' = 'info';

          switch (updateRentDto.status) {
            case 'completed':
              notificationType = 'RENT_COMPLETED';
              titleKey = 'rents.notifications.completed.title';
              messageKey = 'rents.notifications.completed.message';
              level = 'success';
              break;
            case 'canceled':
              notificationType = 'RENT_CANCELLED';
              titleKey = 'rents.notifications.cancelled.title';
              messageKey = 'rents.notifications.cancelled.message';
              level = 'warning';
              priority = 'HIGH';
              break;
          }

          const ownerLang = await this.getUserLocale(orgOwner.userId);
          const sTitle = await this.tr(titleKey, {}, ownerLang);
          const sMessage = await this.tr(
            messageKey,
            { contractId: rent.rentContractId, status: updateRentDto.status },
            ownerLang,
          );
          const sLabel = await this.tr(
            'rents.notifications.status_changed.action_label',
            {},
            ownerLang,
          );

          await this.notificationsService.createNotification({
            userId: orgOwner.userId,
            orgId: rent.orgId,
            category: 'RENTAL',
            type: notificationType,
            priority,
            title: sTitle,
            message: sMessage,
            level,
            actionUrl: `/rents`,
            actionLabel: sLabel,
            metadata: {
              rentalId: id,
              oldStatus: rent.status,
              newStatus: updateRentDto.status,
            },
          });
        }

        // Damage report notification
        if (
          updateRentDto.damageReport !== undefined &&
          updateRentDto.damageReport !== rent.damageReport
        ) {
          let tKey: string | undefined;
          let mKey: string | undefined;
          let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'HIGH';

          if (!rent.damageReport && updateRentDto.damageReport) {
            tKey = 'rents.notifications.damage_reported.title';
            mKey = 'rents.notifications.damage_reported.message';
          } else if (rent.damageReport && updateRentDto.damageReport) {
            tKey = 'rents.notifications.damage_updated.title';
            mKey = 'rents.notifications.damage_updated.message';
          } else if (rent.damageReport && !updateRentDto.damageReport) {
            tKey = 'rents.notifications.damage_cleared.title';
            mKey = 'rents.notifications.damage_cleared.message';
            priority = 'MEDIUM';
          }

          if (tKey && mKey) {
            const ownerLang = await this.getUserLocale(orgOwner.userId);
            const dTitle = await this.tr(tKey, {}, ownerLang);
            const dMessage = await this.tr(
              mKey,
              {
                contractId: rent.rentContractId,
                report: updateRentDto.damageReport || '',
              },
              ownerLang,
            );
            const dLabel = await this.tr(
              'rents.notifications.damage_reported.action_label',
              {},
              ownerLang,
            );

            await this.notificationsService.createNotification({
              userId: orgOwner.userId,
              orgId: rent.orgId,
              category: 'CAR',
              type: 'CAR_DAMAGE_REPORTED',
              priority,
              title: dTitle,
              message: dMessage,
              level: 'warning',
              actionUrl: `/rents`,
              actionLabel: dLabel,
              metadata: {
                rentalId: id,
                oldDamageReport: rent.damageReport || null,
                newDamageReport: updateRentDto.damageReport || null,
              },
            });
          }
        }
      }

      return {
        success: true,
        message: await this.tr('rents.success.updated'),
        data: result,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === '23505') {
        throw new BadRequestException(
          await this.tr('rents.errors.update_failed'),
        );
      }
      if (error.code === '23503') {
        throw new BadRequestException(
          await this.tr('rents.errors.car_not_found'),
        );
      }
      if (error.code === '23514') {
        throw new BadRequestException(
          await this.tr('rents.errors.invalid_iformation'),
        );
      }
      if (error.code === '23502') {
        throw new BadRequestException(
          await this.tr('rents.errors.missing_required_info'),
        );
      }
      throw new BadRequestException(
        'Unable to update rental contract. Please try again or contact support.',
      );
    }
  }
  async remove(id: string) {
    try {
      if (!id) {
        throw new BadRequestException(
          await this.tr('rents.errors.rent_not_found'),
        );
      }

      const existingRent = await this.dbService.db
        .select()
        .from(rents)
        .where(and(eq(rents.id, id), eq(rents.isDeleted, false)));

      if (!existingRent.length) {
        throw new BadRequestException(
          await this.tr('rents.errors.rent_not_found_or_deleted'),
        );
      }

      const rent = existingRent[0];
      const currentStatus = this.getAutoStatus(
        rent.startDate,
        rent.returnedAt,
        rent.expectedEndDate,
        rent.status,
      );

      if (currentStatus === 'active') {
        throw new BadRequestException(
          await this.tr('rents.errors.cannot_delete_active'),
        );
      }

      // ✅ Use the TypeScript property name directly
      const result = await this.dbService.db
        .update(rents)
        .set({
          isDeleted: true,
        } as any)
        .where(eq(rents.id, id));

      return {
        success: true,
        message: await this.tr('rents.success.deleted', {
          status: currentStatus,
        }),
        data: result,
      };
    } catch (error) {
      console.error('Error deleting rental:', error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        'Unable to delete rental contract. Please try again or contact support.',
      );
    }
  }
  private async generateRentContractId(
    orgId: string,
    year: number,
  ): Promise<{
    rentContractId: string;
    rentNumber: number;
  }> {
    this.logger.log(
      `Generating rent contract ID for org ${orgId}, year ${year}`,
    );

    try {
      // Use a database transaction to ensure atomic counter increment
      return await this.dbService.db.transaction(async (tx) => {
        // First, try to get the current counter for this org and year
        const existingCounter = await tx
          .select({
            id: rentCounters.id,
            counter: rentCounters.counter,
          })
          .from(rentCounters)
          .where(
            and(eq(rentCounters.orgId, orgId), eq(rentCounters.year, year)),
          )
          .limit(1);

        let nextNumber: number;

        if (existingCounter.length > 0) {
          // Update existing counter
          nextNumber = existingCounter[0].counter + 1;

          await tx
            .update(rentCounters)
            .set({
              counter: nextNumber,
              updatedAt: new Date(),
            })
            .where(eq(rentCounters.id, existingCounter[0].id));

          this.logger.log(
            `Updated existing counter to ${nextNumber} for org ${orgId}, year ${year}`,
          );
        } else {
          // Create new counter for this org/year combination
          nextNumber = 1;

          await tx.insert(rentCounters).values({
            id: createId(),
            orgId,
            year,
            counter: nextNumber,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          this.logger.log(
            `Created new counter starting at ${nextNumber} for org ${orgId}, year ${year}`,
          );
        }

        // Format as 001/2025, 002/2025, etc.
        const rentContractId = `${nextNumber.toString().padStart(3, '0')}/${year}`;

        this.logger.log(`Generated rent contract ID: ${rentContractId}`);

        return {
          rentContractId,
          rentNumber: nextNumber,
        };
      });
    } catch (error) {
      this.logger.error('Generate rent contract ID error:', error);
      throw new BadRequestException(
        `Failed to generate rent contract ID: ${error.message}`,
      );
    }
  }

  // Your existing createWithImages method and other methods...
  async createWithImages(
    createRentDto: CreateRentDto,
    userId: string,
    carImages?: Express.Multer.File[],
  ) {
    console.log('🏗️ RentsService.createWithImages called');
    console.log('👤 UserId:', userId);
    console.log('📷 Images received:', carImages?.length || 0);

    if (carImages) {
      carImages.forEach((img, idx) => {
        console.log(
          `   Image ${idx + 1}: ${img.originalname} (${img.size} bytes, ${img.mimetype})`,
        );
        console.log(`   Buffer length: ${img.buffer?.length || 'NO BUFFER'}`);
      });
    }

    this.logger.log(
      `Creating rent with ${carImages?.length || 0} images for user ${userId}`,
    );

    try {
      // Get user's organization ID
      const currentUserOrgId = await this.dbService.db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.userId, userId));

      if (!currentUserOrgId.length) {
        throw new BadRequestException('Organization not found for this user');
      }

      const orgId = currentUserOrgId[0].id;
      console.log('🏢 Organization ID:', orgId);

      if (!orgId) {
        throw new BadRequestException('User must belong to an organization');
      }

      // Generate rent contract ID
      const currentYear = new Date().getFullYear();
      const { rentContractId, rentNumber } = await this.generateRentContractId(
        orgId,
        currentYear,
      );

      console.log('📄 Generated rent contract ID:', rentContractId);

      // Process image uploads
      let imageIds: { [key: string]: string | undefined } = {
        carImg1Id: undefined,
        carImg2Id: undefined,
        carImg3Id: undefined,
        carImg4Id: undefined,
      };

      if (carImages && carImages.length > 0) {
        console.log('🔄 Starting image processing...');

        // Validate images first
        const validImages = await this.validateImages(carImages);
        console.log('✅ Validation passed for', validImages.length, 'images');

        const uploadPromises = validImages
          .slice(0, 4)
          .map(async (file, index) => {
            try {
              console.log(
                `⬆️ Uploading image ${index + 1}/${validImages.length}: ${file.originalname}`,
              );

              const uploadResult = await this.filesService.uploadFile(
                file,
                { id: userId, org_id: orgId } as any,
                {
                  type: 'image',
                  isPublic: false,
                  organizationId: orgId,
                  folder: `rents/${rentContractId}/images`,
                },
              );

              console.log(
                `✅ Upload successful - Image ${index + 1}: ${uploadResult.id}`,
              );
              return {
                index,
                fileId: uploadResult.id,
                fileName: file.originalname,
              };
            } catch (error) {
              console.log(`❌ Upload failed - Image ${index + 1}:`, error);
              this.logger.error(
                `Failed to upload image ${index + 1} (${file.originalname}):`,
                error,
              );
              throw new BadRequestException(
                `Failed to upload image "${file.originalname}": ${error.message}`,
              );
            }
          });

        const uploadResults = await Promise.allSettled(uploadPromises);
        console.log('📊 Upload results:', uploadResults.length);

        // Process results
        uploadResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const key =
              `carImg${result.value.index + 1}Id` as keyof typeof imageIds;
            imageIds[key] = result.value.fileId;
            console.log(
              `✅ Assigned ${result.value.fileName} to ${key}: ${result.value.fileId}`,
            );
            this.logger.log(
              `Assigned ${result.value.fileName} to ${key}: ${result.value.fileId}`,
            );
          } else {
            console.log(`❌ Upload result ${index + 1} failed:`, result.reason);
            this.logger.error(
              `Image upload ${index + 1} failed:`,
              result.reason,
            );
          }
        });

        const successfulUploads = uploadResults.filter(
          (r) => r.status === 'fulfilled',
        ).length;
        console.log(
          `📈 Successfully uploaded ${successfulUploads}/${carImages.length} images`,
        );
        this.logger.log(
          `Successfully uploaded ${successfulUploads}/${carImages.length} images`,
        );
      } else {
        console.log('ℹ️ No images to process');
      }

      // Validate dates
      const startDate = ensureDate(createRentDto.startDate);
      const expectedEndDate = ensureDate(createRentDto.expectedEndDate);
      const returnedAt = ensureDate(createRentDto.returnedAt);

      if (!startDate) {
        throw new BadRequestException('Please provide a valid start date');
      }

      // Auto-determine initial status
      const autoStatus: RentStatus = this.getAutoStatus(
        startDate,
        returnedAt || null,
        expectedEndDate || null,
        'reserved',
      );
      const id = createId();
      // Create rent with image IDs
      const rentData: CreateRentData = {
        id,
        rentContractId,
        rentNumber,
        year: currentYear,
        orgId,
        carId: createRentDto.carId,
        customerId: createRentDto.customerId,
        startDate,
        expectedEndDate,
        returnedAt,
        isOpenContract: createRentDto.isOpenContract || false,
        totalPrice: createRentDto.totalPrice || 0,
        deposit: createRentDto.deposit || 0,
        guarantee: createRentDto.guarantee || 0,
        lateFee: createRentDto.lateFee || 0,
        totalPaid: createRentDto.totalPaid || 0,
        isFullyPaid: createRentDto.isFullyPaid || false,
        status: autoStatus,
        damageReport: createRentDto.damageReport || '',
        isDeleted: false,
        ...imageIds,
      };
      const orgOwner = await this.getOrgOwner(orgId);
      if (orgOwner) {
        // Get customer and car details for better notification
        const [customer] = await this.dbService.db
          .select({
            firstName: customers.firstName,
            lastName: customers.lastName,
          })
          .from(customers)
          .where(eq(customers.id, createRentDto.customerId));

        const [car] = await this.dbService.db
          .select({ make: cars.make, model: cars.model })
          .from(cars)
          .where(eq(cars.id, createRentDto.carId));

        const ownerLang = await this.getUserLocale(orgOwner.userId);
        const title = await this.tr(
          'rents.notifications.created.title',
          {},
          ownerLang,
        );
        const message = await this.tr(
          'rents.notifications.created.message',
          {
            firstName: customer?.firstName || '',
            lastName: customer?.lastName || '',
            make: car?.make || '',
            model: car?.model || '',
            contractId: rentContractId,
          },
          ownerLang,
        );
        const actionLabel = await this.tr(
          'rents.notifications.created.action_label',
          {},
          ownerLang,
        );
        await this.notificationsService.createNotification({
          userId: orgOwner.userId,
          orgId,
          category: 'RENTAL',
          type: 'RENT_STARTED',
          priority: 'MEDIUM',
          title,
          message,
          actionUrl: `/rents`,
          actionLabel,
          metadata: {
            rentalId: id,
            rentContractId,
            customerId: createRentDto.customerId,
            carId: createRentDto.carId,
            totalPrice: createRentDto.totalPrice,
          },
        });
      }
      console.log('💾 Creating rent with data:', {
        id: rentData.id,
        carImg1Id: rentData.carImg1Id,
        carImg2Id: rentData.carImg2Id,
        carImg3Id: rentData.carImg3Id,
        carImg4Id: rentData.carImg4Id,
      });

      const createdRent = await this.rentsRepository.create(rentData);

      const carImagesCount = Object.values(imageIds).filter(
        (id) => id !== undefined,
      ).length;
      const carImageIds = Object.values(imageIds).filter(
        (id) => id !== undefined,
      ) as string[];

      console.log('✅ Rent created successfully:');
      console.log('   ID:', createdRent.id);
      console.log('   Images:', carImagesCount);
      console.log('   Image IDs:', carImageIds);

      this.logger.log(
        `Created rent ${createdRent.id} with ${carImagesCount} images`,
      );

      return {
        success: true,
        message: await this.tr('rents.success.created_with_images', {
          count: carImagesCount,
        }),
        data: {
          ...createdRent,
          carImagesCount,
          carImageIds,
        },
      };
    } catch (error) {
      console.log('❌ CreateWithImages error:', error);
      this.logger.error('Create rent with images error:', error);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      throw new BadRequestException(
        error.message || 'Failed to create rent contract with images',
      );
    }
  }
  // Enhanced image validation method
  private async validateImages(
    images: Express.Multer.File[],
  ): Promise<Express.Multer.File[]> {
    console.log('🔍 Validating', images.length, 'images...');

    const validImages: Express.Multer.File[] = [];
    const errors: string[] = [];

    for (const [index, image] of images.entries()) {
      console.log(`   Validating image ${index + 1}: ${image.originalname}`);
      console.log(`   Size: ${image.size} bytes`);
      console.log(`   Type: ${image.mimetype}`);
      console.log(`   Has buffer: ${!!image.buffer}`);

      // Size validation (10MB)
      if (image.size > 10 * 1024 * 1024) {
        console.log(`   ❌ Too large: ${image.size}`);
        errors.push(`${image.originalname} is too large (max 10MB)`);
        continue;
      }

      // Type validation
      if (!image.mimetype.match(/^image\/(jpeg|jpg|png|webp|gif)$/)) {
        console.log(`   ❌ Invalid type: ${image.mimetype}`);
        errors.push(`${image.originalname} is not a valid image type`);
        continue;
      }

      // Check if file has content
      if (!image.buffer || image.buffer.length === 0) {
        console.log(`   ❌ No buffer content`);
        errors.push(`${image.originalname} has no content`);
        continue;
      }

      console.log(`   ✅ Valid: ${image.originalname}`);
      validImages.push(image);
    }

    if (errors.length > 0) {
      console.log('❌ Validation errors:', errors);
      this.logger.warn('Image validation errors:', errors);
      throw new BadRequestException(
        `Image validation failed: ${errors.join(', ')}`,
      );
    }

    console.log(`✅ Validated ${validImages.length} images successfully`);
    this.logger.log(`Validated ${validImages.length} images successfully`);
    return validImages;
  }

  async getRentContract(rentId: string) {
    try {
      const [rentData] = await this.dbService.db
        .select({
          // Rent details
          id: rents.id,
          orgId: rents.orgId,
          rentContractId: rents.rentContractId,
          rentNumber: rents.rentNumber,
          year: rents.year,
          startDate: rents.startDate,
          expectedEndDate: rents.expectedEndDate,
          returnedAt: rents.returnedAt,
          totalPrice: rents.totalPrice,
          deposit: rents.deposit,
          guarantee: rents.guarantee,
          isOpenContract: rents.isOpenContract,
          status: rents.status,
          // Customer details
          customerFirstName: customers.firstName,
          customerLastName: customers.lastName,
          customerEmail: customers.email,
          customerPhone: customers.phone,
          customerAddress: customers.address,
          customerDocId: customers.documentId,
          customerDocType: customers.documentType,
          customerDriverLicense: customers.driversLicense,
          // Car details
          carMake: cars.make,
          carModel: cars.model,
          carYear: cars.year,
          carPlate: cars.plateNumber,
          carColor: cars.color,
          carFuelType: cars.fuelType,
          carMileage: cars.mileage,
          pricePerDay: cars.pricePerDay,
          fuelType: cars.fuelType,
        })
        .from(rents)
        .leftJoin(customers, eq(rents.customerId, customers.id))
        .leftJoin(cars, eq(rents.carId, cars.id))
        .where(eq(rents.id, rentId));

      if (!rentData) {
        throw new NotFoundException(
          await this.tr('rents.errors.rent_not_found'),
        );
      }

      // ✅ Normalize customer identity fields
      let customerCIN = '...............';
      let customerPassport = '...............';

      switch (rentData.customerDocType?.toUpperCase()) {
        case 'ID_CARD':
          customerCIN = rentData.customerDocId + ' (CIN)' || '...............';
          break;
        case 'PASSPORT':
          customerPassport =
            rentData.customerDocId + ' (Passport)' || '...............';
          break;
      }

      return {
        success: true,
        data: {
          ...rentData,
          customerCIN:
            customerCIN !== '...............' ? customerCIN : undefined,
          customerPassport:
            customerPassport !== '...............'
              ? customerPassport
              : undefined,
          driverLicense: rentData.customerDriverLicense || '...............',
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(await this.tr('rents.errors.fetch_failed'));
    }
  }

  async getRentWithImages(rentId: string) {
    this.logger.log(`Fetching rent ${rentId} with images`);

    try {
      const rentData = await this.rentsRepository.findOneWithImages(rentId);

      if (!rentData) {
        throw new NotFoundException('Rent contract not found');
      }

      // Enhanced image processing
      const carImages = [];

      for (let i = 1; i <= 4; i++) {
        const nameField = `img${i}Name`;
        const pathField = `img${i}Path`;
        const urlField = `img${i}Url`;

        if (rentData[nameField] && rentData[pathField]) {
          const imageId = rentData[`carImg${i}Id`];
          const imageUrl = rentData[urlField] || `/files/${imageId}/serve`;

          carImages.push({
            id: imageId,
            name: rentData[nameField],
            path: rentData[pathField],
            url: imageUrl,
            size: null, // Could be fetched from files table if needed
            order: i,
          });
        }
      }

      this.logger.log(
        `Retrieved rent ${rentId} with ${carImages.length} images`,
      );

      return {
        id: rentData.id,
        rentContractId: rentData.rentContractId,
        rentNumber: rentData.rentNumber,
        year: rentData.year,
        carId: rentData.carId,
        customerId: rentData.customerId,
        startDate: rentData.startDate,
        expectedEndDate: rentData.expectedEndDate,
        returnedAt: rentData.returnedAt,
        isOpenContract: rentData.isOpenContract,
        status: rentData.status,
        totalPrice: rentData.totalPrice,
        deposit: rentData.deposit,
        guarantee: rentData.guarantee,
        lateFee: rentData.lateFee,
        totalPaid: rentData.totalPaid,
        isFullyPaid: rentData.isFullyPaid,
        damageReport: rentData.damageReport,
        carModel: rentData.carModel,
        carMake: rentData.carMake,
        pricePerDay: rentData.pricePerDay,
        customerName: rentData.customerName,
        carImages,
        carImagesCount: carImages.length,
        carImg1Id: rentData.carImg1Id,
        carImg2Id: rentData.carImg2Id,
        carImg3Id: rentData.carImg3Id,
        carImg4Id: rentData.carImg4Id,
      };
    } catch (error) {
      this.logger.error('Get rent with images error:', error);

      if (error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException(
        await this.tr('rents.errors.images_fetch_failed'),
      );
    }
  }

  async updateRentImages(
    rentId: string,
    userId: string,
    carImages: Express.Multer.File[],
  ) {
    this.logger.log(
      `Updating images for rent ${rentId} with ${carImages.length} new images`,
    );

    try {
      // Verify rent exists
      const [rent] = await this.dbService.db
        .select()
        .from(rents)
        .where(and(eq(rents.id, rentId), eq(rents.isDeleted, false)));

      if (!rent) {
        throw new NotFoundException('Rent contract not found');
      }

      // Get user's org
      const currentUserOrgId = await this.dbService.db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.userId, userId));

      if (!currentUserOrgId.length) {
        throw new BadRequestException('Organization not found for this user');
      }

      const orgId = currentUserOrgId[0].id;

      // Clean up existing images
      const existingImageIds = [
        rent.carImg1Id,
        rent.carImg2Id,
        rent.carImg3Id,
        rent.carImg4Id,
      ].filter(Boolean) as string[];

      if (existingImageIds.length > 0) {
        await Promise.allSettled(
          existingImageIds.map(async (imageId) => {
            try {
              await this.filesService.deleteFile(imageId, {
                id: userId,
                org_id: orgId,
              } as any);
            } catch (error) {
              this.logger.warn(`Failed to delete image ${imageId}:`, error);
            }
          }),
        );
      }

      // Upload new images
      const validImages = await this.validateImages(carImages);
      const uploadPromises = validImages
        .slice(0, 4)
        .map(async (file, index) => {
          try {
            const uploadResult = await this.filesService.uploadFile(
              file,
              { id: userId, org_id: orgId } as any,
              {
                type: 'image',
                isPublic: false,
                organizationId: orgId,
                folder: `rents/${rent.rentContractId}/images`,
              },
            );
            return {
              index,
              fileId: uploadResult.id,
              fileName: file.originalname,
            };
          } catch (error) {
            throw new BadRequestException(
              `Failed to upload image "${file.originalname}"`,
            );
          }
        });

      const uploadResults = await Promise.allSettled(uploadPromises);

      // Prepare image updates
      const imageUpdates = {
        carImg1Id: null,
        carImg2Id: null,
        carImg3Id: null,
        carImg4Id: null,
      };

      uploadResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          const key =
            `carImg${result.value.index + 1}Id` as keyof typeof imageUpdates;
          imageUpdates[key] = result.value.fileId;
        }
      });

      // Update rent with new image IDs
      await this.dbService.db
        .update(rents)
        .set(imageUpdates as any)
        .where(eq(rents.id, rentId));

      const successfulUploads = Object.values(imageUpdates).filter(
        (id) => id !== null,
      ).length;

      return {
        success: true,

        message: await this.tr('rents.success.images_updated', {
          count: successfulUploads,
        }),
        data: {
          carImagesCount: successfulUploads,
          carImageIds: Object.values(imageUpdates).filter((id) => id !== null),
        },
      };
    } catch (error) {
      this.logger.error('Update rent images error:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        await this.tr('rents.errors.images_update_failed'),
      );
    }
  }
  // 🆕 Get all rents with image info
  async getAllRentsWithCarAndCustomerAndImages(
    orgId: string,
    page = 1,
    pageSize = 10,
  ) {
    try {
      const result = await this.rentsRepository.getAllWithImages(
        orgId,
        page,
        pageSize,
      );

      // Add auto-calculated status and image counts
      const dataWithStatus = result.data.map((rent) => ({
        ...rent,
        status: this.getAutoStatus(
          rent.startDate,
          rent.returnedAt,
          rent.expectedEndDate,
          rent.status as RentStatus,
        ),
        carImagesCount: [
          rent.carImg1Id,
          rent.carImg2Id,
          rent.carImg3Id,
          rent.carImg4Id,
        ].filter(Boolean).length,
      }));

      return {
        ...result,
        data: dataWithStatus,
      };
    } catch (error) {
      throw new BadRequestException('Unable to fetch rental contracts');
    }
  }
  // 🆕 Helper method to cleanup uploaded images on failure
  private async cleanupUploadedImages(
    imageIds: string[],
    userId: string,
  ): Promise<void> {
    for (const imageId of imageIds) {
      try {
        await this.filesService.deleteFile(imageId, { id: userId } as any);
      } catch (error) {
        console.warn(`Failed to cleanup uploaded image ${imageId}:`, error);
      }
    }
  }

  async getRentImages(rentId: string): Promise<
    Array<{
      id: string;
      name: string;
      url: string;
      size: number;
      order: number;
    }>
  > {
    const [rent] = await this.dbService.db
      .select({
        carImg1Id: rents.carImg1Id,
        carImg2Id: rents.carImg2Id,
        carImg3Id: rents.carImg3Id,
        carImg4Id: rents.carImg4Id,
      })
      .from(rents)
      .where(eq(rents.id, rentId));

    if (!rent) return [];

    const images = [];
    const imageIds = [
      rent.carImg1Id,
      rent.carImg2Id,
      rent.carImg3Id,
      rent.carImg4Id,
    ];

    for (let i = 0; i < imageIds.length; i++) {
      const imageId = imageIds[i];
      if (imageId) {
        try {
          const imageFile = await this.filesService.findOne(imageId);
          if (imageFile) {
            images.push({
              id: imageFile.id,
              name: imageFile.name,
              // 🆕 Make URL absolute
              url:
                `${process.env.BETTER_AUTH_URL}/api/v1/files/${imageFile.id}/serve` ||
                imageFile.url,
              size: imageFile.size,
              order: i + 1,
            });
          }
        } catch (error) {
          this.logger.warn(`Failed to fetch car image ${imageId}:`, error);
        }
      }
    }

    return images;
  }
}
