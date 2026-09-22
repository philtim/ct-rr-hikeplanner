import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

vi.mock('@/shared/api', () => ({
    apiGet: vi.fn(),
    apiPost: vi.fn(),
    apiPut: vi.fn(),
    ChurchToolsApiError: class ChurchToolsApiError extends Error {},
}));

import * as api from '@/shared/api';
import { getGroupName, loadSettings, saveSettings, searchGroups } from '@/wizard/settings.api';

const MODULE = { id: 5, shorty: 'rr-hikeplanner' };
const CATEGORIES = '/custommodules/5/customdatacategories';

function mockGet(responses: Record<string, unknown>) {
    (api.apiGet as Mock).mockImplementation((url: string) => {
        if (url in responses) return Promise.resolve(responses[url]);
        return Promise.reject(new Error(`unmocked GET ${url}`));
    });
}

beforeEach(() => vi.clearAllMocks());

describe('loadSettings', () => {
    it('returns the parsed settings from the settings category', async () => {
        mockGet({
            '/custommodules': [{ id: 9, shorty: 'other' }, MODULE],
            [CATEGORIES]: [
                { id: 1, shorty: 'misc', data: '{}' },
                { id: 2, shorty: 'settings', data: '{"hajkTemplateGroupId":2587}' },
            ],
        });
        expect(await loadSettings()).toEqual({ hajkTemplateGroupId: 2587 });
    });

    it.each([
        ['module missing', { '/custommodules': [] }],
        ['category missing', { '/custommodules': [MODULE], [CATEGORIES]: [] }],
        [
            'data empty',
            { '/custommodules': [MODULE], [CATEGORIES]: [{ id: 2, shorty: 'settings' }] },
        ],
        [
            'data invalid JSON',
            {
                '/custommodules': [MODULE],
                [CATEGORIES]: [{ id: 2, shorty: 'settings', data: '{oops' }],
            },
        ],
        [
            'id not a number',
            {
                '/custommodules': [MODULE],
                [CATEGORIES]: [{ id: 2, shorty: 'settings', data: '{"hajkTemplateGroupId":"x"}' }],
            },
        ],
        ['request rejected (no permission)', {}],
    ] as [string, Record<string, unknown>][])('is null when %s', async (_label, responses) => {
        mockGet(responses);
        expect(await loadSettings()).toBeNull();
    });
});

describe('saveSettings', () => {
    it('updates the existing category via PUT', async () => {
        mockGet({
            '/custommodules': [MODULE],
            [CATEGORIES]: [{ id: 7, shorty: 'settings', data: '{}' }],
        });
        await saveSettings({ hajkTemplateGroupId: 99 });
        expect(api.apiPut).toHaveBeenCalledWith(`${CATEGORIES}/7`, {
            data: '{"hajkTemplateGroupId":99}',
        });
        expect(api.apiPost).not.toHaveBeenCalled();
    });

    it('creates the category via POST when none exists', async () => {
        mockGet({ '/custommodules': [MODULE], [CATEGORIES]: [] });
        await saveSettings({ hajkTemplateGroupId: 99 });
        expect(api.apiPost).toHaveBeenCalledWith(
            CATEGORIES,
            expect.objectContaining({
                customModuleId: 5,
                shorty: 'settings',
                data: '{"hajkTemplateGroupId":99}',
            }),
        );
    });

    it('propagates write errors (e.g. 403) to the caller', async () => {
        mockGet({ '/custommodules': [MODULE], [CATEGORIES]: [] });
        (api.apiPost as Mock).mockRejectedValue(new Error('403'));
        await expect(saveSettings({ hajkTemplateGroupId: 1 })).rejects.toThrow('403');
    });
});

describe('searchGroups', () => {
    it('queries by name and maps id/name', async () => {
        (api.apiGet as Mock).mockResolvedValue([
            { id: 1, name: 'A', information: {} },
            { id: 2, name: 'B' },
        ]);
        expect(await searchGroups(' Vorlage ')).toEqual([
            { id: 1, name: 'A' },
            { id: 2, name: 'B' },
        ]);
        expect(api.apiGet).toHaveBeenCalledWith('/groups?query=Vorlage&limit=25');
    });

    it('skips the request for a blank query', async () => {
        expect(await searchGroups('   ')).toEqual([]);
        expect(api.apiGet).not.toHaveBeenCalled();
    });
});

describe('getGroupName', () => {
    it('returns the group name', async () => {
        (api.apiGet as Mock).mockResolvedValue({ id: 3, name: 'Vorlage' });
        expect(await getGroupName(3)).toBe('Vorlage');
    });

    it('returns null when the group is not readable', async () => {
        (api.apiGet as Mock).mockRejectedValue(new Error('404'));
        expect(await getGroupName(3)).toBeNull();
    });
});
