import { describe, expect, it } from "vitest";
import { summarizeSecurityScanComparison } from "./security-scan.service.js";

const finding = (
  pluginId: string,
  url = "http://waf/demo-shop",
  parameter: string | null = null
) => ({ pluginId, url, parameter });

describe("security scan comparison", () => {
  it("separates resolved, remaining, and introduced findings", () => {
    const result = summarizeSecurityScanComparison(
      {
        alertCount: 3,
        highCount: 2,
        mediumCount: 1,
        findings: [finding("sql"), finding("xss"), finding("headers")]
      },
      {
        alertCount: 2,
        highCount: 1,
        mediumCount: 0,
        findings: [finding("xss"), finding("new-header")]
      }
    );

    expect(result.summary).toEqual({
      alertDelta: -1,
      highDelta: -1,
      mediumDelta: -1,
      reductionRate: 1 / 3,
      resolvedCount: 2,
      remainingCount: 1,
      introducedCount: 1
    });
    expect(result.resolved.map((item) => item.pluginId)).toEqual(["sql", "headers"]);
    expect(result.remaining.map((item) => item.pluginId)).toEqual(["xss"]);
    expect(result.introduced.map((item) => item.pluginId)).toEqual(["new-header"]);
  });

  it("does not divide by zero when the before scan has no alerts", () => {
    const result = summarizeSecurityScanComparison(
      { alertCount: 0, highCount: 0, mediumCount: 0, findings: [] },
      { alertCount: 1, highCount: 1, mediumCount: 0, findings: [finding("new")] }
    );
    expect(result.summary.reductionRate).toBe(0);
    expect(result.summary.introducedCount).toBe(1);
  });
});
