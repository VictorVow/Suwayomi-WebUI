/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import { useLingui } from '@lingui/react/macro';
import {
    updateNovelReaderSettings,
    useNovelReaderSettings,
    type WordAction,
} from '@/features/novel/reader/preferences.ts';

const buildDefaultItems = (word: string, t: ReturnType<typeof useLingui>['t']): { title: string; url: string }[] => [
    { title: t`Google define`, url: `https://google.com/search?q=define:${encodeURIComponent(word)}` },
    { title: 'Wordnik', url: `https://www.wordnik.com/words/${encodeURIComponent(word)}` },
    { title: t`Search the internet`, url: `https://google.com/search?q=${encodeURIComponent(word)}` },
];

const encodeWordInUrl = (url: string, word: string): string => url.replaceAll('{word}', encodeURIComponent(word));

/**
 * Calibre's `WordActionsOverlay` analogue: a popup listing lookup URLs for the
 * currently selected word/phrase. Custom lookups persist to settings
 * (`word_actions`, mirroring calibre's session key). Selecting one opens the
 * resolved URL in a new tab. Miruyomi has no native lookup dock, so this is
 * the only word-lookup surface.
 */
export const NovelReaderWordActions = ({ word, onClose }: { word: string; onClose: () => void }) => {
    const { t } = useLingui();
    const settings = useNovelReaderSettings();
    const [adding, setAdding] = useState(false);
    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');

    const items: (WordAction & { url: string })[] = [...settings.word_actions, ...buildDefaultItems(word, t)].map((i) =>
        i.url.includes('{word}') ? { ...i, url: encodeWordInUrl(i.url, word) } : i,
    );

    const openUrl = (target: string) => {
        window.open(target, '_blank', 'noopener,noreferrer');
        onClose();
    };

    const addCustom = () => {
        if (!title.trim() || !url.trim()) {
            return;
        }
        const safeUrl = url.includes('{word}') ? url : `${url}{word}`;
        updateNovelReaderSettings({
            word_actions: [...settings.word_actions, { title: title.trim(), url: safeUrl }],
        });
        setTitle('');
        setUrl('');
        setAdding(false);
    };

    const removeCustom = (index: number) => {
        const next = settings.word_actions.filter((_, i) => i !== index);
        updateNovelReaderSettings({ word_actions: next });
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
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">{t`Lookup: ${word}`}</Typography>
                <IconButton color="inherit" onClick={onClose} aria-label={t`Close`}>
                    <CloseIcon />
                </IconButton>
            </Stack>

            <Box sx={{ maxWidth: 480, mx: 'auto', width: '100%' }}>
                <List sx={{ bgcolor: 'rgba(0,0,0,0.5)', borderRadius: 2 }}>
                    {items.map((item, index) => {
                        const isCustom = index < settings.word_actions.length;
                        return (
                            <ListItemButton key={item.url} onClick={() => openUrl(item.url)}>
                                <ListItemText primary={item.title} secondary={isCustom ? t`Custom` : undefined} />
                                {isCustom && (
                                    <IconButton
                                        color="inherit"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            removeCustom(index);
                                        }}
                                        aria-label={t`Remove`}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                )}
                            </ListItemButton>
                        );
                    })}
                </List>

                <Box sx={{ mt: 2, bgcolor: 'rgba(0,0,0,0.5)', borderRadius: 2, p: 2 }}>
                    {adding ? (
                        <Stack sx={{ gap: 1 }}>
                            <TextField
                                size="small"
                                placeholder={t`Name`}
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                            />
                            <TextField
                                size="small"
                                placeholder={t`URL with {word}`}
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                            />
                            <Stack direction="row" sx={{ gap: 1, justifyContent: 'flex-end' }}>
                                <Button onClick={() => setAdding(false)} color="inherit">
                                    {t`Cancel`}
                                </Button>
                                <Button onClick={addCustom} variant="contained" startIcon={<AddIcon />}>
                                    {t`Save`}
                                </Button>
                            </Stack>
                        </Stack>
                    ) : (
                        <Button color="inherit" startIcon={<AddIcon />} onClick={() => setAdding(true)}>
                            {t`Add a custom lookup`}
                        </Button>
                    )}
                </Box>
            </Box>
        </Stack>
    );
};
