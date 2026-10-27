import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

import useBrowserLayoutEffect from '@/hooks/useBrowserLayoutEffect';

// Which riwayah the reader shows (added in the old-Quran.com clone): Hafs 'an 'Asim, from
// Quran.com's API as before, or Qalun 'an Nafi', from KFGQPC's Qalun typesetting (public/qalun).
export enum Riwayah {
  Hafs = 'hafs',
  Qalun = 'qalun',
}

const STORAGE_KEY = 'riwayah';

type RiwayahContextValue = { riwayah: Riwayah; setRiwayah: (riwayah: Riwayah) => void };

const RiwayahContext = createContext<RiwayahContextValue>({
  riwayah: Riwayah.Hafs,
  setRiwayah: () => undefined,
});

export const RiwayahProvider = ({ children }: { children: React.ReactNode }) => {
  const [riwayah, setRiwayahState] = useState(Riwayah.Hafs);

  // read before the first paint, so Hafs doesn't flash first for someone reading Qalun
  useBrowserLayoutEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === Riwayah.Qalun) {
        setRiwayahState(Riwayah.Qalun);
      }
    } catch {
      // storage can be blocked; the reader then starts with Hafs
    }
  }, []);

  const setRiwayah = useCallback((value: Riwayah) => {
    setRiwayahState(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // not remembered, but still switches for this visit
    }
  }, []);

  const value = useMemo(() => ({ riwayah, setRiwayah }), [riwayah, setRiwayah]);
  return <RiwayahContext.Provider value={value}>{children}</RiwayahContext.Provider>;
};

export const useRiwayah = () => useContext(RiwayahContext);
