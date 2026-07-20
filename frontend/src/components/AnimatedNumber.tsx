import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

type AnimatedNumberProps = {
  value: number;
  durationMs?: number;
  className?: string;
  style?: CSSProperties;
  formatter?: (value: number) => string;
};

export function AnimatedNumber({ value, durationMs = 900, className, style, formatter }: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const previousValue = useRef(value);

  useEffect(() => {
    const startValue = previousValue.current;
    const delta = value - startValue;

    if (delta === 0) {
      setDisplayValue(value);
      return;
    }

    let frameId = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      const nextValue = startValue + delta * eased;
      setDisplayValue(delta > 0 ? Math.floor(nextValue) : Math.ceil(nextValue));

      if (progress < 1) {
        frameId = window.requestAnimationFrame(tick);
      } else {
        setDisplayValue(value);
        previousValue.current = value;
      }
    };

    frameId = window.requestAnimationFrame(tick);
    previousValue.current = value;

    return () => window.cancelAnimationFrame(frameId);
  }, [value, durationMs]);

  return <span className={className} style={style}>{formatter ? formatter(displayValue) : displayValue.toLocaleString()}</span>;
}
