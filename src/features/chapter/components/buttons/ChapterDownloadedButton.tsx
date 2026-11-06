/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import IconButton from '@mui/material/IconButton';
import DownloadDoneIcon from '@mui/icons-material/DownloadDone';
import { useLingui } from '@lingui/react/macro';
import { CustomTooltip } from '@/base/components/CustomTooltip.tsx';
import { Chapters } from '@/features/chapter/services/Chapters.ts';
import { defaultPromiseErrorHandler } from '@/lib/DefaultPromiseErrorHandler.ts';
import { useMetadataServerSettings } from '@/features/settings/services/ServerSettingsMetadata.ts';
import { MUIUtil } from '@/lib/mui/MUI.util.ts';
import type {
    ChapterDownloadInfo,
    ChapterBookmarkInfo,
    ChapterIdInfo,
    ChapterSizeInfo,
} from '@/features/chapter/Chapter.types.ts';

const formatSize = (size?: string | null): string => {
    const bytes = size == null ? null : Number(size);
    if (bytes == null || Number.isNaN(bytes)) {
        return '';
    }
    if (bytes < 1024 * 1024) {
        return `${(bytes / 1024).toFixed(0)} KB`;
    }
    if (bytes < 1024 * 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

export const ChapterDownloadedButton = ({
    chapter,
}: {
    chapter: ChapterIdInfo & ChapterDownloadInfo & ChapterBookmarkInfo & ChapterSizeInfo;
}) => {
    const { t } = useLingui();
    const {
        settings: { deleteChaptersWithBookmark },
    } = useMetadataServerSettings();

    const size = formatSize(chapter.size);

    return (
        <CustomTooltip title={size ? t`Downloaded (${size})` : t`Downloaded`}>
            <IconButton
                {...MUIUtil.preventRippleProp()}
                disabled={!Chapters.isDeletable(chapter, deleteChaptersWithBookmark)}
                onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    Chapters.delete([chapter.id]).catch(defaultPromiseErrorHandler('ChapterDownloadedButton::delete'));
                }}
            >
                <DownloadDoneIcon color="success" />
            </IconButton>
        </CustomTooltip>
    );
};
