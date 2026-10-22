"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { FC } from "react";
import { toast } from "sonner";
import { ROLE_LABEL, ROLES } from "@/shared/constants";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTRPC } from "@/lib/trpc/client";
import type { Role } from "@/server/auth/roles";
import { TableSkeleton } from "./table-skeleton";

export const MembersTable: FC = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const me = useQuery(trpc.me.queryOptions());

  const members = useQuery(trpc.member.list.queryOptions());

  const updateRole = useMutation(
    trpc.member.updateRole.mutationOptions({
      onSuccess: () => {
        toast.success("Role updated");
        return queryClient.invalidateQueries(trpc.member.list.pathFilter());
      },
      onError: (e) => toast.error(e.message),
    }),
  );

  const isOwner = me.data?.role === "owner";

  const list = members.data;

  return (
    <div className="overflow-hidden rounded-lg border">
      <Table aria-busy={!list}>
        <TableCaption className="sr-only">Organization members</TableCaption>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            <TableHead scope="col">Email</TableHead>
            <TableHead scope="col">Name</TableHead>
            <TableHead scope="col">Role</TableHead>
            <TableHead scope="col">Joined</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {!list && <TableSkeleton columns={4} />}
          {list?.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={4}
                className="text-center text-muted-foreground"
              >
                <span role="status" aria-live="polite">
                  No members yet
                </span>
              </TableCell>
            </TableRow>
          )}
          {list?.map((m) => {
            const isMe = m.id === me.data?.id;
            return (
              <TableRow key={m.id}>
                <TableHead scope="row" className="font-normal">
                  {m.email}
                  {isMe && (
                    <span className="text-muted-foreground"> (you)</span>
                  )}
                </TableHead>
                <TableCell>{m.name}</TableCell>
                <TableCell>
                  <NativeSelect
                    size="sm"
                    aria-label={`Role for ${m.email}`}
                    value={m.role}
                    // Only the owner edits, and never their own row (the server forbids it too)
                    disabled={
                      !isOwner ||
                      isMe ||
                      (updateRole.isPending &&
                        updateRole.variables?.id === m.id)
                    }
                    onChange={(e) =>
                      updateRole.mutate({
                        id: m.id,
                        role: e.target.value as Role,
                      })
                    }
                  >
                    {ROLES.map((r) => (
                      <NativeSelectOption key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </TableCell>
                <TableCell>
                  <time dateTime={new Date(m.createdAt).toISOString()}>
                    {format(m.createdAt, "dd.MM.yyyy")}
                  </time>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
