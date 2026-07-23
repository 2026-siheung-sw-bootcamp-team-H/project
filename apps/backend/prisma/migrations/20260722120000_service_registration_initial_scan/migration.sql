ALTER TYPE "ServiceStatus" ADD VALUE IF NOT EXISTS 'PENDING';
ALTER TYPE "ServiceStatus" ADD VALUE IF NOT EXISTS 'UNHEALTHY';
ALTER TYPE "ServiceStatus" ADD VALUE IF NOT EXISTS 'DISABLED';

CREATE TYPE "RequestEventSource" AS ENUM ('REAL', 'SIMULATION', 'TELEMETRY');

ALTER TYPE "SecurityScanStage" ADD VALUE IF NOT EXISTS 'INITIAL_SCAN' BEFORE 'BEFORE_DEPLOYMENT';
ALTER TYPE "SecurityScanStage" ADD VALUE IF NOT EXISTS 'SHADOW_VERIFICATION' AFTER 'BEFORE_DEPLOYMENT';

ALTER TABLE "ProtectedService"
ADD COLUMN "publicDomain" TEXT,
ADD COLUMN "originUrl" TEXT,
ADD COLUMN "proxyUrl" TEXT,
ADD COLUMN "connectedAt" TIMESTAMP(3),
ADD COLUMN "lastHealthCheckedAt" TIMESTAMP(3),
ADD COLUMN "disabledAt" TIMESTAMP(3);

UPDATE "ProtectedService"
SET "originUrl" = "apiUrl",
    "connectedAt" = COALESCE("connectedAt", "createdAt")
WHERE "originUrl" IS NULL;

ALTER TABLE "RequestEvent"
ADD COLUMN "source" "RequestEventSource" NOT NULL DEFAULT 'REAL',
ADD COLUMN "simulationId" TEXT;

CREATE INDEX "RequestEvent_source_occurredAt_idx" ON "RequestEvent"("source", "occurredAt");
CREATE INDEX "RequestEvent_simulationId_occurredAt_idx" ON "RequestEvent"("simulationId", "occurredAt");
