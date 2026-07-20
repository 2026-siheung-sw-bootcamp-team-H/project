-- Track immutable validation datasets and prevent concurrent refinement for one rule.
ALTER TABLE "Dataset"
ADD COLUMN "contentHash" TEXT,
ADD COLUMN "sampleCount" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ValidationRun"
ADD COLUMN "activeKey" TEXT;

ALTER TABLE "HoldoutEvaluation"
ADD COLUMN "datasetHash" TEXT;

CREATE UNIQUE INDEX "ValidationRun_activeKey_key" ON "ValidationRun"("activeKey");
