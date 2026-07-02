/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useEffect, useState } from 'react';
import type { MessageDescriptor } from '@lingui/core';
import { msg } from '@lingui/core/macro';

const ANILIST_API_URL = 'https://graphql.anilist.co';
const SECTION_SIZE = 25;

export type AniListMedia = {
    id: number;
    siteUrl: string;
    averageScore: number | null;
    title: {
        english: string | null;
        romaji: string | null;
        native: string | null;
    };
    coverImage: {
        large: string;
    };
};

export const getMediaTitle = (media: AniListMedia): string =>
    media.title.english ?? media.title.romaji ?? media.title.native ?? '';

export type RecommendedMediaType = 'MANGA' | 'ANIME' | 'MOVIES';

// AniList does not have a separate type for movies - they are anime with the "MOVIE" format. To keep the "Anime" tab
// a pure show listing, it in turn excludes the "MOVIE" format.
const MEDIA_TYPE_FILTERS: Record<RecommendedMediaType, { type: 'MANGA' | 'ANIME'; formatFilter: string }> = {
    MANGA: { type: 'MANGA', formatFilter: '' },
    ANIME: { type: 'ANIME', formatFilter: 'format_not: MOVIE' },
    MOVIES: { type: 'ANIME', formatFilter: 'format: MOVIE' },
};

export type RecommendedSectionKey =
    | 'thisSeason'
    | 'previousSeason'
    | 'nextSeason'
    | 'topRated'
    | 'trending'
    | 'mostFavourite'
    | 'popular';

export type RecommendedMedia = Record<RecommendedSectionKey, { media: AniListMedia[] }>;

export type MangaCountryOfOrigin = 'JP' | 'KR' | 'CN';

export const MEDIA_TYPES: { key: RecommendedMediaType; title: MessageDescriptor }[] = [
    { key: 'MANGA', title: msg`Manga` },
    { key: 'ANIME', title: msg`Anime` },
    { key: 'MOVIES', title: msg`Movies` },
];

const COUNTRY_FILTERS: { key: MangaCountryOfOrigin | null; title: MessageDescriptor }[] = [
    { key: null, title: msg`All` },
    { key: 'JP', title: msg`Japan` },
    { key: 'KR', title: msg`Korea` },
    { key: 'CN', title: msg`China` },
];

export const COUNTRY_OF_ORIGIN_FILTERS: Record<
    RecommendedMediaType,
    { key: MangaCountryOfOrigin | null; title: MessageDescriptor }[]
> = {
    MANGA: [
        { key: null, title: msg`All` },
        { key: 'JP', title: msg`Manga` },
        { key: 'KR', title: msg`Manhwa` },
        { key: 'CN', title: msg`Manhua` },
    ],
    ANIME: COUNTRY_FILTERS,
    MOVIES: COUNTRY_FILTERS,
};

export const RECOMMENDED_SECTIONS: { key: RecommendedSectionKey; title: MessageDescriptor }[] = [
    { key: 'trending', title: msg`Trending` },
    { key: 'popular', title: msg`Popular` },
    { key: 'thisSeason', title: msg`This Season` },
    { key: 'previousSeason', title: msg`Previous Season` },
    { key: 'nextSeason', title: msg`Next Season` },
    { key: 'mostFavourite', title: msg`Most Favourite` },
    { key: 'topRated', title: msg`Top Rated` },
];

const SEASONS = ['WINTER', 'SPRING', 'SUMMER', 'FALL'] as const;

const getNormalizedSeasonInfo = (seasonOffset: number): { seasonIndex: number; year: number } => {
    const now = new Date();
    const seasonIndex = Math.floor(now.getMonth() / 3) + seasonOffset;

    return {
        seasonIndex: ((seasonIndex % 4) + 4) % 4,
        year: now.getFullYear() + Math.floor(seasonIndex / 4),
    };
};

// Anime have proper season support on AniList.
const getSeason = (seasonOffset: number): { season: (typeof SEASONS)[number]; year: number } => {
    const { seasonIndex, year } = getNormalizedSeasonInfo(seasonOffset);

    return {
        season: SEASONS[seasonIndex],
        year,
    };
};

// AniList does not assign seasons to manga, thus, "This Season" and "Previous Season" are based on the (fuzzy) start
// date, while "Next Season" filters by the "NOT_YET_RELEASED" status since upcoming manga usually lack exact start dates.
// The bounds are intentionally outside the season (day 00 and 32) so that comparisons stay inclusive.
const getSeasonDateRange = (seasonOffset: number): { greater: number; lesser: number } => {
    const { seasonIndex, year } = getNormalizedSeasonInfo(seasonOffset);
    const startMonth = seasonIndex * 3 + 1;

    return {
        greater: year * 10000 + startMonth * 100,
        lesser: year * 10000 + (startMonth + 2) * 100 + 32,
    };
};

const MEDIA_FIELDS = `
    id
    siteUrl
    averageScore
    title {
        english
        romaji
        native
    }
    coverImage {
        large
    }
`;

// The "countryOfOrigin" argument only gets added in case a country was selected since a "null" value would filter for
// entries without a country instead of not applying the filter at all.
const createSeasonalPage = (alias: string, mediaType: RecommendedMediaType, withCountryFilter: boolean) => `
    ${alias}: Page(page: 1, perPage: $perPage) {
        media(
            type: ${MEDIA_TYPE_FILTERS[mediaType].type}
            ${MEDIA_TYPE_FILTERS[mediaType].formatFilter}
            isAdult: false
            sort: [POPULARITY_DESC]
            ${
                mediaType === 'MANGA'
                    ? `startDate_greater: $${alias}Greater
            startDate_lesser: $${alias}Lesser`
                    : `season: $${alias}Season
            seasonYear: $${alias}SeasonYear`
            }
            ${withCountryFilter ? 'countryOfOrigin: $countryOfOrigin' : ''}
        ) {
            ${MEDIA_FIELDS}
        }
    }
`;

const createSortedPage = (
    alias: string,
    sort: string,
    mediaType: RecommendedMediaType,
    withCountryFilter: boolean,
    extraFilters: string = '',
) => `
    ${alias}: Page(page: 1, perPage: $perPage) {
        media(type: ${MEDIA_TYPE_FILTERS[mediaType].type}${
            MEDIA_TYPE_FILTERS[mediaType].formatFilter ? `, ${MEDIA_TYPE_FILTERS[mediaType].formatFilter}` : ''
        }, isAdult: false, sort: [${sort}]${extraFilters}${
            withCountryFilter ? ', countryOfOrigin: $countryOfOrigin' : ''
        }) {
            ${MEDIA_FIELDS}
        }
    }
`;

const createRecommendedMediaQuery = (mediaType: RecommendedMediaType, withCountryFilter: boolean) => `
    query RECOMMENDED_MEDIA(
        $perPage: Int!
        ${
            mediaType !== 'MANGA'
                ? `$thisSeasonSeason: MediaSeason!
        $thisSeasonSeasonYear: Int!
        $previousSeasonSeason: MediaSeason!
        $previousSeasonSeasonYear: Int!
        $nextSeasonSeason: MediaSeason!
        $nextSeasonSeasonYear: Int!`
                : `$thisSeasonGreater: FuzzyDateInt!
        $thisSeasonLesser: FuzzyDateInt!
        $previousSeasonGreater: FuzzyDateInt!
        $previousSeasonLesser: FuzzyDateInt!`
        }
        ${withCountryFilter ? '$countryOfOrigin: CountryCode!' : ''}
    ) {
        ${createSeasonalPage('thisSeason', mediaType, withCountryFilter)}
        ${createSeasonalPage('previousSeason', mediaType, withCountryFilter)}
        ${
            mediaType !== 'MANGA'
                ? createSeasonalPage('nextSeason', mediaType, withCountryFilter)
                : createSortedPage(
                      'nextSeason',
                      'POPULARITY_DESC',
                      mediaType,
                      withCountryFilter,
                      ', status: NOT_YET_RELEASED',
                  )
        }
        ${createSortedPage('topRated', 'SCORE_DESC', mediaType, withCountryFilter)}
        ${createSortedPage('trending', 'TRENDING_DESC', mediaType, withCountryFilter)}
        ${createSortedPage('mostFavourite', 'FAVOURITES_DESC', mediaType, withCountryFilter)}
        ${createSortedPage('popular', 'POPULARITY_DESC', mediaType, withCountryFilter)}
    }
`;

const createSeasonalVariables = (mediaType: RecommendedMediaType): Record<string, string | number> => {
    if (mediaType !== 'MANGA') {
        const thisSeason = getSeason(0);
        const previousSeason = getSeason(-1);
        const nextSeason = getSeason(1);

        return {
            thisSeasonSeason: thisSeason.season,
            thisSeasonSeasonYear: thisSeason.year,
            previousSeasonSeason: previousSeason.season,
            previousSeasonSeasonYear: previousSeason.year,
            nextSeasonSeason: nextSeason.season,
            nextSeasonSeasonYear: nextSeason.year,
        };
    }

    const thisSeason = getSeasonDateRange(0);
    const previousSeason = getSeasonDateRange(-1);

    return {
        thisSeasonGreater: thisSeason.greater,
        thisSeasonLesser: thisSeason.lesser,
        previousSeasonGreater: previousSeason.greater,
        previousSeasonLesser: previousSeason.lesser,
    };
};

const fetchRecommendedMedia = async (
    signal: AbortSignal,
    mediaType: RecommendedMediaType,
    countryOfOrigin: MangaCountryOfOrigin | null,
): Promise<RecommendedMedia> => {
    const response = await fetch(ANILIST_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        signal,
        body: JSON.stringify({
            query: createRecommendedMediaQuery(mediaType, !!countryOfOrigin),
            variables: {
                perPage: SECTION_SIZE,
                ...createSeasonalVariables(mediaType),
                ...(countryOfOrigin ? { countryOfOrigin } : {}),
            },
        }),
    });

    if (!response.ok) {
        throw new Error(`AniList request failed (status ${response.status})`);
    }

    const { data, errors } = (await response.json()) as { data?: RecommendedMedia; errors?: { message: string }[] };

    if (errors?.length || !data) {
        throw new Error(errors?.[0]?.message ?? 'AniList request failed');
    }

    return data;
};

export const useAniListRecommendedMedia = (
    mediaType: RecommendedMediaType,
    countryOfOrigin: MangaCountryOfOrigin | null,
): {
    data: RecommendedMedia | null;
    loading: boolean;
    error: unknown;
    refetch: () => void;
} => {
    const [data, setData] = useState<RecommendedMedia | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<unknown>(null);
    const [fetchId, setFetchId] = useState(0);

    const refetch = useCallback(() => setFetchId((id) => id + 1), []);

    useEffect(() => {
        const abortController = new AbortController();

        setLoading(true);
        setError(null);

        fetchRecommendedMedia(abortController.signal, mediaType, countryOfOrigin)
            .then((recommendedMedia) => setData(recommendedMedia))
            .catch((e) => {
                if (!abortController.signal.aborted) {
                    setError(e);
                }
            })
            .finally(() => {
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => abortController.abort();
    }, [fetchId, mediaType, countryOfOrigin]);

    return { data, loading, error, refetch };
};
