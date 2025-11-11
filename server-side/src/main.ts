import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { BadRequestException, Logger } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { createRouteHandler } from 'uploadthing/express';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import cookieParser from 'cookie-parser';

const whitelist = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL || 'http://localhost:5173',
];
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        const messages = errors.map(
          (err) =>
            `${err.property} - ${Object.values(err.constraints).join(', ')}`,
        );
        return new BadRequestException(messages);
      },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.use((req, res, next) => {
    console.log(`Request received: ${req.method} ${req.url}`);
    next();
  });
  app.setGlobalPrefix('api/v1');
  app.enableCors({
    credentials: true,
    origin: function (origin, callback) {
      if (!origin || whitelist.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'Cookie',
    ],
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port.toString()}/api/v1,`,
  );
}
bootstrap();
