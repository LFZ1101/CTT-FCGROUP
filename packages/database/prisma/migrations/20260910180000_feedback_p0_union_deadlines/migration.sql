-- Feedback P0: vínculo sindical assistido + prazos críticos + resumo operacional

ALTER TABLE "CompanyUnion"
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'CONFIRMED',
  ADD COLUMN IF NOT EXISTS "confidence" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "validationMethod" TEXT,
  ADD COLUMN IF NOT EXISTS "validatedBy" TEXT,
  ADD COLUMN IF NOT EXISTS "validatedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "CompanyUnion"
SET "status" = CASE WHEN "confirmed" = true THEN 'CONFIRMED' ELSE 'SUGGESTED' END
WHERE "status" = 'CONFIRMED' OR "status" IS NULL OR "status" = '';

CREATE INDEX IF NOT EXISTS "CompanyUnion_unionId_status_idx" ON "CompanyUnion"("unionId", "status");
CREATE INDEX IF NOT EXISTS "CompanyUnion_companyId_status_idx" ON "CompanyUnion"("companyId", "status");

ALTER TABLE "CollectiveInstrument"
  ADD COLUMN IF NOT EXISTS "operationalSummary" JSONB;

CREATE TABLE IF NOT EXISTS "DetectedDeadline" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "instrumentId" TEXT NOT NULL,
  "clauseId" TEXT,
  "deadlineType" TEXT NOT NULL,
  "startDate" TIMESTAMP(3),
  "dueDate" TIMESTAMP(3),
  "description" TEXT NOT NULL,
  "sourcePage" INTEGER,
  "sourceExcerpt" TEXT,
  "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
  "status" TEXT NOT NULL DEFAULT 'OPEN',
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DetectedDeadline_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "DetectedDeadline_tenantId_dueDate_idx" ON "DetectedDeadline"("tenantId", "dueDate");
CREATE INDEX IF NOT EXISTS "DetectedDeadline_instrumentId_deadlineType_idx" ON "DetectedDeadline"("instrumentId", "deadlineType");
CREATE INDEX IF NOT EXISTS "DetectedDeadline_tenantId_status_dueDate_idx" ON "DetectedDeadline"("tenantId", "status", "dueDate");

DO $$ BEGIN
  ALTER TABLE "DetectedDeadline" ADD CONSTRAINT "DetectedDeadline_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "DetectedDeadline" ADD CONSTRAINT "DetectedDeadline_instrumentId_fkey"
    FOREIGN KEY ("instrumentId") REFERENCES "CollectiveInstrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "DetectedDeadline" ADD CONSTRAINT "DetectedDeadline_clauseId_fkey"
    FOREIGN KEY ("clauseId") REFERENCES "InstrumentClause"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
