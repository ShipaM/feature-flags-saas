import { redis } from "./redis";
export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
};

export async function checkRateLimit(
  id: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const nowSec = Math.floor(Date.now() / 1000);
  const windowId = Math.floor(nowSec / windowSeconds);
  const key = `rl:${id}:${windowId}`; // новое окно = новый ключ
  const retryAfterSeconds = windowSeconds - (nowSec % windowSeconds);

  try {
    const res = await redis.multi().incr(key).expire(key, windowSeconds).exec();
    const count = Number(res?.[0]?.[1] ?? 0);
    return {
      allowed: count <= limit,
      limit,
      remaining: Math.max(0, limit - count),
      retryAfterSeconds,
    };
  } catch (error) {
    console.error(
      "[rate-limit] check failed, allowing request:",
      (error as Error).message,
    );
    return { allowed: true, limit, remaining: limit, retryAfterSeconds };
  }
}
