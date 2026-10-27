/* eslint-disable i18next/no-literal-string */ // added in the old-Quran.com clone, English only
import { DATA_ATTRIBUTE_AYAH_END, DATA_ATTRIBUTE_WORD_LOCATION } from '@/dls/QuranWord/QuranWord';

export type SelectedRange = {
  surah: number;
  from: number;
  to: number;
  // word positions when the selection starts or stops mid-ayah
  fromWord?: number;
  toWord?: number;
  top: number;
  left: number;
};

const BUTTON_OFFSET = 10;
const EDGE_MARGIN = 80;

const parseVerseKey = (key: string) => {
  const [surah, verse] = key.split(':').map(Number);
  return { surah, verse };
};

/**
 * Whether the selection covers some of the element's text. A selection that only touches the
 * element's edge (as a drag starting just after the previous word often does) doesn't count,
 * though the browser reports it as partly containing the element.
 *
 * @param {Selection} selection
 * @param {Element} element
 * @returns {boolean}
 */
const selectsTextOf = (selection: Selection, element: Element) => {
  if (!selection.containsNode(element, true)) return false;
  const range = selection.getRangeAt(0);
  const overlap = document.createRange();
  overlap.selectNodeContents(element);
  if (range.compareBoundaryPoints(Range.START_TO_START, overlap) > 0) {
    overlap.setStart(range.startContainer, range.startOffset);
  }
  if (range.compareBoundaryPoints(Range.END_TO_END, overlap) < 0) {
    overlap.setEnd(range.endContainer, range.endOffset);
  }
  return overlap.toString().trim() !== '';
};

/**
 * The verse keys a selection covers: those of its Arabic words, plus, for a selection that
 * starts or ends inside a translation, the verse whose cell holds it.
 *
 * @param {Selection} selection
 * @param {number[][]} words
 * @returns {string[]}
 */
const getSelectedVerseKeys = (selection: Selection, words: number[][]): string[] => {
  const keys = words.map(([surah, verse]) => `${surah}:${verse}`);
  [selection.anchorNode, selection.focusNode].forEach((node) => {
    let element = node instanceof Element ? node : node?.parentElement;
    if (element?.closest(`[${DATA_ATTRIBUTE_WORD_LOCATION}]`)) return; // an Arabic word, counted above
    while (element && element !== document.body) {
      const verses = element.querySelectorAll('[data-verse-key]');
      if (verses.length === 1) {
        if (selectsTextOf(selection, element)) keys.push(verses[0].getAttribute('data-verse-key'));
        break;
      }
      if (verses.length > 1) break; // walked up past a single verse's cell
      element = element.parentElement;
    }
  });
  return keys;
};

const wordSelector = (location: string) =>
  `[${DATA_ATTRIBUTE_WORD_LOCATION}="${location}"]:not([${DATA_ATTRIBUTE_AYAH_END}])`;

/**
 * The Arabic words the selection covers (ayah-number markers aside), as
 * [surah, verse, word] numbers, in reading order.
 *
 * @param {Selection} selection
 * @returns {number[][]}
 */
const getSelectedWords = (selection: Selection): number[][] =>
  Array.from(document.querySelectorAll(`[${DATA_ATTRIBUTE_WORD_LOCATION}]`))
    .filter((node) => !node.hasAttribute(DATA_ATTRIBUTE_AYAH_END))
    .filter((node) => selectsTextOf(selection, node))
    .map((node) => node.getAttribute(DATA_ATTRIBUTE_WORD_LOCATION).split(':').map(Number))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2]);

/**
 * The word positions to start and stop on, unless the selection covers its first/last ayah whole.
 *
 * @returns {{ fromWord?: number, toWord?: number }}
 */
const getWordBounds = (allWords: number[][], surah: number, from: number, to: number) => {
  const words = allWords.filter(([wordSurah]) => wordSurah === surah);
  const first = words[0];
  const last = words[words.length - 1];
  const isLastWordOfAyah =
    last && !document.querySelector(wordSelector(`${surah}:${to}:${last[2] + 1}`));
  return {
    fromWord: first && first[1] === from && first[2] > 1 ? first[2] : undefined,
    toWord: last && last[1] === to && !isLastWordOfAyah ? last[2] : undefined,
  };
};

export const getSelectedRange = (): SelectedRange | null => {
  const selection = document.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
  const words = getSelectedWords(selection);
  const verses = getSelectedVerseKeys(selection, words).map(parseVerseKey);
  if (!verses.length) return null;
  // the repeat player loops within one surah; use the surah the selection starts in
  const surah = Math.min(...verses.map((verse) => verse.surah));
  const numbers = verses.filter((verse) => verse.surah === surah).map((verse) => verse.verse);
  const from = Math.min(...numbers);
  const to = Math.max(...numbers);
  const { fromWord, toWord } = getWordBounds(words, surah, from, to);
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  return {
    surah,
    from,
    to,
    fromWord,
    toWord,
    top: Math.min(rect.bottom + BUTTON_OFFSET, window.innerHeight - EDGE_MARGIN),
    left: Math.min(
      Math.max(rect.left + rect.width / 2, EDGE_MARGIN),
      window.innerWidth - EDGE_MARGIN,
    ),
  };
};

/**
 * "Loop 2:255–257", or with words "Loop 2:255:3–7" and "Loop 2:255:3–256:end".
 *
 * @param {SelectedRange} range
 * @returns {string}
 */
export const getLoopLabel = ({ surah, from, to, fromWord, toWord }: SelectedRange) => {
  const isMidAyah = !!(fromWord || toWord);
  const startWord = fromWord || 1;
  const endWord = toWord || 'end';
  let label = `Loop ${surah}:${from}${isMidAyah ? `:${startWord}` : ''}`;
  if (from !== to) label += isMidAyah ? `–${to}:${endWord}` : `–${to}`;
  else if (isMidAyah && endWord !== startWord) label += `–${endWord}`;
  return label;
};
