import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infra/prisma/prisma.module';
import { BillingGuidesModule } from '../billing-guides/billing-guides.module';
import { BudgetEstimatesController } from './budget-estimates.controller';
import { BudgetEstimatesService } from './budget-estimates.service';

@Module({
  imports: [PrismaModule, BillingGuidesModule],
  controllers: [BudgetEstimatesController],
  providers: [BudgetEstimatesService],
})
export class BudgetEstimatesModule {}
