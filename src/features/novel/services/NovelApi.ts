/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { requestManager } from '@/lib/requests/RequestManager.ts';
import { STABLE_EMPTY_ARRAY } from '@/base/Base.constants.ts';
import type { NovelEntry, NovelExtension, NovelSource } from '@/features/novel/Novel.types.ts';

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
 * The library / updates / history / downloads views below are novel-scoped
 * slices of the user's manga library (novels are manga rows with a negative
 * source id). They are not wired to their manga queries yet — doing so needs a
 * source-id filter threaded through those list screens — so they report empty.
 * TODO(novel): back these with the manga library/updates/history/download
 * queries filtered by `isNovelSourceId(manga.source.id)`.
 */

const emptyEntries = (): NovelQueryResult<NovelEntry[]> => ({
    data: STABLE_EMPTY_ARRAY,
    loading: false,
    error: undefined,
    available: true,
    refetch: () => {},
});

/** The user's novel library entries. */
export const useNovelLibrary = (): NovelQueryResult<NovelEntry[]> => emptyEntries();

/** Recent chapter updates across the novel library. */
export const useNovelUpdates = (): NovelQueryResult<NovelEntry[]> => emptyEntries();

/** Reading history for novels. */
export const useNovelHistory = (): NovelQueryResult<NovelEntry[]> => emptyEntries();

/** Active + queued novel chapter downloads. */
export const useNovelDownloadQueue = (): NovelQueryResult<NovelEntry[]> => emptyEntries();
