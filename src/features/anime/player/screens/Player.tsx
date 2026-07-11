/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import { useLingui } from '@lingui/react/macro';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { GET_MANGA_READER } from '@/lib/graphql/manga/MangaQuery.ts';
import { GET_CHAPTERS_READER } from '@/lib/graphql/chapter/ChapterQuery.ts';
import type { GetMangaReaderQuery, GetChaptersReaderQuery } from '@/lib/graphql/generated/graphql.ts';
import { useVideoPlayer } from '@/features/anime/player/components/VideoPlayer.tsx';
import { PlayerOverlay } from '@/features/anime/player/components/PlayerOverlay.tsx';
import { useEpisodeVideos } from '@/features/anime/player/hooks/useEpisodeVideos.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { useNavBarContext } from '@/features/navigation-bar/NavbarContext.tsx';

const PLAYER_QUALITY_LS_KEY = 'miruyomi.animePlayer.defaultQuality';

/**
 * Full-screen anime video player. Mirrors the manga reader: it is mounted
 * outside MainApp (via PlayerApp) so it can go truly fullscreen with no sidebar.
 *
 * Loads the manga + its chapters via the same GraphQL queries the reader uses
 * (anime titles are manga rows), resolves the current episode by
 * \`chapterSourceOrder\`, then fetches its \`Video[]\` list via the aniyomi REST
 * endpoint and plays the proxied stream with shaka-player.
 *
 * Quality selection picks a \`Video[]\` index; the choice is persisted to
 * localStorage as the default for future episodes. The stream URL is
 * \`/api/v1/aniyomi/episode/:chapterId?index=N\` (server proxies with upstream
 * headers + Range).
 */
export const Player = () => {
    const { t } = useLingui();
    const navigate = useNavigate();
    const { setOverride } = useNavBarContext();
    const { mangaId: paramMangaId, chapterSourceOrder: paramChapterSourceOrder } = useParams<{
        mangaId: string;
        chapterSourceOrder: string;
    }>();

    const mangaId = Number(paramMangaId);
    const chapterSourceOrder = Number(paramChapterSourceOrder);

    const mangaResponse = requestManager.useGetManga<GetMangaReaderQuery>(GET_MANGA_READER, mangaId);
    const chaptersResponse = requestManager.useGetMangaChapters<GetChaptersReaderQuery>(GET_CHAPTERS_READER, mangaId);

    const manga = mangaResponse.data?.manga;
    const chapters = chaptersResponse.data?.chapters.nodes ?? [];
    const sortedChapters = useMemo(() => [...chapters].sort((a, b) => b.sourceOrder - a.sourceOrder), [chapters]);
    const currentIndex = sortedChapters.findIndex((c) => c.sourceOrder === chapterSourceOrder);
    const currentChapter = currentIndex >= 0 ? sortedChapters[currentIndex] : undefined;
    const hasPrevEpisode = currentIndex > 0;
    const hasNextEpisode = currentIndex >= 0 && currentIndex < sortedChapters.length - 1;
    const prevEpisode = hasPrevEpisode ? sortedChapters[currentIndex - 1] : undefined;
    const nextEpisode = hasNextEpisode ? sortedChapters[currentIndex + 1] : undefined;

    const { videos, loading: videosLoading, error: videosError } = useEpisodeVideos(currentChapter?.id);

    const [qualityIndex, setQualityIndex] = useState<number>(() => {
        const stored = Number(localStorage.getItem(PLAYER_QUALITY_LS_KEY));
        return Number.isFinite(stored) && stored >= 0 ? stored : 0;
    });

    useEffect(() => {
        // Reset to 0 if the new episode has fewer renditions.
        if (videos.length && qualityIndex >= videos.length) {
            setQualityIndex(0);
        }
    }, [videos.length, qualityIndex]);

    const handleQualityChange = useCallback((index: number) => {
        setQualityIndex(index);
        localStorage.setItem(PLAYER_QUALITY_LS_KEY, String(index));
    }, []);

    const goToEpisode = useCallback(
        (order: number | undefined) => {
            if (order == null) {
                return;
            }
            navigate(AppRoutes.player.path(mangaId, order));
        },
        [mangaId, navigate],
    );

    useLayoutEffect(() => {
        setOverride({ status: true, value: <Box sx={{ position: 'absolute' }} /> });
        return () => setOverride({ status: false, value: null });
    }, [setOverride]);

    const safeQualityIndex = videos.length ? Math.min(qualityIndex, videos.length - 1) : 0;
    const controller = useVideoPlayer({
        chapterId: currentChapter?.id,
        videos,
        onQualityChange: handleQualityChange,
        qualityIndex: safeQualityIndex,
    });

    if (mangaResponse.loading || chaptersResponse.loading) {
        return <LoadingPlaceholder />;
    }

    if (!manga || !currentChapter) {
        return <EmptyViewAbsoluteCentered message={t`Episode not found`} />;
    }

    if (videosLoading) {
        return <LoadingPlaceholder />;
    }

    if (videosError || !videos.length) {
        return <EmptyViewAbsoluteCentered message={t`Unable to load video`} messageExtra={videosError?.message} />;
    }

    const currentVideo = videos[safeQualityIndex];
    const qualityLabel = currentVideo?.resolution ?? currentVideo?.videoTitle ?? undefined;

    return (
        <Box
            ref={controller.containerRef}
            sx={{
                position: 'fixed',
                inset: 0,
                bgcolor: 'black',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            <video ref={controller.videoRef} style={{ width: '100%', height: '100%', objectFit: 'contain' }} autoPlay>
                <track kind="captions" />
            </video>
            {controller.errorMessage && (
                <EmptyViewAbsoluteCentered message={t`Playback error`} messageExtra={controller.errorMessage} />
            )}
            {!controller.errorMessage && (
                <PlayerOverlay
                    controller={controller}
                    title={manga.title}
                    episodeName={currentChapter.name}
                    qualityLabel={qualityLabel}
                    onPrevEpisode={() => goToEpisode(prevEpisode?.sourceOrder)}
                    onNextEpisode={() => goToEpisode(nextEpisode?.sourceOrder)}
                    hasPrevEpisode={hasPrevEpisode}
                    hasNextEpisode={hasNextEpisode}
                />
            )}
        </Box>
    );
};
