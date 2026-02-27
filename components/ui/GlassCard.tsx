'use client';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
  onClick?: () => void;
  style?: React.CSSProperties;
}

export function GlassCard({
  children,
  className = '',
  accentColor,
  onClick,
  style,
}: GlassCardProps) {
  return (
    <div
      className={`
        glass rounded-[12px] border border-border
        shadow-lg shadow-black/20
        transition-all duration-300
        hover:border-accent/30 hover:shadow-accent/5 hover:shadow-xl
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={{
        ...(accentColor
          ? { borderLeftWidth: '4px', borderLeftColor: accentColor }
          : {}),
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
