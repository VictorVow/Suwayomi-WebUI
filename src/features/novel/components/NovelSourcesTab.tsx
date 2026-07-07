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
import { useLingui } from '@lingui/react/macro';
import { ListItemLink } from '@/base/components/lists/ListItemLink.tsx';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { useNovelSourceList } from '@/features/novel/services/NovelApi.ts';
import { NovelUnavailableView } from '@/features/novel/components/NovelUnavailableView.tsx';

export const NovelSourcesTab = () => {
    const { t } = useLingui();
    const { data: sources, loading, available } = useNovelSourceList();

    if (loading) {
        return <LoadingPlaceholder />;
    }

    if (!available || !sources.length) {
        return <NovelUnavailableView message={t`No novel sources`} />;
    }

    return (
        <List>
            {sources.map((source) => (
                <ListItemLink key={source.id} to={AppRoutes.sources.children.browse.path(source.id)}>
                    <ListItemAvatar>
                        <Avatar variant="rounded" src={source.iconUrl} alt={source.name} />
                    </ListItemAvatar>
                    <ListItemText primary={source.name} secondary={source.lang.toUpperCase()} />
                </ListItemLink>
            ))}
        </List>
    );
};
