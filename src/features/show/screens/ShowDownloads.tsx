/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useLingui } from '@lingui/react/macro';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { useShowDownloadQueue } from '@/features/show/services/ShowApi.ts';
import { ShowDownloadList } from '@/features/show/components/ShowDownloadList.tsx';

export function ShowDownloads() {
    const { t } = useLingui();
    useAppTitle(t`Show Downloads`);

    const { data, loading, available } = useShowDownloadQueue();

    return <ShowDownloadList rows={data} loading={loading} available={available} emptyMessage={t`No show downloads`} />;
}
