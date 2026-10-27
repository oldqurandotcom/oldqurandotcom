/* eslint-disable react/no-multi-comp */
import React from 'react';

import classNames from 'classnames';
import useTranslation from 'next-translate/useTranslation';
import Head from 'next/head';
import { shallowEqual, useSelector } from 'react-redux';

import ContextMenu from './ContextMenu';
import { VerseTrackerContextProvider } from './contexts/VerseTrackerContext';
import DebuggingObserverWindow from './DebuggingObserverWindow';
import Notes from './Notes/Notes';
import styles from './QuranReader.module.scss';
import QuranReaderView from './QuranReaderView';
import { RiwayahProvider } from './Riwayah/RiwayahContext';
import SelectionRepeat from './SelectionRepeat';
import SidebarNavigation from './SidebarNavigation/SidebarNavigation';

import FontPreLoader from '@/components/Fonts/FontPreLoader';
import useFontSizeShortcuts from '@/hooks/useFontSizeShortcuts';
import { selectNotes } from '@/redux/slices/QuranReader/notes';
import { selectReadingPreference } from '@/redux/slices/QuranReader/readingPreferences';
import { selectIsSidebarNavigationVisible } from '@/redux/slices/QuranReader/sidebarNavigation';
import { selectQuranReaderStyles } from '@/redux/slices/QuranReader/styles';
import { getQcfFontWoff2Url, isQCFFont } from '@/utils/fontFaceHelper';
import { VersesResponse } from 'types/ApiResponses';
import { QuranFont, QuranReaderDataType, ReadingPreference } from 'types/QuranReader';

type QuranReaderProps = {
  initialData: VersesResponse;
  id: number | string; // can be the chapter, verse, tafsir, hizb, juz, rub or page's ID.
  quranReaderDataType?: QuranReaderDataType;
};

const QuranReader = ({
  initialData,
  id,
  quranReaderDataType = QuranReaderDataType.Chapter,
}: QuranReaderProps) => {
  const { lang } = useTranslation();
  const isSideBarVisible = useSelector(selectNotes, shallowEqual).isVisible;
  const quranReaderStyles = useSelector(selectQuranReaderStyles, shallowEqual);
  const isSidebarNavigationVisible = useSelector(selectIsSidebarNavigationVisible);
  const readingPreference = useSelector(selectReadingPreference) as ReadingPreference;
  const isReadingPreference = readingPreference === ReadingPreference.Reading;
  useFontSizeShortcuts();

  const firstPage = initialData.verses[0]?.pageNumber;
  return (
    <RiwayahProvider>
      {isQCFFont(quranReaderStyles.quranFont) && firstPage && (
        <Head>
          {/* start the first page's font with the page itself, not after its verses load */}
          <link
            rel="preload"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
            href={getQcfFontWoff2Url(quranReaderStyles.quranFont === QuranFont.MadaniV1, firstPage)}
          />
        </Head>
      )}
      <FontPreLoader isQuranReader locale={lang} />
      <ContextMenu />
      <DebuggingObserverWindow isReadingMode={isReadingPreference} />
      <div
        className={classNames(styles.container, {
          [styles.withVisibleSideBar]: isSideBarVisible,
          [styles.withSidebarNavigationOpenOrAuto]: isSidebarNavigationVisible,
        })}
      >
        <div
          className={classNames(styles.infiniteScroll, {
            [styles.readingView]: isReadingPreference,
          })}
        >
          <VerseTrackerContextProvider>
            <QuranReaderView
              isReadingPreference={isReadingPreference}
              quranReaderStyles={quranReaderStyles}
              initialData={initialData}
              quranReaderDataType={quranReaderDataType}
              resourceId={id}
            />
          </VerseTrackerContextProvider>
        </div>
      </div>
      <SidebarNavigation />
      <Notes />
      <SelectionRepeat />
    </RiwayahProvider>
  );
};

export default QuranReader;
