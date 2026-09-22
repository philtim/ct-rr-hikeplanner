# ct-rr-hikeplanner

ChurchTools-Extension **„RR HikePlanner“** für den Royal-Rangers-Stamm JMS Altensteig:
Ein 3-Schritte-Assistent, mit dem Team-Leiter in wenigen Minuten eine vollständig und
korrekt konfigurierte Hajk-Gruppe anlegen — mit Anmeldefeldern aus einer zentral
gepflegten Vorlage, korrekter Ablage in der Gruppenhierarchie, automatisch eingetragenen
Organisatoren (Förderanträge) und Termin im öffentlichen „Royal Rangers“-Kalender.

Kein Backend: Die Extension läuft im Browser mit den Rechten des angemeldeten Leiters.

## Setup

```bash
npm install
cp .env-example .env        # Werte für rr-demo eintragen (nie gegen live entwickeln)
npm run seed:demo           # legt Testteam, Sammelgruppe und Vorlage auf rr-demo an
# die ausgegebenen IDs (VITE_TEMPLATE_GROUP_ID, VITE_CALENDAR_ID) in .env eintragen
npm run dev                 # http://localhost:5173/ccm/rr-hikeplanner/
```

## Scripts

- `npm run dev` — Vite-Dev-Server mit Proxy + Auto-Login gegen die Instanz aus `.env`
- `npm run check` — Lint + Typecheck + Tests + Build (CI-Gate)
- `npm run test` / `test:watch` — Vitest (85+ Unit-/Komponententests)
- `RUN_E2E=1 npx vitest run e2e-demo` — echter End-to-End-Lauf gegen rr-demo (räumt auf)
- `npm run seed:demo` — idempotentes Seed der Demo-Instanz
- `npm run deploy` — Build + ZIP-Paket in `releases/`

## Projektstruktur

```
src/
├── wizard/                 # das Feature: Hajk-Assistent
│   ├── config.ts           # Instanz-IDs (env-überschreibbar) + Namensmuster
│   ├── types.ts            # Domänen-Typen
│   ├── naming.ts           # Namensschema RR Hajk <Team> <Datum>
│   ├── leaderContext.ts    # Rollen-/Hierarchie-Auswertung (wer darf, welche Teams)
│   ├── validation.ts       # Schritt-Validierung
│   ├── wizard.api.ts       # alle CT-Endpoints (dünn)
│   ├── provisioning.ts     # Engine: duplizieren → konfigurieren → Rollback bei Fehler
│   ├── useWizard.ts        # Zustandsmaschine
│   └── components/         # GateView, Stepper, 3 Schritte, Ergebnis
└── shared/api/             # einziger Ort mit @churchtools/churchtools-client
```

## Dokumentation

- Produktdefinition: [`docs/prds/prd-hikeplanner-hajk-assistent-v0.1.md`](docs/prds/prd-hikeplanner-hajk-assistent-v0.1.md)
- Design-Spec (Screens/States/Copy): [`docs/design/001-hajk-assistent-wizard.md`](docs/design/001-hajk-assistent-wizard.md)
- Verifizierte API-Payloads: [`docs/NOTES-api-spike.md`](docs/NOTES-api-spike.md)
- Konventionen (Namensschema, Vorlage als SSOT): [`docs/CONVENTIONS.md`](docs/CONVENTIONS.md)
- Berechtigungsmatrix: [`docs/PERMISSIONS.md`](docs/PERMISSIONS.md)

## Lizenz

MIT — siehe [`LICENSE`](LICENSE).
