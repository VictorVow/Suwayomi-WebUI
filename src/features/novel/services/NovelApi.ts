/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { requestManager } from '@/lib/requests/RequestManager.ts';
import { STABLE_EMPTY_ARRAY } from '@/base/Base.constants.ts';
import { GET_MANGAS_LIBRARY } from '@/lib/graphql/manga/MangaQuery.ts';
import { Mangas } from '@/features/manga/services/Mangas.ts';
import type { GetMangasLibraryQuery, GetMangasLibraryQueryVariables } from '@/lib/graphql/generated/graphql.ts';
import type { NovelChapterRow, NovelDownloadRow, NovelExtension, NovelSource } from '@/features/novel/Novel.types.ts';

/*
 * =============================================================================
 *  NovelApi — the single integration seam for LNReader / light-novel support.
 * =============================================================================
 *
 * Miruyomi-Server runs LNReader plugins as native light-novel sources, but — to
 * avoid drifting from the upstream Suwayomi GraphQL contract — it surfaces them
 * through the EXISTING manga types rather than novel-specific ones:
 *
 *   - a novel source    = a `SourceType` with a NEGATIVE id
 *   - a novel plugin     = an `ExtensionType` with pkgName `lnreader:<id>`
 *   - novel chapter text = REST `GET /api/v1/lnreader/chapter/:chapterId`
 *
 * So the Novel section is just a filtered view over the same source/extension
 * GraphQL the Manga section uses. This file is the one place that knows the
 * LNReader identification rules; screens consume its hooks, never requestManager
 * directly.
 *
 * Setup note: novel sources only appear once the user adds an LNReader plugin
 * index repo (e.g. the lnreader-plugins `.dist/plugins.min.json` URL) under
 * Settings → Browse, fetches extensions, and installs a plugin. Until then these
 * hooks correctly return empty lists.
 */

/** A source id belongs to an LNReader plugin when it is a negative Long. */
export const isNovelSourceId = (id: string): boolean => id.startsWith('-');

/** An extension is an LNReader plugin when its package name is `lnreader:<id>`. */
export const isNovelExtensionPkg = (pkgName: string): boolean => pkgName.startsWith('lnreader:');

interface NovelQueryResult<TData> {
    data: TData;
    loading: boolean;
    error?: Error;
    /** Whether the backend is reachable; false only when the base query itself errors. */
    available: boolean;
    refetch: () => void;
}

/** List novel sources (installed LNReader plugins), filtered out of the shared source list. */
export const useNovelSourceList = (): NovelQueryResult<NovelSource[]> => {
    const { data, loading, error, refetch } = requestManager.useGetSourceList({ notifyOnNetworkStatusChange: true });

    const sources: NovelSource[] = (data?.sources.nodes ?? STABLE_EMPTY_ARRAY)
        .filter((source) => isNovelSourceId(source.id))
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

/** List novel (LNReader) extensions, filtered out of the shared extension list. */
export const useNovelExtensionList = (): NovelQueryResult<NovelExtension[]> => {
    const { data, loading, error, refetch } = requestManager.useGetExtensionList();

    const extensions: NovelExtension[] = (data?.extensions.nodes ?? STABLE_EMPTY_ARRAY)
        .filter((extension) => isNovelExtensionPkg(extension.pkgName))
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
 * The library / updates / history / downloads views are novel-scoped slices of
 * the user's manga data (novels are manga rows with a negative source id).
 * Miruyomi-Server has no source predicate on the chapter/download queries, so we
 * reuse the existing manga queries and filter client-side by `isNovelSourceId`.
 * The updates/history feeds are paginated on the server; we filter the currently
 * loaded window, so their contents track however many pages the shared hook has
 * fetched.
 */

type LibraryMangaNode = GetMangasLibraryQuery['mangas']['nodes'][number];

type UpdateOrHistoryChapter = {
    id: number;
    name: string;
    sourceOrder: number;
    manga: {
        id: number;
        title: string;
        sourceId: string;
        thumbnailUrl?: string | null;
        thumbnailUrlLastFetched?: string | null;
    };
};

const chapterToRow = (chapter: UpdateOrHistoryChapter): NovelChapterRow => ({
    chapterId: chapter.id,
    chapterName: chapter.name,
    chapterSourceOrder: chapter.sourceOrder,
    mangaId: chapter.manga.id,
    mangaTitle: chapter.manga.title,
    thumbnailUrl: Mangas.getThumbnailUrl(chapter.manga),
});

/** The user's library, filtered to novels. Returns full manga nodes for BaseMangaGrid. */
export const useNovelLibrary = (): NovelQueryResult<LibraryMangaNode[]> => {
    const { data, loading, error, refetch } = requestManager.useGetMangas<
        GetMangasLibraryQuery,
        GetMangasLibraryQueryVariables
    >(GET_MANGAS_LIBRARY, { condition: { inLibrary: true } });

    const mangas = (data?.mangas.nodes ?? STABLE_EMPTY_ARRAY).filter((manga) => isNovelSourceId(manga.sourceId));

    return { data: mangas, loading, error, available: !error, refetch: () => refetch?.() };
};

/** Recent chapter updates across the novel library. */
export const useNovelUpdates = (): NovelQueryResult<NovelChapterRow[]> => {
    const { data, loading, error, refetch } = requestManager.useGetRecentlyUpdatedChapters();

    const rows = (data?.chapters.nodes ?? STABLE_EMPTY_ARRAY)
        .filter((chapter) => isNovelSourceId(chapter.manga.sourceId))
        .map(chapterToRow);

    return { data: rows, loading, error, available: !error, refetch: () => refetch?.() };
};

/** Reading history for novels. */
export const useNovelHistory = (): NovelQueryResult<NovelChapterRow[]> => {
    const { data, loading, error, refetch } = requestManager.useGetRecentlyReadChapters();

    const rows = (data?.chapters.nodes ?? STABLE_EMPTY_ARRAY)
        .filter((chapter) => isNovelSourceId(chapter.manga.sourceId))
        .map(chapterToRow);

    return { data: rows, loading, error, available: !error, refetch: () => refetch?.() };
};

/** Active + queued novel chapter downloads. */
export const useNovelDownloadQueue = (): NovelQueryResult<NovelDownloadRow[]> => {
    const { data, loading, error, refetch } = requestManager.useGetDownloadStatus();

    const rows = (data?.downloadStatus?.queue ?? STABLE_EMPTY_ARRAY)
        .filter((item) => isNovelSourceId(item.manga.sourceId))
        .map((item) => ({
            chapterId: item.chapter.id,
            chapterName: item.chapter.name,
            mangaId: item.manga.id,
            mangaTitle: item.manga.title,
            progress: item.progress,
            state: String(item.state),
        }));

    return { data: rows, loading, error, available: !error, refetch: () => refetch?.() };
};
