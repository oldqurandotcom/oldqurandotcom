import React, { useEffect } from 'react';

import { DirectionProvider } from '@radix-ui/react-direction';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { DefaultSeo } from 'next-seo';
import useTranslation from 'next-translate/useTranslation';
import Head from 'next/head';
import { useRouter } from 'next/router';
import useSWRImmutable from 'swr/immutable';

import AudioPlayer from '@/components/AudioPlayer/AudioPlayer';
import UserAccountModal from '@/components/Auth/UserAccountModal';
import DeveloperUtility from '@/components/DeveloperUtility/DeveloperUtility';
import FontPreLoader from '@/components/Fonts/FontPreLoader';
import GlobalListeners from '@/components/GlobalListeners';
import Navbar from '@/components/Navbar/Navbar';
import { RiwayahProvider } from '@/components/QuranReader/Riwayah/RiwayahContext';
import SessionIncrementor from '@/components/SessionIncrementor';
import Footer from '@/dls/Footer/Footer';
import ToastContainerProvider from '@/dls/Toast/ToastProvider';
import ReduxProvider from '@/redux/Provider';
import { API_HOST } from '@/utils/api';
import { getUserProfile } from '@/utils/auth/api';
import { makeUserProfileUrl } from '@/utils/auth/apiPaths';
import { isLoggedIn } from '@/utils/auth/login';
import { logAndRedirectUnsupportedLogicalCSS } from '@/utils/css';
import { getDir } from '@/utils/locale';
import { createSEOConfig } from '@/utils/seo';
import DataContext from 'src/contexts/DataContext';
import ThemeProvider from 'src/styles/ThemeProvider';
import { AudioPlayerMachineProvider } from 'src/xstate/AudioPlayerMachineContext';

import 'src/styles/reset.scss';
import 'src/styles/fonts.scss';
import 'src/styles/theme.scss';
import 'src/styles/global.scss';
import 'src/styles/variables.scss';

function MyApp({ Component, pageProps }): JSX.Element {
  const router = useRouter();
  const { locale } = router;
  const { t } = useTranslation('common');
  const { data: userData } = useSWRImmutable(
    isLoggedIn() ? makeUserProfileUrl() : null,
    getUserProfile,
  );

  // listen to in-app changes of the locale and update the HTML dir accordingly.
  useEffect(() => {
    document.documentElement.dir = getDir(locale);
    logAndRedirectUnsupportedLogicalCSS();
  }, [locale]);

  return (
    <>
      <Head>
        <link rel="apple-touch-icon" sizes="192x192" href="/images/logo/Logo@192x192.png" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="preconnect" href={API_HOST} />
      </Head>
      <FontPreLoader locale={locale} />
      <DirectionProvider dir={getDir(locale)}>
        <TooltipProvider>
          <ToastContainerProvider>
            <DataContext.Provider value={pageProps.chaptersData}>
              <AudioPlayerMachineProvider>
                <ReduxProvider locale={locale}>
                  <ThemeProvider>
                    {/* Hafs or Qalun: the reader and the Mini Mushaf (in the navbar) both follow it */}
                    <RiwayahProvider>
                      <UserAccountModal
                        requiredFields={userData?.requiredFields}
                        announcement={userData?.announcement}
                      />
                      <DefaultSeo
                        {...createSEOConfig({ locale, description: t('default-description') })}
                      />
                      <GlobalListeners />

                      <Navbar />

                      <DeveloperUtility />
                      <Component {...pageProps} />
                      <AudioPlayer />
                      <Footer />
                    </RiwayahProvider>
                  </ThemeProvider>
                  <SessionIncrementor />
                </ReduxProvider>
              </AudioPlayerMachineProvider>
            </DataContext.Provider>
          </ToastContainerProvider>
        </TooltipProvider>
      </DirectionProvider>
    </>
  );
}

// Only uncomment this method if you have blocking data requirements for
// every single page in your application. This disables the ability to
// perform automatic static optimization, causing every page in your app to
// be server-side rendered.
//
// MyApp.getInitialProps = async (appContext) => {
//   // calls page's `getInitialProps` and fills `appProps.pageProps`
//   const appProps = await App.getInitialProps(appContext);
//
//   return { ...appProps }
// }

export default MyApp;
