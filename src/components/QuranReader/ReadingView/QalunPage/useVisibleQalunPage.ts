import { useEffect, useState } from 'react';

/**
 * The Qalun page being read: the one crossing a line 30% down the window (in a pair, either page
 * stands for the pair). Hafs pages report this through the reading tracker as their verses come
 * into view; Qalun pages have no Quran.com verses, so the page turning buttons use this instead.
 *
 * @param {boolean} isEnabled
 * @returns {number | null}
 */
const useVisibleQalunPage = (isEnabled: boolean): number | null => {
  const [page, setPage] = useState<number | null>(null);

  useEffect(() => {
    if (!isEnabled) {
      setPage(null);
      return undefined;
    }
    let frame = 0;
    const update = () => {
      frame = 0;
      const marker = window.innerHeight * 0.3;
      const pages = Array.from(document.querySelectorAll<HTMLElement>('[data-qalun-page]'));
      const current =
        pages.find((element) => {
          const rect = element.getBoundingClientRect();
          return rect.height > 0 && rect.top <= marker && rect.bottom > marker;
        }) ?? pages.find((element) => element.getBoundingClientRect().top > marker);
      if (current) setPage(Number(current.dataset.qalunPage));
    };
    const onChange = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    // pages appear as their text loads, so look again shortly after opening
    const timeout = setTimeout(update, 1000);
    window.addEventListener('scroll', onChange, { passive: true });
    window.addEventListener('resize', onChange);
    return () => {
      clearTimeout(timeout);
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onChange);
      window.removeEventListener('resize', onChange);
    };
  }, [isEnabled]);

  return page;
};

export default useVisibleQalunPage;
