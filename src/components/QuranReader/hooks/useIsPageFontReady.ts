import { useEffect, useState } from 'react';

import useIsFontLoaded from './useIsFontLoaded';

import { QuranFont } from 'types/QuranReader';

// if a page's font hasn't arrived by then (slow or failed download), show the fallback font
const FONT_WAIT_LIMIT_MS = 4000;

/**
 * Whether a page can be drawn: its own font has loaded (so the text never shows in the fallback
 * font first and then switches), or waiting for it has taken too long. Added in the
 * old-Quran.com clone.
 *
 * @param {number} pageNumber
 * @param {QuranFont} quranFont
 * @returns {boolean}
 */
const useIsPageFontReady = (pageNumber: number, quranFont: QuranFont): boolean => {
  const isFontLoaded = useIsFontLoaded(pageNumber, quranFont);
  const [hasWaitedTooLong, setHasWaitedTooLong] = useState(false);

  useEffect(() => {
    if (isFontLoaded) return undefined;
    const timeout = setTimeout(() => setHasWaitedTooLong(true), FONT_WAIT_LIMIT_MS);
    return () => clearTimeout(timeout);
  }, [isFontLoaded]);

  return isFontLoaded || hasWaitedTooLong;
};

export default useIsPageFontReady;
