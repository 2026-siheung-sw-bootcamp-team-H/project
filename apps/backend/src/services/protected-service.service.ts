import { ServiceStatus } from "@prisma/client";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { prisma } from "../config/database.js";
import { env } from "../config/env.js";
import { AppError } from "../utils/app-error.js";
import { ensureProtectedServiceSupportData } from "./bootstrap.service.js";

type ServiceInput = {
  name: string;
  publicDomain: string;
  originUrl: string;
  proxyUrl?: string;
  connection?: string;
};

type ServicePatch = Omit<Partial<ServiceInput>, "proxyUrl"> & {
  proxyUrl?: string | null;
  status?: ServiceStatus;
};

function slugify(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

function isPrivateAddress(address: string) {
  if (address === "::1" || address === "0:0:0:0:0:0:0:1") return true;
  if (address.startsWith("fc") || address.startsWith("fd") || address.startsWith("fe80:"))
    return true;
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some(Number.isNaN)) return false;
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 0
  );
}

async function assertSafeTarget(rawUrl: string) {
  const url = new URL(rawUrl);
  if (!["http:", "https:"].includes(url.protocol)) {
    throw new AppError(
      "서비스 주소는 http 또는 https만 사용할 수 있습니다.",
      400,
      "INVALID_SERVICE_URL"
    );
  }
  if (url.username || url.password) {
    throw new AppError(
      "서비스 주소에 인증 정보를 포함할 수 없습니다.",
      400,
      "URL_CREDENTIALS_FORBIDDEN"
    );
  }
  if (env.serviceConnectionAllowPrivate) return url;
  if (url.hostname === "localhost" || (isIP(url.hostname) && isPrivateAddress(url.hostname))) {
    throw new AppError(
      "내부 네트워크 주소는 연결 대상으로 사용할 수 없습니다.",
      400,
      "PRIVATE_TARGET_FORBIDDEN"
    );
  }
  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = await lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw new AppError("서비스 도메인의 DNS를 확인할 수 없습니다.", 400, "SERVICE_DNS_FAILED");
  }
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new AppError(
      "내부 네트워크로 해석되는 서비스 주소는 사용할 수 없습니다.",
      400,
      "PRIVATE_TARGET_FORBIDDEN"
    );
  }
  return url;
}

async function uniqueSlug(name: string) {
  const base = slugify(name) || "protected-service";
  for (let suffix = 0; suffix < 100; suffix += 1) {
    const slug = suffix === 0 ? base : `${base}-${suffix + 1}`;
    if (!(await prisma.protectedService.findUnique({ where: { slug }, select: { id: true } }))) {
      return slug;
    }
  }
  throw new AppError("서비스 식별자를 생성할 수 없습니다.", 409, "SERVICE_SLUG_CONFLICT");
}

export async function listProtectedServices() {
  return prisma.protectedService.findMany({
    include: {
      _count: {
        select: { requestEvents: true, rules: { where: { status: "ACTIVE" } }, securityScans: true }
      },
      requestEvents: { orderBy: { occurredAt: "desc" }, take: 1 },
      securityScans: { orderBy: { createdAt: "desc" }, take: 1 }
    },
    orderBy: { createdAt: "asc" }
  });
}

export async function getProtectedService(id: string) {
  const service = await prisma.protectedService.findUnique({
    where: { id },
    include: {
      _count: { select: { requestEvents: true, rules: true, securityScans: true } },
      securityScans: { orderBy: { createdAt: "desc" }, take: 10 }
    }
  });
  if (!service) throw new AppError("보호 서비스를 찾을 수 없습니다.", 404, "SERVICE_NOT_FOUND");
  return service;
}

export async function createProtectedService(input: ServiceInput, userId: string) {
  await Promise.all([
    assertSafeTarget(input.publicDomain),
    assertSafeTarget(input.originUrl),
    input.proxyUrl ? assertSafeTarget(input.proxyUrl) : Promise.resolve()
  ]);
  const service = await prisma.protectedService.create({
    data: {
      name: input.name,
      slug: await uniqueSlug(input.name),
      apiUrl: input.originUrl,
      publicDomain: input.publicDomain,
      originUrl: input.originUrl,
      proxyUrl: input.proxyUrl,
      connection: input.connection ?? "Nginx + ModSecurity",
      status: ServiceStatus.PENDING
    }
  });
  await ensureProtectedServiceSupportData(service.id);
  await prisma.auditLog.create({
    data: {
      userId,
      action: "PROTECTED_SERVICE_CREATED",
      resourceType: "ProtectedService",
      resourceId: service.id,
      metadata: { name: service.name, publicDomain: service.publicDomain }
    }
  });
  return getProtectedService(service.id);
}

export async function updateProtectedService(id: string, input: ServicePatch, userId: string) {
  const current = await getProtectedService(id);
  await Promise.all(
    [input.publicDomain, input.originUrl, input.proxyUrl]
      .filter(Boolean)
      .map((value) => assertSafeTarget(value!))
  );
  const disabledAt =
    input.status === ServiceStatus.DISABLED ? new Date() : input.status ? null : current.disabledAt;
  const service = await prisma.protectedService.update({
    where: { id },
    data: {
      ...input,
      ...(input.originUrl ? { apiUrl: input.originUrl } : {}),
      disabledAt
    }
  });
  await prisma.auditLog.create({
    data: {
      userId,
      action:
        input.status === ServiceStatus.DISABLED
          ? "PROTECTED_SERVICE_DISABLED"
          : "PROTECTED_SERVICE_UPDATED",
      resourceType: "ProtectedService",
      resourceId: id,
      metadata: { changedFields: Object.keys(input) }
    }
  });
  return service;
}

async function readLimitedBody(response: Response) {
  const reader = response.body?.getReader();
  if (!reader) return 0;
  let received = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > env.serviceConnectionMaxBytes) {
      await reader.cancel();
      break;
    }
  }
  return Math.min(received, env.serviceConnectionMaxBytes);
}

export async function testProtectedServiceConnection(id: string, userId: string) {
  const service = await getProtectedService(id);
  if (service.status === ServiceStatus.DISABLED) {
    throw new AppError(
      "비활성화된 서비스는 연결 테스트를 실행할 수 없습니다.",
      409,
      "SERVICE_DISABLED"
    );
  }
  const target = service.proxyUrl ?? service.originUrl ?? service.apiUrl;
  const url = await assertSafeTarget(target);
  const startedAt = Date.now();
  let statusCode: number | null = null;
  let errorMessage: string | null = null;
  let receivedBytes = 0;
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(env.serviceConnectionTimeoutMs),
      headers: { "User-Agent": "Aegis-Loop-Connection-Test/1.0" }
    });
    statusCode = response.status;
    receivedBytes = await readLimitedBody(response);
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "Connection failed";
  }
  const connected = statusCode !== null && statusCode >= 200 && statusCode < 500;
  const checkedAt = new Date();
  await prisma.$transaction([
    prisma.protectedService.update({
      where: { id },
      data: {
        status: connected ? ServiceStatus.CONNECTED : ServiceStatus.UNHEALTHY,
        lastHealthCheckedAt: checkedAt,
        connectedAt: connected ? (service.connectedAt ?? checkedAt) : service.connectedAt
      }
    }),
    prisma.auditLog.create({
      data: {
        userId,
        action: "PROTECTED_SERVICE_CONNECTION_TESTED",
        resourceType: "ProtectedService",
        resourceId: id,
        metadata: { connected, statusCode, latencyMs: Date.now() - startedAt, errorMessage }
      }
    })
  ]);
  return {
    serviceId: id,
    connected,
    target: url.origin,
    statusCode,
    latencyMs: Date.now() - startedAt,
    receivedBytes,
    checkedAt,
    errorMessage
  };
}
