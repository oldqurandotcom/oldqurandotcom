import { createContext, useContext } from 'react';

import { shallowEqual, useSelector } from 'react-redux';

import { selectQuranReaderStyles } from '@/redux/slices/QuranReader/styles';

/**
 * Lets a view show the Quran text smaller than the reader's chosen size without changing the
 * setting: the two-page view uses it to fit both pages side by side (added in the old-Quran.com
 * clone). Null means no override.
 */
export const FontScaleOverrideContext = createContext<number | null>(null);

/**
 * The Quran text font scale to render with: the override when one is set, else the setting.
 *
 * @returns {number}
 */
export const useQuranTextFontScale = (): number => {
  const override = useContext(FontScaleOverrideContext);
  const { quranTextFontScale } = useSelector(selectQuranReaderStyles, shallowEqual);
  return override ?? quranTextFontScale;
};
