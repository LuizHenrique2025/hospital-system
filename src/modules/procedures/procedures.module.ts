import { Module } from '@nestjs/common';
import { ProceduresController } from './procedures.controller';
import { ProceduresService } from './procedures.service';

@Module({
  controllers: [ProceduresController],
  providers: [ProceduresService],
})
export class ProceduresModule {}
