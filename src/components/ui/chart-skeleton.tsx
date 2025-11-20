import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";

export const ChartSkeleton = () => {
  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-5 w-24" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-[200px] w-full" />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="bg-muted/30 rounded-lg p-2 space-y-2">
            <Skeleton className="h-3 w-16 mx-auto" />
            <Skeleton className="h-4 w-12 mx-auto" />
          </div>
          <div className="bg-muted/30 rounded-lg p-2 space-y-2">
            <Skeleton className="h-3 w-16 mx-auto" />
            <Skeleton className="h-4 w-12 mx-auto" />
          </div>
          <div className="bg-muted/30 rounded-lg p-2 space-y-2">
            <Skeleton className="h-3 w-16 mx-auto" />
            <Skeleton className="h-4 w-12 mx-auto" />
          </div>
        </div>
      </div>
    </Card>
  );
};