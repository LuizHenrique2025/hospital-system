import { Module } from '@nestjs/common';
import { ExamOrdersController } from './exam-orders.controller';
import { ExamOrdersService } from './exam-orders.service';

@Module({
  controllers: [ExamOrdersController],
  providers: [ExamOrdersService],
})
export class ExamOrdersModule {}
