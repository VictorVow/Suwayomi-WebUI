/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useMemo } from 'react';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { STABLE_EMPTY_ARRAY } from '@/base/Base.constants.ts';
import { GET_MANGAS_LIBRARY } from '@/lib/graphql/manga/MangaQuery.ts';
import { Mangas } from '@/features/manga/services/Mangas.ts';
import type { GetMangasLibraryQuery, GetMangasLibraryQueryVariables } from '@/lib/graphql/generated/graphql.ts';
import type { AnimeDownloadRow, AnimeEpisodeRow, AnimeExtension, AnimeSource } from '@/features/anime/Anime.types.ts';
import { SourceKind, ContentType } from '@/lib/graphql/generated/graphql-base.types.ts';

/*
 * =============================================================================
 *  AnimeApi — the single integration seam for Aniyomi / anime support.
 * =============================================================================
 *
 * Miruyomi-Server runs Aniyomi anime APKs in the same Kotlin sidecar as
 * Tachiyomi manga APKs. Anime is surfaced through the shared manga types, with
 * a derived content-type discriminator: an anime source is a `SourceType` with
 * `kind === ANIME`. The server exposes this discriminator as the `ContentType`
 * GraphQL enum, scoped via the `MangaConditionInput.contentType` condition
 * inferred from each source, so library/category counts are correct on the
 * server rather than filtered only client-side.
 *
 *   - an anime source    = a `SourceType` with `kind === ANIME`
 *   - an anime extension = an `ExtensionType` with `kind === ANIME`
 *   - an anime episode   = a `ChapterType` row on an anime-source manga
 *   - anime video stream = REST `GET /api/v1/aniyomi/episode/:chapterId`
 *                          (+ `?index=` for quality selection, see the player)
 *
 * Unlike novels (whose source ids are negative and so can be discriminated by
 * sign alone), anime source ids are positive just like manga. The discriminator
 * is the `kind` field on `SourceType`/`ExtensionType`, which Miruyomi-Server
 * exposes via the `SourceKind` enum (and, derivatively, `ContentType`).
 *
 * Note: Miruyomi originally mirrored the upstream Suwayomi GraphQL contract to
 * ease reimplementation. That compatibility is no longer the highest priority;
 * the schema now carries Miruyomi-specific extensions (e.g. `ContentType`) where
 * that yields a cleaner, less leaky design. This file remains the one place
 * that knows the anime identification rule; screens consume its hooks, never
 * requestManager directly.
 *
 * Setup note: anime sources only appear once the user adds an Aniyomi
 * extension repo (an `index.min.json` carrying `Aniyomi:`-prefixed APKs) under
 * Settings → Browse, fetches extensions, and installs one. Until then these
 * hooks correctly return empty lists.
 */

interface AnimeQueryResult<TData> {
    data: TData;
    loading: boolean;
    error?: Error;
    /** Whether the backend is reachable; false only when the base query itself errors. */
    available: boolean;
    refetch: () => void;
}

/**
 * The set of anime source ids, derived from the shared source list by reading
 * `kind === ANIME`. Used to filter the library/updates/history/downloads feeds
 * (which expose only `sourceId`, not `kind`) down to anime content. Apollo
 * caches the source list, so the first hook to mount pays the fetch and the
 * rest reuse the cache.
 */
const useAnimeSourceIdSet = (): { ids: Set<string>; loading: boolean; error?: Error; refetch: () => void } => {
    const { data, loading, error, refetch } = requestManager.useGetSourceList({ notifyOnNetworkStatusChange: true });

    const ids = useMemo(() => {
        const set = new Set<string>();
        for (const source of data?.sources.nodes ?? STABLE_EMPTY_ARRAY) {
            if (source.kind === SourceKind.Anime) {
                set.add(source.id);
            }
        }
        return set;
    }, [data]);

    return { ids, loading, error, refetch: () => refetch?.() };
};

/** List anime sources (installed Aniyomi extensions), filtered out of the shared source list. */
export const useAnimeSourceList = (): AnimeQueryResult<AnimeSource[]> => {
    const { data, loading, error, refetch } = requestManager.useGetSourceList({ notifyOnNetworkStatusChange: true });

    const sources: AnimeSource[] = (data?.sources.nodes ?? STABLE_EMPTY_ARRAY)
        .filter((source) => source.kind === SourceKind.Anime)
        .map((source) => ({
            id: source.id,
            name: source.name,
            lang: source.lang,
            iconUrl: source.iconUrl,
            isNsfw: source.isNsfw,
            extPkgName: source.extension?.pkgName,
        }));

    return { data: sources, loading, error, available: !error, refetch: () => refetch?.() };
};

/** List anime (Aniyomi) extensions, filtered out of the shared extension list. */
export const useAnimeExtensionList = (): AnimeQueryResult<AnimeExtension[]> => {
    const { data, loading, error, refetch } = requestManager.useGetExtensionList();

    const extensions: AnimeExtension[] = (data?.extensions.nodes ?? STABLE_EMPTY_ARRAY)
        .filter((extension) => extension.kind === SourceKind.Anime)
        .map((extension) => ({
            pkgName: extension.pkgName,
            name: extension.name,
            lang: extension.lang,
            versionName: extension.versionName,
            versionCode: extension.versionCode,
            iconUrl: extension.iconUrl,
            isInstalled: extension.isInstalled,
            isObsolete: extension.isObsolete,
            hasUpdate: extension.hasUpdate,
            isNsfw: extension.isNsfw,
            repo: extension.repo,
        }));

    return { data: extensions, loading, error, available: !error, refetch: () => refetch?.() };
};

/*
 * The library / updates / history / downloads views are anime-scoped slices of
 * the user's manga data (anime titles are manga rows whose source has
 * kind === ANIME). Miruyomi-Server has no source predicate on the
 * chapter/download queries, so we reuse the existing manga queries and filter
 * client-side by membership in the anime source-id set. The updates/history
 * feeds are paginated on the server; we filter the currently loaded window, so
 * their contents track however many pages the shared hook has fetched.
 */

type LibraryMangaNode = GetMangasLibraryQuery['mangas']['nodes'][number];

type UpdateOrHistoryChapter = {
    id: number;
    name: string;
    manga: {
        id: number;
        title: string;
        sourceId: string;
        thumbnailUrl?: string | null;
        thumbnailUrlLastFetched?: string | null;
    };
};

const chapterToRow = (chapter: UpdateOrHistoryChapter): AnimeEpisodeRow => ({
    chapterId: chapter.id,
    episodeName: chapter.name,
    mangaId: chapter.manga.id,
    animeTitle: chapter.manga.title,
    thumbnailUrl: Mangas.getThumbnailUrl(chapter.manga),
});

/** The user's library, filtered to anime. Returns full manga nodes for BaseMangaGrid. */
export const useAnimeLibrary = (): AnimeQueryResult<LibraryMangaNode[]> => {
    // The server `contentType: ANIME` condition scopes the result to Aniyomi
    // anime sources, so the library no longer needs the client-side
    // `useAnimeSourceIdSet` filter. That set is still used by the updates/
    // history/downloads hooks below, whose queries have no `contentType`
    // predicate yet.
    const { data, loading, error, refetch } = requestManager.useGetMangas<
        GetMangasLibraryQuery,
        GetMangasLibraryQueryVariables
    >(GET_MANGAS_LIBRARY, { condition: { inLibrary: true, contentType: ContentType.Anime } });

    const mangas = data?.mangas.nodes ?? STABLE_EMPTY_ARRAY;

    return {
        data: mangas,
        loading,
        error,
        available: !error,
        refetch: () => refetch?.(),
    };
};

/** Recent episode updates across the anime library. */
export const useAnimeUpdates = (): AnimeQueryResult<AnimeEpisodeRow[]> => {
    const { ids, error: sourceError, refetch: refetchSources } = useAnimeSourceIdSet();
    const { data, loading, error, refetch } = requestManager.useGetRecentlyUpdatedChapters();

    const rows = (data?.chapters.nodes ?? STABLE_EMPTY_ARRAY)
        .filter((chapter) => ids.has(chapter.manga.sourceId))
        .map(chapterToRow);

    return {
        data: rows,
        loading,
        error: error ?? sourceError,
        available: !error && !sourceError,
        refetch: () => {
            refetch?.();
            refetchSources();
        },
    };
};

/** Watching history for anime. */
export const useAnimeHistory = (): AnimeQueryResult<AnimeEpisodeRow[]> => {
    const { ids, error: sourceError, refetch: refetchSources } = useAnimeSourceIdSet();
    const { data, loading, error, refetch } = requestManager.useGetRecentlyReadChapters();

    const rows = (data?.chapters.nodes ?? STABLE_EMPTY_ARRAY)
        .filter((chapter) => ids.has(chapter.manga.sourceId))
        .map(chapterToRow);

    return {
        data: rows,
        loading,
        error: error ?? sourceError,
        available: !error && !sourceError,
        refetch: () => {
            refetch?.();
            refetchSources();
        },
    };
};

/** Active + queued anime episode downloads. */
export const useAnimeDownloadQueue = (): AnimeQueryResult<AnimeDownloadRow[]> => {
    const { ids, error: sourceError, refetch: refetchSources } = useAnimeSourceIdSet();
    const { data, loading, error, refetch } = requestManager.useGetDownloadStatus();

    const rows = (data?.downloadStatus?.queue ?? STABLE_EMPTY_ARRAY)
        .filter((item) => ids.has(item.manga.sourceId))
        .map((item) => ({
            chapterId: item.chapter.id,
            episodeName: item.chapter.name,
            mangaId: item.manga.id,
            animeTitle: item.manga.title,
            progress: item.progress,
            state: String(item.state),
        }));

    return {
        data: rows,
        loading,
        error: error ?? sourceError,
        available: !error && !sourceError,
        refetch: () => {
            refetch?.();
            refetchSources();
        },
    };
};
