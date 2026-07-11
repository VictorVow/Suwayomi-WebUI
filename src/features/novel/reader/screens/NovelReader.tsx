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
import { useBackButton } from '@/base/hooks/useBackButton.ts';
import { useNavBarContext } from '@/features/navigation-bar/NavbarContext.tsx';
import { MediaQuery } from '@/base/utils/MediaQuery.tsx';
import {
    getScrollPosition,
    resolveColorScheme,
    updateNovelReaderSettings,
    useNovelReaderSettings,
} from '@/features/novel/reader/preferences.ts';
import type { ReaderPanel } from '@/features/novel/reader/readerPanel.ts';
import { useChapterTextSearch } from '@/features/novel/reader/hooks/useChapterTextSearch.ts';
import { useReaderBehaviour } from '@/features/novel/reader/hooks/useReaderBehaviour.ts';
import { useReaderKeyboard } from '@/features/novel/reader/hooks/useReaderKeyboard.ts';
import { useChromeAutohide } from '@/features/novel/reader/hooks/useChromeAutohide.ts';
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
    const handleBack = useBackButton();
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

    const { setOverride } = useNavBarContext();
    const isMobileWidth = MediaQuery.useIsMobileWidth();
    useLayoutEffect(() => {
        setOverride({ status: true, value: null });
        return () => setOverride({ status: false, value: null });
    }, [setOverride]);
    // sortedChapters is sorted by descending sourceOrder (index 0 = latest chapter),
    // so moving to the next chapter (higher sourceOrder) means a lower array index.
    const hasNextChapter = currentIndex > 0;
    const hasPrevChapter = currentIndex >= 0 && currentIndex < sortedChapters.length - 1;
    const nextChapter = hasNextChapter ? sortedChapters[currentIndex - 1] : undefined;
    const prevChapter = hasPrevChapter ? sortedChapters[currentIndex + 1] : undefined;

    const settings = useNovelReaderSettings();
    const colors = resolveColorScheme(settings.current_color_scheme, settings.user_color_schemes);
    const isPaged = settings.reading_mode === 'paged';
    const scrollAdvanceNotches = settings.paged_scroll_advance_notches;
    const scrollNotchDeltaY = settings.paged_scroll_notch_delta_y;

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
    // inertial wheel events before the new chapter's HTML has loaded. Held
    // until the target chapter's html is ready (or its fetch errored) —
    // releasing earlier leaves the pane at spinner height, where `atBottom`
    // is trivially true and a slow fetch (>350 ms quiet gap) re-arms
    // `advanceUsedRef` so the next inertial tick advances again (skipping a
    // chapter). See the release effect below the wheel block.
    const pagedAdvancingRef = useRef(false);
    // Tracks whether a chapter advance has already fired in the current scroll
    // gesture. Reset only when a quiet gap separates wheel events, so a single
    // inertial flick can cross at most one chapter boundary — the reader must
    // start a new scroll before another advance is possible.
    const advanceUsedRef = useRef(false);
    const lastWheelTsRef = useRef(0);
    // Accumulated `e.deltaY` within the current scroll gesture. Reset on the
    // same gesture-gap that re-arms `advanceUsedRef`. The chapter advance only
    // fires once |accumulated| crosses the configured notch threshold, so a
    // feather-touch or single trackpad tick at the boundary is ignored while a
    // deliberate multi-notch scroll advances.
    const wheelAccumRef = useRef(0);
    // Continuous mode: prevent a single inertial scroll gesture from cascading
    // multiple loadPrev/loadNext calls (each extends the window by one
    // chapter). Same gesture-gap pattern as the paged advance guard above.
    const feedLoadUsedRef = useRef(false);
    const lastScrollTsRef = useRef(0);
    // Single owner of `scrollTop` writes on chapter change. Producers set
    // an intent; the controller below applies it once the target chapter's
    // height has loaded, then clears the ref. This replaces the two
    // competing writers (the old `useReaderBehaviour` restore effect and
    // the old `NovelReader` reset effect) that clobbered each other against
    // a stale `scrollHeight`.
    //   - `'top'` → target `0` (every explicit in-reader chapter switch).
    //   - `'bottom'` → target `scrollHeight - clientHeight` (wheel-up at a
    //     chapter's top advances to the previous chapter and lands at its
    //     bottom, so the reader keeps scrolling backwards through it).
    //   - `'restore'` → target `getScrollPosition(chapterId)` (initial entry
    //     into the reader when `restore_scroll_position` is on).
    //   - `null` → leave scroll alone (silent continuous hand-off).
    const pendingScrollRef = useRef<{ kind: 'top' | 'restore' | 'bottom' } | null>(null);
    // Remembers where a paged chapter switch should land: `'bottom'` when the
    // reader wheeled up past the current chapter's top (scrolling backwards),
    // `'top'` for every other navigation. Read and reset by the producer effect
    // on `currentChapter.id` change; defaults to `'top'`.
    const pagedLandingRef = useRef<'top' | 'bottom'>('top');
    // Flipped false after the first chapter has settled, so only the very
    // first entry restores (when the pref is on); every later explicit
    // switch lands at the top.
    const initialEntryRef = useRef(true);
    // Tracks the index of a section freshly prepended by `loadPrev` so the
    // compensation observer below can hold the reading position stable as
    // that section grows (placeholder → sanitized HTML). Cleared once the
    // section's height has stabilized.
    const prependAnchorRef = useRef<number | null>(null);
    // Captures `el.scrollHeight` right before a prepend commits, so the
    // compensation effect can immediately offset the initial placeholder
    // height (and later the placeholder→HTML growth) against this baseline.
    const prependBaselineRef = useRef(0);
    // Bumped each time a prepend actually happens, so the compensation
    // layout effect re-runs only on a real prepend — not on every render
    // (the `feed.sections` array identity changes each render even when
    // nothing changed).
    const [prependTrigger, setPrependTrigger] = useState(0);
    // "Latest value" ref for feed.sections so the ResizeObserver callback
    // can read the current loading state without re-running the effect.
    const feedSectionsRef = useRef(feed.sections);
    feedSectionsRef.current = feed.sections;
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
    // On mobile-sized screens the TOC is not auto-opened with the main overlay:
    // the persistent drawer would cover too much of the small viewport. It can
    // still be toggled manually via the "Contents" button or the keyboard hotkey.
    const mainOverlayOpen = topPanel?.kind === 'main';
    useEffect(() => {
        if (mainOverlayOpen) {
            setIsTocOpen(!isMobileWidth);
        } else {
            setIsTocOpen(false);
        }
    }, [mainOverlayOpen, isMobileWidth]);

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
    // Paged mode renders one chapter as a normal vertically-scrolling column
    // with wheel-at-boundary chapter changes handled in the effect below.
    // (The former CSS multi-column paged hook `usePagedReader` and its
    // `miruyomi.novelReader.pagePositions.v2` localStorage key have been
    // removed — see the single scroll controller below for scroll-position
    // ownership.)

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
                    // Capture scrollHeight before the prepend commits so the
                    // compensation effect can offset the initial placeholder
                    // height against this baseline.
                    prependBaselineRef.current = el.scrollHeight;
                    const newStart = feed.loadPrev();
                    if (newStart != null) {
                        prependAnchorRef.current = newStart;
                        setPrependTrigger((n) => n + 1);
                    }
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
    // grows content above the viewport — compensate `scrollTop` by the same
    // delta so the reader's current view doesn't jump. Two deltas must be
    // compensated:
    //   1. The initial placeholder height (inserted synchronously when
    //      `loadPrev` commits the new range).
    //   2. The placeholder→HTML growth (when the fetch resolves and the
    //      sanitized HTML replaces the spinner, potentially growing from
    //      ~50px to thousands of px).
    // The effect runs only when `prependTrigger` bumps (a real prepend),
    // not on every render — `feed.sections` is a fresh array each render
    // but its identity is not meaningful. A `ResizeObserver` on the
    // prepended section node catches growth deltas; loading state is read
    // from `feedSectionsRef` (the latest render's value) inside the
    // callback so the observer survives the loading→loaded transition
    // without the effect re-running and tearing it down mid-growth.
    useLayoutEffect(() => {
        if (isPaged) {
            return undefined;
        }
        const prependIndex = prependAnchorRef.current;
        if (prependIndex == null) {
            return undefined;
        }
        const el = contentRef.current;
        if (!el) {
            return undefined;
        }
        const node = sectionRefs.current.get(prependIndex);
        if (!node) {
            return undefined;
        }
        // 1. Immediately offset the initial placeholder height against the
        //    baseline captured before `loadPrev` committed, so the user's
        //    view stays put before the browser paints.
        const initialDelta = el.scrollHeight - prependBaselineRef.current;
        if (initialDelta !== 0) {
            el.scrollTop += initialDelta;
        }
        // 2. Watch the prepended section for further growth (placeholder →
        //    HTML) and compensate each delta to hold the view stable.
        let prevHeight = node.offsetHeight;
        const ro = new ResizeObserver(() => {
            const newHeight = node.offsetHeight;
            const delta = newHeight - prevHeight;
            if (delta !== 0) {
                el.scrollTop += delta;
                prevHeight = newHeight;
            }
            // Once the section has finished loading and a final resize has
            // settled, tear down so subsequent unrelated resizes (e.g.
            // font-size change) don't shift the reader.
            const current = feedSectionsRef.current.find((s) => s.index === prependIndex);
            if (current && !current.loading) {
                prependAnchorRef.current = null;
                ro.disconnect();
            }
        });
        ro.observe(node);
        return () => ro.disconnect();
        // Re-run only on a real prepend, not on every `feed.sections` change.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPaged, prependTrigger]);

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
            // new scroll gesture — re-arm the one-advance-per-gesture gate and
            // reset the deltaY accumulator.
            if (now - lastWheelTsRef.current > SCROLL_GESTURE_GAP_MS) {
                advanceUsedRef.current = false;
                wheelAccumRef.current = 0;
            }
            lastWheelTsRef.current = now;
            if (pagedAdvancingRef.current || (!html && !htmlError)) {
                e.preventDefault();
                return;
            }
            const atTop = el.scrollTop <= 0;
            const atBottom = el.scrollTop >= el.scrollHeight - el.clientHeight - 1;
            // Only accumulate scroll intent while parked at a boundary; normal
            // in-chapter scrolling is left to the browser and does not count.
            const atBoundary = (atTop && e.deltaY < 0) || (atBottom && e.deltaY > 0);
            if (atBoundary) {
                wheelAccumRef.current += e.deltaY;
            } else {
                wheelAccumRef.current = 0;
            }
            const advanceThreshold = scrollAdvanceNotches * scrollNotchDeltaY;
            if (
                e.deltaY < 0 &&
                atTop &&
                hasPrevChapter &&
                !advanceUsedRef.current &&
                Math.abs(wheelAccumRef.current) >= advanceThreshold
            ) {
                e.preventDefault();
                advanceUsedRef.current = true;
                wheelAccumRef.current = 0;
                pagedAdvancingRef.current = true;
                pagedLandingRef.current = 'bottom';
                goToChapter(prevChapter?.sourceOrder);
            } else if (
                e.deltaY > 0 &&
                atBottom &&
                hasNextChapter &&
                !advanceUsedRef.current &&
                wheelAccumRef.current >= advanceThreshold
            ) {
                e.preventDefault();
                advanceUsedRef.current = true;
                wheelAccumRef.current = 0;
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
        html,
        htmlError,
        scrollAdvanceNotches,
        scrollNotchDeltaY,
    ]);

    // ── Single scroll controller (the only `scrollTop` writer on chapter change) ──
    // Producers set an intent in `pendingScrollRef`; this controller applies it
    // once the target chapter's content height exists (so the target position
    // lands against the real `scrollHeight`, not a stale one), and re-applies
    // on each `ResizeObserver` fire until settled, then clears the ref. This
    // folds in and replaces the old reset effect (which wrote `scrollTop = 0`
    // against a not-yet-loaded height) and the old `useReaderBehaviour` restore
    // effect (which was clobbered by the reset effect).
    //
    // Intent per chapter change:
    //   - Silent hand-off (`silentTransitionRef` true): no intent — leave
    //     scroll alone so continuous scrolling isn't interrupted.
    //   - First settled chapter of the session: `'restore'` when
    //     `restore_scroll_position` is on, else `'top'`.
    //   - Every later explicit switch: `'top'`.
    const chapterId = currentChapter?.id ?? 0;
    const htmlReady = isPaged ? !!html : feed.sections.some((s) => s.index === anchorIndex && !!s.html);
    useLayoutEffect(() => {
        const el = contentRef.current;
        if (!el || pendingScrollRef.current == null) {
            return undefined;
        }
        const apply = () => {
            const intent = pendingScrollRef.current;
            if (intent == null) {
                return;
            }
            if (intent.kind === 'top') {
                el.scrollTop = 0;
                pendingScrollRef.current = null;
                initialEntryRef.current = false;
            } else if (intent.kind === 'bottom') {
                // Land at the bottom of the previous chapter after a wheel-up
                // advance — only once the real chapter height exists, so this
                // targets the loaded content rather than a spinner pane. A
                // negative target (short chapter) clamps to 0, which is fine.
                if (htmlReady) {
                    el.scrollTop = el.scrollHeight - el.clientHeight;
                    pendingScrollRef.current = null;
                    initialEntryRef.current = false;
                }
            } else if (intent.kind === 'restore') {
                const saved = getScrollPosition(chapterId);
                if (el.scrollHeight - el.clientHeight >= saved) {
                    el.scrollTop = saved;
                    pendingScrollRef.current = null;
                    initialEntryRef.current = false;
                }
            }
        };
        apply();
        // Re-apply on each height change until the intent has settled — the
        // target HTML may still be streaming in.
        const ro = new ResizeObserver(() => apply());
        ro.observe(el);
        return () => ro.disconnect();
    }, [chapterId, htmlReady, isPaged, anchorIndex]);

    // Producer: on explicit (non-silent) `currentChapter.id` change, set the
    // scroll intent. Runs after the controller is declared so the ref is in
    // scope. (For silent hand-offs, set no intent — leave scroll alone.)
    useEffect(() => {
        if (silentTransitionRef.current) {
            pendingScrollRef.current = null;
            pagedLandingRef.current = 'top';
            return;
        }
        // A wheel-up advance set this to 'bottom' just before the route
        // change; it wins over the default 'top' / 'restore' intent so the
        // reader lands at the previous chapter's bottom (continuing the
        // backwards scroll). Reset to 'top' for every other navigation.
        if (isPaged && pagedLandingRef.current === 'bottom') {
            pendingScrollRef.current = { kind: 'bottom' };
            pagedLandingRef.current = 'top';
        } else if (initialEntryRef.current && settings.restore_scroll_position) {
            pendingScrollRef.current = { kind: 'restore' };
        } else {
            pendingScrollRef.current = { kind: 'top' };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentChapter?.id]);

    // Release the paged advance guard only once the new chapter's HTML has
    // loaded (or its fetch errored). Releasing at route commit — before the
    // HTML arrives — leaves the pane at spinner height, where `atBottom` is
    // trivially true and a slow fetch (>350 ms quiet gap) re-arms
    // `advanceUsedRef` so the next inertial wheel tick advances again,
    // skipping a chapter. As a passive effect this runs after the layout
    // controller has positioned scroll for the same `htmlReady` flip.
    useEffect(() => {
        if (isPaged && (htmlReady || !!htmlError)) {
            pagedAdvancingRef.current = false;
        }
    }, [isPaged, htmlReady, htmlError, currentChapter?.id]);

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

    // Both modes use vertical native scroll, so `behaviour` drives progress
    // and screen counters in either mode.
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
                onBack={handleBack}
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
