/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextDecreaseIcon from '@mui/icons-material/TextDecrease';
import TextIncreaseIcon from '@mui/icons-material/TextIncrease';
import CloseIcon from '@mui/icons-material/Close';
import { useLingui } from '@lingui/react/macro';
import {
    MAX_FONT_SIZE,
    MIN_FONT_SIZE,
    updateNovelReaderSettings,
    useNovelReaderSettings,
} from '@/features/novel/reader/preferences.ts';

/**
 * Calibre's `FontSizeOverlay` analogue: a centered popup with − / + buttons
 * and a slider for `base_font_size`. Invoked from the main overlay's "Font
 * size" button and the `increase/decrease/default_font_size` keyboard
 * shortcuts. Tapping the backdrop closes the panel.
 */
export const NovelReaderFontSizeOverlay = ({ onClose }: { onClose: () => void }) => {
    const { t } = useLingui();
    const settings = useNovelReaderSettings();
    const value = settings.base_font_size;

    return (
        <Stack
            sx={{
                position: 'absolute',
                inset: 0,
                alignItems: 'center',
                justifyContent: 'center',
                color: 'inherit',
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <Box
                sx={{
                    bgcolor: 'rgba(0,0,0,0.7)',
                    borderRadius: 2,
                    p: 3,
                    width: 'min(80vw, 420px)',
                }}
            >
                <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Typography variant="h6">{t`Font size`}</Typography>
                    <IconButton color="inherit" onClick={onClose} aria-label={t`Close`}>
                        <CloseIcon />
                    </IconButton>
                </Stack>

                <Typography sx={{ textAlign: 'center', mb: 2, fontSize: `${value}px`, lineHeight: 1.4 }}>Aa</Typography>

                <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                    <IconButton
                        color="inherit"
                        onClick={() =>
                            updateNovelReaderSettings({
                                base_font_size: Math.max(MIN_FONT_SIZE, value - 1),
                            })
                        }
                        disabled={value <= MIN_FONT_SIZE}
                        aria-label={t`Decrease font size`}
                    >
                        <TextDecreaseIcon />
                    </IconButton>
                    <Slider
                        min={MIN_FONT_SIZE}
                        max={MAX_FONT_SIZE}
                        step={1}
                        value={value}
                        onChange={(_, v) => updateNovelReaderSettings({ base_font_size: v as number })}
                        sx={{ color: 'inherit' }}
                    />
                    <IconButton
                        color="inherit"
                        onClick={() =>
                            updateNovelReaderSettings({
                                base_font_size: Math.min(MAX_FONT_SIZE, value + 1),
                            })
                        }
                        disabled={value >= MAX_FONT_SIZE}
                        aria-label={t`Increase font size`}
                    >
                        <TextIncreaseIcon />
                    </IconButton>
                </Stack>
                <Typography sx={{ textAlign: 'center', opacity: 0.7 }}>{value}px</Typography>
            </Box>
        </Stack>
    );
};
