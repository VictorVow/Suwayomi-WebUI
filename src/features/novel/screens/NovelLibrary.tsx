/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useLingui } from '@lingui/react/macro';
import { Library } from '@/features/library/screens/Library.tsx';
import { MangaRouteContext } from '@/features/manga/components/MangaRouteContext.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { ContentType } from '@/lib/graphql/generated/graphql-base.types.ts';

export function NovelLibrary() {
    const { t } = useLingui();

    return (
        <MangaRouteContext.Provider value={AppRoutes.novelDetail.path}>
            <Library
                contentType={ContentType.Novel}
                title={t`Novel Library`}
                searchAllPath={AppRoutes.novelSources.children.searchAll.path}
                emptyLibraryMessage={t`Your novel library is empty`}
                emptyCategoryMessage={t`The category is empty`}
                failedToLoadMessage={t`Could not load novels`}
            />
        </MangaRouteContext.Provider>
    );
}
