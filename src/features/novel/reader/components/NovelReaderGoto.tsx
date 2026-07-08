/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useState } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import FirstPageIcon from '@mui/icons-material/FirstPage';
import LastPageIcon from '@mui/icons-material/LastPage';
import CloseIcon from '@mui/icons-material/Close';
import { useLingui } from '@lingui/react/macro';

interface GotoProps {
    onClose: () => void;
    onPrevSection: () => void;
    onNextSection: () => void;
    onGoToBookStart: () => void;
    onGoToBookEnd: () => void;
    onGotoChapterByFraction: (fraction: number) => void;
    chapterName?: string;
    chapterIndex: number;
    chapterCount: number;
}

/**
 * Calibre's `GotoOverlay` analogue: jump targets for prev/next section
 * (chapter, in Miruyomi's data model), book start/end, and a "location"
 * input that accepts a chapter-index, percentage, or scroll fraction.
 */
export const NovelReaderGoto = ({
    onClose,
    onPrevSection,
    onNextSection,
    onGoToBookStart,
    onGoToBookEnd,
    onGotoChapterByFraction,
    chapterName,
    chapterIndex,
    chapterCount,
}: GotoProps) => {
    const { t } = useLingui();
    const [value, setValue] = useState('');

    const submit = () => {
        const trimmed = value.trim();
        if (!trimmed) {
            return;
        }
        // "12%" → scroll to 12% of current chapter
        if (trimmed.endsWith('%')) {
            const pct = Number(trimmed.slice(0, -1));
            if (Number.isFinite(pct)) {
                onGotoChapterByFraction(Math.min(1, Math.max(0, pct / 100)));
            }
            return;
        }
        // "0.5" → chapter-as-book position fraction
        const asNum = Number(trimmed);
        if (Number.isFinite(asNum) && asNum >= 0 && asNum <= 1) {
            onGotoChapterByFraction(asNum);
        }
    };

    return (
        <Stack
            sx={{
                position: 'absolute',
                inset: 0,
                color: 'inherit',
                p: 2,
                overflowY: 'auto',
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6">{t`Go to`}</Typography>
                <IconButton color="inherit" onClick={onClose} aria-label={t`Close`}>
                    <CloseIcon />
                </IconButton>
            </Stack>
            <Box sx={{ maxWidth: 720, mx: 'auto', width: '100%', mt: 2 }}>
                <List sx={{ bgcolor: 'rgba(0,0,0,0.5)', borderRadius: 2 }}>
                    <ListItemButton onClick={onPrevSection}>
                        <ListItemIcon sx={{ color: 'inherit' }}>
                            <ArrowBackIcon />
                        </ListItemIcon>
                        <ListItemText primary={t`Previous section`} secondary={chapterName} />
                    </ListItemButton>
                    <ListItemButton onClick={onNextSection}>
                        <ListItemIcon sx={{ color: 'inherit' }}>
                            <ArrowForwardIcon />
                        </ListItemIcon>
                        <ListItemText primary={t`Next section`} />
                    </ListItemButton>
                    <ListItemButton onClick={onGoToBookStart}>
                        <ListItemIcon sx={{ color: 'inherit' }}>
                            <FirstPageIcon />
                        </ListItemIcon>
                        <ListItemText primary={t`Book start`} secondary={`1 / ${chapterCount}`} />
                    </ListItemButton>
                    <ListItemButton onClick={onGoToBookEnd}>
                        <ListItemIcon sx={{ color: 'inherit' }}>
                            <LastPageIcon />
                        </ListItemIcon>
                        <ListItemText primary={t`Book end`} secondary={`${chapterCount} / ${chapterCount}`} />
                    </ListItemButton>
                </List>

                <Box sx={{ mt: 2, bgcolor: 'rgba(0,0,0,0.5)', borderRadius: 2, p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>
                        {t`Location`}
                    </Typography>
                    <Typography variant="caption" component="div" sx={{ opacity: 0.7, mb: 1 }}>
                        {t`Enter a scroll fraction (0–1 or 0–100%)`}
                    </Typography>
                    <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                        <TextField
                            size="small"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    submit();
                                }
                            }}
                            sx={{
                                flex: 1,
                                input: { color: 'inherit' },
                                fieldset: { borderColor: 'currentColor' },
                            }}
                        />
                        <ListItemButton onClick={submit} sx={{ borderRadius: 1, maxWidth: 120, pl: 2, pr: 2 }}>
                            <ListItemText primary={t`Go`} sx={{ textAlign: 'center' }} />
                        </ListItemButton>
                    </Stack>
                    <Typography variant="caption" component="div" sx={{ opacity: 0.6, mt: 1 }}>
                        {t`Chapter ${chapterIndex} / ${chapterCount}`}
                    </Typography>
                </Box>
            </Box>
        </Stack>
    );
};
