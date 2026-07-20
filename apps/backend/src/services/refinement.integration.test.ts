import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../config/database.js";
import { ensureBootstrapData } from "./bootstrap.service.js";
import { captureSnapshot } from "./request-event.service.js";
import { generateRuleFromEvent } from "./signature-rule.service.js";
import { runValidation } from "./validation.service.js";

const integrationEnabled = process.env.RUN_INTEGRATION_TESTS === "true";
const createdEventIds: string[] = [];
const createdRuleIds: string[] = [];

describe.runIf(integrationEnabled)("adversarial refinement integration", () => {
  beforeAll(async () => {
    await ensureBootstrapData();
  }, 30_000);

  afterAll(async () => {
    if (createdRuleIds.length > 0) {
      await prisma.signatureRule.deleteMany({ where: { id: { in: createdRuleIds } } });
    }
    if (createdEventIds.length > 0) {
      await prisma.requestEvent.deleteMany({ where: { id: { in: createdEventIds } } });
    }
    await prisma.$disconnect();
  });

  it("captures an attack, hardens its rule, and passes an integrity-checked holdout", async () => {
    const payload = "<svg onload=alert(1)>";
    const captured = await captureSnapshot(
      {
        method: "GET",
        path: "/demo-shop/search",
        query: { q: payload },
        bodyPreview: "",
        parsedBodyFields: {},
        headers: {},
        bodyHash: "integration-test",
        bodySize: 0,
        ipFingerprint: "integration-test",
        analysisQuery: { q: payload },
        analysisBody: {},
        replaySafePayload: {
          method: "GET",
          path: "/demo-shop/search",
          query: { q: payload },
          body: {},
          headers: {}
        }
      },
      { eventId: `integration-${randomUUID()}` }
    );
    createdEventIds.push(captured.event.id);

    const rule = await generateRuleFromEvent(captured.event.id);
    createdRuleIds.push(rule.id);
    const run = await runValidation(rule.id);

    expect(run.status).toBe("PASSED");
    expect(run.activeKey).toBeNull();
    expect(run.holdoutEvaluation?.passed).toBe(true);
    expect(run.holdoutEvaluation?.datasetHash).toMatch(/^[0-9a-f]{64}$/);
    expect(Array.isArray(run.rounds)).toBe(true);
  }, 30_000);
});
