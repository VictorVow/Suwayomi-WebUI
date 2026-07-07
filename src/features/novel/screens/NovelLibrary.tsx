/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useLingui } from '@lingui/react/macro';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { useNovelLibrary } from '@/features/novel/services/NovelApi.ts';
import { NovelEntryGrid } from '@/features/novel/components/NovelEntryGrid.tsx';

export function NovelLibrary() {
    const { t } = useLingui();
    useAppTitle(t`Novel Library`);

    const { data, loading, available } = useNovelLibrary();

    return (
        <NovelEntryGrid
            entries={data}
            loading={loading}
            available={available}
            emptyMessage={t`Your novel library is empty`}
        />
    );
}
