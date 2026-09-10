-- Fase 6: colaboradores + conexões de integração (Fase 7 framework)

CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'LEAVE');
CREATE TYPE "IntegrationProvider" AS ENUM ('ONVIO', 'DOMINIO', 'ALTERDATA', 'OTHER');
CREATE TYPE "IntegrationConnectionStatus" AS ENUM ('DISCONNECTED', 'CONFIGURED', 'ERROR', 'UNSUPPORTED');

CREATE TABLE "Employee" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "companyId" TEXT NOT NULL,
  "externalId" TEXT,
  "displayName" TEXT NOT NULL,
  "jobTitle" TEXT,
  "baseSalaryCents" INTEGER,
  "admissionDate" TIMESTAMP(3),
  "weeklyHours" DOUBLE PRECISION,
  "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationConnection" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "provider" "IntegrationProvider" NOT NULL,
  "displayName" TEXT NOT NULL,
  "status" "IntegrationConnectionStatus" NOT NULL DEFAULT 'UNSUPPORTED',
  "config" JSONB,
  "lastError" TEXT,
  "lastSyncAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Employee_tenantId_companyId_externalId_key" ON "Employee"("tenantId", "companyId", "externalId");
CREATE INDEX "Employee_tenantId_companyId_status_idx" ON "Employee"("tenantId", "companyId", "status");
CREATE INDEX "Employee_tenantId_jobTitle_idx" ON "Employee"("tenantId", "jobTitle");
CREATE UNIQUE INDEX "IntegrationConnection_tenantId_provider_key" ON "IntegrationConnection"("tenantId", "provider");
CREATE INDEX "IntegrationConnection_tenantId_status_idx" ON "IntegrationConnection"("tenantId", "status");

ALTER TABLE "Employee" ADD CONSTRAINT "Employee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
