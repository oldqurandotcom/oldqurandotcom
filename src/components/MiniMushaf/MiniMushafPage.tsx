/* eslint-disable i18next/no-literal-string */ // the Mini Mushaf window is a separate React root without i18n
/* eslint-disable max-lines */
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { fetcher } from '@/api';
import { getPageFirstVerseKey, getPageHizb } from '@/components/QuranReader/ReadingView/pageIndex';
import ChevronLeftIcon from '@/icons/chevron-left.svg';
import ChevronRightIcon from '@/icons/chevron-right.svg';
import FollowIcon from '@/icons/find-location.svg';
import MinusIcon from '@/icons/minus.svg';
import OpenIcon from '@/icons/north_east.svg';
import PlusIcon from '@/icons/plus.svg';
import BismillahSVG from '@/public/bismillah.svg';
import { makeUrl } from '@/utils/api';
import { getFontFaceNameForPage, getV1OrV2FontFaceSource } from '@/utils/fontFaceHelper';
import { Mushaf } from 'types/QuranReader';

export const FIRST_PAGE = 1;
export const LAST_PAGE = 604;
const LINES_PER_PAGE = 15;
const LINE_HEIGHT = 1.8; // keep in sync with .line in styles.ts
const MEASURE_FONT_SIZE = 100; // keep in sync with .measure in styles.ts
const CHAPTERS_WITHOUT_BISMILLAH = [1, 9];
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

type Word = { id: number; lineNumber: number; codeV1: string; codeV2: string };
type Verse = { verseNumber: number; chapterId: number; juzNumber: number; words: Word[] };
type PageLine =
  | { kind: 'words'; key: string; words: Word[] }
  | { kind: 'header'; key: string; chapterId: number }
  | { kind: 'bismillah'; key: string }
  // a Qalun line: its text, justified ("j"), start-aligned ("r") or centred ("c")
  | { kind: 'text'; key: string; text: string; align: string };
// a line of KFGQPC's Qalun typesetting, as in public/qalun/pages/<page>.json (see scripts/qalun)
type QalunLine = [string, string, string];
const QALUN_FONT_FAMILY = 'qalun-uthmanic';

export type MiniMushafColors = Record<
  'bg' | 'text' | 'faded' | 'border' | 'accent' | 'hover' | 'bar',
  string
>;

interface Props {
  win: Window;
  followPage: number;
  isV1: boolean;
  // show the Qalun 'an Nafi' mushaf, as the reader does when Qalun is chosen
  isQalun: boolean;
  colors: MiniMushafColors;
  getChapterName: (chapterId: number) => string;
  onOpenInReader: (page: number) => void;
}

// pages and fonts are shared across re-renders and re-opens of the window
const versesCache = new Map<string, Promise<Verse[]>>();

const getPageVerses = (page: number, isV1: boolean): Promise<Verse[]> => {
  const cacheKey = `${isV1 ? 'v1' : 'v2'}-${page}`;
  if (!versesCache.has(cacheKey)) {
    const url = makeUrl(`/verses/by_page/${page}`, {
      words: true,
      perPage: 'all',
      filterPageWords: true,
      mushaf: isV1 ? Mushaf.QCFV1 : Mushaf.QCFV2,
      fields: 'chapter_id',
      wordFields: 'line_number,code_v1,code_v2',
    });
    const request = fetcher<{ verses: Verse[] }>(url).then((response) => response.verses);
    request.catch(() => versesCache.delete(cacheKey)); // allow a retry after a failure
    versesCache.set(cacheKey, request);
  }
  return versesCache.get(cacheKey);
};

const qalunCache = new Map<number, Promise<QalunLine[]>>();

const getQalunPage = (page: number): Promise<QalunLine[]> => {
  if (!qalunCache.has(page)) {
    const request = fetch(`${window.location.origin}/qalun/pages/${page}.json`).then((response) => {
      if (!response.ok) throw new Error(`Qalun page ${page}: ${response.status}`);
      return response.json() as Promise<QalunLine[]>;
    });
    request.catch(() => qalunCache.delete(page)); // allow a retry after a failure
    qalunCache.set(page, request);
  }
  return qalunCache.get(page);
};

const loadFont = async (win: Window, family: string, source: string) => {
  const isLoaded = Array.from(win.document.fonts as unknown as Iterable<FontFace>).some(
    (font) => font.family.replace(/"/g, '') === family,
  );
  if (isLoaded) return;
  // FontFace must come from the PiP window's own realm to be added to its document
  const face: FontFace = new (win as any).FontFace(family, source);
  win.document.fonts.add(face);
  await face.load();
};

const loadPageFont = (win: Window, page: number, isV1: boolean) =>
  loadFont(win, getFontFaceNameForPage(isV1, page), getV1OrV2FontFaceSource(isV1, page));

const loadQalunFont = (win: Window) =>
  loadFont(
    win,
    QALUN_FONT_FAMILY,
    `url(${window.location.origin}/fonts/quran/qalun/uthmanic_qaloun_v21.ttf) format('truetype')`,
  );

// a Qalun page's lines: the typesetting already has every title, basmala and line in place
const buildQalunLines = (qalun: QalunLine[]): PageLine[] =>
  qalun.map(([kind, text, align], index) => {
    const key = `q${index}`;
    if (kind === 's') return { kind: 'header', key, chapterId: Number(text) };
    return { kind: 'text', key, text, align: kind === 'b' ? 'c' : align };
  });

/**
 * Turn the page's words into its 15 mushaf lines. Lines the API leaves out are where a surah
 * starts: one for the surah title, and one for the bismillah (except Al-Fatihah and At-Tawbah).
 *
 * @param {Verse[]} verses
 * @returns {PageLine[]}
 */
const indexPageWords = (verses: Verse[]) => {
  const wordsByLine = new Map<number, Word[]>();
  const chapterStartingAtLine = new Map<number, number>();
  verses.forEach((verse) => {
    verse.words.forEach((word) => {
      if (!wordsByLine.has(word.lineNumber)) wordsByLine.set(word.lineNumber, []);
      wordsByLine.get(word.lineNumber).push(word);
    });
    if (verse.verseNumber === 1) {
      const firstLine = Math.min(...verse.words.map((word) => word.lineNumber));
      chapterStartingAtLine.set(firstLine, verse.chapterId);
    }
  });
  return { wordsByLine, chapterStartingAtLine };
};

const buildPageLines = (verses: Verse[]): PageLine[] => {
  const { wordsByLine, chapterStartingAtLine } = indexPageWords(verses);

  const lines: PageLine[] = [];
  let lineNumber = 1;
  while (lineNumber <= LINES_PER_PAGE) {
    if (wordsByLine.has(lineNumber)) {
      lines.push({ kind: 'words', key: `l${lineNumber}`, words: wordsByLine.get(lineNumber) });
      lineNumber += 1;
    } else {
      let nextLine = lineNumber;
      while (nextLine <= LINES_PER_PAGE && !wordsByLine.has(nextLine)) nextLine += 1;
      const chapterId = chapterStartingAtLine.get(nextLine);
      if (chapterId) {
        lines.push({ kind: 'header', key: `h${chapterId}`, chapterId });
        if (nextLine - lineNumber > 1 && !CHAPTERS_WITHOUT_BISMILLAH.includes(chapterId)) {
          lines.push({ kind: 'bismillah', key: `b${chapterId}` });
        }
      }
      lineNumber = nextLine;
    }
  }
  return lines;
};

// a page's lines and its font, for Hafs (from Quran.com's API) or Qalun (from public/qalun)
const loadPage = (win: Window, page: number, isV1: boolean, isQalun: boolean) =>
  isQalun
    ? Promise.all([getQalunPage(page), loadQalunFont(win)]).then(([qalun]) => ({ page, qalun }))
    : Promise.all([getPageVerses(page, isV1), loadPageFont(win, page, isV1)]).then(([verses]) => ({
        page,
        verses,
      }));

const MiniMushafPage: React.FC<Props> = ({
  win,
  followPage,
  isV1,
  isQalun,
  colors,
  getChapterName,
  onOpenInReader,
}) => {
  const [page, setPage] = useState(followPage);
  const [isFollowing, setIsFollowing] = useState(true);
  // the page on screen only changes once the next page's words and font are both ready
  const [loaded, setLoaded] = useState<{
    page: number;
    verses?: Verse[];
    qalun?: QalunLine[];
  } | null>(null);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [fontSize, setFontSize] = useState(0);
  // 1 = the whole page fits the window; above 1 the text is bigger and the page scrolls
  const [zoom, setZoom] = useState(1);
  const pageRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // follow the page being read in the main tab
  useEffect(() => {
    if (isFollowing) setPage(followPage);
  }, [followPage, isFollowing]);

  // theme colors from the main tab
  useEffect(() => {
    Object.entries(colors).forEach(([name, value]) => {
      win.document.documentElement.style.setProperty(`--mm-${name}`, value);
    });
  }, [colors, win]);

  useEffect(() => {
    let isCancelled = false;
    setHasError(false);
    loadFont(
      win,
      'surahnames',
      `url(${window.location.origin}/fonts/quran/surah-names/v1/sura_names.woff2)`,
    );
    loadPage(win, page, isV1, isQalun)
      .then((next) => {
        if (isCancelled) return;
        setLoaded(next);
        const pipDocument = win.document;
        pipDocument.title = `Page ${page} · Mini Mushaf`;
        // warm up the next page (reading forward is the common case)
        if (page < LAST_PAGE) loadPage(win, page + 1, isV1, isQalun).catch(() => undefined);
      })
      .catch(() => {
        if (!isCancelled) setHasError(true);
      });
    return () => {
      isCancelled = true;
    };
  }, [page, isV1, isQalun, win, retryCount]);

  const lines = useMemo(() => {
    if (!loaded) return [];
    return loaded.qalun ? buildQalunLines(loaded.qalun) : buildPageLines(loaded.verses);
  }, [loaded]);
  const fontFamily = loaded?.qalun
    ? QALUN_FONT_FAMILY
    : loaded && getFontFaceNameForPage(isV1, loaded.page);
  // the first two pages are drawn as centered, decorated pages in the mushaf
  const isCenteredPage = loaded?.page <= 2;

  // scale the page so all 15 lines fit the window, whatever size it's dragged to
  const fitToWindow = useCallback(() => {
    const pageElement = pageRef.current;
    const measureElement = measureRef.current;
    if (!pageElement || !measureElement || !lines.length) return;
    const widestLine = Math.max(
      ...Array.from(measureElement.children).map((child) => (child as HTMLElement).scrollWidth),
    );
    const styles = win.getComputedStyle(pageElement);
    const availableWidth =
      pageElement.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
    const availableHeight =
      pageElement.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
    const byWidth = widestLine ? (MEASURE_FONT_SIZE * availableWidth) / widestLine : Infinity;
    const byHeight = availableHeight / (lines.length * LINE_HEIGHT);
    setFontSize(Math.max(6, Math.floor(Math.min(byWidth, byHeight) * 0.98)));
  }, [lines, win]);

  useLayoutEffect(() => {
    fitToWindow();
    win.addEventListener('resize', fitToWindow);
    return () => win.removeEventListener('resize', fitToWindow);
  }, [fitToWindow, win]);

  const goToPage = useCallback((nextPage: number) => {
    if (nextPage < FIRST_PAGE || nextPage > LAST_PAGE) return;
    setIsFollowing(false); // reading ahead in the mini window shouldn't snap back right away
    setPage(nextPage);
  }, []);

  const changeZoom = useCallback((step: number) => {
    setZoom((current) =>
      Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round((current + step) * 10) / 10)),
    );
  }, []);

  // in a right-to-left mushaf, the left arrow turns to the next page; Cmd/Ctrl -, + and 0 change the text size
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        if (event.key === '-' || event.key === '_') changeZoom(-ZOOM_STEP);
        else if (event.key === '=' || event.key === '+') changeZoom(ZOOM_STEP);
        else if (event.key === '0') setZoom(1);
        else return;
        event.preventDefault(); // instead of the browser's own zoom
        return;
      }
      if (event.key === 'ArrowLeft') goToPage(page + 1);
      if (event.key === 'ArrowRight') goToPage(page - 1);
    };
    win.addEventListener('keydown', onKeyDown);
    return () => win.removeEventListener('keydown', onKeyDown);
  }, [changeZoom, goToPage, page, win]);

  // Qalun's pages break where Hafs's do, so its surah and juz come from the same page index
  const firstVerse = loaded?.page === page ? loaded.verses?.[0] : undefined;
  let pageInfo = `Page ${page}`;
  if (firstVerse) {
    pageInfo = `Page ${page} · ${getChapterName(firstVerse.chapterId)} · Juz ${
      firstVerse.juzNumber
    }`;
  } else if (loaded?.page === page && loaded.qalun) {
    const chapterId = Number(getPageFirstVerseKey(page).split(':')[0]);
    pageInfo = `Page ${page} · ${getChapterName(chapterId)} · Juz ${Math.ceil(
      getPageHizb(page) / 2,
    )} · Qalun`;
  }

  const renderLine = (line: PageLine) => {
    if (line.kind === 'header') {
      return (
        <div key={line.key} className="header">
          <span translate="no">{String(line.chapterId).padStart(3, '0')}</span>
          <span translate="no">surah</span>
        </div>
      );
    }
    if (line.kind === 'text') {
      if (line.align === 'j') {
        return (
          <div key={line.key} className="line">
            {line.text.split(' ').map((word, index) => (
              // eslint-disable-next-line react/no-array-index-key
              <span key={index}>{word}</span>
            ))}
          </div>
        );
      }
      return (
        <div key={line.key} className={line.align === 'c' ? 'line centered' : 'line start'}>
          {line.text}
        </div>
      );
    }
    if (line.kind === 'bismillah') {
      return (
        <div key={line.key} className="bismillah">
          <BismillahSVG />
        </div>
      );
    }
    return (
      <div key={line.key} className={isCenteredPage ? 'line centered' : 'line'}>
        {line.words.map((word) => (
          <span key={word.id}>{isV1 ? word.codeV1 : word.codeV2}</span>
        ))}
      </div>
    );
  };

  let content: React.ReactNode;
  if (hasError) {
    content = (
      <div className="status">
        <div>
          Couldn&apos;t load page {page}.
          <br />
          <button type="button" onClick={() => setRetryCount((count) => count + 1)}>
            Retry
          </button>
        </div>
      </div>
    );
  } else if (!loaded || !fontSize) {
    content = <div className="status">Loading page {page}…</div>;
  }

  return (
    <div className="mm">
      {/* off-screen copy at a fixed size, used to work out how big the page can be drawn */}
      <div ref={measureRef} className="measure" style={{ fontFamily }} aria-hidden>
        {lines
          .filter((line) => line.kind === 'words' || line.kind === 'text')
          .map((line) => (
            <div key={line.key} className="line">
              {line.kind === 'words' &&
                line.words.map((word) => (
                  <span key={word.id}>{isV1 ? word.codeV1 : word.codeV2}</span>
                ))}
              {line.kind === 'text' && line.text}
            </div>
          ))}
      </div>
      {content || (
        <div
          ref={pageRef}
          className={zoom > 1 ? 'page zoomed' : 'page'}
          style={{ fontFamily, fontSize: Math.round(fontSize * zoom) }}
        >
          {lines.map(renderLine)}
        </div>
      )}
      {/* the page element must exist to be measured while loading */}
      {content && (
        <div
          ref={pageRef}
          className="page"
          style={{ position: 'absolute', inset: 0, visibility: 'hidden' }}
        />
      )}
      <div className="bar">
        <button
          type="button"
          title="Next page (←)"
          disabled={page >= LAST_PAGE}
          onClick={() => goToPage(page + 1)}
        >
          <ChevronLeftIcon />
        </button>
        <span className="info" title={pageInfo}>
          {pageInfo}
        </span>
        <button
          type="button"
          title="Previous page (→)"
          disabled={page <= FIRST_PAGE}
          onClick={() => goToPage(page - 1)}
        >
          <ChevronRightIcon />
        </button>
        <button
          type="button"
          className={isFollowing ? 'on' : undefined}
          title={isFollowing ? 'Following the page you read' : 'Follow the page you read'}
          onClick={() => {
            setIsFollowing(true);
            setPage(followPage);
          }}
        >
          <FollowIcon />
        </button>
        <button
          type="button"
          title="Smaller text (⌘ −)"
          disabled={zoom <= MIN_ZOOM}
          onClick={() => changeZoom(-ZOOM_STEP)}
        >
          <MinusIcon />
        </button>
        <button
          type="button"
          title="Bigger text (⌘ +)"
          disabled={zoom >= MAX_ZOOM}
          onClick={() => changeZoom(ZOOM_STEP)}
        >
          <PlusIcon />
        </button>
        <button
          type="button"
          title="Open this page in Quran.com"
          onClick={() => onOpenInReader(page)}
        >
          <OpenIcon />
        </button>
      </div>
    </div>
  );
};

export default MiniMushafPage;
