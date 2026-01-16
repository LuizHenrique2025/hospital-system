import { Module } from '@nestjs/common';
import { NursesService } from './nurses.service';
import { NursesController } from './nurses.controller';

@Module({
  providers: [NursesService],
  controllers: [NursesController]
})
export class NursesModule {}
