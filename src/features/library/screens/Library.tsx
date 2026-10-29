/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type { ChipProps } from '@mui/material/Chip';
import Chip from '@mui/material/Chip';
import Tab from '@mui/material/Tab';
import { styled, useTheme } from '@mui/material/styles';
import { useCallback, useMemo, useState } from 'react';
import { useQueryParam, NumberParam, StringParam } from 'use-query-params';
import Button from '@mui/material/Button';
import { Link } from 'react-router-dom';
import Box from '@mui/material/Box';
import { useLingui } from '@lingui/react/macro';
import { plural } from '@lingui/core/macro';
import { requestManager } from '@/lib/requests/RequestManager.ts';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { LoadingPlaceholder } from '@/base/components/feedback/LoadingPlaceholder.tsx';
import { TabPanel } from '@/base/components/tabs/TabPanel.tsx';
import { LibraryToolbarMenu } from '@/features/library/components/LibraryToolbarMenu.tsx';
import { LibraryMangaGrid } from '@/features/library/components/LibraryMangaGrid.tsx';
import { AppbarSearch } from '@/base/components/AppbarSearch.tsx';
import { UpdateChecker } from '@/features/updates/components/UpdateChecker.tsx';
import { useSelectableCollection } from '@/base/collection/hooks/useSelectableCollection.ts';
import { SelectableCollectionSelectMode } from '@/base/collection/components/SelectableCollectionSelectMode.tsx';
import { useGetVisibleLibraryMangas } from '@/features/library/hooks/useGetVisibleLibraryMangas.ts';
import { SelectionFAB } from '@/base/collection/components/SelectionFAB.tsx';
import { MangaActionMenuItems } from '@/features/manga/components/MangaActionMenuItems.tsx';
import { TabsMenu } from '@/base/components/tabs/TabsMenu.tsx';
import { TabsWrapper } from '@/base/components/tabs/TabsWrapper.tsx';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';
import type {
    GetCategoriesLibraryQuery,
    GetCategoriesLibraryQueryVariables,
    GetMangasLibraryQuery,
    GetMangasLibraryQueryVariables,
    GetLibraryMangaCountQuery,
    GetLibraryMangaCountQueryVariables,
    MangaChapterStatFieldsFragment,
} from '@/lib/graphql/generated/graphql.ts';
import { GET_CATEGORIES_LIBRARY } from '@/lib/graphql/category/CategoryQuery.ts';
import { Mangas } from '@/features/manga/services/Mangas.ts';
import { MANGA_CHAPTER_STAT_FIELDS } from '@/lib/graphql/manga/MangaFragments.ts';
import { useMetadataServerSettings } from '@/features/settings/services/ServerSettingsMetadata.ts';
import { GET_LIBRARY_MANGA_COUNT, GET_MANGAS_LIBRARY } from '@/lib/graphql/manga/MangaQuery.ts';
import { useAppTitle } from '@/features/navigation-bar/hooks/useAppTitle.ts';
import { useAppAction } from '@/features/navigation-bar/hooks/useAppAction.ts';
import { AppRoutes } from '@/base/AppRoute.constants.ts';
import { SearchParam } from '@/base/Base.types.ts';
import { STABLE_EMPTY_ARRAY } from '@/base/Base.constants.ts';
import type { MangaIdInfo } from '@/features/manga/Manga.types.ts';
import { ContentType } from '@/lib/graphql/generated/graphql-base.types.ts';

export interface LibraryProps {
    contentType?: ContentType;
    title?: string;
    searchAllPath?: (query?: string | null) => string;
    emptyLibraryMessage?: string;
    emptyCategoryMessage?: string;
    failedToLoadMessage?: string;
}

const TitleWithSizeTag = styled('span')({
    display: 'flex',
    alignItems: 'center',
});

const TitleSizeTag = ({ sx, ...props }: ChipProps) => (
    <Chip {...props} size="small" sx={{ ...sx, marginLeft: '5px' }} />
);

export function Library({
    contentType = ContentType.Manga,
    title,
    searchAllPath,
    emptyLibraryMessage,
    emptyCategoryMessage,
    failedToLoadMessage,
}: LibraryProps = {}) {
    const { t } = useLingui();
    const theme = useTheme();

    const {
        settings: { showTabSize },
    } = useMetadataServerSettings();

    const {
        data: categoriesResponse,
        error: tabsError,
        loading: areCategoriesLoading,
        refetch: refetchCategories,
    } = requestManager.useGetCategories<GetCategoriesLibraryQuery, GetCategoriesLibraryQueryVariables>(
        GET_CATEGORIES_LIBRARY,
        undefined,
        { mangaContentType: contentType },
    );
    // `category.mangas.totalCount` is scoped to `contentType` on the server
    // (see CategoryType.mangas resolver), so a category holding only the other
    // two content types — or an empty category — is hidden from this library.
    const tabsData = categoriesResponse?.categories.nodes.filter((category) => category.mangas.totalCount > 0);
    const tabs = tabsData ?? STABLE_EMPTY_ARRAY;

    const librarySizeResponse = requestManager.useGetMangas<
        GetLibraryMangaCountQuery,
        GetLibraryMangaCountQueryVariables
    >(GET_LIBRARY_MANGA_COUNT, { contentType });

    const librarySize = librarySizeResponse.data?.mangas.totalCount ?? 0;

    const [tabSearchParam, setTabSearchParam] = useQueryParam(SearchParam.TAB, NumberParam);
    const [query] = useQueryParam(SearchParam.QUERY, StringParam);
    // ?extension=<pkgName> — linked from an extension's info page; shows only
    // the library items sourced from that extension, bypassing category tabs.
    const [extensionFilter] = useQueryParam('extension', StringParam);

    const activeTab: (typeof tabs)[number] | undefined = tabs.find((tab) => tab.id === tabSearchParam) ?? tabs[0];

    const {
        data: categoryMangaResponse,
        error: mangaError,
        loading: mangaLoading,
        refetch: refetchCategoryMangas,
    } = requestManager.useGetCategoryMangas(activeTab?.id, { skip: !activeTab || !!extensionFilter }, contentType);

    const extensionSourcesResponse = requestManager.useGetSourceList(undefined, { skip: !extensionFilter });
    const extensionSourceIds = useMemo(
        () =>
            (extensionSourcesResponse.data?.sources.nodes ?? [])
                .filter((source) => source.extension.pkgName === extensionFilter)
                .map((source) => source.id),
        [extensionSourcesResponse.data, extensionFilter],
    );
    const extensionMangaResponse = requestManager.useGetMangas<GetMangasLibraryQuery, GetMangasLibraryQueryVariables>(
        GET_MANGAS_LIBRARY,
        {
            condition: { inLibrary: true, contentType },
            filter: { sourceId: { in: extensionSourceIds } },
        },
        { skip: !extensionFilter || !extensionSourceIds.length },
    );
    const categoryMangas = extensionFilter
        ? (extensionMangaResponse.data?.mangas.nodes ?? STABLE_EMPTY_ARRAY)
        : (categoryMangaResponse?.mangas.nodes ?? STABLE_EMPTY_ARRAY);
    const {
        visibleMangas: mangas,
        showFilteredOutMessage,
        filterKey,
    } = useGetVisibleLibraryMangas(categoryMangas, activeTab);

    const retryFetchCategoryMangas = useCallback(
        () => refetchCategoryMangas().catch(defaultPromiseErrorHandler('Library::refetchCategoryMangas')),
        [refetchCategoryMangas, activeTab],
    );

    const effMangaError = extensionFilter ? extensionMangaResponse.error : mangaError;
    const effMangaLoading = extensionFilter ? extensionMangaResponse.loading : mangaLoading;
    const effRetry = extensionFilter
        ? () => extensionMangaResponse.refetch().catch(defaultPromiseErrorHandler('Library::refetchExtensionMangas'))
        : retryFetchCategoryMangas;

    const mangaIds = useMemo(() => mangas.map((manga) => manga.id), [mangas]);

    const [isSelectModeActive, setIsSelectModeActive] = useState(false);
    const {
        areNoItemsForKeySelected: areNoItemsSelected,
        areAllItemsForKeySelected: areAllItemsSelected,
        selectedItemIds,
        handleSelectAll,
        handleSelection,
        clearSelection,
    } = useSelectableCollection<MangaIdInfo['id'], string>(mangas.length, {
        itemIds: mangaIds,
        currentKey: activeTab?.id.toString(),
        initialState: undefined,
    });

    const handleSelect: typeof handleSelection = useCallback(
        (id, selected, selectOptions) => {
            setIsSelectModeActive(!!(selectedItemIds.length + (selected ? 1 : -1)));
            handleSelection(id, selected, selectOptions);
        },
        [setIsSelectModeActive, handleSelection],
    );

    const selectedMangas = useMemo(
        () =>
            selectedItemIds
                .map((id) =>
                    Mangas.getFromCache<MangaChapterStatFieldsFragment>(
                        id,
                        MANGA_CHAPTER_STAT_FIELDS,
                        'MANGA_CHAPTER_STAT_FIELDS',
                    ),
                )
                .filter((manga) => !!manga),
        [selectedItemIds.length, mangas],
    );

    const selectionFab = useMemo(() => {
        if (!isSelectModeActive) {
            return null;
        }

        return (
            <SelectionFAB title={plural(selectedItemIds.length, { one: '# manga', other: '# manga' })}>
                {(handleClose, setHideMenu) => (
                    <MangaActionMenuItems
                        selectedMangas={selectedMangas}
                        onClose={() => {
                            handleClose();
                            setIsSelectModeActive(false);
                            clearSelection();
                        }}
                        setHideMenu={setHideMenu}
                    />
                )}
            </SelectionFAB>
        );
    }, [isSelectModeActive, selectedMangas]);

    const resolveSearchAllPath = searchAllPath ?? AppRoutes.sources.children.searchAll.path;
    const triggerGlobalSearchButton = useMemo(
        () =>
            !!query && (
                <Box sx={{ p: 2 }}>
                    <Button
                        size="large"
                        component={Link}
                        to={resolveSearchAllPath(query)}
                        sx={{ textTransform: 'none', width: '100%' }}
                    >
                        {t`Search for "${query}" globally`}
                    </Button>
                </Box>
            ),
        [query, resolveSearchAllPath],
    );

    const libraryTitle = title ?? t`Library`;
    useAppTitle(
        <TitleWithSizeTag>
            {libraryTitle}
            {showTabSize && (
                <TitleSizeTag
                    sx={{ ...theme.applyStyles('light', { backgroundColor: 'background.paper' }) }}
                    label={librarySize}
                />
            )}
        </TitleWithSizeTag>,
        libraryTitle,
        [t, showTabSize, librarySize, libraryTitle],
    );
    useAppAction(
        <>
            {!isSelectModeActive && activeTab && (
                <>
                    <AppbarSearch />
                    <LibraryToolbarMenu category={activeTab} />
                    <UpdateChecker categoryId={activeTab?.id} />
                </>
            )}
            {!!mangas.length && (
                <SelectableCollectionSelectMode
                    isActive={isSelectModeActive}
                    areAllItemsSelected={areAllItemsSelected}
                    areNoItemsSelected={areNoItemsSelected}
                    onSelectAll={(selectAll) =>
                        handleSelectAll(selectAll, [...new Set(mangas.map((manga) => manga.id))])
                    }
                    onModeChange={(checked) => {
                        setIsSelectModeActive(checked);

                        if (checked) {
                            handleSelectAll(true, [...new Set(mangas.map((manga) => manga.id))]);
                        } else {
                            tabs.forEach((tab) => handleSelectAll(false, [], tab.id.toString()));
                        }
                    }}
                />
            )}
        </>,
        [isSelectModeActive, areNoItemsSelected, areAllItemsSelected, activeTab, mangas.length],
    );

    const handleTabChange = (newTab: number) => {
        setTabSearchParam(newTab);
    };

    if (tabsError != null || librarySizeResponse.error) {
        return (
            <EmptyViewAbsoluteCentered
                message={t`Unable to load data`}
                messageExtra={tabsError?.message ?? librarySizeResponse.error?.message}
                retry={() => {
                    if (tabsError) {
                        refetchCategories().catch(defaultPromiseErrorHandler('Library::refetchCategories'));
                    }

                    if (librarySizeResponse.error) {
                        librarySizeResponse.refetch().catch(defaultPromiseErrorHandler('Library::refetchLibrarySize'));
                    }
                }}
            />
        );
    }

    if (areCategoriesLoading || librarySizeResponse.loading) {
        return <LoadingPlaceholder />;
    }

    if (!extensionFilter && tabs.length === 0) {
        return <EmptyViewAbsoluteCentered message={emptyLibraryMessage ?? t`Your library is empty`} />;
    }

    if (extensionFilter || tabs.length === 1) {
        return (
            <>
                {triggerGlobalSearchButton}
                <LibraryMangaGrid
                    // the key needs to include filters and query to force a re-render of the virtuoso grid to prevent https://github.com/petyosi/react-virtuoso/issues/1242
                    key={filterKey}
                    mangas={mangas}
                    message={
                        effMangaError
                            ? (failedToLoadMessage ?? t`Could not load manga`)
                            : (emptyLibraryMessage ?? t`Your library is empty`)
                    }
                    messageExtra={effMangaError?.message}
                    isLoading={effMangaLoading}
                    selectedMangaIds={selectedItemIds}
                    isSelectModeActive={isSelectModeActive}
                    handleSelection={handleSelect}
                    showFilteredOutMessage={!effMangaError && showFilteredOutMessage}
                    retry={effMangaError && effRetry}
                />
                {selectionFab}
            </>
        );
    }

    return (
        <TabsWrapper>
            <TabsMenu value={activeTab.id} onChange={(e, newTab) => handleTabChange(newTab)}>
                {tabs.map((tab) => (
                    <Tab
                        sx={{ flexGrow: 1, maxWidth: 'unset' }}
                        key={tab.id}
                        label={
                            <TitleWithSizeTag>
                                {tab.name}
                                {showTabSize ? <TitleSizeTag label={tab.mangas.totalCount} /> : null}
                            </TitleWithSizeTag>
                        }
                        value={tab.id}
                    />
                ))}
            </TabsMenu>
            {triggerGlobalSearchButton}
            {tabs.map((tab) => (
                <TabPanel key={tab.order} index={tab.order} currentIndex={activeTab.order}>
                    {tab === activeTab && (
                        <LibraryMangaGrid
                            // the key needs to include filters and query to force a re-render of the virtuoso grid to prevent https://github.com/petyosi/react-virtuoso/issues/1242
                            key={filterKey}
                            mangas={mangas}
                            message={
                                mangaError
                                    ? (failedToLoadMessage ?? t`Could not load manga`)
                                    : (emptyCategoryMessage ?? t`The category is empty`)
                            }
                            messageExtra={mangaError?.message}
                            isLoading={mangaLoading}
                            selectedMangaIds={selectedItemIds}
                            isSelectModeActive={isSelectModeActive}
                            handleSelection={handleSelect}
                            showFilteredOutMessage={!mangaError && showFilteredOutMessage}
                            retry={mangaError && retryFetchCategoryMangas}
                        />
                    )}
                </TabPanel>
            ))}
            {selectionFab}
        </TabsWrapper>
    );
}
