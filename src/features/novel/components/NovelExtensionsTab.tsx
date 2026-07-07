/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import List from '@mui/material/List';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Avatar from '@mui/material/Avatar';
import { useLingui } from '@lingui/react/macro';
import { ListItemLink } from '@/base/components/lists/ListItemLink.tsx';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { useNovelExtensionList } from '@/features/novel/services/NovelApi.ts';
import { NovelUnavailableView } from '@/features/novel/components/NovelUnavailableView.tsx';

export const NovelExtensionsTab = () => {
    const { t } = useLingui();
    const { data: extensions, loading, available } = useNovelExtensionList();

    if (loading) {
        return <LoadingPlaceholder />;
    }

    if (!available || !extensions.length) {
        return <NovelUnavailableView message={t`No novel extensions`} />;
    }

    return (
        <List>
            {extensions.map((extension) => (
                <ListItemLink key={extension.pkgName} to={AppRoutes.extension.children.info.path(extension.pkgName)}>
                    <ListItemAvatar>
                        <Avatar variant="rounded" src={extension.iconUrl} alt={extension.name} />
                    </ListItemAvatar>
                    <ListItemText
                        primary={extension.name}
                        secondary={`${extension.lang.toUpperCase()} • v${extension.versionName}`}
                    />
                </ListItemLink>
            ))}
        </List>
    );
};
