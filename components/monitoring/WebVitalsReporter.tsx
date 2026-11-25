'use client';

import { useEffect } from 'react';

export default function WebVitalsReporter() {
  useEffect(() => {
    let active = true;

    if (!('PerformanceObserver' in window)) {
      return;
    }

    const observers: PerformanceObserver[] = [];
    const report = (name: string, value: number, id: string) => {
      if (!active) return;
      window.dispatchEvent(
        new CustomEvent('vnc-web-vital', {
          detail: { name, value: Math.round(value), id },
        })
      );
    };

    for (const entryType of ['largest-contentful-paint', 'first-input', 'layout-shift', 'paint']) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entryType === 'paint' && entry.name === 'first-contentful-paint') {
              report('FCP', entry.startTime, entry.name);
            }
            if (entryType === 'largest-contentful-paint') {
              report('LCP', entry.startTime, entry.name);
            }
            if (entryType === 'layout-shift') {
              const shift = entry as PerformanceEntry & { value?: number, hadRecentInput?: boolean };
              if (!shift.hadRecentInput) report('CLS', shift.value ?? 0, entry.name);
            }
            if (entryType === 'first-input') {
              const input = entry as PerformanceEntry & { processingStart?: number };
              report('INP', (input.processingStart ?? entry.startTime) - entry.startTime, entry.name);
            }
          }
        });
        observer.observe({ type: entryType, buffered: true });
        observers.push(observer);
      } catch {
        // Unsupported entry types remain optional.
      }
    }

    return () => {
      active = false;
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  return null;
}
