import "server-only";
import Redis from "ioredis";
import { env } from "../env";

function createRedis() {
  const client = new Redis(env.REDIS_URL, {
    // If Redis is down, commands must fail immediately instead of waiting in a queue
    enableOfflineQueue: false,

    // At most 0.5 s to wait for a reply to a single command
    commandTimeout: 500,

    // At most 2 s to establish a connection
    connectTimeout: 2_000,

    // Reconnect in the background: after 0.2 s, 0.4 s ... at least once every 5 s
    retryStrategy: (attempt) => Math.min(attempt * 200, 5_000),
  });

  // Without this handler ioredis logs "Unhandled error event" on every failure
  client.on("error", (err) => console.error("[redis]", err.message));

  return client;
}

// One instance per process, survives hot reload in dev
const globalForRedis = globalThis as typeof globalThis & { redis?: Redis };

export const redis = (globalForRedis.redis ??= createRedis());
