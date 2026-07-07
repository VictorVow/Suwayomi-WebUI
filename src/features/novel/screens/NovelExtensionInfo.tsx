/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useParams } from 'react-router-dom';
import Stack from '@mui/material/Stack';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import { useLingui } from '@lingui/react/macro';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { useNovelExtension } from '@/features/novel/services/NovelApi.ts';
import { NovelUnavailableView } from '@/features/novel/components/NovelUnavailableView.tsx';

export function NovelExtensionInfo() {
    const { t } = useLingui();
    const { pkgName } = useParams<{ pkgName: string }>();

    const { data: extension, loading, available } = useNovelExtension(pkgName ?? '');

    useAppTitle(extension?.name ?? t`Novel Extension`);

    if (loading) {
        return <LoadingPlaceholder />;
    }

    if (!available || !extension) {
        return <NovelUnavailableView message={t`Novel extension details unavailable`} />;
    }

    return (
        <Stack sx={{ p: 2, gap: 1, alignItems: 'center', textAlign: 'center' }}>
            <Avatar variant="rounded" src={extension.iconUrl} alt={extension.name} sx={{ width: 96, height: 96 }} />
            <Typography variant="h5">{extension.name}</Typography>
            <Typography variant="body2" color="textSecondary">
                {`${extension.lang.toUpperCase()} • v${extension.versionName}`}
            </Typography>
        </Stack>
    );
}
