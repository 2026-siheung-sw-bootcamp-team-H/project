import "dotenv/config";
import { Worker } from "bullmq";
import { getRedisConnection, securityQueueName } from "./config/queue.js";
import { prisma } from "./config/database.js";
import { env } from "./config/env.js";
import { closeOpenSearchClient } from "./config/opensearch.js";
import { generateReport } from "./services/report.service.js";
import { cleanupExpiredData } from "./services/retention.service.js";
import { validateSignatureRule } from "./services/signature-rule.service.js";
import { runSecurityScan } from "./services/security-scan.service.js";
import {
  backfillSearchOutbox,
  dispatchPendingSearchOutbox,
  ensureRequestEventIndex,
  processSearchOutbox,
  releaseSearchOutbox
} from "./services/search-index.service.js";

const worker = new Worker(
  securityQueueName,
  async (job) => {
    if (job.name === "validate-rule") {
      const { validation, report, securityScan } = await validateSignatureRule(
        String(job.data.ruleId)
      );
      await job.updateProgress(100);
      return {
        validationRunId: validation.id,
        reportId: report.id,
        securityScanRunId: securityScan?.scan.id ?? null
      };
    }
    if (job.name === "generate-report") {
      const report = await generateReport(String(job.data.ruleId));
      return { reportId: report.id };
    }
    if (job.name === "index-request-event") {
      await processSearchOutbox(String(job.data.outboxId));
      return { outboxId: String(job.data.outboxId) };
    }
    if (job.name === "run-zap-scan") {
      const scan = await runSecurityScan(String(job.data.scanRunId), (progress) =>
        job.updateProgress(progress)
      );
      return { scanRunId: scan.id };
    }
    throw new Error(`Unsupported job: ${job.name}`);
  },
  { connection: getRedisConnection(), concurrency: 2 }
);

worker.on("completed", (job) => console.log(`Job ${job.id} completed.`));
worker.on("failed", (job, error) => {
  console.error(`Job ${job?.id ?? "unknown"} failed.`, error);
  if (job?.name === "index-request-event") {
    void releaseSearchOutbox(String(job.data.outboxId), error).catch((releaseError) =>
      console.error("Search outbox lock release failed.", releaseError)
    );
  }
});

async function runCleanup() {
  try {
    const result = await cleanupExpiredData();
    if (result.replayPayloadsDeleted > 0) {
      console.log(`Removed ${result.replayPayloadsDeleted} expired replay payload(s).`);
    }
  } catch (error) {
    console.error("Expired data cleanup failed.", error);
  }
}

void runCleanup();
const cleanupTimer = setInterval(() => void runCleanup(), env.cleanupIntervalMs);
cleanupTimer.unref();

async function runSearchDispatch() {
  if (!env.openSearchEnabled) return;
  try {
    await ensureRequestEventIndex();
    await backfillSearchOutbox();
    await dispatchPendingSearchOutbox();
  } catch (error) {
    console.error("OpenSearch outbox dispatch failed.", error);
  }
}

void runSearchDispatch();
const searchDispatchTimer = setInterval(() => void runSearchDispatch(), env.searchOutboxIntervalMs);
searchDispatchTimer.unref();

async function shutdown() {
  clearInterval(cleanupTimer);
  clearInterval(searchDispatchTimer);
  await worker.close();
  await closeOpenSearchClient();
  await prisma.$disconnect();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
