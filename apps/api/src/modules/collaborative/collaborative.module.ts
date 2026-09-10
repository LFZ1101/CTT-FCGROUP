import { Module } from '@nestjs/common';
import { CollaborativeController } from './collaborative.controller';
import { CollaborativeService } from './collaborative.service';

@Module({
  controllers: [CollaborativeController],
  providers: [CollaborativeService],
  exports: [CollaborativeService],
})
export class CollaborativeModule {}
