/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { AppRoutes } from '@/base/AppRoute.constants.ts';
import type { SourceBrowseScope } from '@/features/source/browse/useSourceBrowseScope.ts';

/**
 * Resolves the per-scope route family (`sources`, `animeSources`,
 * `novelSources`, `showSources`) for a given browse scope. Used by shared
 * browse components (source list, global-search entry point, source cards) to
 * link into the correct content namespace instead of always landing on the
 * manga `/sources/...` routes.
 */
export const sourceRoutesForScope = (scope: SourceBrowseScope) => {
    switch (scope) {
        case 'anime':
            return AppRoutes.animeSources.children;
        case 'novel':
            return AppRoutes.novelSources.children;
        case 'show':
            return AppRoutes.showSources.children;
        case 'manga':
        default:
            return AppRoutes.sources.children;
    }
};
