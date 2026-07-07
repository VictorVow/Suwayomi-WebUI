/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useParams } from 'react-router-dom';
import { useLingui } from '@lingui/react/macro';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { useNovelSource, useNovelSourceEntries } from '@/features/novel/services/NovelApi.ts';
import { NovelEntryGrid } from '@/features/novel/components/NovelEntryGrid.tsx';

export function NovelSourceBrowse() {
    const { t } = useLingui();
    const { sourceId } = useParams<{ sourceId: string }>();

    const { data: source } = useNovelSource(sourceId ?? '');
    const { data: entries, loading, available } = useNovelSourceEntries(sourceId ?? '');

    useAppTitle(source?.name ?? t`Novel Source`);

    return (
        <NovelEntryGrid
            entries={entries}
            loading={loading}
            available={available}
            emptyMessage={t`No novels found for this source`}
        />
    );
}
