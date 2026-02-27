'use client';

/**
 * L-07: Skeleton loading placeholders for dashboard sections.
 */

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse rounded bg-white/[0.06] ${className}`}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="glass rounded-xl p-5 space-y-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function SkeletonChart({ height = 'h-[260px]' }: { height?: string }) {
  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <Skeleton className="h-4 w-32" />
      <Skeleton className={`w-full ${height}`} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="glass rounded-xl p-5 space-y-3">
      <Skeleton className="h-4 w-40" />
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-full" />
        ))}
      </div>
    </div>
  );
}
