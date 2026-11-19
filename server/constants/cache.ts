// How long a cached response may live. Safety net in case an invalidation is missed.
export const FLAGS_CACHE_TTL_SECONDS = 60;

// "Last known good" copy. It is read ONLY when the database is down (spec: "DB failure:
// reads served from cache"). Normal reads never touch it.
export const STALE_TTL_SECONDS = 60 * 60; // 1 hour
