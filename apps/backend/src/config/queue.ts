import { Queue, type ConnectionOptions } from "bullmq";
import { env } from "./env.js";

export const securityQueueName = "security-pipeline";

export function getRedisConnection(): ConnectionOptions {
  const url = new URL(env.redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    username: url.username || undefined,
    password: url.password || undefined,
    db: url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0,
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
    maxRetriesPerRequest: null
  };
}

let queue: Queue | undefined;

export function getSecurityQueue(): Queue {
  queue ??= new Queue(securityQueueName, {
    connection: getRedisConnection(),
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 1000 },
      removeOnComplete: 100,
      removeOnFail: 200
    }
  });
  return queue;
}
