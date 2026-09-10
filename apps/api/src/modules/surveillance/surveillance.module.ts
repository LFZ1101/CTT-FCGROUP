import { Module } from '@nestjs/common';
import { SurveillanceService } from './surveillance.service';
import { SurveillanceController } from './surveillance.controller';

@Module({
  controllers: [SurveillanceController],
  providers: [SurveillanceService],
  exports: [SurveillanceService],
})
export class SurveillanceModule {}
