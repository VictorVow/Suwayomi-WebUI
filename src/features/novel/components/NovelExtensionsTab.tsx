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
import { useNovelExtensionList } from '@/features/novel/services/NovelApi.ts';
import { NovelUnavailableView } from '@/features/novel/components/NovelUnavailableView.tsx';

export const NovelExtensionsTab = () => {
    const { t } = useLingui();
    const { data: extensions, loading, available } = useNovelExtensionList();

    const [query] = useQueryParam(SearchParam.QUERY, StringParam);

    const filteredExtensions = useMemo(() => {
        if (!query) {
            return extensions;
        }

        const normalizedQuery = query.toLowerCase();
        return extensions.filter((extension) => extension.name.toLowerCase().includes(normalizedQuery));
    }, [extensions, query]);

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

    if (!available || !extensions.length) {
        return <NovelUnavailableView message={t`No novel extensions`} />;
    }

    if (!filteredExtensions.length) {
        return <NovelUnavailableView message={t`No extensions found`} />;
    }

    return (
        <List>
            {filteredExtensions.map((extension) => (
                <ListItemLink key={extension.pkgName} to={AppRoutes.extension.children.info.path(extension.pkgName)}>
                    <ListItemAvatar>
                        <Avatar variant="rounded" src={extension.iconUrl} alt={extension.name} />
                    </ListItemAvatar>
                    <ListItemText
                        primary={extension.name}
                        secondary={`${extension.lang.toUpperCase()} • v${extension.versionName}`}
                    />
                </ListItemLink>
            ))}
        </List>
    );
};
