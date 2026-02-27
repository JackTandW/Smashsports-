export function LoadingState({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse space-y-4 ${className}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-[12px] bg-card/80 border border-border"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-64 rounded-[12px] bg-card/80 border border-border"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="h-80 rounded-[12px] bg-card/80 border border-border"
          />
        ))}
      </div>
    </div>
  );
}
