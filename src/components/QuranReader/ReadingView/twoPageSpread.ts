import { RefObject, useCallback, useState } from 'react';

import useBrowserLayoutEffect from '@/hooks/useBrowserLayoutEffect';
import { MAXIMUM_QURAN_FONT_STEP, MINIMUM_FONT_STEP } from '@/redux/slices/QuranReader/styles';

/**
 * The largest text size at which the reading view's pages fit, while the reading view is open
 * (null otherwise). Cmd + stops there instead of storing sizes that wouldn't show.
 */
export const readerFontScaleCap: { current: number | null } = { current: null };

// Two-page view (added in the old-Quran.com clone): pages are shown in pairs like an open
// printed mushaf, where an odd page sits on the right and the even page after it on the left.

const STORAGE_KEY = 'two-page-spread';
// the desktop breakpoint, where the two-page button shows too (see _breakpoints.scss)
const WIDE_SCREEN_QUERY = '(min-width: 1024px)';

/**
 * Which pair of pages (counting from the resource's first page) a page belongs to.
 *
 * @param {number} pageIndex
 * @param {number} firstPageNumber
 * @returns {number}
 */
export const getSpreadIndex = (pageIndex: number, firstPageNumber: number): number =>
  Math.ceil((firstPageNumber + pageIndex) / 2) - Math.ceil(firstPageNumber / 2);

export const getSpreadsCount = (pagesCount: number, firstPageNumber: number): number =>
  pagesCount ? getSpreadIndex(pagesCount - 1, firstPageNumber) + 1 : 0;

/**
 * The page indices in a pair, right page first. Both facing pages are shown, like an open
 * mushaf, even when one of them is outside the current surah or juz (its index is then below
 * 0 or past the last page).
 *
 * @param {number} spreadIndex
 * @param {number} firstPageNumber
 * @param {number} lastMushafPage the mushaf's last page
 * @returns {number[]}
 */
export const getSpreadPageIndices = (
  spreadIndex: number,
  firstPageNumber: number,
  lastMushafPage: number,
): number[] => {
  const rightPageNumber = (Math.ceil(firstPageNumber / 2) + spreadIndex) * 2 - 1;
  return [rightPageNumber, rightPageNumber + 1]
    .filter((pageNumber) => pageNumber >= 1 && pageNumber <= lastMushafPage)
    .map((pageNumber) => pageNumber - firstPageNumber);
};

/**
 * Whether a text size's class sets a page width here (it doesn't on phones).
 *
 * @returns {boolean}
 */
const hasPageWidth = (probe: HTMLElement, className: string): boolean => {
  const sizing = document.createElement('div');
  sizing.className = className;
  probe.appendChild(sizing);
  return getComputedStyle(sizing).getPropertyValue('--line-width').trim() !== '';
};

/**
 * Measure page widths (--line-width) with hidden probes inside the reading view and return the
 * biggest size, up to `fontScale`, at which two pages and the gap between them fit.
 *
 * @returns {number}
 */
const findFittingScale = (
  container: HTMLElement,
  fontScale: number,
  getLineWidthClassName: (scale: number) => string,
  pagesAcross: number,
  isSizedByWidth: boolean,
): number => {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:absolute;visibility:hidden;height:0;overflow:hidden;';
  container.appendChild(probe);
  const measure = (className: string, width: string) => {
    const outer = document.createElement('div');
    outer.className = className;
    const inner = document.createElement('div');
    inner.style.width = width;
    outer.appendChild(inner);
    probe.appendChild(outer);
    return inner.getBoundingClientRect().width;
  };
  const gap = measure('', 'var(--spacing-mega)');
  // pages whose text is sized only by their width (Qalun) can't change size where no page width
  // is set (phones): the smallest size is the only one
  if (isSizedByWidth && !hasPageWidth(probe, getLineWidthClassName(fontScale))) {
    probe.remove();
    return MINIMUM_FONT_STEP;
  }
  let fitting = fontScale;
  for (let candidate = fontScale; candidate >= MINIMUM_FONT_STEP; candidate -= 1) {
    fitting = candidate;
    const pageWidth = measure(getLineWidthClassName(candidate), 'var(--line-width)');
    if (pageWidth * pagesAcross + gap * (pagesAcross - 1) <= container.clientWidth) break;
  }
  probe.remove();
  return fitting;
};

/**
 * The biggest Quran text size, up to the reader's own, at which the page (or, in the two-page
 * view, both pages) fits the reader's width, so Cmd + never pushes a page off the side of the
 * window. The whole view uses it, so every page is the same size. Null until measured.
 *
 * @param {RefObject<HTMLElement>} containerRef the reading view, whose width the pages share
 * @param {number} fontScale the reader's chosen size
 * @param {(scale: number) => string} getLineWidthClassName sets --line-width for a size
 * @param {number} pagesAcross 1, or 2 in the two-page view
 * @param {boolean} isSizedByWidth the pages' text is sized only by their width (Qalun)
 * @returns {number | null}
 */
export const useFittingFontScale = (
  containerRef: RefObject<HTMLElement>,
  fontScale: number,
  getLineWidthClassName: (scale: number) => string,
  pagesAcross: number,
  isSizedByWidth = false,
): number | null => {
  const [cap, setCap] = useState<number | null>(null);

  // measured before paint, so pages never show at one size and then shrink
  useBrowserLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const fit = () => {
      const largest = findFittingScale(
        container,
        MAXIMUM_QURAN_FONT_STEP,
        getLineWidthClassName,
        pagesAcross,
        isSizedByWidth,
      );
      readerFontScaleCap.current = largest;
      setCap(largest);
    };
    fit();
    // page widths follow the window's height as well as its width
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    window.addEventListener('resize', fit);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', fit);
      readerFontScaleCap.current = null;
    };
  }, [containerRef, getLineWidthClassName, pagesAcross, isSizedByWidth]);

  return cap === null ? null : Math.min(fontScale, cap);
};

/**
 * Whether the reader shows two pages side by side, remembered in this browser.
 *
 * @returns {[boolean, () => void]}
 */
export const useTwoPageSpread = (): [boolean, () => void] => {
  const [isTwoPages, setIsTwoPages] = useState(false);
  const [isWideScreen, setIsWideScreen] = useState(false);

  // read before the first paint, so the one-page view doesn't flash first
  useBrowserLayoutEffect(() => {
    try {
      setIsTwoPages(window.localStorage.getItem(STORAGE_KEY) === 'true');
    } catch {
      // storage can be blocked; the view just starts with one page
    }
  }, []);

  // two pages only fit on a desktop-sized window; on a phone or a narrowed window the setting is
  // kept but the usual one-page view shows
  useBrowserLayoutEffect(() => {
    const query = window.matchMedia(WIDE_SCREEN_QUERY);
    const update = () => setIsWideScreen(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const toggle = useCallback(() => {
    setIsTwoPages((current) => {
      try {
        window.localStorage.setItem(STORAGE_KEY, String(!current));
      } catch {
        // not remembered, but still switches for this visit
      }
      return !current;
    });
  }, []);

  return [isTwoPages && isWideScreen, toggle];
};
