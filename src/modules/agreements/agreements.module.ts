import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infra/prisma/prisma.module';
import { AgreementsController } from './agreements.controller';
import { AgreementsService } from './agreements.service';

@Module({
  imports: [PrismaModule],
  controllers: [AgreementsController],
  providers: [AgreementsService],
})
export class AgreementsModule {}
