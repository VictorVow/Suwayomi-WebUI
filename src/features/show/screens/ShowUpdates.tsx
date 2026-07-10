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

export function ShowUpdates() {
    const { t } = useLingui();

    return (
        <MangaRouteContext.Provider value={AppRoutes.show.path}>
            <ChapterRouteContext.Provider value={Chapters.getPlayerUrl}>
                <Updates
                    contentType={ContentType.Show}
                    title={t`Show Updates`}
                    emptyMessage={t`No show updates`}
                    emptyMessageExtra={t`Add a Cloudstream extension repository under Settings → Browse, then install a show source from the Extensions tab.`}
                />
            </ChapterRouteContext.Provider>
        </MangaRouteContext.Provider>
    );
}
