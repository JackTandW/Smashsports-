import talentConfigData from '@/config/talent.json';
import type { TalentConfig, TalentConfigFile } from './talent-types';
import type { PlatformId } from './types';
import { getInitials } from './utils';

const talentConfig = talentConfigData as unknown as TalentConfigFile;

/**
 * Get all talent configurations.
 */
export function getTalentConfigs(): TalentConfig[] {
  return talentConfig.talent;
}

/**
 * Get a single talent config by ID.
 */
export function getTalentConfig(talentId: string): TalentConfig | undefined {
  return talentConfig.talent.find((t) => t.id === talentId);
}

/**
 * Get brand hashtags (e.g. #smashsports, #smashnews, #smash).
 */
export function getBrandHashtags(): string[] {
  return talentConfig.brandHashtags;
}

/**
 * Get initials from a full name (delegates to shared utility).
 * Kept for backward compat — client components should import getInitials from utils.
 */
export function getTalentInitials(name: string): string {
  return getInitials(name);
}

/**
 * Get the active platform IDs for a talent member (non-null accounts).
 */
export function getTalentPlatformIds(talent: TalentConfig): PlatformId[] {
  return Object.entries(talent.accounts)
    .filter(([, url]) => url !== null)
    .map(([platformId]) => platformId as PlatformId);
}

/**
 * Extract a handle from a full account URL.
 * e.g. "https://www.instagram.com/skytshabalala/" → "@skytshabalala"
 */
export function getHandleFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const pathParts = u.pathname.split('/').filter(Boolean);
    const last = pathParts[pathParts.length - 1] ?? '';
    // Remove leading @ if present, then add it back
    return '@' + last.replace(/^@/, '');
  } catch {
    return null;
  }
}
