/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useEffect, useState } from 'react';
import { ShowPlayerApi } from '@/features/show/player/ShowPlayerApi.ts';
import type { ShowVideo } from '@/features/show/player/Player.types.ts';

export interface UseEpisodeVideosResult {
    videos: ShowVideo[];
    loading: boolean;
    error?: Error;
    refetch: () => void;
}

/**
 * Fetches the available quality renditions for a show episode via the
 * cloudstream REST endpoint. The hook is intentionally simple (no Apollo cache,
 * since the videos list is per-episode and not part of the shared GraphQL
 * cache). Re-fetches when \`chapterId\` changes.
 */
export const useEpisodeVideos = (chapterId: number | undefined): UseEpisodeVideosResult => {
    const [videos, setVideos] = useState<ShowVideo[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | undefined>();

    const load = useCallback(async () => {
        if (chapterId == null) {
            setVideos([]);
            return;
        }
        setLoading(true);
        setError(undefined);
        try {
            const result = await ShowPlayerApi.fetchEpisodeVideos(chapterId);
            setVideos(result);
        } catch (e) {
            setError(e instanceof Error ? e : new Error(String(e)));
            setVideos([]);
        } finally {
            setLoading(false);
        }
    }, [chapterId]);

    useEffect(() => {
        void load();
    }, [load]);

    return { videos, loading, error, refetch: () => void load() };
};
