/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useLingui } from '@lingui/react/macro';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';

/**
 * Shared empty-state for the Novel screens. Novel content comes from installed
 * LNReader plugins; when none are set up, this explains how to add them. Pass a
 * `message` specific to the screen (e.g. "No novel sources").
 */
export const NovelUnavailableView = ({ message }: { message?: string }) => {
    const { t } = useLingui();

    return (
        <EmptyViewAbsoluteCentered
            noFaces
            message={message ?? t`No light novels yet`}
            messageExtra={t`Add an LNReader plugin repository under Settings → Browse, then install a novel source from the Extensions tab.`}
        />
    );
};
