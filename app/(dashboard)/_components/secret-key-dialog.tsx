"use client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { FC, useState } from "react";
import { Button } from "@/components/ui/button";

export const SecretKeyDialog: FC<{
  secret: { name: string; key: string } | null;
  onClose: () => void;
}> = ({ secret, onClose }) => {
  const [copied, setCopied] = useState(false);

  return (
    <Dialog open={secret !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Key {secret?.name} created</DialogTitle>
          <DialogDescription>
            Copy it now. We will not show it again.
          </DialogDescription>
        </DialogHeader>
        <code
          id="secret-key-value"
          aria-label="Secret API key"
          className="break-all rounded-md bg-muted p-2"
        >
          {secret?.key}
        </code>
        <DialogFooter>
          <Button
            variant="outline"
            aria-describedby="secret-key-value"
            onClick={async () => {
              await navigator.clipboard.writeText(secret?.key ?? "");
              setCopied(true);
            }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
          <span role="status" aria-live="polite" className="sr-only">
            {copied ? "Key copied to clipboard" : ""}
          </span>
          <Button onClick={onClose}>I saved the key</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
