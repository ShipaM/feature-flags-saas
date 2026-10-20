"use client";
import { useState, type FC, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Environment } from "@/shared/types";
import { FlagForm } from "./flag-form";
import { EditableFlag } from "../_types";

type FlagDialogProps = {
  projectId: number;
  environment: Environment;
  flag?: EditableFlag;
  trigger: ReactNode;
};

export const FlagDialog: FC<FlagDialogProps> = ({
  trigger,
  flag,
  projectId,
  environment,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{flag ? `Edit ${flag.key}` : "New flag"}</DialogTitle>
          <DialogDescription>
            {flag
              ? "Key and environment cannot be changed."
              : "Create a feature flag."}
          </DialogDescription>
        </DialogHeader>
        <FlagForm
          projectId={projectId}
          environment={environment}
          flag={flag}
          onDone={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
};
