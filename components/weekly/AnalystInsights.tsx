'use client';

import type { ContentInsight } from '@/lib/weekly-types';
import { GlassCard } from '@/components/ui/GlassCard';

interface AnalystInsightsProps {
  insights: ContentInsight[];
}

function getSeverityStyles(severity: ContentInsight['severity']): {
  border: string;
  bg: string;
  iconBg: string;
} {
  switch (severity) {
    case 'positive':
      return {
        border: 'border-l-[#00FF88]',
        bg: 'bg-[#00FF88]/5',
        iconBg: 'bg-[#00FF88]/15',
      };
    case 'negative':
      return {
        border: 'border-l-[#FF3366]',
        bg: 'bg-[#FF3366]/5',
        iconBg: 'bg-[#FF3366]/15',
      };
    case 'neutral':
      return {
        border: 'border-l-[#FFB800]',
        bg: 'bg-[#FFB800]/5',
        iconBg: 'bg-[#FFB800]/15',
      };
    case 'info':
      return {
        border: 'border-l-[#00D4FF]',
        bg: 'bg-[#00D4FF]/5',
        iconBg: 'bg-[#00D4FF]/15',
      };
  }
}

export function AnalystInsights({ insights }: AnalystInsightsProps) {
  if (insights.length === 0) {
    return (
      <GlassCard className="p-5">
        <h3 className="text-sm font-semibold mb-4">Analyst Insights</h3>
        <p className="text-xs text-muted text-center py-6">
          Not enough data to generate insights for this week.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-semibold">Analyst Insights</h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-medium">
          Auto-generated
        </span>
      </div>
      <div className="space-y-3">
        {insights.map((insight, i) => {
          const styles = getSeverityStyles(insight.severity);
          return (
            <div
              key={`${insight.type}-${i}`}
              className={`rounded-lg border-l-[3px] ${styles.border} ${styles.bg} p-4 transition-all hover:translate-x-0.5`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-lg ${styles.iconBg} flex items-center justify-center text-base`}
                >
                  {insight.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-semibold mb-1">
                    {insight.title}
                  </h4>
                  <p className="text-xs text-foreground/70 leading-relaxed">
                    {insight.body}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] text-muted/60 mt-4 pt-3 border-t border-border/30 text-center">
        These insights are generated from templates based on your data trends.
        They are not AI predictions — verify with your content strategy team.
      </p>
    </GlassCard>
  );
}
