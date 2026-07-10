/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { NovelReaderOverlay } from '@/features/novel/reader/components/NovelReaderOverlay.tsx';
import { NovelReaderToc } from '@/features/novel/reader/components/NovelReaderToc.tsx';
import { NovelReaderSearch } from '@/features/novel/reader/components/NovelReaderSearch.tsx';
import { NovelReaderChrome } from '@/features/novel/reader/components/NovelReaderChrome.tsx';
import { NovelReaderSelectionBar } from '@/features/novel/reader/components/NovelReaderSelectionBar.tsx';
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

/**
 * Full-screen novel text reader — a fuller port of calibre's content-server
 * reader.
 *
 * The runtime differs from calibre's: Miruyomi serves single-chapter
 * sanitized HTML via REST (no EPUB spine, no iframe message bus), so CFI
 * anchoring / highlight annotations are out of scope. Two layout modes are
 * supported:
 *
 *   - `continuous` (default): vertical scroll, auto-advances to the next
 *     chapter when scrolling past the bottom.
 *   - `paged`: CSS multi-column layout that splits the text into
 *     viewport-sized pages navigated via tap zones, mouse wheel, and arrow
 *     keys. At the last page, advancing moves to the next chapter.
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
    const hasPrevChapter = currentIndex > 0;
    const hasNextChapter = currentIndex >= 0 && currentIndex < sortedChapters.length - 1;
    const prevChapter = hasPrevChapter ? sortedChapters[currentIndex - 1] : undefined;
    const nextChapter = hasNextChapter ? sortedChapters[currentIndex + 1] : undefined;

    const settings = useNovelReaderSettings();
    const colors = resolveColorScheme(settings.current_color_scheme, settings.user_color_schemes);
    const isPaged = settings.reading_mode === 'paged';

    const { html, loading: htmlLoading, error: htmlError } = useNovelChapterText(currentChapter?.id);

    // ── Refs + chrome auto-hide (declared above callbacks that depend on them) ──
    const contentRef = useRef<HTMLDivElement>(null);
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
        // Toggle off the main overlay when already the top panel — calibre's `show_chrome` semantics.
        setPanelStack((prev) => {
            const top = prev[prev.length - 1];
            if (top && top.kind === 'main') {
                return prev.slice(0, -1);
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
    const paged = usePagedReader(
        contentRef,
        currentChapter?.id ?? 0,
        settings.restore_scroll_position,
        () => goToChapter(nextChapter?.sourceOrder),
        () => goToChapter(prevChapter?.sourceOrder),
        hasNextChapter,
        hasPrevChapter,
    );

    const gotoChapterByFraction = useCallback(
        (frac: number) => {
            const el = contentRef.current;
            if (!el) {
                return;
            }
            if (isPaged) {
                const page = Math.round(frac * (paged.pageCount - 1));
                paged.goToPage(page);
            } else {
                const target = (el.scrollHeight - el.clientHeight) * Math.min(1, Math.max(0, frac));
                el.scrollTo({ top: target, behavior: 'smooth' });
            }
            closeAll();
        },
        [closeAll, isPaged, paged],
    );

    // Apply horizontal scroll for paged mode.
    useEffect(() => {
        if (!isPaged) {
            return;
        }
        const el = contentRef.current;
        if (!el) {
            return;
        }
        el.scrollTo({ left: paged.pageIndex * el.clientWidth, top: 0 });
    }, [isPaged, paged.pageIndex]);

    // ── Continuous mode auto-advance ──────────────────────────────────────
    // When scrolled to the very bottom, auto-advance to the next chapter.
    useEffect(() => {
        if (isPaged) {
            return undefined;
        }
        const el = contentRef.current;
        if (!el) {
            return undefined;
        }
        let advancing = false;
        const onScroll = () => {
            if (advancing) {
                return;
            }
            const maxScroll = el.scrollHeight - el.clientHeight;
            if (maxScroll <= 0) {
                return;
            }
            if (el.scrollTop >= maxScroll - 2 && hasNextChapter) {
                advancing = true;
                goToChapter(nextChapter?.sourceOrder);
            }
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, [isPaged, contentRef, hasNextChapter, nextChapter?.sourceOrder, goToChapter]);

    // ── Paged mode: keyboard + wheel navigation ───────────────────────────
    useEffect(() => {
        if (!isPaged) {
            return undefined;
        }
        const el = contentRef.current;
        if (!el) {
            return undefined;
        }
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            if (e.deltaY > 0 || e.deltaX > 0) {
                paged.nextPage();
            } else if (e.deltaY < 0 || e.deltaX < 0) {
                paged.prevPage();
            }
        };
        const onKey = (e: KeyboardEvent) => {
            // Don't hijack when a panel/overlay or search is open.
            if (panelStack.length > 0 || isSearchOpen || isTocOpen) {
                return;
            }
            switch (e.key) {
                case 'ArrowRight':
                case 'ArrowDown':
                case 'PageDown':
                case ' ':
                    e.preventDefault();
                    paged.nextPage();
                    break;
                case 'ArrowLeft':
                case 'ArrowUp':
                case 'PageUp':
                    e.preventDefault();
                    paged.prevPage();
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
    }, [isPaged, contentRef, paged, panelStack.length, isSearchOpen, isTocOpen]);

    // ── 3a: reset scroll to top on chapter change (continuous mode) ────────
    useEffect(() => {
        if (isPaged) {
            return;
        }
        const el = contentRef.current;
        if (!el) {
            return;
        }
        el.scrollTop = 0;
    }, [isPaged, currentChapter?.id]);

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

    const chapterProgress = isPaged ? paged.frac : behaviour.chapterProgress;
    const bookProgress = isPaged
        ? Math.min(1, (currentIndex + paged.frac) / Math.max(1, sortedChapters.length))
        : behaviour.bookProgress;

    const chromeCtx: HeadFootRenderCtx = {
        mangaTitle: manga.title,
        chapterName: currentChapter.name,
        chapterProgress,
        bookProgress,
        chapterIndex: currentIndex + 1,
        chapterCount: sortedChapters.length,
        timeChapterSeconds: behaviour.timeChapterSeconds,
        timeBookSeconds: behaviour.timeBookSeconds,
        screenIndex: isPaged ? paged.pageIndex : behaviour.screenIndex,
        screenCount: isPaged ? paged.pageCount : behaviour.screenCount,
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
        '& p': { mb: `${settings.paragraph_spacing}px` },
        '& img': { maxWidth: '100%', height: 'auto' },
        '& a': { color: colors.link ?? colors.foreground },
        '& br': { display: 'block', content: '""', mt: 0, mb: 1 },
    } as const;

    const renderChapterContent = () => (
        <Box
            sx={
                isPaged
                    ? {
                          ...contentInnerSx,
                          columnWidth: '100vw',
                          columnGap: '0px',
                          height: '100%',
                          mx: 0,
                          maxWidth: 'none',
                      }
                    : contentInnerSx
            }
        >
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
                    overflowY: isPaged ? 'hidden' : 'auto',
                    overflowX: isPaged ? 'hidden' : 'hidden',
                    scrollbarGutter: 'stable',
                    color: colors.foreground,
                    userSelect: 'text',
                    fontFamily: fontFamilyCss,
                }}
            >
                {renderChapterContent()}
            </Box>

            {isPaged && !htmlLoading && html && (
                <>
                    <Box
                        onClick={() => paged.prevPage()}
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
                        onClick={() => paged.nextPage()}
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
