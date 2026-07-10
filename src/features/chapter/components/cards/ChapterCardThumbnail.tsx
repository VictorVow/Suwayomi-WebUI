/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Link } from 'react-router-dom';
import { Mangas } from '@/features/manga/services/Mangas.ts';
import { useMangaRoute } from '@/features/manga/components/MangaRouteContext.ts';
import type { MangaIdInfo, MangaThumbnailInfo, MangaTitleInfo } from '@/features/manga/Manga.types.ts';
import { ListCardAvatar } from '@/base/components/lists/cards/ListCardAvatar.tsx';

export const ChapterCardThumbnail = ({
    mangaId,
    mangaTitle,
    thumbnailUrl,
    thumbnailUrlLastFetched,
}: MangaThumbnailInfo & {
    mangaId: MangaIdInfo['id'];
    mangaTitle: MangaTitleInfo['title'];
}) => {
    const getMangaRoute = useMangaRoute();

    return (
        <Link to={getMangaRoute(mangaId)} style={{ textDecoration: 'none' }}>
            <ListCardAvatar
                iconUrl={Mangas.getThumbnailUrl({ thumbnailUrl, thumbnailUrlLastFetched })}
                alt={mangaTitle}
                slots={{ spinnerImageProps: { imgStyle: { imageRendering: 'pixelated' } } }}
            />
        </Link>
    );
};
