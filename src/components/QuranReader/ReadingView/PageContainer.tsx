import React, { useEffect, useMemo } from 'react';

import { useSWRConfig } from 'swr';
import useSWRImmutable from 'swr/immutable';

import { getPageNumberByPageIndex } from '../utils/page';

import MushafPage from './MushafPage';
import { MushafPageLines } from './MushafPage/useMushafLines';
import Page from './Page';
import ReadingViewSkeleton from './ReadingViewSkeleton';

import { getReaderViewRequestKey, verseFetcher } from '@/components/QuranReader/api';
import useIsPageFontReady from '@/components/QuranReader/hooks/useIsPageFontReady';
import useIsUsingDefaultSettings from '@/hooks/useIsUsingDefaultSettings';
import QuranReaderStyles from '@/redux/types/QuranReaderStyles';
import { VersesResponse } from 'types/ApiResponses';
import LookupRecord from 'types/LookupRecord';
import Verse from 'types/Verse';

type Props = {
  pagesVersesRange: Record<number, LookupRecord>;
  quranReaderStyles: QuranReaderStyles;
  reciterId: number;
  lang: string;
  wordByWordLocale: string;
  pageIndex: number;
  setMushafPageToVersesMap: (data: Record<number, Verse[]>) => void;
  initialData: VersesResponse;
  // two-page view: show the whole printed page, not just the part in the current surah/juz
  isFullPage?: boolean;
  pageLines?: MushafPageLines;
};

const getPageVersesRange = (
  currentMushafPage: number,
  apiPagesVersesRange: Record<number, LookupRecord>,
): LookupRecord => {
  const lookupRecord = { ...apiPagesVersesRange[currentMushafPage] };
  // TODO: remove this from BE
  // we remove firstVerseKey and lastVerseKey before we send the params to BE as BE doesn't need them
  delete lookupRecord.firstVerseKey;
  delete lookupRecord.lastVerseKey;
  return lookupRecord;
};

/**
 * Get the verses returned from the initialData of the first page.
 * This function will filter out all the words that don't
 * belong to the first page in-case we have some verses
 * that contain words that don't belong to the first page
 * (applies to 16-line Indopak Mushaf e.g. /ur/haji/25 or /ur/2/211-216)
 *
 * @param {number} pageNumber
 * @param {Verse[]} initialVerses
 * @returns {Verse[]}
 */
const getInitialVerses = (pageNumber: number, initialVerses: Verse[]): Verse[] =>
  initialVerses.map((verse) => ({
    ...verse,
    words: verse.words.filter((word) => word.pageNumber === pageNumber),
  }));

/**
 * A component that will fetch the verses of the current mushaf page
 * and will render a skeleton while it's loading.
 *
 * @param {Props} param0
 * @returns {JSX.Element}
 */
const PageContainer: React.FC<Props> = ({
  pagesVersesRange,
  quranReaderStyles,
  reciterId,
  lang,
  wordByWordLocale,
  pageIndex,
  setMushafPageToVersesMap,
  initialData,
  isFullPage = false,
  pageLines,
}: Props): JSX.Element => {
  const pageNumber = useMemo(
    () => getPageNumberByPageIndex(pageIndex, pagesVersesRange),
    [pageIndex, pagesVersesRange],
  );
  const initialVerses = useMemo(
    () => (pageIndex === 0 ? getInitialVerses(pageNumber, initialData.verses) : initialData.verses),
    [initialData.verses, pageIndex, pageNumber],
  );

  const isUsingDefaultSettings = useIsUsingDefaultSettings();
  const shouldUseInitialData = !isFullPage && pageIndex === 0 && isUsingDefaultSettings;
  const { cache } = useSWRConfig();
  const requestKey = getReaderViewRequestKey({
    pageNumber,
    pageVersesRange: isFullPage ? undefined : getPageVersesRange(pageNumber, pagesVersesRange),
    quranReaderStyles,
    reciter: reciterId,
    locale: lang,
    wordByWordLocale,
  });
  const { data: verses, isValidating } = useSWRImmutable(requestKey, verseFetcher, {
    fallbackData: shouldUseInitialData ? initialVerses : null,
    // a full page fetched ahead (while the two-page view gets ready) is used as is
    revalidateOnMount: isFullPage ? !cache.get(requestKey) : !shouldUseInitialData,
  });

  useEffect(() => {
    if (verses) {
      // @ts-ignore
      setMushafPageToVersesMap((prevMushafPageToVersesMap: Record<number, Verse[]>) => ({
        ...prevMushafPageToVersesMap,
        [pageNumber]: verses,
      }));
    }
  }, [pageNumber, setMushafPageToVersesMap, verses]);

  // keep the placeholder until the page's font is in, so the text is drawn once, in its font
  const isFontReady = useIsPageFontReady(pageNumber, quranReaderStyles.quranFont);

  if (!verses || isValidating || !isFontReady) {
    return <ReadingViewSkeleton />;
  }

  if (pageLines) {
    return (
      <MushafPage
        verses={verses}
        key={`page-${pageNumber}`}
        pageNumber={Number(pageNumber)}
        lines={pageLines}
        quranReaderStyles={quranReaderStyles}
        pageIndex={pageIndex}
        verseKey={pagesVersesRange[pageNumber]?.from}
      />
    );
  }

  return (
    <Page
      verses={verses}
      key={`page-${pageNumber}`}
      pageNumber={Number(pageNumber)}
      quranReaderStyles={quranReaderStyles}
      pageIndex={pageIndex}
    />
  );
};

export default PageContainer;
