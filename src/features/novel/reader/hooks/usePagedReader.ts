/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

const PAGE_POSITIONS_LS_KEY = 'miruyomi.novelReader.pagePositions.v2';
const SAVE_DEBOUNCE_MS = 400;

const getPagePosition = (chapterId: number): number => {
    try {
        const raw = localStorage.getItem(PAGE_POSITIONS_LS_KEY);
        if (!raw) {
            return 0;
        }
        const map = JSON.parse(raw) as Record<number, number>;
        return map[chapterId] ?? 0;
    } catch {
        return 0;
    }
};

const setPagePosition = (chapterId: number, page: number): void => {
    try {
        const raw = localStorage.getItem(PAGE_POSITIONS_LS_KEY);
        const map: Record<number, number> = raw ? (JSON.parse(raw) as Record<number, number>) : {};
        map[chapterId] = page;
        const entries = Object.entries(map);
        if (entries.length > 200) {
            entries
                .sort((a, b) => b[1] - a[1])
                .slice(200)
                .forEach(([key]) => {
                    delete map[Number(key)];
                });
        }
        localStorage.setItem(PAGE_POSITIONS_LS_KEY, JSON.stringify(map));
    } catch {
        // localStorage may be unavailable — silently ignore.
    }
};

export interface PagedReaderApi {
    /** Current page index (0-based). */
    pageIndex: number;
    /** Total number of pages. */
    pageCount: number;
    /** Fraction through the chapter (0–1). */
    frac: number;
    /** Go forward one page; auto-advances to next chapter at the end. */
    nextPage: () => void;
    /** Go back one page; auto-advances to prev chapter at the start. */
    prevPage: () => void;
    /** Jump to a specific page index (clamped). */
    goToPage: (page: number) => void;
}

/**
 * Paged reading mode for the novel reader. Uses CSS multi-column layout to
 * split the chapter HTML into viewport-sized pages. The caller sets
 * `column-width: 100%` / `height: 100%` on the inner content element (the
 * direct child of the scroll container); this hook tracks the page count
 * (from `scrollWidth / clientWidth`), saves/restores the page position per
 * chapter, and exposes `nextPage`/`prevPage`/`goToPage` with auto-advance
 * to adjacent chapters.
 *
 * The scroll container itself has `overflow: hidden` in paged mode — the
 * horizontal translate is done by the caller via `scrollTo({ left })`.
 */
export const usePagedReader = (
    contentRef: RefObject<HTMLElement | null>,
    chapterId: number,
    restorePosition: boolean,
    onNextChapter: () => void,
    onPrevChapter: () => void,
    hasNextChapter: boolean,
    hasPrevChapter: boolean,
): PagedReaderApi => {
    const [pageIndex, setPageIndex] = useState(0);
    const [pageCount, setPageCount] = useState(1);
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const advancingRef = useRef(false);

    // Reset page index on chapter change.
    useEffect(() => {
        advancingRef.current = false;
        if (restorePosition) {
            setPageIndex(getPagePosition(chapterId));
        } else {
            setPageIndex(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chapterId, restorePosition]);

    // Recalculate page count whenever content size changes.
    useEffect(() => {
        const el = contentRef.current;
        if (!el) {
            return undefined;
        }
        const recalc = () => {
            const cw = el.clientWidth;
            if (cw <= 0) {
                return;
            }
            const count = Math.max(1, Math.ceil(el.scrollWidth / cw) || 1);
            setPageCount((prev) => (prev !== count ? count : prev));
            setPageIndex((prev) => Math.min(prev, count - 1));
        };
        recalc();
        const ro = new ResizeObserver(() => recalc());
        ro.observe(el);
        return () => ro.disconnect();
    }, [contentRef, chapterId]);

    // Debounced save of current page position.
    useEffect(() => {
        if (saveTimerRef.current) {
            clearTimeout(saveTimerRef.current);
        }
        saveTimerRef.current = setTimeout(() => {
            if (restorePosition) {
                setPagePosition(chapterId, pageIndex);
            }
        }, SAVE_DEBOUNCE_MS);
        return () => {
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
        };
    }, [pageIndex, chapterId, restorePosition]);

    const nextPage = useCallback(() => {
        if (advancingRef.current) {
            return;
        }
        setPageIndex((prev) => {
            if (prev < pageCount - 1) {
                return prev + 1;
            }
            if (hasNextChapter) {
                advancingRef.current = true;
                onNextChapter();
            }
            return prev;
        });
    }, [pageCount, hasNextChapter, onNextChapter]);

    const prevPage = useCallback(() => {
        if (advancingRef.current) {
            return;
        }
        setPageIndex((prev) => {
            if (prev > 0) {
                return prev - 1;
            }
            if (hasPrevChapter) {
                advancingRef.current = true;
                onPrevChapter();
            }
            return prev;
        });
    }, [hasPrevChapter, onPrevChapter]);

    const goToPage = useCallback(
        (page: number) => {
            setPageIndex(Math.min(pageCount - 1, Math.max(0, page)));
        },
        [pageCount],
    );

    const frac = pageCount > 1 ? pageIndex / (pageCount - 1) : 1;

    return { pageIndex, pageCount, frac, nextPage, prevPage, goToPage };
};
