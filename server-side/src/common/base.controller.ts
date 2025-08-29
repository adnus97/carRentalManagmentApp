import { BadRequestException } from '@nestjs/common';

export abstract class BaseController {
  protected handleControllerError(error: any): never {
    // If it's already a NestJS HTTP exception, rethrow it
    if (error instanceof BadRequestException) throw error;
    if (error.getStatus && error.getResponse) throw error;

    // Otherwise, wrap it in a generic BadRequestException
    throw new BadRequestException(
      error?.message || 'An unexpected error occurred',
    );
  }
}
