ALTER TABLE "SecurityScanRun" ADD COLUMN "activeKey" TEXT;

CREATE UNIQUE INDEX "SecurityScanRun_activeKey_key" ON "SecurityScanRun"("activeKey");
