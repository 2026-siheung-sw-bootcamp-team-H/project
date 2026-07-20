import { prisma } from "../config/database.js";

export async function cleanupExpiredData(now = new Date()) {
  const replayPayloads = await prisma.safeReplayPayload.deleteMany({
    where: { expiresAt: { lte: now } }
  });
  return { replayPayloadsDeleted: replayPayloads.count, completedAt: now.toISOString() };
}
