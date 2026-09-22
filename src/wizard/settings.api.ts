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

export interface ExtensionSettings {
    /** Gruppen-ID der Hajk-Vorlage; ID statt Name, damit Umbenennen nichts bricht. */
    hajkTemplateGroupId: number;
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
        const parsed: unknown = JSON.parse(category.data);
        const id = (parsed as { hajkTemplateGroupId?: unknown }).hajkTemplateGroupId;
        return typeof id === 'number' ? { hajkTemplateGroupId: id } : null;
    } catch {
        return null;
    }
}

export async function saveSettings(next: ExtensionSettings): Promise<void> {
    const moduleId = await getModuleId();
    const existing = await getSettingsCategory(moduleId);
    const data = JSON.stringify(next);
    if (existing) {
        await apiPut(`/custommodules/${moduleId}/customdatacategories/${existing.id}`, { data });
    } else {
        await apiPost(`/custommodules/${moduleId}/customdatacategories`, {
            customModuleId: moduleId,
            name: CATEGORY_NAME,
            shorty: CATEGORY_SHORTY,
            description: CATEGORY_DESCRIPTION,
            data,
        });
    }
}

/** Gruppensuche für die Vorlagen-Auswahl in der Konfiguration. */
export async function searchGroups(query: string): Promise<GroupRes[]> {
    const q = query.trim();
    if (!q) return [];
    const groups = await apiGet<GroupRes[]>(`/groups?query=${encodeURIComponent(q)}&limit=25`);
    return groups.map((g) => ({ id: g.id, name: g.name }));
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
