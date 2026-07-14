/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useMemo } from 'react';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { GET_CATEGORIES_LIBRARY } from '@/lib/graphql/category/CategoryQuery.ts';
import type {
    GetCategoriesLibraryQuery,
    GetCategoriesLibraryQueryVariables,
    GetMangasLibraryQuery,
} from '@/lib/graphql/generated/graphql.ts';
import type { ContentType } from '@/lib/graphql/generated/graphql-base.types.ts';
import { useGetVisibleLibraryMangas } from '@/features/library/hooks/useGetVisibleLibraryMangas.ts';
import { STABLE_EMPTY_ARRAY } from '@/base/Base.constants.ts';

type LibraryMangaNode = GetMangasLibraryQuery['mangas']['nodes'][number];

export const useHomeLibraryPreview = (
    contentType: ContentType,
    mangas: LibraryMangaNode[],
    previewCount: number,
): LibraryMangaNode[] => {
    const { data: categoriesResponse } = requestManager.useGetCategories<
        GetCategoriesLibraryQuery,
        GetCategoriesLibraryQueryVariables
    >(GET_CATEGORIES_LIBRARY, undefined, { mangaContentType: contentType });

    const tabs = useMemo(
        () =>
            (categoriesResponse?.categories.nodes ?? STABLE_EMPTY_ARRAY).filter(
                (category) => category.mangas.totalCount > 0,
            ),
        [categoriesResponse],
    );

    const { visibleMangas } = useGetVisibleLibraryMangas(mangas, tabs[0]);

    return useMemo(() => visibleMangas.slice(0, previewCount), [visibleMangas, previewCount]);
};
