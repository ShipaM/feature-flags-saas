# ADR-002: Deterministic rollout — FNV-1a over UTF-8, 100 buckets

Date: 2026-09-29 · Status: accepted

## Context

A flag is enabled for a percentage of users (flags.rollout, 0–100). The decision
for a given user must be stable and identical in the API and in the SDK.

## Decision

A pure function isEnabledForUser(userKey, flagKey, rolloutPercentage)
in lib/hashRollout.ts, with no dependency on the DB.

- Hash: FNV-1a, 32-bit, over UTF-8 bytes
- Hash input: userKey + ":" + flagKey
- Bucket: hash % 100 (0 to 99)
- Enabled if bucket < rolloutPercentage
- Explicitly: <= 0 -> false, >= 100 -> true, NaN -> false
- The contract is pinned by "golden" values in lib/hashRollout.test.ts

## Alternatives

- Math.random() on every request: the user "flickers" between versions
- sha256: overkill; asynchronous in the browser (crypto.subtle), which would complicate the SDK

## Consequences

- The API (day 8) and the SDK (day 14) must use the same algorithm
- The hash, the separator, or the number of buckets cannot be changed without revisiting the rollout
