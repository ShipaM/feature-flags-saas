import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { generateApiKey } from "@/lib/apiKey";
import { apiKeys } from "@/server/db/schema";
import {
  apiKeyIdInput,
  createApiKeyInput,
  listApiKeysInput,
} from "../schemas/apiKey";
import { createTRPCRouter, requireRole } from "../trpc";
// The ONLY columns that may leave the server. `hashedKey` is deliberately missing.
const publicColumns = {
  id: apiKeys.id,
  projectId: apiKeys.projectId,
  environment: apiKeys.environment,
  type: apiKeys.type,
  name: apiKeys.name,
  keyPrefix: apiKeys.keyPrefix,
  createdAt: apiKeys.createdAt,
  revokedAt: apiKeys.revokedAt,
};
export const apiKeyRouter = createTRPCRouter({
  // List keys of the current organization (never returns the key itself)
  list: requireRole("admin")
    .input(listApiKeysInput)
    .query(({ ctx, input }) =>
      ctx.db
        .select(publicColumns)
        .from(apiKeys)
        .where(
          ctx.tenant.byProject(
            apiKeys.projectId, // restrict to the current tenant's projects
            input?.projectId
              ? eq(apiKeys.projectId, input.projectId)
              : undefined,
          ),
        )
        .orderBy(apiKeys.id),
    ),
  // Create a key. The plaintext is returned ONCE, in the `key` field.
  create: requireRole("admin")
    .input(createApiKeyInput)
    .mutation(async ({ ctx, input }) => {
      // Prevent creating keys for another tenant's project
      await ctx.tenant.assertProject(input.projectId);
      const { plaintext, hashedKey, keyPrefix } = generateApiKey(
        input.environment,
      );
      const [created] = await ctx.db
        .insert(apiKeys)
        .values({
          projectId: input.projectId,
          environment: input.environment,
          type: input.type,
          name: input.name,
          keyPrefix,
          hashedKey, // only the hash goes to the database
        })
        .returning(publicColumns);
      return { ...created, key: plaintext };
    }),
  // Revoke a key. Idempotent: revoking twice keeps the first revocation time.
  revoke: requireRole("admin")
    .input(apiKeyIdInput)
    .mutation(async ({ ctx, input }) => {
      const [revoked] = await ctx.db
        .update(apiKeys)
        .set({ revokedAt: sql`coalesce(${apiKeys.revokedAt}, now())` })
        // Check both key ID and tenant ownership atomically
        .where(
          ctx.tenant.byProject(apiKeys.projectId, eq(apiKeys.id, input.id)),
        )
        .returning(publicColumns);
      // Hide both missing and foreign keys as NOT_FOUND
      if (!revoked) throw new TRPCError({ code: "NOT_FOUND" });
      return revoked;
    }),
  // Rotate: issue a new key with the same settings and revoke the old one, atomically.
  rotate: requireRole("admin")
    .input(apiKeyIdInput)
    .mutation(({ ctx, input }) =>
      ctx.db.transaction(async (tx) => {
        const [old] = await tx
          .select()
          .from(apiKeys)
          .where(
            ctx.tenant.byProject(apiKeys.projectId, eq(apiKeys.id, input.id)),
          )
          .limit(1)
          .for("update"); // lock the row: two parallel rotations cannot both succeed
        if (!old) throw new TRPCError({ code: "NOT_FOUND" });
        if (old.revokedAt) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This key is already revoked",
          });
        }
        const { plaintext, hashedKey, keyPrefix } = generateApiKey(
          old.environment,
        );
        const [created] = await tx
          .insert(apiKeys)
          .values({
            projectId: old.projectId,
            environment: old.environment,
            type: old.type,
            name: old.name,
            keyPrefix,
            hashedKey,
          })
          .returning(publicColumns);
        await tx
          .update(apiKeys)
          .set({ revokedAt: sql`now()` })
          .where(eq(apiKeys.id, old.id));
        return { ...created, key: plaintext, rotatedFromId: old.id };
      }),
    ),
});
