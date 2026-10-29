/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { JSX } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { StringParam, useQueryParam } from 'use-query-params';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import SettingsIcon from '@mui/icons-material/Settings';
import { useLingui } from '@lingui/react/macro';
import { CustomTooltip } from '@/base/components/CustomTooltip.tsx';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { AppbarSearch } from '@/base/components/AppbarSearch.tsx';
import { BaseMangaGrid } from '@/features/manga/components/BaseMangaGrid.tsx';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import type {
    FetchShowHomepageMutation,
    GetSourceBrowseQuery,
    GetSourceBrowseQueryVariables,
} from '@/lib/graphql/generated/graphql.ts';
import { GET_SOURCE_BROWSE } from '@/lib/graphql/source/SourceQuery.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';
import { SearchParam } from '@/base/Base.types';
import { STABLE_EMPTY_ARRAY } from '@/base/Base.constants.ts';
import { useAppTitleAndAction } from '@/features/navigation-bar/hooks/useAppTitleAndAction.ts';
import { IconWebView } from '@/assets/icons/IconWebView.tsx';
import { SourceMangas } from '@/features/source/browse/screens/SourceMangas.tsx';

type ShowHomepageRowData = NonNullable<FetchShowHomepageMutation['fetchShowHomepage']>['rows'][number];

function ShowHomepageRowSection({
    sourceId,
    rowIndex,
    row,
}: {
    sourceId: string;
    rowIndex: number;
    row: ShowHomepageRowData;
}): JSX.Element | null {
    const [items, setItems] = useState(row.items);
    const [hasNextPage, setHasNextPage] = useState(row.hasNextPage);
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        setItems(row.items);
        setHasNextPage(row.hasNextPage);
        setPage(1);
    }, [row]);

    const loadMore = useCallback(() => {
        if (isLoading || !hasNextPage) {
            return;
        }

        const nextPage = page + 1;
        setIsLoading(true);
        requestManager
            .fetchShowHomepageRow(sourceId, nextPage, rowIndex)
            .response.then(({ data }) => {
                const nextRow = data?.fetchShowHomepageRow?.row;
                setItems((prev) => [...prev, ...(nextRow?.items ?? [])]);
                setHasNextPage(!!nextRow?.hasNextPage);
                setPage(nextPage);
            })
            .catch(defaultPromiseErrorHandler('ShowSourceHomepage::loadMoreRow'))
            .finally(() => setIsLoading(false));
    }, [isLoading, hasNextPage, page, sourceId, rowIndex]);

    if (!items.length && !hasNextPage) {
        return null;
    }

    return (
        <Stack sx={{ gap: 1 }}>
            <Typography variant="h6" component="h2" sx={{ px: 1 }}>
                {row.name}
            </Typography>
            <BaseMangaGrid
                mangas={items}
                hasNextPage={hasNextPage}
                loadMore={loadMore}
                isLoading={isLoading}
                horizontal
                inLibraryIndicator
            />
        </Stack>
    );
}

/**
 * Browse entry point for show (Cloudstream) sources. Cloudstream has no
 * filter/search-preview concept beyond a plain text query, so a search
 * (`?q=...`) is delegated to the shared `SourceMangas` search UI, while the
 * default (no query) view renders every `getMainPage()` row with its own
 * independently paginated grid via {@link ShowSourceHomepage}. Only one of
 * the two is ever mounted, since both call `useAppTitleAndAction` and
 * mounting both simultaneously would race to set the appbar title/actions.
 */
export function ShowSourceBrowse(): JSX.Element {
    const [query] = useQueryParam(SearchParam.QUERY, StringParam);

    if (query) {
        return <SourceMangas />;
    }

    return <ShowSourceHomepage />;
}

function ShowSourceHomepage(): JSX.Element {
    const { t } = useLingui();
    const navigate = useNavigate();
    const { sourceId } = useParams<{ sourceId: string }>();

    const { data: sourceData } = requestManager.useGetSource<GetSourceBrowseQuery, GetSourceBrowseQueryVariables>(
        GET_SOURCE_BROWSE,
        sourceId!,
    );
    const source = sourceData?.source;

    const [fetchHomepage, { data, loading, error }] = requestManager.useFetchShowHomepage(sourceId!, 1);
    const homepageVariables = { input: { source: sourceId!, page: 1 } };

    useEffect(() => {
        fetchHomepage({ variables: homepageVariables }).catch(
            defaultPromiseErrorHandler('ShowSourceHomepage::fetchHomepage'),
        );
    }, [sourceId]);

    useAppTitleAndAction(
        source?.displayName ?? t`Source`,
        <>
            <AppbarSearch liveSearch={false} />
            <CustomTooltip title={t`Open in WebView`} disabled={!source?.baseUrl}>
                <IconButton
                    disabled={!source?.baseUrl}
                    href={source?.baseUrl ? requestManager.getWebviewUrl(source?.baseUrl) : ''}
                    rel="noreferrer"
                    target="_blank"
                    color="inherit"
                >
                    <IconWebView />
                </IconButton>
            </CustomTooltip>
            {source?.isConfigurable && (
                <CustomTooltip title={t`Settings`}>
                    <IconButton
                        onClick={() => navigate(AppRoutes.showSources.children.configure.path(sourceId!))}
                        aria-label="display more actions"
                        edge="end"
                        color="inherit"
                    >
                        <SettingsIcon />
                    </IconButton>
                </CustomTooltip>
            )}
        </>,
        [source],
    );

    const rows = data?.fetchShowHomepage?.rows ?? STABLE_EMPTY_ARRAY;

    if (loading && !rows.length) {
        return <LoadingPlaceholder />;
    }

    if (error && !rows.length) {
        return (
            <EmptyViewAbsoluteCentered
                message={t`Unable to load data`}
                messageExtra={getErrorMessage(error)}
                retry={() =>
                    fetchHomepage({ variables: homepageVariables }).catch(
                        defaultPromiseErrorHandler('ShowSourceHomepage::retry'),
                    )
                }
            />
        );
    }

    if (!rows.length) {
        return <EmptyViewAbsoluteCentered message={t`No shows found`} />;
    }

    return (
        <Stack sx={{ p: 1, gap: 3 }}>
            {rows.map((row, index) => (
                <ShowHomepageRowSection key={row.name} sourceId={sourceId!} rowIndex={index} row={row} />
            ))}
        </Stack>
    );
}
