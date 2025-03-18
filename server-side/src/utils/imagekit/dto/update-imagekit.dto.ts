import { PartialType } from '@nestjs/mapped-types';
import { CreateImagekitDto } from './create-imagekit.dto';

export class UpdateImagekitDto extends PartialType(CreateImagekitDto) {}
