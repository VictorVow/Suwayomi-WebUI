/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useLingui } from '@lingui/react/macro';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { useNovelUpdates } from '@/features/novel/services/NovelApi.ts';
import { NovelChapterList } from '@/features/novel/components/NovelChapterList.tsx';

export function NovelUpdates() {
    const { t } = useLingui();
    useAppTitle(t`Novel Updates`);

    const { data, loading, available } = useNovelUpdates();

    return <NovelChapterList rows={data} loading={loading} available={available} emptyMessage={t`No novel updates`} />;
}
