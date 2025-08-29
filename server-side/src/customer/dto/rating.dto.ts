// src/customers/dto/rating.dto.ts
import { IsInt, Min, Max, IsOptional, IsString } from 'class-validator';

export class RateCustomerDto {
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
