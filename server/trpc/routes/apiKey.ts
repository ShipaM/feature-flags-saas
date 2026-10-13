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

// Creates a tRPC router that contains all API key operations.
export const apiKeyRouter = createTRPCRouter({
  // Defines an endpoint for retrieving API keys.
  // Only users with the admin role can access this endpoint.
  list: requireRole("admin")
    // Validates optional input, such as a project ID filter.
    .input(listApiKeysInput)
    // Executes a database query when the endpoint is called.
    .query(
      ({ ctx, input }) =>
        ctx.db // Accesses the database through the request context.
          .select(publicColumns) // Selects only the safe fields defined above.
          .from(apiKeys) // Specifies the API keys table as the data source.
          .where(
            // Restricts results to projects belonging to the current tenant.
            ctx.tenant.byProject(
              apiKeys.projectId, // Column used to check project ownership.
              // Adds a project ID filter if one was provided by the caller.
              input?.projectId
                ? eq(apiKeys.projectId, input.projectId) // Matches the requested project.
                : undefined, // Omits the additional filter if no project ID was provided.
            ),
          )
          .orderBy(apiKeys.id), // Sorts the returned keys by their database IDs.
    ),

  // Defines an endpoint for creating a new API key.
  // The plaintext key is returned only once, when the key is created.
  create: requireRole("admin")
    // Validates the project ID, environment, name, and key type.
    .input(createApiKeyInput)
    // Runs the creation logic asynchronously.
    .mutation(async ({ ctx, input }) => {
      // Verifies that the requested project belongs to the current tenant.
      // Prevents an administrator from creating keys for another tenant's project.
      await ctx.tenant.assertProject(input.projectId);

      // Generates the secret key, its hash, and a safe identifying prefix.
      const { plaintext, hashedKey, keyPrefix } = generateApiKey(
        input.environment, // Generates a key appropriate for the selected environment.
      );

      // Inserts the new API key record into the database.
      const [created] = await ctx.db
        .insert(apiKeys) // Specifies the table where the record will be inserted.
        .values({
          projectId: input.projectId, // Associates the key with the selected project.
          environment: input.environment, // Stores the key's environment.
          type: input.type, // Stores whether the key is server-side or client-side.
          name: input.name, // Stores the user-provided key name.
          keyPrefix, // Stores the non-secret prefix for identification.
          hashedKey, // Stores the hash instead of the plaintext secret.
        })
        // Returns the newly created record using only the safe columns.
        .returning(publicColumns);

      // Returns the safe database fields and the plaintext key.
      // The plaintext is not stored in the database and should be shown only once.
      return { ...created, key: plaintext };
    }),

  // Defines an endpoint for revoking an API key.
  // Revoked keys should no longer be accepted by API authentication.
  revoke: requireRole("admin")
    // Validates the ID of the key to revoke.
    .input(apiKeyIdInput)
    // Executes the revocation logic asynchronously.
    .mutation(async ({ ctx, input }) => {
      // Updates the selected API key in the database.
      const [revoked] = await ctx.db
        .update(apiKeys) // Specifies the table to update.
        .set({
          // Sets the revocation time to the current time only if it is not set.
          // If the key was already revoked, its original timestamp is preserved.
          revokedAt: sql`coalesce(${apiKeys.revokedAt}, now())`,
        })

        // Checks the key ID and tenant ownership in the same database query.
        .where(
          ctx.tenant.byProject(
            apiKeys.projectId, // Uses the project ID to enforce tenant isolation.
            eq(apiKeys.id, input.id), // Matches the requested API key ID.
          ),
        )
        // Returns the updated record with only safe fields.
        .returning(publicColumns);

      // Returns NOT_FOUND if the key does not exist or belongs to another tenant.
      // This avoids revealing whether another tenant's key exists.
      if (!revoked) throw new TRPCError({ code: "NOT_FOUND" });

      // Returns the updated API key information without exposing its secret.
      return revoked;
    }),

  // Defines an endpoint for rotating an API key.
  // Rotation creates a replacement key and revokes the old key.
  rotate: requireRole("admin")
    // Validates the ID of the key to rotate.
    .input(apiKeyIdInput)
    // Executes all database changes inside a single transaction.
    .mutation(({ ctx, input }) =>
      ctx.db.transaction(async (tx) => {
        // Finds the requested key and locks its database row.
        // The lock prevents concurrent transactions from rotating the same key simultaneously.
        const [old] = await tx
          .select() // Selects the existing API key record.
          .from(apiKeys) // Reads from the API keys table.
          .where(
            // Restricts the lookup to keys owned by the current tenant.
            ctx.tenant.byProject(
              apiKeys.projectId, // Column used to enforce tenant ownership.
              eq(apiKeys.id, input.id), // Matches the requested key ID.
            ),
          )
          .limit(1) // Returns at most one matching record.
          .for("update"); // Locks the matching row until the transaction completes.

        // Returns NOT_FOUND if the key does not exist or is not accessible to this tenant.
        if (!old) throw new TRPCError({ code: "NOT_FOUND" });

        // Prevents rotating a key that has already been revoked.
        if (old.revokedAt) {
          // Returns a conflict error because the key is no longer active.
          throw new TRPCError({
            code: "CONFLICT",
            message: "This key is already revoked",
          });
        }

        // Generates a replacement secret, its hash, and its identifying prefix.
        const { plaintext, hashedKey, keyPrefix } = generateApiKey(
          old.environment, // Keeps the replacement in the same environment.
        );

        // Inserts the replacement key into the database.
        const [created] = await tx
          .insert(apiKeys) // Specifies the API keys table.
          .values({
            projectId: old.projectId, // Keeps the same project association.
            environment: old.environment, // Keeps the same environment.
            type: old.type, // Preserves the original key type.
            name: old.name, // Preserves the original key name.
            keyPrefix, // Stores the replacement key's identifying prefix.
            hashedKey, // Stores only the replacement key's hash.
          })
          // Returns the safe fields of the newly created key.
          .returning(publicColumns);

        // Revokes the old key after creating the replacement.
        await tx
          .update(apiKeys) // Specifies the table to update.
          .set({ revokedAt: sql`now()` }) // Sets the old key's revocation time.
          .where(eq(apiKeys.id, old.id)); // Updates only the original key.

        // Returns the new key's details, its plaintext secret, and the old key's ID.
        // rotatedFromId lets the client identify which key was replaced.
        return {
          ...created, // Includes the safe fields of the replacement key.
          key: plaintext, // Returns the new secret once so the client can save it.
          rotatedFromId: old.id, // Identifies the key that was rotated.
        };
      }),
    ),
});
