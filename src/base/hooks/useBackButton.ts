/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useLocation, useNavigate } from 'react-router-dom';
import { useCallback } from 'react';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { useAppPageHistoryContext } from '@/base/contexts/AppPageHistoryContext.tsx';
import { SearchParam } from '@/base/Base.types.ts';
import { ShowBrowseTab } from '@/features/show/Show.types.ts';
import { AnimeBrowseTab } from '@/features/anime/Anime.types.ts';
import { NovelBrowseTab } from '@/features/novel/Novel.types.ts';
import { BrowseTab } from '@/features/browse/Browse.types.ts';
import { UrlUtil } from '@/lib/UrlUtil.ts';

const READER_REGEX = /\/manga\/[0-9]+\/chapter\/[0-9]+/g;
const NOVEL_READER_REGEX = /\/novel\/[0-9]+\/chapter\/[0-9]+/g;
const PAGES_TO_IGNORE: readonly RegExp[] = [READER_REGEX, NOVEL_READER_REGEX];

const browseTab = (path: string, tab: string) => UrlUtil.addParams(path, { [SearchParam.TAB]: tab });

export const useBackButton = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { history, onBack } = useAppPageHistoryContext();

    return useCallback(async () => {
        const getDelta = (historyToCheck: string[] = history, delta: number = 0) => {
            const isHistoryEmpty = !historyToCheck.length;
            if (isHistoryEmpty) {
                return 0;
            }

            const isLastPageInHistoryCurrentPage =
                historyToCheck.length === 1 && historyToCheck[0] === location.pathname;
            if (isLastPageInHistoryCurrentPage) {
                return 0;
            }

            const [previousPage] = historyToCheck.slice(-2);

            const isPreviousPageCurrentPage = previousPage === location.pathname;
            const ignorePreviousPage = PAGES_TO_IGNORE.some((page) => !!previousPage.match(page));

            const skipPreviousPage = isPreviousPageCurrentPage || ignorePreviousPage;
            if (!skipPreviousPage) {
                return delta - 1;
            }

            return getDelta(historyToCheck.slice(0, -1), delta - 1);
        };

        const isAllowedToGoBack = await onBack();
        if (!isAllowedToGoBack) {
            return;
        }

        const backDelta = getDelta();

        const canNavigateBack = backDelta < 0;
        if (!canNavigateBack) {
            const fallback = (() => {
                if (location.pathname.startsWith('/novel/sources')) {
                    return browseTab(AppRoutes.novel.children.browse.path, NovelBrowseTab.SOURCES);
                }
                if (location.pathname.startsWith('/novel/')) {
                    return AppRoutes.novel.children.library.path;
                }
                if (location.pathname.startsWith('/anime/sources')) {
                    return browseTab(AppRoutes.animeBrowse.path, AnimeBrowseTab.SOURCES);
                }
                if (location.pathname.startsWith('/anime/')) {
                    return AppRoutes.animeLibrary.path;
                }
                if (location.pathname.startsWith('/show/sources')) {
                    return browseTab(AppRoutes.showBrowse.path, ShowBrowseTab.SOURCES);
                }
                if (location.pathname.startsWith('/show/')) {
                    return AppRoutes.showLibrary.path;
                }
                if (location.pathname.startsWith('/sources')) {
                    return AppRoutes.browse.path(BrowseTab.SOURCES);
                }
                return AppRoutes.library.path();
            })();
            navigate(fallback);
            return;
        }

        navigate(backDelta);
    }, [history, onBack, location.pathname]);
};
