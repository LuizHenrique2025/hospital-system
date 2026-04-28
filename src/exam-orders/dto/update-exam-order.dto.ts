import { PartialType } from '@nestjs/swagger';
import { CreateExamOrderDto } from './create-exam-order.dto';

export class UpdateExamOrderDto extends PartialType(CreateExamOrderDto) {}
