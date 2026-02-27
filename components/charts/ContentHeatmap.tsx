'use client';

import { useMemo, useState } from 'react';
import * as d3 from 'd3';
import type { HeatmapDay } from '@/lib/types';
import { GlassCard } from '@/components/ui/GlassCard';

interface ContentHeatmapProps {
  data: HeatmapDay[];
}

const CELL_SIZE = 13;
const CELL_GAP = 2;
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function ContentHeatmap({ data }: ContentHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    date: string;
    count: number;
  } | null>(null);

  const { colorScale, maxCount, weeks, monthLabels } = useMemo(() => {
    const maxCount = Math.max(...data.map((d) => d.count), 1);
    const colorScale = d3
      .scaleLinear<string>()
      .domain([0, maxCount])
      .range(['#1E1E2E', '#00D4FF']);

    // Group into weeks
    const weeks = new Map<number, HeatmapDay[]>();
    for (const day of data) {
      if (!weeks.has(day.weekIndex)) weeks.set(day.weekIndex, []);
      weeks.get(day.weekIndex)!.push(day);
    }

    // Month labels from the data
    const monthLabels: { label: string; weekIndex: number }[] = [];
    let lastMonth = -1;
    for (const day of data) {
      const month = new Date(day.date).getMonth();
      if (month !== lastMonth) {
        monthLabels.push({ label: MONTH_NAMES[month], weekIndex: day.weekIndex });
        lastMonth = month;
      }
    }

    return { colorScale, maxCount, weeks, monthLabels };
  }, [data]);

  const totalWeeks = Math.max(...data.map((d) => d.weekIndex)) + 1;
  const svgWidth = 30 + totalWeeks * (CELL_SIZE + CELL_GAP);
  const svgHeight = 20 + 7 * (CELL_SIZE + CELL_GAP);

  return (
    <GlassCard className="p-5">
      <h3 className="text-sm font-semibold mb-4">Content Volume</h3>
      <div className="overflow-x-auto relative">
        <svg width={svgWidth} height={svgHeight} role="img" aria-label="Content posting frequency heatmap">
          {/* Month labels */}
          {monthLabels.map((m, i) => (
            <text
              key={i}
              x={30 + m.weekIndex * (CELL_SIZE + CELL_GAP)}
              y={10}
              fill="#6B7280"
              fontSize={10}
            >
              {m.label}
            </text>
          ))}

          {/* Day labels */}
          {DAY_LABELS.map((label, i) => (
            <text
              key={i}
              x={0}
              y={20 + i * (CELL_SIZE + CELL_GAP) + CELL_SIZE * 0.8}
              fill="#6B7280"
              fontSize={9}
            >
              {label}
            </text>
          ))}

          {/* Cells */}
          {data.map((day) => (
            <rect
              key={day.date}
              x={30 + day.weekIndex * (CELL_SIZE + CELL_GAP)}
              y={18 + day.dayOfWeek * (CELL_SIZE + CELL_GAP)}
              width={CELL_SIZE}
              height={CELL_SIZE}
              rx={2}
              fill={colorScale(day.count)}
              className="transition-colors cursor-pointer"
              onMouseEnter={(e) => {
                const rect = (e.target as SVGRectElement).getBoundingClientRect();
                setTooltip({
                  x: rect.left + rect.width / 2,
                  y: rect.top - 8,
                  date: day.date,
                  count: day.count,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          ))}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 glass rounded-lg border border-border px-3 py-2 text-xs pointer-events-none -translate-x-1/2 -translate-y-full"
            style={{ left: tooltip.x, top: tooltip.y }}
          >
            <p className="text-foreground font-medium">
              {new Date(tooltip.date).toLocaleDateString('en-ZA', {
                weekday: 'short',
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </p>
            <p className="text-muted">
              {tooltip.count} {tooltip.count === 1 ? 'post' : 'posts'}
            </p>
          </div>
        )}

        {/* Color legend */}
        <div className="flex items-center gap-2 mt-3 text-xs text-muted">
          <span>Less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <span
              key={t}
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: colorScale(t * maxCount) }}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </GlassCard>
  );
}
