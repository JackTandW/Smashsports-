'use client';

import { useState, useEffect } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { timeAgo } from '@/lib/utils';
import type { LiveStatusData, DayStatus } from '@/lib/current-week-types';

interface LiveStatusHeaderProps {
  data: LiveStatusData;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatWeekRange(weekStart: string, weekEnd: string): string {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  return `${start.toLocaleDateString('en-ZA', opts)} – ${end.toLocaleDateString('en-ZA', { ...opts, year: 'numeric' })}`;
}

export function LiveStatusHeader({ data }: LiveStatusHeaderProps) {
  const [clock, setClock] = useState('');

  // SAST clock ticking every second
  useEffect(() => {
    function updateClock() {
      const now = new Date();
      setClock(
        now.toLocaleTimeString('en-ZA', {
          timeZone: 'Africa/Johannesburg',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    }
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <GlassCard className="p-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Week info */}
        <div className="flex items-center gap-4">
          {/* Live dot */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="w-2.5 h-2.5 rounded-full bg-positive animate-pulse-live" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-positive/40 animate-ping" />
            </div>
            <span className="text-xs font-semibold text-positive uppercase tracking-wider">Live</span>
          </div>

          <div>
            <h2 className="text-lg font-semibold">
              {formatWeekRange(data.weekStart, data.weekEnd)}
            </h2>
            <div className="flex items-center gap-3 text-xs text-muted mt-0.5">
              <span>Day {data.currentDay} of 7</span>
              <span className="text-border">|</span>
              <span>{Math.round(data.hoursIntoWeek)}h into week</span>
            </div>
          </div>
        </div>

        {/* Right: Clock + Last refreshed */}
        <div className="flex items-center gap-4">
          {/* SAST Clock */}
          <div className="text-right">
            <div className="font-data text-lg tabular-nums text-accent">{clock}</div>
            <div className="text-[10px] text-muted uppercase tracking-wider">SAST</div>
          </div>

          {/* Last refreshed */}
          {data.lastRefreshed && (
            <div className="text-right text-xs text-muted">
              <span>Updated </span>
              <span className="text-foreground">{timeAgo(data.lastRefreshed)}</span>
            </div>
          )}
        </div>
      </div>

      {/* 7-segment progress bar */}
      <div className="flex gap-1.5 mt-4">
        {data.dayStatuses.map((status, i) => (
          <DaySegment
            key={i}
            label={DAY_LABELS[i]}
            status={status}
            isCurrent={status === 'in_progress'}
          />
        ))}
      </div>
    </GlassCard>
  );
}

function DaySegment({
  label,
  status,
  isCurrent,
}: {
  label: string;
  status: DayStatus;
  isCurrent: boolean;
}) {
  let bgClass: string;
  let textClass: string;

  switch (status) {
    case 'completed':
      bgClass = 'bg-positive/30';
      textClass = 'text-positive';
      break;
    case 'in_progress':
      bgClass = 'bg-accent/30 border border-accent/50';
      textClass = 'text-accent';
      break;
    case 'upcoming':
      bgClass = 'bg-border/30';
      textClass = 'text-muted/60';
      break;
  }

  return (
    <div className="flex-1 flex flex-col items-center gap-1">
      <div
        className={`w-full h-2 rounded-full ${bgClass} transition-all duration-500 ${
          isCurrent ? 'animate-pulse-live' : ''
        }`}
      />
      <span className={`text-[10px] font-medium ${textClass}`}>{label}</span>
    </div>
  );
}
