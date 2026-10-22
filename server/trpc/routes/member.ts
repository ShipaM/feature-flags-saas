import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { logAudit } from "@/server/audit/log";
import { userRoleEnum, users } from "@/server/db/schema";
import { id } from "../schemas/common";
import { createTRPCRouter, requireRole } from "../trpc";
// Whitelist of columns: never send everything the table has

const memberColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  createdAt: users.createdAt,
};

export const memberRouter = createTRPCRouter({
  list: requireRole("admin").query(({ ctx }) =>
    ctx.db
      .select(memberColumns)
      .from(users)
      .where(ctx.tenant.byOrg(users.organizationId)) // only my organization
      .orderBy(users.id),
  ),
  updateRole: requireRole("owner")
    .input(z.object({ id, role: z.enum(userRoleEnum.enumValues) }))
    .mutation(async ({ ctx, input }) => {
      // The caller is an owner and cannot demote himself, so the organization
      // always keeps at least one owner.
      if (input.id === ctx.session.user.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You cannot change your own role",
        });
      }
      return ctx.db.transaction(async (tx) => {
        const [before] = await tx
          .select(memberColumns)
          .from(users)
          .where(ctx.tenant.byOrg(users.organizationId, eq(users.id, input.id)))
          .for("update");
        // A user from another organization looks exactly like a missing one
        if (!before) throw new TRPCError({ code: "NOT_FOUND" });
        const [after] = await tx
          .update(users)
          .set({ role: input.role, updatedAt: sql`now()` })
          .where(eq(users.id, input.id))
          .returning(memberColumns);
        await logAudit({
          ctx,
          tx,
          action: "member.role_update",
          entity: "member",
          before,
          after,
        });
        return after;
      });
    }),
});
