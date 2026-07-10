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
import type { ShowDownloadRow, ShowEpisodeRow, ShowExtension, ShowSource } from '@/features/show/Show.types.ts';
import { SourceKind, ContentType } from '@/lib/graphql/generated/graphql-base.types.ts';

/*
 * =============================================================================
 *  ShowApi — the single integration seam for Cloudstream / show support.
 * =============================================================================
 *
 * Miruyomi-Server runs Cloudstream .cs3 plugins in the same Kotlin sidecar as
 * Tachiyomi manga APKs. Shows are surfaced through the shared manga types, with
 * a derived content-type discriminator: a show source is a `SourceType` with
 * `kind === SHOW`. The server exposes this discriminator as the `ContentType`
 * GraphQL enum, scoped via the `MangaConditionInput.contentType` condition
 * inferred from each source, so library/category counts are correct on the
 * server rather than filtered only client-side.
 *
 *   - a show source    = a `SourceType` with `kind === SHOW`
 *   - a show extension = an `ExtensionType` with `kind === SHOW`
 *   - a show episode    = a `ChapterType` row on a show-source manga
 *   - show video stream = REST `GET /api/v1/cloudstream/episode/:chapterId`
 *                          (+ `?index=` for quality selection, see the player)
 *
 * Unlike novels (whose source ids are negative and so can be discriminated by
 * sign alone), show source ids are positive just like manga. The discriminator
 * is the `kind` field on `SourceType`/`ExtensionType`, which Miruyomi-Server
 * exposes via the `SourceKind` enum (and, derivatively, `ContentType`).
 *
 * Note: Miruyomi originally mirrored the upstream Suwayomi GraphQL contract to
 * ease reimplementation. That compatibility is no longer the highest priority;
 * the schema now carries Miruyomi-specific extensions (e.g. `ContentType`) where
 * that yields a cleaner, less leaky design. This file remains the one place
 * that knows the show identification rule; screens consume its hooks, never
 * requestManager directly.
 *
 * Setup note: show sources only appear once the user adds a Cloudstream
 * extension repo (a `repo.json`/`plugins.json` carrying `.cs3` plugins) under
 * Settings → Browse, fetches extensions, and installs one. Until then these
 * hooks correctly return empty lists.
 */

interface ShowQueryResult<TData> {
    data: TData;
    loading: boolean;
    error?: Error;
    /** Whether the backend is reachable; false only when the base query itself errors. */
    available: boolean;
    refetch: () => void;
}

/**
 * The set of show source ids, derived from the shared source list by reading
 * `kind === SHOW`. Used to filter the history/downloads feeds (which expose
 * only `sourceId`, not `kind`) down to show content. Apollo
 * caches the source list, so the first hook to mount pays the fetch and the
 * rest reuse the cache.
 */
const useShowSourceIdSet = (): { ids: Set<string>; loading: boolean; error?: Error; refetch: () => void } => {
    const { data, loading, error, refetch } = requestManager.useGetSourceList(undefined, {
        notifyOnNetworkStatusChange: true,
    });

    const ids = useMemo(() => {
        const set = new Set<string>();
        for (const source of data?.sources.nodes ?? STABLE_EMPTY_ARRAY) {
            if (source.kind === SourceKind.Show) {
                set.add(source.id);
            }
        }
        return set;
    }, [data]);

    return { ids, loading, error, refetch: () => refetch?.() };
};

/** List show sources (installed Cloudstream extensions), filtered out of the shared source list. */
export const useShowSourceList = (): ShowQueryResult<ShowSource[]> => {
    const { data, loading, error, refetch } = requestManager.useGetSourceList(undefined, {
        notifyOnNetworkStatusChange: true,
    });

    const sources: ShowSource[] = (data?.sources.nodes ?? STABLE_EMPTY_ARRAY)
        .filter((source) => source.kind === SourceKind.Show)
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

/** List show (Cloudstream) extensions, filtered out of the shared extension list. */
export const useShowExtensionList = (): ShowQueryResult<ShowExtension[]> => {
    const { data, loading, error, refetch } = requestManager.useGetExtensionList();

    const extensions: ShowExtension[] = (data?.extensions.nodes ?? STABLE_EMPTY_ARRAY)
        .filter((extension) => extension.kind === SourceKind.Show)
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
 * The library / history / downloads views are show-scoped slices of the
 * user's manga data (show titles are manga rows whose source has
 * kind === SHOW). The updates feed is server-scoped via
 * `ChapterConditionInput.contentType` (see `Updates` screen); history/
 * download-queue queries have no such predicate yet, so we reuse the existing
 * manga queries and filter client-side by membership in the show source-id
 * set. Those feeds are paginated on the server, so their contents track
 * however many pages the shared hook has fetched.
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

const chapterToRow = (chapter: UpdateOrHistoryChapter): ShowEpisodeRow => ({
    chapterId: chapter.id,
    episodeName: chapter.name,
    mangaId: chapter.manga.id,
    showTitle: chapter.manga.title,
    thumbnailUrl: Mangas.getThumbnailUrl(chapter.manga),
});

/** The user's library, filtered to shows. Returns full manga nodes for BaseMangaGrid. */
export const useShowLibrary = (): ShowQueryResult<LibraryMangaNode[]> => {
    // The server `contentType: SHOW` condition scopes the result to Cloudstream
    // show sources, so the library no longer needs the client-side
    // `useShowSourceIdSet` filter. That set is still used by the history/
    // downloads hooks below, whose queries have no `contentType` predicate yet.
    const { data, loading, error, refetch } = requestManager.useGetMangas<
        GetMangasLibraryQuery,
        GetMangasLibraryQueryVariables
    >(GET_MANGAS_LIBRARY, { condition: { inLibrary: true, contentType: ContentType.Show } });

    const mangas = data?.mangas.nodes ?? STABLE_EMPTY_ARRAY;

    return {
        data: mangas,
        loading,
        error,
        available: !error,
        refetch: () => refetch?.(),
    };
};

/** Watching history for shows. */
export const useShowHistory = (): ShowQueryResult<ShowEpisodeRow[]> => {
    const { ids, error: sourceError, refetch: refetchSources } = useShowSourceIdSet();
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

/** Active + queued show episode downloads. */
export const useShowDownloadQueue = (): ShowQueryResult<ShowDownloadRow[]> => {
    const { ids, error: sourceError, refetch: refetchSources } = useShowSourceIdSet();
    const { data, loading, error, refetch } = requestManager.useGetDownloadStatus();

    const rows = (data?.downloadStatus?.queue ?? STABLE_EMPTY_ARRAY)
        .filter((item) => ids.has(item.manga.sourceId))
        .map((item) => ({
            chapterId: item.chapter.id,
            episodeName: item.chapter.name,
            mangaId: item.manga.id,
            showTitle: item.manga.title,
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
