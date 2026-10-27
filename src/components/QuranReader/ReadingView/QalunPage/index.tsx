import React from 'react';

import useSWRImmutable from 'swr/immutable';

import ReadingViewSkeleton from '../ReadingViewSkeleton';

import QalunPageContent, { QalunLine } from './QalunPageContent';
import useQalunFont from './useQalunFont';

const fetchPage = (url: string): Promise<QalunLine[]> => fetch(url).then((res) => res.json());

export const getQalunPageUrl = (pageNumber: number) => `/qalun/pages/${pageNumber}.json`;

type Props = {
  pageNumber: number;
  // the first ayah of the surah or juz being read on this page (Hafs numbering), if it's on it
  verseKey?: string;
};

/**
 * A page of the Qalun 'an Nafi' mushaf (added in the old-Quran.com clone), line for line as
 * KFGQPC typeset it. It's as wide as the reader's --line-width, like a Hafs page, and its text is
 * sized from that width at the print's proportions, so Cmd +/- and the two-page view resize it
 * the same way.
 *
 * @returns {JSX.Element}
 */
const QalunPage = ({ pageNumber, verseKey }: Props) => {
  const { data: lines } = useSWRImmutable(getQalunPageUrl(pageNumber), fetchPage);
  const isFontReady = useQalunFont();

  // keep the placeholder until both the text and its font are in, so it's drawn once
  if (!lines || !isFontReady) return <ReadingViewSkeleton />;
  return <QalunPageContent pageNumber={pageNumber} verseKey={verseKey} lines={lines} />;
};

export default QalunPage;
