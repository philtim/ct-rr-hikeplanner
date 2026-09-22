import { beforeEach, describe, expect, it, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import { computed, reactive, ref } from 'vue';
import type { WizardPhase } from '@/wizard/useWizard';

const fake = {
    state: ref<WizardPhase>({ phase: 'loading' }),
    context: ref<unknown>(null),
    form: reactive({
        teamId: null,
        dateFrom: '',
        dateTo: '',
        location: '',
        description: '',
        mode: 'self',
        signupDeadline: '',
        maxMembers: '',
        selectedFieldIds: [],
    }),
    maxVisited: ref(1),
    progress: ref([]),
    selectedTeam: computed(() => null),
    groupName: computed(() => ''),
    nightsWarning: computed(() => null),
    step1Errors: ref({}),
    step2Errors: ref({}),
    start: vi.fn(),
    goNext: vi.fn(),
    goBack: vi.fn(),
    goToStep: vi.fn(),
    submit: vi.fn(),
    retry: vi.fn(),
    reset: vi.fn(),
};

vi.mock('@/wizard/useWizard', () => ({ useWizard: () => fake }));

import WizardShell from '@/wizard/components/WizardShell.vue';
import GateView from '@/wizard/components/GateView.vue';
import StepAnmeldung from '@/wizard/components/StepAnmeldung.vue';
import ResultView from '@/wizard/components/ResultView.vue';

const context = {
    user: { id: 42, firstName: 'C', lastName: 'C' },
    leader: {
        kind: 'teamleiter',
        teams: [
            {
                groupId: 2156,
                name: 'RR Kundschafterteam Eisbären',
                shortName: 'Eisbären',
                stufe: 'Kundschafter',
                sammelgruppeId: 2612,
                sammelgruppeName: 'RR | Camps und Aktionen - Kundschafter',
            },
        ],
    },
    template: {
        id: 2587,
        parentIds: [],
        fields: [],
        organisators: [{ personId: 1, name: 'Irma Betz' }],
    },
    eventLeaderRoleId: 23,
    organisatorRoleId: 26,
};

beforeEach(() => {
    vi.clearAllMocks();
});

describe('WizardShell', () => {
    it('starts loading and renders the gate', () => {
        fake.state.value = { phase: 'loading' };
        const w = mount(WizardShell);
        expect(w.find('h1').text()).toBe('Neuen Hajk anlegen');
        expect(w.findComponent(GateView).exists()).toBe(true);
        expect(fake.start).toHaveBeenCalledTimes(1);
    });

    it('shows version and commit in the footer', () => {
        fake.state.value = { phase: 'loading' };
        const w = mount(WizardShell);
        expect(w.find('.hp-footer').text()).toBe('v0.0.0-test · testsha');
    });

    it('renders step 2 in form phase', () => {
        fake.context.value = context;
        fake.state.value = { phase: 'form', step: 2 };
        const w = mount(WizardShell);
        expect(w.findComponent(StepAnmeldung).exists()).toBe(true);
    });

    it('renders the result view when done', () => {
        fake.context.value = context;
        fake.form.teamId = 2156 as never;
        fake.state.value = {
            phase: 'done',
            outcome: { ok: true, groupId: 99, calendarWarning: true },
            groupName: 'RR Hajk Eisbären 10.04.–12.04.2027',
        };
        const w = mount(WizardShell);
        const result = w.findComponent(ResultView);
        expect(result.exists()).toBe(true);
        expect(result.props('calendarWarning')).toBe(true);
    });
});
