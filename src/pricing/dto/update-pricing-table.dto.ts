import { PartialType } from '@nestjs/swagger';
import { CreatePricingTableDto } from './create-pricing-table.dto';

export class UpdatePricingTableDto extends PartialType(CreatePricingTableDto) {}
