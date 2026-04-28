import { Module } from '@nestjs/common';
import {
  PricingTablesController,
  ProcedurePricesController,
} from './pricing.controller';
import { PricingService } from './pricing.service';

@Module({
  controllers: [PricingTablesController, ProcedurePricesController],
  providers: [PricingService],
})
export class PricingModule {}
