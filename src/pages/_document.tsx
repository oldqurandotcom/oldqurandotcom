import Document, { Html, Head, Main, NextScript, DocumentContext } from 'next/document';

import { getDir } from '@/utils/locale';

const DEFAULT_LOCALE = 'en';

class MyDocument extends Document {
  static async getInitialProps(ctx: DocumentContext) {
    const initialProps = await Document.getInitialProps(ctx);
    return { ...initialProps, locale: ctx?.locale || DEFAULT_LOCALE };
  }

  render = () => (
    <Html dir={getDir(this.props.locale)} lang={this.props.locale}>
      <Head>
        {/* unofficial clone: never show up in search results next to the real Quran.com */}
        <meta name="robots" content="noindex, nofollow" />
        {/* Quran text, fonts and audio data come from Quran.com's servers: connect early */}
        <link rel="preconnect" href="https://static.qurancdn.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.qurancdn.com" crossOrigin="anonymous" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}

export default MyDocument;
