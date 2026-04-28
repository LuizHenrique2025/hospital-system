import { PartialType } from '@nestjs/swagger';
import { CreateProcedurePriceDto } from './create-procedure-price.dto';

export class UpdateProcedurePriceDto extends PartialType(CreateProcedurePriceDto) {}
