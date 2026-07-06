/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import List from '@mui/material/List';
import Collapse from '@mui/material/Collapse';
import ExpandLess from '@mui/icons-material/ExpandLess';
import ExpandMore from '@mui/icons-material/ExpandMore';
import { useTheme } from '@mui/material/styles';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useLingui } from '@lingui/react/macro';
import type { NavbarSection } from '@/features/navigation-bar/NavigationBar.types.ts';
import type { StaticAppRoute } from '@/base/AppRoute.constants.ts';
import { CustomTooltip } from '@/base/components/CustomTooltip.tsx';
import { TypographyMaxLines } from '@/base/components/texts/TypographyMaxLines.tsx';
import { useNavBarContext } from '@/features/navigation-bar/NavbarContext.tsx';
import { NavigationBarItem } from '@/features/navigation-bar/components/NavigationBarItem.tsx';

export const NavigationBarSection = ({
    section,
    isVisiblePath,
}: {
    section: NavbarSection;
    isVisiblePath: (path: StaticAppRoute) => boolean;
}) => {
    const { t } = useLingui();
    const theme = useTheme();
    const location = useLocation();
    const { isCollapsed } = useNavBarContext();
    const [isExpanded, setIsExpanded] = useState(true);

    const items = (section.items ?? []).filter((item) => isVisiblePath(item.path));
    const placeholders = section.placeholders ?? [];

    if (!items.length && !placeholders.length) {
        return null;
    }

    // Highlight the section header when one of its (real) items is the active route.
    const isActive = items.some((item) => location.pathname.startsWith(item.path));
    const Icon = isActive ? section.SelectedIconComponent : section.IconComponent;

    const highlightSx = {
        color: isActive ? 'primary.dark' : undefined,
        ...theme.applyStyles('dark', {
            color: isActive ? 'primary.light' : undefined,
        }),
    };

    return (
        <>
            <CustomTooltip title={t(section.title)} placement="right">
                <ListItemButton
                    onClick={() => setIsExpanded((prev) => !prev)}
                    sx={{
                        borderRadius: 1,
                        ...(isCollapsed && { p: 0.5, display: 'flex', flexDirection: 'column' }),
                    }}
                >
                    <ListItemIcon sx={isCollapsed ? { justifyContent: 'center' } : undefined}>
                        <Icon sx={highlightSx} />
                    </ListItemIcon>
                    <ListItemText
                        primary={
                            <TypographyMaxLines
                                lines={1}
                                variant={isCollapsed ? 'caption' : undefined}
                                sx={highlightSx}
                            >
                                {t(section.title)}
                            </TypographyMaxLines>
                        }
                        sx={{ maxWidth: '100%', m: 0 }}
                    />
                    {!isCollapsed && (isExpanded ? <ExpandLess sx={highlightSx} /> : <ExpandMore sx={highlightSx} />)}
                </ListItemButton>
            </CustomTooltip>
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                <List disablePadding sx={{ pl: isCollapsed ? 0 : 2 }}>
                    {items.map((item) => (
                        <NavigationBarItem key={item.path} {...item} />
                    ))}
                    {placeholders.map((placeholder) => (
                        <NavigationBarItem
                            key={placeholder.id}
                            title={placeholder.title}
                            IconComponent={placeholder.IconComponent}
                            SelectedIconComponent={placeholder.SelectedIconComponent}
                            disabled
                        />
                    ))}
                </List>
            </Collapse>
        </>
    );
};
