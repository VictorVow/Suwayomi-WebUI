/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useLingui } from '@lingui/react/macro';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { useAnimeHistory } from '@/features/anime/services/AnimeApi.ts';
import { AnimeEpisodeList } from '@/features/anime/components/AnimeEpisodeList.tsx';

export function AnimeHistory() {
    const { t } = useLingui();
    useAppTitle(t`Anime History`);

    const { data, loading, available } = useAnimeHistory();

    return (
        <AnimeEpisodeList
            rows={data}
            loading={loading}
            available={available}
            emptyMessage={t`No anime watching history`}
        />
    );
}
