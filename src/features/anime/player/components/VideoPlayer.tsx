/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import shaka from 'shaka-player';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AniyomiVideo } from '@/features/anime/player/Player.types.ts';
import { AnimePlayerApi } from '@/features/anime/player/AnimePlayerApi.ts';

/**
 * A track as exposed by the player UI. Built from shaka's variant/audio/text
 * track lists so the React controls don't depend on shaka types directly.
 */
export interface PlayerTrack {
    id: string;
    label: string;
    /** shaka Track / AudioTrack / TextTrack — opaque to the UI. */
    raw: unknown;
}

export interface UseVideoPlayerParams {
    /** The chapter (episode) id, used to resolve the proxied stream URL. */
    chapterId: number | undefined;
    /** The available quality renditions (from useEpisodeVideos). */
    videos: AniyomiVideo[];
    /** Called when the user picks a quality rendition (by index). */
    onQualityChange: (index: number) => void;
    /** Currently-selected quality index. */
    qualityIndex: number;
}

/**
 * Mounts a shaka-player instance over a native \`<video>\` element and exposes
 * the track lists (quality / audio / subtitle) so the React overlay can render
 * custom MUI controls. The stream is fetched via the proxied aniyomi endpoint
 * (server injects upstream headers + forwards Range), so no cross-origin
 * handling is needed client-side.
 *
 * External subtitle tracks declared in the Aniyomi \`Video.subtitleTracks\` are
 * added via \`player.addTextTrackAsync\` after \`load()\` resolves; audio tracks
 * declared in \`Video.audioTracks\` are surfaced for selection when the stream
 * is HLS (shaka discovers multi-audio from the manifest automatically).
 */
export const useVideoPlayer = ({ chapterId, videos, onQualityChange, qualityIndex }: UseVideoPlayerParams) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<shaka.Player | null>(null);

    const [variantTracks, setVariantTracks] = useState<PlayerTrack[]>([]);
    const [audioTracks, setAudioTracks] = useState<PlayerTrack[]>([]);
    const [textTracks, setTextTracks] = useState<PlayerTrack[]>([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isBuffering, setIsBuffering] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [errorMessage, setErrorMessage] = useState<string | undefined>();

    const streamUrl = useMemo(
        () => (videos.length && chapterId != null ? AnimePlayerApi.getStreamUrl(chapterId, qualityIndex) : undefined),
        [chapterId, qualityIndex, videos.length],
    );

    const refreshTracks = useCallback((p: shaka.Player) => {
        try {
            setVariantTracks(
                p.getVariantTracks().map((t) => {
                    let label: string;
                    if (t.height) {
                        label = `${t.height}p`;
                    } else if (t.bandwidth) {
                        label = `${Math.round(t.bandwidth / 1000)}k`;
                    } else {
                        label = String(t.id);
                    }
                    return { id: String(t.id), label, raw: t };
                }),
            );
        } catch {
            /* not loaded yet */
        }
        try {
            setAudioTracks(
                p.getAudioTracks().map((t, i) => ({
                    id: `${t.language ?? i}-${i}`,
                    label: t.label || t.language || String(i),
                    raw: t,
                })),
            );
        } catch {
            /* not loaded yet */
        }
        try {
            setTextTracks(
                p.getTextTracks().map((t, i) => ({
                    id: `${t.language ?? i}-${i}`,
                    label: t.label || t.language || String(i),
                    raw: t,
                })),
            );
        } catch {
            /* not loaded yet */
        }
    }, []);

    // One-time polyfill install.
    useEffect(() => {
        shaka.polyfill.installAll();
    }, []);

    // Init shaka + load stream.
    useEffect(() => {
        const video = videoRef.current;
        if (!video || !streamUrl) {
            return;
        }

        let cancelled = false;
        let player: shaka.Player | null = null;

        const init = async () => {
            player = new shaka.Player();
            playerRef.current = player;
            await player.attach(video);

            player.addEventListener('error', (event) => {
                const { detail } = event as unknown as { detail?: { message?: string } };
                setErrorMessage(detail?.message ?? 'Playback error');
            });
            player.addEventListener('buffering', (event) => {
                setIsBuffering(Boolean((event as unknown as { buffering: boolean }).buffering));
            });
            player.addEventListener('trackschanged', () => {
                refreshTracks(player!);
            });
            player.addEventListener('audiotrackschanged', () => {
                refreshTracks(player!);
            });
            player.addEventListener('textchanged', () => {
                refreshTracks(player!);
            });
            player.addEventListener('adaptation', () => {
                refreshTracks(player!);
            });

            video.addEventListener('play', () => setIsPlaying(true));
            video.addEventListener('pause', () => setIsPlaying(false));
            video.addEventListener('timeupdate', () => setCurrentTime(video.currentTime));
            video.addEventListener('durationchange', () => setDuration(video.duration || 0));
            video.addEventListener('volumechange', () => {
                setVolume(video.volume);
                setIsMuted(video.muted);
            });
            video.addEventListener('ratechange', () => setPlaybackRate(video.playbackRate));

            try {
                await player.load(streamUrl);
                refreshTracks(player);
                // Add external subtitle tracks declared by the Aniyomi Video.
                // Added in parallel — best-effort; individual failures are ignored.
                const video_ = videos[qualityIndex];
                const subs = video_?.subtitleTracks ?? [];
                await Promise.all(
                    subs.map((sub) =>
                        player!
                            .addTextTrackAsync(sub.url, sub.lang, 'subtitles', 'text/vtt', undefined, sub.lang, false)
                            .catch(() => {}),
                    ),
                );
                refreshTracks(player);
            } catch (e) {
                if (!cancelled) {
                    setErrorMessage(e instanceof Error ? e.message : String(e));
                }
            }
        };

        void init();

        return () => {
            cancelled = true;
            const p = playerRef.current;
            playerRef.current = null;
            if (p) {
                void p.destroy().catch(() => {});
            }
        };
    }, [streamUrl, qualityIndex, videos, refreshTracks]);

    // Control handlers — drive the native <video> for play/pause/seek/volume;
    // shaka for track selection (native element can't do ABR variant/audio).
    const togglePlay = useCallback(() => {
        const v = videoRef.current;
        if (!v) {
            return;
        }
        if (v.paused) {
            void v.play();
        } else {
            v.pause();
        }
    }, []);

    const seek = useCallback((time: number) => {
        const v = videoRef.current;
        if (v) {
            v.currentTime = time;
        }
    }, []);

    const seekBy = useCallback((delta: number) => {
        const v = videoRef.current;
        if (v) {
            v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + delta));
        }
    }, []);

    const setPlayerVolume = useCallback((value: number) => {
        const v = videoRef.current;
        if (v) {
            v.volume = value;
            v.muted = value === 0;
        }
    }, []);

    const toggleMute = useCallback(() => {
        const v = videoRef.current;
        if (v) {
            v.muted = !v.muted;
        }
    }, []);

    const setRate = useCallback((rate: number) => {
        const v = videoRef.current;
        if (v) {
            v.playbackRate = rate;
        }
    }, []);

    const selectVariant = useCallback((id: string) => {
        const p = playerRef.current;
        if (!p) {
            return;
        }
        const track = p.getVariantTracks().find((t) => String(t.id) === id);
        if (track) {
            void p.selectVariantTrack(track, true);
        }
    }, []);

    const selectAudio = useCallback((id: string) => {
        const p = playerRef.current;
        if (!p) {
            return;
        }
        const tracks = p.getAudioTracks();
        const track = tracks.find((t, i) => `${t.language ?? i}-${i}` === id);
        if (track) {
            void p.selectAudioTrack(track);
        }
    }, []);

    const selectSubtitle = useCallback((id: string | null) => {
        const p = playerRef.current;
        if (!p) {
            return;
        }
        if (id == null || id === '') {
            void p.selectTextTrack(undefined as never);
            return;
        }
        const tracks = p.getTextTracks();
        const track = tracks.find((t, i) => `${t.language ?? i}-${i}` === id);
        if (track) {
            void p.selectTextTrack(track);
        }
    }, []);

    const toggleFullscreen = useCallback(() => {
        const container = containerRef.current;
        if (!container) {
            return;
        }
        if (document.fullscreenElement) {
            void document.exitFullscreen();
        } else {
            void container.requestFullscreen();
        }
    }, []);

    const video = videos[qualityIndex];
    const availableAudios = audioTracks.length > 1 ? audioTracks : [];
    const availableSubtitles = useMemo(() => {
        const fromShaka = textTracks;
        const fromVideo = video?.subtitleTracks ?? [];
        if (fromShaka.length) {
            return fromShaka;
        }
        return fromVideo.map((s, i) => ({ id: `ext-${i}`, label: s.lang, raw: s }));
    }, [textTracks, video]);

    // Expose control surface via a ref-like object on the container div so the
    // overlay can render against it. (Kept simple: handlers passed up via the
    // render-prop pattern below is overkill; the overlay reads from props.)
    return {
        containerRef,
        videoRef,
        errorMessage,
        isPlaying,
        isBuffering,
        currentTime,
        duration,
        volume,
        isMuted,
        playbackRate,
        variantTracks,
        audioTracks: availableAudios,
        textTracks: availableSubtitles,
        togglePlay,
        seek,
        seekBy,
        setVolume: setPlayerVolume,
        toggleMute,
        setRate,
        selectVariant,
        selectAudio,
        selectSubtitle,
        toggleFullscreen,
        onQualityChange,
    };
};

export type VideoPlayerController = ReturnType<typeof useVideoPlayer>;
