import { AttackCategory, DatasetKind, DeploymentTargetType, SampleKind } from "@prisma/client";
import bcrypt from "bcryptjs";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { hashDatasetSamples } from "./dataset-integrity.service.js";

const samples = {
  [DatasetKind.ATTACK_VALIDATION]: [
    ["SQL_INJECTION", "1' UNION SELECT password FROM users--"],
    ["SQL_INJECTION", "1 OR 2=2"],
    ["SQL_INJECTION", "1' AND 2=2--"],
    ["SQL_INJECTION", "1' AND SLEEP(1)--"],
    ["SQL_INJECTION", "1' AND BENCHMARK(10,MD5(1))--"],
    ["XSS", "<img src=x onerror=alert(1)>"],
    ["XSS", "javascript:alert(document.domain)"],
    ["XSS", "<iframe srcdoc=alert(1)>"],
    ["XSS", "<body onpageshow=alert(1)>"],
    ["XSS", "<details ontoggle=alert(1)>"],
    ["PATH_TRAVERSAL", "../../etc/passwd"],
    ["PATH_TRAVERSAL", "..\\..\\windows\\win.ini"],
    ["PATH_TRAVERSAL", "%2e%2e%2fetc%2fpasswd"]
  ],
  [DatasetKind.NORMAL_VALIDATION]: [
    [null, "wireless keyboard"],
    [null, "union select 기초 강의"],
    [null, "../ 이미지를 설명하는 문서"],
    [null, "SVG 아이콘 상품"],
    [null, "desk lamp"],
    [null, "javascript programming handbook"],
    [null, "iframe accessibility guide"],
    [null, "details component toggle tutorial"],
    [null, "eight hour sleep tracker"],
    [null, "select a union membership product"]
  ],
  [DatasetKind.HOLDOUT]: [
    ["SQL_INJECTION", "%55%4e%49%4f%4e/**/%53%45%4c%45%43%54"],
    ["XSS", "&lt;svg onload=alert(1)&gt;"],
    ["PATH_TRAVERSAL", "..%2f..%2fetc%2fpasswd"],
    ["SQL_INJECTION", "1%27%20AND%20SLEEP%281%29--"],
    ["XSS", "%253Csvg%2520onload%253Dalert%281%29%253E"],
    ["PATH_TRAVERSAL", "%252e%252e%252fetc%252fpasswd"],
    [null, "javascript programming book"],
    [null, "select a union membership product"],
    [null, "HTML iframe product demonstration"],
    [null, "customer sleep quality review"],
    [null, "details and summary element guide"]
  ]
} as const;

export async function ensureBootstrapData() {
  const existingAdmin = await prisma.user.findUnique({ where: { email: env.adminEmail } });
  if (!existingAdmin) {
    await prisma.user.create({
      data: {
        email: env.adminEmail,
        name: env.adminName,
        passwordHash: await bcrypt.hash(env.adminPassword, 12)
      }
    });
  }

  const service = await prisma.protectedService.upsert({
    where: { slug: "demo-shop" },
    update: {},
    create: {
      name: "Demo Shop API",
      slug: "demo-shop",
      apiUrl: "http://backend:4000/demo-shop"
    }
  });

  for (const [type, name, config] of [
    [DeploymentTargetType.INTERNAL, "Internal Signature Policy", { mode: "database" }],
    [DeploymentTargetType.MODSECURITY, "Nginx / ModSecurity", { ruleDirectory: env.wafRuleDir }]
  ] as const) {
    await prisma.deploymentTarget.upsert({
      where: {
        protectedServiceId_type_name: { protectedServiceId: service.id, type, name }
      },
      update: {},
      create: { protectedServiceId: service.id, type, name, config }
    });
  }

  for (const [kind, datasetSamples] of Object.entries(samples)) {
    const datasetKind = kind as DatasetKind;
    const dataset = await prisma.dataset.upsert({
      where: {
        protectedServiceId_kind_name: {
          protectedServiceId: service.id,
          kind: datasetKind,
          name: `${datasetKind.toLowerCase()}-v1`
        }
      },
      update: {},
      create: {
        protectedServiceId: service.id,
        kind: datasetKind,
        name: `${datasetKind.toLowerCase()}-v1`,
        lockedAt: datasetKind === DatasetKind.HOLDOUT ? new Date() : null
      }
    });
    const existingSamples = await prisma.datasetSample.findMany({
      where: { datasetId: dataset.id },
      select: { payload: true }
    });
    const existingPayloads = new Set(
      existingSamples.map((sample) => JSON.stringify(sample.payload))
    );
    const missingSamples = datasetSamples
      .map(([category, value]) => ({
        datasetId: dataset.id,
        kind: category ? SampleKind.ATTACK : SampleKind.NORMAL,
        category: category ? AttackCategory[category as keyof typeof AttackCategory] : null,
        expectedAttack: Boolean(category),
        payload: { method: "GET", path: "/demo-shop/search", query: { q: value } }
      }))
      .filter((sample) => !existingPayloads.has(JSON.stringify(sample.payload)));
    if (missingSamples.length > 0) {
      await prisma.datasetSample.createMany({
        data: missingSamples
      });
    }
    const finalizedSamples = await prisma.datasetSample.findMany({
      where: { datasetId: dataset.id }
    });
    await prisma.dataset.update({
      where: { id: dataset.id },
      data: {
        contentHash: hashDatasetSamples(finalizedSamples),
        sampleCount: finalizedSamples.length,
        lockedAt:
          datasetKind === DatasetKind.HOLDOUT ? (dataset.lockedAt ?? new Date()) : dataset.lockedAt
      }
    });
  }
}
