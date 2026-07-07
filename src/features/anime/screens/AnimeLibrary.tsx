/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback } from 'react';
import { useLingui } from '@lingui/react/macro';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { BaseMangaGrid } from '@/features/manga/components/BaseMangaGrid.tsx';
import { MangaRouteContext } from '@/features/manga/components/MangaRouteContext.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { useAnimeLibrary } from '@/features/anime/services/AnimeApi.ts';

const noop = () => {};

export function AnimeLibrary() {
    const { t } = useLingui();
    useAppTitle(t`Anime Library`);

    const { data: mangas, loading, error, refetch } = useAnimeLibrary();

    const getAnimeRouteUrl = useCallback((id: number) => AppRoutes.anime.path(id), []);

    return (
        <MangaRouteContext.Provider value={getAnimeRouteUrl}>
            <BaseMangaGrid
                mangas={mangas}
                hasNextPage={false}
                loadMore={noop}
                isLoading={loading}
                message={error ? t`Failed to load the anime library` : t`Your anime library is empty`}
                messageExtra={error?.message}
                retry={error ? () => refetch() : undefined}
            />
        </MangaRouteContext.Provider>
    );
}
