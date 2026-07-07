/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { requestManager } from '@/lib/requests/RequestManager.ts';

/**
 * REST client for the lnreader-specific endpoint exposed by Miruyomi-Server
 * (`/api/v1/lnreader/chapter/:chapterId`), mirroring `AnimePlayerApi`'s
 * approach to the parallel aniyomi endpoint. The shared manga/chapter GraphQL
 * surface already returns this same URL as the synthetic page for lnreader
 * chapters via `fetchChapterPages`; this module fetches the raw chapter HTML
 * directly for the text reader.
 */
export const NovelReaderApi = {
    /** `GET /api/v1/lnreader/chapter/:chapterId` → the chapter body HTML (unsanitized). */
    fetchChapterHtml: async (chapterId: number): Promise<string> => {
        const url = requestManager.getValidUrlFor(`lnreader/chapter/${chapterId}`);
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) {
            throw new Error(`Failed to fetch chapter text: ${response.status} ${response.statusText}`);
        }
        return response.text();
    },
};
