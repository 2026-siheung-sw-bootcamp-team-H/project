import "dotenv/config";
import { Worker } from "bullmq";
import { getRedisConnection, securityQueueName } from "./config/queue.js";
import { prisma } from "./config/database.js";
import { env } from "./config/env.js";
import { generateReport } from "./services/report.service.js";
import { cleanupExpiredData } from "./services/retention.service.js";
import { runValidation } from "./services/validation.service.js";

const worker = new Worker(
  securityQueueName,
  async (job) => {
    if (job.name === "validate-rule") {
      const run = await runValidation(String(job.data.ruleId));
      return { validationRunId: run.id };
    }
    if (job.name === "generate-report") {
      const report = await generateReport(String(job.data.ruleId));
      return { reportId: report.id };
    }
    throw new Error(`Unsupported job: ${job.name}`);
  },
  { connection: getRedisConnection(), concurrency: 2 }
);

worker.on("completed", (job) => console.log(`Job ${job.id} completed.`));
worker.on("failed", (job, error) => console.error(`Job ${job?.id ?? "unknown"} failed.`, error));

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

async function shutdown() {
  clearInterval(cleanupTimer);
  await worker.close();
  await prisma.$disconnect();
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
