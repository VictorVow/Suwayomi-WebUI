/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useState, type RefObject } from 'react';

const ALL_MATCHES_HIGHLIGHT = 'novel-reader-search';
const CURRENT_MATCH_HIGHLIGHT = 'novel-reader-search-current';

/** Whether the browser supports the CSS Custom Highlight API used to mark matches without touching the DOM. */
const isHighlightApiSupported = (): boolean =>
    typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined';

const clearHighlights = () => {
    if (!isHighlightApiSupported()) {
        return;
    }
    CSS.highlights.delete(ALL_MATCHES_HIGHLIGHT);
    CSS.highlights.delete(CURRENT_MATCH_HIGHLIGHT);
};

/**
 * Client-side "find in chapter" search over the currently rendered chapter
 * text. There is no full-text search backend for lnreader chapters, so this
 * only searches the DOM text content that is already on screen — matches do
 * not cross text-node boundaries (i.e. across inline tags like `<em>`), which
 * covers the overwhelming majority of chapter prose (plain paragraphs).
 *
 * Uses the CSS Custom Highlight API so matches are painted without mutating
 * the sanitized chapter HTML (which would otherwise fight React's rendering
 * of `dangerouslySetInnerHTML`). Gracefully does nothing on browsers without
 * support (Safari < 17.4, Firefox without the flag): the query still updates,
 * but no matches are found or highlighted.
 */
export const useChapterTextSearch = (contentRef: RefObject<HTMLElement | null>, query: string) => {
    const [matchCount, setMatchCount] = useState(0);
    const [currentIndex, setCurrentIndex] = useState(0);
    const supported = useMemo(isHighlightApiSupported, []);

    const ranges = useMemo<Range[]>(() => {
        const container = contentRef.current;
        if (!supported || !container || !query.trim()) {
            return [];
        }

        const needle = query.trim().toLowerCase();
        const found: Range[] = [];
        const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);

        let node = walker.nextNode();
        while (node) {
            const text = node.textContent ?? '';
            const lowerText = text.toLowerCase();
            let fromIndex = 0;
            let matchIndex = lowerText.indexOf(needle, fromIndex);
            while (matchIndex !== -1) {
                const range = document.createRange();
                range.setStart(node, matchIndex);
                range.setEnd(node, matchIndex + needle.length);
                found.push(range);
                fromIndex = matchIndex + needle.length;
                matchIndex = lowerText.indexOf(needle, fromIndex);
            }
            node = walker.nextNode();
        }

        return found;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [contentRef.current, query, supported]);

    useEffect(() => {
        setMatchCount(ranges.length);
        setCurrentIndex(0);

        if (!supported) {
            return undefined;
        }

        if (!ranges.length) {
            clearHighlights();
            return undefined;
        }

        CSS.highlights.set(ALL_MATCHES_HIGHLIGHT, new Highlight(...ranges));
        CSS.highlights.set(CURRENT_MATCH_HIGHLIGHT, new Highlight(ranges[0]));

        return clearHighlights;
    }, [ranges, supported]);

    const goToMatch = (index: number) => {
        if (!ranges.length) {
            return;
        }
        const nextIndex = ((index % ranges.length) + ranges.length) % ranges.length;
        setCurrentIndex(nextIndex);
        if (supported) {
            CSS.highlights.set(CURRENT_MATCH_HIGHLIGHT, new Highlight(ranges[nextIndex]));
        }

        const rangeRect = ranges[nextIndex].getBoundingClientRect();
        if (rangeRect.top !== 0 || rangeRect.bottom !== 0) {
            ranges[nextIndex].startContainer.parentElement?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    };

    return {
        supported,
        matchCount,
        currentIndex,
        goToNext: () => goToMatch(currentIndex + 1),
        goToPrevious: () => goToMatch(currentIndex - 1),
    };
};
