"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { TRPCClientError } from "@trpc/client";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";
import {
  flagFormSchema,
  type FlagFormValues,
} from "@/shared/schemas/flag-form";
import type { Environment } from "@/shared/types";
import type { EditableFlag } from "../_types";

type UseFlagFormParams = {
  projectId: number;
  environment: Environment;
  flag?: EditableFlag;
  onDone: () => void;
};

export const useFlagForm = ({
  projectId,
  environment,
  flag,
  onDone,
}: UseFlagFormParams) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const create = useMutation(trpc.flag.create.mutationOptions());
  const update = useMutation(trpc.flag.update.mutationOptions());

  const form = useForm<FlagFormValues>({
    resolver: zodResolver(flagFormSchema),
    defaultValues: {
      key: flag?.key ?? "",
      description: flag?.description ?? "",
      environment: flag?.environment ?? environment,
      rollout: flag?.rollout ?? 0,
      enabled: flag?.enabled ?? false,
    },
  });

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      if (flag) {
        await update.mutateAsync({
          id: flag.id,
          description: v.description.trim() || null, // "" -> null clears the description
          enabled: v.enabled,
          rollout: v.rollout,
        });
      } else {
        await create.mutateAsync({
          projectId,
          key: v.key,
          environment: v.environment,
          description: v.description.trim() || undefined, // nothing to store
          enabled: v.enabled,
          rollout: v.rollout,
        });
      }

      await queryClient.invalidateQueries(trpc.flag.list.pathFilter());

      toast.success(
        flag ? `Flag "${flag.key}" updated` : `Flag "${v.key}" created`,
      );

      onDone();
    } catch (e) {
      if (e instanceof TRPCClientError && e.data?.code === "CONFLICT") {
        form.setError("key", {
          message: `"${v.key}" already exists in ${v.environment}`,
        });
        return;
      }
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    }
  });

  return { form, onSubmit, isEdit: !!flag };
};
