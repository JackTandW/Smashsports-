import { create } from 'zustand';
import type { PlatformId } from '@/lib/types';

interface DashboardStore {
  lastUpdated: string | null;
  isRefreshing: boolean;
  hoveredPlatform: PlatformId | null;

  setLastUpdated: (date: string | null) => void;
  setRefreshing: (state: boolean) => void;
  setHoveredPlatform: (platform: PlatformId | null) => void;
  triggerRefresh: () => Promise<void>;
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  lastUpdated: null,
  isRefreshing: false,
  hoveredPlatform: null,

  setLastUpdated: (date) => set({ lastUpdated: date }),
  setRefreshing: (state) => set({ isRefreshing: state }),
  setHoveredPlatform: (platform) => set({ hoveredPlatform: platform }),

  triggerRefresh: async () => {
    set({ isRefreshing: true });
    try {
      await fetch('/api/refresh', { method: 'POST' });
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      set({ isRefreshing: false });
    }
  },
}));
