/**
 * EMV (Earned Media Value) Calculator
 *
 * Methodology (L-05):
 * EMV estimates the equivalent advertising spend for organic social engagement.
 * Rates are in ZAR and sourced from `config/emv-rates.json`.
 *
 * Rate derivation:
 * - Rates are benchmarked against South African digital advertising CPM/CPE rates
 *   for Q1 2026, adjusted for platform-specific engagement quality.
 * - YouTube: R0.15/view reflects mid-market CPV for TrueView in-stream.
 * - Instagram: R0.05/impression aligns with SA Feed CPM (~R50).
 *   Saves (R2.00) valued higher than likes (R0.35) as intent signal.
 * - TikTok: R0.08/view reflects lower CPV but high volume.
 * - X: R0.03/impression reflects lower SA CPM (~R30).
 * - Facebook: R0.04/impression reflects declining organic reach.
 *
 * Calculation: EMV = SUM(metric_count * rate_per_action) across all engagement types.
 * Not all platforms expose all metrics (see C-01/C-02/C-03 caveats in refresh route).
 *
 * Rates should be reviewed quarterly. Last updated: see `lastUpdated` in emv-rates.json.
 */

import type { PlatformId, PostMetrics } from './types';
import emvRates from '@/config/emv-rates.json';

interface EngagementCounts {
  views?: number;
  impressions?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
  retweets?: number;
  replies?: number;
  subscribes?: number;
  storyViews?: number;
  reelViews?: number;
}

type RateKey = keyof typeof emvRates.rates;

function getRates(platform: PlatformId): Record<string, number> {
  return (emvRates.rates as Record<RateKey, Record<string, number>>)[platform] ?? {};
}

export function calculateEMV(
  platform: PlatformId,
  engagements: EngagementCounts
): number {
  const rates = getRates(platform);
  let total = 0;

  const mapping: [keyof EngagementCounts, string][] = [
    ['views', 'view'],
    ['impressions', 'impression'],
    ['likes', 'like'],
    ['comments', 'comment'],
    ['shares', 'share'],
    ['saves', 'save'],
    ['clicks', 'click'],
    ['retweets', 'retweet'],
    ['replies', 'reply'],
    ['subscribes', 'subscribe'],
    ['storyViews', 'storyView'],
    ['reelViews', 'reelView'],
  ];

  for (const [countKey, rateKey] of mapping) {
    const count = engagements[countKey] ?? 0;
    const rate = rates[rateKey] ?? 0;
    total += count * rate;
  }

  return total;
}

export function calculatePostEMV(post: PostMetrics): number {
  return calculateEMV(post.platform, {
    views: post.videoViews,
    impressions: post.impressions,
    likes: post.reactions,
    comments: post.comments,
    shares: post.shares,
    saves: post.saves,
    clicks: post.clicks,
  });
}

export function getEMVBreakdown(
  platform: PlatformId,
  engagements: EngagementCounts
): { views: number; likes: number; comments: number; shares: number; other: number } {
  const rates = getRates(platform);

  const viewsEmv =
    (engagements.views ?? 0) * (rates['view'] ?? 0) +
    (engagements.storyViews ?? 0) * (rates['storyView'] ?? 0) +
    (engagements.reelViews ?? 0) * (rates['reelView'] ?? 0);

  const impressionsEmv = (engagements.impressions ?? 0) * (rates['impression'] ?? 0);

  const likesEmv = (engagements.likes ?? 0) * (rates['like'] ?? 0);
  const commentsEmv = (engagements.comments ?? 0) * (rates['comment'] ?? 0);

  const sharesEmv =
    (engagements.shares ?? 0) * (rates['share'] ?? 0) +
    (engagements.retweets ?? 0) * (rates['retweet'] ?? 0);

  const otherEmv =
    (engagements.saves ?? 0) * (rates['save'] ?? 0) +
    (engagements.clicks ?? 0) * (rates['click'] ?? 0) +
    (engagements.replies ?? 0) * (rates['reply'] ?? 0) +
    (engagements.subscribes ?? 0) * (rates['subscribe'] ?? 0);

  return {
    views: viewsEmv + impressionsEmv,
    likes: likesEmv,
    comments: commentsEmv,
    shares: sharesEmv,
    other: otherEmv,
  };
}

export function getCurrencySymbol(): string {
  return emvRates.currencySymbol;
}
