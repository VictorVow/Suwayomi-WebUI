/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { STABLE_EMPTY_ARRAY } from '@/base/Base.constants.ts';
import type { NovelEntry, NovelExtension, NovelSource } from '@/features/novel/Novel.types.ts';

/*
 * =============================================================================
 *  NovelApi — the single integration seam for LNReader / light-novel support.
 * =============================================================================
 *
 * The Novel section (browse novels, novel sources, novel extensions, novel
 * library/updates/history/downloads) is fully built out in the UI, but the
 * Miruyomi-Server does NOT yet expose an LNReader / novel extension GraphQL
 * API — it currently only serves manga sources/extensions.
 *
 * Everything the Novel screens need funnels through the hooks in this file.
 * To wire the section to a real backend, do exactly two things here:
 *
 *   1. Flip `NOVEL_BACKEND.available` to `true`.
 *   2. Replace the stub bodies of the `useNovel*` hooks below with real
 *      `requestManager.useX(...)` calls against the server's novel operations
 *      (e.g. GET_NOVEL_SOURCES_LIST, GET_NOVEL_EXTENSIONS, ...). Add those
 *      GraphQL documents under `src/lib/graphql/novel*` and the matching
 *      `requestManager` methods, mirroring the manga source/extension ones.
 *
 * No screen imports `requestManager` for novel data directly — keep it that way
 * so this stays the one place that has to change.
 */

export interface NovelBackendStatus {
    /** Whether the server exposes a novel/LNReader extension API. */
    available: boolean;
    /** Human-readable reason shown in the UI while unavailable. */
    reason: string;
}

export const NOVEL_BACKEND: NovelBackendStatus = {
    available: false,
    reason:
        'The connected server does not expose an LNReader / light-novel extension API yet. ' +
        'Once Miruyomi-Server ships novel extension support, wire it up in ' +
        'src/features/novel/services/NovelApi.ts.',
};

interface NovelQueryResult<TData> {
    data: TData;
    loading: boolean;
    error?: Error;
    /** Whether the backend is available; when false the caller should show the unavailable state. */
    available: boolean;
    refetch: () => void;
}

const unavailable = <TData>(data: TData): NovelQueryResult<TData> => ({
    data,
    loading: false,
    error: undefined,
    available: NOVEL_BACKEND.available,
    refetch: () => {},
});

/** List all novel sources from installed novel extensions. */
export const useNovelSourceList = (): NovelQueryResult<NovelSource[]> =>
    // TODO(novel-backend): replace with `requestManager.useGetNovelSourceList()`
    unavailable<NovelSource[]>(STABLE_EMPTY_ARRAY);

/** Fetch a single novel source's metadata by id. */
export const useNovelSource = (_sourceId: string): NovelQueryResult<NovelSource | null> =>
    // TODO(novel-backend): replace with `requestManager.useGetNovelSource(sourceId)`
    unavailable<NovelSource | null>(null);

/** Browse a novel source's catalogue (popular / latest / search). */
export const useNovelSourceEntries = (_sourceId: string): NovelQueryResult<NovelEntry[]> =>
    // TODO(novel-backend): replace with `requestManager.useGetNovelSourceEntries(...)`
    unavailable<NovelEntry[]>(STABLE_EMPTY_ARRAY);

/** List installable/installed novel (LNReader) extensions. */
export const useNovelExtensionList = (): NovelQueryResult<NovelExtension[]> =>
    // TODO(novel-backend): replace with `requestManager.useNovelExtensionListFetch()`
    unavailable<NovelExtension[]>(STABLE_EMPTY_ARRAY);

/** Fetch a single novel extension's details by package name. */
export const useNovelExtension = (_pkgName: string): NovelQueryResult<NovelExtension | null> =>
    // TODO(novel-backend): replace with `requestManager.useGetNovelExtension(pkgName)`
    unavailable<NovelExtension | null>(null);

/** The user's novel library entries. */
export const useNovelLibrary = (): NovelQueryResult<NovelEntry[]> =>
    // TODO(novel-backend): replace with `requestManager.useGetNovelLibrary()`
    unavailable<NovelEntry[]>(STABLE_EMPTY_ARRAY);

/** Recent chapter updates across the novel library. */
export const useNovelUpdates = (): NovelQueryResult<NovelEntry[]> =>
    // TODO(novel-backend): replace with `requestManager.useGetNovelUpdates()`
    unavailable<NovelEntry[]>(STABLE_EMPTY_ARRAY);

/** Reading history for novels. */
export const useNovelHistory = (): NovelQueryResult<NovelEntry[]> =>
    // TODO(novel-backend): replace with `requestManager.useGetNovelHistory()`
    unavailable<NovelEntry[]>(STABLE_EMPTY_ARRAY);

/** Active + queued novel chapter downloads. */
export const useNovelDownloadQueue = (): NovelQueryResult<NovelEntry[]> =>
    // TODO(novel-backend): replace with `requestManager.useGetNovelDownloadStatus()`
    unavailable<NovelEntry[]>(STABLE_EMPTY_ARRAY);
