"use client";
import { FC } from "react";
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
import { Button } from "@/components/ui/button";

export type ConfirmButtonProps = {
  label: string;
  // Accessible name for the trigger when the visible label is ambiguous (e.g. one per table row)
  ariaLabel?: string;
  title: string;
  text: string;
  destructive?: boolean;
  disabled?: boolean;
  onConfirm: () => void;
};

export const ConfirmButton: FC<ConfirmButtonProps> = (p) => (
  <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button
        size="sm"
        variant={p.destructive ? "destructive" : "outline"}
        disabled={p.disabled}
        aria-label={p.ariaLabel}
      >
        {p.label}
      </Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{p.title}</AlertDialogTitle>
        <AlertDialogDescription>{p.text}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          variant={p.destructive ? "destructive" : "default"}
          onClick={p.onConfirm}
        >
          {p.label}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
