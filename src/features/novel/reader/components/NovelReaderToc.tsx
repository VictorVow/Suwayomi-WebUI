/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { useLingui } from '@lingui/react/macro';
import { useNovelReaderSettings } from '@/features/novel/reader/preferences.ts';

export interface NovelReaderTocChapter {
    id: number;
    name: string;
    sourceOrder: number;
    chapterNumber: number;
    isRead: boolean;
    isBookmarked: boolean;
}

/**
 * Table of contents for the novel reader: the already-fetched chapter list,
 * presented as a jump-to-chapter drawer. No separate backend call — the
 * chapter list IS the TOC for lnreader novels (there is no dedicated TOC
 * endpoint server-side). When opened, the current chapter is scrolled to the
 * center of the list.
 */
export const NovelReaderToc = ({
    open,
    onClose,
    chapters,
    currentChapterId,
    onSelectChapter,
}: {
    open: boolean;
    onClose: () => void;
    chapters: NovelReaderTocChapter[];
    currentChapterId: number | undefined;
    onSelectChapter: (sourceOrder: number) => void;
}) => {
    const { t } = useLingui();
    const settings = useNovelReaderSettings();
    const listRef = useRef<HTMLUListElement>(null);

    const scrollToCurrent = useCallback(() => {
        const list = listRef.current;
        if (!list || !currentChapterId) {
            return;
        }
        const selected = list.querySelector('[data-selected="true"]') as HTMLElement | null;
        if (!selected) {
            return;
        }
        const listRect = list.getBoundingClientRect();
        const itemRect = selected.getBoundingClientRect();
        const offset = itemRect.top - listRect.top;
        const target = list.scrollTop + offset - (list.clientHeight - selected.offsetHeight) / 2;
        list.scrollTo({ top: target, behavior: 'auto' });
    }, [currentChapterId]);

    useEffect(() => {
        if (open) {
            scrollToCurrent();
        }
    }, [currentChapterId, open, scrollToCurrent]);

    const labelFor = (chapter: NovelReaderTocChapter) => {
        const num =
            settings.toc_chapter_number_source === 'chapterNumber' ? chapter.chapterNumber : chapter.sourceOrder;
        return `${num}. ${chapter.name}`;
    };

    return (
        <Drawer
            anchor="left"
            variant="persistent"
            open={open}
            onClose={onClose}
            slotProps={{ transition: { onEntered: scrollToCurrent, unmountOnExit: true } }}
        >
            <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minWidth: 280 }}>
                <Toolbar>
                    <Typography variant="h6">{t`Table of Contents`}</Typography>
                </Toolbar>
                <List ref={listRef} sx={{ flex: 1, minHeight: 0, overflowY: 'auto', width: 320 }}>
                    {chapters.map((chapter) => (
                        <ListItemButton
                            key={chapter.id}
                            selected={chapter.id === currentChapterId}
                            data-selected={chapter.id === currentChapterId}
                            onClick={() => {
                                onSelectChapter(chapter.sourceOrder);
                                onClose();
                            }}
                        >
                            <ListItemText
                                primary={
                                    <Typography sx={{ opacity: chapter.isRead ? 0.6 : 1 }}>
                                        {labelFor(chapter)}
                                    </Typography>
                                }
                            />
                            {chapter.isBookmarked && <BookmarkIcon fontSize="small" sx={{ ml: 1, opacity: 0.7 }} />}
                        </ListItemButton>
                    ))}
                </List>
            </Box>
        </Drawer>
    );
};
