/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import CloseIcon from '@mui/icons-material/Close';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useLingui } from '@lingui/react/macro';

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
 * Find-in-chapter search bar (presentational). Matching/state lives in the
 * parent (`NovelReader.tsx`) via the shared `useChapterTextSearch` hook so
 * the keyboard `next_match`/`previous_match` shortcuts and the selection
 * bar's `search` action can drive it without a ref.
 */
export const NovelReaderSearch = ({
    open,
    onClose,
    query,
    onQueryChange,
    supported,
    matchCount,
    currentIndex,
    goToNext,
    goToPrevious,
}: {
    open: boolean;
    onClose: () => void;
    query: string;
    onQueryChange: (q: string) => void;
    supported: boolean;
    matchCount: number;
    currentIndex: number;
    goToNext: () => void;
    goToPrevious: () => void;
}) => {
    const { t } = useLingui();

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
                zIndex: 60,
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
                onChange={(e) => onQueryChange(e.target.value)}
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
