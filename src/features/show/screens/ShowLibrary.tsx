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

export function ShowLibrary() {
    const { t } = useLingui();

    return (
        <MangaRouteContext.Provider value={AppRoutes.show.path}>
            <Library
                contentType={ContentType.Show}
                title={t`Show Library`}
                searchAllPath={AppRoutes.showSources.children.searchAll.path}
                emptyLibraryMessage={t`Your show library is empty`}
                emptyCategoryMessage={t`The category is empty`}
                failedToLoadMessage={t`Could not load shows`}
            />
        </MangaRouteContext.Provider>
    );
}
