/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useLocation } from 'react-router-dom';

export type SourceBrowseScope = 'manga' | 'anime' | 'novel';

/**
 * Determines which content namespace a source-browse view is mounted under,
 * based on the URL prefix. The shared `SourceMangas` and `SearchAll` screens
 * are reused across manga (`/sources/...`), anime (`/anime/sources/...`) and
 * novel (`/novel/sources/...`) routes; this hook lets them pick scope-aware
 * copy and link targets instead of defaulting to manga.
 */
export const useSourceBrowseScope = (): SourceBrowseScope => {
    const { pathname } = useLocation();

    if (pathname.startsWith('/anime/sources')) {
        return 'anime';
    }

    if (pathname.startsWith('/novel/sources')) {
        return 'novel';
    }

    return 'manga';
};
