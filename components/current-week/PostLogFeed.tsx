'use client';

import { GlassCard } from '@/components/ui/GlassCard';
import { PlatformIcon } from '@/components/ui/PlatformIcon';
import { formatCompact, timeAgo } from '@/lib/utils';
import type { LivePostEntry, VelocityStatus } from '@/lib/current-week-types';

interface PostLogFeedProps {
  posts: LivePostEntry[];
}

const VELOCITY_CONFIG: Record<VelocityStatus, { label: string; color: string; bg: string }> = {
  outperforming: { label: 'Hot', color: 'text-positive', bg: 'bg-positive/10' },
  normal: { label: 'Normal', color: 'text-muted', bg: 'bg-muted/10' },
  underperforming: { label: 'Slow', color: 'text-amber', bg: 'bg-amber/10' },
};

export function PostLogFeed({ posts }: PostLogFeedProps) {
  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold">Post Feed</h3>
        <span className="text-xs text-muted">{posts.length} posts this week</span>
      </div>

      <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
        {posts.length === 0 ? (
          <div className="text-center py-8 text-muted text-sm">
            No posts published this week yet.
          </div>
        ) : (
          posts.map((post) => (
            <PostRow key={post.id} post={post} />
          ))
        )}
      </div>
    </GlassCard>
  );
}

function PostRow({ post }: { post: LivePostEntry }) {
  const velocity = VELOCITY_CONFIG[post.velocity];

  return (
    <a
      href={post.permalink}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-start gap-3 p-3 rounded-lg bg-background/30 hover:bg-background/50 transition-colors group"
    >
      {/* Platform icon */}
      <div className="flex-shrink-0 mt-0.5">
        <PlatformIcon platform={post.platform} size={18} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] text-muted">{timeAgo(post.createdAt)}</span>
          <span
            className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${velocity.color} ${velocity.bg}`}
          >
            {velocity.label}
            {post.velocity === 'outperforming' && ` ${post.velocityMultiplier}x`}
          </span>
        </div>
        <p className="text-xs text-foreground/80 line-clamp-2 group-hover:text-foreground transition-colors">
          {post.content || '(No text content)'}
        </p>
      </div>

      {/* Metrics */}
      <div className="flex-shrink-0 text-right">
        <div className="font-data text-xs">{formatCompact(post.engagements)}</div>
        <div className="text-[10px] text-muted">eng.</div>
      </div>
    </a>
  );
}
