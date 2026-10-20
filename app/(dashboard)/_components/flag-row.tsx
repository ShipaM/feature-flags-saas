"use client";
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
import { TableCell, TableRow } from "@/components/ui/table";
import { FC } from "react";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { useFlagMutations } from "../_hooks";
import type { Flag } from "../_types";
import { RolloutSlider } from "./rollout-slider";
import { FlagDialog } from "./flag-dialog";

export type FlagRowProps = {
  flag: Flag;
  canEdit: boolean;
};

export const FlagRow: FC<FlagRowProps> = ({ flag, canEdit }) => {
  const { setEnabled, setRollout, remove } = useFlagMutations();

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
          <div className="flex items-center justify-end gap-1">
            <FlagDialog
              projectId={flag.projectId}
              environment={flag.environment}
              flag={flag}
              trigger={
                <Button
                  size="icon-sm"
                  variant="outline"
                  aria-label={`Edit ${flag.key}`}
                  title="Edit"
                >
                  <Pencil />
                </Button>
              }
            />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  size="icon-sm"
                  variant="destructive"
                  disabled={remove.isPending}
                  aria-label={`Delete ${flag.key}`}
                  title="Delete"
                >
                  {remove.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Trash2 />
                  )}
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
          </div>
        </TableCell>
      )}
    </TableRow>
  );
};
