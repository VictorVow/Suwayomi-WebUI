/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { createContext, useContext } from 'react';
import { AppRoutes } from '@/base/AppRoute.constants.ts';

/**
 * Overrides where a manga card navigates when clicked. Defaults to the manga
 * detail route; the Anime section provides a value targeting `/anime/:id` so
 * anime library/source cards open the anime detail screen (whose episode list
 * routes to the video player).
 */
export type MangaUrlBuilder = (mangaId: number) => string;

export const MangaRouteContext = createContext<MangaUrlBuilder>((id) => AppRoutes.manga.path(id));

export const useMangaRoute = (): MangaUrlBuilder => useContext(MangaRouteContext);
