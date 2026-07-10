/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import IconButton from '@mui/material/IconButton';
import { useLingui } from '@lingui/react/macro';
import { CustomTooltip } from '@/base/components/CustomTooltip.tsx';

export const SelectableCollectionSelectAllAboveBelow = ({
    canSelectAbove,
    canSelectBelow,
    onSelectAllAbove,
    onSelectAllBelow,
}: {
    canSelectAbove: boolean;
    canSelectBelow: boolean;
    onSelectAllAbove: () => void;
    onSelectAllBelow: () => void;
}) => {
    const { t } = useLingui();

    return (
        <>
            <CustomTooltip title={t`Select all above`} disabled={!canSelectAbove}>
                <IconButton
                    size="small"
                    disabled={!canSelectAbove}
                    onClick={onSelectAllAbove}
                    sx={{ color: 'inherit' }}
                >
                    <ArrowUpwardIcon fontSize="small" />
                </IconButton>
            </CustomTooltip>
            <CustomTooltip title={t`Select all below`} disabled={!canSelectBelow}>
                <IconButton
                    size="small"
                    disabled={!canSelectBelow}
                    onClick={onSelectAllBelow}
                    sx={{ color: 'inherit' }}
                >
                    <ArrowDownwardIcon fontSize="small" />
                </IconButton>
            </CustomTooltip>
        </>
    );
};
