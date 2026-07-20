import { afterAll, describe, expect, it } from "vitest";
import { getSecurityQueue } from "../config/queue.js";
import { enqueueSecurityJob } from "./job.service.js";

const integrationEnabled =
  process.env.RUN_INTEGRATION_TESTS === "true" &&
  process.env.RUN_QUEUE_INTEGRATION_TESTS === "true";

describe.runIf(integrationEnabled)("security queue integration", () => {
  afterAll(async () => {
    await getSecurityQueue().close();
  });

  it("deduplicates pending jobs for the same rule", async () => {
    const first = await enqueueSecurityJob("validate-rule", { ruleId: "integration-rule" });
    const second = await enqueueSecurityJob("validate-rule", { ruleId: "integration-rule" });

    expect(second.jobId).toBe(first.jobId);
    expect(second.deduplicated).toBe(true);

    const job = await getSecurityQueue().getJob(String(first.jobId));
    await job?.remove();
  });
});
