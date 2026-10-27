/* eslint-disable jsdoc/check-tag-names */
/* eslint-disable react-func/max-lines-per-function */
/* eslint-disable import/prefer-default-export */
import { ActorRefFrom, assign, createMachine, spawn } from 'xstate';
import { forwardTo, pure, send, sendParent } from 'xstate/lib/actions';

import { createRangeCycleMachine } from '../rangeCycle/rangeCycleMachine';

import trimToWords from './trimToWords';

export const createRepeatMachine = ({
  totalRangeCycle,
  totalVerseCycle,
  verseTimings,
  fromVerseNumber,
  toVerseNumber,
  delayMultiplier,
  fromWord = null,
  toWord = null,
}) =>
  /** @xstate-layout N4IgpgJg5mDOIC5QCcwAcwEMAuBZTAxgBYCWAdmAHTkAKyA9lKrLAMQT0XVkBu9A1lWSYyMAMIBPAgBsw+YuTCJQaerBLYSnZSAAeiACwGAzJQAcARgAMAVmMWzATmOOrZswBoQExNceVHdwB2CwsbCwMguwA2AF94rzJ6CDgdVAwceVIuWgYmOHgkEFV1TW0i-QQrLx8EaLjYr3SsPEJsqgAzchJYIkgdEo0tMh1Kg0cLSisAJgMbRyC3aKsgoLmaxGMzA0pohetZ6LszNZsEkGbMtsUBtSHy0EqAWlmNhCfogLMbOZsbbbszlm8XiQA */
  createMachine(
    {
      context: {
        ...trimToWords(verseTimings, { fromVerseNumber, toVerseNumber, fromWord, toWord }),
        fromVerseNumber,
        toVerseNumber,
        delayMultiplier,
        repeatSettings: {
          totalRangeCycle,
          totalVerseCycle,
        },
        rangeCycleActor: null as ActorRefFrom<ReturnType<typeof createRangeCycleMachine>>,
      },
      tsTypes: {} as import('./repeatMachine.typegen').Typegen0,
      id: 'repeatMachine',
      initial: 'inProgress',
      states: {
        inProgress: {
          entry: 'spawnRangeCycleActor',
          on: {
            UPDATE_VERSE_TIMINGS: {
              actions: 'updateVerseTimings',
            },
            TIMESTAMP_UPDATED: {
              actions: 'forwardToRangeCycleActor',
            },
            REPEAT_AYAH: {
              actions: 'repeatAyah',
            },
            RANGE_REPEAT_FINISHED: {
              target: 'finished',
            },
            REPEAT_NEXT_AYAH: {
              actions: 'repeatNextAyah',
            },
            REPEAT_PREV_AYAH: {
              actions: 'repeatPreviousAyah',
            },
            REPEAT_SELECTED_AYAH: [
              {
                cond: 'selectedAyahIsNotInRange',
                target: 'finished',
              },
              {
                actions: 'repeatSelectedAyah',
              },
            ],
          },
        },
        finished: {
          type: 'final',
          entry: 'sendRepeatFinished',
        },
      },
    },
    {
      guards: {
        selectedAyahIsNotInRange: (context, event: any) => {
          const { ayahNumber } = event;
          return ayahNumber < fromVerseNumber || ayahNumber > toVerseNumber;
        },
      },
      actions: {
        repeatSelectedAyah: pure((context, event: any) => {
          return send(
            { type: 'REPEAT_SELECTED_AYAH', ayahNumber: event.ayahNumber },
            { to: context.rangeCycleActor.id },
          );
        }),
        repeatNextAyah: pure(() => {
          return send({ type: 'REPEAT_NEXT_AYAH' }, { to: (context) => context.rangeCycleActor });
        }),
        repeatPreviousAyah: pure(() => {
          return send({ type: 'REPEAT_PREV_AYAH' }, { to: (context) => context.rangeCycleActor });
        }),
        sendRepeatFinished: sendParent({ type: 'REPEAT_FINISHED' }),
        repeatAyah: pure((context, event: any) => {
          const verseDelay = event.verseDuration * context.delayMultiplier;
          // with no pause between ayat, let the recitation flow into the next ayah: pausing and
          // seeking to its start clips or replays a sliver of audio at every boundary
          if (event.isContinuation && !verseDelay) {
            return sendParent({ type: 'SYNC_REPEAT_AYAH', ayahNumber: event.verseNumber });
          }
          return sendParent({
            type: 'REPEAT_AYAH',
            ayahNumber: event.verseNumber,
            verseDelay,
            // differs from the ayah's own start when the loop starts mid-ayah
            timestampFrom: context.verseTimings[event.verseNumber - 1].timestampFrom,
          });
        }),
        forwardToRangeCycleActor: forwardTo((context) => {
          return context.rangeCycleActor;
        }),
        updateVerseTimings: pure((context, event: any) => {
          const trimmed = trimToWords(event.verseTimings, {
            fromVerseNumber,
            toVerseNumber,
            fromWord,
            toWord,
          });
          return [
            assign(trimmed),
            send(
              { type: 'UPDATE_VERSE_TIMINGS', verseTimings: trimmed.verseTimings },
              { to: context.rangeCycleActor.id },
            ),
          ];
        }),
        spawnRangeCycleActor: assign({
          rangeCycleActor: (context) => {
            return spawn(
              createRangeCycleMachine({
                totalRangeCycle: context.repeatSettings.totalRangeCycle,
                totalVerseCycle: context.repeatSettings.totalVerseCycle,
                verseTimings: context.verseTimings,
                fromVerseNumber: context.fromVerseNumber,
                toVerseNumber: context.toVerseNumber,
              }),
            );
          },
        }),
      },
    },
  );
