/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useRef, useState, type RefObject } from 'react';
import {
    getReadingRateFor,
    getScrollPosition,
    recordReadingRate,
    setScrollPosition,
    useNovelReaderSettings,
} from '@/features/novel/reader/preferences.ts';

const SAVE_DEBOUNCE_MS = 400;
const MIN_DURATION_SECONDS = 1; // don't record rates under 1s of reading

export interface ReaderBehaviourApi {
    /** Estimated seconds remaining to read this chapter (scroll-pace based). */
    timeChapterSeconds?: number;
    /** Estimated seconds remaining to finish the manga (chapters remaining). */
    timeBookSeconds?: number;
    /** fraction of the chapter already scrolled, 0–1. */
    chapterProgress: number;
    /** fraction through the whole manga, 0–1. */
    bookProgress: number;
    /** current visible "screen" index within chapter (0-based). */
    screenIndex: number;
    /** total screens in the chapter (chunked one viewport each). */
    screenCount: number;
}

/**
 * Behaviour that hangs off the scrollable content pane:
 *
 *  - **Scroll position save & restore**: when `restore_scroll_position` is on,
 *    on chapter load, snap the pane to its last saved `scrollTop`; on scroll,
 *    debounced-write back (`useScrollProgress` renamed for clarity).
 *  - **Reading rate tracking**: accumulate chars read vs. wall time and feed
 *    calibre-style per-chapter rolling averages via `recordReadingRate`, used
 *    by `time-chapter` / `time-book` head/foot sections. Miruyomi uses
 *    `textContent.length` of the chapter pane as the "book length" proxy
 *    since there is no EPUB manifest word-count.
 *  - **Mark chapter read**: per policy.
 *    `on_open`  → fire once on chapter mount (legacy default behavior).
 *    `past_threshold` → fire when scrollTop crosses the configured fraction
 *    of scrollable height (default 95%, matching calibre's "deep zone").
 *
 * Exposes time-to-read estimates for the chrome so `time-chapter` / `pos-...`
 * / `progress` section renderers receive live values.
 */
export const useReaderBehaviour = (
    contentRef: RefObject<HTMLElement | null>,
    chapterId: number,
    totalChapters: number,
    chapterIndex1Based: number,
    markRead: () => void,
    isChapterRead: boolean,
): ReaderBehaviourApi => {
    const settings = useNovelReaderSettings();
    const [api, setApi] = useState<ReaderBehaviourApi>({
        chapterProgress: 0,
        bookProgress: 0,
        screenIndex: 0,
        screenCount: 1,
    });
    const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const startRef = useRef<{ at: number; scrollTop: number; chars: number } | null>(null);
    const firedMarkReadRef = useRef(false);

    // Restore scroll position when chapter changes and pref is on.
    useEffect(() => {
        const el = contentRef.current;
        if (!el) {
            return;
        }
        firedMarkReadRef.current = false;
        if (settings.restore_scroll_position) {
            el.scrollTop = getScrollPosition(chapterId);
        } else {
            el.scrollTop = 0;
        }
        startRef.current = { at: Date.now(), scrollTop: el.scrollTop, chars: el.textContent?.length ?? 0 };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [chapterId, settings.restore_scroll_position]);

    useEffect(() => {
        const el = contentRef.current;
        if (!el) {
            return undefined;
        }
        const onScroll = () => {
            const { scrollTop } = el;
            const scrollHeight = el.scrollHeight - el.clientHeight || 1;
            const frac = Math.min(1, Math.max(0, scrollTop / scrollHeight));
            const screen = Math.max(1, el.clientHeight);
            const screenIndex = Math.min(Math.floor(scrollTop / screen), Math.ceil(el.scrollHeight / screen) - 1);
            const screenCount = Math.max(1, Math.ceil(el.scrollHeight / screen));
            const chars = el.textContent?.length ?? 0;
            const rate = getReadingRateFor(chapterId);
            const remainingChars = Math.max(0, chars - frac * chars);
            const remainingChapters = totalChapters - chapterIndex1Based + (1 - frac);

            const timeChapterSeconds = rate != null && rate > 0 ? remainingChars / rate || undefined : undefined;
            // Approximate time remaining for the manga at the current rate,
            // using the current chapter's char-length as a proxy for siblings
            // (no per-chapter manifest exists for lnreader sources).
            const timeBookSeconds =
                rate != null && rate > 0
                    ? ((remainingChapters - 1) * chars + (timeChapterSeconds ?? 0) * rate) / rate
                    : undefined;
            const bookProgress = Math.min(1, (chapterIndex1Based - 1 + frac) / Math.max(1, totalChapters));

            setApi({
                chapterProgress: frac,
                bookProgress,
                screenIndex,
                screenCount,
                timeChapterSeconds,
                timeBookSeconds,
            });

            // mark-read past threshold (when policy is `past_threshold`).
            if (
                settings.mark_read_policy === 'past_threshold' &&
                !firedMarkReadRef.current &&
                !isChapterRead &&
                frac >= settings.mark_read_threshold
            ) {
                firedMarkReadRef.current = true;
                markRead();
            }

            // debounce-save scroll position
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
            const captured = scrollTop;
            saveTimerRef.current = setTimeout(() => {
                if (settings.restore_scroll_position) {
                    setScrollPosition(chapterId, captured);
                }
            }, SAVE_DEBOUNCE_MS);

            // record reading rate (chars delta vs time delta)
            if (startRef.current) {
                const now = Date.now();
                const dtSec = (now - startRef.current.at) / 1000;
                const charsRead = Math.max(0, chars - startRef.current.chars);
                if (dtSec > MIN_DURATION_SECONDS && charsRead > 0) {
                    recordReadingRate(chapterId, charsRead, dtSec);
                    startRef.current = { at: now, scrollTop, chars };
                }
            }
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        // Recompute when the content height changes (e.g. async HTML load,
        // font-size/margin adjustments) so the progress HUD and threshold
        // check operate on the real scrollable height rather than a stale
        // value captured at effect setup.
        const ro = new ResizeObserver(() => onScroll());
        ro.observe(el);
        return () => {
            el.removeEventListener('scroll', onScroll);
            ro.disconnect();
            if (saveTimerRef.current) {
                clearTimeout(saveTimerRef.current);
            }
        };
    }, [
        contentRef,
        chapterId,
        totalChapters,
        chapterIndex1Based,
        markRead,
        isChapterRead,
        settings.mark_read_policy,
        settings.mark_read_threshold,
        settings.restore_scroll_position,
    ]);

    return api;
};
