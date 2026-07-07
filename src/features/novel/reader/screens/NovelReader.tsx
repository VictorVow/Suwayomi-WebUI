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
import { NOVEL_READER_THEME_COLORS, NovelReaderPreferences } from '@/features/novel/reader/preferences.ts';
import type { NovelReaderTheme } from '@/features/novel/reader/preferences.ts';

/**
 * Full-screen novel text reader. Mirrors the anime `Player`: it is mounted
 * outside `MainApp` (via `NovelReaderApp`) so it can go truly fullscreen with
 * no sidebar, and it deliberately does not reuse the image-pager manga
 * `Reader`'s Zustand state machine — that machinery (tap zones, RGBA filters,
 * paged auto-scroll) is meaningless for continuous prose text.
 *
 * Loads the manga + its chapters via the same GraphQL queries the reader/
 * player use (novels are manga rows), resolves the current chapter by
 * `chapterSourceOrder`, then fetches its sanitized body HTML via the lnreader
 * REST endpoint (`useNovelChapterText`) and renders it directly.
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

    const { html, loading: htmlLoading, error: htmlError } = useNovelChapterText(currentChapter?.id);

    const [isVisible, setIsVisible] = useState(true);
    const [isTocOpen, setIsTocOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [fontSize, setFontSize] = useState(NovelReaderPreferences.getFontSize);
    const [theme, setTheme] = useState(NovelReaderPreferences.getTheme);
    const contentRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!currentChapter || currentChapter.isRead) {
            return;
        }
        requestManager.updateChapter(currentChapter.id, { isRead: true, lastPageRead: 1 });
        // Only fire once per chapter visit; refetching would re-trigger on every chapters cache update.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentChapter?.id]);

    const goToChapter = useCallback(
        (order: number | undefined) => {
            if (order == null) {
                return;
            }
            setIsSearchOpen(false);
            navigate(AppRoutes.novelReader.path(mangaId, order));
        },
        [mangaId, navigate],
    );

    const handleFontSizeStep = (direction: 1 | -1) => {
        setFontSize(NovelReaderPreferences.stepFontSize(fontSize, direction));
    };

    const handleThemeChange = (nextTheme: NovelReaderTheme) => {
        NovelReaderPreferences.setTheme(nextTheme);
        setTheme(nextTheme);
    };

    const handleToggleBookmark = () => {
        if (!currentChapter) {
            return;
        }
        requestManager.updateChapter(currentChapter.id, { isBookmarked: !currentChapter.isBookmarked });
    };

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

    const themeColors = NOVEL_READER_THEME_COLORS[theme];

    return (
        <Box sx={{ position: 'fixed', inset: 0, bgcolor: themeColors.background, color: themeColors.color }}>
            <Box
                ref={contentRef}
                onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setIsVisible((prev) => !prev);
                    }
                }}
                sx={{
                    height: '100%',
                    overflowY: 'auto',
                    px: { xs: 2, sm: 8, md: 16 },
                    py: 8,
                    fontSize: `${fontSize}px`,
                    lineHeight: 1.7,
                    maxWidth: 900,
                    marginX: 'auto',
                    '& p': { mb: 2 },
                    '& img': { maxWidth: '100%' },
                }}
            >
                {htmlLoading && <LoadingPlaceholder />}
                {htmlError && (
                    <EmptyViewAbsoluteCentered
                        message={t`Unable to load chapter text`}
                        messageExtra={htmlError.message}
                    />
                )}
                {html && (
                    // eslint-disable-next-line react/no-danger -- sanitized with DOMPurify in useNovelChapterText
                    <div dangerouslySetInnerHTML={{ __html: html }} />
                )}
            </Box>

            <NovelReaderOverlay
                isVisible={isVisible}
                title={manga.title}
                chapterName={currentChapter.name}
                onClose={() => navigate(AppRoutes.manga.path(mangaId))}
                hasPrevChapter={hasPrevChapter}
                hasNextChapter={hasNextChapter}
                onPrevChapter={() => goToChapter(prevChapter?.sourceOrder)}
                onNextChapter={() => goToChapter(nextChapter?.sourceOrder)}
                onOpenToc={() => setIsTocOpen(true)}
                isSearchOpen={isSearchOpen}
                onToggleSearch={() => setIsSearchOpen((prev) => !prev)}
                isBookmarked={currentChapter.isBookmarked}
                onToggleBookmark={handleToggleBookmark}
                fontSize={fontSize}
                onFontSizeStep={handleFontSizeStep}
                theme={theme}
                onThemeChange={handleThemeChange}
            />

            <NovelReaderToc
                open={isTocOpen}
                onClose={() => setIsTocOpen(false)}
                chapters={sortedChapters}
                currentChapterId={currentChapter.id}
                onSelectChapter={goToChapter}
            />

            <NovelReaderSearch open={isSearchOpen} onClose={() => setIsSearchOpen(false)} contentRef={contentRef} />
        </Box>
    );
};
