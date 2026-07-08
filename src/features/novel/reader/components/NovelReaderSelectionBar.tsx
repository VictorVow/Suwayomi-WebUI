/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState, type RefObject } from 'react';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CloseIcon from '@mui/icons-material/Close';
import LibraryBooksIcon from '@mui/icons-material/LibraryBooks';
import SearchIcon from '@mui/icons-material/Search';
import { useLingui } from '@lingui/react/macro';
import type { SelectionBarAction } from '@/features/novel/reader/preferences.ts';
import { useNovelReaderSettings } from '@/features/novel/reader/preferences.ts';

/**
 * Calibre's `SelectionBar` analogue: a tiny floating toolbar that appears next
 * to the reader's current text selection and exposes the configured
 * `selection_bar_actions`. Miruyomi's data model has no per-span annotations
 * backend, so `highlight`/`remove_highlight`/`quick_highlight` are excluded;
 * the supported subset here is `{ copy, lookup, search, clear }`.
 *
 * Positioning is based on the bounding rect of `window.getSelection()`. The
 * bar re-positions on `selectionchange`, `scroll`, and `resize`. When the
 * selection is empty or lies outside the reader pane, the bar hides.
 *
 * Drag-to-extend handles and drag-scroll (which calibre implements to suit
 * its paged iframe model) are intentionally omitted — content is plain HTML
 * and the browser's native selection already extends as expected.
 */
export const NovelReaderSelectionBar = ({
    contentRef,
    onLookup,
    onSearch,
}: {
    contentRef: RefObject<HTMLElement | null>;
    onLookup: (word: string) => void;
    onSearch: (initialQuery: string) => void;
}) => {
    const { t } = useLingui();
    const settings = useNovelReaderSettings();
    const [rect, setRect] = useState<{ top: number; left: number; showAbove: boolean } | null>(null);
    const [text, setText] = useState('');

    useEffect(() => {
        if (!settings.show_selection_bar) {
            return undefined;
        }
        const update = () => {
            const sel = window.getSelection();
            const value = (sel?.toString() ?? '').trim();
            if (!value || !contentRef.current) {
                setText('');
                setRect(null);
                return;
            }
            // Only show when selection is fully inside the reader pane.
            const range = sel?.rangeCount ? sel.getRangeAt(0) : null;
            if (!range) {
                setText('');
                setRect(null);
                return;
            }
            const container = contentRef.current;
            if (!container.contains(range.commonAncestorContainer)) {
                setText('');
                setRect(null);
                return;
            }
            const r = range.getBoundingClientRect();
            const showAbove = r.top > 80;
            setRect({
                top: showAbove ? r.top - 8 : r.bottom + 8,
                left: r.left + r.width / 2,
                showAbove,
            });
            setText(value);
        };
        document.addEventListener('selectionchange', update);
        window.addEventListener('scroll', update, true);
        window.addEventListener('resize', update);
        return () => {
            document.removeEventListener('selectionchange', update);
            window.removeEventListener('scroll', update, true);
            window.removeEventListener('resize', update);
        };
    }, [contentRef, settings.show_selection_bar]);

    if (!rect || !text) {
        return null;
    }
    if (!settings.show_selection_bar) {
        return null;
    }

    const handle = (action: SelectionBarAction) => {
        switch (action) {
            case 'copy':
                void navigator.clipboard?.writeText(text).catch(() => {});
                break;
            case 'lookup':
                onLookup(text);
                break;
            case 'search':
                onSearch(text);
                break;
            case 'clear': {
                const sel = window.getSelection();
                if (sel) {
                    sel.removeAllRanges();
                }
                break;
            }
            default:
                break;
        }
    };

    const iconFor: Record<SelectionBarAction, React.ReactNode> = {
        copy: <ContentCopyIcon fontSize="small" />,
        lookup: <LibraryBooksIcon fontSize="small" />,
        search: <SearchIcon fontSize="small" />,
        clear: <CloseIcon fontSize="small" />,
    };
    const labelFor: Record<SelectionBarAction, string> = {
        copy: t`Copy`,
        lookup: t`Lookup`,
        search: t`Search`,
        clear: t`Clear`,
    };

    return (
        <Box
            sx={{
                position: 'fixed',
                top: rect.top,
                left: rect.left,
                transform: `translate(-50%, ${rect.showAbove ? '-100%' : '0'})`,
                zIndex: 50,
                display: 'flex',
                gap: 0.5,
                px: 0.5,
                py: 0.25,
                borderRadius: 1,
                bgcolor: 'rgba(0,0,0,0.75)',
                color: '#fff',
                boxShadow: 2,
                maxWidth: '90vw',
            }}
        >
            {settings.selection_bar_actions.map((action) => (
                <IconButton
                    key={action}
                    size="small"
                    color="inherit"
                    onClick={() => handle(action)}
                    aria-label={labelFor[action]}
                >
                    {iconFor[action]}
                </IconButton>
            ))}
        </Box>
    );
};
