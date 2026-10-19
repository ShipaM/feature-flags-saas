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
  // Local value only while dragging/saving; otherwise show the server value,
  // so a failed update snaps the slider back
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
          // The error is shown by the mutation's toast (<Toaster /> in the root layout);
          // here we only need to drop the draft so the slider snaps back
          onCommit(v)
            .catch(() => {})
            .finally(() => setDraft(null));
        }}
      />
      <span className="w-10 text-right tabular-nums">{value}%</span>
    </div>
  );
};
