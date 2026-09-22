import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import ResultView from '@/wizard/components/ResultView.vue';

function makeWrapper(props: Record<string, unknown> = {}) {
    return mount(ResultView, {
        props: {
            groupName: 'RR Hajk Eisbären 10.04.–12.04.2027',
            groupHref: 'https://x.tools/groups/99',
            summary: [
                'Abgelegt in „RR | Camps und Aktionen - Kundschafter“',
                'Anmeldefelder: Vegetarisch, T-Shirt-Größe',
                'Selbstanmeldung bis 03.04.2027, max. 20',
                'Organisatoren: Irma Betz, Julia Timmalog',
                'Du bist als Leiter eingetragen',
            ],
            calendarWarning: false,
            ...props,
        },
    });
}

describe('ResultView', () => {
    it('renders success title, summary lines and the group link', () => {
        const w = makeWrapper();
        expect(w.text()).toContain('Dein Hajk ist angelegt!');
        expect(w.findAll('.hp-result-list li')).toHaveLength(5);
        const link = w.find('a.hp-btn--primary');
        expect(link.attributes('href')).toBe('https://x.tools/groups/99');
        expect(link.text()).toContain('Zur Gruppe in ChurchTools');
        expect(w.text()).not.toContain('Kalendertermin konnte nicht angelegt werden');
    });

    it('shows the calendar warning row only when warned', () => {
        const w = makeWrapper({ calendarWarning: true });
        expect(w.text()).toContain('Wichtig: Kalendertermin konnte nicht angelegt werden');
        expect(w.text()).toContain('Royal Rangers');
    });

    it('emits restart', async () => {
        const w = makeWrapper();
        await w.find('[data-testid="restart"]').trigger('click');
        expect(w.emitted('restart')).toHaveLength(1);
    });
});
