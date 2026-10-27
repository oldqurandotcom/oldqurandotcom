import React, { useRef } from 'react';

import classNames from 'classnames';

import getSurahHeaderGlyph from '../MushafPage/surahHeaderGlyphs';
import PageFooter from '../PageFooter';
import { getPageFirstVerseKey, getPageHizb } from '../pageIndex';

import styles from './QalunPage.module.scss';

import { QURAN_READER_OBSERVER_ID } from '@/components/QuranReader/observer';
import useObserveElement from '@/hooks/useObserveElement';

// One line of KFGQPC's Qalun typesetting (public/qalun/pages/<page>.json): [kind, text, align];
// kind "s" surah title (text = its number), "b" basmala, "t" ayah text; align "j" justified,
// "r" start-aligned (a surah's last line), "c" centred. See scripts/qalun.
export type QalunLine = [string, string, string];

const LINES_PER_PAGE = 15;

type ContentProps = {
  pageNumber: number;
  // the first ayah of the surah or juz being read on this page (Hafs numbering), if it's on it
  verseKey?: string;
  lines: QalunLine[];
};

/**
 * The drawn page. Like a Hafs verse, it tells the reader which surah, juz, hizb and page are being
 * read (the bar at the top, reading history) when it scrolls into view.
 *
 * @returns {JSX.Element}
 */
const QalunPageContent = ({ pageNumber, verseKey, lines }: ContentProps) => {
  const ref = useRef<HTMLDivElement>(null);
  // a facing page from outside the surah or juz being read (no verseKey) doesn't report
  useObserveElement(verseKey ? ref : null, QURAN_READER_OBSERVER_ID);
  const pageVerseKey = verseKey ?? getPageFirstVerseKey(pageNumber);

  return (
    <div id={`page-${pageNumber}`} className={styles.page} data-qalun-page={pageNumber}>
      {/* reports through a marker over its top third: a whole page is too tall to ever be 10%
          inside the band the reader watches */}
      <div
        ref={ref}
        className={styles.pageMarker}
        aria-hidden
        data-verse-key={pageVerseKey}
        data-chapter-id={pageVerseKey.split(':')[0]}
        data-page={pageNumber}
        data-hizb={getPageHizb(pageNumber)}
      />
      <div
        className={styles.lines}
        style={{ gridTemplateRows: `repeat(${LINES_PER_PAGE}, var(--qalun-line-height))` }}
      >
        {lines.map(([kind, text, align], index) => {
          const key = `${pageNumber}-${index}`;
          // the first two pages' 8 lines sit in the middle of the page, as in the Hafs view
          const style = { gridRow: index + 1 + Math.floor((LINES_PER_PAGE - lines.length) / 2) };
          if (kind === 's') {
            return (
              <div key={key} className={styles.decoratedLine} style={style}>
                <div
                  className={styles.surahHeader}
                  data-surah={text}
                  role="img"
                  aria-label={`Surah ${text}`}
                  translate="no"
                >
                  {getSurahHeaderGlyph(Number(text))}
                </div>
              </div>
            );
          }
          if (align === 'j') {
            // justified as printed: the line's spare width goes evenly between its words
            return (
              <div key={key} className={classNames(styles.line, styles.justified)} style={style}>
                {text.split(' ').map((word, wordIndex) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <span key={wordIndex}>{word}</span>
                ))}
              </div>
            );
          }
          return (
            <div
              key={key}
              className={classNames(styles.line, align === 'c' ? styles.centred : styles.start)}
              style={style}
            >
              {text}
            </div>
          );
        })}
      </div>
      <PageFooter page={pageNumber} />
    </div>
  );
};

/**
 * A page of the Qalun 'an Nafi' mushaf (added in the old-Quran.com clone), line for line as
 * KFGQPC typeset it. It's as wide as the reader's --line-width, like a Hafs page, and its text is
 * sized from that width at the print's proportions, so Cmd +/- and the two-page view resize it
 * the same way.
 *
 * @returns {JSX.Element}
 */

export default QalunPageContent;
