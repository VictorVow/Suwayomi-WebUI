/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { JSX } from 'react';
import { useMemo } from 'react';
import Stack from '@mui/material/Stack';
import { useLingui } from '@lingui/react/macro';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { GET_MANGAS_LIBRARY } from '@/lib/graphql/manga/MangaQuery.ts';
import { ContentType } from '@/lib/graphql/generated/graphql-base.types.ts';
import type { GetMangasLibraryQuery, GetMangasLibraryQueryVariables } from '@/lib/graphql/generated/graphql.ts';
import { useAnimeLibrary } from '@/features/anime/services/AnimeApi.ts';
import { useNovelLibrary } from '@/features/novel/services/NovelApi.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { HomeLibraryRow } from '@/features/home/components/HomeLibraryRow.tsx';

const PREVIEW_COUNT = 12;

const animeRouteBuilder = (id: number) => AppRoutes.anime.path(id);
const novelRouteBuilder = (id: number) => AppRoutes.novelDetail.path(id);

export function Home(): JSX.Element {
    const { t } = useLingui();
    useAppTitle(t`Home`);

    const mangaLibrary = requestManager.useGetMangas<GetMangasLibraryQuery, GetMangasLibraryQueryVariables>(
        GET_MANGAS_LIBRARY,
        { condition: { inLibrary: true, contentType: ContentType.Manga } },
    );
    const animeLibrary = useAnimeLibrary();
    const novelLibrary = useNovelLibrary();

    const mangaPreview = useMemo(
        () => (mangaLibrary.data?.mangas.nodes ?? []).slice(0, PREVIEW_COUNT),
        [mangaLibrary.data],
    );
    const animePreview = useMemo(() => animeLibrary.data.slice(0, PREVIEW_COUNT), [animeLibrary.data]);
    const novelPreview = useMemo(() => novelLibrary.data.slice(0, PREVIEW_COUNT), [novelLibrary.data]);

    return (
        <Stack sx={{ p: 2, gap: 3 }}>
            <HomeLibraryRow
                title={t`Manga`}
                seeAllTo={AppRoutes.library.path()}
                mangas={mangaPreview}
                isLoading={mangaLibrary.loading}
                error={mangaLibrary.error ?? undefined}
                emptyMessage={t`Your manga library is empty`}
            />
            <HomeLibraryRow
                title={t`Anime`}
                seeAllTo={AppRoutes.animeLibrary.path}
                mangas={animePreview}
                isLoading={animeLibrary.loading}
                error={animeLibrary.error}
                emptyMessage={t`Your anime library is empty`}
                routeBuilder={animeRouteBuilder}
            />
            <HomeLibraryRow
                title={t`Novels`}
                seeAllTo={AppRoutes.novel.children.library.path}
                mangas={novelPreview}
                isLoading={novelLibrary.loading}
                error={novelLibrary.error}
                emptyMessage={t`Your novel library is empty`}
                routeBuilder={novelRouteBuilder}
            />
        </Stack>
    );
}
