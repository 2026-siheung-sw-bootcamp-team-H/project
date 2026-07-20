import "dotenv/config";
import {
  AttackCategory,
  DatasetKind,
  DeploymentTargetType,
  PrismaClient,
  SampleKind
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const samples = {
  [DatasetKind.ATTACK_VALIDATION]: [
    ["SQL_INJECTION", "1' UNION SELECT password FROM users--"],
    ["SQL_INJECTION", "1 OR 2=2"],
    ["XSS", "<img src=x onerror=alert(1)>"],
    ["XSS", "javascript:alert(document.domain)"],
    ["PATH_TRAVERSAL", "../../etc/passwd"]
  ],
  [DatasetKind.NORMAL_VALIDATION]: [
    [null, "wireless keyboard"],
    [null, "union select 기초 강의"],
    [null, "../ 이미지를 설명하는 문서"],
    [null, "SVG 아이콘 상품"],
    [null, "desk lamp"]
  ],
  [DatasetKind.HOLDOUT]: [
    ["SQL_INJECTION", "%55%4e%49%4f%4e/**/%53%45%4c%45%43%54"],
    ["XSS", "&lt;svg onload=alert(1)&gt;"],
    ["PATH_TRAVERSAL", "..%2f..%2fetc%2fpasswd"],
    [null, "javascript programming book"],
    [null, "select a union membership product"]
  ]
} as const;

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@sentinel.local";
  const password = process.env.ADMIN_PASSWORD ?? "demo1234";
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email },
    update: { name: process.env.ADMIN_NAME ?? "보안 관리자", passwordHash },
    create: { email, name: process.env.ADMIN_NAME ?? "보안 관리자", passwordHash }
  });

  const service = await prisma.protectedService.upsert({
    where: { slug: "demo-shop" },
    update: {},
    create: {
      name: "Demo Shop API",
      slug: "demo-shop",
      apiUrl: "http://backend:4000/demo-shop"
    }
  });

  await prisma.deploymentTarget.upsert({
    where: {
      protectedServiceId_type_name: {
        protectedServiceId: service.id,
        type: DeploymentTargetType.INTERNAL,
        name: "Internal Signature Policy"
      }
    },
    update: {},
    create: {
      protectedServiceId: service.id,
      type: DeploymentTargetType.INTERNAL,
      name: "Internal Signature Policy",
      config: { mode: "database" }
    }
  });

  await prisma.deploymentTarget.upsert({
    where: {
      protectedServiceId_type_name: {
        protectedServiceId: service.id,
        type: DeploymentTargetType.MODSECURITY,
        name: "Nginx / ModSecurity"
      }
    },
    update: {},
    create: {
      protectedServiceId: service.id,
      type: DeploymentTargetType.MODSECURITY,
      name: "Nginx / ModSecurity",
      config: { ruleDirectory: process.env.WAF_RULE_DIR ?? "./var/waf-rules" }
    }
  });

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

    if ((await prisma.datasetSample.count({ where: { datasetId: dataset.id } })) === 0) {
      await prisma.datasetSample.createMany({
        data: datasetSamples.map(([category, value]) => ({
          datasetId: dataset.id,
          kind: category ? SampleKind.ATTACK : SampleKind.NORMAL,
          category: category ? AttackCategory[category as keyof typeof AttackCategory] : null,
          expectedAttack: Boolean(category),
          payload: { method: "GET", path: "/demo-shop/search", query: { q: value } }
        }))
      });
    }
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
