/**
 * Seed script: Generate demo talent posts for the Talent Tracking dashboard.
 *
 * Generates ~12 weeks of data for all 15 talent members.
 * Each talent posts 1-4 times per week on their active platforms.
 * Content includes show-relevant hashtags + brand hashtags.
 *
 * Run: npx tsx scripts/seed-talent.ts
 */

import { config } from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load .env.local (Next.js convention)
config({ path: path.join(process.cwd(), '.env.local') });

import { neon } from '@neondatabase/serverless';

// --- Load config directly (no alias resolution in scripts) ---
const talentConfigPath = path.join(process.cwd(), 'config', 'talent.json');
const showsConfigPath = path.join(process.cwd(), 'config', 'shows.json');
const emvRatesPath = path.join(process.cwd(), 'config', 'emv-rates.json');

interface TalentEntry {
  id: string;
  name: string;
  role: string;
  colour: string;
  accounts: Record<string, string | null>;
}

interface ShowEntry {
  id: string;
  name: string;
  hashtags: string[];
  keywords: string[];
  color: string;
  logoPath: string;
}

const talentConfig = JSON.parse(fs.readFileSync(talentConfigPath, 'utf-8'));
const showsConfig = JSON.parse(fs.readFileSync(showsConfigPath, 'utf-8'));
const emvRates = JSON.parse(fs.readFileSync(emvRatesPath, 'utf-8'));

const talent: TalentEntry[] = talentConfig.talent;
const shows: ShowEntry[] = showsConfig.shows;
const brandHashtags: string[] = talentConfig.brandHashtags;

// --- DB setup ---
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set. Add it to .env.local');
  process.exit(1);
}
const sql = neon(url);

// --- Helpers ---

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function uuid(): string {
  return 'tp-' + Math.random().toString(36).substring(2, 10) + '-' + Date.now().toString(36);
}

function getShowById(showId: string): ShowEntry | undefined {
  return shows.find((s) => s.id === showId);
}

function getActivePlatforms(t: TalentEntry): string[] {
  return Object.entries(t.accounts)
    .filter(([, url]) => url !== null)
    .map(([platformId]) => platformId);
}

function getHandle(url: string | null): string {
  if (!url) return 'unknown';
  try {
    const u = new URL(url);
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? 'unknown';
  } catch {
    return 'unknown';
  }
}

function calculateEMV(platform: string, engagements: {
  views?: number;
  impressions?: number;
  likes?: number;
  comments?: number;
  shares?: number;
  saves?: number;
  clicks?: number;
}): number {
  const rates = (emvRates.rates as Record<string, Record<string, number>>)[platform] ?? {};
  let total = 0;

  const mapping: [string, string][] = [
    ['views', 'view'],
    ['impressions', 'impression'],
    ['likes', 'like'],
    ['comments', 'comment'],
    ['shares', 'share'],
    ['saves', 'save'],
    ['clicks', 'click'],
  ];

  for (const [countKey, rateKey] of mapping) {
    const count = (engagements as Record<string, number | undefined>)[countKey] ?? 0;
    const rate = rates[rateKey] ?? 0;
    total += count * rate;
  }

  return Math.round(total * 100) / 100;
}

// --- Engagement ranges per platform ---
const engagementRanges: Record<string, { impressions: [number, number]; reactions: [number, number]; comments: [number, number]; shares: [number, number]; saves: [number, number]; videoViews: [number, number] }> = {
  instagram: { impressions: [2000, 25000], reactions: [200, 3000], comments: [10, 150], shares: [5, 80], saves: [10, 200], videoViews: [500, 10000] },
  tiktok:    { impressions: [5000, 50000], reactions: [300, 5000], comments: [20, 300], shares: [10, 200], saves: [5, 100], videoViews: [2000, 40000] },
  x:         { impressions: [1000, 15000], reactions: [50, 800],   comments: [5, 100],  shares: [10, 150], saves: [0, 10],  videoViews: [0, 5000] },
  youtube:   { impressions: [3000, 30000], reactions: [100, 2000], comments: [10, 200], shares: [5, 50],  saves: [5, 80],  videoViews: [1000, 30000] },
  facebook:  { impressions: [1000, 10000], reactions: [50, 500],   comments: [5, 80],   shares: [5, 100], saves: [0, 20],  videoViews: [200, 5000] },
};

// --- Content templates ---
const contentTemplates = [
  'Great discussion on {show} today! {hashtags} {brand}',
  'Behind the scenes of {show} coming your way! {hashtags} {brand}',
  '{show} just keeps getting better. Tune in! {hashtags} {brand}',
  'What a week on {show}! The fans are amazing {hashtags} {brand}',
  'Catch the latest episode of {show} {hashtags} {brand}',
  'Excited to be part of {show} this week {hashtags} {brand}',
  'New content dropping soon! {show} {hashtags} {brand}',
  'The energy on set at {show} was incredible today {hashtags} {brand}',
  'Thanks for all the support on {show}! {hashtags} {brand}',
  'Who watched {show} this week? Let me know your thoughts! {hashtags} {brand}',
  'Preparation time for {show}. Big show coming up! {hashtags} {brand}',
  'Just wrapped filming for {show}. Stay tuned! {hashtags} {brand}',
];

const genericTemplates = [
  'Great day at the office! Loving life in sports media.',
  'Weekend vibes. Time to recharge before a big week ahead.',
  'Grateful for all the amazing fans out there! You make this worthwhile.',
  'Just finished an awesome gym session. Feeling good!',
  'Throwback to one of my favourite moments on screen.',
  'Exciting things coming soon... watch this space!',
  'What a beautiful day in Joburg! Perfect weather today.',
  'Spent the afternoon catching up with friends. Good times!',
];

function generateContent(showId: string, forceGeneric: boolean = false): string {
  if (forceGeneric) {
    return pick(genericTemplates);
  }

  const show = getShowById(showId);
  if (!show) return '#smashsports';

  const template = pick(contentTemplates);
  const showHashtag = '#' + pick(show.hashtags);
  const brandTag = '#' + pick(brandHashtags);

  return template
    .replace('{show}', show.name)
    .replace('{hashtags}', showHashtag)
    .replace('{brand}', brandTag);
}

// --- Generate data ---

async function main() {
  console.log('Seeding talent posts...');

  // Clear existing talent posts
  await sql`DELETE FROM talent_posts`;

  const now = new Date();
  const WEEKS = 12;
  const allPosts: Array<{
    id: string; talentId: string; platform: string; createdAt: string;
    content: string; permalink: string; impressions: number; engagements: number;
    videoViews: number; reactions: number; comments: number; shares: number;
    saves: number; emv: number;
  }> = [];

  for (const t of talent) {
    const platforms = getActivePlatforms(t);
    if (platforms.length === 0) continue;

    for (let week = 0; week < WEEKS; week++) {
      const postsThisWeek = rand(1, 4);

      for (let p = 0; p < postsThisWeek; p++) {
        const platform = pick(platforms);
        const ranges = engagementRanges[platform] ?? engagementRanges.instagram;

        const dayOffset = week * 7 + rand(0, 6);
        const postDate = new Date(now);
        postDate.setDate(postDate.getDate() - dayOffset);
        const hour = rand(8, 22);
        const minute = rand(0, 59);
        postDate.setHours(hour, minute, 0, 0);

        const showId = pick(shows).id;
        const isGeneric = Math.random() < 0.12;
        const content = generateContent(showId, isGeneric);

        const impressions = rand(ranges.impressions[0], ranges.impressions[1]);
        const reactions = rand(ranges.reactions[0], ranges.reactions[1]);
        const comments = rand(ranges.comments[0], ranges.comments[1]);
        const shares = rand(ranges.shares[0], ranges.shares[1]);
        const saves = rand(ranges.saves[0], ranges.saves[1]);
        const videoViews = rand(ranges.videoViews[0], ranges.videoViews[1]);
        const engagements = reactions + comments + shares + saves;

        const emv = calculateEMV(platform, {
          views: videoViews,
          impressions,
          likes: reactions,
          comments,
          shares,
          saves,
        });

        const handle = getHandle(t.accounts[platform]);
        const permalink = `https://${platform}.com/${handle}/post/${uuid()}`;

        allPosts.push({
          id: uuid(),
          talentId: t.id,
          platform,
          createdAt: postDate.toISOString(),
          content,
          permalink,
          impressions,
          engagements,
          videoViews,
          reactions,
          comments,
          shares,
          saves,
          emv,
        });
      }
    }
  }

  // Insert in batches of 50 to avoid hitting Neon HTTP limits
  const BATCH_SIZE = 50;
  let inserted = 0;

  for (let i = 0; i < allPosts.length; i += BATCH_SIZE) {
    const batch = allPosts.slice(i, i + BATCH_SIZE);
    for (const p of batch) {
      await sql`
        INSERT INTO talent_posts (id, talent_id, platform, created_at, content, permalink,
          impressions, engagements, video_views, reactions, comments, shares, saves, emv)
        VALUES (${p.id}, ${p.talentId}, ${p.platform}, ${p.createdAt}, ${p.content},
          ${p.permalink}, ${p.impressions}, ${p.engagements}, ${p.videoViews}, ${p.reactions},
          ${p.comments}, ${p.shares}, ${p.saves}, ${p.emv})
      `;
    }
    inserted += batch.length;
    process.stdout.write(`\r  Inserted ${inserted}/${allPosts.length} posts...`);
  }

  console.log(`\nSeeded ${allPosts.length} talent posts for ${talent.length} talent members over ${WEEKS} weeks.`);

  // Summary per talent
  const talentSummary = new Map<string, number>();
  for (const p of allPosts) {
    talentSummary.set(p.talentId, (talentSummary.get(p.talentId) ?? 0) + 1);
  }
  for (const [id, count] of talentSummary.entries()) {
    const name = talent.find((t) => t.id === id)?.name ?? id;
    console.log(`   ${name}: ${count} posts`);
  }

  console.log('Done.');
}

main().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
