// src/users/dto/update-locale.dto.ts
import { IsString, Length, Matches } from 'class-validator';

export class UpdateLocaleDto {
  @IsString()
  @Length(2, 10)
  // Optional: restrict to letters, dash, region codes like en, fr, en-US, fr-FR
  @Matches(/^[A-Za-z]{2,3}(-[A-Za-z]{2,3})?$/)
  locale!: string;
}
