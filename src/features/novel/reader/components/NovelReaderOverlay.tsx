/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ToggleButton from '@mui/material/ToggleButton';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import SearchIcon from '@mui/icons-material/Search';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import TextDecreaseIcon from '@mui/icons-material/TextDecrease';
import TextIncreaseIcon from '@mui/icons-material/TextIncrease';
import { useLingui } from '@lingui/react/macro';
import { MAX_FONT_SIZE, MIN_FONT_SIZE, NovelReaderTheme } from '@/features/novel/reader/preferences.ts';

/**
 * Persistent top/bottom chrome for the novel reader — mirrors `PlayerOverlay`'s
 * role (nav, settings) but for text: prev/next chapter, table of contents,
 * find-in-chapter, font size, theme, and bookmark. Unlike `PlayerOverlay` this
 * does not auto-hide on a timer; visibility is toggled by tapping the content
 * pane (see `NovelReader.tsx`), matching a persistent-toolbar reading UI.
 */
export const NovelReaderOverlay = ({
    isVisible,
    title,
    chapterName,
    onClose,
    hasPrevChapter,
    hasNextChapter,
    onPrevChapter,
    onNextChapter,
    onOpenToc,
    isSearchOpen,
    onToggleSearch,
    isBookmarked,
    onToggleBookmark,
    fontSize,
    onFontSizeStep,
    theme,
    onThemeChange,
}: {
    isVisible: boolean;
    title?: string;
    chapterName?: string;
    onClose: () => void;
    hasPrevChapter: boolean;
    hasNextChapter: boolean;
    onPrevChapter: () => void;
    onNextChapter: () => void;
    onOpenToc: () => void;
    isSearchOpen: boolean;
    onToggleSearch: () => void;
    isBookmarked: boolean;
    onToggleBookmark: () => void;
    fontSize: number;
    onFontSizeStep: (direction: 1 | -1) => void;
    theme: NovelReaderTheme;
    onThemeChange: (theme: NovelReaderTheme) => void;
}) => {
    const { t } = useLingui();

    return (
        <Box
            sx={{
                position: 'fixed',
                inset: 0,
                zIndex: 1,
                pointerEvents: 'none',
                opacity: isVisible ? 1 : 0,
                transition: 'opacity 0.2s',
            }}
        >
            {/* Top bar */}
            <Stack
                direction="row"
                sx={{
                    alignItems: 'center',
                    gap: 1,
                    p: 1,
                    pointerEvents: isVisible ? 'auto' : 'none',
                    background: 'linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)',
                }}
            >
                <IconButton color="inherit" onClick={onClose} aria-label={t`Close`}>
                    <ArrowBackIcon />
                </IconButton>
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    {title && (
                        <Typography variant="subtitle1" noWrap sx={{ fontWeight: 'bold' }}>
                            {title}
                        </Typography>
                    )}
                    {chapterName && (
                        <Typography variant="caption" noWrap sx={{ opacity: 0.8, display: 'block' }}>
                            {chapterName}
                        </Typography>
                    )}
                </Box>
                <IconButton color="inherit" onClick={onOpenToc} aria-label={t`Table of Contents`}>
                    <MenuBookIcon />
                </IconButton>
                <IconButton
                    color="inherit"
                    onClick={onToggleSearch}
                    aria-label={t`Search in chapter`}
                    sx={{ opacity: isSearchOpen ? 1 : 0.8 }}
                >
                    <SearchIcon />
                </IconButton>
                <IconButton color="inherit" onClick={onToggleBookmark} aria-label={t`Bookmark chapter`}>
                    {isBookmarked ? <BookmarkIcon /> : <BookmarkBorderIcon />}
                </IconButton>
            </Stack>

            {/* Bottom bar */}
            <Stack
                direction="row"
                sx={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 1,
                    p: 1,
                    pointerEvents: isVisible ? 'auto' : 'none',
                    background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)',
                }}
            >
                <IconButton
                    color="inherit"
                    onClick={onPrevChapter}
                    disabled={!hasPrevChapter}
                    aria-label={t`Previous chapter`}
                >
                    <NavigateBeforeIcon />
                </IconButton>

                <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                    <IconButton
                        color="inherit"
                        onClick={() => onFontSizeStep(-1)}
                        disabled={fontSize <= MIN_FONT_SIZE}
                        aria-label={t`Decrease font size`}
                    >
                        <TextDecreaseIcon />
                    </IconButton>
                    <IconButton
                        color="inherit"
                        onClick={() => onFontSizeStep(1)}
                        disabled={fontSize >= MAX_FONT_SIZE}
                        aria-label={t`Increase font size`}
                    >
                        <TextIncreaseIcon />
                    </IconButton>
                    <ToggleButtonGroup
                        size="small"
                        exclusive
                        value={theme}
                        onChange={(_, value: NovelReaderTheme | null) => value && onThemeChange(value)}
                    >
                        <ToggleButton value={NovelReaderTheme.LIGHT}>{t`Light`}</ToggleButton>
                        <ToggleButton value={NovelReaderTheme.SEPIA}>{t`Sepia`}</ToggleButton>
                        <ToggleButton value={NovelReaderTheme.DARK}>{t`Dark`}</ToggleButton>
                    </ToggleButtonGroup>
                </Stack>

                <IconButton
                    color="inherit"
                    onClick={onNextChapter}
                    disabled={!hasNextChapter}
                    aria-label={t`Next chapter`}
                >
                    <NavigateNextIcon />
                </IconButton>
            </Stack>
        </Box>
    );
};
