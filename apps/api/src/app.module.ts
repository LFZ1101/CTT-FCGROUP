import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HealthController } from './common/health.controller';
import { RequestIdMiddleware } from './common/observability/request-id.middleware';
import { LoggingInterceptor } from './common/observability/logging.interceptor';
import { ObservabilityExceptionFilter } from './common/observability/exception.filter';
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
import { PayrollModule } from './modules/payroll/payroll.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { MatchingModule } from './modules/matching/matching.module';
import { SurveillanceModule } from './modules/surveillance/surveillance.module';
import { DeadlinesModule } from './modules/deadlines/deadlines.module';

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
    PayrollModule,
    NotificationsModule,
    MatchingModule,
    SurveillanceModule,
    DeadlinesModule,
  ],
  controllers: [HealthController],
  providers: [
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_FILTER, useClass: ObservabilityExceptionFilter },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
