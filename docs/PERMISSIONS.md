# Berechtigungsmatrix — HikePlanner

Der Assistent läuft vollständig mit den Rechten des angemeldeten Nutzers (Modell A,
PDR-Entscheidung vom 21.09.2026). Diese Matrix listet, welche CT-Rechte jede Rolle
braucht, damit der Wizard durchläuft — abgeleitet aus den tatsächlichen API-Aufrufen
in `src/wizard/wizard.api.ts`.

Status-Legende: ✅ erforderlich · ➖ nicht nötig · ❓ ZU VERIFIZIEREN mit Test-Account.

| CT-Recht (churchdb, sofern nicht anders vermerkt) | Team-Leiter/Co-Leiter | Stammleiter | Organisatorin | Mitglied |
|---|---|---|---|---|
| Eigene Gruppenmitgliedschaften sehen (`/persons/{id}/groups`) | ✅ ❓ | ✅ ❓ | ➖ | ➖ |
| Gruppenhierarchie lesen (`/groups/hierarchies`) | ✅ ❓ | ✅ ❓ | ➖ | ➖ |
| Vorlagengruppe sehen inkl. Felder + Mitglieder (Sichtbarkeit „intern“ genügt?) | ✅ ❓ | ✅ ❓ | ➖ | ➖ |
| Veranstaltungsgruppe anlegen/duplizieren (`POST /groups`, `/duplicate`) — pro Gruppentyp vergebbar | ✅ ❓ | ✅ ❓ | ➖ | ➖ |
| Angelegte Gruppe bearbeiten (PATCH, Felder löschen, Eltern setzen) — als Ersteller/Leiter der Gruppe | ✅ ❓ | ✅ ❓ | ➖ | ➖ |
| Mitglieder in die neue Gruppe eintragen (`PUT /groups/{id}/members/{pid}`) | ✅ ❓ | ✅ ❓ | ➖ | ➖ |
| Gruppe löschen (nur Rollback-Fall, eigene frisch angelegte Gruppe) | ✅ ❓ | ✅ ❓ | ➖ | ➖ |
| Kalender „Royal Rangers“ (ID 69) Termine anlegen (churchcal) | ✅ ❓ | ✅ ❓ | ➖ | ➖ |
| Anlegen-Recht für andere Gruppentypen (Kleingruppe, Dienst, Merkmal) | ➖ | ➖ | ➖ | ➖ |
| Admin-/globale Gruppenrechte | ➖ | ➖ | ➖ | ➖ |

Hinweise:

- Die Rollenprüfung des Assistenten (wer welche Teams sieht) ist nur Komfort in der UI —
  die eigentliche Absicherung sind die CT-Rechte oben. Wer das Anlage-Recht nicht hat,
  scheitert serverseitig, egal was die UI zeigt.
- Bewusst akzeptiertes Restrisiko (PDR): Mit dem Anlage-Recht können Leiter Gruppen auch
  manuell (am Assistenten vorbei) anlegen. Konvention dazu in `docs/CONVENTIONS.md`.
- Kalender-Schreibrecht fehlt → der Wizard läuft trotzdem durch und markiert nur den
  Termin als „manuell nachzuholen“ (US-5).

## Deploy-Dienstkonto „RR CICD“ (verifiziert 22.09.2026 auf rr-demo)

Für die GitHub-Actions-Deploys (`release-please.yml`, `deploy.yml`) existiert je Instanz
ein Dienstkonto **RR CICD**; sein Login-Token liegt in den GitHub-Secrets
(`CT_DEMO_LOGIN_TOKEN` / `CT_LIVE_LOGIN_TOKEN`). Empirisch bestätigtes Minimal-Rechte-Set:

| churchcore-Recht | Wozu | Status |
|---|---|---|
| „Manage extensions“ (`administer custom modules`) | Module auflisten und bei Bedarf anlegen (`/api/custommodules`) | ✅ bestätigt |
| „Edit system settings“ (`administer settings`) | ZIP-Upload (`POST /api/files/custom_module/{id}`) — ohne dieses Recht: 403 | ✅ bestätigt |
| Alles andere (Personen, Gruppen, Kalender, Modul-Rechte unter `rr-hikeplanner`) | — | ➖ nicht nötig |

Auf der Live-Instanz identisch anlegen (Konto + beide Rechte + Login-Token als Secret).

## Offene Verifikation (Blocker vor dem Rollout)

Der komplette Wizard-Durchlauf (inkl. Duplizieren, Eltern setzen, Kalender) wurde bisher
nur mit Admin-Rechten getestet (E2E auf rr-demo). **Vor der Einladung der Leiter** muss
er auf der Live-Instanz mit einem Test-Account durchlaufen, der NUR die Leiter-Rolle in
einem Stufenteam plus die oben markierten Rechte hat. Dabei jede ❓-Zelle bestätigen und
diese Matrix auf ✅/➖ korrigieren. → braucht Phil (Test-Account + Rechtevergabe in CT).
