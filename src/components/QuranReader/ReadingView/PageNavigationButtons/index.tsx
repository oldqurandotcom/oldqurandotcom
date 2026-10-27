import React, { useContext } from 'react';

import { useSelector } from '@xstate/react';
import classNames from 'classnames';
import useTranslation from 'next-translate/useTranslation';

import styles from './PageNavigationButtons.module.scss';

import Button, { ButtonSize } from '@/dls/Button/Button';
import KeyboardInput from '@/dls/KeyboardInput';
import { ContentSide } from '@/dls/Tooltip';
import BookOpenIcon from '@/icons/book-open.svg';
import ChevronDownIcon from '@/icons/chevron-down.svg';
import { AudioPlayerMachineContext } from 'src/xstate/AudioPlayerMachineContext';

interface Props {
  scrollToNextPage: () => void;
  scrollToPreviousPage: () => void;
  isTwoPages?: boolean;
  onToggleTwoPages?: () => void;
  // the page arrows; hidden at large text sizes, where the two-page switch still shows
  isPageNavigationShown?: boolean;
}

const PageNavigationButtons: React.FC<Props> = ({
  scrollToNextPage,
  scrollToPreviousPage,
  isTwoPages,
  onToggleTwoPages,
  isPageNavigationShown = true,
}) => {
  const { t } = useTranslation('quran-reader');
  const audioService = useContext(AudioPlayerMachineContext);
  const isAudioPlayerHidden = useSelector(audioService, (state) => state.matches('HIDDEN'));
  return (
    <div
      className={classNames(styles.buttonsContainer, {
        [styles.audioPlayerOpen]: !isAudioPlayerHidden,
      })}
    >
      {onToggleTwoPages && (
        <Button
          size={ButtonSize.Small}
          className={classNames(styles.spreadButton, { [styles.spreadButtonActive]: isTwoPages })}
          onClick={onToggleTwoPages}
          ariaLabel={isTwoPages ? 'Show one page' : 'Show two pages'}
          // eslint-disable-next-line i18next/no-literal-string
          tooltip={isTwoPages ? 'One page' : 'Two pages, like an open mushaf'}
          tooltipContentSide={ContentSide.LEFT}
        >
          <BookOpenIcon />
        </Button>
      )}
      {isPageNavigationShown && (
        <>
          <Button
            size={ButtonSize.Small}
            className={styles.prevButton}
            onClick={scrollToPreviousPage}
            shouldFlipOnRTL={false}
            tooltip={
              <>
                {t('prev-page')} <KeyboardInput invertColors keyboardKey="⬆" />
              </>
            }
            tooltipContentSide={ContentSide.LEFT}
          >
            <ChevronDownIcon />
          </Button>
          <Button
            size={ButtonSize.Small}
            onClick={scrollToNextPage}
            tooltip={
              <>
                {t('next-page')} <KeyboardInput invertColors keyboardKey="⬇" />
              </>
            }
            tooltipContentSide={ContentSide.LEFT}
          >
            <ChevronDownIcon />
          </Button>
        </>
      )}
    </div>
  );
};

export default PageNavigationButtons;
