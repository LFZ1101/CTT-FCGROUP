import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { CurrentUser, AuthUser } from '../../common/decorators/current-user.decorator';
import { InstrumentsService } from './instruments.service';
import { CreateInstrumentDto, ReviewInstrumentDto } from './dto/instrument.dto';

@UseGuards(AuthGuard)
@Controller('instruments')
export class InstrumentsController {
  constructor(private readonly service: InstrumentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.service.list(user.tenantId);
  }

  @Get(':id')
  get(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.service.get(user.tenantId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateInstrumentDto) {
    return this.service.create(user.tenantId, dto);
  }

  @Post(':id/validate')
  validate(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewInstrumentDto,
  ) {
    return this.service.validate(user.tenantId, user.sub, id, dto);
  }

  @Post(':id/reject')
  reject(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: ReviewInstrumentDto,
  ) {
    return this.service.reject(user.tenantId, user.sub, id, dto);
  }
}
