/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Types for the "Anime" section, which surfaces Aniyomi-style anime
 * sources/extensions in the WebUI.
 *
 * Miruyomi-Server runs Aniyomi APKs in the same Kotlin sidecar as Tachiyomi
 * manga APKs and bridges them onto the shared manga/chapter data model. Anime
 * is discriminated from manga by the `kind` column on `source`/`extension`
 * (surfaced as the GraphQL `SourceKind` enum). The shapes below mirror the
 * manga source/extension domain so screens can consume them with minimal
 * changes, paralleling the Novel section.
 */

export enum AnimeBrowseTab {
    SOURCES = 'sources',
    EXTENSIONS = 'extensions',
}

/** An anime source exposed by an installed anime (Aniyomi) extension. */
export interface AnimeSource {
    id: string;
    name: string;
    lang: string;
    iconUrl: string;
    isNsfw: boolean;
    /** Package name of the extension providing this source. */
    extPkgName?: string;
}

/** An installable/installed anime (Aniyomi) extension. */
export interface AnimeExtension {
    pkgName: string;
    name: string;
    lang: string;
    versionName: string;
    versionCode: number;
    iconUrl: string;
    isInstalled: boolean;
    isObsolete: boolean;
    hasUpdate: boolean;
    isNsfw: boolean;
    repo?: string | null;
}

/** An episode row for the anime Updates / History feeds. */
export interface AnimeEpisodeRow {
    chapterId: number;
    episodeName: string;
    mangaId: number;
    animeTitle: string;
    thumbnailUrl?: string | null;
}

/** A queued/active anime episode download. */
export interface AnimeDownloadRow {
    chapterId: number;
    episodeName: string;
    mangaId: number;
    animeTitle: string;
    /** 0..1 download progress. */
    progress: number;
    /** Downloader state for this item (e.g. QUEUED, DOWNLOADING). */
    state: string;
}
