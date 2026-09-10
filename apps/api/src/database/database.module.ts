import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { TenantOwnershipService } from '../common/tenancy/tenant-ownership.service';

@Global()
@Module({
  providers: [PrismaService, TenantOwnershipService],
  exports: [PrismaService, TenantOwnershipService],
})
export class DatabaseModule {}
