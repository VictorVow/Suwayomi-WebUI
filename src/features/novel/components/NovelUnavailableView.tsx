/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useLingui } from '@lingui/react/macro';
import { EmptyViewAbsoluteCentered } from '@/base/components/feedback/EmptyViewAbsoluteCentered.tsx';
import { NOVEL_BACKEND } from '@/features/novel/services/NovelApi.ts';

/**
 * Shared empty-state shown by every Novel screen while the server does not
 * expose an LNReader / novel extension API. Pass a `context`-specific line
 * (e.g. "No novel sources") as the headline.
 */
export const NovelUnavailableView = ({ message }: { message?: string }) => {
    const { t } = useLingui();

    return (
        <EmptyViewAbsoluteCentered
            noFaces
            message={message ?? t`Light novels aren't available yet`}
            messageExtra={NOVEL_BACKEND.reason}
        />
    );
};
