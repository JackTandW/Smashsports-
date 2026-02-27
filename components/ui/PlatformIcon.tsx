'use client';

import { SiYoutube, SiInstagram, SiTiktok, SiFacebook } from 'react-icons/si';
import { RiTwitterXFill } from 'react-icons/ri';
import type { PlatformId } from '@/lib/types';
import { getPlatformColor } from '@/lib/utils';

interface PlatformIconProps {
  platform: PlatformId;
  size?: number;
  className?: string;
}

export function PlatformIcon({ platform, size = 20, className = '' }: PlatformIconProps) {
  const color = getPlatformColor(platform);
  const props = { size, color, className };

  switch (platform) {
    case 'youtube':
      return <SiYoutube {...props} />;
    case 'instagram':
      return <SiInstagram {...props} />;
    case 'tiktok':
      return <SiTiktok {...props} />;
    case 'x':
      return <RiTwitterXFill {...props} />;
    case 'facebook':
      return <SiFacebook {...props} />;
  }
}
