import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateRentDto } from './dto/create-rent.dto';
import { UpdateRentDto } from './dto/update-rent.dto';
import { createId } from '@paralleldrive/cuid2';
import { cars, DatabaseService, organization } from 'src/db';
import { eq, sql, and, ne } from 'drizzle-orm';
import { rentCounters, rents } from 'src/db/schema/rents';
import { customers } from 'src/db/schema/customers';
import { RentStatus } from 'src/types/rent-status.type';
import { NotificationsService } from 'src/notifications/notifications.service';

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
function daysBetweenUTC(a: Date, b: Date) {
  const A = new Date(
    Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()),
  );
  const B = new Date(
    Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()),
  );
  return Math.max(0, Math.ceil((B.getTime() - A.getTime()) / 86400000));
}
@Injectable()
export class RentsService {
  constructor(
    private readonly dbService: DatabaseService,
    private readonly notificationsService: NotificationsService,
  ) {}
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
        throw new BadRequestException('Organization not found for this user');
      }

      const orgId = currentUserOrgId[0].id;
      const { id, rentContractId, rentNumber, year } =
        await this.generateRentId(orgId);
      // Validate and convert dates
      const startDate = ensureDate(createRentDto.startDate);
      const expectedEndDate = ensureDate(createRentDto.expectedEndDate);
      const returnedAt = ensureDate(createRentDto.returnedAt);

      if (!startDate) {
        throw new BadRequestException('Please provide a valid start date');
      }

      // Validate date logic
      const endDate = returnedAt || expectedEndDate;
      if (!endDate) {
        throw new BadRequestException(
          'Please provide either a return date or expected end date',
        );
      }

      // Ensure start date is not after end date
      if (startDate >= endDate) {
        throw new BadRequestException('Start date must be before the end date');
      }

      // Validate that dates are not too far in the past (optional business rule)
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

      if (startDate < oneYearAgo) {
        throw new BadRequestException(
          'Start date cannot be more than one year in the past',
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
          'Selected car not found or is no longer available',
        );
      }

      if (carExists[0].orgId !== orgId) {
        throw new BadRequestException(
          'Selected car does not belong to your organization',
        );
      }

      // Verify customer exists and belongs to the organization
      const customerExists = await this.dbService.db
        .select({ id: customers.id, orgId: customers.orgId })
        .from(customers)
        .where(eq(customers.id, createRentDto.customerId));

      if (!customerExists.length) {
        throw new BadRequestException('Selected customer not found');
      }

      if (customerExists[0].orgId !== orgId) {
        throw new BadRequestException(
          'Selected customer does not belong to your organization',
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
          'This car is already rented during the selected time period. Please choose different dates or another car.',
        );
      }

      // Validate financial data
      if (
        createRentDto.totalPrice !== undefined &&
        createRentDto.totalPrice < 0
      ) {
        throw new BadRequestException('Total price cannot be negative');
      }

      if (createRentDto.deposit !== undefined && createRentDto.deposit < 0) {
        throw new BadRequestException('Deposit amount cannot be negative');
      }

      if (
        createRentDto.guarantee !== undefined &&
        createRentDto.guarantee < 0
      ) {
        throw new BadRequestException('Guarantee amount cannot be negative');
      }

      if (
        createRentDto.totalPaid !== undefined &&
        createRentDto.totalPaid < 0
      ) {
        throw new BadRequestException('Amount paid cannot be negative');
      }

      // Validate that total paid doesn't exceed total price (if both are provided)
      if (
        !createRentDto.isOpenContract && // Only for fixed contracts
        createRentDto.totalPrice !== undefined &&
        createRentDto.totalPaid !== undefined &&
        createRentDto.totalPaid > createRentDto.totalPrice
      ) {
        throw new BadRequestException(
          'Amount paid cannot exceed the total price for fixed contracts',
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

        await this.notificationsService.createNotification({
          userId: orgOwner.userId,
          orgId,
          category: 'RENTAL',
          type: 'RENT_STARTED',
          priority: 'MEDIUM',
          title: 'New Rental Created',
          message: `${customer?.firstName} ${customer?.lastName} rented ${car?.make} ${car?.model} - Contract #${rentContractId}`, // 🆕 Use rentContractId
          actionUrl: `/rentals/${id}`,
          actionLabel: 'View Rental',
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
        message: 'Rental contract created successfully',
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
          'A rental contract with these details already exists. Please check your input and try again.',
        );
      }

      if (error.code === '23503') {
        throw new BadRequestException(
          'The selected car or customer is no longer available. Please refresh and try again.',
        );
      }

      if (error.code === '23514') {
        throw new BadRequestException(
          'Some of the provided information is invalid. Please check your input and try again.',
        );
      }

      if (error.code === '23502') {
        throw new BadRequestException(
          'Required information is missing. Please fill in all required fields.',
        );
      }

      // Generic error for any other unexpected issues
      throw new BadRequestException(
        'Unable to create rental contract. Please try again or contact support if the problem persists.',
      );
    }
  }

  async getAllRentsWithCarAndCustomer(orgId: string, page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(rents)
      .where(eq(rents.isDeleted, false));

    const rawData = await this.dbService.db
      .select({
        id: rents.id,
        rentContractId: rents.rentContractId, // ✅ Add this field
        rentNumber: rents.rentNumber, // ✅ Add this field
        year: rents.year, // ✅ Add this field
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
      .select()
      .from(rents)
      .where(and(eq(rents.id, id), eq(rents.isDeleted, false)));

    if (result.length > 0) {
      const rent = result[0];
      return [
        {
          ...rent,
          status: this.getAutoStatus(
            rent.startDate,
            rent.returnedAt,
            rent.expectedEndDate,
            rent.status,
          ),
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
        throw new BadRequestException('Rental contract not found');
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
              'This car is already rented during the selected time period. Please choose different dates.',
            );
          }
        }
      }

      // 5) Keep billed-to-date current for open contracts (sets totalPrice)
      // helper for whole-day diff in UTC
      function daysBetweenUTC(a: Date, b: Date) {
        const A = new Date(
          Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate()),
        );
        const B = new Date(
          Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()),
        );
        return Math.max(0, Math.ceil((B.getTime() - A.getTime()) / 86400000));
      }

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
          await this.notificationsService.createNotification({
            userId: orgOwner.userId,
            orgId: rent.orgId,
            category: 'PAYMENT',
            type: 'PAYMENT_RECEIVED',
            priority: 'MEDIUM',
            title: 'Payment Received',
            message: `Payment of ${paymentAmount}DHS received for rental #${rent.rentContractId}`,
            level: 'success',
            actionUrl: `/rentals/${id}`,
            actionLabel: 'View Rental',
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
          let title = 'Rental Status Changed';
          let priority = 'MEDIUM';
          let level = 'info';

          switch (updateRentDto.status) {
            case 'completed':
              notificationType = 'RENT_COMPLETED';
              title = 'Rental Completed';
              level = 'success';
              break;
            case 'canceled':
              notificationType = 'RENT_CANCELLED';
              title = 'Rental Cancelled';
              level = 'warning';
              priority = 'HIGH';
              break;
          }

          await this.notificationsService.createNotification({
            userId: orgOwner.userId,
            orgId: rent.orgId,
            category: 'RENTAL',
            type: notificationType,
            priority,
            title,
            message: `Rental ${rent.rentContractId} status changed to ${updateRentDto.status}`,
            level,
            actionUrl: `/rentals/${id}`,
            actionLabel: 'View Rental',
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
          let title: string | undefined;
          let message: string | undefined;
          let priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' = 'HIGH';

          if (!rent.damageReport && updateRentDto.damageReport) {
            title = 'Damage Reported';
            message = `Damage reported for rental ${rent.rentContractId}: ${updateRentDto.damageReport}`;
          } else if (rent.damageReport && updateRentDto.damageReport) {
            title = 'Damage Report Updated';
            message = `Damage report updated for rental ${rent.rentContractId}: ${updateRentDto.damageReport}`;
          } else if (rent.damageReport && !updateRentDto.damageReport) {
            title = 'Damage Report Cleared';
            message = `Damage report cleared for rental ${rent.rentContractId}`;
            priority = 'MEDIUM';
          }

          if (title && message) {
            await this.notificationsService.createNotification({
              userId: orgOwner.userId,
              orgId: rent.orgId,
              category: 'CAR',
              type: 'CAR_DAMAGE_REPORTED',
              priority,
              title,
              message,
              level: 'warning',
              actionUrl: `/rentals/${id}`,
              actionLabel: 'View Rental',
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
        message: 'Rental contract updated successfully',
        data: result,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === '23505') {
        throw new BadRequestException(
          'A rental with these details already exists. Please check your input.',
        );
      }
      if (error.code === '23503') {
        throw new BadRequestException(
          'The selected car or customer is no longer available.',
        );
      }
      if (error.code === '23514') {
        throw new BadRequestException(
          'Some of the provided information is invalid. Please check your input.',
        );
      }
      if (error.code === '23502') {
        throw new BadRequestException(
          'Required information is missing. Please fill in all required fields.',
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
        throw new BadRequestException('Rental contract ID is required');
      }

      const existingRent = await this.dbService.db
        .select()
        .from(rents)
        .where(and(eq(rents.id, id), eq(rents.isDeleted, false)));

      if (!existingRent.length) {
        throw new BadRequestException(
          'Rental contract not found or has already been deleted.',
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
          'Cannot delete this rental as it is currently active. Please complete or cancel it first.',
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
        message: `Rental contract deleted successfully (status: ${currentStatus})`,
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
          customerDocId: customers.documentId,
          customerDocType: customers.documentType,
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
        throw new NotFoundException('Rental contract not found');
      }

      // ✅ Normalize customer identity fields
      let customerCIN = '...............';
      let customerPassport = '...............';
      let customerDriverLicense = '...............';

      switch (rentData.customerDocType?.toUpperCase()) {
        case 'ID_CARD':
          customerCIN = rentData.customerDocId || '...............';
          break;
        case 'PASSPORT':
          customerPassport = rentData.customerDocId || '...............';
          break;
        case 'DRIVER_LICENSE':
          customerDriverLicense = rentData.customerDocId || '...............';
          break;
      }

      return {
        success: true,
        data: {
          ...rentData,
          customerCIN,
          customerPassport,
          customerDriverLicense,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Unable to fetch contract details');
    }
  }
}
