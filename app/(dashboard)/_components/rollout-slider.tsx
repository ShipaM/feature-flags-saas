"use client";
import { Slider } from "@/components/ui/slider";
import { FC, useState } from "react";

type RolloutSliderProps = {
  rollout: number;
  disabled: boolean;
  // Resolves once the server value is refetched, rejects if the update failed
  onCommit: (value: number) => Promise<unknown>;
};

export const RolloutSlider: FC<RolloutSliderProps> = ({
  rollout,
  disabled,
  onCommit,
}) => {
  const [draft, setDraft] = useState<number | null>(null);
  const value = draft ?? rollout;

  return (
    <div className="flex w-48 items-center gap-3">
      <Slider
        min={0}
        max={100}
        step={1}
        value={[value]}
        disabled={disabled}
        onValueChange={([v]) => setDraft(v)}
        onValueCommit={([v]) => {
          onCommit(v)
            .catch(() => {})
            .finally(() => setDraft(null));
        }}
      />
      <span className="w-10 text-right tabular-nums">{value}%</span>
    </div>
  );
};
