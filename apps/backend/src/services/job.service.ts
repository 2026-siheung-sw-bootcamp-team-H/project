import { env } from "../config/env.js";
import { getSecurityQueue } from "../config/queue.js";
import { AppError } from "../utils/app-error.js";

export type SecurityJobName = "validate-rule" | "generate-report" | "run-zap-scan";

export async function enqueueSecurityJob(name: SecurityJobName, data: Record<string, string>) {
  if (!env.queueEnabled) {
    throw new AppError("작업 큐가 비활성화되어 있습니다.", 409, "QUEUE_DISABLED");
  }
  const queue = getSecurityQueue();
  const resourceId = data.ruleId ?? data.scanRunId;
  const jobId = resourceId ? `${name}--${resourceId}` : undefined;
  if (jobId) {
    const existing = await queue.getJob(jobId);
    if (existing) {
      const state = await existing.getState();
      if (["waiting", "active", "delayed", "prioritized", "waiting-children"].includes(state)) {
        return { jobId: existing.id, name, status: state, deduplicated: true };
      }
      await existing.remove();
    }
  }
  const job = await queue.add(name, data, {
    ...(jobId ? { jobId } : {}),
    ...(name === "run-zap-scan" ? { attempts: 1 } : {})
  });
  return { jobId: job.id, name, status: "queued", deduplicated: false };
}

export async function getJobStatus(id: string) {
  const job = await getSecurityQueue().getJob(id);
  if (!job) throw new AppError("작업을 찾을 수 없습니다.", 404, "JOB_NOT_FOUND");
  return {
    id: job.id,
    name: job.name,
    state: await job.getState(),
    progress: job.progress,
    result: job.returnvalue,
    failedReason: job.failedReason || null
  };
}
