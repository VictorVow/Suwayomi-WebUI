/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useMemo } from 'react';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import SettingsIcon from '@mui/icons-material/Settings';
import { StringParam, useQueryParam } from 'use-query-params';
import { Link } from 'react-router-dom';
import { useLingui } from '@lingui/react/macro';
import { CustomTooltip } from '@/base/components/CustomTooltip.tsx';
import { AppbarSearch } from '@/base/components/AppbarSearch.tsx';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { LanguageSelect } from '@/base/components/inputs/LanguageSelect.tsx';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { SearchParam } from '@/base/Base.types.ts';
import { useAppAction } from '@/features/navigation-bar/hooks/useAppAction.ts';
import { useShowExtensionList } from '@/features/show/services/ShowApi.ts';
import { ShowUnavailableView } from '@/features/show/components/ShowUnavailableView.tsx';
import { ExtensionCard } from '@/features/browse/extensions/components/ExtensionCard.tsx';
import { filterExtensions, getLanguagesFromExtensions } from '@/features/extension/Extensions.utils.ts';
import { useMetadataServerSettings } from '@/features/settings/services/ServerSettingsMetadata.ts';
import { Sources } from '@/features/source/services/Sources.ts';

export const ShowExtensionsTab = () => {
    const { t } = useLingui();
    const { data: extensions, loading, available, refetch } = useShowExtensionList();

    const { languages: shownLangs, setLanguages: setShownLangs } = Sources.useLanguages();
    const {
        settings: { showNsfw },
    } = useMetadataServerSettings();

    const [query] = useQueryParam(SearchParam.QUERY, StringParam);

    const allLangs = useMemo(() => getLanguagesFromExtensions(extensions), [extensions]);

    const filteredExtensions = useMemo(
        () => filterExtensions(extensions, { selectedLanguages: shownLangs, showNsfw, query }),
        [extensions, shownLangs, showNsfw, query],
    );

    useAppAction(
        <>
            <AppbarSearch />
            <LanguageSelect selectedLanguages={shownLangs} setSelectedLanguages={setShownLangs} languages={allLangs} />
            <CustomTooltip title={t`Settings`}>
                <IconButton component={Link} to={AppRoutes.settings.children.browse.path} color="inherit">
                    <SettingsIcon />
                </IconButton>
            </CustomTooltip>
        </>,
        [t, shownLangs, allLangs],
    );

    if (loading) {
        return <LoadingPlaceholder />;
    }

    if (!available || !extensions.length) {
        return <ShowUnavailableView message={t`No show extensions`} />;
    }

    if (!filteredExtensions.length) {
        return <ShowUnavailableView message={t`No extensions found`} />;
    }

    return (
        <Stack sx={{ gap: 1, p: 1 }}>
            {filteredExtensions.map((extension) => (
                <ExtensionCard
                    key={extension.pkgName}
                    extension={extension}
                    handleUpdate={() => refetch()}
                    showSourceRepo={false}
                />
            ))}
        </Stack>
    );
};
