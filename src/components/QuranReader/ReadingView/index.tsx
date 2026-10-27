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
import useMushafLines, { TWO_PAGE_FONT } from './MushafPage/useMushafLines';
import PageContainer from './PageContainer';
import PageNavigationButtons from './PageNavigationButtons';
import QalunPage from './QalunPage';
import useVisibleQalunPage from './QalunPage/useVisibleQalunPage';
import styles from './ReadingView.module.scss';
import ReadingViewSkeleton from './ReadingViewSkeleton';
import {
  getSpreadIndex,
  getSpreadPageIndices,
  getSpreadsCount,
  useFittingFontScale,
  useTwoPageSpread,
} from './twoPageSpread';

import { FontScaleOverrideContext } from '@/components/QuranReader/contexts/FontScaleOverrideContext';
import useFetchPagesLookup from '@/components/QuranReader/hooks/useFetchPagesLookup';
import onCopyQuranWords from '@/components/QuranReader/onCopyQuranWords';
import QueryParamMessage from '@/components/QuranReader/QueryParamMessage';
import { Riwayah, useRiwayah } from '@/components/QuranReader/Riwayah/RiwayahContext';
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
import { QuranFont, QuranReaderDataType } from 'types/QuranReader';
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
const MADANI_MUSHAF_PAGES = 604;
// how many pages either side of the current one get their fonts loaded ahead
const FONT_PRELOAD_PAGES = 2;
const NO_VERSES: Verse[] = [];
const NO_PAGES: number[] = [];

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
  // Qalun pages share Hafs's page numbers (both follow the Madani mushaf's 604 pages), so the
  // same lookup, page turning and two-page pairing serve both; only the page drawn differs
  const isQalun = useRiwayah().riwayah === Riwayah.Qalun;
  // page widths: Qalun pages are as wide as Madani V1 pages at the same text size
  const layoutFont = isQalun ? QuranFont.MadaniV1 : quranFont;
  const { pagesCount, hasError, pagesVersesRange, isLoading } = useFetchPagesLookup(
    resourceId,
    quranReaderDataType,
    initialData,
    quranReaderStyles,
    isUsingDefaultFont,
  );
  const visibleQalunPage = useVisibleQalunPage(isQalun);
  const currentPageIndex = useMemo(
    () =>
      getPageIndexByPageNumber(Number(visibleQalunPage ?? lastReadPageNumber), pagesVersesRange),
    [visibleQalunPage, lastReadPageNumber, pagesVersesRange],
  );
  const virtuosoRef = useRef<VirtuosoHandle>(null);

  // with two pages side by side, each row of the list holds a pair of pages
  const [isTwoPagesChosen, toggleTwoPages] = useTwoPageSpread();
  // two pages with the default font (and with Qalun, which has its own); other fonts keep the
  // usual view
  const canShowTwoPages = isQalun || quranFont === TWO_PAGE_FONT;
  const isTwoPages = isTwoPagesChosen && canShowTwoPages;
  // where every line of each printed page goes (null for fonts without a fixed layout)
  const pageLayouts = useMushafLines(isTwoPages && !isQalun, quranFont);
  const lastMushafPage = pageLayouts ? Object.keys(pageLayouts).length : MADANI_MUSHAF_PAGES;
  // one text size for the whole view, the biggest (up to the reader's) at which the page, or
  // both pages, fit the width
  const containerRef = useRef<HTMLDivElement>(null);
  const getLineWidthClass = useCallback(
    (scale: number) => styles[getLineWidthClassName(layoutFont, scale, mushafLines)],
    [layoutFont, mushafLines],
  );
  const fittedFontScale = useFittingFontScale(
    containerRef,
    quranTextFontScale,
    getLineWidthClass,
    isTwoPages ? 2 : 1,
    isQalun,
  );
  const fontScale = fittedFontScale ?? quranTextFontScale;
  const pageStyles = useMemo(
    () =>
      fontScale === quranTextFontScale
        ? quranReaderStyles
        : { ...quranReaderStyles, quranTextFontScale: fontScale },
    [fontScale, quranTextFontScale, quranReaderStyles],
  );
  const firstPageNumber = Number(Object.keys(pagesVersesRange)[0]);
  // the two-page view appears only once its text size and page layouts are known
  const isTwoPageViewReady =
    !isTwoPages || (fittedFontScale !== null && (isQalun || !!pageLayouts));
  const itemsCount = isTwoPages ? getSpreadsCount(pagesCount, firstPageNumber) : pagesCount;
  const currentItemIndex = isTwoPages
    ? getSpreadIndex(currentPageIndex, firstPageNumber)
    : currentPageIndex;
  // load the fonts of the pages around the current one before their verses arrive, so turning or
  // scrolling to them never waits for a font
  const pagesToPreload = useMemo(() => {
    if (!pagesCount || Number.isNaN(firstPageNumber)) return [];
    const current = firstPageNumber + Math.min(Math.max(currentPageIndex || 0, 0), pagesCount - 1);
    const reach = isTwoPages ? FONT_PRELOAD_PAGES * 2 : FONT_PRELOAD_PAGES;
    const pages = [];
    for (let page = current - reach; page <= current + reach + 1; page += 1) {
      if (page >= 1 && page <= lastMushafPage) pages.push(page);
    }
    return pages;
  }, [pagesCount, firstPageNumber, currentPageIndex, isTwoPages, lastMushafPage]);
  useQcfFont(quranFont, isQalun ? NO_VERSES : verses, isQalun ? NO_PAGES : pagesToPreload);

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
  const isSwitchingLayout = useRef(false);
  const onToggleTwoPages = useCallback(() => {
    isSwitchingLayout.current = true;
    toggleTwoPages();
  }, [toggleTwoPages]);
  // the page the reader was on when switching, kept until the new view has drawn (it briefly shows
  // a placeholder while the text size is worked out, and there's nothing to scroll until then)
  const pageWhenSwitching = useRef<number | null>(null);
  const onToggleTwoPagesAt = useCallback(() => {
    const page = firstPageNumber + Math.max(currentPageIndex || 0, 0);
    // leaving a pair, go back to its first (right-hand, odd) page, if it's in this surah/juz
    pageWhenSwitching.current = isTwoPages
      ? Math.max(page % 2 === 0 ? page - 1 : page, firstPageNumber)
      : page;
    onToggleTwoPages();
  }, [firstPageNumber, currentPageIndex, isTwoPages, onToggleTwoPages]);
  // switching riwayah keeps the page too: remember the page shown before the switch
  const currentPageNumber = firstPageNumber + Math.max(currentPageIndex || 0, 0);
  const pageBeforeThisRender = useRef(currentPageNumber);
  const lastIsQalun = useRef(isQalun);
  useEffect(() => {
    if (lastIsQalun.current !== isQalun) {
      lastIsQalun.current = isQalun;
      pageWhenSwitching.current = pageBeforeThisRender.current;
      isSwitchingLayout.current = true;
    }
    pageBeforeThisRender.current = currentPageNumber;
  });
  useEffect(() => {
    if (!isSwitchingLayout.current || !isTwoPageViewReady || pageWhenSwitching.current === null) {
      return; // e.g. the remembered setting loading, or the new view not drawn yet
    }
    isSwitchingLayout.current = false;
    const pageIndex = pageWhenSwitching.current - firstPageNumber;
    pageWhenSwitching.current = null;
    virtuosoRef.current?.scrollToIndex({
      index: isTwoPages ? getSpreadIndex(pageIndex, firstPageNumber) : pageIndex,
      align: 'start',
    });
  }, [isTwoPages, isTwoPageViewReady, firstPageNumber, isQalun]);

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

  // the size being shown, not the one stored: a stored size above what fits shows smaller
  const allowKeyboardNavigation = fontScale <= 5;
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

  const renderPage = (pageIndex: number) => {
    if (isQalun) {
      const pageNumber = firstPageNumber + pageIndex;
      if (pageNumber < 1 || pageNumber > MADANI_MUSHAF_PAGES) return null;
      return (
        <QalunPage
          key={pageNumber}
          pageNumber={pageNumber}
          verseKey={pagesVersesRange[pageNumber]?.from}
        />
      );
    }
    return (
      <PageContainer
        key={pageIndex}
        pagesVersesRange={pagesVersesRange}
        quranReaderStyles={pageStyles}
        isFullPage={isTwoPages}
        pageLines={pageLayouts?.[firstPageNumber + pageIndex]}
        reciterId={reciterId}
        lang={lang}
        wordByWordLocale={wordByWordLocale}
        pageIndex={pageIndex}
        setMushafPageToVersesMap={setMushafPageToVersesMap}
        initialData={initialData}
      />
    );
  };

  const itemContentRenderer = (itemIndex: number) => {
    if (itemIndex === itemsCount) {
      // Qalun pages load no Quran.com verses; the surah's own verses lead to the next surah
      const pageVerses = isQalun ? initialData.verses : mushafPageToVersesMap[lastReadPageNumber];
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
        <div className={styles.spread}>
          {getSpreadPageIndices(itemIndex, firstPageNumber, lastMushafPage).map(renderPage)}
        </div>
      );
    }

    return renderPage(itemIndex);
  };

  if (hasError) {
    return <Error />;
  }

  return (
    <FontScaleOverrideContext.Provider value={fittedFontScale}>
      <QueryParamMessage
        translationsQueryParamDifferent={false}
        reciterQueryParamDifferent={reciterQueryParamDifferent}
        wordByWordLocaleQueryParamDifferent={wordByWordLocaleQueryParamDifferent}
      />
      <div
        ref={containerRef}
        // Qalun text is plain Unicode and copies as it is
        onCopy={isQalun ? undefined : (event) => onCopyQuranWords(event, verses, quranFont)}
        className={classNames(
          styles.container,
          styles[getLineWidthClassName(layoutFont, fontScale, mushafLines)],
        )}
      >
        {isLoading || !isTwoPageViewReady ? (
          <div className={styles.virtuosoScroller}>
            <ReadingViewSkeleton />
            {!isLoading && (
              // fetch the first pair's verses and fonts while the two-page view gets ready
              <div hidden>
                {getSpreadPageIndices(0, firstPageNumber, lastMushafPage).map(renderPage)}
              </div>
            )}
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
      {(allowKeyboardNavigation || canShowTwoPages) && (
        <PageNavigationButtons
          scrollToNextPage={onNextPageClicked}
          scrollToPreviousPage={onPrevPageClicked}
          isTwoPages={isTwoPages}
          onToggleTwoPages={canShowTwoPages ? onToggleTwoPagesAt : undefined}
          isPageNavigationShown={allowKeyboardNavigation}
        />
      )}
    </FontScaleOverrideContext.Provider>
  );
};

export default ReadingView;
