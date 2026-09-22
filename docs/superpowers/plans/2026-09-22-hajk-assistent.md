# HikePlanner Hajk-Assistent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ChurchTools-Extension „HikePlanner“: ein 3-Schritte-Wizard, mit dem RR-Team-Leiter eine vollständig konfigurierte Hajk-Gruppe inkl. Kalendertermin anlegen.

**Architecture:** Vue-3-Extension nach dem ct-template-Muster (gehärteter API-Layer in `src/shared/api`, Feature-Ordner `src/wizard/`). Die gesamte Fachlogik (Rollen-/Hierarchie-Auswertung, Namensschema, Validierung, Provisionierungs-Engine mit Rollback) liegt in framework-freien, per Vitest TDD-getesteten Modulen; Vue-Komponenten sind dünne Ansichten darüber. Provisionierung = Vorlage duplizieren → Duplikat konfigurieren → Felder reduzieren → Hierarchie korrigieren → Mitglieder eintragen → Kalendertermin.

**Tech Stack:** Vue 3, TypeScript, Vite, Vitest + @vue/test-utils + happy-dom, `@churchtools/churchtools-client` (nur via `src/shared/api`).

**Spec:** `docs/prds/prd-hikeplanner-hajk-assistent-v0.1.md` (WAS) + `docs/design/001-hajk-assistent-wizard.md` (WIE es aussieht) + `docs/design/DESIGN-BASELINE.md`.

## Global Constraints

- Alle CSS-Selektoren unter `.rr-hikeplanner-root`; Farben nur über CSS-Custom-Properties (hell + dunkel), keine Hex-Werte in Komponenten.
- Kein `localStorage`/`sessionStorage`; der Wizard persistiert nichts (KV-Store wird im MVP nicht gebraucht).
- `@churchtools/churchtools-client` wird ausschließlich in `src/shared/api/` importiert (ESLint-Regel aus dem Template erzwingt das).
- Keine hartkodierten IDs außer in `src/wizard/config.ts` (env-überschreibbar); Rollen werden über Flags/Namen aus `/api/group/roles` aufgelöst, Gruppen über Namensmuster aus der Hierarchie.
- Gruppenfelder immer über `referenceName`/Semantik auflösen, nie über numerische IDs quer über Instanzen.
- Namensschema exakt: `RR Hajk <TeamKurzname> <DD.MM.–DD.MM.YYYY>` (bei Jahreswechsel `DD.MM.YYYY–DD.MM.YYYY`).
- Copy: Du-Form, verb-first CTAs, Texte aus der Design-Spec wörtlich übernehmen.
- Commits: imperative mood, klein und fokussiert. Jeder Task endet mit grünem `npm run test` und Commit.
- Entwicklung und alle Schreibtests gegen https://rr-demo.church.tools (`.env`), nie gegen live.
- Alle Instanz-Konfiguration in `.env` nach Muster `~/Development/ct-rr-organigram/.env` (nie committen; `.env-example` pflegen).

---

### Task 1: Repo-Scaffold aus ct-template

**Files:**
- Create: gesamtes Projektgerüst durch Kopie von `~/Development/ct-template` (ohne `.git/`, `node_modules/`, `package-lock.json` bleibt)
- Modify: `package.json` (Name + `churchtools`-Block), `index.html` (Root-Element-ID), `.env` (lokal, nicht committen), `.env-example`
- Vorhandene Dateien bleiben: `docs/prds/`, `docs/design/`, `docs/superpowers/`

**Interfaces:**
- Produces: lauffähiges Vue-Gerüst; `EXTENSION_KEY` = `rr-hikeplanner`; Root-Element `#rr-hikeplanner-app`; Root-CSS-Klasse `rr-hikeplanner-root`; API-Layer `@/shared/api` mit `apiGet/apiPost/apiPut/apiDelete`, `ChurchToolsApiError`, `fetchAllPages`.

- [ ] **Step 1: Template kopieren und Git initialisieren**

```bash
cd /home/phil/Development/ct-rr-hikeplanner
rsync -a --exclude='.git' --exclude='node_modules' ~/Development/ct-template/ ./
git init -b main
```

- [ ] **Step 2: Template initialisieren**

`npm run init` ist interaktiv; falls es keine Flags unterstützt (in `scripts/init-template.js` nachsehen), die Werte manuell setzen: In `package.json` → `name: "ct-rr-hikeplanner"`, `description: "ChurchTools extension: Hajk-Assistent für Royal Rangers JMS Altensteig"`, `churchtools: { "shorty": "rr-hikeplanner", "moduleName": "RR HikePlanner", "extensionKey": "rr-hikeplanner", "rootElementId": "rr-hikeplanner-app", "rootClassName": "rr-hikeplanner-root" }`. In `index.html` die Element-ID auf `rr-hikeplanner-app` ändern, `<title>RR HikePlanner</title>`. In `src/main.ts` den Mount-Selektor auf `#rr-hikeplanner-app` ändern. `scripts/init-template.js` und den `init`-Script-Eintrag danach löschen.

- [ ] **Step 3: .env anlegen (nicht committen) und .env-example anpassen**

`.env` (Werte für Demo-Instanz aus `~/Development/ct-rr-organigram/.env` übernehmen — Datei nicht in den Kontext laden, nur kopieren):

```bash
grep -E '^(VITE_BASE_URL|VITE_USERNAME|VITE_PASSWORD)=' ~/Development/ct-rr-organigram/.env > .env
echo 'VITE_KEY=rr-hikeplanner' >> .env
echo 'VITE_TEMPLATE_GROUP_ID=' >> .env
echo 'VITE_CALENDAR_ID=' >> .env
```

`.env-example` um die zwei neuen Variablen ergänzen (mit Kommentar: Live-Defaults 2587 / 69 stecken in `src/wizard/config.ts`; auf der Demo-Instanz die IDs aus dem Seed-Script eintragen, siehe Task 15).

- [ ] **Step 4: Install + Quality-Gate**

```bash
npm install
npm run check
```

Expected: lint, typecheck und build laufen durch (das Template ist grün).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold extension from ct-template"
```

---

### Task 2: Vitest-Setup

**Files:**
- Create: `vitest.config.ts`, `src/wizard/__tests__/smoke.spec.ts`
- Modify: `package.json` (devDependencies, scripts), `tsconfig.app.json` (types)

**Interfaces:**
- Produces: `npm run test` (einmalig) und `npm run test:watch`; `check`-Script enthält `test`.

- [ ] **Step 1: Pakete installieren**

```bash
npm install -D vitest happy-dom @vue/test-utils
```

- [ ] **Step 2: vitest.config.ts anlegen**

```ts
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    test: {
        environment: 'happy-dom',
        include: ['src/**/__tests__/**/*.spec.ts'],
    },
});
```

- [ ] **Step 3: Scripts verdrahten**

In `package.json`: `"test": "vitest run"`, `"test:watch": "vitest"`, und `"check": "npm run lint && npm run typecheck && npm run test && npm run build"`.

- [ ] **Step 4: Smoke-Test schreiben und laufen lassen**

`src/wizard/__tests__/smoke.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';

describe('vitest setup', () => {
    it('runs', () => {
        expect(1 + 1).toBe(2);
    });
});
```

Run: `npm run test` — Expected: 1 passed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: add vitest with happy-dom and wire into check"
```

---

### Task 3: API-Spike auf rr-demo (Settings-PATCH, Parents-GET, Appointment-POST)

**Files:**
- Create: `docs/NOTES-api-spike.md`

**Interfaces:**
- Produces: verbindliche Antworten für Task 9/10: (a) Wie schaltet man Selbstanmeldung an/aus bzw. setzt `signUpOpeningDate`/`signUpClosingDate`/`visibility`/`maxMembers` per API? (b) Liefert `GET /groups/{id}/parents` die Eltern des Duplikats (Antwort-Shape)? (c) Minimal-Payload für `POST /calendars/{calendarId}/appointments` (Antwort enthält Termin-ID zum Aufräumen/Verlinken).

Dies ist ein Spike: Wegwerf-Objekte (Namenspräfix `ZZ Spike`), am Ende alles löschen, kein Produktionscode.

- [ ] **Step 1: Session aufbauen und Wegwerfgruppe anlegen**

Mit `.env`-Credentials (Cookie-Login + CSRF-Token wie folgt) eine Gruppe `ZZ Spike HikePlanner` (`groupTypeId: 3`, `groupStatusId: 1`) per `POST /api/groups` anlegen:

```bash
set -a; source .env; set +a
cj=$(mktemp)
curl -s -c "$cj" -X POST "$VITE_BASE_URL/api/login" -H 'Content-Type: application/json' \
  -d "{\"username\":\"$VITE_USERNAME\",\"password\":\"$VITE_PASSWORD\"}"
csrf=$(curl -s -b "$cj" "$VITE_BASE_URL/api/csrftoken" | python3 -c "import json,sys; print(json.load(sys.stdin)['data'])")
```

- [ ] **Step 2: Settings-PATCH-Varianten durchprobieren**

Bekannt aus Recon 21.09.2026: `PATCH /api/groups/{id}` mit `{"settings":{"autoAccept":…}}` wirkt, aber `visibility`, `isOpenForMembers`, `signUpOpeningDate` wurden stillschweigend ignoriert. Nacheinander testen und je Variante `GET /api/groups/{id}` gegenprüfen:

1. `{"settings":{"signUpOpeningDate":"2026-09-01T00:00:00Z","signUpClosingDate":"2026-12-01T00:00:00Z"}}` (Zulu-Format)
2. `{"settings":{"signUpOpeningDate":"2026-09-01"}}` (Datum ohne Zeit)
3. `{"visibility":"intern"}` und `{"settings":{"visibility":"intern"}}` — prüfen, ob `visibility` evtl. nur mit zusätzlichem Recht („Sichtbarkeit ändern“) oder anderem Wert (`public|intern|restricted|hidden`) reagiert
4. `{"settings":{"maxMembers":20}}` und `{"information":{"note":"Test-Beschreibung"}}` sowie Top-Level `{"note":"…"}` — klären, wo die Beschreibung liegt
5. Datumsfelder der Gruppe: `{"information":{"dateOfFoundation":"2027-04-10","endDate":"2027-04-12"}}`

- [ ] **Step 3: Duplikat + Parents-Endpoint prüfen**

`POST /api/groups/{spikeId}/duplicate?newName=ZZ%20Spike%20Kopie` → neue ID. Dann `GET /api/groups/{neueId}/parents` — Shape notieren. `DELETE /api/groups/{neueId}/parents/{parentId}` und `PUT …/parents/{parentId}` einmal durchspielen (Recon: PUT → 201).

- [ ] **Step 4: Appointment-POST prüfen**

Ersten Kalender der Demo-Instanz via `GET /api/calendars` nehmen. Minimal-Payload testen:

```json
{ "caption": "ZZ Spike Termin", "startDate": "2027-04-10", "endDate": "2027-04-12", "allDay": true, "note": "Spike" }
```

Bei Validierungsfehlern die Fehlermeldung lesen und Pflichtfelder ergänzen (Kandidaten laut OpenAPI-Typen: `description`, `isInternal`, `link`). Erfolgreiche Antwort: ID + Shape notieren. Termin per `DELETE /api/calendars/{calId}/appointments/{id}` löschen (falls der Pfad nicht existiert: in `~/Development/ct-rr-exodus/src/shared/ct-types.generated.d.ts` nach `delete-calendars` suchen).

- [ ] **Step 5: Aufräumen und Ergebnis dokumentieren**

Beide `ZZ Spike*`-Gruppen per `DELETE /api/groups/{id}` löschen; `GET /api/groups?query=ZZ Spike` muss leer sein. `docs/NOTES-api-spike.md` schreiben mit: funktionierender Payload je Frage (wörtlich), Antwort-Shapes, und der **Entscheidung** für den Anmeldemodus „manuell“: bevorzugt `signUpOpeningDate/ClosingDate`-Steuerung; falls Settings partout nicht schreibbar sind → Fallback dokumentieren (zweite Vorlagen-Variante, PRD-Risiko Nr. 1) und User informieren, bevor Task 9 startet.

- [ ] **Step 6: Commit**

```bash
git add docs/NOTES-api-spike.md
git commit -m "docs: record API spike findings for provisioning"
```

---

### Task 4: Feature-Typen und Konfiguration

**Files:**
- Create: `src/wizard/types.ts`, `src/wizard/config.ts`
- Test: kein eigener Test (reine Typen/Konstanten); Typecheck genügt

**Interfaces:**
- Produces (von allen Folge-Tasks konsumiert):

```ts
// src/wizard/types.ts
export type Stufe = 'Entdecker' | 'Forscher' | 'Kundschafter' | 'Pfadfinder' | 'Pfadranger';

export interface TeamOption {
    groupId: number;
    name: string;        // "RR Kundschafterteam Eisbären"
    shortName: string;   // "Eisbären"
    stufe: Stufe;
    sammelgruppeId: number | null; // "RR | Camps und Aktionen – <Stufe>"
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
    options: string[];               // Options-Namen, leer bei Textfeldern
    requiredInRegistrationForm: boolean;
}

export interface WizardContext {
    user: { id: number; firstName: string; lastName: string };
    leader: LeaderContext;
    template: {
        id: number;
        parentIds: number[];
        fields: TemplateField[];
        organisatorPersonIds: number[];
    };
    eventLeaderRoleId: number;       // Rolle „Leiter“ am Gruppentyp der Vorlage
    organisatorRoleId: number;       // Rolle „Organisator“ ebenda
}

export type SignupMode = 'self' | 'manual';

export interface FormState {
    teamId: number | null;
    dateFrom: string;                // "YYYY-MM-DD" (input type=date)
    dateTo: string;
    location: string;
    description: string;
    mode: SignupMode;
    signupDeadline: string;          // "" wenn mode==='manual'
    maxMembers: string;              // Freitext aus number input, "" = unbegrenzt
    selectedFieldIds: number[];
}

export type ProvisionStepId =
    | 'duplicate' | 'configure' | 'fields' | 'parents' | 'members' | 'calendar';

export type StepStatus = 'pending' | 'running' | 'done' | 'failed';

export interface ProvisionProgress {
    step: ProvisionStepId;
    status: StepStatus;
}

export type ProvisionOutcome =
    | { ok: true; groupId: number; calendarWarning: boolean }
    | { ok: false; failedStep: ProvisionStepId | 'precheck'; message: string;
        rollback: 'done' | 'failed' | 'not-needed'; existingGroupId?: number;
        orphanGroupId?: number };
```

```ts
// src/wizard/config.ts — einzige Stelle mit Instanz-IDs, env-überschreibbar
export const TEMPLATE_GROUP_ID = Number(import.meta.env.VITE_TEMPLATE_GROUP_ID || 2587);
export const CALENDAR_ID = Number(import.meta.env.VITE_CALENDAR_ID || 69);
export const ROOT_GROUP_NAME = 'RR Gesamt-Stammleitung';
export const STAMM_MA_PATTERN = /^RR (Entdecker|Forscher|Kundschafter|Pfadfinder|Pfadranger)stamm-MA$/;
export const TEAM_PATTERN = /^RR (Entdecker|Forscher|Kundschafter|Pfadfinder|Pfadranger)team (.+)$/;
export const SAMMELGRUPPE_MARKER = 'Camps und Aktionen';
```

- [ ] **Step 1: Beide Dateien exakt wie oben anlegen**
- [ ] **Step 2: Typecheck**

Run: `npm run typecheck` — Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/wizard/types.ts src/wizard/config.ts
git commit -m "feat: add wizard domain types and instance config"
```

---

### Task 5: Namensschema und Datums-Helfer (`naming.ts`)

**Files:**
- Create: `src/wizard/naming.ts`
- Test: `src/wizard/__tests__/naming.spec.ts`

**Interfaces:**
- Produces:

```ts
export function teamShortName(fullName: string): string;      // "RR Kundschafterteam Eisbären" → "Eisbären"; kein Pattern-Match → fullName unverändert
export function formatDateRange(fromIso: string, toIso: string): string; // "10.04.–12.04.2027", Jahreswechsel: "28.12.2026–02.01.2027"
export function buildGroupName(teamFullName: string, fromIso: string, toIso: string): string; // "RR Hajk Eisbären 10.04.–12.04.2027"
export function countNights(fromIso: string, toIso: string): number; // Kalendertage Differenz; ungültige/leere Eingabe → 0
```

- [ ] **Step 1: Failing Tests schreiben**

```ts
import { describe, expect, it } from 'vitest';
import { buildGroupName, countNights, formatDateRange, teamShortName } from '@/wizard/naming';

describe('teamShortName', () => {
    it('strips the RR <Stufe>team prefix', () => {
        expect(teamShortName('RR Kundschafterteam Eisbären')).toBe('Eisbären');
        expect(teamShortName('RR Pfadrangerteam Die Wilden Hühner')).toBe('Die Wilden Hühner');
    });
    it('returns unknown patterns unchanged', () => {
        expect(teamShortName('RR Projektrangers')).toBe('RR Projektrangers');
    });
});

describe('formatDateRange', () => {
    it('formats a same-year range', () => {
        expect(formatDateRange('2027-04-10', '2027-04-12')).toBe('10.04.–12.04.2027');
    });
    it('formats a cross-year range with both years', () => {
        expect(formatDateRange('2026-12-28', '2027-01-02')).toBe('28.12.2026–02.01.2027');
    });
});

describe('buildGroupName', () => {
    it('follows the RR Hajk <Team> <Datum> schema', () => {
        expect(buildGroupName('RR Kundschafterteam Eisbären', '2027-04-10', '2027-04-12'))
            .toBe('RR Hajk Eisbären 10.04.–12.04.2027');
    });
});

describe('countNights', () => {
    it('counts calendar nights', () => {
        expect(countNights('2027-04-10', '2027-04-12')).toBe(2);
        expect(countNights('2027-04-10', '2027-04-10')).toBe(0);
    });
    it('returns 0 for missing input', () => {
        expect(countNights('', '2027-04-12')).toBe(0);
    });
});
```

- [ ] **Step 2: Test rot sehen**

Run: `npm run test` — Expected: FAIL („Cannot find module '@/wizard/naming'“).

- [ ] **Step 3: Implementieren**

```ts
import { TEAM_PATTERN } from './config';

export function teamShortName(fullName: string): string {
    const m = fullName.match(TEAM_PATTERN);
    return m ? m[2] : fullName;
}

function parts(iso: string): { d: string; m: string; y: string } | null {
    const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? { y: m[1], m: m[2], d: m[3] } : null;
}

export function formatDateRange(fromIso: string, toIso: string): string {
    const f = parts(fromIso);
    const t = parts(toIso);
    if (!f || !t) return '';
    if (f.y === t.y) return `${f.d}.${f.m}.–${t.d}.${t.m}.${t.y}`;
    return `${f.d}.${f.m}.${f.y}–${t.d}.${t.m}.${t.y}`;
}

export function buildGroupName(teamFullName: string, fromIso: string, toIso: string): string {
    return `RR Hajk ${teamShortName(teamFullName)} ${formatDateRange(fromIso, toIso)}`;
}

export function countNights(fromIso: string, toIso: string): number {
    const from = Date.parse(fromIso);
    const to = Date.parse(toIso);
    if (Number.isNaN(from) || Number.isNaN(to) || to < from) return 0;
    return Math.round((to - from) / 86_400_000);
}
```

- [ ] **Step 4: Test grün sehen**

Run: `npm run test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/wizard/naming.ts src/wizard/__tests__/naming.spec.ts
git commit -m "feat: add group naming and date helpers"
```

---

### Task 6: Rollen- und Hierarchie-Auswertung (`leaderContext.ts`)

**Files:**
- Create: `src/wizard/leaderContext.ts`
- Test: `src/wizard/__tests__/leaderContext.spec.ts`

**Interfaces:**
- Consumes: `TeamOption`, `LeaderContext`, `Stufe` aus Task 4; `teamShortName` aus Task 5.
- Produces:

```ts
export interface MembershipIn { groupId: number; groupTypeRoleId: number }
export interface RoleIn { id: number; groupTypeId: number; isLeader: boolean }
export interface HierarchyIn { groupId: number; title: string; parents: number[]; children: number[] }

export function deriveLeaderContext(
    memberships: MembershipIn[],
    roles: RoleIn[],
    hierarchy: HierarchyIn[],
): LeaderContext;
```

Logik: Wurzel = Hierarchie-Eintrag mit `title === ROOT_GROUP_NAME`. Stamm-MA-Gruppen = deren Kinder mit `STAMM_MA_PATTERN`. Je Stamm-MA: Teams = Kinder mit `TEAM_PATTERN`, Sammelgruppe = Kind, dessen Titel `SAMMELGRUPPE_MARKER` enthält (sonst `null`). Leader-Rollen-IDs = alle Rollen mit `isLeader === true`. `stammleiter`, wenn der Nutzer eine Leader-Rolle in einer Stamm-MA-Gruppe hat ODER irgendeine Mitgliedschaft in der Wurzelgruppe → alle Teams. Sonst `teamleiter` mit genau den Teams, in denen er eine Leader-Rolle hat. Keins von beidem → `{ kind: 'none', teams: [] }`. Teams alphabetisch nach `stufe`, dann `shortName` sortieren.

- [ ] **Step 1: Failing Tests mit Fixture schreiben**

```ts
import { describe, expect, it } from 'vitest';
import { deriveLeaderContext } from '@/wizard/leaderContext';
import type { HierarchyIn, MembershipIn, RoleIn } from '@/wizard/leaderContext';

const roles: RoleIn[] = [
    { id: 9, groupTypeId: 1, isLeader: true },   // Leiter Kleingruppe
    { id: 10, groupTypeId: 1, isLeader: true },  // Co-Leiter
    { id: 8, groupTypeId: 1, isLeader: false },  // Teilnehmer
    { id: 16, groupTypeId: 2, isLeader: true },  // Leiter Dienst
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
            groupId: 2156, shortName: 'Eisbären', stufe: 'Kundschafter', sammelgruppeId: 2612,
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
        const h = hierarchy.map((e) =>
            e.groupId === 123 ? { ...e, children: [2156, 1930] } : e,
        );
        const ctx = deriveLeaderContext([{ groupId: 2156, groupTypeRoleId: 9 }], roles, h);
        expect(ctx.teams[0].sammelgruppeId).toBeNull();
    });
});
```

- [ ] **Step 2: Rot sehen** — Run: `npm run test` — Expected: FAIL (Modul fehlt).

- [ ] **Step 3: Implementieren**

```ts
import { ROOT_GROUP_NAME, SAMMELGRUPPE_MARKER, STAMM_MA_PATTERN, TEAM_PATTERN } from './config';
import { teamShortName } from './naming';
import type { LeaderContext, Stufe, TeamOption } from './types';

export interface MembershipIn { groupId: number; groupTypeRoleId: number }
export interface RoleIn { id: number; groupTypeId: number; isLeader: boolean }
export interface HierarchyIn { groupId: number; title: string; parents: number[]; children: number[] }

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
        a.stufe === b.stufe ? a.shortName.localeCompare(b.shortName, 'de') : a.stufe.localeCompare(b.stufe, 'de'),
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
```

- [ ] **Step 4: Grün sehen** — Run: `npm run test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/wizard/leaderContext.ts src/wizard/__tests__/leaderContext.spec.ts
git commit -m "feat: derive leader context from roles and group hierarchy"
```

---

### Task 7: Formular-Validierung (`validation.ts`)

**Files:**
- Create: `src/wizard/validation.ts`
- Test: `src/wizard/__tests__/validation.spec.ts`

**Interfaces:**
- Consumes: `FormState` aus Task 4, `countNights` aus Task 5.
- Produces:

```ts
export interface Step1Errors { teamId?: string; dateFrom?: string; dateTo?: string; description?: string }
export interface Step2Errors { signupDeadline?: string; maxMembers?: string }
export function validateStep1(f: FormState): Step1Errors;
export function fewNightsWarning(f: FormState): string | null; // Hinweistext oder null
export function validateStep2(f: FormState): Step2Errors;
```

Fehlertexte wörtlich aus der Design-Spec:
- dateTo: „Das Enddatum muss nach dem Startdatum liegen.“ (auch gleiches Datum ist erlaubt? Nein — Hajk hat einen Zeitraum, gleiches Datum ist zulässig, nur *vorher* ist ein Fehler)
- description leer: „Bitte beschreibe kurz den Hajk — inklusive Anzahl der Nächte.“
- teamId null: „Bitte wähle ein Team.“
- dateFrom/dateTo leer: „Bitte ein Datum wählen.“
- signupDeadline (nur mode 'self', nur wenn gesetzt und > dateFrom): „Der Anmeldeschluss muss vor dem Hajk-Beginn liegen.“ Leerer Anmeldeschluss ist erlaubt.
- maxMembers nicht leer und (keine ganze Zahl oder < 1): „Bitte eine Zahl größer 0 eingeben — oder das Feld leer lassen.“
- Warnung (nicht blockierend) bei `countNights < 2`: „Weniger als zwei Übernachtungen: Förderungen gibt es erst ab zwei Nächten.“

- [ ] **Step 1: Failing Tests schreiben**

```ts
import { describe, expect, it } from 'vitest';
import { fewNightsWarning, validateStep1, validateStep2 } from '@/wizard/validation';
import type { FormState } from '@/wizard/types';

const base: FormState = {
    teamId: 2156, dateFrom: '2027-04-10', dateTo: '2027-04-12', location: '',
    description: 'Wochenend-Hajk, 2 Nächte', mode: 'self', signupDeadline: '2027-04-03',
    maxMembers: '', selectedFieldIds: [],
};

describe('validateStep1', () => {
    it('passes a valid form', () => {
        expect(validateStep1(base)).toEqual({});
    });
    it('rejects end before start', () => {
        expect(validateStep1({ ...base, dateTo: '2027-04-09' }).dateTo)
            .toBe('Das Enddatum muss nach dem Startdatum liegen.');
    });
    it('requires a description', () => {
        expect(validateStep1({ ...base, description: '  ' }).description)
            .toBe('Bitte beschreibe kurz den Hajk — inklusive Anzahl der Nächte.');
    });
    it('requires team and dates', () => {
        const e = validateStep1({ ...base, teamId: null, dateFrom: '', dateTo: '' });
        expect(e.teamId).toBe('Bitte wähle ein Team.');
        expect(e.dateFrom).toBe('Bitte ein Datum wählen.');
        expect(e.dateTo).toBe('Bitte ein Datum wählen.');
    });
});

describe('fewNightsWarning', () => {
    it('warns below two nights', () => {
        expect(fewNightsWarning({ ...base, dateTo: '2027-04-11' })).toContain('zwei Übernachtungen');
    });
    it('is silent from two nights on and on empty dates', () => {
        expect(fewNightsWarning(base)).toBeNull();
        expect(fewNightsWarning({ ...base, dateFrom: '', dateTo: '' })).toBeNull();
    });
});

describe('validateStep2', () => {
    it('passes valid input', () => {
        expect(validateStep2(base)).toEqual({});
        expect(validateStep2({ ...base, maxMembers: '20' })).toEqual({});
        expect(validateStep2({ ...base, signupDeadline: '' })).toEqual({});
    });
    it('rejects deadline after start', () => {
        expect(validateStep2({ ...base, signupDeadline: '2027-04-11' }).signupDeadline)
            .toBe('Der Anmeldeschluss muss vor dem Hajk-Beginn liegen.');
    });
    it('ignores deadline in manual mode', () => {
        expect(validateStep2({ ...base, mode: 'manual', signupDeadline: '2027-04-11' })).toEqual({});
    });
    it('rejects non-positive or non-numeric maxMembers', () => {
        const msg = 'Bitte eine Zahl größer 0 eingeben — oder das Feld leer lassen.';
        expect(validateStep2({ ...base, maxMembers: '0' }).maxMembers).toBe(msg);
        expect(validateStep2({ ...base, maxMembers: 'abc' }).maxMembers).toBe(msg);
        expect(validateStep2({ ...base, maxMembers: '2.5' }).maxMembers).toBe(msg);
    });
});
```

- [ ] **Step 2: Rot sehen** — Run: `npm run test` — Expected: FAIL.

- [ ] **Step 3: Implementieren**

```ts
import { countNights } from './naming';
import type { FormState } from './types';

export interface Step1Errors { teamId?: string; dateFrom?: string; dateTo?: string; description?: string }
export interface Step2Errors { signupDeadline?: string; maxMembers?: string }

export function validateStep1(f: FormState): Step1Errors {
    const e: Step1Errors = {};
    if (f.teamId === null) e.teamId = 'Bitte wähle ein Team.';
    if (!f.dateFrom) e.dateFrom = 'Bitte ein Datum wählen.';
    if (!f.dateTo) e.dateTo = 'Bitte ein Datum wählen.';
    if (f.dateFrom && f.dateTo && f.dateTo < f.dateFrom)
        e.dateTo = 'Das Enddatum muss nach dem Startdatum liegen.';
    if (!f.description.trim())
        e.description = 'Bitte beschreibe kurz den Hajk — inklusive Anzahl der Nächte.';
    return e;
}

export function fewNightsWarning(f: FormState): string | null {
    if (!f.dateFrom || !f.dateTo || f.dateTo < f.dateFrom) return null;
    if (countNights(f.dateFrom, f.dateTo) >= 2) return null;
    return 'Weniger als zwei Übernachtungen: Förderungen gibt es erst ab zwei Nächten.';
}

export function validateStep2(f: FormState): Step2Errors {
    const e: Step2Errors = {};
    if (f.mode === 'self' && f.signupDeadline && f.dateFrom && f.signupDeadline >= f.dateFrom)
        e.signupDeadline = 'Der Anmeldeschluss muss vor dem Hajk-Beginn liegen.';
    if (f.maxMembers !== '' && !/^[1-9]\d*$/.test(f.maxMembers))
        e.maxMembers = 'Bitte eine Zahl größer 0 eingeben — oder das Feld leer lassen.';
    return e;
}
```

- [ ] **Step 4: Grün sehen** — Run: `npm run test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/wizard/validation.ts src/wizard/__tests__/validation.spec.ts
git commit -m "feat: add step validation with spec copy"
```

---

### Task 8: API-Schicht des Wizards (`wizard.api.ts`)

**Files:**
- Create: `src/wizard/wizard.api.ts`
- Test: `src/wizard/__tests__/wizard.api.spec.ts`

**Interfaces:**
- Consumes: `apiGet/apiPost/apiPut/apiDelete`, `fetchAllPages` aus `@/shared/api`; Typen aus Task 4; `deriveLeaderContext` aus Task 6.
- Produces:

```ts
export async function loadWizardContext(): Promise<WizardContext>; // wirft ChurchToolsApiError oder Error('template-invalid: <Grund>')
export interface ProvisionApi {
    findGroupIdByName(name: string): Promise<number | null>;
    duplicateGroup(templateId: number, newName: string): Promise<number>;
    configureGroup(groupId: number, form: FormState): Promise<void>;   // Payload laut docs/NOTES-api-spike.md
    listMemberFieldIds(groupId: number): Promise<number[]>;
    deleteMemberField(groupId: number, fieldId: number): Promise<void>;
    listParentIds(groupId: number): Promise<number[]>;
    removeParent(groupId: number, parentId: number): Promise<void>;
    addParent(groupId: number, parentId: number): Promise<void>;
    putMember(groupId: number, personId: number, roleId: number): Promise<void>;
    createAppointment(calendarId: number, a: { caption: string; startDate: string; endDate: string; note: string }): Promise<void>;
    deleteGroup(groupId: number): Promise<void>;
}
export const provisionApi: ProvisionApi;
```

Endpoints (Recon 21.09.2026 + Spike Task 3 — **Payload-Details für `configureGroup` und `createAppointment` aus `docs/NOTES-api-spike.md` übernehmen**):
- Kontext: `GET /whoami` · `GET /persons/{id}/groups` · `GET /groups/hierarchies` · `GET /group/roles` · `GET /groups/{TEMPLATE_GROUP_ID}` · `GET /groups/{id}/memberfields` (Antwort: `data[].field` mit `id,name,fieldTypeCode,options[],requiredInRegistrationForm`) · `GET /groups/{id}/members?limit=200` (Organisatoren = Mitglieder, deren `groupTypeRoleId` die Rolle mit `type==='leader'?nein` — Rolle „Organisator“ am Gruppentyp der Vorlage; Rollen-Auflösung: aus `/group/roles` die Rollen des `groupTypeId` der Vorlage nehmen, `eventLeaderRoleId` = `isLeader && name==='Leiter'`, `organisatorRoleId` = `name==='Organisator'`; fehlt eine → `Error('template-invalid: Rollen nicht gefunden')`).
- Vorlage validieren: existiert, `groupTypeId` vorhanden, mindestens ein Organisator-Mitglied; sonst `Error('template-invalid: …')` mit sprechendem Grund.
- Provision: `POST /groups/{id}/duplicate?newName=…` (URL-encoden!) → `data.id` · `PATCH /groups/{id}` · `GET|DELETE|PUT /groups/{id}/parents[/{parentId}]` · `PUT /groups/{gid}/members/{pid}` mit `{ groupTypeRoleId }` · `POST /calendars/{cid}/appointments` · `DELETE /groups/{id}`.
- `findGroupIdByName`: `GET /groups?query=<name>&limit=200`, dann clientseitig auf exakten Namens-Match filtern (`data[].name === name`), sonst `null`.

- [ ] **Step 1: Failing Tests schreiben** — `@/shared/api` mit `vi.mock` mocken; Fälle: (a) `loadWizardContext` baut `WizardContext` korrekt zusammen (Fixture wie Task 6 + Vorlage mit 2 Feldern und 1 Organisator), (b) Vorlage ohne Organisator → wirft `template-invalid`, (c) `findGroupIdByName` matcht exakt (Query-Treffer „RR Hajk Eisbären 10.04.–12.04.2027 ALT“ zählt nicht), (d) `duplicateGroup` encodiert den Namen (Assertion auf `apiPost`-Aufruf mit `encodeURIComponent`).

```ts
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/shared/api', () => ({
    apiGet: vi.fn(), apiPost: vi.fn(), apiPut: vi.fn(), apiDelete: vi.fn(),
    fetchAllPages: vi.fn(),
    ChurchToolsApiError: class extends Error {},
}));
import * as api from '@/shared/api';
import { loadWizardContext, provisionApi } from '@/wizard/wizard.api';

// Fixture-Antworten je Endpoint über (api.apiGet as Mock).mockImplementation((url) => …)
// — Struktur wie in Task 6, Vorlage id 2587 mit fields + members.
```

(Vollständige Fixtures analog Task 6 im Test ausschreiben; jede Mock-Implementation switcht über den URL-Prefix.)

- [ ] **Step 2: Rot sehen** — Run: `npm run test` — Expected: FAIL.

- [ ] **Step 3: Implementieren** — dünn halten: jede Funktion 1 API-Aufruf + Mapping; `loadWizardContext` orchestriert die 6 GETs parallel (`Promise.all`), mappt auf `WizardContext`, validiert die Vorlage.

- [ ] **Step 4: Grün sehen** — Run: `npm run test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/wizard/wizard.api.ts src/wizard/__tests__/wizard.api.spec.ts
git commit -m "feat: add wizard API layer with context loading and provisioning calls"
```

---

### Task 9: Provisionierungs-Engine mit Rollback (`provisioning.ts`)

**Files:**
- Create: `src/wizard/provisioning.ts`
- Test: `src/wizard/__tests__/provisioning.spec.ts`

**Interfaces:**
- Consumes: `ProvisionApi` (Task 8, als Parameter injiziert — Tests nutzen ein Fake-Objekt), Typen aus Task 4, `buildGroupName` aus Task 5.
- Produces:

```ts
export interface ProvisionInput {
    form: FormState;
    team: TeamOption;               // teamId aufgelöst; sammelgruppeId ist hier garantiert non-null (US-1 Gate)
    context: WizardContext;
    calendarId: number;
}
export async function executeProvisioning(
    input: ProvisionInput,
    api: ProvisionApi,
    onProgress: (p: ProvisionProgress) => void,
): Promise<ProvisionOutcome>;
```

Ablauf (Reihenfolge fix, jede Phase meldet `running` → `done`/`failed` via `onProgress`):
1. **precheck** (kein eigener Progress-Step): `findGroupIdByName(name)` — Treffer → `{ ok:false, failedStep:'precheck', existingGroupId, rollback:'not-needed', message:'Es gibt bereits eine Gruppe mit diesem Namen.' }`
2. **duplicate**: `duplicateGroup(template.id, name)` → `groupId`
3. **configure**: `configureGroup(groupId, form)`
4. **fields**: `listMemberFieldIds(groupId)`, alle IDs löschen, deren **Name** nicht gewählt wurde — Achtung: die Feld-IDs des Duplikats sind NEU (nicht die der Vorlage). Mapping über den Feldnamen: gewählt = `form.selectedFieldIds` → Namen via `context.template.fields`; im Duplikat per Name matchen. `listMemberFieldIds` deshalb ersetzen durch `listMemberFields(groupId): Promise<{id:number;name:string}[]>` (in Task 8 so implementieren).
5. **parents**: `listParentIds(groupId)` → jede entfernen → `addParent(groupId, team.sammelgruppeId)`
6. **members**: für jede `context.template.organisatorPersonIds` → `putMember(groupId, pid, organisatorRoleId)`; dann `putMember(groupId, context.user.id, eventLeaderRoleId)`
7. **calendar**: `createAppointment(calendarId, { caption: name, startDate: form.dateFrom, endDate: form.dateTo, note: beschreibung+ort+gruppenlink })` — Fehler hier bricht NICHT ab: Outcome `{ ok:true, calendarWarning:true }`
8. Fehler in Phase 2–6: `deleteGroup(groupId)` versuchen → `rollback:'done'`; wirft auch das → `rollback:'failed', orphanGroupId:groupId`.

- [ ] **Step 1: Failing Tests schreiben** — Fake-`ProvisionApi` als Objekt aus `vi.fn()`s; Fälle:

```ts
// 1. Happy path: Reihenfolge der Aufrufe (duplicate → configure → fields → parents → members → calendar),
//    onProgress-Sequenz endet mit allen 'done', Outcome { ok:true, calendarWarning:false }.
// 2. Namenskollision: findGroupIdByName → 42; kein duplicate-Aufruf; failedStep 'precheck', existingGroupId 42.
// 3. Feld-Reduktion: Vorlage-Felder [Vegetarisch(id 3001), T-Shirt(id 3002)], gewählt nur Vegetarisch;
//    Duplikat-Felder [{id 47, name 'Vegetarisch'}, {id 48, name 'T-Shirt-Größe'… nein: 'T-Shirt'}];
//    deleteMemberField genau mit (groupId, 48) aufgerufen.
// 4. parents-Fehler: addParent wirft → deleteGroup aufgerufen, Outcome { ok:false, failedStep:'parents', rollback:'done' }.
// 5. Rollback schlägt fehl: deleteGroup wirft → rollback:'failed', orphanGroupId gesetzt.
// 6. Kalender-Fehler: createAppointment wirft → Outcome { ok:true, calendarWarning:true }, KEIN deleteGroup.
// 7. members: Organisatoren vor Leiter; Leiter mit eventLeaderRoleId.
```

- [ ] **Step 2: Rot sehen** — Run: `npm run test` — Expected: FAIL.

- [ ] **Step 3: Implementieren** — ~80 Zeilen: `run(step, fn)`-Helfer, der `onProgress` meldet und Fehler mit Step-Kontext rethrowt; try/catch um Phase 2–6 mit Rollback; Kalender separat.

- [ ] **Step 4: Grün sehen** — Run: `npm run test` — Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/wizard/provisioning.ts src/wizard/__tests__/provisioning.spec.ts
git commit -m "feat: add provisioning engine with rollback and calendar warning"
```

---

### Task 10: Wizard-Zustandsmaschine (`useWizard.ts`)

**Files:**
- Create: `src/wizard/useWizard.ts`
- Test: `src/wizard/__tests__/useWizard.spec.ts`

**Interfaces:**
- Consumes: `loadWizardContext`, `provisionApi` (Task 8), `executeProvisioning` (Task 9), Validierung (Task 7), Naming (Task 5). `loadWizardContext` und `executeProvisioning` werden für Tests als optionale Parameter injiziert (Default = echte Implementierung).
- Produces (von allen Komponenten konsumiert):

```ts
export type WizardPhase =
    | { phase: 'loading' }
    | { phase: 'no-access' }
    | { phase: 'gate-error'; message: string }
    | { phase: 'form'; step: 1 | 2 | 3 }
    | { phase: 'provisioning'; progress: ProvisionProgress[] }
    | { phase: 'failed'; outcome: Extract<ProvisionOutcome, { ok: false }> }
    | { phase: 'done'; outcome: Extract<ProvisionOutcome, { ok: true }>; groupName: string };

export function useWizard(deps?: { load?: typeof loadWizardContext; execute?: typeof executeProvisioning }) {
    return {
        state: Ref<WizardPhase>, context: Ref<WizardContext | null>, form: Reactive<FormState>,
        groupName: ComputedRef<string>, selectedTeam: ComputedRef<TeamOption | null>,
        step1Errors: Ref<Step1Errors>, step2Errors: Ref<Step2Errors>, nightsWarning: ComputedRef<string | null>,
        start(): Promise<void>,           // Gate: laden → 'form'/'no-access'/'gate-error'
        goNext(): void, goBack(): void, goToStep(n: 1 | 2): void, // mit Validierung bei goNext
        submit(): Promise<void>,          // 'provisioning' → 'done'/'failed'
        retry(): Promise<void>,           // aus 'failed' erneut submit
        reset(): void,                    // aus 'done' zurück auf leeres Formular, Schritt 1
    };
}
```

Regeln: `goNext` von Schritt 1/2 validiert und bleibt bei Fehlern stehen; `goToStep` nur zu besuchten Schritten; Gate-Fehler mit `template-invalid` → `gate-error` mit Meldung „Die Vorlagengruppe … <Grund>. Bitte melde das der Stammleitung.“; `kind==='none'` → `no-access`; Team-Vorauswahl, wenn `teams.length === 1`; Team ohne `sammelgruppeId` beim `goNext` von Schritt 1 → Fehler am Teamfeld „Für dieses Team fehlt die Sammelgruppe ‚Camps und Aktionen‘. Bitte melde das der Stammleitung.“

- [ ] **Step 1: Failing Tests schreiben** — mit injizierten Fakes; Fälle: Gate happy/none/error · Ein-Team-Vorauswahl · goNext blockiert bei leerer Beschreibung · Moduswechsel erhält signupDeadline im FormState · submit happy → done mit groupName · submit fail → failed mit outcome · retry ruft execute erneut · reset leert Formular und geht auf Schritt 1.
- [ ] **Step 2: Rot sehen** — Run: `npm run test` — Expected: FAIL.
- [ ] **Step 3: Implementieren** — reine Composition-API, kein DOM; `progress` initial alle 6 Steps `pending`.
- [ ] **Step 4: Grün sehen** — Run: `npm run test` — Expected: PASS.
- [ ] **Step 5: Commit**

```bash
git add src/wizard/useWizard.ts src/wizard/__tests__/useWizard.spec.ts
git commit -m "feat: add wizard state machine composable"
```

---

### Task 11: UI-Fundament — Tokens, StepperNav, GateView

**Files:**
- Create: `src/wizard/wizard.css`, `src/wizard/components/StepperNav.vue`, `src/wizard/components/GateView.vue`
- Test: `src/wizard/__tests__/components.gate.spec.ts`

**Interfaces:**
- Produces: CSS-Tokens unter `.rr-hikeplanner-root` (hell via `:root`-Werte der Klasse, dunkel via `@media (prefers-color-scheme: dark)` UND CT-Theme-Klasse — genaue CT-Hook-Klasse beim E2E in Task 16 verifizieren, bis dahin `prefers-color-scheme`); `StepperNav` (Props: `current: 1|2|3`, `maxVisited: 1|2|3`, `locked: boolean`; Emit: `goto(n)`); `GateView` (Props: `state: 'loading'|'no-access'|'error'`, `message?: string`; Emit: `retry`).

- [ ] **Step 1: wizard.css anlegen** — Tokens: `--hp-surface`, `--hp-text`, `--hp-muted`, `--hp-primary`, `--hp-danger`, `--hp-warning`, `--hp-success`, `--hp-border`; Basis-Layout: Container max-width 640px, zentriert, 16px Padding; `.hp-btn`, `.hp-btn--primary`, `.hp-btn--secondary` (min-height 44px); `.hp-field`, `.hp-error-text`, `.hp-hint`, `.hp-warning-box`, `.hp-info-box`. Mobile: Buttons volle Breite unter 768px.
- [ ] **Step 2: Failing Component-Tests schreiben** — GateView: loading rendert Skeleton (role="status"), no-access rendert Text „Dieser Assistent ist für Team-Leiter“ und KEINEN Button, error rendert `message` + Button „Erneut versuchen“ der `retry` emittet. StepperNav: rendert 3 Schritte, `aria-current="step"` auf current, Klick auf besuchten Schritt emittet `goto`, Klick auf zukünftigen/locked emittet nichts.
- [ ] **Step 3: Rot sehen** — Run: `npm run test` — Expected: FAIL.
- [ ] **Step 4: Komponenten implementieren** — Copy wörtlich aus Design-Spec (Gate-Wireframes); Stepper mobil: „Schritt x/3: <Name>“ (CSS blendet Labels < 480px aus).
- [ ] **Step 5: Grün sehen + Commit**

```bash
npm run test
git add src/wizard/wizard.css src/wizard/components/StepperNav.vue src/wizard/components/GateView.vue src/wizard/__tests__/components.gate.spec.ts
git commit -m "feat: add design tokens, stepper and gate view"
```

---

### Task 12: Schritt 1 — StepTeamTermin.vue

**Files:**
- Create: `src/wizard/components/StepTeamTermin.vue`
- Test: `src/wizard/__tests__/components.step1.spec.ts`

**Interfaces:**
- Consumes: `useWizard`-Rückgabe via Props (`form`, `teams`, `errors`, `nightsWarning`, `groupName`, `singleTeam: boolean`); Emit: `next`.
- Produces: Formular laut Design-Spec Schritt 1: Team (Select gruppiert nach Stufe via `<optgroup>`, bei `singleTeam` reine Textzeile mit Teamnamen), Von/Bis (`<input type="date">`), Ort (optional), Beschreibung (`<textarea>` mit Placeholder „Was ist geplant? Bitte auch die Anzahl der Nächte nennen (wichtig für Förderung).“), Namensvorschau (Zeile mit ⓘ, `aria-live="polite"`, Platzhalter „RR Hajk … (Team und Datum wählen)“ solange leer), Warnbox, „Weiter →“.

- [ ] **Step 1: Failing Tests** — (a) rendert optgroups nach Stufe, (b) `singleTeam` → kein `<select>`, Teamname als Text, (c) Namensvorschau aktualisiert bei Datumseingabe, (d) Fehlertexte erscheinen unter den Feldern wenn `errors` gesetzt, (e) Warnung sichtbar wenn `nightsWarning` gesetzt, (f) Klick „Weiter“ emittet `next`.
- [ ] **Step 2: Rot sehen** — `npm run test` — FAIL.
- [ ] **Step 3: Implementieren** — Labels über Feldern; jedes Input mit `<label for>`; Fehler via `aria-describedby`.
- [ ] **Step 4: Grün sehen** — `npm run test` — PASS.
- [ ] **Step 5: Commit**

```bash
git add src/wizard/components/StepTeamTermin.vue src/wizard/__tests__/components.step1.spec.ts
git commit -m "feat: add step 1 team and date form"
```

---

### Task 13: Schritt 2 — StepAnmeldung.vue + FieldChecklist.vue

**Files:**
- Create: `src/wizard/components/StepAnmeldung.vue`, `src/wizard/components/FieldChecklist.vue`
- Test: `src/wizard/__tests__/components.step2.spec.ts`

**Interfaces:**
- Consumes: Props `form`, `fields: TemplateField[]`, `errors`; Emits: `next`, `back`.
- Produces: Radiogruppe (fieldset/legend „Wie kommen die Teilnehmer in die Gruppe?“, Optionen wörtlich aus Design-Spec); bei `mode==='self'`: Anmeldeschluss + Max. Teilnehmer; bei `'manual'`: Info-Box (Text aus Design-Spec) + nur Max. Teilnehmer; FieldChecklist: fieldset/legend, ganze Zeile als Label, Sekundärtext `(Ja / Nein)` bzw. `(N Optionen)` bei > 3 Optionen, `(Freitext)` bei Textfeldern, `· Pflicht`-Badge; Empty-State-Hinweis wenn `fields` leer.

- [ ] **Step 1: Failing Tests** — (a) Moduswechsel auf manual versteckt Anmeldeschluss und zeigt Info-Box, (b) zurück auf self: vorher eingegebener Deadline-Wert steht noch im Input (v-model auf form, kein Reset), (c) Checkbox-Klick toggelt `form.selectedFieldIds`, (d) leerer Katalog → Hinweistext „Die Vorlage enthält aktuell keine Anmeldefelder…“, (e) 7 Optionen → „(7 Optionen)“, 2 Optionen → „(Ja / Nein)“-Stil Aufzählung, (f) Pflicht-Badge nur bei `requiredInRegistrationForm`.
- [ ] **Step 2: Rot sehen** — `npm run test` — FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Grün sehen** — `npm run test` — PASS.
- [ ] **Step 5: Commit**

```bash
git add src/wizard/components/StepAnmeldung.vue src/wizard/components/FieldChecklist.vue src/wizard/__tests__/components.step2.spec.ts
git commit -m "feat: add step 2 signup mode and field checklist"
```

---

### Task 14: Schritt 3 + Provisionierung — StepReview.vue, ProgressList.vue

**Files:**
- Create: `src/wizard/components/StepReview.vue`, `src/wizard/components/ProgressList.vue`
- Test: `src/wizard/__tests__/components.step3.spec.ts`

**Interfaces:**
- Consumes: Props `form`, `context`, `team`, `groupName`, `phase` (`'form' | 'provisioning' | 'failed'`), `progress: ProvisionProgress[]`, `failedOutcome?`; Emits: `back`, `edit(step: 1|2)`, `submit`, `retry`.
- Produces: Zusammenfassung als `<dl>`-Sektionen mit „(Ändern)“-Links; Sektion „Automatisch eingerichtet“ (Ablage = Sammelgruppen-Name, Organisatoren-Namen, „Du (<Vorname Nachname>)“, Kalender „Royal Rangers (öffentlich)“); Button „Hajk anlegen ✓“. Phase provisioning: Buttons weg, ProgressList (`aria-live="polite"`; Zeilen-Labels: „Vorlage dupliziert“, „Eckdaten gesetzt“, „Anmeldefelder eingerichtet“, „Gruppe einsortiert“, „Organisatoren und Leiter eingetragen“, „Kalendertermin angelegt“ — Status ✓/◌/·/✗) + Zeile „(Bitte das Fenster geöffnet lassen)“. Phase failed: Fehlerkarte (`role="alert"`) mit Meldung; bei `rollback:'done'`: „Die angelegte Gruppe wurde wieder entfernt — es ist kein halbfertiger Hajk zurückgeblieben.“; bei `rollback:'failed'`: Absatz mit Orphan-Link `https://…/groups/{orphanGroupId}` (Origin via `getOriginUrl()` aus `@/shared/api`); bei `failedStep:'precheck'`: Meldung + Link zur bestehenden Gruppe; Buttons „Erneut versuchen“ + „(Zurück zu den Eingaben)“.

- [ ] **Step 1: Failing Tests** — (a) Zusammenfassung zeigt Namensschema-Titel, Modus-Zeile „Selbstanmeldung bis 03.04.2027“ bzw. „Du trägst die Teilnehmer selbst ein“, Felder-Aufzählung, Organisatoren; (b) „(Ändern)“ emittet `edit` mit Stepnummer; (c) submit-Klick emittet `submit` genau einmal, Button danach `disabled` (Prop phase='provisioning'); (d) ProgressList rendert Status-Symbole gemäß `progress`; (e) failed + rollback done zeigt Rollback-Text; (f) precheck-Kollision zeigt Link auf bestehende Gruppe.
- [ ] **Step 2: Rot sehen** — `npm run test` — FAIL.
- [ ] **Step 3: Implementieren.**
- [ ] **Step 4: Grün sehen** — `npm run test` — PASS.
- [ ] **Step 5: Commit**

```bash
git add src/wizard/components/StepReview.vue src/wizard/components/ProgressList.vue src/wizard/__tests__/components.step3.spec.ts
git commit -m "feat: add review step with provisioning progress and error card"
```

---

### Task 15: Ergebnis + Shell — ResultView.vue, WizardShell.vue, App-Verdrahtung

**Files:**
- Create: `src/wizard/components/ResultView.vue`, `src/wizard/components/WizardShell.vue`
- Modify: `src/App.vue` (rendert nur `<WizardShell/>`), `src/main.ts` (unverändert bis auf Mount-ID aus Task 1), `src/example/` löschen
- Test: `src/wizard/__tests__/components.result.spec.ts`, `src/wizard/__tests__/wizardShell.spec.ts`

**Interfaces:**
- Consumes: `useWizard` (Task 10) — WizardShell ist die EINZIGE Komponente, die das Composable instanziiert; alle Steps bekommen Props/Emits.
- Produces: ResultView (Props: `groupName`, `groupUrl`, `summary` [Zeilen mit ✓], `calendarWarning: boolean`; Emits: `restart`): Erfolgstitel „Dein Hajk ist angelegt!“ (Fokus nach Mount auf h2 via `ref` + `tabindex="-1"` + `.focus()`), Warnzeile „Wichtig: Kalendertermin konnte nicht angelegt werden — bitte trage ihn manuell im Kalender ‚Royal Rangers‘ ein.“ nur bei Warning, Primär-Link „Zur Gruppe in ChurchTools →“ (`href = getOriginUrl() + '/groups/' + groupId`), Sekundär-Link „Weiteren Hajk anlegen“. WizardShell: h1 „Neuen Hajk anlegen“, schaltet über `state.phase` zwischen GateView/Steps/ResultView, `.rr-hikeplanner-root`-Wrapper, importiert `wizard.css`.

- [ ] **Step 1: Failing Tests** — ResultView: (a) Warnzeile nur bei `calendarWarning`, (b) restart emittet, (c) Gruppenlink korrekt. WizardShell (mit gemocktem useWizard via `vi.mock`): (d) phase loading → GateView, (e) phase form step 2 → StepAnmeldung sichtbar, (f) phase done → ResultView.
- [ ] **Step 2: Rot sehen** — `npm run test` — FAIL.
- [ ] **Step 3: Implementieren; `src/example/` löschen; App.vue ersetzen.**
- [ ] **Step 4: Grün + Gesamt-Gate** — Run: `npm run check` — Expected: lint, typecheck, test, build alle PASS.
- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add result view and wizard shell, remove example slice"
```

---

### Task 16: Demo-Seed-Script + manueller E2E-Durchlauf auf rr-demo

**Files:**
- Create: `scripts/seed-demo.mjs`
- Modify: `package.json` (Script `"seed:demo": "node scripts/seed-demo.mjs"`), `.env` (ermittelte `VITE_TEMPLATE_GROUP_ID`/`VITE_CALENDAR_ID` eintragen)

**Interfaces:**
- Consumes: `.env` (`VITE_BASE_URL`, `VITE_USERNAME`, `VITE_PASSWORD`).
- Produces: idempotentes Seed der Demo-Instanz (vorhandene Objekte per Namens-Lookup wiederverwenden): je ein Team `RR Kundschafterteam Testbären` (Typ 1) unter `RR Kundschafterstamm-MA` (Demo-ID 24), Sammelgruppe `RR | Camps und Aktionen - Kundschafter` (Typ 4) unter 24, Vorlagengruppe `=== Vorlage Hajks` (Typ 3) mit 3 Feldern (Vegetarisch radioselect Ja/Nein Pflicht; T-Shirt-Größe radioselect 128/140/152/164/S/M/L; Bemerkung text) und dem Seed-User als Organisator-Mitglied; druckt am Ende `VITE_TEMPLATE_GROUP_ID=<id>` und `VITE_CALENDAR_ID=<id des ersten Demo-Kalenders>` zum Eintragen in `.env`. Node ≥ 20, nur `fetch`, Cookie-Login + CSRF wie in Task 3.

- [ ] **Step 1: Script schreiben** (Helfer `login()`, `get(path)`, `post(path, body)`, `ensureGroup(name, typeId, parentId, configure)`; Rollen-IDs der Demo dynamisch über `/api/group/roles` auflösen — Leiter/Organisator wie in Task 8).
- [ ] **Step 2: Zweimal laufen lassen**

```bash
npm run seed:demo && npm run seed:demo
```

Expected: zweiter Lauf legt nichts Neues an („exists, skipping“-Ausgaben), gibt dieselben IDs aus. IDs in `.env` eintragen.

- [ ] **Step 3: Manueller E2E-Durchlauf**

```bash
npm run dev
```

Im Browser (Demo-Login als Seed-User): kompletten Wizard durchspielen (Selbstanmeldungs-Modus, 2 Felder gewählt). Danach per API/UI verifizieren: Gruppe existiert mit korrektem Namen · genau die gewählten Felder · genau ein Parent (Sammelgruppe) · Organisator + Leiter als Mitglieder · Termin im Kalender. Zweiter Durchlauf mit identischen Daten → Namenskollisions-Fehler mit Link. Dritter Durchlauf im Modus „manuell“ → Verhalten laut `docs/NOTES-api-spike.md`. Ergebnis (inkl. CT-Theme-Klasse für Dark-Mode aus dem DOM der Demo-Instanz — `wizard.css` ggf. nachziehen) als Notiz in `docs/NOTES-api-spike.md` ergänzen. Testgruppen + Termine danach löschen.

- [ ] **Step 4: Commit**

```bash
git add scripts/seed-demo.mjs package.json docs/NOTES-api-spike.md .env-example
git commit -m "feat: add idempotent demo seed script"
```

---

### Task 17: Begleit-Dokumentation — PERMISSIONS.md, CONVENTIONS.md, README, CLAUDE.md

**Files:**
- Create: `docs/PERMISSIONS.md`, `docs/CONVENTIONS.md`, `CLAUDE.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: tatsächliche API-Aufrufe aus `wizard.api.ts` (Task 8) als Grundlage der Rechte-Matrix.

- [ ] **Step 1: docs/PERMISSIONS.md** — Matrix Rolle × Recht: Zeilen = Team-Leiter/Co-Leiter, Stammleiter, Organisatorin, normales Mitglied; Spalten = benötigte CT-Rechte (Gruppen sehen, Veranstaltungsgruppe anlegen/duplizieren, Gruppe bearbeiten [eigene], Mitglieder hinzufügen, Kalender „Royal Rangers“ schreiben, Vorlage sehen). Jede Zelle mit Status `erforderlich / nicht nötig / ZU VERIFIZIEREN (Test-Account)`. Abschnitt „Offene Verifikation“: Der komplette Wizard-Durchlauf muss mit einem Nur-Leiter-Test-Account auf der LIVE-Instanz getestet werden, bevor Leiter eingeladen werden (PRD-Risiko 2) — das braucht Phil.
- [ ] **Step 2: docs/CONVENTIONS.md** — Namensschema; Vorlage = SSOT (Felder/Settings/Organisatoren dort pflegen, nie in Hajk-Gruppen); neue Wunschfelder → Vorlagengruppe; Sammelgruppen-Namenskonvention (`Camps und Aktionen`-Marker); Hajks hängen unter genau einer Sammelgruppe; Aktionstyp-Erweiterung = neue Vorlage + Eintrag in config.
- [ ] **Step 3: CLAUDE.md** — kurz: Verweise auf PRD, Design-Spec, NOTES-api-spike; Hard Rules (Root-Selektor, kein localStorage, API nur via `@/shared/api`, Felder via referenceName, Dev nur gegen rr-demo); Test-/Check-Kommandos.
- [ ] **Step 4: README.md** — Template-Text ersetzen: Was ist HikePlanner, Setup (`npm install`, `.env` nach `.env-example`, `npm run seed:demo`), Scripts, Doku-Verweise.
- [ ] **Step 5: Commit**

```bash
git add docs/PERMISSIONS.md docs/CONVENTIONS.md CLAUDE.md README.md
git commit -m "docs: add permissions matrix, conventions and project readme"
```

---

### Task 18: Abschluss-Gate

- [ ] **Step 1: Gesamtprüfung**

```bash
npm run check
```

Expected: lint + typecheck + alle Tests + build PASS.

- [ ] **Step 2: Verifikation gegen Spezifikation** — Design-Spec „Verification protocol“ (7 Punkte) manuell im Dev-Server durchgehen; PRD-US-Akzeptanzkriterien abhaken; Abweichungen als Issues/TODOs in `docs/NOTES-api-spike.md` festhalten oder sofort fixen.
- [ ] **Step 3: Letzter Commit + Status an Phil** — offene Punkte melden: Live-Verifikation mit Test-Leiter-Account (PERMISSIONS.md), CT-Rechtevergabe, ggf. Fallback-Entscheidung Anmeldemodus.

---

## Self-Review (durchgeführt 2026-09-22)

- **Spec coverage:** US-1 → Tasks 6/8/10/11; US-2 → 5/7/12; US-3 → 8/13; US-4 → 8/9/14; US-5 → 3/8/9; US-6 → 15; NFRs (Security: kein Token im Code — Modell A per Session; Reliability: Rollback Task 9; Performance: ProgressList Task 14; Compat/Theming: Task 11/16) abgedeckt. PRD-Risiko 1 (Settings-PATCH) → Task 3 vor Task 9. Offene PRD-Fragen, die NICHT im Plan gelöst werden: Live-Rechte-Verifikation (Task 17 dokumentiert sie als Blocker vor Rollout).
- **Placeholder scan:** Task 8/10 verweisen für Payload-Details bewusst auf `docs/NOTES-api-spike.md` (Ergebnis von Task 3) — das ist eine echte Reihenfolge-Abhängigkeit, kein Platzhalter; alle übrigen Schritte tragen konkreten Code/Kommandos.
- **Type consistency:** `listMemberFields` (Task 9, Korrektur) muss in Task 8 mit genau dieser Signatur `{ id: number; name: string }[]` implementiert werden — in beiden Tasks gleich benannt. `ProvisionOutcome`/`ProvisionProgress`/`FormState` nur in Task 4 definiert, überall referenziert.
