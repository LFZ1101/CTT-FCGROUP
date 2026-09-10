import { Module } from '@nestjs/common';
import { HealthController } from './common/health.controller';
import { DatabaseModule } from './database/database.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { UnionsModule } from './modules/unions/unions.module';
import { InstrumentsModule } from './modules/instruments/instruments.module';
import { SourcesModule } from './modules/sources/sources.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { MonitoringModule } from './modules/monitoring/monitoring.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { ComparisonsModule } from './modules/comparisons/comparisons.module';
import { RagModule } from './modules/rag/rag.module';
import { AuditModule } from './modules/audit/audit.module';

@Module({
  imports: [
    DatabaseModule,
    StorageModule,
    AuthModule,
    DashboardModule,
    CompaniesModule,
    UnionsModule,
    InstrumentsModule,
    SourcesModule,
    AlertsModule,
    TasksModule,
    MonitoringModule,
    DocumentsModule,
    ComparisonsModule,
    RagModule,
    AuditModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
