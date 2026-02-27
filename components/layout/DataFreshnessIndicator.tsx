'use client';

import { useEffect, useState } from 'react';
import { timeAgo } from '@/lib/utils';

interface DataFreshnessIndicatorProps {
  lastUpdated: string | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function DataFreshnessIndicator({
  lastUpdated,
  onRefresh,
  isRefreshing,
}: DataFreshnessIndicatorProps) {
  const [, setTick] = useState(0);

  // Update display every minute
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  let freshnessLevel: 'fresh' | 'amber' | 'red' = 'red';
  let dotColor = 'bg-negative';

  if (lastUpdated) {
    const hours =
      (Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60);
    if (hours < 26) {
      freshnessLevel = 'fresh';
      dotColor = 'bg-positive';
    } else if (hours < 48) {
      freshnessLevel = 'amber';
      dotColor = 'bg-amber';
    }
  }

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-2">
        <span
          className={`w-2 h-2 rounded-full ${dotColor} ${
            freshnessLevel === 'red' ? 'animate-pulse-glow' : ''
          }`}
        />
        <span className="text-muted">
          {lastUpdated ? `Updated ${timeAgo(lastUpdated)}` : 'No data yet'}
        </span>
      </div>
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
