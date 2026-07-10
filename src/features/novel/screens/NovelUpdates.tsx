/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useLingui } from '@lingui/react/macro';
import { Updates } from '@/features/updates/screens/Updates.tsx';
import { MangaRouteContext } from '@/features/manga/components/MangaRouteContext.ts';
import { ChapterRouteContext } from '@/features/chapter/components/ChapterRouteContext.ts';
import { Chapters } from '@/features/chapter/services/Chapters.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { ContentType } from '@/lib/graphql/generated/graphql-base.types.ts';

export function NovelUpdates() {
    const { t } = useLingui();

    return (
        <MangaRouteContext.Provider value={AppRoutes.novelDetail.path}>
            <ChapterRouteContext.Provider value={Chapters.getNovelReaderUrl}>
                <Updates
                    contentType={ContentType.Novel}
                    title={t`Novel Updates`}
                    emptyMessage={t`No novel updates`}
                    emptyMessageExtra={t`Add an LNReader plugin repository under Settings → Browse, then install a novel source from the Extensions tab.`}
                />
            </ChapterRouteContext.Provider>
        </MangaRouteContext.Provider>
    );
}
