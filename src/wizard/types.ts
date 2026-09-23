/**
 * Domänen-Typen des Hajk-Assistenten. Framework-frei — werden von der
 * Fachlogik (naming, leaderContext, validation, provisioning) und den
 * Komponenten gemeinsam benutzt.
 */

export type Stufe = 'Entdecker' | 'Forscher' | 'Kundschafter' | 'Pfadfinder' | 'Pfadranger';

export interface TeamOption {
    groupId: number;
    /** Voller CT-Gruppenname, z. B. "RR Kundschafterteam Eisbären". */
    name: string;
    /** Anzeigename ohne Präfix, z. B. "Eisbären". */
    shortName: string;
    stufe: Stufe;
    /** "RR | Camps und Aktionen – <Stufe>"; null, wenn die Sammelgruppe fehlt. */
    sammelgruppeId: number | null;
    sammelgruppeName: string | null;
}

export type AccessKind = 'none' | 'teamleiter' | 'stammleiter';

export interface LeaderContext {
    kind: AccessKind;
    teams: TeamOption[];
}

export interface TemplateField {
    id: number;
    name: string;
    fieldTypeCode: string;
    /** Options-Namen; leer bei Textfeldern. */
    options: string[];
    requiredInRegistrationForm: boolean;
}

export interface WizardContext {
    user: { id: number; firstName: string; lastName: string };
    leader: LeaderContext;
    template: {
        id: number;
        parentIds: number[];
        fields: TemplateField[];
        organisators: { personId: number; name: string }[];
    };
    /** Rolle „Leiter" am Gruppentyp der Vorlage. */
    eventLeaderRoleId: number;
    /** Rolle „Organisator" ebenda. */
    organisatorRoleId: number;
    /** Zielkalender (per Name aufgelöst); null, wenn er auf der Instanz fehlt. */
    calendarId: number | null;
}

export type SignupMode = 'self' | 'manual';

export interface FormState {
    teamId: number | null;
    /** "YYYY-MM-DD" (input type=date). */
    dateFrom: string;
    dateTo: string;
    location: string;
    /** Programm: was wird gemacht (Pflicht, förderrelevant). */
    description: string;
    /** Ungefährer Tagesablauf (Pflicht, förderrelevant). */
    dailySchedule: string;
    mode: SignupMode;
    /** "" = kein Anmeldeschluss; irrelevant bei mode === 'manual'. */
    signupDeadline: string;
    /** Freitext aus dem number input; "" = unbegrenzt. */
    maxMembers: string;
    /** Optionaler Titel-Zusatz des Leiters (wird sanitisiert angehängt). */
    titleSuffix: string;
    /** Anmeldung ohne ChurchTools-Login teilbar (visibility public). */
    publicSignup: boolean;
    /**
     * Gruppe sofort veröffentlichen (groupStatusId Aktiv statt Entwurf).
     * Nur bei publicSignup abgefragt; der öffentliche Link funktioniert
     * erst nach Veröffentlichung.
     */
    publishNow: boolean;
}

export type ProvisionStepId = 'duplicate' | 'configure' | 'parents' | 'members' | 'calendar';

export type StepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface ProvisionProgress {
    step: ProvisionStepId;
    status: StepStatus;
}

export type ProvisionOutcome =
    | { ok: true; groupId: number; calendarWarning: boolean }
    | {
          ok: false;
          failedStep: ProvisionStepId | 'precheck';
          message: string;
          rollback: 'done' | 'failed' | 'not-needed';
          existingGroupId?: number;
          orphanGroupId?: number;
      };
