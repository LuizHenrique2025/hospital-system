import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infra/prisma/prisma.module';
import { BillingGuidesController } from './billing-guides.controller';
import { BillingGuidesService } from './billing-guides.service';

@Module({
  imports: [PrismaModule],
  controllers: [BillingGuidesController],
  providers: [BillingGuidesService],
  exports: [BillingGuidesService],
})
export class BillingGuidesModule {}
