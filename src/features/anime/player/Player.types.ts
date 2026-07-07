/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/**
 * A subtitle track on an anime video, as returned by the aniyomi
 * \`GET /api/v1/aniyomi/episode/:chapterId/videos\` endpoint.
 */
export interface VideoSubtitleTrack {
    url: string;
    lang: string;
}

/**
 * An audio track on an anime video, as returned by the aniyomi
 * \`GET /api/v1/aniyomi/episode/:chapterId/videos\` endpoint.
 */
export interface VideoAudioTrack {
    url: string;
    lang: string;
}

/**
 * A resolved video stream from an anime source, mirroring the \`Video\` shape
 * returned by Miruyomi-Server's aniyomi REST endpoint. Each entry is a quality
 * rendition; the player picks one and proxies via
 * \`/api/v1/aniyomi/episode/:chapterId?index=N\`.
 */
export interface AniyomiVideo {
    videoUrl: string;
    videoTitle?: string | null;
    resolution?: string | null;
    headers?: Record<string, string> | null;
    subtitleTracks: VideoSubtitleTrack[];
    audioTracks: VideoAudioTrack[];
}

/** Shape returned by \`GET /api/v1/aniyomi/episode/:chapterId/videos\`. */
export interface AniyomiVideosResponse {
    videos: AniyomiVideo[];
}
