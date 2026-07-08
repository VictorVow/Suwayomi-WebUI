/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/** LIFO overlay panel types — mirrors calibre's `Overlay` panel interface. */
export type ReaderPanel =
    | { kind: 'main' }
    | { kind: 'toc' }
    | { kind: 'search' }
    | { kind: 'goto' }
    | { kind: 'prefs' }
    | { kind: 'font_size' }
    | { kind: 'word_actions'; word: string }
    | { kind: 'bookmarks' };
