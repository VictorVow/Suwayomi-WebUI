/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { useNovelReaderSettings } from '@/features/novel/reader/preferences.ts';

/**
 * Chrome auto-hide timer — calibre-style "reveal on user activity, schedule
 * hide after N ms". When `auto_hide_chrome_ms === 0` the chrome stays
 * persistent (matches the existing reader behavior). Reveals trigger on
 * pointer move, pointer down, or scroll inside the content pane; the hide
 * timer resets on each reveal. A `reveal()` is also exposed so other
 * interactions (e.g. opening a panel) can directly un-hide the chrome.
 */
export const useChromeAutohide = (contentRef: RefObject<HTMLElement | null>) => {
    const settings = useNovelReaderSettings();
    const [visible, setVisible] = useState(true);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const scheduleHide = useCallback(() => {
        if (!settings.auto_hide_chrome_ms || settings.auto_hide_chrome_ms <= 0) {
            return;
        }
        if (hideTimerRef.current) {
            clearTimeout(hideTimerRef.current);
        }
        hideTimerRef.current = setTimeout(() => {
            setVisible(false);
        }, settings.auto_hide_chrome_ms);
    }, [settings.auto_hide_chrome_ms]);

    const reveal = useCallback(() => {
        setVisible(true);
        scheduleHide();
    }, [scheduleHide]);

    useEffect(() => {
        const el = contentRef.current;
        if (!el || !settings.auto_hide_chrome_ms) {
            return undefined;
        }
        const onActivity = () => reveal();
        el.addEventListener('pointermove', onActivity);
        el.addEventListener('pointerdown', onActivity);
        el.addEventListener('scroll', onActivity, { passive: true });
        reveal();
        return () => {
            el.removeEventListener('pointermove', onActivity);
            el.removeEventListener('pointerdown', onActivity);
            el.removeEventListener('scroll', onActivity);
            if (hideTimerRef.current) {
                clearTimeout(hideTimerRef.current);
            }
        };
    }, [contentRef, reveal, settings.auto_hide_chrome_ms]);

    return { visible, reveal, setVisible };
};
