/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react';

/**
 * Calibre-web-reader-style settings schema for the novel reader. Mirrors the
 * flat `all_settings` dict from calibre's `src/pyj/session.pyj` (category
 * `read_book`): every reader option lives as a flat key, persisted to
 * localStorage as a single JSON blob (`miruyomi.novelReader.settings.v2`).
 *
 * Adapted to Miruyomi's data model:
 *   - "book"  == manga   (the title-row the chapters belong to)
 *   - "section"/chapter == a single lnreader chapter (HTML body via REST)
 *   - paged-mode / CFI / spine / EPUB manifest options are absent: the server
 *     already returns single-chapter flowed HTML, so there is no spine and no
 *     epubcfi. Flow (continuous scroll) is the only layout.
 *   - highlights/annotations persistence is deferred (no server endpoint);
 *     `selection_bar_actions` therefore defaults to the no-highlight subset.
 */

export type NovelReaderTheme = 'system' | 'light' | 'dark' | 'sepia';

export interface NovelReaderColorScheme {
    background: string;
    foreground: string;
    link?: string;
}

/** Built-in color schemes; `system` resolves at apply-time against OS light/dark. */
export const NOVEL_READER_BUILTIN_COLOR_SCHEMES: Record<Exclude<NovelReaderTheme, 'system'>, NovelReaderColorScheme> = {
    light: { background: '#ffffff', foreground: '#1a1a1a', link: '#1976d2' },
    dark: { background: '#121212', foreground: '#e0e0e0', link: '#90caf9' },
    sepia: { background: '#f4ecd8', foreground: '#3b2f2f', link: '#8b5e3c' },
};

export const MIN_FONT_SIZE = 8;
export const MAX_FONT_SIZE = 64;
export const DEFAULT_FONT_SIZE = 18;

/* ── Header / footer customizable region types (calibre prefs/head_foot.pyj) ── */

export type HeadFootRegion = 'left' | 'middle' | 'right';
export type HeadFootWhich = 'header' | 'footer';

export type SectionType =
    | 'empty'
    | 'title' // manga title
    | 'authors' // manga authors
    | 'series' // manga series (if present)
    | 'top-section' // top-level TOC node title (≈ manga title here)
    | 'section' // current chapter name
    | 'view-mode' // "Flow" (always, since paged mode is out of scope)
    | 'view-mode-icon'
    | 'clock' // wall-clock HH:MM, re-rendered every second
    | 'menu-icon-on-hover' // badge that opens the main overlay on click / reveals on hover
    | 'progress' // progress percent through the chapter scroll
    | 'time-book' // estimated time left to finish the manga (chapters remaining)
    | 'time-chapter' // estimated time left to finish the current chapter
    | 'time-chapter-book' // "{chapter} ({book})"
    | 'pos-book' // chapter index / total
    | 'pos-chapter' // scroll position in current chapter
    | 'pages-progress'; // approximate "screens" in chapter / total

/**
 * Per-strip config: maps each region of a single strip (header/footer/controls)
 * to its section type. The chrome-level mapping is `{ header, footer,
 * controls_footer }` of these — see `NovelReaderSettings`.
 */
export type HeadFootConfig = Partial<Record<HeadFootRegion, SectionType>>;

/* ── Selection / lookup / shortcuts ── */

export type SelectionBarAction = 'copy' | 'lookup' | 'search' | 'clear';

export interface WordAction {
    title: string;
    url: string; // must contain `{word}` placeholder
}

export type NovelReaderHotkey =
    | 'show_chrome'
    | 'start_search'
    | 'next_match'
    | 'previous_match'
    | 'increase_font_size'
    | 'decrease_font_size'
    | 'default_font_size'
    | 'goto_location'
    | 'toggle_toc'
    | 'new_bookmark'
    | 'toggle_bookmarks'
    | 'previous_section'
    | 'next_section'
    | 'preferences'
    | 'back'
    | 'forward';

export const NOVEL_READER_DEFAULT_HOTKEYS: Record<NovelReaderHotkey, string> = {
    show_chrome: 'Escape',
    start_search: 'mod+f, /',
    next_match: 'F3, enter',
    previous_match: 'shift+F3, shift+enter',
    increase_font_size: 'mod+=, mod++',
    decrease_font_size: 'mod+-, mod+_',
    default_font_size: 'mod+0',
    goto_location: 'mod+g, ;',
    toggle_toc: 'mod+t',
    new_bookmark: 'mod+alt+b',
    toggle_bookmarks: 'mod+b',
    previous_section: 'mod+PageUp',
    next_section: 'mod+PageDown',
    preferences: 'mod+,',
    back: 'alt+ArrowLeft',
    forward: 'alt+ArrowRight',
};

/* ── Full settings shape ── */

export interface NovelReaderSettings {
    base_font_size: number; // 8–64
    font_family: 'system' | 'serif' | 'sans';
    margin_left: number; // 0–400 px
    margin_right: number;
    margin_top: number;
    margin_bottom: number;
    max_text_width: number; // 0 = unlimited
    line_height: number; // 1.2–2.5
    current_color_scheme: string; // built-in key ('system'|'light'|'dark'|'sepia') or user custom
    user_color_schemes: Record<string, NovelReaderColorScheme>;
    user_stylesheet: string;
    paragraph_spacing: number; // px between <p>, 0–48
    header: HeadFootConfig;
    footer: HeadFootConfig;
    controls_footer: HeadFootConfig;
    show_selection_bar: boolean;
    net_search_url: string; // `{q}` placeholder
    selection_bar_actions: SelectionBarAction[];
    word_actions: WordAction[];
    keyboard_shortcuts: Partial<Record<NovelReaderHotkey, string>>;
    auto_hide_chrome_ms: number; // 0 disables auto-hide
    restore_scroll_position: boolean;
    mark_read_policy: 'on_open' | 'past_threshold';
    mark_read_threshold: number; // 0–1, fraction of chapter scrolled
    /** Tracks per-chapter reading rates (chars/sec) used for time-to-read estimates. */
    reading_rates: Record<number, number[]>; // keyed by chapterId
}

export const NOVEL_READER_DEFAULT_SETTINGS: NovelReaderSettings = {
    base_font_size: DEFAULT_FONT_SIZE,
    font_family: 'system',
    margin_left: 24,
    margin_right: 24,
    margin_top: 16,
    margin_bottom: 16,
    max_text_width: 900,
    line_height: 1.7,
    current_color_scheme: 'dark',
    user_color_schemes: {},
    user_stylesheet: '',
    paragraph_spacing: 8,
    header: { right: 'menu-icon-on-hover' },
    footer: { left: 'menu-icon-on-hover', right: 'progress' },
    controls_footer: { right: 'progress' },
    show_selection_bar: true,
    net_search_url: 'https://google.com/search?q={q}',
    selection_bar_actions: ['copy', 'lookup', 'search', 'clear'],
    word_actions: [],
    keyboard_shortcuts: {},
    auto_hide_chrome_ms: 0, // matches existing "persistent toolbar" default
    restore_scroll_position: true,
    mark_read_policy: 'past_threshold',
    mark_read_threshold: 0.95,
    reading_rates: {},
};

const SETTINGS_LS_KEY = 'miruyomi.novelReader.settings.v2';

/* ── Migration from the legacy single-value keys ── */

const LEGACY_FONT_SIZE_KEY = 'miruyomi.novelReader.fontSize';
const LEGACY_THEME_KEY = 'miruyomi.novelReader.theme';

const migrateLegacy = (base: NovelReaderSettings): NovelReaderSettings => {
    const merged: NovelReaderSettings = { ...base };
    const legacySizeRaw = localStorage.getItem(LEGACY_FONT_SIZE_KEY);
    if (legacySizeRaw != null) {
        const size = Number(legacySizeRaw);
        if (Number.isFinite(size)) {
            merged.base_font_size = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, size));
        }
    }
    const legacyTheme = localStorage.getItem(LEGACY_THEME_KEY);
    if (legacyTheme === 'light' || legacyTheme === 'dark' || legacyTheme === 'sepia') {
        merged.current_color_scheme = legacyTheme;
    }
    return merged;
};

/* ── Persistence layer ── */

let cachedSettings: NovelReaderSettings | undefined;

const loadFromStorage = (): NovelReaderSettings => {
    const raw = localStorage.getItem(SETTINGS_LS_KEY);
    if (!raw) {
        const migrated = migrateLegacy(NOVEL_READER_DEFAULT_SETTINGS);
        localStorage.setItem(SETTINGS_LS_KEY, JSON.stringify(migrated));
        return migrated;
    }
    try {
        const parsed = JSON.parse(raw) as Partial<NovelReaderSettings>;
        return { ...NOVEL_READER_DEFAULT_SETTINGS, ...parsed };
    } catch {
        return NOVEL_READER_DEFAULT_SETTINGS;
    }
};

export const getNovelReaderSettings = (): NovelReaderSettings => {
    if (!cachedSettings) {
        cachedSettings = loadFromStorage();
    }
    return cachedSettings;
};

const saveNovelReaderSettings = (settings: NovelReaderSettings): void => {
    cachedSettings = settings;
    localStorage.setItem(SETTINGS_LS_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('novel-reader-settings-changed', { detail: settings }));
};

export const updateNovelReaderSettings = (patch: Partial<NovelReaderSettings>): NovelReaderSettings => {
    const next = { ...getNovelReaderSettings(), ...patch };
    saveNovelReaderSettings(next);
    return next;
};

export const resetNovelReaderSettings = (): NovelReaderSettings => {
    const next = { ...NOVEL_READER_DEFAULT_SETTINGS };
    saveNovelReaderSettings(next);
    return next;
};

/**
 * Reactive read of the settings. Subscribes to the cross-component change
 * event so settings panel edits immediately reflect in the reader chrome.
 */
export const useNovelReaderSettings = (): NovelReaderSettings => {
    const [settings, setSettings] = useState<NovelReaderSettings>(getNovelReaderSettings);
    useEffect(() => {
        const onChange = (e: Event) => setSettings((e as CustomEvent).detail as NovelReaderSettings);
        window.addEventListener('novel-reader-settings-changed', onChange);
        return () => window.removeEventListener('novel-reader-settings-changed', onChange);
    }, []);
    return settings;
};

/* ── Convenience helpers (font size, scroll position, reading rates) ── */

const SCROLL_POSITIONS_LS_KEY = 'miruyomi.novelReader.scrollPositions.v2';

export const getScrollPosition = (chapterId: number): number => {
    try {
        const raw = localStorage.getItem(SCROLL_POSITIONS_LS_KEY);
        if (!raw) {
            return 0;
        }
        const map = JSON.parse(raw) as Record<number, number>;
        return map[chapterId] ?? 0;
    } catch {
        return 0;
    }
};

export const setScrollPosition = (chapterId: number, scrollTop: number): void => {
    try {
        const raw = localStorage.getItem(SCROLL_POSITIONS_LS_KEY);
        const map: Record<number, number> = raw ? (JSON.parse(raw) as Record<number, number>) : {};
        map[chapterId] = scrollTop;
        // Keep the store from growing without bound — drop entries beyond 200.
        const entries = Object.entries(map);
        if (entries.length > 200) {
            entries
                .sort((a, b) => b[1] - a[1])
                .slice(200)
                .forEach(([key]) => {
                    delete map[Number(key)];
                });
        }
        localStorage.setItem(SCROLL_POSITIONS_LS_KEY, JSON.stringify(map));
    } catch {
        // localStorage may be unavailable (private mode) — silently ignore.
    }
};

export const recordReadingRate = (chapterId: number, charsRead: number, secondsElapsed: number): void => {
    if (charsRead <= 0 || secondsElapsed <= 0.5) {
        return;
    }
    const rate = charsRead / secondsElapsed;
    const settings = getNovelReaderSettings();
    const rates = (settings.reading_rates[chapterId] ?? []).slice(-19);
    rates.push(rate);
    const allRates = { ...settings.reading_rates, [chapterId]: rates };
    updateNovelReaderSettings({ reading_rates: allRates });
};

export const getReadingRateFor = (chapterId: number): number | undefined => {
    const settings = getNovelReaderSettings();
    const rates = settings.reading_rates[chapterId];
    if (!rates || !rates.length) {
        return undefined;
    }
    return rates.reduce((a, b) => a + b, 0) / rates.length;
};

export const resolveColorScheme = (
    scheme: string,
    userSchemes: Record<string, NovelReaderColorScheme>,
): NovelReaderColorScheme => {
    if (scheme === 'system') {
        const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
        return NOVEL_READER_BUILTIN_COLOR_SCHEMES[prefersDark ? 'dark' : 'light'];
    }
    if (scheme === 'light' || scheme === 'dark' || scheme === 'sepia') {
        return NOVEL_READER_BUILTIN_COLOR_SCHEMES[scheme];
    }
    return userSchemes[scheme] ?? NOVEL_READER_BUILTIN_COLOR_SCHEMES.dark;
};
