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
import ArrowBack from '@mui/icons-material/ArrowBack';
import type { HeadFootConfig, HeadFootRegion, NovelReaderSettings } from '@/features/novel/reader/preferences.ts';
import { regionOrder, renderSection, type HeadFootRenderCtx } from '@/features/novel/reader/settings/headFoot.ts';

interface ChromeRowProps {
    config: HeadFootConfig;
    ctx: HeadFootRenderCtx;
    color: string;
    onChromeControlClick?: () => void;
    forceShowControl?: boolean;
}

const regionJustify: Record<HeadFootRegion, 'flex-start' | 'flex-end' | 'center'> = {
    left: 'flex-start',
    middle: 'center',
    right: 'flex-end',
};

const ChromeRow = ({ config, ctx, color, onChromeControlClick, forceShowControl }: ChromeRowProps) => {
    if (!config) {
        return null;
    }

    return (
        <Stack
            direction="row"
            sx={{
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 1,
                px: 2,
                py: 0.5,
                pointerEvents: 'auto',
                color,
                '& > *': { minWidth: 0 },
            }}
        >
            {regionOrder.map((region: HeadFootRegion) => {
                const section = config[region];
                if (!section) {
                    return <Box key={region} sx={{ flex: 1, visibility: 'hidden' }} />;
                }
                const out = renderSection(section, ctx);
                const justify = regionJustify[region];
                return (
                    <Box
                        key={region}
                        onClick={out.showChromeControl ? onChromeControlClick : undefined}
                        sx={{
                            flex: 1,
                            display: 'flex',
                            justifyContent: justify,
                            alignItems: 'center',
                            cursor: out.showChromeControl ? 'pointer' : 'default',
                            opacity: out.showChromeControl && !forceShowControl ? 0.2 : 1,
                            transition: 'opacity 0.2s',
                            '&:hover': out.showChromeControl && !forceShowControl ? { opacity: 1 } : undefined,
                        }}
                    >
                        <Typography variant="caption" noWrap sx={{ opacity: out.text ? 0.85 : 0 }}>
                            {out.text || ' '}
                        </Typography>
                    </Box>
                );
            })}
        </Stack>
    );
};

const stripNeedsTick = (config: HeadFootConfig | undefined): boolean => {
    if (!config) {
        return false;
    }
    for (const region of regionOrder) {
        if (config[region] === 'clock') {
            return true;
        }
    }
    return false;
};

/**
 * Calibre-web-style reader chrome: a header strip above the content and a
 * footer strip below it, each with 3 customizable regions (left/middle/right)
 * filled by section types (`renderSection`). The chrome stays visible above
 * the content pane even while the floating overlay is hidden, providing the
 * persistent "title → progress % → clock" HUD statue of calibre's reading
 * view that only the lingering control panels occlude.
 *
 * The `clock` section ticks once per second — handled here by an internal
 * 1 s timer when any rendered region requests ticking.
 */
export const NovelReaderChrome = ({
    settings,
    ctx,
    color,
    onChromeControlClick,
    forceShowControl,
    visible,
    onBack,
}: {
    settings: NovelReaderSettings;
    ctx: HeadFootRenderCtx;
    color: string;
    onChromeControlClick?: () => void;
    forceShowControl?: boolean;
    visible?: boolean;
    onBack?: () => void;
}) => {
    const [, setTick] = useState(0);
    const needsTick = stripNeedsTick(settings.header) || stripNeedsTick(settings.footer);

    useEffect(() => {
        if (!needsTick) {
            return undefined;
        }
        const id = setInterval(() => setTick((x) => x + 1), 1000);
        return () => clearInterval(id);
    }, [needsTick]);

    return (
        <Box
            sx={{
                position: 'absolute',
                inset: 0,
                pointerEvents: 'none',
                zIndex: 0,
                opacity: visible === false ? 0 : 1,
                transition: 'opacity 0.2s',
            }}
        >
            <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
                <Stack direction="row" sx={{ alignItems: 'center', pointerEvents: 'auto' }}>
                    {onBack && (
                        <IconButton aria-label="back" onClick={onBack} sx={{ color, ml: 0.5, py: 0.5 }}>
                            <ArrowBack fontSize="small" />
                        </IconButton>
                    )}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <ChromeRow
                            config={settings.header ?? {}}
                            ctx={ctx}
                            color={color}
                            onChromeControlClick={onChromeControlClick}
                            forceShowControl={forceShowControl}
                        />
                    </Box>
                </Stack>
            </Box>
            <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                <ChromeRow
                    config={settings.footer ?? {}}
                    ctx={ctx}
                    color={color}
                    onChromeControlClick={onChromeControlClick}
                    forceShowControl={forceShowControl}
                />
            </Box>
        </Box>
    );
};
