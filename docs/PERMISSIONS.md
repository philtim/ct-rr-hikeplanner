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

### Bekannte, akzeptierte Lücke: Anmeldefelder (final untersucht 22.09.2026)

**Alle Schreiboperationen auf Gruppen-Anmeldefeldern (POST/PUT/DELETE
`…/memberfields/group/…`) liefern für Leiter 403** mit der generischen Meldung
„Forbidden to update groupMemberFields[{groupId}]" — auch als Gruppenleiter der frisch
erstellten Gruppe. Erschöpfend getestet und wirkungslos:

- churchdb „Sicherheitslevel Gruppe" Stufe 1 UND Stufe 4 (je mit frischer Session)
- Gruppenleiter-Rolle, Typ-Rechte sehen/erstellen/bearbeiten/löschen/Mitgliedschaften

Der churchdb-Rechtekatalog kennt kein eigenes Memberfield-Recht; der Zugriff ist
faktisch an **„Gruppen verwalten (administer groups)"** gebunden (global — bewusst
nicht vergeben). Auch der Umweg „Felder frisch anlegen statt löschen" scheitert am
selben Check (POST ebenfalls 403; Validierung läuft vor der Rechteprüfung, daher
täuscht ein 400 bei unvollständigem Payload Schreibrecht nur vor).

**Konsequenz (Produktentscheidung 22.09.2026):** Der Wizard bietet keine Feld-Auswahl
mehr an und fasst Felder gar nicht an — jede neue Veranstaltung übernimmt alle
Vorlagen-Felder; Schritt 2 zeigt sie nur noch als Info-Liste. Ausnahmen je Event
entfernt die Stammleitung nachträglich in der Gruppe. Ggf. als Feature-Wunsch an
ChurchTools: feingranulares Recht für Gruppen-Anmeldefelder.

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
