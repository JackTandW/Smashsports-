'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import type { TalentAlert } from '@/lib/talent-types';

interface TalentAlertsProps {
  data: TalentAlert[];
}

const ALERT_CONFIG: Record<string, { icon: string; borderColor: string; bgColor: string }> = {
  inactive: { icon: '\u26A0\uFE0F', borderColor: 'border-amber/30', bgColor: 'bg-amber/5' },
  declining: { icon: '\uD83D\uDCC9', borderColor: 'border-negative/30', bgColor: 'bg-negative/5' },
  rising_star: { icon: '\u2B50', borderColor: 'border-positive/30', bgColor: 'bg-positive/5' },
  no_hashtag: { icon: '\uD83C\uDFF7\uFE0F', borderColor: 'border-border/50', bgColor: 'bg-white/[0.02]' },
};

export function TalentAlerts({ data }: TalentAlertsProps) {
  if (data.length === 0) return null;

  // Group by type
  const grouped = new Map<string, TalentAlert[]>();
  for (const alert of data) {
    const arr = grouped.get(alert.type) ?? [];
    arr.push(alert);
    grouped.set(alert.type, arr);
  }

  const typeOrder = ['rising_star', 'inactive', 'declining', 'no_hashtag'];

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold mb-4">
        Alerts & Flags
        <span className="text-xs text-muted font-normal ml-2">
          ({data.length} alert{data.length !== 1 ? 's' : ''})
        </span>
      </h3>

      <div className="space-y-2">
        {typeOrder.map((type) => {
          const alerts = grouped.get(type);
          if (!alerts || alerts.length === 0) return null;
          const config = ALERT_CONFIG[type] ?? ALERT_CONFIG.no_hashtag;

          return alerts.map((alert) => (
            <div
              key={`${alert.type}-${alert.talentId}`}
              className={`flex items-start gap-3 p-3 rounded-lg border ${config.borderColor} ${config.bgColor}`}
            >
              <span className="text-sm flex-shrink-0">{config.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground">{alert.message}</p>
              </div>
            </div>
          ));
        })}
      </div>
    </GlassCard>
  );
}
