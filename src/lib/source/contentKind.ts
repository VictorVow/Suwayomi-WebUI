/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { SourceKind } from '@/lib/graphql/generated/graphql-base.types.ts';

/*
 * Shared content-type discrimination for the unified `manga` table.
 *
 * Miruyomi stores manga, light novels and anime in one `manga` table. The
 * content type of a title is derived from its source:
 *
 *   - Novel  -> source id is a negative Long (LNReader plugin sources)
 *   - Anime  -> source `kind === ANIME` (Aniyomi sources)
 *   - Manga  -> everything else
 *
 * Centralised here so all feature areas (library, novel, anime, browse, ...)
 * agree on the rule. The server exposes the same discriminator as the
 * `ContentType` GraphQL enum / `MangaConditionInput.contentType` condition.
 */

/** A source id belongs to an LNReader (novel) plugin when it is a negative Long. */
export const isNovelSourceId = (id: string): boolean => id.startsWith('-');

export type ContentKind = 'MANGA' | 'NOVEL' | 'ANIME';

/** The content kind of a title, derived from its source id and source kind. */
export const contentKindOf = (sourceId: string, sourceKind?: SourceKind | null): ContentKind => {
    if (isNovelSourceId(sourceId)) {
        return 'NOVEL';
    }
    if (sourceKind === SourceKind.Anime) {
        return 'ANIME';
    }
    return 'MANGA';
};
