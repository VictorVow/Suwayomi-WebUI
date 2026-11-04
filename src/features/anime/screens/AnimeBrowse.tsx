/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useCallback, useRef, useState } from 'react';
import Tab from '@mui/material/Tab';
import { StringParam, useQueryParam } from 'use-query-params';
import { useLingui } from '@lingui/react/macro';
import { TabPanel } from '@/base/components/tabs/TabPanel.tsx';
import { TabsWrapper } from '@/base/components/tabs/TabsWrapper.tsx';
import { TabsMenu } from '@/base/components/tabs/TabsMenu.tsx';
import { useResizeObserver } from '@/base/hooks/useResizeObserver.tsx';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { SearchParam } from '@/base/Base.types.ts';
import { GROUPED_VIRTUOSO_Z_INDEX } from '@/lib/virtuoso/Virtuoso.constants.ts';
import { AnimeBrowseTab } from '@/features/anime/Anime.types.ts';
import { Sources } from '@/features/browse/sources/Sources.tsx';
import { Extensions } from '@/features/browse/extensions/Extensions.tsx';

export function AnimeBrowse() {
    const { t } = useLingui();
    useAppTitle(t`Browse anime`);

    const tabsMenuRef = useRef<HTMLDivElement | null>(null);
    const [tabsMenuHeight, setTabsMenuHeight] = useState(0);
    useResizeObserver(
        tabsMenuRef,
        useCallback(() => setTabsMenuHeight(tabsMenuRef.current!.offsetHeight), [tabsMenuRef.current]),
    );

    const [tabSearchParam, setTabSearchParam] = useQueryParam(SearchParam.TAB, StringParam, {});
    const tabName = (tabSearchParam as AnimeBrowseTab) ?? AnimeBrowseTab.SOURCES;

    if (!tabSearchParam) {
        setTabSearchParam(tabName, 'replaceIn');
    }

    return (
        <TabsWrapper>
            <TabsMenu
                ref={tabsMenuRef}
                sx={{ zIndex: GROUPED_VIRTUOSO_Z_INDEX }}
                variant="fullWidth"
                value={tabName}
                onChange={(_, newTab) => setTabSearchParam(newTab, 'replaceIn')}
            >
                <Tab value={AnimeBrowseTab.SOURCES} sx={{ textTransform: 'none' }} label={t`Source`} />
                <Tab value={AnimeBrowseTab.EXTENSIONS} sx={{ textTransform: 'none' }} label={t`Extension`} />
            </TabsMenu>
            <TabPanel index={AnimeBrowseTab.SOURCES} currentIndex={tabName}>
                <Sources tabsMenuHeight={tabsMenuHeight} scope="anime" />
            </TabPanel>
            <TabPanel index={AnimeBrowseTab.EXTENSIONS} currentIndex={tabName}>
                <Extensions tabsMenuHeight={tabsMenuHeight} scope="anime" />
            </TabPanel>
        </TabsWrapper>
    );
}
