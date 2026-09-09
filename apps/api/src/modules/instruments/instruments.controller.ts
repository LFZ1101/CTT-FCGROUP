import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { InstrumentsService } from './instruments.service';
import { CreateInstrumentDto } from './dto/instrument.dto';

@UseGuards(AuthGuard)
@Controller('instruments')
export class InstrumentsController {
  constructor(private s: InstrumentsService) {}

  @Get()
  list(@CurrentUser() u: AuthUser) {
    return this.s.list(u.tenantId);
  }

  @Get(':id')
  get(@CurrentUser() u: AuthUser, @Param('id') id: string) {
    return this.s.get(u.tenantId, id);
  }

  @Post()
  create(@CurrentUser() u: AuthUser, @Body() d: CreateInstrumentDto) {
    return this.s.create(u.tenantId, d);
  }
}
