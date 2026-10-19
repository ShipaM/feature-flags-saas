"use client";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "@/server/trpc/router";
import type { Environment } from "@/shared/types";
import { ENV_BADGE } from "@/shared/constants";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FC } from "react";
import { useFlagMutations } from "../_hooks";
import { RolloutSlider } from "./rollout-slider";

type Flag = inferRouterOutputs<AppRouter>["flag"]["list"][number];

type FlagTableProps = {
  flags: Flag[];
  environment: Environment;
  canEdit: boolean;
};

type FlagRowProps = {
  flag: Flag;
  canEdit: boolean;
};

// Each row owns its mutations, so a pending request only locks its own row
// and a request on another row can't release this row's lock
const FlagRow: FC<FlagRowProps> = ({ flag, canEdit }) => {
  const { setEnabled, setRollout, remove } = useFlagMutations();

  // Optimistic value: show what was requested until the refetch lands;
  // on error the mutation resets to idle and the server value comes back
  const enabled = setEnabled.isPending
    ? (setEnabled.variables.enabled ?? flag.enabled)
    : flag.enabled;

  return (
    <TableRow>
      <TableCell>
        <code>{flag.key}</code>
      </TableCell>
      <TableCell className="text-muted-foreground">
        {flag.description ?? "—"}
      </TableCell>
      <TableCell>
        <Switch
          checked={enabled}
          disabled={!canEdit || setEnabled.isPending}
          onCheckedChange={(checked) =>
            setEnabled.mutate({ id: flag.id, enabled: checked })
          }
          aria-label={`Toggle ${flag.key}`}
        />
      </TableCell>
      <TableCell>
        <RolloutSlider
          rollout={flag.rollout}
          disabled={!canEdit || setRollout.isPending}
          onCommit={(rollout) =>
            setRollout.mutateAsync({ id: flag.id, rollout })
          }
        />
      </TableCell>
      <TableCell>
        <Badge variant={ENV_BADGE[flag.environment]}>{flag.environment}</Badge>
      </TableCell>
      {canEdit && (
        <TableCell>
          {/* Deleting is irreversible (and breaks SDK clients in prod), so confirm first */}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="destructive"
                disabled={remove.isPending}
              >
                {remove.isPending ? "Deleting…" : "Delete"}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete flag {flag.key}?</AlertDialogTitle>
                <AlertDialogDescription>
                  The flag will be removed from {flag.environment}. Clients
                  requesting it will no longer receive it. This cannot be
                  undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={() => remove.mutate({ id: flag.id })}
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </TableCell>
      )}
    </TableRow>
  );
};

export const FlagTable: FC<FlagTableProps> = ({
  flags,
  environment,
  canEdit,
}) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Key</TableHead>
        <TableHead>Description</TableHead>
        <TableHead>Enabled</TableHead>
        <TableHead>Rollout</TableHead>
        <TableHead>Environment</TableHead>
        {canEdit && <TableHead />}
      </TableRow>
    </TableHeader>
    <TableBody>
      {flags.length === 0 && (
        <TableRow>
          <TableCell
            colSpan={canEdit ? 6 : 5}
            className="text-center text-muted-foreground"
          >
            No flags in {environment}
          </TableCell>
        </TableRow>
      )}
      {flags.map((flag) => (
        <FlagRow key={flag.id} flag={flag} canEdit={canEdit} />
      ))}
    </TableBody>
  </Table>
);
