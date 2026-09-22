import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { flushPromises, mount } from '@vue/test-utils';

vi.mock('@/shared/api', () => ({
    ChurchToolsApiError: class ChurchToolsApiError extends Error {
        endpoint: string;
        status: number;
        constructor(endpoint: string, status: number, message: string) {
            super(message);
            this.endpoint = endpoint;
            this.status = status;
        }
    },
}));
vi.mock('@/wizard/settings.api', () => ({
    loadSettings: vi.fn(),
    saveSettings: vi.fn(),
    searchGroups: vi.fn(),
    getGroupName: vi.fn(),
}));

import { ChurchToolsApiError } from '@/shared/api';
import * as settingsApi from '@/wizard/settings.api';
import AdminView from '@/wizard/components/AdminView.vue';

async function makeWrapper() {
    const w = mount(AdminView);
    await flushPromises();
    return w;
}

beforeEach(() => {
    vi.clearAllMocks();
    (settingsApi.loadSettings as Mock).mockResolvedValue(null);
    (settingsApi.getGroupName as Mock).mockResolvedValue(null);
});

describe('AdminView', () => {
    it('shows the configured template with its resolved name', async () => {
        (settingsApi.loadSettings as Mock).mockResolvedValue({ hajkTemplateGroupId: 2587 });
        (settingsApi.getGroupName as Mock).mockResolvedValue('=== Vorlage Hajks');
        const w = await makeWrapper();
        expect(w.find('[data-testid="current-template"]').text()).toContain('=== Vorlage Hajks');
    });

    it('explains the name convention fallback when nothing is configured', async () => {
        const w = await makeWrapper();
        expect(w.find('[data-testid="current-template"]').text()).toContain(
            'Noch keine Vorlage konfiguriert',
        );
    });

    it('searches, saves the selected group and confirms', async () => {
        (settingsApi.searchGroups as Mock).mockResolvedValue([
            { id: 10, name: 'Vorlage A' },
            { id: 11, name: 'Vorlage B' },
        ]);
        (settingsApi.saveSettings as Mock).mockResolvedValue(undefined);
        const w = await makeWrapper();

        await w.find('#hp-admin-query').setValue('Vorlage');
        await w.find('[data-testid="search"]').trigger('click');
        await flushPromises();
        expect(w.findAll('[data-testid="results"] label')).toHaveLength(2);

        await w.find('input[type="radio"][value="11"]').setValue();
        await w.find('[data-testid="save"]').trigger('click');
        await flushPromises();

        expect(settingsApi.saveSettings).toHaveBeenCalledWith({ hajkTemplateGroupId: 11 });
        expect(w.find('[data-testid="saved"]').exists()).toBe(true);
        expect(w.find('[data-testid="current-template"]').text()).toContain('Vorlage B');
    });

    it('shows a permission message on 403', async () => {
        (settingsApi.searchGroups as Mock).mockResolvedValue([{ id: 10, name: 'Vorlage A' }]);
        const err = new ChurchToolsApiError('/custommodules/5/customdatacategories', 403, '403');
        (settingsApi.saveSettings as Mock).mockRejectedValue(err);
        const w = await makeWrapper();

        await w.find('#hp-admin-query').setValue('Vorlage');
        await w.find('[data-testid="search"]').trigger('click');
        await flushPromises();
        await w.find('input[type="radio"][value="10"]').setValue();
        await w.find('[data-testid="save"]').trigger('click');
        await flushPromises();

        expect(w.find('[data-testid="save-error"]').text()).toContain('Keine Berechtigung');
    });

    it('disables save until a group is selected', async () => {
        const w = await makeWrapper();
        expect(w.find('[data-testid="save"]').attributes('disabled')).toBeDefined();
    });
});
