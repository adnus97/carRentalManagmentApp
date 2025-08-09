import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateRentDto } from './dto/create-rent.dto';
import { UpdateRentDto } from './dto/update-rent.dto';
import { createId } from '@paralleldrive/cuid2';
import { cars, DatabaseService, organization } from 'src/db';
import { eq, sql, and, ne } from 'drizzle-orm';
import { rents } from 'src/db/schema/rents';
import { customers } from 'src/db/schema/customers';
import { RentStatus } from 'src/types/rent-status.type';

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

@Injectable()
export class RentsService {
  constructor(private readonly dbService: DatabaseService) {}

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
          return 'This rental is currently active and cannot be deleted. Please complete or cancel the rental first.';
        } else {
          return 'This rental is currently active. You can only update payment information, damage reports, or change the status to completed/canceled.';
        }

      case 'completed':
        if (operation === 'delete') {
          return 'Completed rentals cannot be deleted as they are needed for record keeping and reporting purposes.';
        } else {
          return 'This rental is completed. You can only update payment records and damage reports.';
        }

      case 'canceled':
        if (operation === 'update') {
          return 'Canceled rentals cannot be modified. Please create a new rental if needed.';
        }
        break;

      case 'reserved':
        // Reserved rentals can be fully modified, so this shouldn't trigger
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
      const id = createId();

      // Validate user and get organization
      const currentUserOrgId = await this.dbService.db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.userId, userId));

      if (!currentUserOrgId.length) {
        throw new BadRequestException('Organization not found for this user');
      }

      const orgId = currentUserOrgId[0].id;

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
        id,
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

      // Insert the rent record
      const result = await this.dbService.db.insert(rents).values(rentData);

      return {
        success: true,
        message: 'Rental contract created successfully',
        data: { id, ...rentData },
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

  async getAllRentsWithCarAndCustomer(page = 1, pageSize = 10) {
    const offset = (page - 1) * pageSize;

    const [{ count }] = await this.dbService.db
      .select({ count: sql<number>`count(*)` })
      .from(rents)
      .where(eq(rents.isDeleted, false));

    const rawData = await this.dbService.db
      .select({
        id: rents.id,
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
      .where(eq(rents.isDeleted, false))
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
      // Get current rent data first
      const currentRent = await this.dbService.db
        .select()
        .from(rents)
        .where(and(eq(rents.id, id), eq(rents.isDeleted, false)));

      if (currentRent.length === 0) {
        throw new BadRequestException('Rental contract not found');
      }

      const rent = currentRent[0];
      const currentStatus = this.getAutoStatus(
        rent.startDate,
        rent.returnedAt,
        rent.expectedEndDate,
        rent.status,
      );

      // Get allowed fields for this rent's status
      const allowedFields = this.getAllowedUpdateFields(rent);

      // Check if any disallowed fields are being updated
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

      // Prepare update data with proper date conversion
      const updateData: any = {};

      // Handle date fields specifically
      let datesChanged = false;

      if (
        updateRentDto.startDate !== undefined &&
        allowedFields.includes('startDate')
      ) {
        const convertedDate = ensureDate(updateRentDto.startDate);
        if (convertedDate) {
          updateData.startDate = convertedDate;
          datesChanged = true;
        }
      }

      if (
        updateRentDto.expectedEndDate !== undefined &&
        allowedFields.includes('expectedEndDate')
      ) {
        const convertedDate = ensureDate(updateRentDto.expectedEndDate);
        if (convertedDate) {
          updateData.expectedEndDate = convertedDate;
          datesChanged = true;
        }
      }

      if (
        updateRentDto.returnedAt !== undefined &&
        allowedFields.includes('returnedAt')
      ) {
        const convertedDate = ensureDate(updateRentDto.returnedAt);
        if (convertedDate) {
          updateData.returnedAt = convertedDate;
          datesChanged = true;
        }
      }

      // Handle non-date fields
      const nonDateFields = [
        'carId',
        'customerId',
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
      ];

      nonDateFields.forEach((field) => {
        if (
          updateRentDto[field as keyof CreateRentDto] !== undefined &&
          allowedFields.includes(field)
        ) {
          updateData[field] = updateRentDto[field as keyof CreateRentDto];
        }
      });

      // Only check availability if dates are being changed
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

      // Auto-determine status if not explicitly set to canceled
      const finalStartDate = updateData.startDate || rent.startDate;
      const finalReturnedAt = updateData.returnedAt || rent.returnedAt;
      const finalExpectedEndDate =
        updateData.expectedEndDate || rent.expectedEndDate;
      const newStatus = updateData.status || rent.status;

      // Only auto-update status if it's not being explicitly set to canceled
      if (newStatus !== 'canceled' && !updateRentDto.status) {
        const autoStatus: RentStatus = this.getAutoStatus(
          finalStartDate,
          finalReturnedAt,
          finalExpectedEndDate,
          newStatus as RentStatus,
        );
        updateData.status = autoStatus;
      }

      // Perform the update
      const result = await this.dbService.db
        .update(rents)
        .set(updateData)
        .where(eq(rents.id, id));

      return {
        success: true,
        message: 'Rental contract updated successfully',
        data: result,
      };
    } catch (error) {
      // If it's already a BadRequestException, re-throw it
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Handle database constraint errors with user-friendly messages
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

      // Generic error
      throw new BadRequestException(
        'Unable to update rental contract. Please try again or contact support.',
      );
    }
  }

  async remove(id: string, updateData?: Partial<CreateRentDto>) {
    try {
      const existingRent = await this.dbService.db
        .select()
        .from(rents)
        .where(and(eq(rents.id, id), eq(rents.isDeleted, false)));

      if (existingRent.length === 0) {
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

      // Check if rent can be deleted based on status
      if (currentStatus === 'active') {
        throw new BadRequestException(
          this.getStatusBasedErrorMessage(currentStatus, 'delete'),
        );
      }

      if (currentStatus === 'completed') {
        throw new BadRequestException(
          this.getStatusBasedErrorMessage(currentStatus, 'delete'),
        );
      }

      const deleteData = {
        isDeleted: true,
        ...updateData,
      };

      const result = await this.dbService.db
        .update(rents)
        .set(deleteData)
        .where(eq(rents.id, id));

      return {
        success: true,
        message: 'Rental contract deleted successfully',
        data: result,
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Handle database errors with user-friendly messages
      throw new BadRequestException(
        'Unable to delete rental contract. Please try again or contact support.',
      );
    }
  }
}
