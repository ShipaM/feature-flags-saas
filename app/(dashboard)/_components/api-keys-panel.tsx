"use client";
import { FC } from "react";
import { Controller } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { useApiKeys } from "../_hooks";
import { ApiKeysTable } from "./api-keys-table";
import { SecretKeyDialog } from "./secret-key-dialog";

export const ApiKeysPanel: FC<{ projectId: number }> = ({ projectId }) => {
  const {
    keys,
    form,
    onSubmit,
    creating,
    rotating,
    revoking,
    rotateKey,
    revokeKey,
    secret,
    closeSecret,
  } = useApiKeys(projectId);

  return (
    <div className="flex flex-col gap-4">
      <form
        onSubmit={onSubmit}
        aria-label="Create API key"
        aria-busy={creating}
        noValidate
        className="flex flex-wrap items-end gap-2"
      >
        <Controller
          name="name"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="w-64">
              <FieldLabel htmlFor="key-name">Name</FieldLabel>
              <Input
                {...field}
                id="key-name"
                aria-required
                aria-invalid={fieldState.invalid}
                aria-describedby={
                  fieldState.invalid ? "key-name-error" : undefined
                }
                placeholder="Backend server"
                autoComplete="off"
              />
              {fieldState.invalid && (
                <FieldError id="key-name-error" errors={[fieldState.error]} />
              )}
            </Field>
          )}
        />
        <Controller
          name="environment"
          control={form.control}
          render={({ field }) => (
            <Field className="w-32">
              <FieldLabel htmlFor="key-env">Environment</FieldLabel>
              <NativeSelect {...field} id="key-env">
                <NativeSelectOption value="dev">dev</NativeSelectOption>
                <NativeSelectOption value="staging">staging</NativeSelectOption>
                <NativeSelectOption value="prod">prod</NativeSelectOption>
              </NativeSelect>
            </Field>
          )}
        />
        <Controller
          name="type"
          control={form.control}
          render={({ field }) => (
            <Field className="w-32">
              <FieldLabel htmlFor="key-type">Type</FieldLabel>
              <NativeSelect {...field} id="key-type">
                <NativeSelectOption value="server">server</NativeSelectOption>
                <NativeSelectOption value="client">client</NativeSelectOption>
              </NativeSelect>
            </Field>
          )}
        />
        <Button type="submit" disabled={creating} aria-busy={creating}>
          {creating ? "Creating…" : "Create key"}
        </Button>
      </form>

      <ApiKeysTable
        keys={keys}
        rotating={rotating}
        revoking={revoking}
        onRotate={rotateKey}
        onRevoke={revokeKey}
      />

      <SecretKeyDialog secret={secret} onClose={closeSecret} />
    </div>
  );
};
