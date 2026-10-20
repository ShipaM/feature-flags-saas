"use client";
import { format } from "date-fns";
import { FC } from "react";
import { ENV_BADGE } from "@/shared/constants";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ApiKey } from "../_types";
import { ConfirmButton } from "./confirm-button";

type ApiKeysTableProps = {
  keys: ApiKey[] | undefined; // undefined while the list is loading
  rotating: boolean;
  revoking: boolean;
  onRotate: (id: number) => void;
  onRevoke: (id: number) => void;
};

export const ApiKeysTable: FC<ApiKeysTableProps> = ({
  keys,
  rotating,
  revoking,
  onRotate,
  onRevoke,
}) => (
  <div className="overflow-hidden rounded-lg border">
    <Table aria-busy={!keys}>
      <TableCaption className="sr-only">API keys</TableCaption>
      <TableHeader className="bg-muted/50">
        <TableRow className="hover:bg-transparent">
          <TableHead scope="col">Name</TableHead>
          <TableHead scope="col">Environment</TableHead>
          <TableHead scope="col">Key</TableHead>
          <TableHead scope="col">Created</TableHead>
          <TableHead scope="col">Status</TableHead>
          <TableHead scope="col">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {(!keys || keys.length === 0) && (
          <TableRow>
            <TableCell
              colSpan={6}
              className="text-center text-muted-foreground"
            >
              <span role="status" aria-live="polite">
                {keys ? "No API keys yet" : "Loading…"}
              </span>
            </TableCell>
          </TableRow>
        )}
        {keys?.map((k) => (
          <TableRow key={k.id}>
            <TableHead scope="row" className="font-normal">
              {k.name}
            </TableHead>
            <TableCell>
              <Badge variant={ENV_BADGE[k.environment]}>{k.environment}</Badge>
            </TableCell>
            <TableCell>
              <code>
                {k.keyPrefix}
                <span aria-hidden="true">••••••••</span>
                <span className="sr-only">, rest of the key hidden</span>
              </code>
            </TableCell>
            <TableCell>
              <time dateTime={new Date(k.createdAt).toISOString()}>
                {format(k.createdAt, "dd.MM.yyyy HH:mm")}
              </time>
            </TableCell>
            <TableCell>
              {k.revokedAt ? (
                <Badge variant="outline">
                  Revoked{" "}
                  <time dateTime={new Date(k.revokedAt).toISOString()}>
                    {format(k.revokedAt, "dd.MM.yyyy")}
                  </time>
                </Badge>
              ) : (
                <Badge variant="secondary">Active</Badge>
              )}
            </TableCell>
            <TableCell>
              {!k.revokedAt && (
                <div className="flex justify-end gap-2">
                  <ConfirmButton
                    label="Rotate"
                    ariaLabel={`Rotate key ${k.name}`}
                    title={`Rotate "${k.name}"?`}
                    text="A new key is issued. The old key stops working immediately."
                    disabled={rotating}
                    onConfirm={() => onRotate(k.id)}
                  />
                  <ConfirmButton
                    label="Revoke"
                    ariaLabel={`Revoke key ${k.name}`}
                    destructive
                    title={`Revoke "${k.name}"?`}
                    text="Clients using this key will get 401. This cannot be undone."
                    disabled={revoking}
                    onConfirm={() => onRevoke(k.id)}
                  />
                </div>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </div>
);
