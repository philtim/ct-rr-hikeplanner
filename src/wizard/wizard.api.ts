/**
 * Alle ChurchTools-Aufrufe des Wizards. Dünn: 1 Endpoint pro Funktion plus
 * Mapping auf Domänen-Typen. Payload-Formen sind auf rr-demo verifiziert —
 * siehe docs/NOTES-api-spike.md (flache PATCH-Keys, isInternal-Pflichtfeld,
 * parents.domainIdentifier als String).
 *
 * Vorlage und Kalender werden zur Laufzeit über ihre NAMEN aufgelöst, damit
 * derselbe Build auf Demo- und Live-Instanz läuft (IDs differieren).
 */
import { apiDelete, apiGet, apiPatch, apiPost, apiPut, fetchAllPages } from '@/shared/api';
import { CALENDAR_NAME, TEMPLATE_GROUP_NAME } from './config';
import { loadSettings } from './settings.api';
import type { ExtensionSettings } from './settings.api';
import { buildGroupNote } from './eventText';
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
    /** null, wenn der Nutzer die Gruppe nicht sehen darf. */
    group?: { domainIdentifier: string; title: string } | null;
    groupTypeRoleId: number;
}
interface HierarchyRes {
    groupId: number;
    /** null, wenn der Nutzer die Gruppe nicht sehen darf. */
    group?: { title: string } | null;
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
interface CalendarRes {
    id: number;
    name: string;
}

function templateInvalid(reason: string): Error {
    return new Error(`template-invalid: ${reason}`);
}

async function findGroupIdByNameRaw(name: string): Promise<number | null> {
    const groups = await apiGet<GroupRes[]>(`/groups?query=${encodeURIComponent(name)}&limit=200`);
    return groups.find((g) => g.name === name)?.id ?? null;
}

/**
 * Vorlage auflösen: die im KV-Store konfigurierte Gruppen-ID gewinnt, sonst
 * greift die Namenskonvention. Beide Fehlerfälle verweisen auf die
 * Konfigurationsseite (Link im Footer), wo ein Admin die Vorlage festlegt.
 */
async function resolveTemplate(settings: ExtensionSettings | null): Promise<GroupRes> {
    if (settings?.hajkTemplateGroupId != null) {
        try {
            return await apiGet<GroupRes>(`/groups/${settings.hajkTemplateGroupId}`);
        } catch {
            throw templateInvalid(
                `die konfigurierte Vorlage (Gruppe ${settings.hajkTemplateGroupId}) existiert nicht mehr oder ist nicht lesbar — bitte unter „Konfiguration“ (Link im Footer) neu festlegen`,
            );
        }
    }
    const templateId = await findGroupIdByNameRaw(TEMPLATE_GROUP_NAME);
    if (templateId === null)
        throw templateInvalid(
            `Vorlagengruppe „${TEMPLATE_GROUP_NAME}“ wurde nicht gefunden — ein Admin kann die Vorlage unter „Konfiguration“ (Link im Footer) festlegen`,
        );
    return apiGet<GroupRes>(`/groups/${templateId}`);
}

export async function loadWizardContext(): Promise<WizardContext> {
    const me = await apiGet<WhoamiRes>('/whoami');

    const settings = await loadSettings();
    const template = await resolveTemplate(settings);
    const templateId = template.id;

    const [memberships, hierarchiesRaw, roles, fieldsRaw, membersRaw, parentsRaw, calendars] =
        await Promise.all([
            fetchAllPages<PersonGroupRes>(`/persons/${me.id}/groups`, { limit: 100 }),
            apiGet<HierarchyRes[]>('/groups/hierarchies'),
            apiGet<RoleRes[]>('/group/roles'),
            apiGet<MemberFieldRes[]>(`/groups/${templateId}/memberfields`),
            fetchAllPages<MemberRes>(`/groups/${templateId}/members`, { limit: 100 }),
            apiGet<ParentRes[]>(`/groups/${templateId}/parents`),
            apiGet<CalendarRes[]>('/calendars'),
        ]);

    const templateTypeId = template.information?.groupTypeId;
    if (!templateTypeId) throw templateInvalid('Gruppentyp der Vorlage nicht lesbar');

    const eventRoles = roles.filter((r) => r.groupTypeId === templateTypeId);
    // Leiter-Rolle bevorzugt über den Namen, sonst die erste isLeader-Rolle —
    // neue Gruppentypen haben teils englische Default-Rollennamen ("leader").
    const eventLeaderRoleId = (
        eventRoles.find((r) => r.isLeader && r.name === 'Leiter') ??
        eventRoles.find((r) => r.isLeader)
    )?.id;
    const organisatorRoleId = eventRoles.find((r) => r.name === 'Organisator')?.id;
    if (!eventLeaderRoleId || !organisatorRoleId)
        throw templateInvalid(
            'Rollen „Leiter“/„Organisator“ am Gruppentyp der Vorlage nicht gefunden',
        );

    // Konfigurierte Organisatoren (KV-Store) gewinnen — sie sind für alle
    // Nutzer lesbar (Namen liegen in den Settings, keine Personen-Leserechte
    // nötig). Fallback: Organisator-Mitglieder der Vorlage.
    const organisators = settings?.organisators?.length
        ? settings.organisators
        : membersRaw
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
    // Leer heißt hier meist: keine Konfiguration UND der Leiter darf die
    // Mitgliederliste der Vorlage nicht lesen. Kein Fehler — die
    // Provisionierung kopiert die Organisatoren dann serverseitig mit
    // (duplicate?copyMembers=true).

    const fields: TemplateField[] = fieldsRaw.map((f) => ({
        id: f.field.id,
        name: f.field.name,
        fieldTypeCode: f.field.fieldTypeCode,
        options: (f.field.options ?? []).map((o) => o.name),
        requiredInRegistrationForm: f.field.requiredInRegistrationForm,
    }));

    // CT liefert group: null für Gruppen ohne Sichtbarkeit — überspringen.
    const membershipsIn: MembershipIn[] = memberships
        .filter((m) => m.group?.domainIdentifier)
        .map((m) => ({
            groupId: Number(m.group!.domainIdentifier),
            groupTypeRoleId: m.groupTypeRoleId,
        }));
    const rolesIn: RoleIn[] = roles.map((r) => ({
        id: r.id,
        groupTypeId: r.groupTypeId,
        isLeader: r.isLeader,
    }));
    const hierarchyIn: HierarchyIn[] = hierarchiesRaw
        .filter((h) => h.group?.title)
        .map((h) => ({
            groupId: h.groupId,
            title: h.group!.title,
            parents: h.parents ?? [],
            children: h.children ?? [],
        }));

    return {
        user: { id: me.id, firstName: me.firstName, lastName: me.lastName },
        leader: deriveLeaderContext(membershipsIn, rolesIn, hierarchyIn),
        template: {
            id: templateId,
            parentIds: parentsRaw.map((p) => Number(p.domainIdentifier)),
            fields,
            organisators,
        },
        eventLeaderRoleId,
        organisatorRoleId,
        calendarId: calendars.find((c) => c.name === CALENDAR_NAME)?.id ?? null,
    };
}

export interface ProvisionApi {
    findGroupIdByName(name: string): Promise<number | null>;
    duplicateGroup(templateId: number, newName: string, copyMembers: boolean): Promise<number>;
    configureGroup(groupId: number, form: FormState): Promise<void>;
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
    findGroupIdByName: findGroupIdByNameRaw,

    async duplicateGroup(templateId, newName, copyMembers) {
        const group = await apiPost<GroupRes>(
            `/groups/${templateId}/duplicate?newName=${encodeURIComponent(newName)}${copyMembers ? '&copyMembers=true' : ''}`,
        );
        return group.id;
    },

    async configureGroup(groupId, form) {
        const note = buildGroupNote(form);
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
            // Öffentliche Anmeldung: Link funktioniert ohne CT-Login.
            ...(form.mode === 'self' && form.publicSignup
                ? { visibility: 'public', isPublic: true }
                : {}),
            // Duplikate entstehen als Entwurf (groupStatusId 2) — veröffentlichen,
            // außer der Leiter hat es bei öffentlicher Anmeldung explizit abgewählt.
            ...(form.mode === 'self' && form.publicSignup && !form.publishNow
                ? {}
                : { groupStatusId: 1 }),
        });
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
