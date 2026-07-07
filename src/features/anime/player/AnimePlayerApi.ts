/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { requestManager } from '@/lib/requests/RequestManager.ts';
import type { AniyomiVideosResponse, AniyomiVideo } from '@/features/anime/player/Player.types.ts';

/**
 * REST client for the aniyomi-specific endpoints exposed by Miruyomi-Server
 * (\`/api/v1/aniyomi/...\`). The shared manga/chapter GraphQL surface already
 * returns the synthetic page URL \`/api/v1/aniyomi/episode/:chapterId\` for
 * anime episodes via \`fetchChapterPages\`; this module fetches the per-episode
 * video list and builds the proxied stream URL.
 *
 * The stream is proxied server-side: the server injects the upstream
 * \`video.headers\` and forwards \`Range\` requests, so the WebUI just plays the
 * proxied URL — no cross-origin or referer issues.
 */
export const AnimePlayerApi = {
    /** \`GET /api/v1/aniyomi/episode/:chapterId/videos\` → the quality list. */
    fetchEpisodeVideos: async (chapterId: number): Promise<AniyomiVideo[]> => {
        const url = requestManager.getValidUrlFor(`aniyomi/episode/${chapterId}/videos`);
        const response = await fetch(url, { credentials: 'include' });
        if (!response.ok) {
            throw new Error(`Failed to fetch episode videos: ${response.status} ${response.statusText}`);
        }
        const body = (await response.json()) as AniyomiVideosResponse;
        return body.videos ?? [];
    },

    /**
     * \`GET /api/v1/aniyomi/episode/:chapterId?index=N\` — the proxied stream URL
     * for the Nth video. Pass \`index\` to select a quality rendition; omit it to
     * let the server pick the first. Use this as the \`<video>\` / shaka source.
     */
    getStreamUrl: (chapterId: number, index?: number): string => {
        const endpoint = index == null ? `aniyomi/episode/${chapterId}` : `aniyomi/episode/${chapterId}?index=${index}`;
        return requestManager.getValidUrlFor(endpoint);
    },
};
