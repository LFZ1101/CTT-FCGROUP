-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('OWNER', 'ADMIN', 'DP_MANAGER', 'ANALYST', 'AUDITOR', 'CLIENT');

-- CreateEnum
CREATE TYPE "CollectiveInstrumentType" AS ENUM ('CCT', 'ACT', 'ADDENDUM', 'EXTENSION', 'OTHER');

-- CreateEnum
CREATE TYPE "InstrumentStatus" AS ENUM ('DISCOVERED', 'PENDING_REVIEW', 'VALIDATED', 'REJECTED', 'EXPIRED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('MEDIADOR_MTE', 'LABOR_UNION', 'EMPLOYER_UNION', 'OFFICIAL_BULLETIN', 'MANUAL_UPLOAD', 'OTHER');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'BLOCKED', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ComparisonStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ClauseChangeType" AS ENUM ('UNCHANGED', 'MODIFIED', 'ADDED', 'REMOVED', 'RENAMED', 'MOVED');

-- CreateEnum
CREATE TYPE "DiscoveryStatus" AS ENUM ('NEW', 'LINKED', 'IGNORED', 'ERROR');

-- CreateEnum
CREATE TYPE "DocumentProcessingStatus" AS ENUM ('DISCOVERED', 'QUEUED', 'DOWNLOADING', 'DOWNLOADED', 'VALIDATING', 'STORED', 'PARSING', 'PARSED', 'CLASSIFYING', 'CLASSIFIED', 'SEGMENTING', 'READY_FOR_REVIEW', 'FAILED');

-- CreateEnum
CREATE TYPE "DocumentClass" AS ENUM ('CCT', 'ACT', 'ADDENDUM', 'EXTENSION', 'NOTICE', 'IRRELEVANT', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ClauseCategory" AS ENUM ('FLOOR', 'ADJUSTMENT', 'SALARY', 'MEAL_VOUCHER', 'MEAL', 'WORKDAY', 'HOUR_BANK', 'OVERTIME', 'ALLOWANCE', 'CASHIER_BREAK', 'DAYCARE', 'CONTRIBUTION', 'VACATION', 'STABILITY', 'HOMOLOGATION', 'SUNDAY_HOLIDAY', 'HEALTH_SAFETY', 'BENEFITS', 'OTHER');

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ANALYST',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "passwordHash" TEXT,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "legalName" TEXT NOT NULL,
    "tradeName" TEXT,
    "cnpj" TEXT NOT NULL,
    "mainCnae" TEXT,
    "secondaryCnaes" TEXT[],
    "city" TEXT,
    "state" TEXT,
    "employeeCount" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Union" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acronym" TEXT,
    "cnpj" TEXT,
    "website" TEXT,
    "scope" TEXT,
    "states" TEXT[],
    "cities" TEXT[],
    "categories" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Union_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyUnion" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "unionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyUnion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectiveInstrument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" "CollectiveInstrumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "registration" TEXT,
    "status" "InstrumentStatus" NOT NULL DEFAULT 'DISCOVERED',
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "baseDate" TEXT,
    "territory" TEXT[],
    "categories" TEXT[],
    "sourceUrl" TEXT,
    "documentUrl" TEXT,
    "documentHash" TEXT,
    "rawText" TEXT,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectiveInstrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentParty" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "unionId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,

    CONSTRAINT "InstrumentParty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentApplication" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "compatibility" DOUBLE PRECISION,
    "rationale" JSONB,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstrumentApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentValidation" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decision" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstrumentValidation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentClause" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "number" TEXT,
    "title" TEXT,
    "category" TEXT,
    "page" INTEGER,
    "text" TEXT NOT NULL,
    "structured" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstrumentClause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstrumentComparison" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "previousInstrumentId" TEXT NOT NULL,
    "currentInstrumentId" TEXT NOT NULL,
    "status" "ComparisonStatus" NOT NULL DEFAULT 'PENDING',
    "summary" JSONB,
    "modelVersion" TEXT NOT NULL DEFAULT 'heuristic-v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "InstrumentComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClauseComparison" (
    "id" TEXT NOT NULL,
    "comparisonId" TEXT NOT NULL,
    "previousClauseId" TEXT,
    "currentClauseId" TEXT,
    "changeType" "ClauseChangeType" NOT NULL,
    "similarity" DOUBLE PRECISION,
    "summary" TEXT,
    "structuredDiff" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClauseComparison_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Source" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "unionId" TEXT,
    "type" "SourceType" NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastCheckedAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Source_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "instrumentId" TEXT,
    "severity" "AlertSeverity" NOT NULL DEFAULT 'INFO',
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "companyId" TEXT,
    "instrumentId" TEXT,
    "assigneeId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" INTEGER NOT NULL DEFAULT 3,
    "dueAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceCheck" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "httpStatus" INTEGER,
    "documentsFound" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "SourceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiscoveredDocument" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "title" TEXT,
    "url" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "contentType" TEXT,
    "documentHash" TEXT,
    "contentHash" TEXT,
    "mimeType" TEXT,
    "sizeBytes" INTEGER,
    "bucket" TEXT,
    "storageKey" TEXT,
    "status" "DiscoveryStatus" NOT NULL DEFAULT 'NEW',
    "processingStatus" "DocumentProcessingStatus" NOT NULL DEFAULT 'DISCOVERED',
    "failureReason" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "downloadedAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "instrumentId" TEXT,
    "metadata" JSONB,
    "extractedText" TEXT,
    "pageCount" INTEGER,
    "parsedAt" TIMESTAMP(3),
    "documentClass" "DocumentClass",
    "classConfidence" DOUBLE PRECISION,
    "classMethod" TEXT,
    "classifiedAt" TIMESTAMP(3),
    "classifierVersion" TEXT,
    "needsReview" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "DiscoveredDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAsset" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "discoveredDocumentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "bucket" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "originalUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentPage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "discoveredDocumentId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "charCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentClause" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "discoveredDocumentId" TEXT NOT NULL,
    "number" TEXT,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "category" "ClauseCategory" NOT NULL DEFAULT 'OTHER',
    "startPage" INTEGER,
    "endPage" INTEGER,
    "confidence" DOUBLE PRECISION,
    "structuredData" JSONB,
    "evidence" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentClause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentChunk" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "discoveredDocumentId" TEXT,
    "instrumentId" TEXT,
    "documentClauseId" TEXT,
    "instrumentClauseId" TEXT,
    "pageStart" INTEGER,
    "pageEnd" INTEGER,
    "clauseNumber" TEXT,
    "title" TEXT,
    "category" TEXT,
    "text" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" JSONB,
    "modelVersion" TEXT NOT NULL DEFAULT 'heuristic-v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentChunk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Company_tenantId_idx" ON "Company"("tenantId");

-- CreateIndex
CREATE INDEX "Company_mainCnae_idx" ON "Company"("mainCnae");

-- CreateIndex
CREATE UNIQUE INDEX "Company_tenantId_cnpj_key" ON "Company"("tenantId", "cnpj");

-- CreateIndex
CREATE INDEX "Union_tenantId_idx" ON "Union"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyUnion_companyId_unionId_kind_key" ON "CompanyUnion"("companyId", "unionId", "kind");

-- CreateIndex
CREATE INDEX "CollectiveInstrument_tenantId_idx" ON "CollectiveInstrument"("tenantId");

-- CreateIndex
CREATE INDEX "CollectiveInstrument_registration_idx" ON "CollectiveInstrument"("registration");

-- CreateIndex
CREATE INDEX "CollectiveInstrument_startDate_endDate_idx" ON "CollectiveInstrument"("startDate", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "InstrumentParty_instrumentId_unionId_kind_key" ON "InstrumentParty"("instrumentId", "unionId", "kind");

-- CreateIndex
CREATE INDEX "InstrumentApplication_companyId_confirmed_idx" ON "InstrumentApplication"("companyId", "confirmed");

-- CreateIndex
CREATE UNIQUE INDEX "InstrumentApplication_instrumentId_companyId_key" ON "InstrumentApplication"("instrumentId", "companyId");

-- CreateIndex
CREATE INDEX "InstrumentClause_instrumentId_idx" ON "InstrumentClause"("instrumentId");

-- CreateIndex
CREATE INDEX "InstrumentComparison_tenantId_createdAt_idx" ON "InstrumentComparison"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "InstrumentComparison_previousInstrumentId_idx" ON "InstrumentComparison"("previousInstrumentId");

-- CreateIndex
CREATE INDEX "InstrumentComparison_currentInstrumentId_idx" ON "InstrumentComparison"("currentInstrumentId");

-- CreateIndex
CREATE INDEX "ClauseComparison_comparisonId_changeType_idx" ON "ClauseComparison"("comparisonId", "changeType");

-- CreateIndex
CREATE INDEX "Source_tenantId_enabled_idx" ON "Source"("tenantId", "enabled");

-- CreateIndex
CREATE INDEX "Alert_tenantId_readAt_idx" ON "Alert"("tenantId", "readAt");

-- CreateIndex
CREATE INDEX "Task_tenantId_status_idx" ON "Task"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Task_assigneeId_status_idx" ON "Task"("assigneeId", "status");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "SourceCheck_tenantId_startedAt_idx" ON "SourceCheck"("tenantId", "startedAt");

-- CreateIndex
CREATE INDEX "SourceCheck_sourceId_startedAt_idx" ON "SourceCheck"("sourceId", "startedAt");

-- CreateIndex
CREATE INDEX "DiscoveredDocument_tenantId_status_firstSeenAt_idx" ON "DiscoveredDocument"("tenantId", "status", "firstSeenAt");

-- CreateIndex
CREATE INDEX "DiscoveredDocument_tenantId_processingStatus_idx" ON "DiscoveredDocument"("tenantId", "processingStatus");

-- CreateIndex
CREATE INDEX "DiscoveredDocument_documentHash_idx" ON "DiscoveredDocument"("documentHash");

-- CreateIndex
CREATE INDEX "DiscoveredDocument_contentHash_idx" ON "DiscoveredDocument"("contentHash");

-- CreateIndex
CREATE INDEX "DiscoveredDocument_tenantId_documentClass_idx" ON "DiscoveredDocument"("tenantId", "documentClass");

-- CreateIndex
CREATE UNIQUE INDEX "DiscoveredDocument_sourceId_normalizedUrl_key" ON "DiscoveredDocument"("sourceId", "normalizedUrl");

-- CreateIndex
CREATE INDEX "DocumentAsset_tenantId_contentHash_idx" ON "DocumentAsset"("tenantId", "contentHash");

-- CreateIndex
CREATE INDEX "DocumentAsset_tenantId_createdAt_idx" ON "DocumentAsset"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentAsset_contentHash_idx" ON "DocumentAsset"("contentHash");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentAsset_discoveredDocumentId_version_key" ON "DocumentAsset"("discoveredDocumentId", "version");

-- CreateIndex
CREATE INDEX "DocumentPage_tenantId_discoveredDocumentId_idx" ON "DocumentPage"("tenantId", "discoveredDocumentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentPage_discoveredDocumentId_pageNumber_key" ON "DocumentPage"("discoveredDocumentId", "pageNumber");

-- CreateIndex
CREATE INDEX "DocumentClause_tenantId_discoveredDocumentId_idx" ON "DocumentClause"("tenantId", "discoveredDocumentId");

-- CreateIndex
CREATE INDEX "DocumentClause_tenantId_category_idx" ON "DocumentClause"("tenantId", "category");

-- CreateIndex
CREATE INDEX "DocumentChunk_tenantId_instrumentId_idx" ON "DocumentChunk"("tenantId", "instrumentId");

-- CreateIndex
CREATE INDEX "DocumentChunk_tenantId_discoveredDocumentId_idx" ON "DocumentChunk"("tenantId", "discoveredDocumentId");

-- CreateIndex
CREATE INDEX "DocumentChunk_tenantId_createdAt_idx" ON "DocumentChunk"("tenantId", "createdAt");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Union" ADD CONSTRAINT "Union_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyUnion" ADD CONSTRAINT "CompanyUnion_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyUnion" ADD CONSTRAINT "CompanyUnion_unionId_fkey" FOREIGN KEY ("unionId") REFERENCES "Union"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectiveInstrument" ADD CONSTRAINT "CollectiveInstrument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentParty" ADD CONSTRAINT "InstrumentParty_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "CollectiveInstrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentParty" ADD CONSTRAINT "InstrumentParty_unionId_fkey" FOREIGN KEY ("unionId") REFERENCES "Union"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentApplication" ADD CONSTRAINT "InstrumentApplication_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "CollectiveInstrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentApplication" ADD CONSTRAINT "InstrumentApplication_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentValidation" ADD CONSTRAINT "InstrumentValidation_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "CollectiveInstrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentValidation" ADD CONSTRAINT "InstrumentValidation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentClause" ADD CONSTRAINT "InstrumentClause_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "CollectiveInstrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentComparison" ADD CONSTRAINT "InstrumentComparison_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentComparison" ADD CONSTRAINT "InstrumentComparison_previousInstrumentId_fkey" FOREIGN KEY ("previousInstrumentId") REFERENCES "CollectiveInstrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstrumentComparison" ADD CONSTRAINT "InstrumentComparison_currentInstrumentId_fkey" FOREIGN KEY ("currentInstrumentId") REFERENCES "CollectiveInstrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClauseComparison" ADD CONSTRAINT "ClauseComparison_comparisonId_fkey" FOREIGN KEY ("comparisonId") REFERENCES "InstrumentComparison"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClauseComparison" ADD CONSTRAINT "ClauseComparison_previousClauseId_fkey" FOREIGN KEY ("previousClauseId") REFERENCES "InstrumentClause"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClauseComparison" ADD CONSTRAINT "ClauseComparison_currentClauseId_fkey" FOREIGN KEY ("currentClauseId") REFERENCES "InstrumentClause"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Source" ADD CONSTRAINT "Source_unionId_fkey" FOREIGN KEY ("unionId") REFERENCES "Union"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "CollectiveInstrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "CollectiveInstrument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceCheck" ADD CONSTRAINT "SourceCheck_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceCheck" ADD CONSTRAINT "SourceCheck_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveredDocument" ADD CONSTRAINT "DiscoveredDocument_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveredDocument" ADD CONSTRAINT "DiscoveredDocument_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "Source"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiscoveredDocument" ADD CONSTRAINT "DiscoveredDocument_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "CollectiveInstrument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAsset" ADD CONSTRAINT "DocumentAsset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAsset" ADD CONSTRAINT "DocumentAsset_discoveredDocumentId_fkey" FOREIGN KEY ("discoveredDocumentId") REFERENCES "DiscoveredDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPage" ADD CONSTRAINT "DocumentPage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentPage" ADD CONSTRAINT "DocumentPage_discoveredDocumentId_fkey" FOREIGN KEY ("discoveredDocumentId") REFERENCES "DiscoveredDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentClause" ADD CONSTRAINT "DocumentClause_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentClause" ADD CONSTRAINT "DocumentClause_discoveredDocumentId_fkey" FOREIGN KEY ("discoveredDocumentId") REFERENCES "DiscoveredDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_discoveredDocumentId_fkey" FOREIGN KEY ("discoveredDocumentId") REFERENCES "DiscoveredDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "CollectiveInstrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_documentClauseId_fkey" FOREIGN KEY ("documentClauseId") REFERENCES "DocumentClause"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentChunk" ADD CONSTRAINT "DocumentChunk_instrumentClauseId_fkey" FOREIGN KEY ("instrumentClauseId") REFERENCES "InstrumentClause"("id") ON DELETE SET NULL ON UPDATE CASCADE;

