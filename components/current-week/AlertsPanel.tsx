'use client';

import { useState } from 'react';
import { GlassCard } from '@/components/ui/GlassCard';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { timeAgo } from '@/lib/utils';
import type { TrackerAlert, AlertType, AlertSeverity } from '@/lib/current-week-types';

interface AlertsPanelProps {
  alerts: TrackerAlert[];
}

const ALERT_ICON: Record<AlertType, string> = {
  viral: '\uD83D\uDE80',
  posting_gap: '\u26A0\uFE0F',
  engagement_drop: '\uD83D\uDCC9',
  milestone: '\uD83C\uDFAF',
};

const SEVERITY_STYLES: Record<AlertSeverity, { border: string; bg: string; text: string }> = {
  positive: { border: 'border-l-positive', bg: 'bg-positive/5', text: 'text-positive' },
  negative: { border: 'border-l-negative', bg: 'bg-negative/5', text: 'text-negative' },
  neutral: { border: 'border-l-amber', bg: 'bg-amber/5', text: 'text-amber' },
  info: { border: 'border-l-accent', bg: 'bg-accent/5', text: 'text-accent' },
};

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <GlassCard className="p-5">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold">Alerts</h3>
          {alerts.length > 0 && (
            <span className="text-[10px] font-semibold bg-accent/10 text-accent px-2 py-0.5 rounded-full">
              {alerts.length}
            </span>
          )}
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className={`text-muted transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-3 space-y-2">
          {alerts.length === 0 ? (
            <div className="text-center py-6">
              <div className="text-2xl mb-2">{'\u2705'}</div>
              <p className="text-sm text-muted">No alerts this week</p>
              <p className="text-xs text-muted/60 mt-1">Everything is running smoothly</p>
            </div>
          ) : (
            alerts.map((alert) => (
              <AlertRow key={alert.id} alert={alert} />
            ))
          )}
        </div>
      )}
    </GlassCard>
  );
}

function AlertRow({ alert }: { alert: TrackerAlert }) {
  const severity = SEVERITY_STYLES[alert.severity];
  const icon = ALERT_ICON[alert.type];

  return (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg border-l-[3px] ${severity.border} ${severity.bg}`}
    >
      <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-semibold ${severity.text}`}>
            {alert.title}
          </span>
          {alert.platform && (
            <PlatformIcon platform={alert.platform} size={12} />
          )}
        </div>
        <p className="text-xs text-foreground/70">{alert.message}</p>
        <span className="text-[10px] text-muted mt-1 block">{timeAgo(alert.timestamp)}</span>
      </div>
    </div>
  );
}
