/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * Types for the "Novel" section, which surfaces LNReader-style light-novel
 * sources/extensions in the WebUI.
 *
 * The shapes below intentionally mirror the manga source/extension domain so
 * that, once {@link ../services/NovelApi.ts NovelApi} is pointed at the real
 * server API, the screens can consume them with minimal changes.
 */

export enum NovelBrowseTab {
    SOURCES = 'sources',
    EXTENSIONS = 'extensions',
}

/** A light-novel source exposed by an installed novel extension. */
export interface NovelSource {
    id: string;
    name: string;
    lang: string;
    iconUrl: string;
    supportsLatest: boolean;
    isNsfw: boolean;
    /** Package name of the extension providing this source. */
    extPkgName?: string;
}

/** An installable/installed novel (LNReader) extension. */
export interface NovelExtension {
    pkgName: string;
    name: string;
    lang: string;
    versionName: string;
    iconUrl: string;
    isInstalled: boolean;
    isObsolete: boolean;
    hasUpdate: boolean;
    isNsfw: boolean;
    repo?: string | null;
}

/** A novel entry (series) as returned when browsing a source or the library. */
export interface NovelEntry {
    id: string;
    sourceId: string;
    title: string;
    thumbnailUrl?: string | null;
    inLibrary: boolean;
}
