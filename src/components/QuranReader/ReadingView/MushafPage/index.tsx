import React, { useMemo } from 'react';

import classNames from 'classnames';

import Line from '../Line';
import PageFooter from '../PageFooter';

import styles from './MushafPage.module.scss';
import getSurahHeaderGlyph from './surahHeaderGlyphs';
import { MushafPageLines } from './useMushafLines';

import Bismillah from '@/dls/Bismillah/Bismillah';
import QuranReaderStyles from '@/redux/types/QuranReaderStyles';
import { getVerseWords } from '@/utils/verse';
import Verse from 'types/Verse';
import Word from 'types/Word';

type Props = {
  verses: Verse[];
  pageNumber: number;
  lines: MushafPageLines;
  quranReaderStyles: QuranReaderStyles;
  pageIndex: number;
};

const isAyahLine = (entry: string) => entry[0] === 'a' || entry[0] === 'c';

/**
 * The words of each ayah line, by line index.
 *
 * @param {Word[]} words the page's words in reading order
 * @param {MushafPageLines} lines
 * @returns {Record<number, Word[]>}
 */
const placeWords = (words: Word[], lines: MushafPageLines): Record<number, Word[]> => {
  const placed: Record<number, Word[]> = {};
  const ayahLines = lines.map((entry, index) => index).filter((index) => isAyahLine(lines[index]));
  if (lines.some((entry) => entry.includes('@'))) {
    // the layout names each line's first word
    const lineByFirstWord = Object.fromEntries(
      ayahLines.map((index) => [lines[index].split('@')[1], index]),
    );
    let current = ayahLines[0];
    words.forEach((word) => {
      current = lineByFirstWord[word.location] ?? current;
      (placed[current] = placed[current] || []).push(word);
    });
    return placed;
  }
  // the k-th line number the API uses on this page is the k-th ayah line of the layout
  const apiLines = Array.from(new Set(words.map((word) => word.lineNumber))).sort((a, b) => a - b);
  words.forEach((word) => {
    const index = ayahLines[apiLines.indexOf(word.lineNumber)];
    if (index !== undefined) (placed[index] = placed[index] || []).push(word);
  });
  return placed;
};

/**
 * A complete mushaf page (added in the old-Quran.com clone for the two-page view): every line
 * sits on its own line of the printed page, with the surah names and Bismillah where the print
 * has them, and all lines the same height.
 *
 * @returns {JSX.Element}
 */
const MushafPage = ({ verses, pageNumber, lines, quranReaderStyles, pageIndex }: Props) => {
  const lineWords = useMemo(
    () =>
      placeWords(
        verses.flatMap((verse) => getVerseWords(verse, true)),
        lines,
      ),
    [verses, lines],
  );
  // Al-Fatiha and the start of Al-Baqarah sit in the middle of their pages
  const emptyAtEnd = lines.length - 1 - lines.map(Boolean).lastIndexOf(true);
  const offset = Math.floor(emptyAtEnd / 2);

  return (
    <div id={`page-${pageNumber}`} className={styles.page}>
      <div className={styles.lines} style={{ gridTemplateRows: `repeat(${lines.length}, 1fr)` }}>
        {lines.map((entry, index) => {
          const key = `${pageNumber}-${index}`;
          const row = index + 1 + offset;
          if (row > lines.length) return null; // empty lines pushed past the end by the centring
          const style = { gridRow: row };
          if (isAyahLine(entry)) {
            const words = lineWords[index];
            return (
              <div key={key} className={styles.line} style={style}>
                {words?.length > 0 && (
                  <Line
                    lineKey={`Page${pageNumber}-Line${index + 1}`}
                    words={words}
                    isBigTextLayout={false}
                    quranReaderStyles={quranReaderStyles}
                    pageIndex={pageIndex}
                    lineIndex={index}
                    isMushafLayout
                    isCentered={entry[0] === 'c'}
                  />
                )}
              </div>
            );
          }
          if (entry[0] === 's') {
            const chapterId = entry.replace(/\D/g, '');
            return (
              <div
                key={key}
                className={classNames(styles.decoratedLine, {
                  [styles.withBismillah]: entry.endsWith('b'),
                })}
                style={style}
              >
                <div
                  className={styles.surahHeader}
                  data-chapter-id={chapterId}
                  role="img"
                  aria-label={`Surah ${chapterId}`}
                  translate="no"
                >
                  {getSurahHeaderGlyph(Number(chapterId))}
                </div>
                {entry.endsWith('b') && (
                  <div className={styles.bismillah}>
                    <Bismillah />
                  </div>
                )}
              </div>
            );
          }
          if (entry === 'b') {
            return (
              <div key={key} className={styles.decoratedLine} style={style}>
                <div className={styles.bismillah}>
                  <Bismillah />
                </div>
              </div>
            );
          }
          return <div key={key} style={style} />;
        })}
      </div>
      <PageFooter page={pageNumber} />
    </div>
  );
};

export default MushafPage;
