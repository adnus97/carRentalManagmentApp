// src/customers/dto/blacklist.dto.ts
import { IsNotEmpty, IsString } from 'class-validator';

export class BlacklistCustomerDto {
  @IsNotEmpty()
  @IsString()
  reason: string;
}
