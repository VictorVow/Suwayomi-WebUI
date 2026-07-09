/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { JSX, ReactNode } from 'react';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { Link } from 'react-router-dom';
import { useLingui } from '@lingui/react/macro';
import { BaseMangaGrid } from '@/features/manga/components/BaseMangaGrid.tsx';
import { MangaRouteContext, type MangaUrlBuilder } from '@/features/manga/components/MangaRouteContext.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';

const noop = () => {};

interface HomeLibraryRowProps {
    title: ReactNode;
    seeAllTo: string;
    mangas: React.ComponentProps<typeof BaseMangaGrid>['mangas'];
    isLoading: boolean;
    error?: Error;
    emptyMessage: string;
    routeBuilder?: MangaUrlBuilder;
}

export function HomeLibraryRow({
    title,
    seeAllTo,
    mangas,
    isLoading,
    error,
    emptyMessage,
    routeBuilder,
}: HomeLibraryRowProps): JSX.Element {
    const { t } = useLingui();

    let body: ReactNode;
    if (isLoading) {
        body = <LoadingPlaceholder />;
    } else if (mangas.length === 0) {
        body = (
            <Typography color="textSecondary" variant="body2" sx={{ px: 1, py: 2 }}>
                {error ? t`Failed to load` : emptyMessage}
            </Typography>
        );
    } else {
        const grid = (
            <BaseMangaGrid
                mangas={mangas}
                hasNextPage={false}
                loadMore={noop}
                isLoading={false}
                horizontal
                inLibraryIndicator
            />
        );
        body = routeBuilder ? (
            <MangaRouteContext.Provider value={routeBuilder}>{grid}</MangaRouteContext.Provider>
        ) : (
            grid
        );
    }

    return (
        <Stack sx={{ gap: 1 }}>
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', px: 1 }}>
                <Typography variant="h6" component="h2">
                    {title}
                </Typography>
                <Button component={Link} to={seeAllTo} size="small" sx={{ textTransform: 'none' }}>
                    {t`See all`}
                </Button>
            </Stack>
            {body}
        </Stack>
    );
}
