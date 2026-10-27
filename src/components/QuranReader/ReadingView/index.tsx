/* eslint-disable max-lines */
/* eslint-disable react-func/max-lines-per-function */
/* eslint-disable react/no-multi-comp */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import classNames from 'classnames';
import useTranslation from 'next-translate/useTranslation';
import dynamic from 'next/dynamic';
import { useHotkeys } from 'react-hotkeys-hook';
import { shallowEqual, useSelector } from 'react-redux';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';

import { getPageIndexByPageNumber } from '../utils/page';

import useScrollToVirtualizedVerse from './hooks/useScrollToVirtualizedVerse';
import PageContainer from './PageContainer';
import PageNavigationButtons from './PageNavigationButtons';
import styles from './ReadingView.module.scss';
import ReadingViewSkeleton from './ReadingViewSkeleton';
import Spread from './Spread';
import {
  getSpreadIndex,
  getSpreadPageIndices,
  getSpreadsCount,
  useTwoPageSpread,
} from './twoPageSpread';

import useFetchPagesLookup from '@/components/QuranReader/hooks/useFetchPagesLookup';
import onCopyQuranWords from '@/components/QuranReader/onCopyQuranWords';
import QueryParamMessage from '@/components/QuranReader/QueryParamMessage';
import Spinner from '@/dls/Spinner/Spinner';
import useGetQueryParamOrReduxValue from '@/hooks/useGetQueryParamOrReduxValue';
import useGetQueryParamOrXstateValue from '@/hooks/useGetQueryParamOrXstateValue';
import useQcfFont from '@/hooks/useQcfFont';
import { selectedLastReadPage } from '@/redux/slices/QuranReader/readingTracker';
import { selectIsUsingDefaultFont } from '@/redux/slices/QuranReader/styles';
import QuranReaderStyles from '@/redux/types/QuranReaderStyles';
import { logButtonClick } from '@/utils/eventLogger';
import { getLineWidthClassName } from '@/utils/fontFaceHelper';
import Error from 'src/pages/_error';
import { VersesResponse } from 'types/ApiResponses';
import QueryParam from 'types/QueryParam';
import { QuranReaderDataType } from 'types/QuranReader';
import Verse from 'types/Verse';

const EndOfScrollingControls = dynamic(
  () => import('@/components/QuranReader/EndOfScrollingControls'),
  {
    ssr: false,
    loading: () => <Spinner />,
  },
);

type ReadingViewProps = {
  quranReaderStyles: QuranReaderStyles;
  quranReaderDataType: QuranReaderDataType;
  initialData: VersesResponse;
  resourceId: number | string; // can be the chapter, verse, tafsir, hizb, juz, rub or page's ID.
};

const INCREASE_VIEWPORT_BY_PIXELS = 1200;

const ReadingView = ({
  quranReaderStyles,
  quranReaderDataType,
  initialData,
  resourceId,
}: ReadingViewProps) => {
  const [mushafPageToVersesMap, setMushafPageToVersesMap] = useState<Record<number, Verse[]>>({
    [initialData.verses[0].pageNumber]: initialData.verses,
  });
  const { lang } = useTranslation('quran-reader');
  const isUsingDefaultFont = useSelector(selectIsUsingDefaultFont);
  const lastReadPageNumber = useSelector(selectedLastReadPage, shallowEqual);
  const verses = useMemo(
    () => Object.values(mushafPageToVersesMap).flat(),
    [mushafPageToVersesMap],
  );
  const {
    value: reciterId,
    isQueryParamDifferent: reciterQueryParamDifferent,
  }: { value: number; isQueryParamDifferent: boolean } = useGetQueryParamOrXstateValue(
    QueryParam.Reciter,
  );
  const {
    value: wordByWordLocale,
    isQueryParamDifferent: wordByWordLocaleQueryParamDifferent,
  }: { value: string; isQueryParamDifferent: boolean } = useGetQueryParamOrReduxValue(
    QueryParam.WBW_LOCALE,
  );
  const { quranFont, mushafLines, quranTextFontScale } = quranReaderStyles;
  useQcfFont(quranFont, verses);
  const { pagesCount, hasError, pagesVersesRange, isLoading } = useFetchPagesLookup(
    resourceId,
    quranReaderDataType,
    initialData,
    quranReaderStyles,
    isUsingDefaultFont,
  );
  const currentPageIndex = useMemo(
    () => getPageIndexByPageNumber(Number(lastReadPageNumber), pagesVersesRange),
    [lastReadPageNumber, pagesVersesRange],
  );
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // with two pages side by side, each row of the list holds a pair of pages
  const [isTwoPages, toggleTwoPages] = useTwoPageSpread();
  const firstPageNumber = Number(Object.keys(pagesVersesRange)[0]);
  const itemsCount = isTwoPages ? getSpreadsCount(pagesCount, firstPageNumber) : pagesCount;
  const currentItemIndex = isTwoPages
    ? getSpreadIndex(currentPageIndex, firstPageNumber)
    : currentPageIndex;
  // scrolling to a page goes to the row it's in
  const pageScrollRef = useMemo(
    () => ({
      get current(): VirtuosoHandle {
        const handle = virtuosoRef.current;
        if (!handle || !isTwoPages) return handle;
        return {
          ...handle,
          scrollToIndex: (location) => {
            const { index, ...rest } =
              typeof location === 'number' ? { index: location } : location;
            handle.scrollToIndex({
              ...rest,
              index: getSpreadIndex(Number(index), firstPageNumber),
            });
          },
        };
      },
    }),
    [isTwoPages, firstPageNumber],
  );
  // stay on the same page when switching between one and two pages
  const currentItemIndexRef = useRef(currentItemIndex);
  currentItemIndexRef.current = currentItemIndex;
  const isSwitchingLayout = useRef(false);
  const onToggleTwoPages = useCallback(() => {
    isSwitchingLayout.current = true;
    toggleTwoPages();
  }, [toggleTwoPages]);
  useEffect(() => {
    if (!isSwitchingLayout.current) return; // e.g. the remembered setting loading
    isSwitchingLayout.current = false;
    virtuosoRef.current?.scrollToIndex({ index: currentItemIndexRef.current, align: 'start' });
  }, [isTwoPages]);

  useScrollToVirtualizedVerse(
    quranReaderDataType,
    pageScrollRef,
    initialData,
    quranReaderStyles,
    verses,
    pagesVersesRange,
    isUsingDefaultFont,
    quranFont,
    mushafLines,
    isLoading,
  );

  const scrollToPreviousPage = useCallback(() => {
    virtuosoRef.current.scrollToIndex({
      index: currentItemIndex - 1,
      align: 'start',
      offset: -35,
    });
  }, [currentItemIndex]);

  const scrollToNextPage = useCallback(() => {
    virtuosoRef.current.scrollToIndex({
      index: currentItemIndex + 1,
      align: 'start',
      offset: 25,
    });
  }, [currentItemIndex]);

  const onPrevPageClicked = useCallback(() => {
    logButtonClick('reading_view_prev_page_button');
    scrollToPreviousPage();
  }, [scrollToPreviousPage]);

  const onNextPageClicked = useCallback(() => {
    logButtonClick('reading_view_next_page_button');
    scrollToNextPage();
  }, [scrollToNextPage]);

  const allowKeyboardNavigation = quranTextFontScale <= 5;
  const onUpClicked = useCallback(
    (event: KeyboardEvent) => {
      event.preventDefault();
      scrollToPreviousPage();
    },
    [scrollToPreviousPage],
  );

  const onDownClicked = useCallback(
    (event: KeyboardEvent) => {
      event.preventDefault();
      scrollToNextPage();
    },
    [scrollToNextPage],
  );

  useHotkeys('Up', onUpClicked, { enabled: allowKeyboardNavigation }, [scrollToPreviousPage]);
  useHotkeys('Down', onDownClicked, { enabled: allowKeyboardNavigation }, [scrollToNextPage]);

  const renderPage = (pageIndex: number) => (
    <PageContainer
      key={pageIndex}
      pagesVersesRange={pagesVersesRange}
      quranReaderStyles={quranReaderStyles}
      reciterId={reciterId}
      lang={lang}
      wordByWordLocale={wordByWordLocale}
      pageIndex={pageIndex}
      setMushafPageToVersesMap={setMushafPageToVersesMap}
      initialData={initialData}
    />
  );

  const itemContentRenderer = (itemIndex: number) => {
    if (itemIndex === itemsCount) {
      const pageVerses = mushafPageToVersesMap[lastReadPageNumber];
      const lastVerse = pageVerses?.[pageVerses.length - 1];
      if (!lastVerse) return null;

      return (
        <EndOfScrollingControls
          quranReaderDataType={quranReaderDataType}
          lastVerse={lastVerse}
          initialData={initialData}
        />
      );
    }

    if (isTwoPages) {
      return (
        <Spread>
          {getSpreadPageIndices(itemIndex, firstPageNumber, pagesCount).map(renderPage)}
        </Spread>
      );
    }

    return renderPage(itemIndex);
  };

  if (hasError) {
    return <Error />;
  }

  return (
    <>
      <QueryParamMessage
        translationsQueryParamDifferent={false}
        reciterQueryParamDifferent={reciterQueryParamDifferent}
        wordByWordLocaleQueryParamDifferent={wordByWordLocaleQueryParamDifferent}
      />
      <div
        onCopy={(event) => onCopyQuranWords(event, verses, quranFont)}
        className={classNames(
          styles.container,
          styles[getLineWidthClassName(quranFont, quranTextFontScale, mushafLines)],
        )}
      >
        {isLoading ? (
          <div className={styles.virtuosoScroller}>
            <ReadingViewSkeleton />
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            useWindowScroll
            increaseViewportBy={INCREASE_VIEWPORT_BY_PIXELS}
            className={styles.virtuosoScroller}
            initialItemCount={1} // needed for SSR.
            totalCount={itemsCount + 1}
            itemContent={itemContentRenderer}
          />
        )}
      </div>
      {allowKeyboardNavigation && (
        <PageNavigationButtons
          scrollToNextPage={onNextPageClicked}
          scrollToPreviousPage={onPrevPageClicked}
          isTwoPages={isTwoPages}
          onToggleTwoPages={onToggleTwoPages}
        />
      )}
    </>
  );
};

export default ReadingView;
