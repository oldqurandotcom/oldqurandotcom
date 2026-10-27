/* eslint-disable i18next/no-literal-string */ // added in the old-Quran.com clone, English only
import React, { useCallback, useContext, useEffect, useState } from 'react';

import { useSelector } from '@xstate/react';

import { getLoopLabel, getSelectedRange, SelectedRange } from './selection';
import styles from './SelectionRepeat.module.scss';

import RepeatIcon from '@/icons/repeat.svg';
import StopIcon from '@/icons/stop.svg';
import { AudioPlayerMachineContext } from 'src/xstate/AudioPlayerMachineContext';

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

  // timeupdate only fires every ~250ms; check every frame so a loop that ends mid-ayah stops
  // right after its last word instead of running into the next one
  useEffect(() => {
    if (!isRepeating) return undefined;
    let frame: number;
    let isArmed = true;
    const check = () => {
      const { audioPlayer, repeatActor } = audioService.state.context;
      const loopEnd = repeatActor?.getSnapshot()?.context.loopEndTimestamp;
      if (loopEnd && audioPlayer && !audioPlayer.paused) {
        const isPastEnd = audioPlayer.currentTime * 1000 >= loopEnd;
        if (isPastEnd && isArmed) audioService.send({ type: 'UPDATE_TIMING' });
        isArmed = !isPastEnd;
      }
      frame = requestAnimationFrame(check);
    };
    frame = requestAnimationFrame(check);
    return () => cancelAnimationFrame(frame);
  }, [isRepeating, audioService]);

  const startLoop = () => {
    audioService.send({
      type: 'SET_REPEAT_SETTING',
      surah: range.surah,
      from: range.from,
      to: range.to,
      repeatRange: Infinity,
      repeatEachVerse: 1,
      delayMultiplier: 0,
      fromWord: range.fromWord,
      toWord: range.toWord,
    });
    document.getSelection()?.removeAllRanges();
    setRange(null);
  };

  // keep the selection alive while clicking the button
  const keepSelection = (event: React.MouseEvent) => event.preventDefault();

  if (range) {
    return (
      <button
        type="button"
        className={styles.pill}
        style={{ top: range.top, left: range.left }}
        onMouseDown={keepSelection}
        onClick={startLoop}
      >
        <RepeatIcon />
        {getLoopLabel(range)}
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
