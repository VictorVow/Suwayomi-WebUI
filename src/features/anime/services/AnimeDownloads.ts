/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { requestManager } from '@/lib/requests/RequestManager.ts';
import { AnimePlayerApi } from '@/features/anime/player/AnimePlayerApi.ts';
import { showQualityPicker } from '@/features/anime/components/QualityPickerDialog.tsx';
import { makeToast } from '@/base/utils/Toast.ts';
import { getErrorMessage } from '@/lib/HelperFunctions.ts';
import { t } from '@lingui/core/macro';

/**
 * Probes each available video rendition's Content-Length via HEAD requests to
 * the proxied stream endpoint. Returns a parallel array of byte sizes (or null
 * where the size couldn't be determined — e.g. HLS or HEAD-unsupported sources).
 */
export const fetchVideoSizes = async (chapterId: number, videoCount: number): Promise<(number | null)[]> => {
    if (videoCount === 0) {
        return [];
    }
    const sizes = await Promise.all(
        Array.from({ length: videoCount }, (_, i) =>
            fetch(AnimePlayerApi.getStreamUrl(chapterId, i), { method: 'HEAD', credentials: 'include' })
                .then((res) => {
                    const len = res.headers.get('content-length');
                    const n = len ? Number(len) : NaN;
                    return Number.isFinite(n) && n > 0 ? n : null;
                })
                .catch(() => null),
        ),
    );
    return sizes;
};

/**
 * Downloads anime episode(s) with a quality picker: for each chapter, fetches
 * the available videos, shows a dialog with rendition labels + estimated file
 * sizes, and enqueues the download with the user's chosen quality index via the
 * extended enqueueChapterDownloads mutation.
 *
 * If an episode has no downloadable videos, shows a toast and skips it (the
 * "hide on unsupported sources" decision is per-episode, since support depends
 * on whether the source resolved a videoUrl for that specific episode). If only
 * one rendition is available, skips the dialog and enqueues directly.
 *
 * For a batch of multiple chapters, the first chapter's quality choice is
 * reused for all subsequent chapters in the batch (so the user isn't prompted
 * repeatedly).
 */
export const downloadAnimeEpisodes = async (chapterIds: number[]): Promise<void> => {
    if (!chapterIds.length) {
        return;
    }

    let reusedQualityIndex: number | null = null;

    for (const chapterId of chapterIds) {
        let videos;
        try {
            // Sequential by design: each episode prompts the user for a quality
            // choice, so parallelizing would stack multiple dialogs.
            // eslint-disable-next-line no-await-in-loop
            videos = await AnimePlayerApi.fetchEpisodeVideos(chapterId);
        } catch (e) {
            makeToast(t`Failed to load video qualities`, 'error', getErrorMessage(e));
            continue;
        }

        if (!videos.length) {
            makeToast(t`No downloadable video for this episode`, 'info');
            continue;
        }

        let qualityIndex: number;
        if (reusedQualityIndex != null && reusedQualityIndex < videos.length) {
            qualityIndex = reusedQualityIndex;
        } else if (videos.length === 1) {
            qualityIndex = 0;
        } else {
            try {
                // eslint-disable-next-line no-await-in-loop
                const sizes = await fetchVideoSizes(chapterId, videos.length);
                // eslint-disable-next-line no-await-in-loop
                qualityIndex = await showQualityPicker(videos, sizes);
            } catch {
                return; // user cancelled the picker
            }
            reusedQualityIndex = qualityIndex;
        }

        requestManager
            .addChaptersToDownloadQueueWithQuality([chapterId], qualityIndex)
            .response.catch((e: unknown) =>
                makeToast(t`Failed to add episode to download queue`, 'error', getErrorMessage(e)),
            );
    }
};
