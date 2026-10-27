import { useCallback, useEffect, useState } from 'react';

// Two-page view (added in the old-Quran.com clone): pages are shown in pairs like an open
// printed mushaf, where an odd page sits on the right and the even page after it on the left.

const STORAGE_KEY = 'two-page-spread';

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
 * The page indices in a pair, right page first. A pair at either end of a surah can hold
 * just one page.
 *
 * @param {number} spreadIndex
 * @param {number} firstPageNumber
 * @param {number} pagesCount
 * @returns {number[]}
 */
export const getSpreadPageIndices = (
  spreadIndex: number,
  firstPageNumber: number,
  pagesCount: number,
): number[] => {
  const rightPageNumber = (Math.ceil(firstPageNumber / 2) + spreadIndex) * 2 - 1;
  return [rightPageNumber, rightPageNumber + 1]
    .map((pageNumber) => pageNumber - firstPageNumber)
    .filter((pageIndex) => pageIndex >= 0 && pageIndex < pagesCount);
};

/**
 * Whether the reader shows two pages side by side, remembered in this browser.
 *
 * @returns {[boolean, () => void]}
 */
export const useTwoPageSpread = (): [boolean, () => void] => {
  const [isTwoPages, setIsTwoPages] = useState(false);

  useEffect(() => {
    try {
      setIsTwoPages(window.localStorage.getItem(STORAGE_KEY) === 'true');
    } catch {
      // storage can be blocked; the view just starts with one page
    }
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

  return [isTwoPages, toggle];
};
