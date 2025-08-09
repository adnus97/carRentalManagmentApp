import { PartialType } from '@nestjs/mapped-types';
import { CreateRentDto } from './create-rent.dto';
import { IsOptional, IsEnum } from 'class-validator';

export class UpdateRentDto extends PartialType(CreateRentDto) {}
