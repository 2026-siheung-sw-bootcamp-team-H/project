-- CreateEnum
CREATE TYPE "SecurityScanStage" AS ENUM ('BEFORE_DEPLOYMENT', 'AFTER_DEPLOYMENT', 'AD_HOC');

-- CreateEnum
CREATE TYPE "SecurityScanStatus" AS ENUM ('QUEUED', 'SPIDERING', 'ACTIVE_SCANNING', 'COLLECTING_RESULTS', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "SearchOutbox" (
    "id" TEXT NOT NULL,
    "requestEventId" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SearchOutbox_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityScanRun" (
    "id" TEXT NOT NULL,
    "protectedServiceId" TEXT NOT NULL,
    "ruleId" TEXT,
    "deploymentId" TEXT,
    "stage" "SecurityScanStage" NOT NULL,
    "status" "SecurityScanStatus" NOT NULL DEFAULT 'QUEUED',
    "targetUrl" TEXT NOT NULL,
    "zapSpiderScanId" TEXT,
    "zapActiveScanId" TEXT,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "alertCount" INTEGER NOT NULL DEFAULT 0,
    "highCount" INTEGER NOT NULL DEFAULT 0,
    "mediumCount" INTEGER NOT NULL DEFAULT 0,
    "lowCount" INTEGER NOT NULL DEFAULT 0,
    "informationalCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SecurityScanRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityScanFinding" (
    "id" TEXT NOT NULL,
    "scanRunId" TEXT NOT NULL,
    "pluginId" TEXT NOT NULL,
    "alert" TEXT NOT NULL,
    "risk" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "method" TEXT,
    "parameter" TEXT,
    "evidence" TEXT,
    "description" TEXT,
    "solution" TEXT,
    "reference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityScanFinding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SearchOutbox_requestEventId_key" ON "SearchOutbox"("requestEventId");

-- CreateIndex
CREATE INDEX "SearchOutbox_processedAt_lockedAt_createdAt_idx" ON "SearchOutbox"("processedAt", "lockedAt", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityScanRun_protectedServiceId_createdAt_idx" ON "SecurityScanRun"("protectedServiceId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityScanRun_ruleId_stage_status_createdAt_idx" ON "SecurityScanRun"("ruleId", "stage", "status", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityScanFinding_scanRunId_risk_idx" ON "SecurityScanFinding"("scanRunId", "risk");

-- CreateIndex
CREATE INDEX "SecurityScanFinding_pluginId_idx" ON "SecurityScanFinding"("pluginId");

-- AddForeignKey
ALTER TABLE "SearchOutbox" ADD CONSTRAINT "SearchOutbox_requestEventId_fkey" FOREIGN KEY ("requestEventId") REFERENCES "RequestEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityScanRun" ADD CONSTRAINT "SecurityScanRun_protectedServiceId_fkey" FOREIGN KEY ("protectedServiceId") REFERENCES "ProtectedService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityScanRun" ADD CONSTRAINT "SecurityScanRun_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "SignatureRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityScanRun" ADD CONSTRAINT "SecurityScanRun_deploymentId_fkey" FOREIGN KEY ("deploymentId") REFERENCES "DeploymentHistory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SecurityScanFinding" ADD CONSTRAINT "SecurityScanFinding_scanRunId_fkey" FOREIGN KEY ("scanRunId") REFERENCES "SecurityScanRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
