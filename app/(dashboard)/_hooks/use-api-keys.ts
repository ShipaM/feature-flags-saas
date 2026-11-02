"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";
import {
  apiKeyFormSchema,
  type ApiKeyFormValues,
} from "@/shared/schemas/api-key-form";

type Secret = { name: string; key: string };

export const useApiKeys = (projectId: number) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [secret, setSecret] = useState<Secret | null>(null);

  const keys = useQuery(trpc.apiKeys.list.queryOptions({ projectId }));

  const refresh = () =>
    queryClient.invalidateQueries(trpc.apiKeys.list.pathFilter());
  const fail = (e: { message: string }) => toast.error(e.message);

  // create and rotate both hand back the plaintext key ONE time
  const showSecret = {
    onSuccess: (d: Secret) => {
      setSecret({ name: d.name, key: d.key });
      return refresh();
    },
    onError: fail,
  };
  const create = useMutation(trpc.apiKeys.create.mutationOptions(showSecret));
  const rotate = useMutation(trpc.apiKeys.rotate.mutationOptions(showSecret));
  const revoke = useMutation(
    trpc.apiKeys.revoke.mutationOptions({
      onSuccess: (d) => {
        toast.success(`Key "${d.name}" revoked`);
        return refresh();
      },
      onError: fail,
    }),
  );

  const closeSecret = () => {
    setSecret(null);
    create.reset(); // wipe the secret from TanStack Query's memory too
    rotate.reset();
  };

  const form = useForm<ApiKeyFormValues>({
    resolver: zodResolver(apiKeyFormSchema),
    defaultValues: { name: "", environment: "dev", type: "server" },
  });

  const onSubmit = form.handleSubmit(async (v) => {
    try {
      await create.mutateAsync({ projectId, ...v });
      form.reset();
    } catch {
      // error toast already comes from onError
    }
  });

  return {
    keys: keys.data,
    form,
    onSubmit,
    creating: create.isPending,
    rotating: rotate.isPending,
    revoking: revoke.isPending,
    rotateKey: (id: number) => rotate.mutate({ id }),
    revokeKey: (id: number) => revoke.mutate({ id }),
    secret,
    closeSecret,
  };
};
