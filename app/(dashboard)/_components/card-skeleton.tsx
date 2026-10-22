import { FC } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type CardSkeletonProps = {
  withContent?: boolean; // adds a line below the title, like the organization card
};

export const CardSkeleton: FC<CardSkeletonProps> = ({ withContent }) => (
  <Card aria-hidden="true">
    <CardHeader>
      <Skeleton className="h-5 w-40" />
    </CardHeader>
    {withContent && (
      <CardContent>
        <Skeleton className="h-4 w-56" />
      </CardContent>
    )}
  </Card>
);
