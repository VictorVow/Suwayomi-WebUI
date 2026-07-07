/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import { NovelReaderApi } from '@/features/novel/reader/NovelReaderApi.ts';

export interface UseNovelChapterTextResult {
    /** Sanitized chapter HTML, safe to pass to `dangerouslySetInnerHTML`. */
    html: string | undefined;
    loading: boolean;
    error?: Error;
    refetch: () => void;
}

/**
 * Fetches an lnreader chapter's body HTML and sanitizes it with DOMPurify
 * before it ever reaches the DOM — the endpoint serves arbitrary third-party
 * scraped HTML, so this is a hard requirement, not a hardening nicety.
 *
 * Intentionally simple (no Apollo cache), mirroring `useEpisodeVideos`:
 * the chapter body isn't part of the shared GraphQL cache.
 */
export const useNovelChapterText = (chapterId: number | undefined): UseNovelChapterTextResult => {
    const [html, setHtml] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<Error | undefined>();

    const load = useCallback(async () => {
        if (chapterId == null) {
            setHtml(undefined);
            return;
        }
        setLoading(true);
        setError(undefined);
        try {
            const rawHtml = await NovelReaderApi.fetchChapterHtml(chapterId);
            setHtml(DOMPurify.sanitize(rawHtml));
        } catch (e) {
            setError(e instanceof Error ? e : new Error(String(e)));
            setHtml(undefined);
        } finally {
            setLoading(false);
        }
    }, [chapterId]);

    useEffect(() => {
        void load();
    }, [load]);

    return { html, loading, error, refetch: () => void load() };
};
