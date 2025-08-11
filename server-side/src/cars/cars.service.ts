import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { cars, DatabaseService, organization } from 'src/db';
import { eq, ne, and, sql } from 'drizzle-orm';
import { createId } from '@paralleldrive/cuid2';
import { CreateCarDto } from './dto/create-car.dto';
import { rents } from 'src/db/schema/rents';

@Injectable()
export class CarsService {
  constructor(private readonly dbService: DatabaseService) {}

  /**
   * Get all cars with dynamic availability and next available date
   */
  async findAll(page = 1, pageSize = 20) {
    try {
      const offset = (page - 1) * pageSize;

      const [{ count }] = await this.dbService.db
        .select({ count: sql<number>`count(*)` })
        .from(cars)
        .where(ne(cars.status, 'deleted'));

      const data = await this.dbService.db
        .select({
          id: cars.id,
          make: cars.make,
          model: cars.model,
          year: cars.year,
          purchasePrice: cars.purchasePrice,
          pricePerDay: cars.pricePerDay,
          orgId: cars.orgId,
          mileage: cars.mileage,
          monthlyLeasePrice: cars.monthlyLeasePrice,
          insuranceExpiryDate: cars.insuranceExpiryDate,
          status: cars.status,
          createdAt: cars.createdAt,
          updatedAt: cars.updatedAt,
          // 🔥 UPDATED: Include car status in availability calculation
          isAvailable: sql<boolean>`
          ${cars.status} = 'active' AND NOT EXISTS (
            SELECT 1 FROM ${rents}
            WHERE ${rents.carId} = ${cars.id}
              AND ${rents.isDeleted} = false
              AND ${rents.status} = 'active'
              AND ${rents.startDate} <= NOW()
              AND ${rents.returnedAt} > NOW()
          )
        `.as('isAvailable'),
          nextAvailableDate: sql<Date | null>`
          (
            SELECT MIN(${rents.returnedAt})
            FROM ${rents}
            WHERE ${rents.carId} = ${cars.id}
              AND ${rents.isDeleted} = false
              AND ${rents.status} = 'active'
              AND ${rents.returnedAt} > NOW()
          )
        `.as('nextAvailableDate'),
        })
        .from(cars)
        .where(ne(cars.status, 'deleted'))
        .orderBy(sql`${cars.createdAt} DESC`)
        .offset(offset)
        .limit(pageSize);

      return {
        data,
        page,
        pageSize,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / pageSize),
      };
    } catch (error) {
      console.error('Error fetching cars:', error);
      throw new BadRequestException(
        'Unable to retrieve cars. Please try again or contact support.',
      );
    }
  }
  /**
   * Get a single car with dynamic availability and next available date
   */
  async findOne(id: string) {
    try {
      if (!id) {
        throw new BadRequestException('Car ID is required');
      }

      const [car] = await this.dbService.db
        .select({
          id: cars.id,
          make: cars.make,
          model: cars.model,
          year: cars.year,
          purchasePrice: cars.purchasePrice,
          pricePerDay: cars.pricePerDay,
          orgId: cars.orgId,
          mileage: cars.mileage,
          monthlyLeasePrice: cars.monthlyLeasePrice,
          insuranceExpiryDate: cars.insuranceExpiryDate,
          status: cars.status,
          createdAt: cars.createdAt,
          updatedAt: cars.updatedAt,
          // 🔥 UPDATED: Include car status in availability calculation
          isAvailable: sql<boolean>`
          ${cars.status} = 'active' AND NOT EXISTS (
            SELECT 1 FROM ${rents}
            WHERE ${rents.carId} = ${cars.id}
              AND ${rents.isDeleted} = false
              AND ${rents.status} = 'active'
              AND ${rents.startDate} <= NOW()
              AND ${rents.returnedAt} > NOW()
          )
        `.as('isAvailable'),
          nextAvailableDate: sql<Date | null>`
          (
            SELECT MIN(${rents.returnedAt})
            FROM ${rents}
            WHERE ${rents.carId} = ${cars.id}
              AND ${rents.isDeleted} = false
              AND ${rents.status} = 'active'
              AND ${rents.returnedAt} > NOW()
          )
        `.as('nextAvailableDate'),
        })
        .from(cars)
        .where(and(eq(cars.id, id), ne(cars.status, 'deleted')));

      if (!car) {
        throw new NotFoundException('Car not found or has been deleted');
      }

      return car;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      console.error('Error fetching car:', error);
      throw new BadRequestException(
        'Unable to retrieve car details. Please try again or contact support.',
      );
    }
  }

  /**
   * Get cars by organization with dynamic availability and next available date
   */
  async findCarsByOrgId(userId: string, page = 1, pageSize = 20) {
    try {
      if (!userId) {
        throw new BadRequestException('User ID is required');
      }

      const offset = (page - 1) * pageSize;

      // First verify the user has an organization
      const userOrg = await this.dbService.db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.userId, userId));

      if (!userOrg.length) {
        throw new BadRequestException(
          'No organization found for this user. Please contact support.',
        );
      }

      const [{ count }] = await this.dbService.db
        .select({ count: sql<number>`count(*)` })
        .from(cars)
        .leftJoin(organization, eq(cars.orgId, organization.id))
        .where(
          and(eq(organization.userId, userId), ne(cars.status, 'deleted')),
        );

      const rows = await this.dbService.db
        .select({
          id: cars.id,
          make: cars.make,
          model: cars.model,
          year: cars.year,
          purchasePrice: cars.purchasePrice,
          pricePerDay: cars.pricePerDay,
          orgId: cars.orgId,
          mileage: cars.mileage,
          monthlyLeasePrice: cars.monthlyLeasePrice,
          insuranceExpiryDate: cars.insuranceExpiryDate,
          status: cars.status,
          createdAt: cars.createdAt,
          updatedAt: cars.updatedAt,
          // 🔥 UPDATED: Include car status in availability calculation
          isAvailable: sql<boolean>`
          ${cars.status} = 'active' AND NOT EXISTS (
            SELECT 1 FROM ${rents}
            WHERE ${rents.carId} = ${cars.id}
              AND ${rents.isDeleted} = false
              AND ${rents.status} = 'active'
              AND ${rents.startDate} <= NOW()
              AND ${rents.returnedAt} > NOW()
          )
        `.as('isAvailable'),
          nextAvailableDate: sql<Date | null>`
          (
            SELECT MIN(${rents.returnedAt})
            FROM ${rents}
            WHERE ${rents.carId} = ${cars.id}
              AND ${rents.isDeleted} = false
              AND ${rents.status} = 'active'
              AND ${rents.returnedAt} > NOW()
          )
        `.as('nextAvailableDate'),
        })
        .from(cars)
        .leftJoin(organization, eq(cars.orgId, organization.id))
        .where(and(eq(organization.userId, userId), ne(cars.status, 'deleted')))
        .orderBy(sql`${cars.createdAt} DESC`)
        .offset(offset)
        .limit(pageSize);

      return {
        data: rows,
        page,
        pageSize,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / pageSize),
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      console.error('Error fetching cars by organization:', error);
      throw new BadRequestException(
        'Unable to retrieve your cars. Please try again or contact support.',
      );
    }
  }

  async createCar(createCarDto: CreateCarDto, userId: string) {
    try {
      if (!userId) {
        throw new BadRequestException('User authentication required');
      }

      // Validate required fields
      if (!createCarDto.make || !createCarDto.model) {
        throw new BadRequestException('Car make and model are required');
      }

      if (
        !createCarDto.year ||
        createCarDto.year < 1900 ||
        createCarDto.year > new Date().getFullYear() + 1
      ) {
        throw new BadRequestException(
          `Please provide a valid year between 1900 and ${new Date().getFullYear() + 1}`,
        );
      }

      // Validate financial data
      if (
        createCarDto.purchasePrice !== undefined &&
        createCarDto.purchasePrice < 0
      ) {
        throw new BadRequestException('Purchase price cannot be negative');
      }

      if (
        createCarDto.pricePerDay !== undefined &&
        createCarDto.pricePerDay < 0
      ) {
        throw new BadRequestException('Daily rental price cannot be negative');
      }

      if (
        createCarDto.monthlyLeasePrice !== undefined &&
        createCarDto.monthlyLeasePrice < 0
      ) {
        throw new BadRequestException('Monthly lease price cannot be negative');
      }

      if (createCarDto.mileage !== undefined && createCarDto.mileage < 0) {
        throw new BadRequestException('Mileage cannot be negative');
      }

      // Validate insurance expiry date if provided
      if (createCarDto.insuranceExpiryDate) {
        const expiryDate = new Date(createCarDto.insuranceExpiryDate);
        const today = new Date();

        if (isNaN(expiryDate.getTime())) {
          throw new BadRequestException(
            'Please provide a valid insurance expiry date',
          );
        }

        // Warn if insurance is expired or expires soon (optional business rule)
        if (expiryDate < today) {
          throw new BadRequestException(
            'Insurance expiry date cannot be in the past. Please update the insurance first.',
          );
        }
      }

      const id = createId();

      // Get user's organization
      const currentUserOrgId = await this.dbService.db
        .select({ id: organization.id })
        .from(organization)
        .where(eq(organization.userId, userId));

      if (!currentUserOrgId.length) {
        throw new BadRequestException(
          'No organization found for this user. Please contact support to set up your organization.',
        );
      }

      const orgId = currentUserOrgId[0].id;

      // Prepare car data
      const carData = {
        id,
        orgId,
        ...createCarDto,
        status: createCarDto.status || 'available', // Default status
      };

      const result = await this.dbService.db.insert(cars).values(carData);

      return {
        success: true,
        message: 'Car added successfully',
        data: { id, ...carData },
      };
    } catch (error) {
      // If it's already a BadRequestException, re-throw it
      if (error instanceof BadRequestException) {
        throw error;
      }

      // Handle database constraint errors
      if (error.code === '23505') {
        throw new BadRequestException(
          'A car with these details already exists in your fleet. Please check your input.',
        );
      }

      if (error.code === '23503') {
        throw new BadRequestException(
          'Invalid organization reference. Please contact support.',
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

      console.error('Error creating car:', error);
      throw new BadRequestException(
        'Unable to add car to your fleet. Please try again or contact support.',
      );
    }
  }

  async updateCar(
    id: string,
    updateData: Partial<CreateCarDto>,
    userId?: string,
  ) {
    try {
      if (!id) {
        throw new BadRequestException('Car ID is required');
      }

      // Check if car exists and get current data
      const existingCar = await this.dbService.db
        .select()
        .from(cars)
        .where(and(eq(cars.id, id), ne(cars.status, 'deleted')));

      if (!existingCar.length) {
        throw new NotFoundException('Car not found or has been deleted');
      }

      const car = existingCar[0];

      // If userId is provided, verify ownership
      if (userId) {
        const userOrg = await this.dbService.db
          .select({ id: organization.id })
          .from(organization)
          .where(eq(organization.userId, userId));

        if (!userOrg.length || userOrg[0].id !== car.orgId) {
          throw new BadRequestException(
            'You do not have permission to update this car',
          );
        }
      }

      // Check if car is currently rented (business rule)
      const activeRentals = await this.dbService.db
        .select({ id: rents.id })
        .from(rents)
        .where(
          and(
            eq(rents.carId, id),
            eq(rents.isDeleted, false),
            eq(rents.status, 'active'),
          ),
        );

      // Restrict certain updates if car is actively rented
      if (activeRentals.length > 0) {
        const restrictedFields = ['status'];
        const attemptedRestrictedFields = restrictedFields.filter(
          (field) => updateData[field as keyof CreateCarDto] !== undefined,
        );

        if (
          attemptedRestrictedFields.length > 0 &&
          updateData.status === 'maintenance'
        ) {
          throw new BadRequestException(
            'Cannot change car status to maintenance while it is actively rented. Please complete the rental first.',
          );
        }
      }

      // Create a copy of updateData to avoid mutating the original
      const processedUpdateData = { ...updateData };

      // Convert date strings to Date objects
      if (processedUpdateData.insuranceExpiryDate) {
        if (typeof processedUpdateData.insuranceExpiryDate === 'string') {
          processedUpdateData.insuranceExpiryDate = new Date(
            processedUpdateData.insuranceExpiryDate,
          );
        }
      }

      // Validate update data
      if (processedUpdateData.year !== undefined) {
        if (
          processedUpdateData.year < 1900 ||
          processedUpdateData.year > new Date().getFullYear() + 1
        ) {
          throw new BadRequestException(
            `Please provide a valid year between 1900 and ${new Date().getFullYear() + 1}`,
          );
        }
      }

      if (
        processedUpdateData.purchasePrice !== undefined &&
        processedUpdateData.purchasePrice < 0
      ) {
        throw new BadRequestException('Purchase price cannot be negative');
      }

      if (
        processedUpdateData.pricePerDay !== undefined &&
        processedUpdateData.pricePerDay < 0
      ) {
        throw new BadRequestException('Daily rental price cannot be negative');
      }

      if (
        processedUpdateData.monthlyLeasePrice !== undefined &&
        processedUpdateData.monthlyLeasePrice < 0
      ) {
        throw new BadRequestException('Monthly lease price cannot be negative');
      }

      if (
        processedUpdateData.mileage !== undefined &&
        processedUpdateData.mileage < 0
      ) {
        throw new BadRequestException('Mileage cannot be negative');
      }

      if (processedUpdateData.insuranceExpiryDate) {
        const expiryDate = processedUpdateData.insuranceExpiryDate;

        if (!(expiryDate instanceof Date) || isNaN(expiryDate.getTime())) {
          throw new BadRequestException(
            'Please provide a valid insurance expiry date',
          );
        }

        const today = new Date();
        if (expiryDate < today) {
          throw new BadRequestException(
            'Insurance expiry date cannot be in the past',
          );
        }
      }

      // Add updatedAt timestamp
      const finalUpdateData = {
        ...processedUpdateData,
        updatedAt: new Date(),
      };

      const result = await this.dbService.db
        .update(cars)
        .set(finalUpdateData)
        .where(eq(cars.id, id));

      return {
        success: true,
        message: 'Car updated successfully',
        data: result,
      };
    } catch (error) {
      // If it's already a BadRequestException or NotFoundException, re-throw it
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Handle database constraint errors
      if (error.code === '23505') {
        throw new BadRequestException(
          'A car with these details already exists. Please check your input.',
        );
      }

      if (error.code === '23503') {
        throw new BadRequestException(
          'Invalid reference in the provided data.',
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

      console.error('Error updating car:', error);
      throw new BadRequestException(
        'Unable to update car. Please try again or contact support.',
      );
    }
  }

  async deleteCar(id: string, userId?: string) {
    try {
      if (!id) {
        throw new BadRequestException('Car ID is required');
      }

      // Check if car exists
      const existingCar = await this.dbService.db
        .select()
        .from(cars)
        .where(and(eq(cars.id, id), ne(cars.status, 'deleted')));

      if (!existingCar.length) {
        throw new NotFoundException(
          'Car not found or has already been deleted',
        );
      }

      const car = existingCar[0];

      // If userId is provided, verify ownership
      if (userId) {
        const userOrg = await this.dbService.db
          .select({ id: organization.id })
          .from(organization)
          .where(eq(organization.userId, userId));

        if (!userOrg.length || userOrg[0].id !== car.orgId) {
          throw new BadRequestException(
            'You do not have permission to delete this car',
          );
        }
      }

      // Fetch all non-deleted, non-canceled rents for this car
      const activeOrReservedRents = await this.dbService.db
        .select({
          id: rents.id,
          startDate: rents.startDate,
          returnedAt: rents.returnedAt,
          expectedEndDate: rents.expectedEndDate,
          status: rents.status,
        })
        .from(rents)
        .where(
          and(
            eq(rents.carId, id),
            eq(rents.isDeleted, false),
            ne(rents.status, 'canceled'),
          ),
        );

      // Use the same logic as RentsService to determine real status
      const now = new Date();
      const getAutoStatus = (
        startDate: Date,
        returnedAt: Date | null,
        expectedEndDate: Date | null,
        currentStatus: string,
      ): string => {
        if (currentStatus === 'canceled') return 'canceled';
        if (returnedAt && returnedAt <= now) return 'completed';
        if (startDate > now) return 'reserved';
        return 'active';
      };

      for (const rent of activeOrReservedRents) {
        const realStatus = getAutoStatus(
          rent.startDate,
          rent.returnedAt,
          rent.expectedEndDate,
          rent.status,
        );

        if (realStatus === 'active') {
          throw new BadRequestException(
            'Cannot delete this car as it is currently rented. Please complete the rental first.',
          );
        }

        if (realStatus === 'reserved') {
          throw new BadRequestException(
            'Cannot delete this car as it has upcoming reservations. Please cancel them first.',
          );
        }
      }

      // Soft delete the car
      const result = await this.dbService.db
        .update(cars)
        .set({
          [cars.status.name]: 'deleted',
          [cars.updatedAt.name]: new Date(),
        })
        .where(eq(cars.id, id));

      return {
        success: true,
        message: 'Car deleted successfully',
        data: result,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      // Add this for debugging
      console.error('Error updating car:', error);

      // In development, return actual error
      if (process.env.NODE_ENV === 'development') {
        throw new BadRequestException(`Update failed: ${error.message}`);
      }

      throw new BadRequestException(
        'Unable to update car. Please try again or contact support.',
      );
    }
  }
}
