/* eslint-disable i18next/no-literal-string */ // the disclaimer is intentionally English-only
import React from 'react';

import useTranslation from 'next-translate/useTranslation';

import NavigationDrawerItem from '../NavigationDrawerItem';

import styles from './NavigationDrawerBody.module.scss';

import IconHome from '@/icons/home.svg';
import IconRadio2 from '@/icons/radio-2.svg';
import IconRadio from '@/icons/radio.svg';

const NavigationDrawerBody = () => {
  const { t } = useTranslation('common');
  return (
    <div className={styles.listItemsContainer}>
      <h3 className={styles.subtitle}>{t('menu')}</h3>
      <NavigationDrawerItem title={t('home')} icon={<IconHome />} href="/" />
      <NavigationDrawerItem href="/radio" title={t('quran-radio')} icon={<IconRadio2 />} />
      <NavigationDrawerItem href="/reciters" title={t('reciters')} icon={<IconRadio />} />
      <h3 className={styles.subtitle}>About this copy</h3>
      <div className={styles.disclaimer}>
        <p>
          This is an <strong>unofficial, non-commercial copy</strong> of the old Quran.com design,
          kept up only so the old layout stays usable for personal reading.
        </p>
        <p>
          It is <strong>not affiliated with or endorsed by</strong> Quran.com or Quran.Foundation,
          and <strong>no rights are claimed</strong> to anything here. The Quran text, translations,
          tafsir, recitations and the design all belong to Quran.com, Quran.Foundation and their
          content providers.
        </p>
        <p>No ads, no tracking, nothing for sale.</p>
        <a className={styles.disclaimerLink} href="https://quran.com">
          Go to the official Quran.com →
        </a>
      </div>
    </div>
  );
};

export default NavigationDrawerBody;
