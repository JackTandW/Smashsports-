'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { DataFreshnessIndicator } from './DataFreshnessIndicator';
import { useDashboardStore } from '@/store/dashboard-store';

const TABS = [
  { label: 'Lifetime', href: '/' },
  { label: 'Weekly Comparison', href: '/weekly' },
  { label: 'This Week', href: '/current-week' },
  { label: 'Shows', href: '/shows' },
  { label: 'Talent', href: '/talent' },
];

export function Navigation() {
  const pathname = usePathname();
  const { lastUpdated, isRefreshing, triggerRefresh } = useDashboardStore();

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border">
      <div className="max-w-[1440px] mx-auto px-4 lg:px-8 flex items-center justify-between h-16">
        {/* Logo */}
        <div className="flex-shrink-0">
          <Image
            src="/logos/smash-sports-landscape.png"
            alt="Smash Sports"
            width={140}
            height={40}
            className="object-contain"
            priority
          />
        </div>

        {/* Tabs */}
        <div className="hidden md:flex items-center gap-1">
          {TABS.map((tab) => {
            const isActive =
              tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-muted hover:text-foreground hover:bg-card'
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>

        {/* Freshness + Refresh */}
        <DataFreshnessIndicator
          lastUpdated={lastUpdated}
          onRefresh={triggerRefresh}
          isRefreshing={isRefreshing}
        />
      </div>
    </nav>
  );
}
