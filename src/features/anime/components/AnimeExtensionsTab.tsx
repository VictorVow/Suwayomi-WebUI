/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useMemo } from 'react';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import { StringParam, useQueryParam } from 'use-query-params';
import { Link } from 'react-router-dom';
import { useLingui } from '@lingui/react/macro';
import { CustomTooltip } from '@/base/components/CustomTooltip.tsx';
import { AppbarSearch } from '@/base/components/AppbarSearch.tsx';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { SearchParam } from '@/base/Base.types.ts';
import { useAppAction } from '@/features/navigation-bar/hooks/useAppAction.ts';
import { useAnimeExtensionList } from '@/features/anime/services/AnimeApi.ts';
import { AnimeUnavailableView } from '@/features/anime/components/AnimeUnavailableView.tsx';
import { ExtensionCard } from '@/features/browse/extensions/components/ExtensionCard.tsx';

export const AnimeExtensionsTab = () => {
    const { t } = useLingui();
    const { data: extensions, loading, available, refetch } = useAnimeExtensionList();

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
        return <AnimeUnavailableView message={t`No anime extensions`} />;
    }

    if (!filteredExtensions.length) {
        return <AnimeUnavailableView message={t`No extensions found`} />;
    }

    return (
        <Stack sx={{ gap: 1, p: 1 }}>
            {filteredExtensions.map((extension) => (
                <ExtensionCard
                    key={extension.pkgName}
                    extension={extension}
                    handleUpdate={() => refetch()}
                    showSourceRepo={false}
                />
            ))}
        </Stack>
    );
};
