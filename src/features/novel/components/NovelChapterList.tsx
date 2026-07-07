/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import List from '@mui/material/List';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import { ListItemLink } from '@/base/components/lists/ListItemLink.tsx';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import type { NovelChapterRow } from '@/features/novel/Novel.types.ts';
import { NovelUnavailableView } from '@/features/novel/components/NovelUnavailableView.tsx';

/**
 * Renders a novel Updates / History feed as a list of chapter rows. Each row
 * links to the novel's detail page (the chapter list) rather than straight into
 * the reader, since the reader cannot yet render novel text.
 */
export const NovelChapterList = ({
    rows,
    loading,
    available,
    emptyMessage,
}: {
    rows: NovelChapterRow[];
    loading: boolean;
    available: boolean;
    emptyMessage?: string;
}) => {
    if (loading && !rows.length) {
        return <LoadingPlaceholder />;
    }

    if (!available || !rows.length) {
        return <NovelUnavailableView message={emptyMessage} />;
    }

    return (
        <List>
            {rows.map((row) => (
                <ListItemLink key={row.chapterId} to={AppRoutes.manga.path(row.mangaId)}>
                    <ListItemAvatar>
                        <Avatar variant="rounded" src={row.thumbnailUrl ?? undefined} alt={row.mangaTitle} />
                    </ListItemAvatar>
                    <ListItemText primary={row.mangaTitle} secondary={row.chapterName} />
                </ListItemLink>
            ))}
        </List>
    );
};
