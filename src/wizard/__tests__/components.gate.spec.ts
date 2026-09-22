import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import GateView from '@/wizard/components/GateView.vue';
import StepperNav from '@/wizard/components/StepperNav.vue';

describe('GateView', () => {
    it('renders a skeleton with status role while loading', () => {
        const w = mount(GateView, { props: { state: 'loading' } });
        expect(w.find('[role="status"]').exists()).toBe(true);
        expect(w.text()).not.toContain('Team-Leiter');
    });

    it('renders the no-access dead end without any button', () => {
        const w = mount(GateView, { props: { state: 'no-access' } });
        expect(w.text()).toContain('Dieser Assistent ist für Team-Leiter');
        expect(w.text()).toContain('Stammleitung');
        expect(w.find('button').exists()).toBe(false);
    });

    it('renders the error with message and retry button', async () => {
        const w = mount(GateView, {
            props: { state: 'error', message: 'Die Vorlagengruppe ist nicht nutzbar.' },
        });
        expect(w.find('[role="alert"]').text()).toContain('Die Vorlagengruppe ist nicht nutzbar.');
        await w.find('button').trigger('click');
        expect(w.emitted('retry')).toHaveLength(1);
    });
});

describe('StepperNav', () => {
    function make(props: { current: 1 | 2 | 3; maxVisited: 1 | 2 | 3; locked?: boolean }) {
        return mount(StepperNav, { props: { locked: false, ...props } });
    }

    it('renders three steps and marks the current one', () => {
        const w = make({ current: 2, maxVisited: 2 });
        const steps = w.findAll('li');
        expect(steps).toHaveLength(3);
        expect(steps[1].find('[aria-current="step"]').exists()).toBe(true);
    });

    it('emits goto for visited steps only', async () => {
        const w = make({ current: 3, maxVisited: 3 });
        await w.findAll('button')[0].trigger('click');
        expect(w.emitted('goto')?.[0]).toEqual([1]);
    });

    it('does not emit for future steps', async () => {
        const w = make({ current: 1, maxVisited: 1 });
        const thirdButton = w.findAll('button')[2];
        expect(thirdButton.attributes('disabled')).toBeDefined();
        await thirdButton.trigger('click');
        expect(w.emitted('goto')).toBeUndefined();
    });

    it('locks completely during provisioning', async () => {
        const w = make({ current: 3, maxVisited: 3, locked: true });
        for (const b of w.findAll('button')) {
            expect(b.attributes('disabled')).toBeDefined();
        }
    });
});
