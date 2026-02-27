'use client';

import type { DateRangePreset } from '@/lib/show-types';

interface DateRangeSelectorProps {
  value: DateRangePreset;
  onChange: (preset: DateRangePreset) => void;
}

const PRESETS: { key: DateRangePreset; label: string }[] = [
  { key: '1w', label: '1W' },
  { key: '4w', label: '4W' },
  { key: '12w', label: '12W' },
  { key: 'ytd', label: 'YTD' },
  { key: 'all', label: 'All' },
];

export function DateRangeSelector({ value, onChange }: DateRangeSelectorProps) {
  return (
    <div className="flex gap-1 bg-background/50 rounded-lg p-0.5">
      {PRESETS.map((preset) => (
        <button
          key={preset.key}
          onClick={() => onChange(preset.key)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            value === preset.key
              ? 'bg-accent/20 text-accent'
              : 'text-muted hover:text-foreground'
          }`}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
}
