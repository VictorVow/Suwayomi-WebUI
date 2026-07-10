/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useState } from 'react';
import Button from '@mui/material/Button';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Dialog from '@mui/material/Dialog';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemIcon from '@mui/material/ListItemIcon';
import Radio from '@mui/material/Radio';
import { useLingui } from '@lingui/react/macro';
import { AwaitableComponent, type AwaitableComponentProps } from 'awaitable-component';
import type { ShowVideo } from '@/features/show/player/Player.types.ts';

/** Formats a byte count as a human-readable size (e.g. "324 MB"). */
const formatSize = (bytes: number | null): string => {
    if (bytes == null) {
        return '';
    }
    if (bytes < 1024) {
        return `${bytes} B`;
    }
    const mb = bytes / (1024 * 1024);
    if (mb < 1) {
        return `${(bytes / 1024).toFixed(0)} KB`;
    }
    if (mb < 1024) {
        return `${mb.toFixed(0)} MB`;
    }
    return `${(mb / 1024).toFixed(2)} GB`;
};

export interface QualityPickerDialogProps extends AwaitableComponentProps<number> {
    videos: ShowVideo[];
    /** Parallel array of estimated file sizes (null = unknown). */
    sizes: (number | null)[];
}

/**
 * Single-select dialog listing the available video quality renditions for an
 * show episode, with their estimated file sizes. Returns the chosen index via
 * `AwaitableComponent.show`. Mirrors the `LanguageSelectDialog` pattern.
 */
const QualityPickerDialog = ({
    isVisible,
    onDismiss,
    onSubmit,
    onExitComplete,
    videos,
    sizes,
}: QualityPickerDialogProps) => {
    const { t } = useLingui();
    const [selected, setSelected] = useState(0);

    return (
        <Dialog fullWidth maxWidth="xs" open={isVisible} onClose={onDismiss} onTransitionExited={onExitComplete}>
            <DialogTitle>{t`Select quality`}</DialogTitle>
            <DialogContent dividers sx={{ padding: 0 }}>
                <List>
                    {videos.map((video, index) => {
                        const label = video.resolution ?? video.videoTitle ?? `${t`Quality`} ${index + 1}`;
                        const size = sizes[index];
                        return (
                            <ListItemButton
                                key={video.videoUrl}
                                onClick={() => setSelected(index)}
                                selected={selected === index}
                            >
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <Radio edge="start" checked={selected === index} tabIndex={-1} />
                                </ListItemIcon>
                                <ListItemText
                                    primary={label}
                                    secondary={size != null ? `≈ ${formatSize(size)}` : undefined}
                                />
                            </ListItemButton>
                        );
                    })}
                </List>
            </DialogContent>
            <DialogActions>
                <Button autoFocus onClick={onDismiss} color="primary">
                    {t`Cancel`}
                </Button>
                <Button onClick={() => onSubmit(selected)} color="primary" variant="contained">
                    {t`Download`}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

/**
 * Shows the quality-picker dialog and resolves to the user's chosen rendition
 * index. Rejects (throws) when the user cancels — callers should swallow the
 * rejection.
 */
export const showQualityPicker = (videos: ShowVideo[], sizes: (number | null)[]): Promise<number> =>
    AwaitableComponent.show(QualityPickerDialog, { videos, sizes });
