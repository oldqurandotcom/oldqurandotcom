import { useEffect, useState } from 'react';

// KFGQPC's Qalun font (UthmanicQaloun v2.1), unmodified; its licence is embedded in the file
const FONT_URL = '/fonts/quran/qalun/uthmanic_qaloun_v21.ttf';
export const QALUN_FONT_FAMILY = 'qalun-uthmanic';

let fontLoading: Promise<boolean> | null = null;

const loadQalunFont = (): Promise<boolean> => {
  if (!fontLoading) {
    const font = new FontFace(QALUN_FONT_FAMILY, `url(${FONT_URL}) format('truetype')`);
    font.display = 'block';
    fontLoading = font
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
        return true;
      })
      .catch(() => {
        fontLoading = null; // let a later page try again
        return false;
      });
  }
  return fontLoading;
};

/**
 * Whether the Qalun font is in. Pages wait for it, so their text is drawn once, in its font.
 *
 * @returns {boolean}
 */
const useQalunFont = (): boolean => {
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    let isMounted = true;
    loadQalunFont().then((loaded) => isMounted && setIsReady(loaded));
    return () => {
      isMounted = false;
    };
  }, []);
  return isReady;
};

export default useQalunFont;
