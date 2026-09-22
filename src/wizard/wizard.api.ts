/**
 * Alle ChurchTools-Aufrufe des Wizards. Dünn: 1 Endpoint pro Funktion plus
 * Mapping auf Domänen-Typen. Payload-Formen sind auf rr-demo verifiziert —
 * siehe docs/NOTES-api-spike.md (flache PATCH-Keys, isInternal-Pflichtfeld,
 * parents.domainIdentifier als String).
 */
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, fetchAllPages } from '@/shared/api';
import { TEMPLATE_GROUP_ID } from './config';
import { deriveLeaderContext } from './leaderContext';
import type { HierarchyIn, MembershipIn, RoleIn } from './leaderContext';
import type { FormState, TemplateField, WizardContext } from './types';

interface WhoamiRes {
    id: number;
    firstName: string;
    lastName: string;
}
interface PersonGroupRes {
    id?: number;
    group: { domainIdentifier: string; title: string };
    groupTypeRoleId: number;
}
interface HierarchyRes {
    groupId: number;
    group: { title: string };
    parents?: number[];
    children?: number[];
}
interface RoleRes {
    id: number;
    groupTypeId: number;
    isLeader: boolean;
    name: string;
}
interface GroupRes {
    id: number;
    name: string;
    information?: { groupTypeId?: number };
}
interface MemberFieldRes {
    field: {
        id: number;
        name: string;
        fieldTypeCode: string;
        options: { id: number | string; name: string }[] | null;
        requiredInRegistrationForm: boolean;
    };
}
interface MemberRes {
    id?: number;
    personId: number;
    groupTypeRoleId: number;
    person?: { domainAttributes?: { firstName?: string; lastName?: string } };
}
interface ParentRes {
    domainIdentifier: string;
    title: string;
}

function templateInvalid(reason: string): Error {
    return new Error(`template-invalid: ${reason}`);
}

export async function loadWizardContext(): Promise<WizardContext> {
    const me = await apiGet<WhoamiRes>('/whoami');

    const [memberships, hierarchiesRaw, roles, template, fieldsRaw, membersRaw, parentsRaw] =
        await Promise.all([
            fetchAllPages<PersonGroupRes>(`/persons/${me.id}/groups`, { limit: 100 }),
            apiGet<HierarchyRes[]>('/groups/hierarchies'),
            apiGet<RoleRes[]>('/group/roles'),
            apiGet<GroupRes>(`/groups/${TEMPLATE_GROUP_ID}`),
            apiGet<MemberFieldRes[]>(`/groups/${TEMPLATE_GROUP_ID}/memberfields`),
            fetchAllPages<MemberRes>(`/groups/${TEMPLATE_GROUP_ID}/members`, { limit: 100 }),
            apiGet<ParentRes[]>(`/groups/${TEMPLATE_GROUP_ID}/parents`),
        ]);

    const templateTypeId = template.information?.groupTypeId;
    if (!templateTypeId) throw templateInvalid('Gruppentyp der Vorlage nicht lesbar');

    const eventRoles = roles.filter((r) => r.groupTypeId === templateTypeId);
    const eventLeaderRoleId = eventRoles.find((r) => r.isLeader && r.name === 'Leiter')?.id;
    const organisatorRoleId = eventRoles.find((r) => r.name === 'Organisator')?.id;
    if (!eventLeaderRoleId || !organisatorRoleId)
        throw templateInvalid(
            'Rollen „Leiter“/„Organisator“ am Gruppentyp der Vorlage nicht gefunden',
        );

    const organisators = membersRaw
        .filter((m) => m.groupTypeRoleId === organisatorRoleId)
        .map((m) => ({
            personId: m.personId,
            name: [
                m.person?.domainAttributes?.firstName ?? '',
                m.person?.domainAttributes?.lastName ?? '',
            ]
                .join(' ')
                .trim(),
        }));
    if (organisators.length === 0)
        throw templateInvalid('kein Mitglied mit Rolle „Organisator“ in der Vorlagengruppe');

    const fields: TemplateField[] = fieldsRaw.map((f) => ({
        id: f.field.id,
        name: f.field.name,
        fieldTypeCode: f.field.fieldTypeCode,
        options: (f.field.options ?? []).map((o) => o.name),
        requiredInRegistrationForm: f.field.requiredInRegistrationForm,
    }));

    const membershipsIn: MembershipIn[] = memberships.map((m) => ({
        groupId: Number(m.group.domainIdentifier),
        groupTypeRoleId: m.groupTypeRoleId,
    }));
    const rolesIn: RoleIn[] = roles.map((r) => ({
        id: r.id,
        groupTypeId: r.groupTypeId,
        isLeader: r.isLeader,
    }));
    const hierarchyIn: HierarchyIn[] = hierarchiesRaw.map((h) => ({
        groupId: h.groupId,
        title: h.group.title,
        parents: h.parents ?? [],
        children: h.children ?? [],
    }));

    return {
        user: { id: me.id, firstName: me.firstName, lastName: me.lastName },
        leader: deriveLeaderContext(membershipsIn, rolesIn, hierarchyIn),
        template: {
            id: TEMPLATE_GROUP_ID,
            parentIds: parentsRaw.map((p) => Number(p.domainIdentifier)),
            fields,
            organisators,
        },
        eventLeaderRoleId,
        organisatorRoleId,
    };
}

export interface ProvisionApi {
    findGroupIdByName(name: string): Promise<number | null>;
    duplicateGroup(templateId: number, newName: string): Promise<number>;
    configureGroup(groupId: number, form: FormState): Promise<void>;
    listMemberFields(groupId: number): Promise<{ id: number; name: string }[]>;
    deleteMemberField(groupId: number, fieldId: number): Promise<void>;
    listParentIds(groupId: number): Promise<number[]>;
    removeParent(groupId: number, parentId: number): Promise<void>;
    addParent(groupId: number, parentId: number): Promise<void>;
    putMember(groupId: number, personId: number, roleId: number): Promise<void>;
    createAppointment(
        calendarId: number,
        a: { caption: string; startDate: string; endDate: string; description: string },
    ): Promise<void>;
    deleteGroup(groupId: number): Promise<void>;
}

export const provisionApi: ProvisionApi = {
    async findGroupIdByName(name) {
        const groups = await apiGet<GroupRes[]>(
            `/groups?query=${encodeURIComponent(name)}&limit=200`,
        );
        return groups.find((g) => g.name === name)?.id ?? null;
    },

    async duplicateGroup(templateId, newName) {
        const group = await apiPost<GroupRes>(
            `/groups/${templateId}/duplicate?newName=${encodeURIComponent(newName)}`,
        );
        return group.id;
    },

    async configureGroup(groupId, form) {
        const note = form.location.trim()
            ? `${form.description}\n\nTreffpunkt: ${form.location.trim()}`
            : form.description;
        // Flache Top-Level-Keys — verschachtelte settings/information ignoriert
        // die API stillschweigend (docs/NOTES-api-spike.md §1).
        await apiPatch(`/groups/${groupId}`, {
            note,
            dateOfFoundation: form.dateFrom,
            endDate: form.dateTo,
            maxMembers: form.maxMembers === '' ? null : Number(form.maxMembers),
            signUpOpeningDate: form.mode === 'self' ? new Date().toISOString() : null,
            signUpClosingDate:
                form.mode === 'self' && form.signupDeadline
                    ? `${form.signupDeadline}T23:59:59Z`
                    : null,
        });
    },

    async listMemberFields(groupId) {
        const fields = await apiGet<MemberFieldRes[]>(`/groups/${groupId}/memberfields`);
        return fields.map((f) => ({ id: f.field.id, name: f.field.name }));
    },

    async deleteMemberField(groupId, fieldId) {
        await apiDelete(`/groups/${groupId}/memberfields/group/${fieldId}`);
    },

    async listParentIds(groupId) {
        const parents = await apiGet<ParentRes[]>(`/groups/${groupId}/parents`);
        return parents.map((p) => Number(p.domainIdentifier));
    },

    async removeParent(groupId, parentId) {
        await apiDelete(`/groups/${groupId}/parents/${parentId}`);
    },

    async addParent(groupId, parentId) {
        await apiPut(`/groups/${groupId}/parents/${parentId}`, {});
    },

    async putMember(groupId, personId, roleId) {
        await apiPut(`/groups/${groupId}/members/${personId}`, { groupTypeRoleId: roleId });
    },

    async createAppointment(calendarId, a) {
        // isInternal ist Pflichtfeld; note wäre der Untertitel, Langtext gehört
        // in description (docs/NOTES-api-spike.md §4).
        await apiPost(`/calendars/${calendarId}/appointments`, {
            caption: a.caption,
            startDate: a.startDate,
            endDate: a.endDate,
            allDay: true,
            isInternal: false,
            description: a.description,
        });
    },

    async deleteGroup(groupId) {
        await apiDelete(`/groups/${groupId}`);
    },
};
