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
import type { AnimeDownloadRow } from '@/features/anime/Anime.types.ts';
import { AnimeUnavailableView } from '@/features/anime/components/AnimeUnavailableView.tsx';

/** Renders the anime-only slice of the download queue. */
export const AnimeDownloadList = ({
    rows,
    loading,
    available,
    emptyMessage,
}: {
    rows: AnimeDownloadRow[];
    loading: boolean;
    available: boolean;
    emptyMessage?: string;
}) => {
    if (loading && !rows.length) {
        return <LoadingPlaceholder />;
    }

    if (!available || !rows.length) {
        return <AnimeUnavailableView message={emptyMessage} />;
    }

    return (
        <List>
            {rows.map((row) => (
                <ListItemLink key={row.chapterId} to={AppRoutes.anime.path(row.mangaId)}>
                    <Box sx={{ width: '100%' }}>
                        <ListItemText primary={row.animeTitle} secondary={`${row.episodeName} — ${row.state}`} />
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
