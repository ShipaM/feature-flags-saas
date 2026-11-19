import { redis } from "./redis";

// 45 days: the monthly billing job has time to collect the counters
const USAGE_TTL_SECONDS = 60 * 60 * 24 * 45;

// Daily counter per project, e.g. usage:1:2026-11-19 (UTC date)
export const usageKey = (projectId: number, date: Date = new Date()) =>
  `usage:${projectId}:${date.toISOString().slice(0, 10)}`;

// Counts one flag read for billing. Never fails the request: errors are only logged
export async function countFlagRead(projectId: number) {
  try {
    const key = usageKey(projectId);
    await redis.multi().incr(key).expire(key, USAGE_TTL_SECONDS).exec();
  } catch (error) {
    console.error("[usage] count failed (ignored):", (error as Error).message);
  }
}
