# ct-rr-hikeplanner

ChurchTools-Extension „HikePlanner“: 3-Schritte-Wizard, mit dem Royal-Rangers-Team-Leiter
(JMS Altensteig) eine vollständig konfigurierte Hajk-Gruppe inkl. Kalendertermin anlegen.

## Pflichtlektüre vor Änderungen

- `docs/prds/prd-hikeplanner-hajk-assistent-v0.1.md` — WAS gebaut wird (User Stories, Non-Goals)
- `docs/design/001-hajk-assistent-wizard.md` — WIE es aussieht (Screens, States, Copy) + `docs/design/DESIGN-BASELINE.md`
- `docs/NOTES-api-spike.md` — verifizierte API-Payloads (flache PATCH-Keys!, isInternal-Pflichtfeld)
- `docs/CONVENTIONS.md` — Namensschema, Hierarchie, Vorlage als Single Source of Truth
- `docs/PERMISSIONS.md` — Rechte-Matrix; Live-Verifikation mit Test-Leiter-Account steht noch aus

## Hard Rules

- Alle CSS-Selektoren unter `.rr-hikeplanner-root`; Farben nur über `--hp-*`-Tokens
- Kein `localStorage`/`sessionStorage`
- `@churchtools/churchtools-client` NUR in `src/shared/api/` (ESLint erzwingt das);
  Feature-Code nutzt `@/shared/api` bzw. `src/wizard/wizard.api.ts`
- Keine hartkodierten Instanz-IDs außerhalb von `src/wizard/config.ts` (env-überschreibbar);
  Rollen über Flags/Namen aus `/group/roles` auflösen, Felder über Namen/referenceName
- Entwicklung und alle Schreibtests NUR gegen https://rr-demo.church.tools (`.env`), nie live
- TDD: Fachlogik framework-frei in `src/wizard/*.ts`, Komponenten dünn

## Kommandos

- `npm run check` — lint + typecheck + test + build (muss vor jedem Commit grün sein)
- `npm run seed:demo` — idempotentes Seed der Demo-Instanz (Testteam, Sammelgruppe, Vorlage)
- `RUN_E2E=1 npx vitest run e2e-demo` — echter End-to-End-Lauf gegen rr-demo (räumt auf)

## Konventionen

- Commit-Messages: imperative mood, klein und fokussiert
- Offene Entscheidungen: siehe „Open Questions“ im PRD — nicht still entscheiden, Phil fragen
