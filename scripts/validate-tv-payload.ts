/**
 * Validate that tv_audience_data.json produces a valid dashboard payload.
 * Used by CI to catch data issues before committing.
 *
 * Exit 0 = valid, Exit 1 = invalid
 */

import fs from 'fs';
import path from 'path';
import type { TVAudienceData } from '../lib/tv-audience-types';
import { buildTVAudiencePayload } from '../lib/tv-audience-data-processing';

const jsonPath = path.join(process.cwd(), 'data', 'tv_audience_data.json');

if (!fs.existsSync(jsonPath)) {
  console.error('❌ data/tv_audience_data.json not found');
  process.exit(1);
}

try {
  const raw: TVAudienceData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
  const payload = buildTVAudiencePayload(raw);

  // Assert minimums
  const checks = [
    { name: 'Hero cards', val: payload.heroCards.length, min: 1 },
    { name: 'Episode chart', val: payload.episodeChart.length, min: 1 },
    { name: 'Weekly perf', val: payload.weeklyPerformance.length, min: 1 },
    { name: 'Channel donut', val: payload.channelDonut.length, min: 1 },
    { name: 'Tier donut', val: payload.tierDonut.length, min: 1 },
    { name: 'P/R metrics', val: payload.premierRepeat.metrics.length, min: 1 },
  ];

  let pass = true;
  console.log('');
  for (const c of checks) {
    const ok = c.val >= c.min;
    if (!ok) pass = false;
    console.log(`  ${ok ? '✅' : '❌'} ${c.name.padEnd(20)} ${c.val}`);
  }
  console.log('');

  if (!pass) {
    console.error('❌ Validation failed — one or more sections are empty');
    process.exit(1);
  }

  console.log('✅ All dashboard transforms validated successfully');
  process.exit(0);
} catch (err) {
  console.error('❌ Payload build failed:', err);
  process.exit(1);
}
