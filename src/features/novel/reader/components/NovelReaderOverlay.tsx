/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Box from '@mui/material/Box';
import type { HeadFootRenderCtx } from '@/features/novel/reader/settings/headFoot.ts';
import type { NovelReaderSettings } from '@/features/novel/reader/preferences.ts';
import type { ReaderPanel } from '@/features/novel/reader/readerPanel.ts';
import { NovelReaderMainOverlay } from '@/features/novel/reader/components/NovelReaderMainOverlay.tsx';
import { NovelReaderFontSizeOverlay } from '@/features/novel/reader/components/NovelReaderFontSizeOverlay.tsx';
import { NovelReaderGoto } from '@/features/novel/reader/components/NovelReaderGoto.tsx';
import { NovelReaderWordActions } from '@/features/novel/reader/components/NovelReaderWordActions.tsx';
import { NovelReaderSettingsPanel } from '@/features/novel/reader/settings/NovelReaderSettingsPanel.tsx';

export interface ReaderOverlayHandlers {
    onClose: () => void;
    onNavigateBack: () => void;
    onNavigateForward: () => void;
    onGoHome: () => void;
    onPrevChapter: () => void;
    onNextChapter: () => void;
    onToggleSearch: () => void;
    onGoto: () => void;
    onToggleToc: () => void;
    onToggleBookmarks: () => void;
    onToggleBookmark: () => void;
    onGotoChapterByFraction: (fraction: number) => void;
    onGoToBookStart: () => void;
    onGoToBookEnd: () => void;
    onLookupWord: (word: string) => void;
    onFontSize: () => void;
    onPrefs: () => void;
    onToggleReadingMode: () => void;
}

interface OverlayProps {
    panel: ReaderPanel;
    settings: NovelReaderSettings;
    title?: string;
    chapterName?: string;
    chapterIndex: number;
    chapterCount: number;
    hasPrevChapter: boolean;
    hasNextChapter: boolean;
    isBookmarked: boolean;
    footerCtx?: HeadFootRenderCtx;
    handlers: ReaderOverlayHandlers;
}

/**
 * Panel-stack dispatcher — the calibre `Overlay` host. The LIFO stack lives
 * in `NovelReader.tsx` (`panelStack`); this component renders the *top* panel
 * plus the dark translucent backdrop behind it. Sub-panels (MainOverlay,
 * FontSizeOverlay, Goto, WordActions, Prefs) each close by popping the stack
 * via `onClose`. A backdrop click also pops the top panel, matching calibre's
 * `Overlay.container_clicked` behavior.
 *
 * The persistent chrome header/footer (`NovelReaderChrome`) is NOT part of
 * the panel stack; it sits in the screen root above the content with lower
 * z-index so active panels occlude it.
 */
export const NovelReaderOverlay = (props: OverlayProps) => {
    const {
        panel,
        settings,
        title,
        chapterName,
        chapterIndex,
        chapterCount,
        hasPrevChapter,
        hasNextChapter,
        isBookmarked,
        footerCtx,
        handlers,
    } = props;
    const { onClose, onToggleBookmark } = handlers;

    const render = () => {
        switch (panel.kind) {
            case 'main':
                return (
                    <NovelReaderMainOverlay
                        title={title}
                        hasPrevChapter={hasPrevChapter}
                        hasNextChapter={hasNextChapter}
                        isBookmarked={isBookmarked}
                        onNavigateBack={handlers.onNavigateBack}
                        onNavigateForward={handlers.onNavigateForward}
                        onGoHome={handlers.onGoHome}
                        onPrevChapter={handlers.onPrevChapter}
                        onNextChapter={handlers.onNextChapter}
                        onToggleSearch={handlers.onToggleSearch}
                        onGoto={handlers.onGoto}
                        onToggleToc={handlers.onToggleToc}
                        onToggleBookmarks={handlers.onToggleBookmarks}
                        onToggleBookmark={onToggleBookmark}
                        onFontSize={handlers.onFontSize}
                        onPrefs={handlers.onPrefs}
                        onToggleReadingMode={handlers.onToggleReadingMode}
                        onClose={onClose}
                        settings={settings}
                        footerCtx={footerCtx}
                    />
                );
            case 'font_size':
                return <NovelReaderFontSizeOverlay onClose={onClose} />;
            case 'goto':
                return (
                    <NovelReaderGoto
                        onClose={onClose}
                        onPrevSection={handlers.onPrevChapter}
                        onNextSection={handlers.onNextChapter}
                        onGoToBookStart={handlers.onGoToBookStart}
                        onGoToBookEnd={handlers.onGoToBookEnd}
                        onGotoChapterByFraction={handlers.onGotoChapterByFraction}
                        chapterName={chapterName}
                        chapterIndex={chapterIndex}
                        chapterCount={chapterCount}
                    />
                );
            case 'word_actions':
                return <NovelReaderWordActions word={panel.word} onClose={onClose} />;
            case 'prefs':
                return <NovelReaderSettingsPanel onClose={onClose} />;
            default:
                return null;
        }
    };

    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                zIndex: 40,
                color: '#fff',
                background: panel.kind === 'main' || panel.kind === 'prefs' ? 'rgba(0,0,0,0.45)' : 'rgba(0,0,0,0.25)',
            }}
        >
            {render()}
        </Box>
    );
};
