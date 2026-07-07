/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import { useLingui } from '@lingui/react/macro';

export interface NovelReaderTocChapter {
    id: number;
    name: string;
    sourceOrder: number;
    isRead: boolean;
    isBookmarked: boolean;
}

/**
 * Table of contents for the novel reader: the already-fetched chapter list,
 * presented as a jump-to-chapter drawer. No separate backend call — the
 * chapter list IS the TOC for lnreader novels (there is no dedicated TOC
 * endpoint server-side).
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

    return (
        <Drawer anchor="left" open={open} onClose={onClose}>
            <Toolbar sx={{ minWidth: 280 }}>
                <Typography variant="h6">{t`Table of Contents`}</Typography>
            </Toolbar>
            <List sx={{ width: 320, overflowY: 'auto' }}>
                {chapters.map((chapter) => (
                    <ListItemButton
                        key={chapter.id}
                        selected={chapter.id === currentChapterId}
                        onClick={() => {
                            onSelectChapter(chapter.sourceOrder);
                            onClose();
                        }}
                    >
                        <ListItemText
                            primary={<Typography sx={{ opacity: chapter.isRead ? 0.6 : 1 }}>{chapter.name}</Typography>}
                        />
                        {chapter.isBookmarked && <BookmarkIcon fontSize="small" sx={{ ml: 1, opacity: 0.7 }} />}
                    </ListItemButton>
                ))}
            </List>
        </Drawer>
    );
};
