'use client';

import { useEffect, useRef, useState } from 'react';
import { formatCompact, formatCurrency, formatPercentage, formatExact, formatExactCurrency } from '@/lib/utils';

interface AnimatedNumberProps {
  value: number;
  format: 'number' | 'currency' | 'percentage';
  duration?: number;
  className?: string;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function AnimatedNumber({
  value,
  format,
  duration = 1500,
  className = '',
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const [isComplete, setIsComplete] = useState(true);
  const frameRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const previousValueRef = useRef<number>(value);

  useEffect(() => {
    const fromValue = previousValueRef.current;
    previousValueRef.current = value;

    // Skip animation if value hasn't changed
    if (fromValue === value) return;

    setIsComplete(false);
    startTimeRef.current = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);
      const current = fromValue + easedProgress * (value - fromValue);

      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        setIsComplete(true);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  const formatFn = () => {
    const v = isComplete ? value : displayValue;
    switch (format) {
      case 'currency':
        return formatCurrency(v);
      case 'percentage':
        return formatPercentage(v);
      default:
        return formatCompact(v);
    }
  };

  const exactValue = () => {
    switch (format) {
      case 'currency':
        return formatExactCurrency(value);
      case 'percentage':
        return formatPercentage(value);
      default:
        return formatExact(value);
    }
  };

  return (
    <span
      className={`font-data tabular-nums ${className}`}
      title={exactValue()}
    >
      {formatFn()}
    </span>
  );
}
