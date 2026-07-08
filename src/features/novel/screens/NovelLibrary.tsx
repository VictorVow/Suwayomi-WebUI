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
import { useNovelLibrary } from '@/features/novel/services/NovelApi.ts';

const noop = () => {};

export function NovelLibrary() {
    const { t } = useLingui();
    useAppTitle(t`Novel Library`);

    const { data: mangas, loading, error, refetch } = useNovelLibrary();

    const getNovelRouteUrl = useCallback((id: number) => AppRoutes.novelDetail.path(id), []);

    return (
        <MangaRouteContext.Provider value={getNovelRouteUrl}>
            <BaseMangaGrid
                mangas={mangas}
                hasNextPage={false}
                loadMore={noop}
                isLoading={loading}
                message={error ? t`Failed to load the novel library` : t`Your novel library is empty`}
                messageExtra={error?.message}
                retry={error ? () => refetch() : undefined}
            />
        </MangaRouteContext.Provider>
    );
}
