'use client';

import React from 'react';
import { GlassCard } from './GlassCard';

interface ChartErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * M-06: Error boundary wrapper for Recharts components.
 * Prevents a single chart crash from taking down the entire dashboard.
 */
export class ChartErrorBoundary extends React.Component<
  ChartErrorBoundaryProps,
  ChartErrorBoundaryState
> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ChartErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ChartErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <GlassCard className="p-5">
          {this.props.fallbackTitle && (
            <h3 className="text-sm font-semibold mb-4">{this.props.fallbackTitle}</h3>
          )}
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <span className="text-sm text-muted">Chart failed to render</span>
            <span className="text-xs text-muted/60 max-w-[300px] text-center truncate">
              {this.state.error?.message}
            </span>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="mt-2 text-xs text-accent underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        </GlassCard>
      );
    }

    return this.props.children;
  }
}
