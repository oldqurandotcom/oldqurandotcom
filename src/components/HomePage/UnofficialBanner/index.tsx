/* eslint-disable i18next/no-literal-string */ // the disclaimer is intentionally English-only
import React, { useEffect, useState } from 'react';

import styles from './UnofficialBanner.module.scss';

import Button, { ButtonShape, ButtonSize, ButtonVariant } from '@/dls/Button/Button';
import CloseIcon from '@/icons/close.svg';

const DISMISSED_KEY = 'unofficial-banner-dismissed';
const NEW_QURAN_COM_URL = 'https://quran.com';
const CONTACT_EMAIL = 'oldqurandotcom@proton.me';

const UnofficialBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(DISMISSED_KEY)) setIsVisible(false);
    } catch {
      // storage can be blocked (private mode); just keep showing the banner
    }
  }, []);

  const onClose = () => {
    setIsVisible(false);
    try {
      window.localStorage.setItem(DISMISSED_KEY, '1');
    } catch {
      // ignore, the banner simply comes back next visit
    }
  };

  if (!isVisible) return null;

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
      <div className={styles.closeIcon}>
        <Button
          size={ButtonSize.Small}
          shape={ButtonShape.Circle}
          variant={ButtonVariant.Ghost}
          onClick={onClose}
          ariaLabel="Dismiss"
        >
          <CloseIcon />
        </Button>
      </div>
    </div>
  );
};

export default UnofficialBanner;
