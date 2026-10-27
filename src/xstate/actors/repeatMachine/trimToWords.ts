import { VERSE_END_BUFFER } from '../verseCycle/verseCycleMachine';

import VerseTiming from 'types/VerseTiming';

/**
 * The start and end (ms) of one word, by ayah number and word position, or null when the
 * recitation has no timing for it.
 *
 * @param {VerseTiming[]} verseTimings
 * @param {number} verseNumber
 * @param {number} wordPosition
 * @returns {number[] | null}
 */
export const getWordTimestamps = (
  verseTimings: VerseTiming[],
  verseNumber: number,
  wordPosition: number,
) => {
  // each segment is [wordPosition, timestampFrom, timestampTo]
  const segment = verseTimings[verseNumber - 1]?.segments?.find(
    ([position]) => position === wordPosition,
  );
  if (!segment || segment.length < 3) return null;
  return [segment[1], segment[2]];
};

/**
 * A loop that starts or stops mid-ayah: narrow the first ayah to start at `fromWord` and the
 * last to end after `toWord`, so the range and verse cycle machines loop just those words.
 *
 * @returns {{ verseTimings: VerseTiming[], loopEndTimestamp: number | null }}
 */
const trimToWords = (
  verseTimings: VerseTiming[],
  { fromVerseNumber, toVerseNumber, fromWord, toWord },
) => {
  const start = fromWord && getWordTimestamps(verseTimings, fromVerseNumber, fromWord);
  const end = toWord && getWordTimestamps(verseTimings, toVerseNumber, toWord);
  if (!start && !end) return { verseTimings, loopEndTimestamp: null };
  const trimmed = [...verseTimings];
  if (start) {
    trimmed[fromVerseNumber - 1] = { ...trimmed[fromVerseNumber - 1], timestampFrom: start[0] };
  }
  if (end) {
    // the verse cycle stops VERSE_END_BUFFER before timestampTo, so add it back to keep the word whole
    trimmed[toVerseNumber - 1] = {
      ...trimmed[toVerseNumber - 1],
      timestampTo: end[1] + VERSE_END_BUFFER,
    };
  }
  return { verseTimings: trimmed, loopEndTimestamp: end ? end[1] : null };
};

export default trimToWords;
