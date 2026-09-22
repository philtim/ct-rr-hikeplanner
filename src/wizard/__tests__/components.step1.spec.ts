import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import { reactive } from 'vue';
import StepTeamTermin from '@/wizard/components/StepTeamTermin.vue';
import type { FormState, TeamOption } from '@/wizard/types';

const teams: TeamOption[] = [
    { groupId: 2156, name: 'RR Kundschafterteam Eisbären', shortName: 'Eisbären', stufe: 'Kundschafter', sammelgruppeId: 2612 },
    { groupId: 1930, name: 'RR Kundschafterteam Löwen', shortName: 'Löwen', stufe: 'Kundschafter', sammelgruppeId: 2612 },
    { groupId: 1015, name: 'RR Pfadfinderteam Schneeleoparden', shortName: 'Schneeleoparden', stufe: 'Pfadfinder', sammelgruppeId: 2615 },
];

function makeForm(overrides: Partial<FormState> = {}): FormState {
    return reactive({
        teamId: null,
        dateFrom: '',
        dateTo: '',
        location: '',
        description: '',
        mode: 'self',
        signupDeadline: '',
        maxMembers: '',
        selectedFieldIds: [],
        ...overrides,
    }) as FormState;
}

function makeWrapper(props: Partial<InstanceType<typeof StepTeamTermin>['$props']> = {}) {
    return mount(StepTeamTermin, {
        props: {
            form: makeForm(),
            teams,
            singleTeam: false,
            errors: {},
            nightsWarning: null,
            groupName: '',
            ...props,
        },
    });
}

describe('StepTeamTermin', () => {
    it('groups the team select by Stufe', () => {
        const w = makeWrapper();
        const optgroups = w.findAll('optgroup');
        expect(optgroups.map((o) => o.attributes('label'))).toEqual(['Kundschafter', 'Pfadfinder']);
        expect(optgroups[0].findAll('option')).toHaveLength(2);
    });

    it('renders a plain text team for single-team leaders (no select)', () => {
        const w = makeWrapper({
            singleTeam: true,
            teams: [teams[0]],
            form: makeForm({ teamId: 2156 }),
        });
        expect(w.find('select').exists()).toBe(false);
        expect(w.text()).toContain('Eisbären');
    });

    it('shows placeholder preview until name is available, then the name', async () => {
        const w = makeWrapper();
        expect(w.text()).toContain('Team und Datum wählen');
        await w.setProps({ groupName: 'RR Hajk Eisbären 10.04.–12.04.2027' });
        expect(w.text()).toContain('RR Hajk Eisbären 10.04.–12.04.2027');
    });

    it('shows field errors from props', () => {
        const w = makeWrapper({
            errors: { description: 'Bitte beschreibe kurz den Hajk — inklusive Anzahl der Nächte.' },
        });
        expect(w.find('.hp-error-text').text()).toContain('Bitte beschreibe kurz den Hajk');
    });

    it('shows the non-blocking nights warning', () => {
        const w = makeWrapper({
            nightsWarning: 'Weniger als zwei Übernachtungen: Förderungen gibt es erst ab zwei Nächten.',
        });
        expect(w.find('.hp-warning-box').text()).toContain('zwei Übernachtungen');
    });

    it('emits next on submit', async () => {
        const w = makeWrapper();
        await w.find('form').trigger('submit');
        expect(w.emitted('next')).toHaveLength(1);
    });

    it('binds inputs to the form state', async () => {
        const form = makeForm();
        const w = makeWrapper({ form });
        await w.find('#hp-date-from').setValue('2027-04-10');
        await w.find('#hp-description').setValue('Toller Hajk');
        expect(form.dateFrom).toBe('2027-04-10');
        expect(form.description).toBe('Toller Hajk');
    });
});
