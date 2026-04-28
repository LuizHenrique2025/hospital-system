import { Module } from '@nestjs/common';
import { CbhpmController } from './cbhpm.controller';
import { CbhpmService } from './cbhpm.service';

@Module({
  controllers: [CbhpmController],
  providers: [CbhpmService],
})
export class CbhpmModule {}
