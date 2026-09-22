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

Bekannte Lücke (nicht blockierend): **Anmeldefelder löschen** in der frisch angelegten
Gruppe liefert für Leiter 403 (auch als Gruppenleiter); welches Recht CT dafür verlangt,
ist offen (Kandidat: „Gruppen verwalten/administer groups" — bewusst nicht vergeben).
Der Wizard versucht seit v0.1.14 als Fallback, nicht gewählte Felder per
`PUT …/memberfields/group/{id}` mit `useInRegistrationForm: false` aus dem
Anmeldeformular auszublenden; nur wenn auch das scheitert, bleibt die Warnung und die
Stammleitung räumt die Felder. **Stand 22.09.2026: Für Leiter scheitert BEIDES (403).**
Der churchdb-Rechtekatalog kennt kein eigenes Memberfield-Recht; verbleibende
Kandidaten: churchdb **„Sicherheitslevel Gruppe“ (security level group)** — Leitern
Stufe 1 geben und erneut testen — oder „Gruppen verwalten (administer groups)"
(bewusst nicht vergeben, gälte global).

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
