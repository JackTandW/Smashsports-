'use client';

interface DataFreshnessIndicatorProps {
  lastUpdated: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function DataFreshnessIndicator({
  onRefresh,
  isRefreshing,
}: DataFreshnessIndicatorProps) {

  return (
    <div className="flex items-center gap-3 text-sm">
      <button
        onClick={onRefresh}
        disabled={isRefreshing}
        className="px-3 py-1 rounded-md text-xs font-medium bg-accent/10 text-accent border border-accent/20 hover:bg-accent/20 transition-colors disabled:opacity-50"
      >
        {isRefreshing ? 'Refreshing...' : 'Refresh'}
      </button>
    </div>
  );
}
