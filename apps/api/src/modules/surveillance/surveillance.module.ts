import { Module } from '@nestjs/common';
import { SurveillanceService } from './surveillance.service';
import { SurveillanceController } from './surveillance.controller';
import { CollaborativeModule } from '../collaborative/collaborative.module';

@Module({
  imports: [CollaborativeModule],
  controllers: [SurveillanceController],
  providers: [SurveillanceService],
  exports: [SurveillanceService],
})
export class SurveillanceModule {}
