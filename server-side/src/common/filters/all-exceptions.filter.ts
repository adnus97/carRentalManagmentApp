import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'An unexpected error occurred';

    // ✅ Handle NestJS HttpExceptions (BadRequest, NotFound, etc.)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message =
        (res as any)?.message || exception.message || 'An error occurred';
    }

    // ✅ Handle Postgres unique constraint errors
    else if (exception?.code === '23505') {
      // 23505 = unique_violation in Postgres
      if (exception.detail?.includes('document_id')) {
        status = HttpStatus.BAD_REQUEST;
        message = 'This Document ID is already registered to another client.';
      } else if (exception.detail?.includes('email')) {
        status = HttpStatus.BAD_REQUEST;
        message = 'This email is already registered to another client.';
      } else {
        message = 'Duplicate value detected.';
      }
    }

    // ✅ Handle validation errors (class-validator)
    else if (Array.isArray(exception?.message)) {
      status = HttpStatus.BAD_REQUEST;
      message = exception.message.join(', ');
    }

    response.status(status).json({
      statusCode: status,
      error: HttpStatus[status],
      message,
    });
  }
}
