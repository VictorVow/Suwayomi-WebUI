/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import ReadMoreIcon from '@mui/icons-material/ReadMore';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import FormatSizeIcon from '@mui/icons-material/FormatSize';
import SettingsIcon from '@mui/icons-material/Settings';
import CloseIcon from '@mui/icons-material/Close';
import { useLingui } from '@lingui/react/macro';
import type { HeadFootRenderCtx } from '@/features/novel/reader/settings/headFoot.ts';
import { renderSection } from '@/features/novel/reader/settings/headFoot.ts';
import type { NovelReaderSettings } from '@/features/novel/reader/preferences.ts';

const useNow = (): Date => {
    const [now, setNow] = useState(() => new Date());
    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(id);
    }, []);
    return now;
};

interface MainOverlayProps {
    title?: string;
    hasPrevChapter: boolean;
    hasNextChapter: boolean;
    isBookmarked: boolean;
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
    onFontSize: () => void;
    onPrefs: () => void;
    onClose: () => void;
    settings: NovelReaderSettings;
    /** live clock + template-driven footer right/middle text. */
    footerCtx?: HeadFootRenderCtx;
}

const ActionButton = ({
    icon,
    label,
    onClick,
    disabled,
}: {
    icon: React.ReactNode;
    label: string;
    onClick: () => void;
    disabled?: boolean;
}) => (
    <Box sx={{ textAlign: 'center', flex: '1 1 0', minWidth: 72 }}>
        <IconButton color="inherit" onClick={onClick} disabled={disabled} aria-label={label} size="large">
            {icon}
        </IconButton>
        <Typography variant="caption" component="div" sx={{ opacity: 0.9, lineHeight: 1 }}>
            {label}
        </Typography>
    </Box>
);

/**
 * Calibre-style full-screen controls grid invoked by right-click, Esc, or the
 * `menu-icon-on-hover` chrome badge. Held inside `NovelReaderOverlay` (one
 * panel of the LIFO stack). Top: book title + live clock. Middle: rows of
 * action buttons grouped by role (navigation / find / annotations / display).
 * Bottom: Close button + templated right/middle slots rendered through the
 * same `renderSection` path as the chrome footer (`controls_footer`).
 */
export const NovelReaderMainOverlay = ({
    title,
    hasPrevChapter,
    hasNextChapter,
    isBookmarked,
    onNavigateBack,
    onNavigateForward,
    onGoHome,
    onPrevChapter,
    onNextChapter,
    onToggleSearch,
    onGoto,
    onToggleToc,
    onToggleBookmarks,
    onToggleBookmark,
    onFontSize,
    onPrefs,
    onClose,
    settings,
    footerCtx,
}: MainOverlayProps) => {
    const { t } = useLingui();
    const now = useNow();
    const clockText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    void clockText; // clock is rendered directly below; kept for clarity.

    const footerRight = footerCtx ? renderSection(settings.controls_footer?.right ?? 'empty', footerCtx).text : '';

    return (
        <Stack
            sx={{
                position: 'absolute',
                inset: 0,
                color: 'inherit',
                p: 2,
                gap: 2,
                overflowY: 'auto',
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" noWrap sx={{ fontWeight: 'bold', flex: '1 1 0' }}>
                    {title ?? t`Reader`}
                </Typography>
                <Typography variant="h6" sx={{ opacity: 0.85, fontVariantNumeric: 'tabular-nums' }}>
                    {clockText}
                </Typography>
            </Stack>

            <Box
                sx={{
                    maxWidth: 720,
                    mx: 'auto',
                    width: '100%',
                    bgcolor: 'rgba(0,0,0,0.5)',
                    borderRadius: 2,
                    p: 2,
                }}
            >
                <Stack direction="row" sx={{ flexWrap: 'wrap', rowGap: 2 }}>
                    <ActionButton icon={<ArrowBackIcon />} label={t`Back`} onClick={onNavigateBack} />
                    <ActionButton icon={<ArrowForwardIcon />} label={t`Forward`} onClick={onNavigateForward} />
                    <ActionButton icon={<HomeIcon />} label={t`Manga`} onClick={onGoHome} />
                    <ActionButton
                        icon={<ArrowBackIcon />}
                        label={t`Prev chapter`}
                        onClick={onPrevChapter}
                        disabled={!hasPrevChapter}
                    />
                    <ActionButton
                        icon={<ArrowForwardIcon />}
                        label={t`Next chapter`}
                        onClick={onNextChapter}
                        disabled={!hasNextChapter}
                    />
                </Stack>

                <Stack direction="row" sx={{ flexWrap: 'wrap', rowGap: 2 }}>
                    <ActionButton icon={<SearchIcon />} label={t`Search`} onClick={onToggleSearch} />
                    <ActionButton icon={<ReadMoreIcon />} label={t`Go to`} onClick={onGoto} />
                    <ActionButton icon={<MenuBookIcon />} label={t`Contents`} onClick={onToggleToc} />
                </Stack>

                <Stack direction="row" sx={{ flexWrap: 'wrap', rowGap: 2 }}>
                    <ActionButton
                        icon={isBookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                        label={isBookmarked ? t`Unbookmark` : t`Bookmark`}
                        onClick={onToggleBookmark}
                    />
                    <ActionButton icon={<BookmarkIcon />} label={t`Bookmarks`} onClick={onToggleBookmarks} />
                </Stack>

                <Stack direction="row" sx={{ flexWrap: 'wrap', rowGap: 2 }}>
                    <ActionButton icon={<FormatSizeIcon />} label={t`Font size`} onClick={onFontSize} />
                    <ActionButton icon={<SettingsIcon />} label={t`Preferences`} onClick={onPrefs} />
                    <ActionButton icon={<CloseIcon />} label={t`Close`} onClick={onClose} />
                </Stack>

                {footerCtx && (
                    <Box sx={{ mt: 2, textAlign: 'right', opacity: 0.7 }}>
                        <Typography variant="caption">{footerRight}</Typography>
                    </Box>
                )}
            </Box>
        </Stack>
    );
};
