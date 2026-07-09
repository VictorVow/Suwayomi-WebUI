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
import TravelExploreIcon from '@mui/icons-material/TravelExplore';
import { StringParam, useQueryParam } from 'use-query-params';
import { useNavigate } from 'react-router-dom';
import { useLingui } from '@lingui/react/macro';
import { CustomTooltip } from '@/base/components/CustomTooltip.tsx';
import { AppbarSearch } from '@/base/components/AppbarSearch.tsx';
import { ListItemLink } from '@/base/components/lists/ListItemLink.tsx';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { SearchParam } from '@/base/Base.types.ts';
import { useAppAction } from '@/features/navigation-bar/hooks/useAppAction.ts';
import { NovelUnavailableView } from '@/features/novel/components/NovelUnavailableView.tsx';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { ContentType } from '@/lib/graphql/generated/graphql-base.types.ts';
import { Sources as SourceService } from '@/features/source/services/Sources.ts';
import { SourceLanguageSelect } from '@/features/source/components/SourceLanguageSelect.tsx';
import { useMetadataServerSettings } from '@/features/settings/services/ServerSettingsMetadata.ts';
import { STABLE_EMPTY_ARRAY } from '@/base/Base.constants.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';

export const NovelSourcesTab = () => {
    const { t } = useLingui();
    const navigate = useNavigate();

    const { languages: shownLangs, setLanguages: setShownLangs } = SourceService.useLanguages();
    const {
        settings: { showNsfw },
    } = useMetadataServerSettings();

    const { data, loading, error, refetch } = requestManager.useGetSourceList({
        contentType: ContentType.Novel,
    });
    const sources = data?.sources.nodes ?? STABLE_EMPTY_ARRAY;

    const filteredSources = useMemo(
        () =>
            SourceService.filter(sources, {
                isNsfw: showNsfw ? undefined : false,
                languages: shownLangs,
                keepLocalSource: true,
                enabled: true,
            }),
        [sources, shownLangs],
    );
    const sourcesForLanguageFilter = useMemo(
        () =>
            SourceService.filter(sources, {
                isNsfw: showNsfw ? undefined : false,
                removeLocalSource: true,
            }),
        [sources],
    );
    const sourceLanguages = useMemo(
        () => SourceService.getLanguages(sourcesForLanguageFilter, { excludeLocalSource: true }),
        [sources],
    );

    const [query] = useQueryParam(SearchParam.QUERY, StringParam);

    const queryFilteredSources = useMemo(() => {
        if (!query) {
            return filteredSources;
        }

        const normalizedQuery = query.toLowerCase();
        return filteredSources.filter((source) => source.name.toLowerCase().includes(normalizedQuery));
    }, [filteredSources, query]);

    useAppAction(
        <>
            <AppbarSearch />
            <CustomTooltip title={t`Global Search`}>
                <IconButton onClick={() => navigate(AppRoutes.novelSources.children.searchAll.path())} color="inherit">
                    <TravelExploreIcon />
                </IconButton>
            </CustomTooltip>
            <SourceLanguageSelect
                selectedLanguages={shownLangs}
                setSelectedLanguages={setShownLangs}
                languages={sourceLanguages}
                sources={sourcesForLanguageFilter}
            />
        </>,
        [t, shownLangs, sourceLanguages, sourcesForLanguageFilter],
    );

    if (loading) {
        return <LoadingPlaceholder />;
    }

    if (error) {
        return (
            <EmptyViewAbsoluteCentered
                message={t`Unable to load data`}
                messageExtra={getErrorMessage(error)}
                retry={() => refetch().catch(defaultPromiseErrorHandler('NovelSourcesTab::refetch'))}
            />
        );
    }

    if (!sources.length) {
        return <NovelUnavailableView message={t`No novel sources`} />;
    }

    if (!queryFilteredSources.length) {
        return <NovelUnavailableView message={t`No sources found`} />;
    }

    return (
        <List>
            {queryFilteredSources.map((source) => (
                <ListItemLink key={source.id} to={AppRoutes.novelSources.children.browse.path(source.id)}>
                    <ListItemAvatar>
                        <Avatar variant="rounded" src={source.iconUrl} alt={source.name} />
                    </ListItemAvatar>
                    <ListItemText primary={source.name} secondary={source.lang.toUpperCase()} />
                </ListItemLink>
            ))}
        </List>
    );
};
