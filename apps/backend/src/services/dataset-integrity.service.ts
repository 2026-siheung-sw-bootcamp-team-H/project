import { createHash } from "node:crypto";
import type { DatasetSample } from "@prisma/client";

export function hashDatasetSamples(
  samples: Array<Pick<DatasetSample, "category" | "expectedAttack" | "kind" | "payload">>
) {
  const canonical = samples
    .map((sample) => ({
      category: sample.category,
      expectedAttack: sample.expectedAttack,
      kind: sample.kind,
      payload: sample.payload
    }))
    .sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
  return createHash("sha256").update(JSON.stringify(canonical)).digest("hex");
}
