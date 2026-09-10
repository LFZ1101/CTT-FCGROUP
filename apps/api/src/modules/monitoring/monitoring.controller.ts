import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MonitoringService } from './monitoring.service';
import { TriggerSourceCheckDto } from './dto/monitoring.dto';

@UseGuards(AuthGuard)
@Controller('monitoring')
export class MonitoringController {
  constructor(private readonly service: MonitoringService) {}
  @Get('history') history(@CurrentUser() u:any,@Query('sourceId') sourceId?:string){return this.service.history(u.tenantId,sourceId)}
  @Get('discoveries') discoveries(@CurrentUser() u:any){return this.service.discoveries(u.tenantId)}
  @Post('check') check(@CurrentUser() u:any,@Body() dto:TriggerSourceCheckDto){return dto.sourceId?this.service.checkOne(u.tenantId,dto.sourceId):this.service.checkAll(u.tenantId)}
}
