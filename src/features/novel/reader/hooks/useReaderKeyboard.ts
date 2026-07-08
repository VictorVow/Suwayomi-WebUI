/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useHotkeys } from 'react-hotkeys-hook';
import {
    NOVEL_READER_DEFAULT_HOTKEYS,
    useNovelReaderSettings,
    type NovelReaderHotkey,
} from '@/features/novel/reader/preferences.ts';

export interface ReaderKeyboardHandlers {
    showChrome: () => void;
    startSearch: () => void;
    nextMatch: () => void;
    previousMatch: () => void;
    increaseFontSize: () => void;
    decreaseFontSize: () => void;
    defaultFontSize: () => void;
    gotoLocation: () => void;
    toggleToc: () => void;
    newBookmark: () => void;
    toggleBookmarks: () => void;
    previousSection: () => void;
    nextSection: () => void;
    preferences: () => void;
    back: () => void;
    forward: () => void;
}

/**
 * Global keyboard shortcuts for the novel reader. Wires `react-hotkeys-hook`
 * (also used by the manga `ReaderHotkeys`) to the panel-stack handlers. Keys
 * come from `settings.keyboard_shortcuts` overrides, falling back to
 * `NOVEL_READER_DEFAULT_HOTKEYS`. The hotkey strings use `mod` which
 * react-hotkeys-hook already expands to Ctrl/Meta by platform.
 *
 * The modal panels (MainOverlay/Goto/…) handle Escape themselves (which the
 * panel-stack host translates into a pop), so `show_chrome` here matches
 * calibre's `Escape`/`ContextMenu` → `show_chrome` behavior.
 */
export const useReaderKeyboard = (handlers: ReaderKeyboardHandlers) => {
    const settings = useNovelReaderSettings();
    const keyFor = (k: NovelReaderHotkey): string => settings.keyboard_shortcuts[k] ?? NOVEL_READER_DEFAULT_HOTKEYS[k];

    const opts = { preventDefault: true };

    useHotkeys(keyFor('show_chrome'), handlers.showChrome, opts, [handlers.showChrome]);
    useHotkeys(keyFor('start_search'), handlers.startSearch, opts, [handlers.startSearch]);
    useHotkeys(keyFor('next_match'), handlers.nextMatch, opts, [handlers.nextMatch]);
    useHotkeys(keyFor('previous_match'), handlers.previousMatch, opts, [handlers.previousMatch]);
    useHotkeys(keyFor('increase_font_size'), handlers.increaseFontSize, opts, [handlers.increaseFontSize]);
    useHotkeys(keyFor('decrease_font_size'), handlers.decreaseFontSize, opts, [handlers.decreaseFontSize]);
    useHotkeys(keyFor('default_font_size'), handlers.defaultFontSize, opts, [handlers.defaultFontSize]);
    useHotkeys(keyFor('goto_location'), handlers.gotoLocation, opts, [handlers.gotoLocation]);
    useHotkeys(keyFor('toggle_toc'), handlers.toggleToc, opts, [handlers.toggleToc]);
    useHotkeys(keyFor('new_bookmark'), handlers.newBookmark, opts, [handlers.newBookmark]);
    useHotkeys(keyFor('toggle_bookmarks'), handlers.toggleBookmarks, opts, [handlers.toggleBookmarks]);
    useHotkeys(keyFor('previous_section'), handlers.previousSection, opts, [handlers.previousSection]);
    useHotkeys(keyFor('next_section'), handlers.nextSection, opts, [handlers.nextSection]);
    useHotkeys(keyFor('preferences'), handlers.preferences, opts, [handlers.preferences]);
    useHotkeys(keyFor('back'), handlers.back, opts, [handlers.back]);
    useHotkeys(keyFor('forward'), handlers.forward, opts, [handlers.forward]);
};
