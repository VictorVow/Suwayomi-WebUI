/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useState, type RefObject } from 'react';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useLingui } from '@lingui/react/macro';
import { useChapterTextSearch } from '@/features/novel/reader/hooks/useChapterTextSearch.ts';

const matchLabel = (supported: boolean, matchCount: number, currentIndex: number, unsupportedLabel: string): string => {
    if (!supported) {
        return unsupportedLabel;
    }
    if (matchCount === 0) {
        return '0/0';
    }
    return `${currentIndex + 1}/${matchCount}`;
};

/**
 * Find-in-chapter search bar. Searches only the currently rendered chapter's
 * text (no cross-chapter or full-text backend search exists for lnreader
 * novels) via the CSS Custom Highlight API — see `useChapterTextSearch`.
 */
export const NovelReaderSearch = ({
    open,
    onClose,
    contentRef,
}: {
    open: boolean;
    onClose: () => void;
    contentRef: RefObject<HTMLElement | null>;
}) => {
    const { t } = useLingui();
    const [query, setQuery] = useState('');
    const { supported, matchCount, currentIndex, goToNext, goToPrevious } = useChapterTextSearch(
        contentRef,
        open ? query : '',
    );

    if (!open) {
        return null;
    }

    return (
        <Paper
            elevation={4}
            sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 2,
                display: 'flex',
                alignItems: 'center',
                px: 1,
                py: 0.5,
                gap: 0.5,
            }}
        >
            <InputBase
                autoFocus
                placeholder={t`Search in chapter`}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        if (e.shiftKey) {
                            goToPrevious();
                        } else {
                            goToNext();
                        }
                    }
                    if (e.key === 'Escape') {
                        onClose();
                    }
                }}
                sx={{ width: 180 }}
            />
            <Typography variant="caption" sx={{ minWidth: 48, textAlign: 'center', opacity: 0.7 }}>
                {matchLabel(supported, matchCount, currentIndex, t`n/a`)}
            </Typography>
            <IconButton size="small" onClick={goToPrevious} disabled={!matchCount} aria-label={t`Previous match`}>
                <KeyboardArrowUpIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={goToNext} disabled={!matchCount} aria-label={t`Next match`}>
                <KeyboardArrowDownIcon fontSize="small" />
            </IconButton>
            <IconButton size="small" onClick={onClose} aria-label={t`Close search`}>
                <CloseIcon fontSize="small" />
            </IconButton>
        </Paper>
    );
};
