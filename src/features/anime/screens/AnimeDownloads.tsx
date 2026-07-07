/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useLingui } from '@lingui/react/macro';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { useAnimeDownloadQueue } from '@/features/anime/services/AnimeApi.ts';
import { AnimeDownloadList } from '@/features/anime/components/AnimeDownloadList.tsx';

export function AnimeDownloads() {
    const { t } = useLingui();
    useAppTitle(t`Anime Downloads`);

    const { data, loading, available } = useAnimeDownloadQueue();

    return (
        <AnimeDownloadList rows={data} loading={loading} available={available} emptyMessage={t`No anime downloads`} />
    );
}
