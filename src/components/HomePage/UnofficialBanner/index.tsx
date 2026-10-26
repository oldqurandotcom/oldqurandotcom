/* eslint-disable i18next/no-literal-string */ // the disclaimer is intentionally English-only
import React from 'react';

import styles from './UnofficialBanner.module.scss';

const NEW_QURAN_COM_URL = 'https://quran.com';
const CONTACT_EMAIL = 'oldqurandotcom@proton.me';

// Always shown: there's deliberately no way to dismiss it.
const UnofficialBanner = () => {
  return (
    <div className={styles.container} role="note">
      <p className={styles.text}>
        <strong>Unofficial, non-commercial copy of the old Quran.com design</strong>, here only to
        help people keep reading the Quran in the layout they know, until Quran.com adds a toggle
        for it. Not affiliated with or endorsed by Quran.com, and no rights are claimed: the Quran
        text, translations, recitations and design all belong to Quran.com and their providers.{' '}
        <a className={styles.link} href={NEW_QURAN_COM_URL}>
          Go to the new Quran.com →
        </a>{' '}
        Complaints, or the Quran.com team wanting to get in touch:{' '}
        <a className={styles.link} href={`mailto:${CONTACT_EMAIL}`}>
          {CONTACT_EMAIL}
        </a>
      </p>
    </div>
  );
};

export default UnofficialBanner;
