"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Environment } from "@/shared/types";
import { FC } from "react";

type EnvTabsProps = {
  value: Environment;
  envs: readonly Environment[];
  onChange: (env: Environment) => void;
};

export const EnvTabs: FC<EnvTabsProps> = ({ value, envs, onChange }) => (
  <Tabs value={value} onValueChange={(v) => onChange(v as Environment)}>
    <TabsList>
      {envs.map((env) => (
        <TabsTrigger key={env} value={env}>
          {env}
        </TabsTrigger>
      ))}
    </TabsList>
  </Tabs>
);
