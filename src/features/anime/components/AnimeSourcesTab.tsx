/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useMemo } from 'react';
import List from '@mui/material/List';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import { StringParam, useQueryParam } from 'use-query-params';
import { Link } from 'react-router-dom';
import { useLingui } from '@lingui/react/macro';
import { CustomTooltip } from '@/base/components/CustomTooltip.tsx';
import { AppbarSearch } from '@/base/components/AppbarSearch.tsx';
import { ListItemLink } from '@/base/components/lists/ListItemLink.tsx';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { SearchParam } from '@/base/Base.types.ts';
import { useAppAction } from '@/features/navigation-bar/hooks/useAppAction.ts';
import { useAnimeSourceList } from '@/features/anime/services/AnimeApi.ts';
import { AnimeUnavailableView } from '@/features/anime/components/AnimeUnavailableView.tsx';

export const AnimeSourcesTab = () => {
    const { t } = useLingui();
    const { data: sources, loading, available } = useAnimeSourceList();

    const [query] = useQueryParam(SearchParam.QUERY, StringParam);

    const filteredSources = useMemo(() => {
        if (!query) {
            return sources;
        }

        const normalizedQuery = query.toLowerCase();
        return sources.filter((source) => source.name.toLowerCase().includes(normalizedQuery));
    }, [sources, query]);

    useAppAction(
        <>
            <AppbarSearch />
            <CustomTooltip title={t`Settings`}>
                <IconButton component={Link} to={AppRoutes.settings.children.browse.path} color="inherit">
                    <SettingsIcon />
                </IconButton>
            </CustomTooltip>
        </>,
        [t],
    );

    if (loading) {
        return <LoadingPlaceholder />;
    }

    if (!available || !sources.length) {
        return <AnimeUnavailableView message={t`No anime sources`} />;
    }

    if (!filteredSources.length) {
        return <AnimeUnavailableView message={t`No sources found`} />;
    }

    return (
        <List>
            {filteredSources.map((source) => (
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
