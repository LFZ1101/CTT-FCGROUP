import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';

@Module({
  controllers: [NotificationsController],
  providers: [MailService, NotificationsService],
  exports: [MailService, NotificationsService],
})
export class NotificationsModule {}
