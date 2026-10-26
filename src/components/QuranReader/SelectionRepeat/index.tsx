/* eslint-disable i18next/no-literal-string */ // added in the old-Quran.com clone, English only
import React, { useCallback, useContext, useEffect, useState } from 'react';

import { useSelector } from '@xstate/react';

import styles from './SelectionRepeat.module.scss';

import { DATA_ATTRIBUTE_WORD_LOCATION } from '@/dls/QuranWord/QuranWord';
import RepeatIcon from '@/icons/repeat.svg';
import StopIcon from '@/icons/stop.svg';
import { AudioPlayerMachineContext } from 'src/xstate/AudioPlayerMachineContext';

type SelectedRange = { surah: number; from: number; to: number; top: number; left: number };

const BUTTON_OFFSET = 10;
const EDGE_MARGIN = 80;

const parseVerseKey = (key: string) => {
  const [surah, verse] = key.split(':').map(Number);
  return { surah, verse };
};

/**
 * The verse keys a selection touches: Arabic words carry `data-word-location` ("2:255:3");
 * for a selection inside a translation, use the verse whose cell holds it.
 *
 * @param {Selection} selection
 * @returns {string[]}
 */
const getSelectedVerseKeys = (selection: Selection): string[] => {
  const keys = Array.from(document.querySelectorAll(`[${DATA_ATTRIBUTE_WORD_LOCATION}]`))
    .filter((node) => selection.containsNode(node, true))
    .map((node) =>
      node.getAttribute(DATA_ATTRIBUTE_WORD_LOCATION).split(':').slice(0, 2).join(':'),
    );
  [selection.anchorNode, selection.focusNode].forEach((node) => {
    let element = node instanceof Element ? node : node?.parentElement;
    while (element && element !== document.body) {
      const verses = element.querySelectorAll('[data-verse-key]');
      if (verses.length === 1) {
        keys.push(verses[0].getAttribute('data-verse-key'));
        break;
      }
      if (verses.length > 1) break; // walked up past a single verse's cell
      element = element.parentElement;
    }
  });
  return keys;
};

const getSelectedRange = (): SelectedRange | null => {
  const selection = document.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) return null;
  const verses = getSelectedVerseKeys(selection).map(parseVerseKey);
  if (!verses.length) return null;
  // the repeat player loops within one surah; use the surah the selection starts in
  const surah = Math.min(...verses.map((verse) => verse.surah));
  const numbers = verses.filter((verse) => verse.surah === surah).map((verse) => verse.verse);
  const rect = selection.getRangeAt(0).getBoundingClientRect();
  return {
    surah,
    from: Math.min(...numbers),
    to: Math.max(...numbers),
    top: Math.min(rect.bottom + BUTTON_OFFSET, window.innerHeight - EDGE_MARGIN),
    left: Math.min(
      Math.max(rect.left + rect.width / 2, EDGE_MARGIN),
      window.innerWidth - EDGE_MARGIN,
    ),
  };
};

/**
 * Select ayat with the mouse and a "Loop" button appears next to the selection;
 * one click repeats that range until it's stopped.
 *
 * @returns {JSX.Element}
 */
const SelectionRepeat = () => {
  const audioService = useContext(AudioPlayerMachineContext);
  const isRepeating = useSelector(audioService, (state) => !!state.context.repeatActor);
  const [range, setRange] = useState<SelectedRange | null>(null);

  const updateRange = useCallback(() => {
    // let the browser finish updating the selection first
    setTimeout(() => setRange(getSelectedRange()), 0);
  }, []);

  useEffect(() => {
    const hideIfCleared = () => {
      if (document.getSelection()?.isCollapsed) setRange(null);
    };
    document.addEventListener('mouseup', updateRange);
    document.addEventListener('keyup', updateRange);
    document.addEventListener('touchend', updateRange);
    document.addEventListener('selectionchange', hideIfCleared);
    window.addEventListener('scroll', updateRange, { passive: true });
    return () => {
      document.removeEventListener('mouseup', updateRange);
      document.removeEventListener('keyup', updateRange);
      document.removeEventListener('touchend', updateRange);
      document.removeEventListener('selectionchange', hideIfCleared);
      window.removeEventListener('scroll', updateRange);
    };
  }, [updateRange]);

  const stopLoop = useCallback(
    () => audioService.send({ type: 'REPEAT_FINISHED' }),
    [audioService],
  );

  // Esc stops a running loop
  useEffect(() => {
    if (!isRepeating) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') stopLoop();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isRepeating, stopLoop]);

  const startLoop = () => {
    audioService.send({
      type: 'SET_REPEAT_SETTING',
      surah: range.surah,
      from: range.from,
      to: range.to,
      repeatRange: Infinity,
      repeatEachVerse: 1,
      delayMultiplier: 0,
    });
    document.getSelection()?.removeAllRanges();
    setRange(null);
  };

  // keep the selection alive while clicking the button
  const keepSelection = (event: React.MouseEvent) => event.preventDefault();

  if (range) {
    const label =
      range.from === range.to
        ? `Loop ${range.surah}:${range.from}`
        : `Loop ${range.surah}:${range.from}–${range.to}`;
    return (
      <button
        type="button"
        className={styles.pill}
        style={{ top: range.top, left: range.left }}
        onMouseDown={keepSelection}
        onClick={startLoop}
      >
        <RepeatIcon />
        {label}
      </button>
    );
  }

  if (isRepeating) {
    return (
      <button type="button" className={`${styles.pill} ${styles.stop}`} onClick={stopLoop}>
        <StopIcon />
        Stop loop <kbd>Esc</kbd>
      </button>
    );
  }

  return null;
};

export default SelectionRepeat;
