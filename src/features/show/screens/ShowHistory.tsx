/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useLingui } from '@lingui/react/macro';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { useShowHistory } from '@/features/show/services/ShowApi.ts';
import { ShowEpisodeList } from '@/features/show/components/ShowEpisodeList.tsx';

export function ShowHistory() {
    const { t } = useLingui();
    useAppTitle(t`Show History`);

    const { data, loading, available } = useShowHistory();

    return (
        <ShowEpisodeList
            rows={data}
            loading={loading}
            available={available}
            emptyMessage={t`No show watching history`}
        />
    );
}
