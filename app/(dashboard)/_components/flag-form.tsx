"use client";
import type { FC } from "react";
import { Controller } from "react-hook-form";
import type { Environment } from "@/shared/types";
import { EditableFlag } from "../_types";
import { useFlagForm } from "../_hooks";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type FlagFormProps = {
  projectId: number;
  environment: Environment;
  flag?: EditableFlag;
  onDone: () => void;
};

export const FlagForm: FC<FlagFormProps> = (props) => {
  const { form, onSubmit, isEdit } = useFlagForm(props);

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <FieldGroup>
        <Controller
          name="key"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="flag-key">Key</FieldLabel>
              <Input
                {...field}
                id="flag-key"
                disabled={isEdit} // key is immutable in edit mode
                aria-invalid={fieldState.invalid}
                placeholder="new-checkout"
                autoComplete="off"
              />
              <FieldDescription>
                Lowercase letters, digits and hyphens.
              </FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name="description"
          control={form.control}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="flag-description">Description</FieldLabel>
              <Textarea
                {...field}
                id="flag-description"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        {!isEdit && (
          <Controller
            name="environment"
            control={form.control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="flag-env">Environment</FieldLabel>
                <NativeSelect {...field} id="flag-env">
                  <NativeSelectOption value="dev">dev</NativeSelectOption>
                  <NativeSelectOption value="staging">
                    staging
                  </NativeSelectOption>
                  <NativeSelectOption value="prod">prod</NativeSelectOption>
                </NativeSelect>
              </Field>
            )}
          />
        )}
        <Controller
          name="rollout"
          control={form.control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Rollout: {field.value}%</FieldLabel>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[field.value]}
                onValueChange={([n]) => field.onChange(n)}
              />
            </Field>
          )}
        />
        <Controller
          name="enabled"
          control={form.control}
          render={({ field }) => (
            <Field orientation="horizontal">
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                id="flag-enabled"
              />
              <FieldLabel htmlFor="flag-enabled">Enabled</FieldLabel>
            </Field>
          )}
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {isEdit ? "Save" : "Create"}
        </Button>
      </DialogFooter>
    </form>
  );
};
