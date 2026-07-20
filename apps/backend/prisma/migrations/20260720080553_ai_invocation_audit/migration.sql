-- CreateTable
CREATE TABLE "AiInvocation" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "task" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "latencyMs" INTEGER NOT NULL,
    "inputHash" TEXT NOT NULL,
    "outputHash" TEXT,
    "usage" JSONB,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiInvocation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AiInvocation_provider_task_createdAt_idx" ON "AiInvocation"("provider", "task", "createdAt");

-- CreateIndex
CREATE INDEX "AiInvocation_status_createdAt_idx" ON "AiInvocation"("status", "createdAt");
