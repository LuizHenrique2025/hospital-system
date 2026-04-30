import { Module } from '@nestjs/common';
import { SectorsController } from './sectors.controller';
import { SectorsService } from './sectors.service';

@Module({
  controllers: [SectorsController],
  providers: [SectorsService],
})
export class SectorsModule {}
