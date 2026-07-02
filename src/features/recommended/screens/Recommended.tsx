/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { Link as RouterLink } from 'react-router-dom';
import { useLingui } from '@lingui/react/macro';
import { i18n } from '@/i18n';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { SpinnerImage } from '@/base/components/SpinnerImage.tsx';
import { CustomTooltip } from '@/base/components/CustomTooltip.tsx';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import {
    type AniListMedia,
    COUNTRY_OF_ORIGIN_FILTERS,
    getMediaTitle,
    type MangaCountryOfOrigin,
    MEDIA_TYPES,
    type RecommendedMediaType,
    RECOMMENDED_SECTIONS,
    useAniListRecommendedMedia,
} from '@/features/recommended/AniList.ts';

const RecommendedMediaCard = ({ item }: { item: AniListMedia }) => {
    const { t } = useLingui();

    const title = getMediaTitle(item);

    return (
        <Box sx={{ position: 'relative', flexShrink: 0, width: '120px' }}>
            <Link
                component={RouterLink}
                to={AppRoutes.sources.children.searchAll.path(title)}
                underline="none"
                color="inherit"
            >
                <Box sx={{ width: '120px', aspectRatio: '225 / 350', borderRadius: 1, overflow: 'hidden' }}>
                    <SpinnerImage
                        src={item.coverImage.large}
                        alt={title}
                        useFetchApi={false}
                        imgStyle={{ objectFit: 'cover', width: '100%', height: '100%' }}
                    />
                </Box>
                {item.averageScore != null && (
                    <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5 }}>
                        {item.averageScore}%
                    </Typography>
                )}
                <Typography
                    variant="body2"
                    sx={{
                        mt: item.averageScore != null ? 0 : 0.5,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}
                >
                    {title}
                </Typography>
            </Link>
            <CustomTooltip title={t`Open on AniList`}>
                <IconButton
                    href={item.siteUrl}
                    target="_blank"
                    rel="noreferrer"
                    size="small"
                    sx={{
                        position: 'absolute',
                        top: 4,
                        right: 4,
                        color: 'common.white',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        '&:hover': {
                            backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        },
                    }}
                >
                    <OpenInNewIcon fontSize="inherit" />
                </IconButton>
            </CustomTooltip>
        </Box>
    );
};

const RecommendedSection = ({ title, items }: { title: string; items: AniListMedia[] }) => {
    const { t } = useLingui();

    return (
        <Stack sx={{ gap: 1 }}>
            <Typography variant="h6">{title}</Typography>
            {items.length ? (
                <Stack
                    direction="row"
                    sx={{
                        gap: 1.5,
                        overflowX: 'auto',
                        pb: 1,
                        alignItems: 'flex-start',
                    }}
                >
                    {items.map((item) => (
                        <RecommendedMediaCard key={item.id} item={item} />
                    ))}
                </Stack>
            ) : (
                <Typography color="textSecondary" variant="body2">
                    {t`Nothing found`}
                </Typography>
            )}
        </Stack>
    );
};

export const Recommended: React.FC = () => {
    const { t } = useLingui();

    useAppTitle(t`Recommended`);

    const [mediaType, setMediaType] = useState<RecommendedMediaType>('MANGA');
    const [countryOfOrigin, setCountryOfOrigin] = useState<MangaCountryOfOrigin | null>(null);

    const { data, loading, error, refetch } = useAniListRecommendedMedia(mediaType, countryOfOrigin);

    const mediaTypeButtons = (
        <ToggleButtonGroup
            value={mediaType}
            exclusive
            size="small"
            onChange={(_, newMediaType: RecommendedMediaType | null) => {
                if (newMediaType) {
                    setMediaType(newMediaType);
                }
            }}
        >
            {MEDIA_TYPES.map((type) => (
                <ToggleButton key={type.key} value={type.key}>
                    {i18n._(type.title)}
                </ToggleButton>
            ))}
        </ToggleButtonGroup>
    );

    const countryFilterChips = (
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
            {COUNTRY_OF_ORIGIN_FILTERS[mediaType].map((filter) => (
                <Chip
                    key={filter.key ?? 'all'}
                    label={i18n._(filter.title)}
                    variant={filter.key === countryOfOrigin ? 'filled' : 'outlined'}
                    color={filter.key === countryOfOrigin ? 'primary' : 'default'}
                    onClick={() => setCountryOfOrigin(filter.key)}
                />
            ))}
        </Stack>
    );

    if (error) {
        return (
            <EmptyViewAbsoluteCentered
                message={t`Unable to load data`}
                messageExtra={getErrorMessage(error)}
                retry={refetch}
            />
        );
    }

    return (
        <Stack sx={{ p: 1, gap: 3 }}>
            <Stack sx={{ gap: 2 }}>
                {mediaTypeButtons}
                {countryFilterChips}
            </Stack>
            {loading || !data ? (
                <LoadingPlaceholder />
            ) : (
                RECOMMENDED_SECTIONS.map((section) => (
                    <RecommendedSection
                        key={section.key}
                        title={i18n._(section.title)}
                        items={data[section.key]?.media ?? []}
                    />
                ))
            )}
        </Stack>
    );
};
