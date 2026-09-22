/**
 * Leitet aus den Mitgliedschaften des Nutzers, dem Rollenkatalog und den für
 * ihn SICHTBAREN Gruppen ab, wer den Assistenten nutzen darf und für welche
 * Teams (PRD US-1).
 *
 * Bewusst ohne Hierarchie-Walk: Leiter sehen Stamm-MA-Gruppen und die
 * Gesamt-Stammleitung nicht (Sichtbarkeit „restricted“). Die Struktur steckt
 * stattdessen in den Namenskonventionen (docs/CONVENTIONS.md):
 * - Stufe eines Teams: aus dem Teamnamen („RR <Stufe>team <Name>“)
 * - Ziel-Sammelgruppe: Name enthält „Camps und Aktionen“ UND die Stufe;
 *   die Sammelgruppen stehen dafür auf Sichtbarkeit „intern“.
 * - Stammleiter: Leiter-Rolle in einer sichtbaren „RR <Stufe>stamm-MA“-Gruppe
 *   oder Mitglied der „RR Gesamt-Stammleitung“ (Mitglieder sehen die eigene
 *   Gruppe auch bei „restricted“).
 */
import { ROOT_GROUP_NAME, SAMMELGRUPPE_MARKER, STAMM_MA_PATTERN, TEAM_PATTERN } from './config';
import { teamShortName } from './naming';
import type { LeaderContext, Stufe, TeamOption } from './types';

export interface MembershipIn {
    groupId: number;
    groupTypeRoleId: number;
}
export interface RoleIn {
    id: number;
    groupTypeId: number;
    isLeader: boolean;
}
export interface HierarchyIn {
    groupId: number;
    title: string;
    parents: number[];
    children: number[];
}

export function deriveLeaderContext(
    memberships: MembershipIn[],
    roles: RoleIn[],
    hierarchy: HierarchyIn[],
): LeaderContext {
    const leaderRoleIds = new Set(roles.filter((r) => r.isLeader).map((r) => r.id));
    const byId = new Map(hierarchy.map((h) => [h.groupId, h]));

    const sammelgruppen = hierarchy.filter((h) => h.title.includes(SAMMELGRUPPE_MARKER));
    const sammelgruppeFor = (stufe: Stufe) => sammelgruppen.find((g) => g.title.includes(stufe));

    const allTeams: TeamOption[] = [];
    for (const entry of hierarchy) {
        const match = entry.title.match(TEAM_PATTERN);
        if (!match) continue;
        const stufe = match[1] as Stufe;
        const sammelgruppe = sammelgruppeFor(stufe);
        allTeams.push({
            groupId: entry.groupId,
            name: entry.title,
            shortName: teamShortName(entry.title),
            stufe,
            sammelgruppeId: sammelgruppe?.groupId ?? null,
            sammelgruppeName: sammelgruppe?.title ?? null,
        });
    }
    allTeams.sort((a, b) =>
        a.stufe === b.stufe
            ? a.shortName.localeCompare(b.shortName, 'de')
            : a.stufe.localeCompare(b.stufe, 'de'),
    );

    const leaderGroupIds = new Set(
        memberships.filter((m) => leaderRoleIds.has(m.groupTypeRoleId)).map((m) => m.groupId),
    );
    const isStammleiter = memberships.some((m) => {
        const group = byId.get(m.groupId);
        if (!group) return false;
        if (group.title === ROOT_GROUP_NAME) return true;
        return STAMM_MA_PATTERN.test(group.title) && leaderRoleIds.has(m.groupTypeRoleId);
    });

    if (isStammleiter) return { kind: 'stammleiter', teams: allTeams };

    const ownTeams = allTeams.filter((t) => leaderGroupIds.has(t.groupId));
    if (ownTeams.length > 0) return { kind: 'teamleiter', teams: ownTeams };
    return { kind: 'none', teams: [] };
}
