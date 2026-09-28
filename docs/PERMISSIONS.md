# Berechtigungsmatrix — HikePlanner

Der Assistent läuft vollständig mit den Rechten des angemeldeten Nutzers (Modell A).
**Verifiziert am 22.09.2026 auf der Live-Instanz mit einem echten Team-Leiter-Account
(kompletter Wizard-Durchlauf inkl. Kalendertermin).** Alle Gruppen-Rechte sind über den
eigenen Gruppentyp **„RR Veranstaltung“** gescopet — Veranstaltungen anderer Bereiche
sind für Leiter unantastbar. Auch Vorlage und Sammelgruppen haben diesen Typ.

## Team-Leiter / Stammleiter (z. B. via Rechtegruppe „RR Mitarbeiter")

| Recht | Wofür | Status |
|---|---|---|
| Modul `rr-hikeplanner` → „RR HikePlanner" sehen (view) | Extension-Seite öffnen (ohne: HTTP 500 mit Berechtigungshinweis) | ✅ |
| Gruppen → „Gruppen eines Gruppentyps sehen" → RR Veranstaltung | Vorlage + Sammelgruppen finden | ✅ |
| Gruppen → „Gruppen eines Gruppentyps erstellen" → RR Veranstaltung | Vorlage duplizieren | ✅ |
| Gruppen → „Gruppen eines Gruppentyps bearbeiten" → RR Veranstaltung | Eckdaten setzen, Ablage einhängen | ✅ |
| Gruppen → „Gruppen eines Gruppentyps löschen" → RR Veranstaltung | automatischer Rollback bei Fehlern | ✅ |
| Gruppen → „Gruppenmitgliedschaften von Gruppen eines Gruppentyps bearbeiten" → RR Veranstaltung | sich selbst als Leiter eintragen | ✅ |
| Kalender → Termine erstellen im Kalender „Royal Rangers" | Hajk-Termin anlegen | ✅ |
| Alles andere (andere Gruppentypen, Personen-Admin, andere Kalender) | — | ➖ nicht nötig |

## Rollenrechte des Gruppentyps „RR Veranstaltung“ (verifiziert 28.09.2026)

Neben den globalen Rechten oben braucht jede Rolle des Gruppentyps **gruppeninterne
Rollenrechte** (im Rechtekatalog die Rechte mit „+“; gelten nur in der Gruppe, in der
man die Rolle hat). Beim Anlegen des Typs waren alle Rollen **leer** — Folge: Leiter
konnten Hajks anlegen, aber die Teilnehmer ihres eigenen Hajks nicht sehen, und
Anmeldefelder nicht verwalten. **Keine globalen Rechte an diese Rollen hängen**
(sonst erhält sie jeder, der irgendwo Leiter/Organisator eines RR-Hajks ist).

| Rolle | gruppeninterne Rechte |
|---|---|
| Leiter (52), Co-Leiter (55) | Gruppenmitglieder sehen **Stufe 4** · Gruppeninfos sehen · Mitglieder hinzufügen/entfernen/kontaktieren · Mitgliedschaften bearbeiten · Gruppeninfos + Grundeinstellungen bearbeiten · **Gruppenmitgliedsfelder verwalten** · Gruppenmitgliedsfelder sehen/bearbeiten · Personenfelder von Mitgliedern bearbeiten · E-Mails bei Änderungen |
| Organisator (58) | Gruppenmitglieder sehen Stufe 4 · Gruppeninfos sehen · Mitglieder hinzufügen/entfernen/kontaktieren · Mitgliedschaften bearbeiten · Personenfelder bearbeiten · E-Mails bei Änderungen |
| Teilnehmer (49) | keine |

- **Stufe 4** bei „Gruppenmitglieder sehen“, weil Personen mit Status „Gemeindemitglied“
  Personen-Sicherheitslevel 4 haben (u. a. die Organisatorinnen) — gilt nur für Mitglieder
  der eigenen Gruppe.
- **„Gruppenmitgliedsfelder verwalten“** ist das Recht für POST/PUT/DELETE auf
  `…/memberfields/group/…` (Leiter-Test in Gruppe 2769: 201/204). Die frühere Annahme,
  dafür sei „Gruppen verwalten (administer groups)“ nötig, war falsch; Sicherheitslevel
  Gruppe Stufe 1/4 in der Rechtegruppe hatten keinen Effekt.
- Prüfen per API: `GET /api/permissions/group_type_role/{rollenId}` (leere Liste = keine Rechte).

## Deploy-Dienstkonto „RR CICD" (je Instanz; verifiziert 22.09.2026)

| churchcore-Recht | Wozu |
|---|---|
| „Manage extensions" (administer custom modules) | Modul auflisten/anlegen |
| „Edit system settings" (administer settings) | ZIP-Upload (`POST /api/files/custom_module/{id}`) |

Login-Token liegt in den GitHub-Secrets (`CT_DEMO_LOGIN_TOKEN` / `CT_LIVE_LOGIN_TOKEN`).

## Bewusst akzeptierte Restrisiken

- Leiter können RR-Veranstaltungsgruppen auch manuell (am Assistenten vorbei) anlegen,
  bearbeiten und löschen — inklusive fremder RR-Hajks und der Sammelgruppen (gleicher
  Typ). Konvention + Stammleitungs-Blick statt technischer Sperre (PDR-Entscheidung).
- Die Rollenprüfung im Wizard (wer welche Teams sieht) ist UI-Komfort; die Absicherung
  sind die CT-Rechte oben.
