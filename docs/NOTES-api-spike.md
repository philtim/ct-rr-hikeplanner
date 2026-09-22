# API-Spike-Ergebnisse (rr-demo, 2026-09-22)

Verbindliche Antworten für die Provisionierungs-Implementierung (`wizard.api.ts`, `provisioning.ts`).
Alle Tests mit Wegwerfgruppen `ZZ Spike*` auf https://rr-demo.church.tools durchgeführt und rückstandsfrei gelöscht.

## 1. Gruppe konfigurieren: `PATCH /api/groups/{id}` erwartet FLACHE Top-Level-Keys

Verschachtelte Payloads (`{"settings":{…}}`, `{"information":{…}}`) werden **stillschweigend ignoriert**
(das war das „Settings-PATCH-Problem“ aus PRD-Risiko 1 — gelöst). Funktionierende flache Keys:

| Key | Wert | Wirkung |
|---|---|---|
| `note` | string | Gruppenbeschreibung (`information.note`) |
| `visibility` | `"intern"` etc. | `settings.visibility` |
| `maxMembers` | int | `settings.maxMembers` |
| `dateOfFoundation` | `"YYYY-MM-DD"` | `information.dateOfFoundation` (= Hajk-Start) |
| `endDate` | `"YYYY-MM-DD"` | `information.endDate` (= Hajk-Ende) |
| `signUpOpeningDate` | `"YYYY-MM-DDTHH:MM:SSZ"` oder `null` | `settings.signUpOpeningDate`; **steuert `isOpenForMembers`** (abgeleitet: gesetzt+vergangen → true, `null` → false) |
| `signUpClosingDate` | Zulu oder `null` | `settings.signUpClosingDate` |
| `autoAccept` | bool | `settings.autoAccept` |

**Anmeldemodus-Entscheidung:**
- „Selbstanmeldung“: `signUpOpeningDate` = jetzt (Zulu), `signUpClosingDate` = Anmeldeschluss (oder `null`).
- „Manuell eintragen“: `signUpOpeningDate: null, signUpClosingDate: null` → `isOpenForMembers` wird false.
- Kein Fallback mit zweiter Vorlagen-Variante nötig.

## 2. Eltern-Gruppen: `GET/PUT/DELETE /api/groups/{id}/parents[/{parentId}]`

- `GET /groups/{id}/parents` → `{"data":[{ "domainIdentifier": "24", "title": …, … }]}` — IDs als **String** in `domainIdentifier`, mit `Number()` parsen.
- Ein frisch per API angelegtes Gruppen-Objekt hat keine Parents; ein **Duplikat einer Vorlage mit Parents erbt diese** (Recon 21.09.) → nach dem Duplizieren alle geerbten löschen, Ziel-Sammelgruppe setzen.
- `PUT /groups/{id}/parents/{parentId}` → 201, `DELETE …` → 204, beide ohne Body.

## 3. Duplizieren: `POST /api/groups/{id}/duplicate?newName=<urlencoded>`

- Antwort: volles Gruppenobjekt, neue ID in `data.id`.
- Kopiert Anmeldefelder (mit **neuen** Feld-IDs!), Settings und Eltern. Ohne `copyMembers`-Flag keine Mitglieder.

## 4. Kalendertermin: `POST /api/calendars/{calId}/appointments`

Minimal funktionierender Payload:

```json
{
  "caption": "RR Hajk …",
  "startDate": "2027-04-10",
  "endDate": "2027-04-12",
  "allDay": true,
  "isInternal": false,
  "description": "Langtext inkl. Gruppenlink"
}
```

- `isInternal` ist **Pflicht** (Validierungsfehler ohne).
- `caption` → Titel; `description` → Beschreibung; `note` würde als **Untertitel** angezeigt (nicht verwenden für Langtext).
- Antwort: `data.id`; Löschen via `DELETE /api/calendars/{calId}/appointments/{id}` → 204.

## 5. Sonstiges

- Gruppe anlegen: `POST /api/groups` mit `{name, groupTypeId, groupStatusId}`; Gruppe löschen: `DELETE /api/groups/{id}` → 204.
- Anmeldefeld anlegen: `POST /api/groups/{id}/memberfields/group` — `securityLevel` (int) ist Pflicht; `referenceName` wird automatisch aus dem Namen erzeugt (Recon 21.09.).
- `GET /api/groups/{id}/memberfields` → `data[].field.{id,name,fieldTypeCode,options[],requiredInRegistrationForm,useInRegistrationForm}`.

## Noch offen (Task 16 / E2E)

- CT-Theme-Klasse für Dark-Mode aus dem DOM der Demo-Instanz ablesen (für `wizard.css`).
- Kompletter Durchlauf mit Nur-Leiter-Rechten steht aus (PERMISSIONS.md, Live-Verifikation mit Test-Account).
