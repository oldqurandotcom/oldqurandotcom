/* eslint-disable i18next/no-literal-string */ // added in the old-Quran.com clone, English only
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/router';
import ReactDOM from 'react-dom';
import { shallowEqual, useSelector } from 'react-redux';

import MiniMushafPage, { MiniMushafColors } from './MiniMushafPage';
import MINI_MUSHAF_CSS from './styles';

import Button, { ButtonShape, ButtonVariant } from '@/dls/Button/Button';
import { ToastStatus, useToast } from '@/dls/Toast/Toast';
import PictureInPictureIcon from '@/icons/picture-in-picture.svg';
import { selectLastReadVerseKey } from '@/redux/slices/QuranReader/readingTracker';
import { selectQuranReaderStyles } from '@/redux/slices/QuranReader/styles';
import { selectTheme } from '@/redux/slices/theme';
import { getChapterData } from '@/utils/chapter';
import DataContext from 'src/contexts/DataContext';
import { QuranFont } from 'types/QuranReader';

const WINDOW_SIZE = { width: 360, height: 580 };

// Document Picture-in-Picture: an always-on-top window that stays visible over other tabs and apps.
type DocumentPictureInPicture = {
  requestWindow: (options: { width: number; height: number }) => Promise<Window>;
};
const getDocumentPictureInPicture = (): DocumentPictureInPicture | undefined =>
  typeof window === 'undefined' ? undefined : (window as any).documentPictureInPicture;

const readThemeColors = (): MiniMushafColors => {
  const styles = getComputedStyle(document.body);
  const cssVar = (name: string, fallback: string) =>
    styles.getPropertyValue(name).trim() || fallback;
  return {
    bg: cssVar('--color-background-default', '#fff'),
    text: cssVar('--color-text-default', '#000'),
    faded: cssVar('--color-text-faded', '#666'),
    border: cssVar('--color-borders-hairline', '#ddd'),
    accent: cssVar('--color-success-medium', '#2ca4ab'),
    hover: cssVar('--color-background-alternative-faded', 'rgba(0,0,0,.06)'),
    bar: cssVar('--color-background-elevated', '#fff'),
  };
};

const MiniMushafButton = () => {
  const router = useRouter();
  const toast = useToast();
  const chaptersData = useContext(DataContext);
  const { page } = useSelector(selectLastReadVerseKey, shallowEqual);
  const { quranFont } = useSelector(selectQuranReaderStyles, shallowEqual);
  const theme = useSelector(selectTheme, shallowEqual);
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // the last page read, so the mini mushaf has something to show outside the reader too
  const lastPageRef = useRef(1);
  if (page) lastPageRef.current = Number(page);

  const openWindow = useCallback(async () => {
    const documentPictureInPicture = getDocumentPictureInPicture();
    if (!documentPictureInPicture) {
      toast('The Mini Mushaf needs Chrome, Edge, Brave or Arc on a computer.', {
        status: ToastStatus.Warning,
      });
      return;
    }
    const win = await documentPictureInPicture.requestWindow(WINDOW_SIZE);
    const style = win.document.createElement('style');
    style.textContent = MINI_MUSHAF_CSS;
    win.document.head.append(style);
    win.document.title = 'Mini Mushaf';
    const container = win.document.createElement('div');
    container.id = 'root';
    win.document.body.append(container);
    win.addEventListener('pagehide', () => {
      ReactDOM.unmountComponentAtNode(container);
      containerRef.current = null;
      setPipWindow(null);
    });
    containerRef.current = container;
    setPipWindow(win);
  }, [toast]);

  const onClick = () => {
    if (pipWindow) pipWindow.close();
    else openWindow().catch(() => undefined);
  };

  // Chrome can open the window by itself when you switch tabs while a recitation is playing
  useEffect(() => {
    if (!getDocumentPictureInPicture() || !('mediaSession' in navigator)) return undefined;
    try {
      navigator.mediaSession.setActionHandler('enterpictureinpicture' as MediaSessionAction, () => {
        if (!containerRef.current) openWindow().catch(() => undefined);
      });
    } catch {
      return undefined; // this browser doesn't know the action
    }
    return () => {
      try {
        navigator.mediaSession.setActionHandler(
          'enterpictureinpicture' as MediaSessionAction,
          null,
        );
      } catch {
        // nothing to clean up
      }
    };
  }, [openWindow]);

  // the window is its own React root; re-render it whenever what it shows changes
  useEffect(() => {
    if (!pipWindow || !containerRef.current) return;
    ReactDOM.render(
      <MiniMushafPage
        win={pipWindow}
        followPage={lastPageRef.current}
        isV1={quranFont !== QuranFont.MadaniV2}
        colors={readThemeColors()}
        getChapterName={(chapterId) =>
          getChapterData(chaptersData, String(chapterId))?.transliteratedName ?? ''
        }
        onOpenInReader={(pageNumber) => router.push(`/page/${pageNumber}`)}
      />,
      containerRef.current,
    );
  }, [pipWindow, page, quranFont, theme, chaptersData, router]);

  return (
    <Button
      tooltip={pipWindow ? 'Close Mini Mushaf' : 'Mini Mushaf: keep this page on top of other tabs'}
      shape={ButtonShape.Circle}
      variant={ButtonVariant.Ghost}
      onClick={onClick}
      ariaLabel="Mini Mushaf"
    >
      <PictureInPictureIcon />
    </Button>
  );
};

export default MiniMushafButton;
