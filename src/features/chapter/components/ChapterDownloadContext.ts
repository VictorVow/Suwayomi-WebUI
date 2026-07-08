/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createContext, useContext } from 'react';
import { Chapters } from '@/features/chapter/services/Chapters.ts';

/**
 * Overrides how chapters (episodes) are enqueued for download. Defaults to
 * {@link Chapters.download} (the manga CBZ path); the Anime detail screen
 * provides a value that shows a quality-picker dialog and enqueues via the
 * extended mutation with a `qualityIndex`, since anime episodes are video
 * streams rather than image pages.
 */
export type ChapterDownloadFn = (chapterIds: number[]) => Promise<void>;

export const ChapterDownloadContext = createContext<ChapterDownloadFn>((ids) => Chapters.download(ids));

export const useChapterDownload = (): ChapterDownloadFn => useContext(ChapterDownloadContext);
