/**
 * Leitet aus den Mitgliedschaften des Nutzers, dem Rollenkatalog und der
 * Gruppenhierarchie ab, wer den Assistenten nutzen darf und für welche
 * Teams (PRD US-1). Struktur-Konventionen siehe docs/CONVENTIONS.md:
 * Wurzel „RR Gesamt-Stammleitung“ → je Stufe „RR <Stufe>stamm-MA“ →
 * Stufenteams + Sammelgruppe („Camps und Aktionen“-Marker im Namen).
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
    const byId = new Map(hierarchy.map((h) => [h.groupId, h]));
    const root = hierarchy.find((h) => h.title === ROOT_GROUP_NAME);
    const leaderRoleIds = new Set(roles.filter((r) => r.isLeader).map((r) => r.id));

    const allTeams: TeamOption[] = [];
    const stammMaIds: number[] = [];
    for (const childId of root?.children ?? []) {
        const stammMa = byId.get(childId);
        const stufeMatch = stammMa?.title.match(STAMM_MA_PATTERN);
        if (!stammMa || !stufeMatch) continue;
        stammMaIds.push(stammMa.groupId);
        const stufe = stufeMatch[1] as Stufe;
        const sammelgruppe = stammMa.children
            .map((id) => byId.get(id))
            .find((g) => g?.title.includes(SAMMELGRUPPE_MARKER));
        for (const teamId of stammMa.children) {
            const team = byId.get(teamId);
            if (!team || !TEAM_PATTERN.test(team.title)) continue;
            allTeams.push({
                groupId: team.groupId,
                name: team.title,
                shortName: teamShortName(team.title),
                stufe,
                sammelgruppeId: sammelgruppe?.groupId ?? null,
            });
        }
    }
    allTeams.sort((a, b) =>
        a.stufe === b.stufe
            ? a.shortName.localeCompare(b.shortName, 'de')
            : a.stufe.localeCompare(b.stufe, 'de'),
    );

    const leaderGroupIds = new Set(
        memberships.filter((m) => leaderRoleIds.has(m.groupTypeRoleId)).map((m) => m.groupId),
    );
    const isStammleiter =
        stammMaIds.some((id) => leaderGroupIds.has(id)) ||
        memberships.some((m) => m.groupId === root?.groupId);

    if (isStammleiter) return { kind: 'stammleiter', teams: allTeams };

    const ownTeams = allTeams.filter((t) => leaderGroupIds.has(t.groupId));
    if (ownTeams.length > 0) return { kind: 'teamleiter', teams: ownTeams };
    return { kind: 'none', teams: [] };
}
