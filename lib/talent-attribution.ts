import { attributePostToShows } from './show-attribution';
import { getBrandHashtags } from './talent-config';
import type { TalentPost } from './talent-types';

/**
 * Attribute a talent post's content to shows.
 * Wraps the existing show attribution engine.
 */
export function attributeTalentPostToShows(content: string): string[] {
  return attributePostToShows(content);
}

/**
 * Check if post content contains any brand hashtags
 * (#smashsports, #smashoriginals, #smashtalent).
 */
export function isBrandPost(content: string): boolean {
  if (!content) return false;
  const lowerContent = content.toLowerCase();
  const brandTags = getBrandHashtags();

  for (const tag of brandTags) {
    const regex = new RegExp(`#${tag}(?:\\b|[\\s,;.!?]|$)`, 'i');
    if (regex.test(lowerContent)) {
      return true;
    }
  }

  return false;
}

/**
 * Group talent posts by talent ID.
 */
export function getTalentPostsByTalent(
  posts: TalentPost[]
): Map<string, TalentPost[]> {
  const result = new Map<string, TalentPost[]>();

  for (const post of posts) {
    const arr = result.get(post.talentId);
    if (arr) {
      arr.push(post);
    } else {
      result.set(post.talentId, [post]);
    }
  }

  return result;
}

/**
 * Enrich talent posts with show attribution.
 * Populates the `showIds` array based on content matching.
 */
export function enrichTalentPostsWithShows(posts: TalentPost[]): TalentPost[] {
  return posts.map((post) => ({
    ...post,
    showIds: attributeTalentPostToShows(post.content),
  }));
}
