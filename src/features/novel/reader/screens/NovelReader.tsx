/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import { useLingui } from '@lingui/react/macro';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { GET_MANGA_READER } from '@/lib/graphql/manga/MangaQuery.ts';
import { GET_CHAPTERS_READER } from '@/lib/graphql/chapter/ChapterQuery.ts';
import type { GetMangaReaderQuery, GetChaptersReaderQuery } from '@/lib/graphql/generated/graphql.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { useNovelChapterText } from '@/features/novel/reader/hooks/useNovelChapterText.ts';
import { useContinuousChapterFeed } from '@/features/novel/reader/hooks/useContinuousChapterFeed.ts';
import { NovelReaderOverlay } from '@/features/novel/reader/components/NovelReaderOverlay.tsx';
import { NovelReaderToc } from '@/features/novel/reader/components/NovelReaderToc.tsx';
import { NovelReaderSearch } from '@/features/novel/reader/components/NovelReaderSearch.tsx';
import { NovelReaderChrome } from '@/features/novel/reader/components/NovelReaderChrome.tsx';
import { NovelReaderSelectionBar } from '@/features/novel/reader/components/NovelReaderSelectionBar.tsx';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import {
    resolveColorScheme,
    updateNovelReaderSettings,
    useNovelReaderSettings,
} from '@/features/novel/reader/preferences.ts';
import type { ReaderPanel } from '@/features/novel/reader/readerPanel.ts';
import { useChapterTextSearch } from '@/features/novel/reader/hooks/useChapterTextSearch.ts';
import { useReaderBehaviour } from '@/features/novel/reader/hooks/useReaderBehaviour.ts';
import { useReaderKeyboard } from '@/features/novel/reader/hooks/useReaderKeyboard.ts';
import { useChromeAutohide } from '@/features/novel/reader/hooks/useChromeAutohide.ts';
import { usePagedReader } from '@/features/novel/reader/hooks/usePagedReader.ts';
import type { HeadFootRenderCtx } from '@/features/novel/reader/settings/headFoot.ts';

const fontFamilyCssMap: Record<'system' | 'serif' | 'sans', string> = {
    system: 'inherit',
    serif: 'Georgia, "Times New Roman", serif',
    sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
};

const EMPTY_CHAPTERS: never[] = [];

// Start fetching the neighbouring chapter once the reader is within this
// many px of the loaded range's top/bottom edge, rather than eagerly
// prefetching it as soon as the current chapter is opened.
const SCROLL_BOUNDARY_PX = 600;

// In paged mode, a single inertial mouse-wheel/trackpad flick can fire wheel
// events for several hundred ms. Allow at most one chapter advance per scroll
// gesture: a gap between wheel events longer than this resets the gesture, so
// the reader has to start a new scroll before another boundary cross can fire.
// Also used in continuous mode to prevent cascade-loading multiple chapters
// from a single inertial scroll gesture.
const SCROLL_GESTURE_GAP_MS = 350;

/**
 * Full-screen novel text reader — a fuller port of calibre's content-server
 * reader.
 *
 * The runtime differs from calibre's: Miruyomi serves single-chapter
 * sanitized HTML via REST (no EPUB spine, no iframe message bus), so CFI
 * anchoring / highlight annotations are out of scope. Two layout modes are
 * supported:
 *
 *   - `continuous` (default): true vertical scroll — chapters are
 *     concatenated in one scrollable pane. Only the opened chapter is
 *     fetched up front; the neighbouring chapter is fetched and appended
 *     (or prepended) once the reader scrolls within `SCROLL_BOUNDARY_PX` of
 *     the loaded range's edge (see `useContinuousChapterFeed`), so scrolling
 *     flows straight from one chapter's text into the next with no
 *     page-swap.
 *   - `paged`: the single current chapter rendered as a normal vertically
 *     scrolling column. Native wheel/trackpad/keyboard scrolling moves
 *     through the chapter text; only when the reader is already at the
 *     top (and scrolls up) or the bottom (and scrolls down) does a further
 *     wheel tick cross into the previous/next chapter, so exactly one
 *     chapter is ever visible. Left/right tap zones and ArrowLeft/ArrowRight
 *     step the viewport up/down by ~one screen.
 *
 * Ported:
 *
 *   - Overlay panel-stack (calibre `Overlay`): right-click / Esc / hotkey
 *     pushes `{main}`; sub-panels (Font size, Go to, Word lookup, Preferences)
 *     push further; backdrops pop. The chrome header/footer strips persist
 *     above content (calibre's `head_foot`). Opening the main overlay also
 *     opens the TOC drawer.
 *   - MUI-friendly, with all settings stored as a single flat schema in
 *     localStorage (`miruyomi.novelReader.settings.v2`, documented in
 *     `preferences.ts`).
 *
 * The reader is mounted outside `MainApp` via `NovelReaderApp` for true
 * fullscreen with no sidebar (mirrors the anime `Player`).
 */
export const NovelReader = () => {
    const { t } = useLingui();
    const navigate = useNavigate();
    const { mangaId: paramMangaId, chapterSourceOrder: paramChapterSourceOrder } = useParams<{
        mangaId: string;
        chapterSourceOrder: string;
    }>();

    const mangaId = Number(paramMangaId);
    const chapterSourceOrder = Number(paramChapterSourceOrder);

    const mangaResponse = requestManager.useGetManga<GetMangaReaderQuery>(GET_MANGA_READER, mangaId);
    const chaptersResponse = requestManager.useGetMangaChapters<GetChaptersReaderQuery>(GET_CHAPTERS_READER, mangaId);

    const manga = mangaResponse.data?.manga;
    const chapters = useMemo(() => chaptersResponse.data?.chapters.nodes ?? [], [chaptersResponse.data]);
    const sortedChapters = useMemo(() => [...chapters].sort((a, b) => b.sourceOrder - a.sourceOrder), [chapters]);
    const currentIndex = sortedChapters.findIndex((c) => c.sourceOrder === chapterSourceOrder);
    const currentChapter = currentIndex >= 0 ? sortedChapters[currentIndex] : undefined;

    useAppTitle(
        !manga || !currentChapter
            ? t`Novel Reader — Novel ${mangaId} Chapter ${chapterSourceOrder}`
            : `${manga.title}: ${currentChapter.name}`,
    );
    // sortedChapters is sorted by descending sourceOrder (index 0 = latest chapter),
    // so moving to the next chapter (higher sourceOrder) means a lower array index.
    const hasNextChapter = currentIndex > 0;
    const hasPrevChapter = currentIndex >= 0 && currentIndex < sortedChapters.length - 1;
    const nextChapter = hasNextChapter ? sortedChapters[currentIndex - 1] : undefined;
    const prevChapter = hasPrevChapter ? sortedChapters[currentIndex + 1] : undefined;

    const settings = useNovelReaderSettings();
    const colors = resolveColorScheme(settings.current_color_scheme, settings.user_color_schemes);
    const isPaged = settings.reading_mode === 'paged';

    // Only paged mode uses this — continuous mode fetches chapter bodies
    // through `useContinuousChapterFeed` instead, so this stays idle there
    // rather than double-fetching the anchor chapter.
    const {
        html,
        loading: htmlLoading,
        error: htmlError,
    } = useNovelChapterText(isPaged ? currentChapter?.id : undefined);

    // ── Continuous mode: sliding window of concatenated chapters ──────────
    // readingOrderChapters is ascending (index 0 = earliest), the inverse of
    // sortedChapters, so array index increases in the forward reading
    // direction — the natural top-to-bottom order sections are rendered in.
    const readingOrderChapters = useMemo(() => [...sortedChapters].reverse(), [sortedChapters]);
    const anchorIndex = currentIndex >= 0 ? readingOrderChapters.length - 1 - currentIndex : -1;

    const silentTransitionRef = useRef(false);
    const sectionRefs = useRef<Map<number, HTMLElement>>(new Map());
    const activeSectionElRef = useRef<HTMLElement | null>(null);

    const feed = useContinuousChapterFeed(
        isPaged ? EMPTY_CHAPTERS : readingOrderChapters,
        isPaged ? -1 : anchorIndex,
        silentTransitionRef,
    );

    const [activeIndex, setActiveIndex] = useState(anchorIndex);

    // Explicit navigation (TOC, prev/next buttons, keyboard, browser
    // back/forward, deep link) moves the route's anchor chapter — follow it.
    // (When the anchor instead moves because of the silent-sync effect below,
    // it moves *to* activeIndex, so this is a no-op in that case.)
    useEffect(() => {
        setActiveIndex(anchorIndex);
    }, [anchorIndex]);

    // When continuous-mode scrolling has landed on a chapter other than the
    // route's anchor, silently sync the URL to it — keeps deep-linking and
    // the back button meaningful — without collapsing the loaded window or
    // resetting scroll (see `silentTransitionRef` consumers).
    useEffect(() => {
        if (isPaged || activeIndex < 0 || activeIndex === anchorIndex) {
            return;
        }
        const chapter = readingOrderChapters[activeIndex];
        if (!chapter) {
            return;
        }
        silentTransitionRef.current = true;
        navigate(AppRoutes.novelReader.path(mangaId, chapter.sourceOrder), { replace: true });
    }, [isPaged, activeIndex, anchorIndex, readingOrderChapters, mangaId, navigate]);

    const setSectionRef = useCallback(
        (index: number) => (el: HTMLDivElement | null) => {
            if (el) {
                sectionRefs.current.set(index, el);
            } else {
                sectionRefs.current.delete(index);
            }
        },
        [],
    );

    // Keep the active chapter's own section element fresh for behaviour
    // tracking — a layout effect so it's up to date before any passive
    // effect (e.g. `useReaderBehaviour`) reads it.
    useLayoutEffect(() => {
        activeSectionElRef.current = isPaged ? null : (sectionRefs.current.get(activeIndex) ?? null);
    });

    // ── Refs + chrome auto-hide (declared above callbacks that depend on them) ──
    const contentRef = useRef<HTMLDivElement>(null);
    // Guards paged mode's wheel-at-boundary chapter change from re-firing on
    // inertial wheel events before the route change commits and rebinds the
    // handler. Reset on chapter change (see the effect below the wheel block).
    const pagedAdvancingRef = useRef(false);
    // Tracks whether a chapter advance has already fired in the current scroll
    // gesture. Reset only when a quiet gap separates wheel events, so a single
    // inertial flick can cross at most one chapter boundary — the reader must
    // start a new scroll before another advance is possible.
    const advanceUsedRef = useRef(false);
    const lastWheelTsRef = useRef(0);
    // Continuous mode: prevent a single inertial scroll gesture from cascading
    // multiple loadPrev/loadNext calls (each extends the window by one
    // chapter). Same gesture-gap pattern as the paged advance guard above.
    const feedLoadUsedRef = useRef(false);
    const lastScrollTsRef = useRef(0);
    const chrome = useChromeAutohide(contentRef);
    const chromeReveal = chrome.reveal;

    // ── Panel-stack (LIFO) ────────────────────────────────────────────────
    const [panelStack, setPanelStack] = useState<ReaderPanel[]>([]);
    const push = useCallback(
        (p: ReaderPanel) => {
            setPanelStack((prev) => [...prev, p]);
            chromeReveal();
        },
        [chromeReveal],
    );
    const pop = useCallback(() => {
        setPanelStack((prev) => (prev.length ? prev.slice(0, -1) : prev));
    }, []);
    const pushMain = useCallback(() => {
        // Toggle off the main overlay when a `main` panel already exists anywhere
        // in the stack — calibre's `show_chrome` semantics, hardened so a stray
        // double-invocation within one gesture can't leave two `main` panels
        // stacked (which would independently reproduce the "two clicks / two
        // layers" feel).
        setPanelStack((prev) => {
            const mainIndex = prev.findIndex((p) => p.kind === 'main');
            if (mainIndex >= 0) {
                return prev.filter((_, i) => i !== mainIndex);
            }
            return [...prev, { kind: 'main' }];
        });
        chromeReveal();
    }, [chromeReveal]);
    const closeAll = useCallback(() => setPanelStack([]), []);
    const topPanel = panelStack[panelStack.length - 1];

    // ── TOC drawer + search bar ────────────────────────────────────────────
    const [isTocOpen, setIsTocOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // 3b: auto-open TOC when main overlay opens; auto-close when it closes.
    const mainOverlayOpen = topPanel?.kind === 'main';
    useEffect(() => {
        if (mainOverlayOpen) {
            setIsTocOpen(true);
        } else {
            setIsTocOpen(false);
        }
    }, [mainOverlayOpen]);

    // ── Reading behaviour: scroll save/restore, rate tracking, mark-read ──
    const markRead = useCallback(() => {
        if (!currentChapter || currentChapter.isRead) {
            return;
        }
        requestManager.updateChapter(currentChapter.id, { isRead: true, lastPageRead: 100 });
    }, [currentChapter?.id]);

    const behaviour = useReaderBehaviour(
        contentRef,
        currentChapter?.id ?? 0,
        sortedChapters.length,
        currentIndex + 1,
        markRead,
        currentChapter?.isRead ?? false,
        activeSectionElRef,
        silentTransitionRef,
    );

    // Re-fire mark-read on chapter mount only when policy is `on_open`.
    useEffect(() => {
        if (!currentChapter) {
            return;
        }
        if (settings.mark_read_policy === 'on_open' && !currentChapter.isRead) {
            requestManager.updateChapter(currentChapter.id, { isRead: true, lastPageRead: 1 });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentChapter?.id]);

    // ── Search hook (lifted so selection bar + keyboard can drive it) ─────
    const search = useChapterTextSearch(contentRef, isSearchOpen ? searchQuery : '');

    // ── Chapter navigation ────────────────────────────────────────────────
    const goToChapter = useCallback(
        (order: number | undefined) => {
            if (order == null) {
                return;
            }
            setIsSearchOpen(false);
            closeAll();
            navigate(AppRoutes.novelReader.path(mangaId, order));
        },
        [mangaId, navigate, closeAll],
    );

    const handleToggleBookmark = useCallback(() => {
        if (!currentChapter) {
            return;
        }
        requestManager.updateChapter(currentChapter.id, { isBookmarked: !currentChapter.isBookmarked });
    }, [currentChapter?.id]);

    // ── Paged mode ────────────────────────────────────────────────────────
    // NOTE: `usePagedReader` was originally built for a CSS multi-column paged
    // layout (horizontal page columns + `scrollWidth`-based page counting +
    // `nextPage`/`prevPage` auto-advance). Paged mode now renders one chapter
    // as a normal vertically-scrolling column with wheel-at-boundary chapter
    // changes handled directly in the effect below, so this hook is currently
    // DORMANT — it still tracks a (now-meaningless) pageCount/pageIndex and
    // saves them to its own localStorage key, but nothing reads those values.
    // It is kept wired so a future true-page layout can revive it without
    // re-plumbing the chapter-nav callbacks. When you're confident the
    // multi-column paged layout won't return, ask the user whether this hook
    // (and its localStorage key `miruyomi.novelReader.pagePositions.v2`)
    // should be removed entirely.
    const paged = usePagedReader(
        contentRef,
        currentChapter?.id ?? 0,
        settings.restore_scroll_position,
        () => goToChapter(nextChapter?.sourceOrder),
        () => goToChapter(prevChapter?.sourceOrder),
        hasNextChapter,
        hasPrevChapter,
    );
    // Keep the reference live so linters don't flag the dormant hook as unused.
    void paged;

    const gotoChapterByFraction = useCallback(
        (frac: number) => {
            const el = contentRef.current;
            if (!el) {
                return;
            }
            if (isPaged) {
                // Paged mode is now a single vertically-scrolling chapter — seek
                // within it by scrollTop fraction, mirroring the continuous path.
                const target = (el.scrollHeight - el.clientHeight) * Math.min(1, Math.max(0, frac));
                el.scrollTo({ top: target, behavior: 'smooth' });
            } else {
                // Seek within the active chapter's own section, not the whole
                // (possibly multi-chapter) pane.
                const sectionEl = activeSectionElRef.current ?? el;
                const sectionTop = sectionEl === el ? 0 : sectionEl.offsetTop;
                const sectionHeight = sectionEl === el ? el.scrollHeight : sectionEl.offsetHeight;
                const target = sectionTop + (sectionHeight - el.clientHeight) * Math.min(1, Math.max(0, frac));
                el.scrollTo({ top: target, behavior: 'smooth' });
            }
            closeAll();
        },
        [closeAll, isPaged],
    );

    // ── Continuous mode: lazy-load the neighbour chapter + track which
    // chapter is active ─────────────────────────────────────────────────────
    // Fetches the next/previous chapter only once scrolling comes within a
    // clamped boundary of the loaded range's edge (see
    // `useContinuousChapterFeed`), and tracks which loaded chapter's section
    // the reader has scrolled into so chrome/progress/mark-read/URL follow it.
    //
    // Two guards prevent cascade-loading (many chapters at once):
    //   - Boundary clamp: `boundary = min(SCROLL_BOUNDARY_PX, maxScroll/3)`
    //     so a short chapter (height < SCROLL_BOUNDARY_PX) doesn't trigger
    //     both loadPrev and loadNext on every scroll event.
    //   - One-load-per-gesture: a scroll-quiet gap > SCROLL_GESTURE_GAP_MS
    //     re-arms the gate, so a single inertial flick loads at most one
    //     neighbour per direction.
    useEffect(() => {
        if (isPaged) {
            return undefined;
        }
        const el = contentRef.current;
        if (!el) {
            return undefined;
        }
        const onScroll = () => {
            const now = performance.now();
            if (now - lastScrollTsRef.current > SCROLL_GESTURE_GAP_MS) {
                feedLoadUsedRef.current = false;
            }
            lastScrollTsRef.current = now;

            const maxScroll = el.scrollHeight - el.clientHeight;
            if (maxScroll > 0) {
                const boundary = Math.min(SCROLL_BOUNDARY_PX, maxScroll / 3);
                if (el.scrollTop <= boundary && feed.hasMorePrev && !feedLoadUsedRef.current) {
                    feedLoadUsedRef.current = true;
                    feed.loadPrev();
                }
                if (el.scrollTop >= maxScroll - boundary && feed.hasMoreNext && !feedLoadUsedRef.current) {
                    feedLoadUsedRef.current = true;
                    feed.loadNext();
                }
            }

            // The active section is the loaded one furthest down whose top
            // has already scrolled past — i.e. the chapter currently
            // occupying the top of the viewport.
            let active = anchorIndex;
            let bestTop = -Infinity;
            sectionRefs.current.forEach((node, index) => {
                if (node.offsetTop <= el.scrollTop + 1 && node.offsetTop > bestTop) {
                    bestTop = node.offsetTop;
                    active = index;
                }
            });
            setActiveIndex((prev) => (prev === active ? prev : active));
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
        return () => el.removeEventListener('scroll', onScroll);
    }, [isPaged, feed.hasMorePrev, feed.hasMoreNext, feed.loadPrev, feed.loadNext, anchorIndex]);

    // Prepending an earlier chapter (scrolling up past the loaded range)
    // grows content above the viewport — compensate scrollTop by the same
    // delta as those sections resize (placeholder → sanitized HTML) so the
    // reader's current view doesn't jump.
    const beforeActiveIndicesKey = feed.sections
        .filter((section) => section.index < activeIndex)
        .map((section) => section.index)
        .join(',');
    useLayoutEffect(() => {
        if (isPaged || !beforeActiveIndicesKey) {
            return undefined;
        }
        const el = contentRef.current;
        if (!el) {
            return undefined;
        }
        const nodes = beforeActiveIndicesKey
            .split(',')
            .map((key) => sectionRefs.current.get(Number(key)))
            .filter((node): node is HTMLElement => node != null);
        if (nodes.length === 0) {
            return undefined;
        }
        let prevHeight = nodes.reduce((sum, node) => sum + node.offsetHeight, 0);
        const ro = new ResizeObserver(() => {
            const newHeight = nodes.reduce((sum, node) => sum + node.offsetHeight, 0);
            const delta = newHeight - prevHeight;
            if (delta !== 0) {
                el.scrollTop += delta;
                prevHeight = newHeight;
            }
        });
        nodes.forEach((node) => ro.observe(node));
        return () => ro.disconnect();
    }, [isPaged, beforeActiveIndicesKey]);

    // ── Paged mode: vertical native scroll with boundary chapter changes ──
    // Paged mode renders one chapter at a time as a normal vertically-scrolling
    // column. Native wheel/trackpad scroll moves through the chapter text; only
    // when the reader is already parked at the top (and scrolls up) or the
    // bottom (and scrolls down) does a further wheel tick cross into the
    // previous/next chapter — so exactly one chapter is ever visible.
    useEffect(() => {
        if (!isPaged) {
            return undefined;
        }
        const el = contentRef.current;
        if (!el) {
            return undefined;
        }
        const onWheel = (e: WheelEvent) => {
            const now = performance.now();
            // A gap longer than WHEEL_GESTURE_GAP_MS means the reader started a
            // new scroll gesture — re-arm the one-advance-per-gesture gate.
            if (now - lastWheelTsRef.current > SCROLL_GESTURE_GAP_MS) {
                advanceUsedRef.current = false;
            }
            lastWheelTsRef.current = now;
            if (pagedAdvancingRef.current) {
                e.preventDefault();
                return;
            }
            const atTop = el.scrollTop <= 0;
            const atBottom = el.scrollTop >= el.scrollHeight - el.clientHeight - 1;
            if (e.deltaY < 0 && atTop && hasPrevChapter && !advanceUsedRef.current) {
                e.preventDefault();
                advanceUsedRef.current = true;
                pagedAdvancingRef.current = true;
                goToChapter(prevChapter?.sourceOrder);
            } else if (e.deltaY > 0 && atBottom && hasNextChapter && !advanceUsedRef.current) {
                e.preventDefault();
                advanceUsedRef.current = true;
                pagedAdvancingRef.current = true;
                goToChapter(nextChapter?.sourceOrder);
            }
            // Otherwise let the browser scroll the chapter natively.
        };
        const onKey = (e: KeyboardEvent) => {
            // Don't hijack when a panel/overlay or search is open.
            if (panelStack.length > 0 || isSearchOpen || isTocOpen) {
                return;
            }
            // Up / Down / PageUp / PageDown / Space scroll the chapter natively
            // (no preventDefault). Left / Right step the viewport up / down by
            // ~one screen with slight overlap so no lines are skipped.
            const step = Math.round(el.clientHeight * 0.9);
            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault();
                    el.scrollBy({ top: -step, behavior: 'smooth' });
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    el.scrollBy({ top: step, behavior: 'smooth' });
                    break;
                default:
                    break;
            }
        };
        el.addEventListener('wheel', onWheel, { passive: false });
        window.addEventListener('keydown', onKey);
        return () => {
            el.removeEventListener('wheel', onWheel);
            window.removeEventListener('keydown', onKey);
        };
    }, [
        isPaged,
        contentRef,
        panelStack.length,
        isSearchOpen,
        isTocOpen,
        hasPrevChapter,
        hasNextChapter,
        prevChapter?.sourceOrder,
        nextChapter?.sourceOrder,
        goToChapter,
    ]);

    // Clear the paged advance guard once the route's anchor chapter changes.
    useEffect(() => {
        if (isPaged) {
            pagedAdvancingRef.current = false;
        }
    }, [isPaged, currentChapter?.id]);

    // ── 3a: reset scroll to top on explicit chapter change (continuous mode) ──
    // Skipped for silent scroll-driven hand-offs (see `silentTransitionRef`):
    // the reader is already mid-scroll into that chapter, so snapping to its
    // top would fight the very scroll that triggered the hand-off.
    useEffect(() => {
        if (isPaged || silentTransitionRef.current) {
            return;
        }
        const el = contentRef.current;
        if (!el) {
            return;
        }
        el.scrollTop = 0;
    }, [isPaged, currentChapter?.id]);

    // Consumed by every effect above keyed on `currentChapter?.id` — declared
    // last among them so it always clears the flag only after they've all
    // had a chance to read it for this commit.
    useEffect(() => {
        silentTransitionRef.current = false;
    }, [currentChapter?.id]);

    // ── Keyboard shortcuts ────────────────────────────────────────────────
    useReaderKeyboard({
        showChrome: pushMain,
        startSearch: () => {
            setIsSearchOpen(true);
            chrome.reveal();
        },
        nextMatch: search.goToNext,
        previousMatch: search.goToPrevious,
        increaseFontSize: () =>
            updateNovelReaderSettings({ base_font_size: Math.min(64, settings.base_font_size + 1) }),
        decreaseFontSize: () => updateNovelReaderSettings({ base_font_size: Math.max(8, settings.base_font_size - 1) }),
        defaultFontSize: () => updateNovelReaderSettings({ base_font_size: 18 }),
        gotoLocation: () => push({ kind: 'goto' }),
        toggleToc: () => setIsTocOpen((prev) => !prev),
        newBookmark: handleToggleBookmark,
        toggleBookmarks: () => setIsTocOpen(true),
        previousSection: () => goToChapter(prevChapter?.sourceOrder),
        nextSection: () => goToChapter(nextChapter?.sourceOrder),
        preferences: () => push({ kind: 'prefs' }),
        back: () => navigate(-1),
        forward: () => navigate(1),
    });

    if (mangaResponse.loading || chaptersResponse.loading) {
        return <LoadingPlaceholder />;
    }

    if (mangaResponse.error || chaptersResponse.error) {
        return (
            <EmptyViewAbsoluteCentered
                message={t`Unable to load data`}
                messageExtra={mangaResponse.error?.message ?? chaptersResponse.error?.message}
            />
        );
    }

    if (!manga || !currentChapter) {
        return <EmptyViewAbsoluteCentered message={t`Chapter does not exist`} />;
    }

    const fontFamilyCss = fontFamilyCssMap[settings.font_family];

    // Both modes now use vertical native scroll, so `behaviour` drives progress
    // and screen counters in either mode. (`usePagedReader` is kept wired but
    // dormant — see its comment block — and no longer feeds the chrome.)
    const { chapterProgress, bookProgress } = behaviour;

    const chromeCtx: HeadFootRenderCtx = {
        mangaTitle: manga.title,
        chapterName: currentChapter.name,
        chapterProgress,
        bookProgress,
        chapterIndex: currentIndex + 1,
        chapterCount: sortedChapters.length,
        timeChapterSeconds: behaviour.timeChapterSeconds,
        timeBookSeconds: behaviour.timeBookSeconds,
        screenIndex: behaviour.screenIndex,
        screenCount: behaviour.screenCount,
        readingMode: settings.reading_mode,
    };

    const overlayHandlers = {
        onClose: pop,
        onNavigateBack: () => navigate(-1),
        onNavigateForward: () => navigate(1),
        onGoHome: () => navigate(AppRoutes.novelDetail.path(mangaId)),
        onPrevChapter: () => goToChapter(prevChapter?.sourceOrder),
        onNextChapter: () => goToChapter(nextChapter?.sourceOrder),
        onToggleSearch: () => {
            setIsSearchOpen((prev) => !prev);
            chrome.reveal();
        },
        onGoto: () => push({ kind: 'goto' }),
        onToggleToc: () => setIsTocOpen((prev) => !prev),
        onToggleBookmarks: () => setIsTocOpen(true),
        onToggleBookmark: handleToggleBookmark,
        onGotoChapterByFraction: gotoChapterByFraction,
        onGoToBookStart: () => goToChapter(sortedChapters[sortedChapters.length - 1]?.sourceOrder),
        onGoToBookEnd: () => goToChapter(sortedChapters[0]?.sourceOrder),
        onLookupWord: (word: string) => push({ kind: 'word_actions', word }),
        onFontSize: () => push({ kind: 'font_size' }),
        onPrefs: () => push({ kind: 'prefs' }),
        onToggleReadingMode: () =>
            updateNovelReaderSettings({
                reading_mode: settings.reading_mode === 'paged' ? 'continuous' : 'paged',
            }),
    };

    const maxWidth = settings.max_text_width > 0 ? settings.max_text_width : undefined;

    const contentInnerSx = {
        mx: 'auto' as const,
        maxWidth,
        pl: `${settings.margin_left}px`,
        pr: `${settings.margin_right}px`,
        pt: `${settings.margin_top}px`,
        pb: `${settings.margin_bottom}px`,
        fontSize: `${settings.base_font_size}px`,
        lineHeight: settings.line_height,
        // Prevent wide/nowrap content in scraped chapter HTML from growing the
        // scroll width and leaking into a horizontal scrollbar — content must
        // only ever flow vertically in both reading modes.
        overflowWrap: 'break-word' as const,
        wordBreak: 'break-word' as const,
        '& p': { mb: `${settings.paragraph_spacing}px` },
        '& img': { maxWidth: '100%', height: 'auto' },
        '& a': { color: colors.link ?? colors.foreground },
        '& br': { display: 'block', content: '""', mt: 0, mb: 1 },
    } as const;

    // Paged mode renders the single current chapter as a normal vertically
    // flowing column (no CSS multi-column) — identical inner styling to
    // continuous mode's per-section Box, just without the sliding feed.
    const renderPagedContent = () => (
        <Box sx={contentInnerSx}>
            {htmlLoading && <LoadingPlaceholder />}
            {htmlError && (
                <EmptyViewAbsoluteCentered message={t`Unable to load chapter text`} messageExtra={htmlError.message} />
            )}
            {html && (
                // eslint-disable-next-line react/no-danger -- sanitized with DOMPurify in useNovelChapterText
                <div dangerouslySetInnerHTML={{ __html: html }} />
            )}
        </Box>
    );

    // Continuous mode: every loaded chapter gets its own section, stacked
    // top-to-bottom in reading order, so scrolling flows straight from one
    // chapter's text into the next.
    const renderContinuousContent = () => (
        <>
            {feed.sections.map((section) => (
                <Box key={section.chapter.id} ref={setSectionRef(section.index)} sx={contentInnerSx}>
                    {section.loading && <LoadingPlaceholder />}
                    {section.error && (
                        <EmptyViewAbsoluteCentered
                            message={t`Unable to load chapter text`}
                            messageExtra={section.error.message}
                        />
                    )}
                    {section.html && (
                        // eslint-disable-next-line react/no-danger -- sanitized with DOMPurify in useContinuousChapterFeed
                        <div dangerouslySetInnerHTML={{ __html: section.html }} />
                    )}
                </Box>
            ))}
        </>
    );

    return (
        <Box
            onContextMenu={(e) => {
                // Right-click anywhere in the reader reveals the chrome ("show controls"),
                // matching calibre's `Overlay.oncontextmenu` → `handle_escape`/`show_chrome`.
                e.preventDefault();
                pushMain();
            }}
            sx={{
                position: 'fixed',
                inset: 0,
                bgcolor: colors.background,
                color: colors.foreground,
                userSelect: 'none',
            }}
        >
            {settings.user_stylesheet && (
                // eslint-disable-next-line react/no-danger -- user-supplied stylesheet, scoped to the reader
                <style dangerouslySetInnerHTML={{ __html: settings.user_stylesheet }} />
            )}

            <NovelReaderChrome
                settings={settings}
                ctx={chromeCtx}
                color={colors.foreground}
                onChromeControlClick={pushMain}
                forceShowControl={!chrome.visible}
                visible={chrome.visible}
            />
            <Box
                ref={contentRef}
                onClick={(e) => {
                    if (e.target === e.currentTarget && panelStack.length === 0) {
                        pushMain();
                    }
                }}
                sx={{
                    position: 'absolute',
                    inset: 0,
                    overflowY: 'auto',
                    overflowX: 'hidden',
                    overscrollBehavior: 'none',
                    scrollbarGutter: 'stable',
                    color: colors.foreground,
                    userSelect: 'text',
                    fontFamily: fontFamilyCss,
                }}
            >
                {isPaged ? renderPagedContent() : renderContinuousContent()}
            </Box>

            {isPaged && !htmlLoading && html && (
                <>
                    <Box
                        onClick={() => {
                            const el = contentRef.current;
                            if (el) {
                                el.scrollBy({ top: -Math.round(el.clientHeight * 0.9), behavior: 'smooth' });
                            }
                        }}
                        sx={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: '25%',
                            cursor: 'pointer',
                            zIndex: 5,
                        }}
                    />
                    <Box
                        onClick={() => {
                            const el = contentRef.current;
                            if (el) {
                                el.scrollBy({ top: Math.round(el.clientHeight * 0.9), behavior: 'smooth' });
                            }
                        }}
                        sx={{
                            position: 'absolute',
                            right: 0,
                            top: 0,
                            bottom: 0,
                            width: '25%',
                            cursor: 'pointer',
                            zIndex: 5,
                        }}
                    />
                </>
            )}

            {settings.show_selection_bar && (
                <NovelReaderSelectionBar
                    contentRef={contentRef}
                    onLookup={(word) => push({ kind: 'word_actions', word })}
                    onSearch={(q) => {
                        setSearchQuery(q);
                        setIsSearchOpen(true);
                        chrome.reveal();
                    }}
                />
            )}

            {topPanel && (
                <NovelReaderOverlay
                    panel={topPanel}
                    settings={settings}
                    title={manga.title}
                    chapterName={currentChapter.name}
                    chapterIndex={currentIndex + 1}
                    chapterCount={sortedChapters.length}
                    hasPrevChapter={hasPrevChapter}
                    hasNextChapter={hasNextChapter}
                    isBookmarked={currentChapter.isBookmarked}
                    footerCtx={chromeCtx}
                    handlers={overlayHandlers}
                />
            )}

            <NovelReaderSearch
                open={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                query={searchQuery}
                onQueryChange={setSearchQuery}
                supported={search.supported}
                matchCount={search.matchCount}
                currentIndex={search.currentIndex}
                goToNext={search.goToNext}
                goToPrevious={search.goToPrevious}
            />

            <NovelReaderToc
                open={isTocOpen}
                onClose={() => setIsTocOpen(false)}
                chapters={sortedChapters}
                currentChapterId={currentChapter.id}
                onSelectChapter={goToChapter}
            />
        </Box>
    );
};
