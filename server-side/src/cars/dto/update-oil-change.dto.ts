import { PartialType } from '@nestjs/mapped-types';
import { CreateOilChangeDto } from './create-oil-change.dto';

export class UpdateOilChangeDto extends PartialType(CreateOilChangeDto) {}
