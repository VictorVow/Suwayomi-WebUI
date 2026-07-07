/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createContext, useContext } from 'react';
import type { ChapterMangaInfo, ChapterSourceOrderInfo } from '@/features/chapter/Chapter.types.ts';
import { Chapters } from '@/features/chapter/services/Chapters.ts';

/**
 * Overrides where a chapter card navigates when clicked. Defaults to the manga
 * reader route; the Anime detail screen provides a value targeting the video
 * player route so episode clicks open the player instead.
 */
export type ChapterUrlBuilder = <Chapter extends ChapterMangaInfo & ChapterSourceOrderInfo>(chapter: Chapter) => string;

export const ChapterRouteContext = createContext<ChapterUrlBuilder>(Chapters.getReaderUrl);

export const useChapterRoute = (): ChapterUrlBuilder => useContext(ChapterRouteContext);
