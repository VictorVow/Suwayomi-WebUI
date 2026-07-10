/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useRef, useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import ListItemText from '@mui/material/ListItemText';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import VolumeUpIcon from '@mui/icons-material/VolumeUp';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import SettingsIcon from '@mui/icons-material/Settings';
import Forward10Icon from '@mui/icons-material/Forward10';
import Replay10Icon from '@mui/icons-material/Replay10';
import { useLingui } from '@lingui/react/macro';
import type { PlayerTrack, VideoPlayerController } from '@/features/show/player/components/VideoPlayer.tsx';

const formatTime = (seconds: number): string => {
    if (!Number.isFinite(seconds) || seconds < 0) {
        return '0:00';
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const mm = h > 0 ? String(m).padStart(2, '0') : String(m);
    const ss = String(s).padStart(2, '0');
    return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

const AUTO_HIDE_DELAY = 3000;

const SettingsSection = ({
    label,
    tracks,
    onSelect,
    allowOff,
}: {
    label: string;
    tracks: PlayerTrack[];
    onSelect: (id: string) => void;
    allowOff?: boolean;
}) => {
    const { t } = useLingui();
    if (!tracks.length && !allowOff) {
        return null;
    }
    return (
        <Box>
            <Typography variant="overline" sx={{ px: 2, py: 0.5, display: 'block', opacity: 0.6 }}>
                {label}
            </Typography>
            {allowOff && (
                <MenuItem onClick={() => onSelect('')}>
                    <ListItemText>{t`Off`}</ListItemText>
                </MenuItem>
            )}
            {tracks.map((track) => (
                <MenuItem key={track.id} onClick={() => onSelect(track.id)}>
                    <ListItemText>{track.label}</ListItemText>
                </MenuItem>
            ))}
        </Box>
    );
};

/**
 * Player overlay (top bar + bottom bar + center controls + tap zones), mirroring
 * the structure of the manga reader overlay. Auto-hides after a few seconds of
 * inactivity when playing; reappears on mouse move / tap.
 */
export const PlayerOverlay = ({
    controller,
    title,
    episodeName,
    qualityLabel,
    onPrevEpisode,
    onNextEpisode,
    hasPrevEpisode,
    hasNextEpisode,
}: {
    controller: VideoPlayerController;
    title?: string;
    episodeName?: string;
    qualityLabel?: string;
    onPrevEpisode?: () => void;
    onNextEpisode?: () => void;
    hasPrevEpisode?: boolean;
    hasNextEpisode?: boolean;
}) => {
    const { t } = useLingui();
    const [visible, setVisible] = useState(true);
    const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(null);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const scheduleHide = () => {
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
        }
        hideTimerRef.current = setTimeout(() => {
            if (controller.isPlaying) {
                setVisible(false);
            }
        }, AUTO_HIDE_DELAY);
    };

    const reveal = () => {
        setVisible(true);
        scheduleHide();
    };

    useEffect(() => {
        reveal();
        return () => {
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [controller.isPlaying]);

    // Keyboard shortcuts (space=play/pause, arrows=seek/volume, f=fullscreen).
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            switch (e.key) {
                case ' ':
                case 'k':
                    e.preventDefault();
                    controller.togglePlay();
                    break;
                case 'ArrowLeft':
                    controller.seekBy(-10);
                    break;
                case 'ArrowRight':
                    controller.seekBy(10);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    controller.setVolume(Math.min(1, controller.volume + 0.1));
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    controller.setVolume(Math.max(0, controller.volume - 0.1));
                    break;
                case 'f':
                    controller.toggleFullscreen();
                    break;
                case 'm':
                    controller.toggleMute();
                    break;
                default:
                    return;
            }
            reveal();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [controller, reveal]);

    const handleMenuClick = (handler: () => void) => () => {
        handler();
        setSettingsAnchor(null);
    };
    void handleMenuClick; // retained for future menu actions

    const isFullscreen = typeof document !== 'undefined' && !!document.fullscreenElement;

    return (
        <Box
            onMouseMove={reveal}
            onClick={(e) => {
                // tap on empty area toggles controls (not on buttons/sliders)
                if (e.target === e.currentTarget) {
                    if (visible) {
                        if (controller.isPlaying) {
                            setVisible(false);
                        }
                    } else {
                        reveal();
                    }
                }
            }}
            sx={{
                position: 'absolute',
                inset: 0,
                color: 'common.white',
                opacity: visible ? 1 : 0,
                transition: 'opacity 0.2s',
                pointerEvents: visible ? 'auto' : 'none',
                background: visible
                    ? 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 25%, rgba(0,0,0,0) 75%, rgba(0,0,0,0.6) 100%)'
                    : 'none',
                zIndex: 1,
            }}
        >
            {/* Top bar */}
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', p: 1, gap: 1 }}>
                <Box sx={{ minWidth: 0 }}>
                    {title && (
                        <Typography variant="subtitle1" noWrap sx={{ fontWeight: 'bold' }}>
                            {title}
                        </Typography>
                    )}
                    {episodeName && (
                        <Typography variant="caption" noWrap sx={{ opacity: 0.8 }}>
                            {episodeName}
                        </Typography>
                    )}
                </Box>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5 }}>
                    {hasPrevEpisode && (
                        <IconButton color="inherit" onClick={onPrevEpisode} aria-label={t`Previous episode`}>
                            <SkipPreviousIcon />
                        </IconButton>
                    )}
                    {hasNextEpisode && (
                        <IconButton color="inherit" onClick={onNextEpisode} aria-label={t`Next episode`}>
                            <SkipNextIcon />
                        </IconButton>
                    )}
                    <IconButton color="inherit" aria-label={t`Settings`}>
                        <SettingsIcon onClick={(e) => setSettingsAnchor(e.currentTarget as unknown as HTMLElement)} />
                    </IconButton>
                </Stack>
            </Stack>

            {/* Center controls */}
            <Stack
                direction="row"
                sx={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    alignItems: 'center',
                    gap: 2,
                }}
            >
                <IconButton color="inherit" onClick={() => controller.seekBy(-10)} aria-label={t`Rewind 10 seconds`}>
                    <Replay10Icon fontSize="large" />
                </IconButton>
                <IconButton color="inherit" onClick={controller.togglePlay} aria-label={t`Play/Pause`}>
                    {controller.isPlaying ? (
                        <PauseIcon sx={{ fontSize: 48 }} />
                    ) : (
                        <PlayArrowIcon sx={{ fontSize: 48 }} />
                    )}
                </IconButton>
                <IconButton color="inherit" onClick={() => controller.seekBy(10)} aria-label={t`Forward 10 seconds`}>
                    <Forward10Icon fontSize="large" />
                </IconButton>
            </Stack>

            {/* Bottom bar: progress + time + volume + fullscreen */}
            <Stack
                direction="row"
                sx={{ alignItems: 'center', gap: 1, p: 1, position: 'absolute', bottom: 0, left: 0, right: 0 }}
            >
                <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 40 }}>
                    {formatTime(controller.currentTime)}
                </Typography>
                <Slider
                    value={controller.currentTime}
                    min={0}
                    max={controller.duration || 0}
                    step={1}
                    onChange={(_, v) => controller.seek(Number(v))}
                    size="small"
                    sx={{ color: 'common.white', flexGrow: 1 }}
                />
                <Typography variant="caption" sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 40 }}>
                    {formatTime(controller.duration)}
                </Typography>
                <IconButton color="inherit" onClick={controller.toggleMute} aria-label={t`Mute`}>
                    {controller.isMuted || controller.volume === 0 ? <VolumeOffIcon /> : <VolumeUpIcon />}
                </IconButton>
                <Slider
                    value={controller.isMuted ? 0 : controller.volume * 100}
                    min={0}
                    max={100}
                    step={1}
                    onChange={(_, v) => controller.setVolume(Number(v) / 100)}
                    size="small"
                    sx={{ color: 'common.white', width: 80 }}
                />
                {qualityLabel && (
                    <Typography variant="caption" sx={{ opacity: 0.8, ml: 1 }}>
                        {qualityLabel}
                    </Typography>
                )}
                <IconButton color="inherit" onClick={controller.toggleFullscreen} aria-label={t`Fullscreen`}>
                    {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                </IconButton>
            </Stack>

            {/* Settings menu */}
            <Menu anchorEl={settingsAnchor} open={!!settingsAnchor} onClose={() => setSettingsAnchor(null)}>
                <SettingsSection
                    label={t`Quality`}
                    tracks={controller.variantTracks}
                    onSelect={controller.selectVariant}
                />
                <SettingsSection label={t`Audio`} tracks={controller.audioTracks} onSelect={controller.selectAudio} />
                <SettingsSection
                    label={t`Subtitles`}
                    tracks={controller.textTracks}
                    onSelect={controller.selectSubtitle}
                    allowOff
                />
            </Menu>
        </Box>
    );
};
