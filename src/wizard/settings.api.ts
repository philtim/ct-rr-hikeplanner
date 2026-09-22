/**
 * Persistierte Extension-Konfiguration im ChurchTools-KV-Store des
 * Custom-Moduls (gleicher Mechanismus wie im ct-rr-organigram): eine
 * customdatacategory „settings“ hält ein JSON-Objekt. Lesen ist „soft“ —
 * jede Störung (Modul fehlt, kein Recht, kaputtes JSON) ergibt null, und
 * der Wizard fällt auf die Namenskonvention zurück. Schreiben wirft; die
 * Rechteprüfung übernimmt ChurchTools (403 für Nicht-Admins).
 */
import { apiGet, apiPost, apiPut } from '@/shared/api';
import { EXTENSION_KEY } from './config';

export interface OrganisatorRef {
    personId: number;
    /** Anzeigename, gespeichert damit Leiter keine Personen-Leserechte brauchen. */
    name: string;
}

export interface ExtensionSettings {
    /** Gruppen-ID der Hajk-Vorlage; ID statt Name, damit Umbenennen nichts bricht. null = Namenskonvention. */
    hajkTemplateGroupId: number | null;
    /** Personen, die bei jeder Veranstaltung als Organisator eingetragen werden. */
    organisators: OrganisatorRef[];
}

const CATEGORY_SHORTY = 'settings';
const CATEGORY_NAME = 'Settings';
const CATEGORY_DESCRIPTION = 'Persistierte Konfiguration der Extension.';

interface CustomModuleRes {
    id: number;
    shorty: string;
}
interface DataCategoryRes {
    id: number;
    shorty: string;
    data?: string | null;
}
interface GroupRes {
    id: number;
    name: string;
}

async function getModuleId(): Promise<number> {
    const modules = await apiGet<CustomModuleRes[]>('/custommodules');
    const module = modules.find((m) => m.shorty === EXTENSION_KEY);
    if (!module) throw new Error(`Custom-Modul „${EXTENSION_KEY}“ nicht gefunden`);
    return module.id;
}

async function getSettingsCategory(moduleId: number): Promise<DataCategoryRes | undefined> {
    const categories = await apiGet<DataCategoryRes[]>(
        `/custommodules/${moduleId}/customdatacategories`,
    );
    return categories.find((c) => c.shorty === CATEGORY_SHORTY);
}

export async function loadSettings(): Promise<ExtensionSettings | null> {
    try {
        const moduleId = await getModuleId();
        const category = await getSettingsCategory(moduleId);
        if (!category?.data) return null;
        const parsed = JSON.parse(category.data) as {
            hajkTemplateGroupId?: unknown;
            organisators?: unknown;
        };
        const id =
            typeof parsed.hajkTemplateGroupId === 'number' ? parsed.hajkTemplateGroupId : null;
        const organisators = (Array.isArray(parsed.organisators) ? parsed.organisators : [])
            .filter(
                (o): o is OrganisatorRef =>
                    !!o &&
                    typeof (o as OrganisatorRef).personId === 'number' &&
                    typeof (o as OrganisatorRef).name === 'string',
            )
            .map((o) => ({ personId: o.personId, name: o.name }));
        if (id === null && organisators.length === 0) return null;
        return { hajkTemplateGroupId: id, organisators };
    } catch {
        return null;
    }
}

export async function saveSettings(next: ExtensionSettings): Promise<void> {
    const moduleId = await getModuleId();
    const existing = await getSettingsCategory(moduleId);
    // PUT wie POST verlangen das komplette Kategorie-Objekt — ein Update nur
    // mit {data} lehnt die API mit 400 ab (verifiziert auf rr-demo).
    const payload = {
        customModuleId: moduleId,
        name: CATEGORY_NAME,
        shorty: CATEGORY_SHORTY,
        description: CATEGORY_DESCRIPTION,
        data: JSON.stringify(next),
    };
    if (existing) {
        await apiPut(`/custommodules/${moduleId}/customdatacategories/${existing.id}`, payload);
    } else {
        await apiPost(`/custommodules/${moduleId}/customdatacategories`, payload);
    }
}

/** Gruppensuche für die Vorlagen-Auswahl in der Konfiguration. */
export async function searchGroups(query: string): Promise<GroupRes[]> {
    const q = query.trim();
    if (!q) return [];
    const groups = await apiGet<GroupRes[]>(`/groups?query=${encodeURIComponent(q)}&limit=25`);
    return groups.map((g) => ({ id: g.id, name: g.name }));
}

/** Personensuche für die Organisatoren-Auswahl in der Konfiguration (Admin). */
export async function searchPersons(query: string): Promise<OrganisatorRef[]> {
    const q = query.trim();
    if (!q) return [];
    const persons = await apiGet<{ id: number; firstName: string; lastName: string }[]>(
        `/persons?query=${encodeURIComponent(q)}&limit=15`,
    );
    return persons.map((p) => ({
        personId: p.id,
        name: `${p.firstName} ${p.lastName}`.trim(),
    }));
}

/** Name einer Gruppe für die Anzeige; null, wenn nicht lesbar/existent. */
export async function getGroupName(groupId: number): Promise<string | null> {
    try {
        const group = await apiGet<GroupRes>(`/groups/${groupId}`);
        return group.name;
    } catch {
        return null;
    }
}
