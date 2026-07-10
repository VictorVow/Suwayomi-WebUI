/*
 * Copyright (C) Contributors to the Suwayomi project
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Slider from '@mui/material/Slider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import CloseIcon from '@mui/icons-material/Close';
import { useLingui } from '@lingui/react/macro';
import {
    NOVEL_READER_DEFAULT_SETTINGS,
    resolveColorScheme,
    updateNovelReaderSettings,
    useNovelReaderSettings,
    type HeadFootRegion,
    type HeadFootWhich,
    type SectionType,
} from '@/features/novel/reader/preferences.ts';
import { SECTION_TYPES } from '@/features/novel/reader/settings/headFoot.ts';

const themeKeys = ['system', 'light', 'dark', 'sepia'] as const;

const LabeledSlider = ({
    label,
    value,
    min,
    max,
    step,
    unit,
    onChange,
}: {
    label: string;
    value: number;
    min: number;
    max: number;
    step?: number;
    unit?: string;
    onChange: (v: number) => void;
}) => (
    <Stack sx={{ gap: 0.5, mt: 1 }}>
        <Typography variant="caption" sx={{ opacity: 0.85 }}>
            {label}: {value}
            {unit ?? ''}
        </Typography>
        <Slider value={value} min={min} max={max} step={step ?? 1} onChange={(_, v) => onChange(v as number)} />
    </Stack>
);

const SectionEditor = ({ which }: { which: HeadFootWhich }) => {
    const { t } = useLingui();
    const settings = useNovelReaderSettings();
    const regions: HeadFootRegion[] = ['left', 'middle', 'right'];
    return (
        <Box>
            <Typography variant="subtitle2" sx={{ mb: 1, mt: 2 }}>
                {which === 'header' ? t`Header` : t`Footer`}
            </Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} sx={{ gap: 1 }}>
                {regions.map((region) => (
                    <FormControl key={region} size="small" sx={{ flex: 1, minWidth: 120 }}>
                        <InputLabel>{region}</InputLabel>
                        <Select
                            value={settings[which]?.[region] ?? 'empty'}
                            label={region}
                            onChange={(e) => {
                                const newConfig = {
                                    ...settings[which],
                                    [region]: e.target.value as SectionType,
                                };
                                updateNovelReaderSettings(
                                    which === 'header' ? { header: newConfig } : { footer: newConfig },
                                );
                            }}
                        >
                            {SECTION_TYPES.map((st) => (
                                <MenuItem key={st} value={st}>
                                    {st}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                ))}
            </Stack>
        </Box>
    );
};

/**
 * The reader's own preferences panel — invoked from the main overlay's
 * "Preferences" button. Mirrors calibre's `create_prefs_panel` but flattened
 * into a single scrollable MUI surface (sub-panel navigation isn't worth the
 * complexity for a fullscreen reader). Sections: Colors, Layout, Currency
 * (paragraph spacing), Headers & footers, Selection, Keyboard shortcuts
 * (defaults visible, edit coming soon), Reset.
 *
 * All edits go through `updateNovelReaderSettings`, which persists immediately
 * and re-broadcasts so the live chrome updates without a re-mount.
 */
export const NovelReaderSettingsPanel = ({ onClose }: { onClose: () => void }) => {
    const { t } = useLingui();
    const settings = useNovelReaderSettings();
    const [newSchemeName, setNewSchemeName] = useState('');
    const [newSchemeBg, setNewSchemeBg] = useState('#1a1a1a');
    const [newSchemeFg, setNewSchemeFg] = useState('#e0e0e0');

    const currentBg = resolveColorScheme(settings.current_color_scheme, settings.user_color_schemes).background;

    return (
        <Stack
            sx={{
                position: 'absolute',
                inset: 0,
                color: '#fff',
                p: 2,
                overflowY: 'auto',
            }}
            onClick={(e) => {
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6">{t`Reader preferences`}</Typography>
                <IconButton color="inherit" onClick={onClose} aria-label={t`Close`}>
                    <CloseIcon />
                </IconButton>
            </Stack>

            <Box sx={{ maxWidth: 640, mx: 'auto', width: '100%', bgcolor: 'rgba(0,0,0,0.55)', borderRadius: 2, p: 2 }}>
                {/* Colors */}
                <Typography variant="subtitle1">{t`Colors`}</Typography>
                <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 1, mt: 1 }}>
                    {themeKeys.map((theme) => (
                        <Button
                            key={theme}
                            variant={settings.current_color_scheme === theme ? 'contained' : 'outlined'}
                            onClick={() => updateNovelReaderSettings({ current_color_scheme: theme })}
                        >
                            {theme}
                        </Button>
                    ))}
                </Stack>
                <Box sx={{ mt: 2, opacity: 0.85 }}>
                    <Typography variant="caption" gutterBottom>
                        {t`Background preview`}
                    </Typography>
                    <Box
                        sx={{
                            bgcolor: currentBg,
                            height: 24,
                            borderRadius: 1,
                            border: '1px solid currentColor',
                            opacity: 0.7,
                        }}
                    />
                </Box>
                <Box sx={{ mt: 2 }}>
                    <Typography variant="caption">{t`Custom color scheme`}</Typography>
                    <Stack direction="row" sx={{ gap: 1, mt: 0.5, flexWrap: 'wrap' }}>
                        <TextField
                            label={t`Name`}
                            size="small"
                            value={newSchemeName}
                            onChange={(e) => setNewSchemeName(e.target.value)}
                        />
                        <TextField
                            label="bg"
                            size="small"
                            value={newSchemeBg}
                            onChange={(e) => setNewSchemeBg(e.target.value)}
                        />
                        <TextField
                            label="fg"
                            size="small"
                            value={newSchemeFg}
                            onChange={(e) => setNewSchemeFg(e.target.value)}
                        />
                        <Button
                            color="inherit"
                            variant="outlined"
                            onClick={() => {
                                const name = (newSchemeName || 'sample').trim();
                                updateNovelReaderSettings({
                                    user_color_schemes: {
                                        ...settings.user_color_schemes,
                                        [name]: { background: newSchemeBg, foreground: newSchemeFg },
                                    },
                                    current_color_scheme: name,
                                });
                                setNewSchemeName('');
                            }}
                        >
                            {t`Add`}
                        </Button>
                    </Stack>
                    {Object.keys(settings.user_color_schemes).length > 0 && (
                        <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                            {Object.entries(settings.user_color_schemes).map(([key]) => (
                                <Button
                                    key={key}
                                    size="small"
                                    variant={settings.current_color_scheme === key ? 'contained' : 'outlined'}
                                    onClick={() => updateNovelReaderSettings({ current_color_scheme: key })}
                                >
                                    {key}
                                </Button>
                            ))}
                        </Stack>
                    )}
                </Box>

                {/* Layout */}
                <Typography variant="subtitle1" sx={{ mt: 3 }}>
                    {t`Page layout`}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 1 }}>
                    {t`Reading mode`}
                </Typography>
                <Stack direction="row" sx={{ gap: 1, mt: 0.5 }}>
                    {(['continuous', 'paged'] as const).map((mode) => (
                        <Button
                            key={mode}
                            color="inherit"
                            variant={settings.reading_mode === mode ? 'contained' : 'outlined'}
                            onClick={() => updateNovelReaderSettings({ reading_mode: mode })}
                        >
                            {mode === 'continuous' ? t`Continuous` : t`Paged`}
                        </Button>
                    ))}
                </Stack>
                <LabeledSlider
                    label={t`Font size`}
                    value={settings.base_font_size}
                    min={8}
                    max={64}
                    unit="px"
                    onChange={(v) => updateNovelReaderSettings({ base_font_size: v })}
                />
                <LabeledSlider
                    label={t`Left margin`}
                    value={settings.margin_left}
                    min={0}
                    max={400}
                    unit="px"
                    onChange={(v) => updateNovelReaderSettings({ margin_left: v })}
                />
                <LabeledSlider
                    label={t`Right margin`}
                    value={settings.margin_right}
                    min={0}
                    max={400}
                    unit="px"
                    onChange={(v) => updateNovelReaderSettings({ margin_right: v })}
                />
                <LabeledSlider
                    label={t`Top margin`}
                    value={settings.margin_top}
                    min={0}
                    max={200}
                    unit="px"
                    onChange={(v) => updateNovelReaderSettings({ margin_top: v })}
                />
                <LabeledSlider
                    label={t`Bottom margin`}
                    value={settings.margin_bottom}
                    min={0}
                    max={200}
                    unit="px"
                    onChange={(v) => updateNovelReaderSettings({ margin_bottom: v })}
                />
                <LabeledSlider
                    label={t`Max text width`}
                    value={settings.max_text_width}
                    min={0}
                    max={2400}
                    step={10}
                    unit="px"
                    onChange={(v) => updateNovelReaderSettings({ max_text_width: v })}
                />
                <LabeledSlider
                    label={t`Line height`}
                    value={settings.line_height}
                    min={1.2}
                    max={2.5}
                    step={0.05}
                    onChange={(v) => updateNovelReaderSettings({ line_height: v })}
                />
                <LabeledSlider
                    label={t`Paragraph spacing`}
                    value={settings.paragraph_spacing}
                    min={0}
                    max={48}
                    unit="px"
                    onChange={(v) => updateNovelReaderSettings({ paragraph_spacing: v })}
                />
                <FormControl size="small" fullWidth sx={{ mt: 2, minWidth: 120 }}>
                    <InputLabel>{t`Font family`}</InputLabel>
                    <Select
                        value={settings.font_family}
                        label={t`Font family`}
                        onChange={(e) =>
                            updateNovelReaderSettings({
                                font_family: e.target.value as 'system' | 'serif' | 'sans',
                            })
                        }
                    >
                        <MenuItem value="system">System</MenuItem>
                        <MenuItem value="serif">Serif</MenuItem>
                        <MenuItem value="sans">Sans</MenuItem>
                    </Select>
                </FormControl>

                {/* Headers & footers */}
                <Typography variant="subtitle1" sx={{ mt: 3 }}>
                    {t`Headers and footers`}
                </Typography>
                <SectionEditor which="header" />
                <SectionEditor which="footer" />

                {/* Selection */}
                <Typography variant="subtitle1" sx={{ mt: 3 }}>
                    {t`Selection`}
                </Typography>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                    <Switch
                        checked={settings.show_selection_bar}
                        onChange={(e) => updateNovelReaderSettings({ show_selection_bar: e.target.checked })}
                    />
                    <Typography>{t`Show selection bar`}</Typography>
                </Stack>
                <TextField
                    size="small"
                    fullWidth
                    label={t`Net search URL ({q})`}
                    value={settings.net_search_url}
                    onChange={(e) => updateNovelReaderSettings({ net_search_url: e.target.value })}
                    sx={{ mt: 1 }}
                />

                {/* Reading */}
                <Typography variant="subtitle1" sx={{ mt: 3 }}>
                    {t`Reading`}
                </Typography>
                <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                    <Switch
                        checked={settings.restore_scroll_position}
                        onChange={(e) => updateNovelReaderSettings({ restore_scroll_position: e.target.checked })}
                    />
                    <Typography>{t`Restore scroll position`}</Typography>
                </Stack>
                <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 1 }}>
                    {t`Mark chapter read`}
                </Typography>
                <Stack direction="row" sx={{ gap: 1 }}>
                    {(['on_open', 'past_threshold'] as const).map((policy) => (
                        <Button
                            key={policy}
                            color="inherit"
                            variant={settings.mark_read_policy === policy ? 'contained' : 'outlined'}
                            onClick={() => updateNovelReaderSettings({ mark_read_policy: policy })}
                        >
                            {policy === 'on_open'
                                ? t`On open`
                                : t`Past ${Math.round(settings.mark_read_threshold * 100)}%`}
                        </Button>
                    ))}
                </Stack>
                <LabeledSlider
                    label={t`Mark-read threshold`}
                    value={Math.round(settings.mark_read_threshold * 100)}
                    min={50}
                    max={100}
                    unit="%"
                    onChange={(v) => updateNovelReaderSettings({ mark_read_threshold: v / 100 })}
                />
                <LabeledSlider
                    label={t`Auto-hide chrome (0 = off)`}
                    value={settings.auto_hide_chrome_ms}
                    min={0}
                    max={10000}
                    step={500}
                    unit="ms"
                    onChange={(v) => updateNovelReaderSettings({ auto_hide_chrome_ms: v })}
                />
                <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 1 }}>
                    {t`TOC chapter number source`}
                </Typography>
                <Stack direction="row" sx={{ gap: 1, mt: 0.5 }}>
                    {(['chapterNumber', 'sourceOrder'] as const).map((source) => (
                        <Button
                            key={source}
                            color="inherit"
                            variant={settings.toc_chapter_number_source === source ? 'contained' : 'outlined'}
                            onClick={() => updateNovelReaderSettings({ toc_chapter_number_source: source })}
                        >
                            {source === 'chapterNumber' ? t`Chapter number` : t`Source order`}
                        </Button>
                    ))}
                </Stack>

                {/* Custom CSS */}
                <Typography variant="subtitle1" sx={{ mt: 3 }}>
                    {t`User stylesheet`}
                </Typography>
                <TextField
                    size="small"
                    multiline
                    minRows={3}
                    fullWidth
                    placeholder="/* custom CSS */"
                    value={settings.user_stylesheet}
                    onChange={(e) => updateNovelReaderSettings({ user_stylesheet: e.target.value })}
                    sx={{ mt: 1 }}
                />

                {/* Reset */}
                <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 3 }}>
                    <Button
                        color="inherit"
                        startIcon={<RestartAltIcon />}
                        onClick={() => updateNovelReaderSettings({ ...NOVEL_READER_DEFAULT_SETTINGS })}
                    >
                        {t`Restore defaults`}
                    </Button>
                </Stack>
            </Box>
        </Stack>
    );
};
