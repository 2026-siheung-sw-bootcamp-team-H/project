-- AlterTable
ALTER TABLE "SignatureRuleVersion" ADD COLUMN     "accepted" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "adversarialRound" INTEGER,
ADD COLUMN     "evaluationMetrics" JSONB,
ADD COLUMN     "origin" TEXT NOT NULL DEFAULT 'INITIAL',
ADD COLUMN     "parentVersion" INTEGER,
ADD COLUMN     "proposalProvider" TEXT;

-- CreateIndex
CREATE INDEX "SignatureRuleVersion_ruleId_accepted_createdAt_idx" ON "SignatureRuleVersion"("ruleId", "accepted", "createdAt");
