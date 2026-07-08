/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { HeadFootRegion, HeadFootWhich, SectionType } from '@/features/novel/reader/preferences.ts';

export const SECTION_TYPES: SectionType[] = [
    'empty',
    'title',
    'authors',
    'series',
    'top-section',
    'section',
    'view-mode',
    'view-mode-icon',
    'clock',
    'menu-icon-on-hover',
    'progress',
    'time-book',
    'time-chapter',
    'time-chapter-book',
    'pos-book',
    'pos-chapter',
    'pages-progress',
];

export interface HeadFootRenderCtx {
    mangaTitle?: string;
    mangaAuthors?: string[];
    mangaSeries?: string | null;
    chapterName?: string;
    /** progress fraction (0–1) through the reading unit. */
    chapterProgress: number;
    /** progress fraction through the whole manga (chapter index + within-chapter scroll). */
    bookProgress: number;
    /** chapter index (1-based) within the flat sorted list. */
    chapterIndex: number;
    /** total chapter count. */
    chapterCount: number;
    /** estimated seconds remaining to finish the chapter, or undefined if unknown. */
    timeChapterSeconds?: number;
    /** estimated seconds remaining to finish the whole manga, or undefined if unknown. */
    timeBookSeconds?: number;
    /** current scroll "screen" (0-based) within the chapter. */
    screenIndex?: number;
    /** total screens in the chapter. */
    screenCount?: number;
}

export interface HeadFootRegionOut {
    text: string;
    /** Whether this region needs a 1-second ticker (clocks). */
    ticking: boolean;
    /** Whether this region renders the "show controls" hover badge and forwards clicks. */
    showChromeControl: boolean;
}

const pad = (n: number): string => String(n).padStart(2, '0');

const formatClock = (d: Date): string =>
    // Intl.DateTimeFormat(None,{hour,minute}) would respect locale but the
    // project ships many dayjs locales already; stick with a simple HH:MM
    // to avoid an L10N lookup at every tick.
    `${pad(d.getHours())}:${pad(d.getMinutes())}`;

const formatTimeLeft = (seconds: number | undefined): string => {
    if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) {
        return '—';
    }
    const m = Math.round(seconds / 60);
    if (m < 60) {
        return `${m} min`;
    }
    const h = Math.floor(m / 60);
    const remM = m % 60;
    return remM ? `${h}h ${remM}m` : `${h}h`;
};

export const renderSection = (section: SectionType, ctx: HeadFootRenderCtx): HeadFootRegionOut => {
    switch (section) {
        case 'empty':
            return { text: '', ticking: false, showChromeControl: false };
        case 'title':
            return { text: ctx.mangaTitle ?? '', ticking: false, showChromeControl: false };
        case 'authors':
            return { text: (ctx.mangaAuthors ?? []).join(' & '), ticking: false, showChromeControl: false };
        case 'series':
            return { text: ctx.mangaSeries ?? '', ticking: false, showChromeControl: false };
        case 'top-section':
            return { text: ctx.mangaTitle ?? '', ticking: false, showChromeControl: false };
        case 'section':
            return { text: ctx.chapterName ?? '', ticking: false, showChromeControl: false };
        case 'view-mode':
            return { text: 'Flow', ticking: false, showChromeControl: false };
        case 'view-mode-icon':
            return { text: '☰', ticking: false, showChromeControl: false };
        case 'clock':
            return { text: formatClock(new Date()), ticking: true, showChromeControl: false };
        case 'menu-icon-on-hover':
            return { text: '☰', ticking: false, showChromeControl: true };
        case 'progress':
            return { text: `${Math.round((ctx.bookProgress || 0) * 100)}%`, ticking: false, showChromeControl: false };
        case 'time-book':
            return { text: formatTimeLeft(ctx.timeBookSeconds), ticking: false, showChromeControl: false };
        case 'time-chapter':
            return { text: formatTimeLeft(ctx.timeChapterSeconds), ticking: false, showChromeControl: false };
        case 'time-chapter-book':
            return {
                text: `${formatTimeLeft(ctx.timeChapterSeconds)} (${formatTimeLeft(ctx.timeBookSeconds)})`,
                ticking: false,
                showChromeControl: false,
            };
        case 'pos-book':
            return {
                text: `${ctx.chapterIndex} / ${ctx.chapterCount || '—'}`,
                ticking: false,
                showChromeControl: false,
            };
        case 'pos-chapter':
            return {
                text: `${(ctx.chapterProgress * 100).toFixed(0)}%`,
                ticking: false,
                showChromeControl: false,
            };
        case 'pages-progress':
            if (ctx.screenCount != null && ctx.screenIndex != null) {
                return {
                    text: `${ctx.screenIndex + 1} / ${ctx.screenCount}`,
                    ticking: false,
                    showChromeControl: false,
                };
            }
            return { text: '—', ticking: false, showChromeControl: false };
        default:
            return { text: '', ticking: false, showChromeControl: false };
    }
};

export const regionOrder: HeadFootRegion[] = ['left', 'middle', 'right'];

export const whichOrder: HeadFootWhich[] = ['header', 'footer'];
