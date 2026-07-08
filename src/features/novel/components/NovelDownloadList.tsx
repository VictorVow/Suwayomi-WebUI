/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import List from '@mui/material/List';
import ListItemText from '@mui/material/ListItemText';
import LinearProgress from '@mui/material/LinearProgress';
import Box from '@mui/material/Box';
import { ListItemLink } from '@/base/components/lists/ListItemLink.tsx';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import type { NovelDownloadRow } from '@/features/novel/Novel.types.ts';
import { NovelUnavailableView } from '@/features/novel/components/NovelUnavailableView.tsx';

/** Renders the novel-only slice of the download queue. */
export const NovelDownloadList = ({
    rows,
    loading,
    available,
    emptyMessage,
}: {
    rows: NovelDownloadRow[];
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
                <ListItemLink key={row.chapterId} to={AppRoutes.novelDetail.path(row.mangaId)}>
                    <Box sx={{ width: '100%' }}>
                        <ListItemText primary={row.mangaTitle} secondary={`${row.chapterName} — ${row.state}`} />
                        <LinearProgress
                            variant="determinate"
                            value={Math.round(row.progress * 100)}
                            sx={{ mt: 0.5, borderRadius: 1 }}
                        />
                    </Box>
                </ListItemLink>
            ))}
        </List>
    );
};
