'use client';

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = 'Something went wrong loading the data.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="glass rounded-[12px] border border-negative/30 p-8 max-w-md text-center">
        <div className="text-4xl mb-4">&#x26A0;</div>
        <h3 className="text-lg font-semibold text-negative mb-2">
          Error Loading Data
        </h3>
        <p className="text-muted text-sm mb-4">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded-lg bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 transition-colors text-sm font-medium"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
