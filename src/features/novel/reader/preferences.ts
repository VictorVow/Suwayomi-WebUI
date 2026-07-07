/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export enum NovelReaderTheme {
    LIGHT = 'light',
    DARK = 'dark',
    SEPIA = 'sepia',
}

export const NOVEL_READER_THEME_COLORS: Record<NovelReaderTheme, { background: string; color: string }> = {
    [NovelReaderTheme.LIGHT]: { background: '#ffffff', color: '#1a1a1a' },
    [NovelReaderTheme.DARK]: { background: '#121212', color: '#e0e0e0' },
    [NovelReaderTheme.SEPIA]: { background: '#f4ecd8', color: '#3b2f2f' },
};

const FONT_SIZE_LS_KEY = 'miruyomi.novelReader.fontSize';
const THEME_LS_KEY = 'miruyomi.novelReader.theme';

export const MIN_FONT_SIZE = 12;
export const MAX_FONT_SIZE = 32;
export const DEFAULT_FONT_SIZE = 18;
const FONT_SIZE_STEP = 2;

/** localStorage-backed reader preferences, mirroring the pattern used for anime player quality. */
export const NovelReaderPreferences = {
    getFontSize: (): number => {
        const stored = Number(localStorage.getItem(FONT_SIZE_LS_KEY));
        if (!Number.isFinite(stored) || stored < MIN_FONT_SIZE || stored > MAX_FONT_SIZE) {
            return DEFAULT_FONT_SIZE;
        }
        return stored;
    },
    setFontSize: (size: number): number => {
        const clamped = Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, size));
        localStorage.setItem(FONT_SIZE_LS_KEY, String(clamped));
        return clamped;
    },
    stepFontSize: (current: number, direction: 1 | -1): number =>
        NovelReaderPreferences.setFontSize(current + direction * FONT_SIZE_STEP),

    getTheme: (): NovelReaderTheme => {
        const stored = localStorage.getItem(THEME_LS_KEY);
        return stored != null && (Object.values(NovelReaderTheme) as string[]).includes(stored)
            ? (stored as NovelReaderTheme)
            : NovelReaderTheme.DARK;
    },
    setTheme: (theme: NovelReaderTheme): void => {
        localStorage.setItem(THEME_LS_KEY, theme);
    },
};
