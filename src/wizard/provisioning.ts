/**
 * Provisionierungs-Engine (PRD US-4/US-5): dupliziert die Vorlage und
 * konfiguriert das Duplikat Schritt für Schritt. Schlägt ein Kernschritt
 * fehl, wird die Gruppe wieder gelöscht (Rollback) — es bleibt kein
 * Teilzustand zurück. Nur der Kalenderschritt ist optional: sein Fehler
 * führt zu einer Warnung, nicht zum Rollback (PRD US-5).
 */
import { buildGroupName } from './naming';
import type { ProvisionApi } from './wizard.api';
import type {
    FormState,
    ProvisionOutcome,
    ProvisionProgress,
    ProvisionStepId,
    TeamOption,
    WizardContext,
} from './types';

export interface ProvisionInput {
    form: FormState;
    /** Aufgelöstes Team; sammelgruppeId ist hier garantiert non-null (Gate in US-1). */
    team: TeamOption;
    context: WizardContext;
    /** null = Kalender existiert auf der Instanz nicht → Warnung statt Termin. */
    calendarId: number | null;
    /** Baut die Frontend-URL einer Gruppe (für die Termin-Beschreibung). */
    groupUrl: (groupId: number) => string;
}

class StepError extends Error {
    readonly step: ProvisionStepId;

    constructor(step: ProvisionStepId, cause: unknown) {
        super(cause instanceof Error ? cause.message : String(cause));
        this.step = step;
    }
}

export async function executeProvisioning(
    input: ProvisionInput,
    api: ProvisionApi,
    onProgress: (p: ProvisionProgress) => void,
): Promise<ProvisionOutcome> {
    const { form, team, context, calendarId } = input;
    const name = buildGroupName(team.name, form.dateFrom, form.dateTo, form.titleSuffix);

    const existingGroupId = await api.findGroupIdByName(name);
    if (existingGroupId !== null) {
        return {
            ok: false,
            failedStep: 'precheck',
            message: 'Es gibt bereits eine Gruppe mit diesem Namen.',
            rollback: 'not-needed',
            existingGroupId,
        };
    }

    async function run<T>(step: ProvisionStepId, fn: () => Promise<T>): Promise<T> {
        onProgress({ step, status: 'running' });
        try {
            const result = await fn();
            onProgress({ step, status: 'done' });
            return result;
        } catch (e) {
            onProgress({ step, status: 'failed' });
            throw new StepError(step, e);
        }
    }

    // Kann der Leiter die Vorlagen-Mitglieder nicht lesen (leere Liste),
    // kopiert der Server die Organisatoren beim Duplizieren mit.
    const copyMembers = context.template.organisators.length === 0;

    let groupId: number | null = null;
    let fieldsWarning = false;
    try {
        groupId = await run('duplicate', () =>
            api.duplicateGroup(context.template.id, name, copyMembers),
        );
        const newGroupId = groupId;

        // Leiter zuerst: Als Gruppenleiter hat der Anfragende für die
        // Folgeschritte die gruppeneigenen Verwaltungsrechte.
        await run('members', async () => {
            for (const organisator of context.template.organisators) {
                await api.putMember(newGroupId, organisator.personId, context.organisatorRoleId);
            }
            await api.putMember(newGroupId, context.user.id, context.eventLeaderRoleId);
        });

        await run('configure', () => api.configureGroup(newGroupId, form));

        // Feld-Reduktion ist nicht fatal: Scheitert das Löschen an Rechten,
        // bleibt die Gruppe bestehen und das Ergebnis zeigt eine Warnung.
        try {
            await run('fields', async () => {
                // Die Feld-IDs des Duplikats sind neu — Auswahl über Namen mappen.
                const selectedNames = new Set(
                    context.template.fields
                        .filter((f) => form.selectedFieldIds.includes(f.id))
                        .map((f) => f.name),
                );
                const duplicateFields = await api.listMemberFields(newGroupId);
                for (const field of duplicateFields) {
                    if (!selectedNames.has(field.name)) {
                        await api.deleteMemberField(newGroupId, field.id);
                    }
                }
            });
        } catch {
            fieldsWarning = true;
        }

        await run('parents', async () => {
            const inherited = await api.listParentIds(newGroupId);
            for (const parentId of inherited) {
                await api.removeParent(newGroupId, parentId);
            }
            await api.addParent(newGroupId, team.sammelgruppeId as number);
        });
    } catch (e) {
        const step = e instanceof StepError ? e.step : 'duplicate';
        const message = e instanceof Error ? e.message : String(e);
        if (groupId === null) {
            return { ok: false, failedStep: step, message, rollback: 'not-needed' };
        }
        try {
            await api.deleteGroup(groupId);
            return { ok: false, failedStep: step, message, rollback: 'done' };
        } catch {
            return {
                ok: false,
                failedStep: step,
                message,
                rollback: 'failed',
                orphanGroupId: groupId,
            };
        }
    }

    let calendarWarning = false;
    if (calendarId === null) {
        // Kalender fehlt auf der Instanz — Gruppe bleibt, Termin manuell (US-5).
        onProgress({ step: 'calendar', status: 'failed' });
        return { ok: true, groupId, calendarWarning: true, fieldsWarning };
    }
    try {
        const finalGroupId = groupId;
        await run('calendar', () =>
            api.createAppointment(calendarId, {
                caption: name,
                startDate: form.dateFrom,
                endDate: form.dateTo,
                description: `${form.description}\n\nGruppe: ${input.groupUrl(finalGroupId)}`,
            }),
        );
    } catch {
        calendarWarning = true;
    }

    return { ok: true, groupId, calendarWarning, fieldsWarning };
}
