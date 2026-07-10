/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Types for the "Show" section, which surfaces Cloudstream-style show
 * sources/extensions in the WebUI.
 *
 * Miruyomi-Server runs Cloudstream .cs3 plugins in the same Kotlin sidecar
 * as Tachiyomi manga APKs and bridges them onto the shared manga/chapter data
 * model. Shows are discriminated from manga by the `kind` column on
 * `source`/`extension` (surfaced as the GraphQL `SourceKind` enum). The shapes
 * below mirror the manga source/extension domain so screens can consume them
 * with minimal changes, paralleling the Novel/Anime sections.
 */

export enum ShowBrowseTab {
    SOURCES = 'sources',
    EXTENSIONS = 'extensions',
}

/** A show source exposed by an installed Cloudstream extension. */
export interface ShowSource {
    id: string;
    name: string;
    lang: string;
    iconUrl: string;
    isNsfw: boolean;
    /** Package name of the extension providing this source. */
    extPkgName?: string;
}

/** An installable/installed Cloudstream extension. */
export interface ShowExtension {
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

/** An episode row for the show Updates / History feeds. */
export interface ShowEpisodeRow {
    chapterId: number;
    episodeName: string;
    mangaId: number;
    showTitle: string;
    thumbnailUrl?: string | null;
}

/** A queued/active show episode download. */
export interface ShowDownloadRow {
    chapterId: number;
    episodeName: string;
    mangaId: number;
    showTitle: string;
    /** 0..1 download progress. */
    progress: number;
    /** Downloader state for this item (e.g. QUEUED, DOWNLOADING). */
    state: string;
}
