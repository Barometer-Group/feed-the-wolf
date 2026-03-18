import { Skeleton } from "@/components/ui/skeleton";

export default function ProgressLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-8 pb-8">
      <div className="space-y-4">
        <Skeleton className="h-8 w-32" />
        <div className="flex flex-wrap gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-11 w-14 rounded-md" />
          ))}
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-md" />
      <Skeleton className="h-[200px] w-full rounded-lg" />
      <Skeleton className="h-[200px] w-full rounded-lg" />
      <Skeleton className="h-[200px] w-full rounded-lg" />
      <Skeleton className="h-32 w-full rounded-lg" />
    </div>
  );
}
