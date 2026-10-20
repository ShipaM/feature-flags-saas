"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useTRPC } from "@/lib/trpc/client";

export const useFlagMutations = () => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const refresh = () =>
    queryClient.invalidateQueries(trpc.flag.list.pathFilter());

  const feedback = (message: string) => ({
    onSuccess: () => {
      toast.success(message);
      return refresh();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const setEnabled = useMutation(
    trpc.flag.update.mutationOptions(feedback("Flag updated")),
  );

  const setRollout = useMutation(
    trpc.flag.update.mutationOptions(feedback("Flag updated")),
  );

  const remove = useMutation(
    trpc.flag.delete.mutationOptions(feedback("Flag deleted")),
  );

  return { setEnabled, setRollout, remove };
};
