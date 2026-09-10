-- Base colaborativa de CCTs (rede)

CREATE TYPE "CollaborativeSharingScope" AS ENUM ('PRIVATE', 'NETWORK_RELATED_UNION', 'NETWORK_GLOBAL');
CREATE TYPE "CollaborativeContributionStatus" AS ENUM ('SUBMITTED', 'PROCESSING', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED', 'PUBLISHED_TO_NETWORK', 'MATCHED_OFFICIAL_SOURCE', 'REVOKED', 'FAILED');
CREATE TYPE "CollaborativeModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'NEEDS_CHANGES', 'DUPLICATE');
CREATE TYPE "DocumentRequestStatus" AS ENUM ('OPEN', 'FULFILLED', 'CANCELLED', 'EXPIRED');

ALTER TYPE "SourceType" ADD VALUE IF NOT EXISTS 'COLLABORATIVE_NETWORK';

CREATE TABLE "CollaborativeContribution" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "instrumentId" TEXT,
  "unionId" TEXT NOT NULL,
  "submittedByUserId" TEXT NOT NULL,
  "originDescription" TEXT NOT NULL,
  "sharingScope" "CollaborativeSharingScope" NOT NULL DEFAULT 'PRIVATE',
  "status" "CollaborativeContributionStatus" NOT NULL DEFAULT 'SUBMITTED',
  "moderationStatus" "CollaborativeModerationStatus" NOT NULL DEFAULT 'PENDING',
  "consentAcceptedAt" TIMESTAMP(3) NOT NULL,
  "consentTermVersion" TEXT NOT NULL,
  "consentUserId" TEXT NOT NULL,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "reviewedByUserId" TEXT,
  "reviewNotes" TEXT,
  "confirmedByOfficialSourceAt" TIMESTAMP(3),
  "officialSourceId" TEXT,
  "officialMatchMethod" TEXT,
  "officialMatchConfidence" DOUBLE PRECISION,
  "probableType" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollaborativeContribution_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CollaborativePublication" (
  "id" TEXT NOT NULL,
  "contributionId" TEXT NOT NULL,
  "contributorTenantId" TEXT NOT NULL,
  "unionId" TEXT NOT NULL,
  "documentId" TEXT NOT NULL,
  "instrumentId" TEXT,
  "sharingScope" "CollaborativeSharingScope" NOT NULL,
  "title" TEXT,
  "documentClass" TEXT,
  "contentHash" TEXT,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "revokeReason" TEXT,
  "unionMatchKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CollaborativePublication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentRequest" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "unionId" TEXT NOT NULL,
  "instrumentType" TEXT,
  "referencePeriod" TEXT,
  "notes" TEXT,
  "status" "DocumentRequestStatus" NOT NULL DEFAULT 'OPEN',
  "groupKey" TEXT NOT NULL,
  "fulfilledAt" TIMESTAMP(3),
  "fulfilledByContributionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DocumentRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CollaborativePublication_contributionId_key" ON "CollaborativePublication"("contributionId");
CREATE INDEX "CollaborativeContribution_tenantId_status_idx" ON "CollaborativeContribution"("tenantId", "status");
CREATE INDEX "CollaborativeContribution_unionId_status_idx" ON "CollaborativeContribution"("unionId", "status");
CREATE INDEX "CollaborativeContribution_documentId_idx" ON "CollaborativeContribution"("documentId");
CREATE INDEX "CollaborativeContribution_moderationStatus_submittedAt_idx" ON "CollaborativeContribution"("moderationStatus", "submittedAt");
CREATE INDEX "CollaborativePublication_unionMatchKey_revokedAt_idx" ON "CollaborativePublication"("unionMatchKey", "revokedAt");
CREATE INDEX "CollaborativePublication_sharingScope_publishedAt_idx" ON "CollaborativePublication"("sharingScope", "publishedAt");
CREATE INDEX "CollaborativePublication_contentHash_idx" ON "CollaborativePublication"("contentHash");
CREATE INDEX "DocumentRequest_tenantId_status_idx" ON "DocumentRequest"("tenantId", "status");
CREATE INDEX "DocumentRequest_groupKey_status_idx" ON "DocumentRequest"("groupKey", "status");
CREATE INDEX "DocumentRequest_unionId_status_idx" ON "DocumentRequest"("unionId", "status");

ALTER TABLE "CollaborativeContribution" ADD CONSTRAINT "CollaborativeContribution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborativeContribution" ADD CONSTRAINT "CollaborativeContribution_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "DiscoveredDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborativeContribution" ADD CONSTRAINT "CollaborativeContribution_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "CollectiveInstrument"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollaborativeContribution" ADD CONSTRAINT "CollaborativeContribution_unionId_fkey" FOREIGN KEY ("unionId") REFERENCES "Union"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CollaborativeContribution" ADD CONSTRAINT "CollaborativeContribution_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CollaborativeContribution" ADD CONSTRAINT "CollaborativeContribution_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CollaborativeContribution" ADD CONSTRAINT "CollaborativeContribution_officialSourceId_fkey" FOREIGN KEY ("officialSourceId") REFERENCES "Source"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CollaborativePublication" ADD CONSTRAINT "CollaborativePublication_contributorTenantId_fkey" FOREIGN KEY ("contributorTenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborativePublication" ADD CONSTRAINT "CollaborativePublication_contributionId_fkey" FOREIGN KEY ("contributionId") REFERENCES "CollaborativeContribution"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CollaborativePublication" ADD CONSTRAINT "CollaborativePublication_unionId_fkey" FOREIGN KEY ("unionId") REFERENCES "Union"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_unionId_fkey" FOREIGN KEY ("unionId") REFERENCES "Union"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DocumentRequest" ADD CONSTRAINT "DocumentRequest_fulfilledByContributionId_fkey" FOREIGN KEY ("fulfilledByContributionId") REFERENCES "CollaborativeContribution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
