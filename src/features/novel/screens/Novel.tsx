/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Warning from '@mui/icons-material/Warning';
import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import React, { useEffect, useRef } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { isNetworkRequestInFlight } from '@apollo/client/utilities';
import { useLingui } from '@lingui/react/macro';
import { CustomTooltip } from '@/base/components/CustomTooltip.tsx';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { ChapterList } from '@/features/chapter/components/ChapterList.tsx';
import { ChapterRouteContext } from '@/features/chapter/components/ChapterRouteContext.ts';
import { Chapters } from '@/features/chapter/services/Chapters.ts';
import { useRefreshManga } from '@/features/manga/hooks/useRefreshManga.ts';
import { MangaDetails } from '@/features/manga/components/details/MangaDetails.tsx';
import { MangaToolbarMenu } from '@/features/manga/components/MangaToolbarMenu.tsx';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import type { GetMangaScreenQuery } from '@/lib/graphql/generated/graphql.ts';
import { GET_MANGA_SCREEN } from '@/lib/graphql/manga/MangaQuery.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { STABLE_EMPTY_OBJECT } from '@/base/Base.constants.ts';
import { useAppTitleAndAction } from '@/features/navigation-bar/hooks/useAppTitleAndAction.ts';
import type { MangaLocationState } from '@/features/manga/Manga.types.ts';

/**
 * Novel detail screen. Mirrors the Manga detail screen — novel titles are manga
 * rows whose source has a negative id (see {@link ../services/NovelApi.ts}), so
 * the same GraphQL query, {@link MangaDetails} header, and {@link ChapterList}
 * chapter list are reused.
 *
 * The only novel-specific difference: chapter (chapter) clicks route to the
 * full-screen text reader instead of the manga reader. This is done by
 * overriding {@link ChapterRouteContext} with {@link Chapters.getNovelReaderUrl}.
 */
export const Novel: React.FC = () => {
    const { t } = useLingui();
    const { id } = useParams<{ id: string }>();
    const { mode } = useLocation<MangaLocationState>().state ?? STABLE_EMPTY_OBJECT;

    const autofetchedRef = useRef(false);

    const {
        data,
        error: mangaError,
        loading: isLoading,
        networkStatus,
        refetch,
    } = requestManager.useGetManga<GetMangaScreenQuery>(GET_MANGA_SCREEN, id);
    const isValidating = isNetworkRequestInFlight(networkStatus);
    const manga = data?.manga;

    const [refresh, { loading: refreshing, error: refreshError }] = useRefreshManga(id);

    const error = mangaError ?? refreshError;

    useEffect(() => {
        if (manga == null) {
            return;
        }

        const doFetch = !autofetchedRef.current && !manga.initialized;
        if (doFetch) {
            autofetchedRef.current = true;
            refresh();
        }
    }, [manga]);

    useAppTitleAndAction(
        manga?.title ?? t`Novel`,
        <Stack
            direction="row"
            sx={{
                alignItems: 'center',
            }}
        >
            {!!error && !isValidating && !refreshing && (
                <CustomTooltip
                    title={
                        <>
                            {t`Could not load novel`}
                            <br />
                            {getErrorMessage(error)}
                        </>
                    }
                >
                    <IconButton onClick={() => refetch()}>
                        <Warning color="error" />
                    </IconButton>
                </CustomTooltip>
            )}
            {manga && (refreshing || isValidating) && (
                <IconButton disabled>
                    <CircularProgress size={16} />
                </IconButton>
            )}
            {manga && <MangaToolbarMenu manga={manga} onRefresh={refresh} refreshing={refreshing} />}
        </Stack>,
        [t, error, isValidating, refreshing, manga, refresh],
    );

    if (error && !manga) {
        return <EmptyViewAbsoluteCentered message={t`Could not load novel`} messageExtra={getErrorMessage(error)} />;
    }
    return (
        <Box sx={{ display: { md: 'flex' }, overflow: 'hidden' }}>
            {isLoading && <LoadingPlaceholder />}

            <ChapterRouteContext.Provider value={Chapters.getNovelReaderUrl}>
                {manga && <MangaDetails manga={manga} mode={mode} />}
                {manga && <ChapterList manga={manga} isRefreshing={refreshing} />}
            </ChapterRouteContext.Provider>
        </Box>
    );
};
