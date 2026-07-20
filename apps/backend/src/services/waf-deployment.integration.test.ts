import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DeploymentTargetType } from "@prisma/client";
import { prisma } from "../config/database.js";
import { ensureBootstrapData } from "./bootstrap.service.js";
import { deployRule } from "./deployment.service.js";
import { captureSnapshot } from "./request-event.service.js";
import { generateRuleFromEvent } from "./signature-rule.service.js";
import { runValidation } from "./validation.service.js";
import { rebuildModSecurityArtifact, waitForModSecurityReload } from "./waf-export.service.js";

const integrationEnabled = process.env.RUN_WAF_INTEGRATION_TESTS === "true";
let createdEventId: string | undefined;
let createdRuleId: string | undefined;

describe.runIf(integrationEnabled)("ModSecurity deployment integration", () => {
  beforeAll(async () => {
    await ensureBootstrapData();
  }, 30_000);

  afterAll(async () => {
    if (createdRuleId) await prisma.signatureRule.delete({ where: { id: createdRuleId } });
    if (createdEventId) await prisma.requestEvent.delete({ where: { id: createdEventId } });
    await rebuildModSecurityArtifact();
    await waitForModSecurityReload();
    await prisma.$disconnect();
  });

  it("marks deployment successful only after Nginx validates and reloads the generated rules", async () => {
    const payload = "<svg onload=alert(1)>";
    const captured = await captureSnapshot(
      {
        method: "GET",
        path: "/demo-shop/search",
        query: { q: payload },
        bodyPreview: "",
        parsedBodyFields: {},
        headers: {},
        bodyHash: "waf-integration-test",
        bodySize: 0,
        ipFingerprint: "waf-integration-test",
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
      { eventId: `waf-integration-${randomUUID()}` }
    );
    createdEventId = captured.event.id;

    const rule = await generateRuleFromEvent(captured.event.id);
    createdRuleId = rule.id;
    const validation = await runValidation(rule.id);
    expect(validation.status).toBe("PASSED");

    const admin = await prisma.user.findFirstOrThrow();
    const deployment = await deployRule(
      rule.id,
      "shadow",
      DeploymentTargetType.MODSECURITY,
      admin.id
    );

    expect(deployment.status).toBe("SHADOW");
    expect(deployment.artifactPath).toContain("RESPONSE-999-EXCLUSION-RULES-AFTER-CRS.conf");
  }, 30_000);
});
