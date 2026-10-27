import { useEffect } from 'react';

import { useDispatch, useStore } from 'react-redux';

import { readerFontScaleCap } from '@/components/QuranReader/ReadingView/twoPageSpread';
import { RootState } from '@/redux/RootState';
import {
  decreaseQuranTextFontScale,
  decreaseTranslationFontScale,
  increaseQuranTextFontScale,
  increaseTranslationFontScale,
  MAXIMUM_QURAN_FONT_STEP,
  MAXIMUM_TRANSLATIONS_FONT_STEP,
  MINIMUM_FONT_STEP,
  selectQuranReaderStyles,
} from '@/redux/slices/QuranReader/styles';

/**
 * Cmd/Ctrl + and - make the Quran text (and translations) bigger or smaller instead of zooming
 * the whole page, like the Mini Mushaf does. Cmd/Ctrl 0 is left alone so it still resets the
 * browser's zoom.
 */
const useFontSizeShortcuts = () => {
  const dispatch = useDispatch();
  const store = useStore<RootState>();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.altKey) return;
      const isBigger = event.key === '=' || event.key === '+';
      const isSmaller = event.key === '-' || event.key === '_';
      if (!isBigger && !isSmaller) return;
      event.preventDefault(); // instead of the browser's own zoom
      const { quranTextFontScale, translationFontScale } = selectQuranReaderStyles(
        store.getState(),
      );
      // in the reading view, sizes above the largest that fits the window don't show
      const cap = readerFontScaleCap.current ?? MAXIMUM_QURAN_FONT_STEP;
      if (isBigger) {
        if (quranTextFontScale >= Math.min(cap, MAXIMUM_QURAN_FONT_STEP)) return;
        dispatch(increaseQuranTextFontScale());
        if (translationFontScale < MAXIMUM_TRANSLATIONS_FONT_STEP) {
          dispatch(increaseTranslationFontScale());
        }
      } else {
        // step down from the size being shown, even if a bigger one was stored
        const target = Math.max(Math.min(quranTextFontScale, cap) - 1, MINIMUM_FONT_STEP);
        for (let step = quranTextFontScale; step > target; step -= 1) {
          dispatch(decreaseQuranTextFontScale());
        }
        if (translationFontScale > MINIMUM_FONT_STEP) dispatch(decreaseTranslationFontScale());
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dispatch, store]);
};

export default useFontSizeShortcuts;
