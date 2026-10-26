/* eslint-disable i18next/no-literal-string */ // the disclaimer is intentionally English-only
import useTranslation from 'next-translate/useTranslation';

import styles from './NavbarLogoWrapper.module.scss';

import Link from '@/dls/Link/Link';
import QuranTextLogo from '@/icons/quran-text-logo.svg';

const NavbarLogoWrapper = () => {
  const { t } = useTranslation('common');
  return (
    <Link href="/" className={styles.logoWrapper} title={t('quran-com')}>
      <QuranTextLogo />
      <span className={styles.unofficial}>unofficial</span>
    </Link>
  );
};

export default NavbarLogoWrapper;
