ALTER TABLE "EnforcementResult"
ADD COLUMN "externalRuleId" TEXT,
ADD COLUMN "ruleMessage" TEXT,
ADD COLUMN "ruleTags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE INDEX "EnforcementResult_externalRuleId_idx"
ON "EnforcementResult"("externalRuleId");
