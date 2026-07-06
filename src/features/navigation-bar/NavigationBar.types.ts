/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { MessageDescriptor } from '@lingui/core';
import type { OverridableComponent } from '@mui/material/OverridableComponent';
import type { SvgIconTypeMap } from '@mui/material/SvgIcon';
import type { ReactNode } from 'react';
import type { StaticAppRoute } from '@/base/AppRoute.constants.ts';

export interface INavbarOverride {
    status: boolean;
    value: any;
}

export enum NavBarItemMoreGroup {
    GENERAL,
    HIDDEN_ITEM,
    SETTING_INFO,
}

export interface NavbarItem {
    path: StaticAppRoute;
    title: MessageDescriptor;
    moreTitle?: MessageDescriptor;
    SelectedIconComponent: OverridableComponent<SvgIconTypeMap<object, 'svg'>>;
    IconComponent: OverridableComponent<SvgIconTypeMap<object, 'svg'>>;
    show: 'mobile' | 'desktop' | 'both';
    moreGroup: NavBarItemMoreGroup;
    useBadge?: () => { count: number; title: string };
}

/**
 * A not-yet-implemented navigation item rendered inside a section as a disabled
 * placeholder. It has no route and does not navigate anywhere.
 */
export interface NavbarPlaceholderItem {
    id: string;
    title: MessageDescriptor;
    SelectedIconComponent: OverridableComponent<SvgIconTypeMap<object, 'svg'>>;
    IconComponent: OverridableComponent<SvgIconTypeMap<object, 'svg'>>;
}

/**
 * A collapsible section header in the desktop sidebar. It is not a page itself,
 * it only groups (and can show/hide) its child items.
 */
export interface NavbarSection {
    id: string;
    title: MessageDescriptor;
    SelectedIconComponent: OverridableComponent<SvgIconTypeMap<object, 'svg'>>;
    IconComponent: OverridableComponent<SvgIconTypeMap<object, 'svg'>>;
    /** real, navigable items */
    items?: NavbarItem[];
    /** placeholder (not-yet-implemented) items */
    placeholders?: NavbarPlaceholderItem[];
}

/**
 * An ordered entry in the desktop sidebar: either a standalone navigable item
 * (rendered outside of any section) or a collapsible section.
 */
export type NavbarEntry = { kind: 'item'; item: NavbarItem } | { kind: 'section'; section: NavbarSection };

export type NavbarContextType = {
    // AppBar title
    title: string | React.ReactNode;
    setTitle: (title: NavbarContextType['title'], browserTitle?: string) => void;

    appBarHeight: number;
    setAppBarHeight: React.Dispatch<React.SetStateAction<number>>;

    // AppBar action buttons
    action: ReactNode;
    setAction: React.Dispatch<React.SetStateAction<ReactNode>>;

    // Allow default navbar to be overrided
    override: INavbarOverride;
    setOverride: React.Dispatch<React.SetStateAction<INavbarOverride>>;

    // NavBar
    isCollapsed: boolean;
    setIsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;

    navBarWidth: number;
    setNavBarWidth: React.Dispatch<React.SetStateAction<number>>;

    readerNavBarWidth: number;
    setReaderNavBarWidth: React.Dispatch<React.SetStateAction<number>>;

    bottomBarHeight: number;
    setBottomBarHeight: React.Dispatch<React.SetStateAction<number>>;
};
