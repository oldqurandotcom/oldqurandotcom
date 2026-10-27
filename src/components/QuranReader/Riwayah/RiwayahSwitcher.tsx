/* eslint-disable i18next/no-literal-string */ // added in the old-Quran.com clone, English only
import React from 'react';

import { Riwayah, useRiwayah } from './RiwayahContext';
import styles from './RiwayahSwitcher.module.scss';

import Switch, { SwitchSize } from '@/dls/Switch/Switch';

const ITEMS = [
  { name: 'Hafs', value: Riwayah.Hafs },
  { name: 'Qalun', value: Riwayah.Qalun },
];

/**
 * Hafs | Qalun, above the Translation | Reading switch.
 *
 * @returns {JSX.Element}
 */
const RiwayahSwitcher = () => {
  const { riwayah, setRiwayah } = useRiwayah();
  return (
    <div className={styles.container} title="Riwayah (narration) of the Quran text">
      <Switch
        items={ITEMS}
        selected={riwayah}
        onSelect={(value) => setRiwayah(value as Riwayah)}
        size={SwitchSize.Small}
      />
    </div>
  );
};

export default RiwayahSwitcher;
