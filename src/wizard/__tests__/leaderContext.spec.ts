import { describe, expect, it } from 'vitest';
import { deriveLeaderContext } from '@/wizard/leaderContext';
import type { HierarchyIn, MembershipIn, RoleIn } from '@/wizard/leaderContext';

const roles: RoleIn[] = [
    { id: 9, groupTypeId: 1, isLeader: true }, // Leiter Kleingruppe
    { id: 10, groupTypeId: 1, isLeader: true }, // Co-Leiter
    { id: 8, groupTypeId: 1, isLeader: false }, // Teilnehmer
    { id: 16, groupTypeId: 2, isLeader: true }, // Leiter Dienst
    { id: 15, groupTypeId: 2, isLeader: false }, // Mitarbeiter Dienst
];

const hierarchy: HierarchyIn[] = [
    { groupId: 950, title: 'RR Gesamt-Stammleitung', parents: [], children: [123, 129] },
    { groupId: 123, title: 'RR Kundschafterstamm-MA', parents: [950], children: [2156, 1930, 2612] },
    { groupId: 129, title: 'RR Pfadfinderstamm-MA', parents: [950], children: [1015, 2615] },
    { groupId: 2156, title: 'RR Kundschafterteam Eisbären', parents: [123], children: [] },
    { groupId: 1930, title: 'RR Kundschafterteam Löwen', parents: [123], children: [] },
    { groupId: 1015, title: 'RR Pfadfinderteam Schneeleoparden', parents: [129], children: [] },
    { groupId: 2612, title: 'RR | Camps und Aktionen - Kundschafter', parents: [123], children: [] },
    { groupId: 2615, title: 'RR | Camps und Aktionen - Pfadfinder', parents: [129], children: [] },
];

describe('deriveLeaderContext', () => {
    it('maps a single-team leader to exactly their team with Sammelgruppe', () => {
        const memberships: MembershipIn[] = [{ groupId: 2156, groupTypeRoleId: 9 }];
        const ctx = deriveLeaderContext(memberships, roles, hierarchy);
        expect(ctx.kind).toBe('teamleiter');
        expect(ctx.teams).toHaveLength(1);
        expect(ctx.teams[0]).toMatchObject({
            groupId: 2156,
            shortName: 'Eisbären',
            stufe: 'Kundschafter',
            sammelgruppeId: 2612,
        });
    });

    it('treats a co-leader (role 10) as leader too', () => {
        const ctx = deriveLeaderContext([{ groupId: 1930, groupTypeRoleId: 10 }], roles, hierarchy);
        expect(ctx.kind).toBe('teamleiter');
        expect(ctx.teams[0].shortName).toBe('Löwen');
    });

    it('ignores participant memberships', () => {
        const ctx = deriveLeaderContext([{ groupId: 2156, groupTypeRoleId: 8 }], roles, hierarchy);
        expect(ctx.kind).toBe('none');
        expect(ctx.teams).toHaveLength(0);
    });

    it('gives a Stamm-MA leader all teams (stammleiter)', () => {
        const ctx = deriveLeaderContext([{ groupId: 123, groupTypeRoleId: 16 }], roles, hierarchy);
        expect(ctx.kind).toBe('stammleiter');
        expect(ctx.teams.map((t) => t.shortName)).toEqual(['Eisbären', 'Löwen', 'Schneeleoparden']);
    });

    it('gives any Gesamt-Stammleitung member all teams', () => {
        const ctx = deriveLeaderContext([{ groupId: 950, groupTypeRoleId: 15 }], roles, hierarchy);
        expect(ctx.kind).toBe('stammleiter');
        expect(ctx.teams).toHaveLength(3);
    });

    it('marks missing Sammelgruppe as null', () => {
        const h = hierarchy.map((e) => (e.groupId === 123 ? { ...e, children: [2156, 1930] } : e));
        const ctx = deriveLeaderContext([{ groupId: 2156, groupTypeRoleId: 9 }], roles, h);
        expect(ctx.teams[0].sammelgruppeId).toBeNull();
    });
});
