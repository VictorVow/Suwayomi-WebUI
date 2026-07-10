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
import type { ShowEpisodeRow } from '@/features/show/Show.types.ts';
import { ShowUnavailableView } from '@/features/show/components/ShowUnavailableView.tsx';

/**
 * Renders a show Updates / History feed as a list of episode rows. Each row
 * links to the show's detail page (the episode list), from which the player
 * can be launched.
 */
export const ShowEpisodeList = ({
    rows,
    loading,
    available,
    emptyMessage,
}: {
    rows: ShowEpisodeRow[];
    loading: boolean;
    available: boolean;
    emptyMessage?: string;
}) => {
    if (loading && !rows.length) {
        return <LoadingPlaceholder />;
    }

    if (!available || !rows.length) {
        return <ShowUnavailableView message={emptyMessage} />;
    }

    return (
        <List>
            {rows.map((row) => (
                <ListItemLink key={row.chapterId} to={AppRoutes.show.path(row.mangaId)}>
                    <ListItemAvatar>
                        <Avatar variant="rounded" src={row.thumbnailUrl ?? undefined} alt={row.showTitle} />
                    </ListItemAvatar>
                    <ListItemText primary={row.showTitle} secondary={row.episodeName} />
                </ListItemLink>
            ))}
        </List>
    );
};
