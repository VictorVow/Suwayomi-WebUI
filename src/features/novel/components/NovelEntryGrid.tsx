/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import Typography from '@mui/material/Typography';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import type { NovelEntry } from '@/features/novel/Novel.types.ts';
import { NovelUnavailableView } from '@/features/novel/components/NovelUnavailableView.tsx';

/**
 * Renders a responsive grid of novel entries, or the shared unavailable/empty
 * state. Used by the Novel library / updates / history / source-browse screens.
 */
export const NovelEntryGrid = ({
    entries,
    loading,
    available,
    emptyMessage,
}: {
    entries: NovelEntry[];
    loading: boolean;
    available: boolean;
    emptyMessage?: string;
}) => {
    if (loading) {
        return <LoadingPlaceholder />;
    }

    if (!available || !entries.length) {
        return <NovelUnavailableView message={emptyMessage} />;
    }

    return (
        <Box
            sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 1.5,
                p: 1.5,
            }}
        >
            {entries.map((entry) => (
                <Card key={entry.id}>
                    {entry.thumbnailUrl && (
                        <CardMedia
                            component="img"
                            image={entry.thumbnailUrl}
                            alt={entry.title}
                            sx={{ aspectRatio: '2 / 3' }}
                        />
                    )}
                    <Typography variant="body2" sx={{ p: 1 }} noWrap>
                        {entry.title}
                    </Typography>
                </Card>
            ))}
        </Box>
    );
};
