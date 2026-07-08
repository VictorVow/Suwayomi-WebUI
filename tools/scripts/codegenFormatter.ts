/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import fs from 'fs';
import * as path from 'path';

const format = (source: string, regex: RegExp | string, replaceValue: string): string =>
    source.replace(regex, replaceValue);

/* ******************************************* */
/*                                             */
/*      typescript, typescript-operations      */
/*                                             */
/* ******************************************* */

{
    const generatedGraphQLFilePath = path.resolve(import.meta.dirname, '../../src/lib/graphql/generated/graphql.ts');
    const generatedGraphQLFile = fs.readFileSync(generatedGraphQLFilePath, 'utf8');

    // graphql-codegen emits e.g. `useFooSubscriptionSubscription`; drop the
    // duplicate suffix so hooks are named `useFooSubscription`.
    const fixSubscriptionHookNameSuffix = format(generatedGraphQLFile, /SubscriptionSubscription/g, 'Subscription');

    fs.writeFileSync(generatedGraphQLFilePath, fixSubscriptionHookNameSuffix);
}

/* ****************************************** */
/*                                            */
/*      typescript-apollo-client-helpers      */
/*                                            */
/* ****************************************** */

/*
 * graphql-codegen's `typescript-apollo-client-helpers` plugin emits a
 * `QueryFieldPolicy` whose fields are all `FieldPolicy<any> | FieldReadFunction<any>`.
 * The project upgrades a handful of them to typed operation hooks
 * (`FieldFunctionOptions<...Variables>` + `Reference`) so the Apollo cache
 * helpers know the query variable shapes.
 *
 * Previously the upgrade was a single `String.replace` over the *entire*
 * `QueryFieldPolicy` block, hardcoded to a specific field set. As soon as the
 * schema gained a new Query field (e.g. `lastSyncStatus`, `mangaRelated`) that
 * wasn't in the hardcoded block, the search string stopped matching — but the
 * companion `addImports` pass still ran unconditionally, injecting
 * `Reference`/`FieldFunctionOptions` imports that nothing consumed, breaking
 * `tsc` (TS6133/TS6192).
 *
 * The rewrite below scopes each upgrade to the `QueryFieldPolicy` block and
 * upgrades one field at a time via targeted regex. New/unknown Query fields
 * stay at the codegen `any` default (the original behaviour for any field the
 * script didn't know about), and the typed imports are added ONLY when at
 * least one upgrade actually consumed `Reference`/`FieldFunctionOptions`.
 * This keeps the script resilient to schema drift and `tsc` clean regardless
 * of which fields the schema exposes.
 */
{
    const generatedGraphQLFilePath = path.resolve(
        import.meta.dirname,
        '../../src/lib/graphql/generated/apollo-helpers.ts',
    );
    let file = fs.readFileSync(generatedGraphQLFilePath, 'utf8');

    // Each entry is [fieldName, FieldPolicy<...> args, FieldReadFunction<...> args],
    // derived from the upgrade block the original script hardcoded. The named
    // operation document/variable types live in graphql.ts next to this file.
    const queryFieldUpgrades: ReadonlyArray<readonly [string, string, string]> = [
        ['chapters', "GetChaptersMangaQuery['chapters']", "GetChaptersMangaQuery['chapters']"],
        [
            'downloadStatus',
            'Reference, Reference, Reference, FieldFunctionOptions<GetDownloadStatusQueryVariables>',
            'Reference, Reference, FieldFunctionOptions<GetDownloadStatusQueryVariables>',
        ],
        [
            'getWebUIUpdateStatus',
            'Reference, Reference, Reference, FieldFunctionOptions<GetWebuiUpdateStatusQueryVariables>',
            'Reference, Reference, FieldFunctionOptions<GetWebuiUpdateStatusQueryVariables>',
        ],
        [
            'libraryUpdateStatus',
            'Reference, Reference, Reference, FieldFunctionOptions<GetUpdateStatusQueryVariables>',
            'Reference, Reference, FieldFunctionOptions<GetUpdateStatusQueryVariables>',
        ],
        [
            'manga',
            'Reference, Reference, Reference, FieldFunctionOptions<GetMangaScreenQueryVariables>',
            'Reference, Reference, FieldFunctionOptions<GetMangaScreenQueryVariables>',
        ],
        [
            'meta',
            'Reference, Reference, Reference, FieldFunctionOptions<GetGlobalMetadataQueryVariables>',
            'Reference, Reference, FieldFunctionOptions<GetGlobalMetadataQueryVariables>',
        ],
        [
            'source',
            'Reference, Reference, Reference, FieldFunctionOptions<GetSourceBrowseQueryVariables>',
            'Reference, Reference, FieldFunctionOptions<GetSourceBrowseQueryVariables>',
        ],
    ];

    // Scope every upgrade to the QueryFieldPolicy block so the same field name
    // appearing in another type's `*FieldPolicy` isn't touched. The block runs
    // from `export type QueryFieldPolicy = {` to the first `};` that closes it.
    const blockRe = /^export type QueryFieldPolicy = \{([\s\S]*?)\n\};/m;
    let upgradedAny = false;
    file = file.replace(blockRe, (_block, body: string) => {
        let next = body;
        for (const [name, fieldPolicyArgs, fieldReadFunctionArgs] of queryFieldUpgrades) {
            // Matches e.g. `\tmanga?: FieldPolicy<any> | FieldReadFunction<any>,`
            // Leading whitespace is matched (and preserved via $1) so the
            // upgrade is tolerant of tab/space indentation and depth.
            const lineRe = new RegExp(`^(\\s*${name}\\?: FieldPolicy)<any> \\| FieldReadFunction<any>(,?)$`, 'm');
            const before = next;
            next = next.replace(lineRe, `$1<${fieldPolicyArgs}> | FieldReadFunction<${fieldReadFunctionArgs}>$2`);
            if (next !== before) {
                upgradedAny = true;
            }
        }
        return `export type QueryFieldPolicy = {${next}\n};`;
    });

    // Conditionally add the typed imports: only when at least one upgrade
    // actually consumed `Reference`/`FieldFunctionOptions`. If schema drift
    // makes every upgrade a no-op, leaving the imports absent keeps `tsc`
    // happy (no TS6133/TS6192 for unused imports).
    if (upgradedAny && /Reference|FieldFunctionOptions/.test(file)) {
        file = file.replace(
            `import { FieldPolicy, FieldReadFunction, TypePolicies, TypePolicy } from '@apollo/client/cache';`,
            `import {FieldPolicy, FieldReadFunction, Reference, TypePolicies, TypePolicy} from '@apollo/client/cache';
import {
\tGetChaptersMangaQuery, GetDownloadStatusQueryVariables, GetGlobalMetadataQueryVariables,
\tGetMangaScreenQueryVariables, GetSourceBrowseQueryVariables, GetUpdateStatusQueryVariables, GetWebuiUpdateStatusQueryVariables,
} from "@/lib/graphql/generated/graphql.ts";
import {FieldFunctionOptions} from "@apollo/client/cache";`,
        );
    }

    fs.writeFileSync(generatedGraphQLFilePath, file);
}
