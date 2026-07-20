-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN');

-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('CONNECTED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "TrafficClassification" AS ENUM ('NORMAL', 'SUSPICIOUS', 'ATTACK', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "AttackCategory" AS ENUM ('SQL_INJECTION', 'XSS', 'PATH_TRAVERSAL');

-- CreateEnum
CREATE TYPE "EnforcementAction" AS ENUM ('ALLOW', 'BLOCK', 'MONITOR');

-- CreateEnum
CREATE TYPE "EnforcementSource" AS ENUM ('MODSECURITY', 'INTERNAL_RULE', 'MANUAL', 'NONE');

-- CreateEnum
CREATE TYPE "RuleStatus" AS ENUM ('DRAFT', 'SANDBOX_TESTED', 'HOLDOUT_PASSED', 'SHADOW_MODE', 'APPROVAL_REQUIRED', 'APPROVED', 'REJECTED', 'ACTIVE', 'REVIEW_REQUIRED', 'FAILED', 'ROLLED_BACK', 'DISABLED');

-- CreateEnum
CREATE TYPE "DatasetKind" AS ENUM ('GENERATION', 'ATTACK_VALIDATION', 'NORMAL_VALIDATION', 'HOLDOUT');

-- CreateEnum
CREATE TYPE "SampleKind" AS ENUM ('ATTACK', 'NORMAL', 'BYPASS');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('QUEUED', 'RUNNING', 'HARDENING', 'PASSED', 'FAILED');

-- CreateEnum
CREATE TYPE "DeploymentTargetType" AS ENUM ('INTERNAL', 'MODSECURITY', 'CLOUDFLARE');

-- CreateEnum
CREATE TYPE "DeploymentStatus" AS ENUM ('PENDING', 'SHADOW', 'DEPLOYED', 'EXPORTED', 'FAILED', 'ROLLED_BACK');

-- CreateEnum
CREATE TYPE "ApprovalDecision" AS ENUM ('APPROVED', 'REJECTED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProtectedService" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "apiUrl" TEXT NOT NULL,
    "connection" TEXT NOT NULL DEFAULT 'Nginx + ModSecurity',
    "status" "ServiceStatus" NOT NULL DEFAULT 'CONNECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProtectedService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequestEvent" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "protectedServiceId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "contentType" TEXT,
    "bodyHash" TEXT,
    "bodySize" INTEGER NOT NULL DEFAULT 0,
    "ipFingerprint" TEXT,
    "userAgent" TEXT,
    "responseStatus" INTEGER,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequestEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SanitizedRequest" (
    "id" TEXT NOT NULL,
    "requestEventId" TEXT NOT NULL,
    "query" JSONB NOT NULL,
    "bodyPreview" TEXT,
    "parsedBodyFields" JSONB,
    "headers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SanitizedRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafeReplayPayload" (
    "id" TEXT NOT NULL,
    "requestEventId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "query" JSONB NOT NULL,
    "body" JSONB,
    "headers" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafeReplayPayload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NormalizedRequest" (
    "id" TEXT NOT NULL,
    "requestEventId" TEXT NOT NULL,
    "normalizedQuery" TEXT NOT NULL,
    "normalizedBody" TEXT NOT NULL,
    "commentCollapsed" TEXT NOT NULL,
    "normalizationSteps" JSONB NOT NULL,
    "tokens" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'normalized',
    "errorStep" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NormalizedRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetectionResult" (
    "id" TEXT NOT NULL,
    "requestEventId" TEXT NOT NULL,
    "ruleVersionId" TEXT,
    "classification" "TrafficClassification" NOT NULL,
    "attackCategory" "AttackCategory",
    "matched" BOOLEAN NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reasons" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DetectionResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnforcementResult" (
    "id" TEXT NOT NULL,
    "requestEventId" TEXT NOT NULL,
    "ruleVersionId" TEXT,
    "action" "EnforcementAction" NOT NULL,
    "source" "EnforcementSource" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnforcementResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureRule" (
    "id" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "protectedServiceId" TEXT NOT NULL,
    "sourceEventId" TEXT,
    "category" "AttackCategory" NOT NULL,
    "status" "RuleStatus" NOT NULL DEFAULT 'DRAFT',
    "summary" TEXT NOT NULL,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "falsePositiveRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SignatureRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SignatureRuleVersion" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "definition" JSONB NOT NULL,
    "note" TEXT NOT NULL,
    "definitionHash" TEXT NOT NULL,
    "modSecurityRule" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SignatureRuleVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dataset" (
    "id" TEXT NOT NULL,
    "protectedServiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "DatasetKind" NOT NULL,
    "lockedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Dataset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DatasetSample" (
    "id" TEXT NOT NULL,
    "datasetId" TEXT NOT NULL,
    "requestEventId" TEXT,
    "kind" "SampleKind" NOT NULL,
    "category" "AttackCategory",
    "expectedAttack" BOOLEAN NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DatasetSample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationRun" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleVersionId" TEXT NOT NULL,
    "status" "ValidationStatus" NOT NULL DEFAULT 'QUEUED',
    "attackDetectionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "falsePositiveRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bypassSuccessRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "rounds" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValidationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValidationCaseResult" (
    "id" TEXT NOT NULL,
    "validationRunId" TEXT NOT NULL,
    "datasetSampleId" TEXT NOT NULL,
    "detected" BOOLEAN NOT NULL,
    "expectedAttack" BOOLEAN NOT NULL,
    "matchedReasons" JSONB NOT NULL,
    "latencyMs" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValidationCaseResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HoldoutEvaluation" (
    "id" TEXT NOT NULL,
    "validationRunId" TEXT NOT NULL,
    "sampleCount" INTEGER NOT NULL,
    "attackDetectionRate" DOUBLE PRECISION NOT NULL,
    "falsePositiveRate" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HoldoutEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeploymentTarget" (
    "id" TEXT NOT NULL,
    "protectedServiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DeploymentTargetType" NOT NULL,
    "config" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeploymentTarget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeploymentHistory" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "ruleVersionId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "status" "DeploymentStatus" NOT NULL,
    "artifactPath" TEXT,
    "deployedBy" TEXT,
    "errorMessage" TEXT,
    "deployedAt" TIMESTAMP(3),
    "rolledBackAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeploymentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RuleApproval" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "decision" "ApprovalDecision" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RuleApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiReport" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "validationRunId" TEXT,
    "attackSummary" TEXT NOT NULL,
    "detectionEvidence" JSONB NOT NULL,
    "normalizationComparison" JSONB NOT NULL,
    "bypassResult" TEXT NOT NULL,
    "confidenceReason" TEXT NOT NULL,
    "operatorGuide" JSONB NOT NULL,
    "deploymentRecommendation" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT,
    "metadata" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ProtectedService_slug_key" ON "ProtectedService"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "RequestEvent_eventId_key" ON "RequestEvent"("eventId");

-- CreateIndex
CREATE INDEX "RequestEvent_protectedServiceId_occurredAt_idx" ON "RequestEvent"("protectedServiceId", "occurredAt");

-- CreateIndex
CREATE INDEX "RequestEvent_path_occurredAt_idx" ON "RequestEvent"("path", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "SanitizedRequest_requestEventId_key" ON "SanitizedRequest"("requestEventId");

-- CreateIndex
CREATE UNIQUE INDEX "SafeReplayPayload_requestEventId_key" ON "SafeReplayPayload"("requestEventId");

-- CreateIndex
CREATE INDEX "SafeReplayPayload_expiresAt_idx" ON "SafeReplayPayload"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "NormalizedRequest_requestEventId_key" ON "NormalizedRequest"("requestEventId");

-- CreateIndex
CREATE INDEX "DetectionResult_requestEventId_createdAt_idx" ON "DetectionResult"("requestEventId", "createdAt");

-- CreateIndex
CREATE INDEX "DetectionResult_classification_createdAt_idx" ON "DetectionResult"("classification", "createdAt");

-- CreateIndex
CREATE INDEX "EnforcementResult_requestEventId_createdAt_idx" ON "EnforcementResult"("requestEventId", "createdAt");

-- CreateIndex
CREATE INDEX "EnforcementResult_action_createdAt_idx" ON "EnforcementResult"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SignatureRule_externalId_key" ON "SignatureRule"("externalId");

-- CreateIndex
CREATE INDEX "SignatureRule_protectedServiceId_status_idx" ON "SignatureRule"("protectedServiceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SignatureRuleVersion_ruleId_version_key" ON "SignatureRuleVersion"("ruleId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Dataset_protectedServiceId_kind_name_key" ON "Dataset"("protectedServiceId", "kind", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ValidationCaseResult_validationRunId_datasetSampleId_key" ON "ValidationCaseResult"("validationRunId", "datasetSampleId");

-- CreateIndex
CREATE UNIQUE INDEX "HoldoutEvaluation_validationRunId_key" ON "HoldoutEvaluation"("validationRunId");

-- CreateIndex
CREATE UNIQUE INDEX "DeploymentTarget_protectedServiceId_type_name_key" ON "DeploymentTarget"("protectedServiceId", "type", "name");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- AddForeignKey
ALTER TABLE "RequestEvent" ADD CONSTRAINT "RequestEvent_protectedServiceId_fkey" FOREIGN KEY ("protectedServiceId") REFERENCES "ProtectedService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SanitizedRequest" ADD CONSTRAINT "SanitizedRequest_requestEventId_fkey" FOREIGN KEY ("requestEventId") REFERENCES "RequestEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafeReplayPayload" ADD CONSTRAINT "SafeReplayPayload_requestEventId_fkey" FOREIGN KEY ("requestEventId") REFERENCES "RequestEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NormalizedRequest" ADD CONSTRAINT "NormalizedRequest_requestEventId_fkey" FOREIGN KEY ("requestEventId") REFERENCES "RequestEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectionResult" ADD CONSTRAINT "DetectionResult_requestEventId_fkey" FOREIGN KEY ("requestEventId") REFERENCES "RequestEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectionResult" ADD CONSTRAINT "DetectionResult_ruleVersionId_fkey" FOREIGN KEY ("ruleVersionId") REFERENCES "SignatureRuleVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnforcementResult" ADD CONSTRAINT "EnforcementResult_requestEventId_fkey" FOREIGN KEY ("requestEventId") REFERENCES "RequestEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnforcementResult" ADD CONSTRAINT "EnforcementResult_ruleVersionId_fkey" FOREIGN KEY ("ruleVersionId") REFERENCES "SignatureRuleVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRule" ADD CONSTRAINT "SignatureRule_protectedServiceId_fkey" FOREIGN KEY ("protectedServiceId") REFERENCES "ProtectedService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRule" ADD CONSTRAINT "SignatureRule_sourceEventId_fkey" FOREIGN KEY ("sourceEventId") REFERENCES "RequestEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SignatureRuleVersion" ADD CONSTRAINT "SignatureRuleVersion_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "SignatureRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dataset" ADD CONSTRAINT "Dataset_protectedServiceId_fkey" FOREIGN KEY ("protectedServiceId") REFERENCES "ProtectedService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetSample" ADD CONSTRAINT "DatasetSample_datasetId_fkey" FOREIGN KEY ("datasetId") REFERENCES "Dataset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DatasetSample" ADD CONSTRAINT "DatasetSample_requestEventId_fkey" FOREIGN KEY ("requestEventId") REFERENCES "RequestEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationRun" ADD CONSTRAINT "ValidationRun_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "SignatureRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationRun" ADD CONSTRAINT "ValidationRun_ruleVersionId_fkey" FOREIGN KEY ("ruleVersionId") REFERENCES "SignatureRuleVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationCaseResult" ADD CONSTRAINT "ValidationCaseResult_validationRunId_fkey" FOREIGN KEY ("validationRunId") REFERENCES "ValidationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValidationCaseResult" ADD CONSTRAINT "ValidationCaseResult_datasetSampleId_fkey" FOREIGN KEY ("datasetSampleId") REFERENCES "DatasetSample"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HoldoutEvaluation" ADD CONSTRAINT "HoldoutEvaluation_validationRunId_fkey" FOREIGN KEY ("validationRunId") REFERENCES "ValidationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentTarget" ADD CONSTRAINT "DeploymentTarget_protectedServiceId_fkey" FOREIGN KEY ("protectedServiceId") REFERENCES "ProtectedService"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentHistory" ADD CONSTRAINT "DeploymentHistory_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "SignatureRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentHistory" ADD CONSTRAINT "DeploymentHistory_ruleVersionId_fkey" FOREIGN KEY ("ruleVersionId") REFERENCES "SignatureRuleVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeploymentHistory" ADD CONSTRAINT "DeploymentHistory_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "DeploymentTarget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleApproval" ADD CONSTRAINT "RuleApproval_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "SignatureRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RuleApproval" ADD CONSTRAINT "RuleApproval_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AiReport" ADD CONSTRAINT "AiReport_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "SignatureRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
