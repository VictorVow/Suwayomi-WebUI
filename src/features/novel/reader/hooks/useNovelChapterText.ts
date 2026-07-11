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
    // Key the result by chapter id so a stale html/error from the previous
    // chapter (or an out-of-order fetch) is never returned against the wrong
    // chapter. `current` is undefined until the in-flight fetch for *this*
    // chapter resolves, which makes `!!html` mean exactly "the current
    // chapter's html is ready" — synchronous at commit, unlike `loading`
    // which only flips in a passive effect.
    const [result, setResult] = useState<{ chapterId: number; html?: string; error?: Error } | undefined>();
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        if (chapterId == null) {
            setResult(undefined);
            return;
        }
        setLoading(true);
        try {
            const rawHtml = await NovelReaderApi.fetchChapterHtml(chapterId);
            setResult({ chapterId, html: DOMPurify.sanitize(rawHtml) });
        } catch (e) {
            setResult({ chapterId, error: e instanceof Error ? e : new Error(String(e)) });
        } finally {
            setLoading(false);
        }
    }, [chapterId]);

    useEffect(() => {
        void load();
    }, [load]);

    const current = result?.chapterId === chapterId ? result : undefined;
    return {
        html: current?.html,
        loading,
        error: current?.error,
        refetch: () => void load(),
    };
};
