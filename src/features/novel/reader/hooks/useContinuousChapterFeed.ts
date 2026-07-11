/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import DOMPurify from 'dompurify';
import { NovelReaderApi } from '@/features/novel/reader/NovelReaderApi.ts';

export interface ContinuousChapterMeta {
    id: number;
    sourceOrder: number;
    name: string;
}

export interface ContinuousChapterSection {
    index: number;
    chapter: ContinuousChapterMeta;
    html?: string;
    loading: boolean;
    error?: Error;
}

interface FetchState {
    html?: string;
    loading: boolean;
    error?: Error;
}

/**
 * Backs continuous-mode's true vertical scroll: `chapters` (reading order,
 * index 0 = earliest) are mounted as a contiguous window `[start, end]`
 * around `anchorIndex`. Only the anchor is fetched up front — `loadNext` /
 * `loadPrev` fetch and mount one further neighbour at a time, meant to be
 * called only once the user scrolls near the top/bottom edge of the
 * currently-loaded range (see the boundary check in `NovelReader.tsx`), so a
 * reading session that never scrolls past a chapter boundary never fetches
 * more than the one chapter it's looking at.
 */
export const useContinuousChapterFeed = (
    chapters: ContinuousChapterMeta[],
    anchorIndex: number,
    /**
     * When true at the moment `anchorIndex` changes, the change is a silent
     * hand-off to a chapter whose section the reader already scrolled into
     * (the URL is kept in sync for deep-linking, but the window shouldn't
     * collapse) rather than an explicit jump (TOC, prev/next buttons,
     * keyboard, browser back/forward, deep link) — leave the loaded window
     * as-is.
     */
    suppressResetRef?: RefObject<boolean>,
) => {
    const [range, setRange] = useState(() => ({ start: anchorIndex, end: anchorIndex }));
    const fetchedRef = useRef<Map<number, FetchState>>(new Map());
    const [, forceRerender] = useState(0);

    useEffect(() => {
        if (suppressResetRef?.current) {
            return;
        }
        fetchedRef.current.clear();
        setRange({ start: anchorIndex, end: anchorIndex });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [anchorIndex]);

    const fetchIndex = useCallback(
        (index: number) => {
            if (index < 0 || index >= chapters.length || fetchedRef.current.has(index)) {
                return;
            }
            const chapter = chapters[index];
            fetchedRef.current.set(index, { loading: true });
            forceRerender((n) => n + 1);
            NovelReaderApi.fetchChapterHtml(chapter.id)
                .then((rawHtml) => {
                    fetchedRef.current.set(index, { loading: false, html: DOMPurify.sanitize(rawHtml) });
                })
                .catch((e: unknown) => {
                    fetchedRef.current.set(index, {
                        loading: false,
                        error: e instanceof Error ? e : new Error(String(e)),
                    });
                })
                .finally(() => forceRerender((n) => n + 1));
        },
        [chapters],
    );

    useEffect(() => {
        for (let i = range.start; i <= range.end; i += 1) {
            fetchIndex(i);
        }
    }, [range, fetchIndex]);

    const loadNext = useCallback(() => {
        setRange((prev) => {
            const end = Math.min(chapters.length - 1, prev.end + 1);
            return end === prev.end ? prev : { ...prev, end };
        });
    }, [chapters.length]);

    const loadPrev = useCallback((): number | null => {
        let newStart: number | null = null;
        setRange((prev) => {
            const start = Math.max(0, prev.start - 1);
            if (start === prev.start) {
                return prev;
            }
            newStart = start;
            return { ...prev, start };
        });
        // `setRange`'s updater runs synchronously during this call, so
        // `newStart` is populated by the time we return here.
        return newStart;
    }, []);

    const sections: ContinuousChapterSection[] = [];
    for (let i = range.start; i <= range.end; i += 1) {
        const chapter = chapters[i];
        if (!chapter) {
            continue;
        }
        const state = fetchedRef.current.get(i);
        sections.push({
            index: i,
            chapter,
            html: state?.html,
            loading: state?.loading ?? true,
            error: state?.error,
        });
    }

    return {
        sections,
        hasMoreNext: range.end < chapters.length - 1,
        hasMorePrev: range.start > 0,
        loadNext,
        loadPrev,
    };
};
