import showsConfigData from '@/config/shows.json';
import type { ShowConfig, ShowsConfigFile } from './show-types';
import type { PostMetrics } from './types';

const showsConfig = showsConfigData as ShowsConfigFile;

/**
 * Get all show configurations.
 */
export function getShowConfigs(): ShowConfig[] {
  return showsConfig.shows;
}

/**
 * Get a single show config by ID.
 */
export function getShowConfig(showId: string): ShowConfig | undefined {
  return showsConfig.shows.find((s) => s.id === showId);
}

/**
 * Attribute a post's content to one or more shows.
 * Returns array of show IDs that match.
 *
 * Priority:
 * 1. Hashtag match (regex: #hashtag word boundary, case-insensitive)
 * 2. Keyword match (case-insensitive substring)
 *
 * A post can match multiple shows.
 */
export function attributePostToShows(content: string): string[] {
  if (!content) return [];

  const lowerContent = content.toLowerCase();
  const matchedShowIds: string[] = [];

  for (const show of showsConfig.shows) {
    let matched = false;

    // 1. Hashtag match (primary) — look for #hashtag pattern
    for (const tag of show.hashtags) {
      // Match #hashtag followed by word boundary, space, punctuation, or end of string
      const regex = new RegExp(`#${tag}(?:\\b|[\\s,;.!?]|$)`, 'i');
      if (regex.test(lowerContent)) {
        matched = true;
        break;
      }
    }

    // 2. Keyword match (fallback) — word-boundary-aware matching (M-02)
    // Uses \b word boundaries to prevent broad keywords (e.g. "big 3") from
    // matching inside longer unrelated phrases.
    if (!matched) {
      for (const keyword of show.keywords) {
        const escaped = keyword.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const kwRegex = new RegExp(`\\b${escaped}\\b`, 'i');
        if (kwRegex.test(lowerContent)) {
          matched = true;
          break;
        }
      }
    }

    if (matched) {
      matchedShowIds.push(show.id);
    }
  }

  return matchedShowIds;
}

/**
 * Attribute all posts to shows.
 * Returns a Map of showId → PostMetrics[].
 * Posts matching no show are excluded.
 * Posts matching multiple shows appear in multiple arrays.
 */
export function getAttributedPosts(
  posts: PostMetrics[]
): Map<string, PostMetrics[]> {
  const result = new Map<string, PostMetrics[]>();

  // Initialize empty arrays for each show
  for (const show of showsConfig.shows) {
    result.set(show.id, []);
  }

  for (const post of posts) {
    const showIds = attributePostToShows(post.content);
    for (const showId of showIds) {
      const arr = result.get(showId);
      if (arr) {
        arr.push(post);
      }
    }
  }

  return result;
}

/**
 * Count how many posts are attributed to at least one show.
 */
export function countAttributedPosts(posts: PostMetrics[]): {
  attributed: number;
  unattributed: number;
} {
  let attributed = 0;
  let unattributed = 0;

  for (const post of posts) {
    const showIds = attributePostToShows(post.content);
    if (showIds.length > 0) {
      attributed++;
    } else {
      unattributed++;
    }
  }

  return { attributed, unattributed };
}

/**
 * Extract all hashtags from post content.
 */
export function extractHashtags(content: string): string[] {
  if (!content) return [];
  const matches = content.match(/#\w+/g);
  return matches ? matches.map((h) => h.toLowerCase()) : [];
}
