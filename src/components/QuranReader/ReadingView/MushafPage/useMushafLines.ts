import useSWRImmutable from 'swr/immutable';

import { QuranFont } from 'types/QuranReader';

/**
 * The line layout of every page of a printed mushaf (added in the old-Quran.com clone), one
 * entry per line:
 *   "a" / "c"   ayat, justified / centred
 *   "s40"       the surah's heading ("s40b": heading and Bismillah share the line)
 *   "b"         the Bismillah
 *   ""          an empty line (only around Al-Fatiha and the start of Al-Baqarah)
 * Words go on the ayah lines in order of the line numbers Quran.com's API gives them; an entry
 * like "a@15:1:1" instead names the line's first word, for the few pages where those numbers
 * don't fit the layout. Line types and centring come from QUL (qul.tarteel.ai).
 */
export type MushafPageLines = string[];

// The two-page view is only offered with the default font (KFGQPC V1, 1405H print), whose layout
// has been checked line by line on all 604 pages
export const TWO_PAGE_FONT = QuranFont.MadaniV1;

export const getMushafLinesFile = (quranFont: QuranFont) =>
  quranFont === TWO_PAGE_FONT ? 'v1' : null;

const fetchLayout = (url: string) =>
  fetch(url).then((response) => response.json() as Promise<{ pages: Record<string, string[]> }>);

/**
 * The page layouts for the current font, or null while loading or when the font has none.
 *
 * @param {boolean} isEnabled
 * @param {QuranFont} quranFont
 * @returns {Record<string, MushafPageLines> | null}
 */
const useMushafLines = (
  isEnabled: boolean,
  quranFont: QuranFont,
): Record<string, MushafPageLines> | null => {
  const file = isEnabled ? getMushafLinesFile(quranFont) : null;
  const { data } = useSWRImmutable(file && `/mushaf-lines/${file}.json`, fetchLayout);
  return file && data ? data.pages : null;
};

export default useMushafLines;
