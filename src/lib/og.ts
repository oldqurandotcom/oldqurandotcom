import { getBasePath } from '@/utils/url';

// Quran.com's own preview service (og.qurancdn.com) now renders the new branding,
// so every link preview uses this clone's static old-style image instead.
const OG_IMAGE_PATH = '/images/og-old-quran.png';

interface BaseOgOptions {
  locale: string;
}

const getOgImageUrl = () => `${getBasePath()}${OG_IMAGE_PATH}`;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getDefaultOgImageUrl = (options: BaseOgOptions) => getOgImageUrl();

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getAboutTheQuranImageUrl = (options: BaseOgOptions) => getOgImageUrl();

export const getChapterOgImageUrl = (
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  options: BaseOgOptions & {
    chapterId: string | number;
    verseNumber?: string | number;
  },
) => getOgImageUrl();
