import React, { useEffect, useRef, useState } from 'react';

import styles from './ReadingView.module.scss';

// shrinking further than this makes the text too small; the pages stack instead
const MIN_ZOOM = 0.75;

type Props = {
  children: React.ReactNode;
};

/**
 * Two pages side by side (added in the old-Quran.com clone). When the pair is a little too wide
 * for the window, e.g. with the surah list open, it shrinks to fit rather than stacking.
 *
 * @returns {JSX.Element}
 */
const Spread = ({ children }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const spread = ref.current;
    const container = spread?.parentElement;
    if (!container) return undefined;
    const fit = () => {
      const pages = Array.from(spread.children);
      if (!pages.length) return;
      setZoom((current) => {
        // measured sizes include the current zoom; work out the unzoomed width of two pages
        const pageWidth = Math.max(...pages.map((page) => page.getBoundingClientRect().width));
        const gap = parseFloat(getComputedStyle(spread).columnGap) || 0;
        const naturalWidth = (pageWidth / current) * 2 + gap;
        const fitZoom = Math.min(1, container.clientWidth / naturalWidth);
        const next = fitZoom >= MIN_ZOOM ? Math.floor(fitZoom * 100) / 100 : 1;
        return Math.abs(next - current) < 0.01 ? current : next;
      });
    };
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    Array.from(spread.children).forEach((page) => observer.observe(page));
    return () => observer.disconnect();
  }, [children]);

  return (
    <div ref={ref} className={styles.spread} style={zoom < 1 ? { zoom } : undefined}>
      {children}
    </div>
  );
};

export default Spread;
