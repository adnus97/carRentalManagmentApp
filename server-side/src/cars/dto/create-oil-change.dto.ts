// dto/create-oil-change.dto.ts
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

export class CreateOilChangeDto {
  @IsDateString()
  changedAt: string;

  @IsInt()
  @Min(1)
  mileageAtChange: number;

  @IsOptional()
  @IsInt()
  nextDueAtKm?: number;

  @IsOptional()
  @IsInt()
  cost?: number;

  @IsOptional()
  notes?: string;
}
