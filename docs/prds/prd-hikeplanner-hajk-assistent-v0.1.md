# HikePlanner — „Neuen Hajk anlegen“-Assistent

- **Version:** 0.1 (Draft)
- **Autor:** Philipp Timmalog (mit Claude)
- **Datum:** 2026-09-22
- **Status:** Draft
- **Projektgröße:** M
- **Dateiname:** prd-hikeplanner-hajk-assistent-v0.1.md

## Change History

| Datum | Version | Autor | Änderung |
|---|---|---|---|
| 2026-09-22 | 0.1 | Philipp | Initiales Draft nach Discovery-Interview und CT-Recon vom 21.09.2026 |

## TL;DR

HikePlanner ist eine ChurchTools-Extension für den Royal-Rangers-Stamm JMS Altensteig, mit der Team-Leiter in wenigen Minuten eine vollständig und korrekt konfigurierte Hajk-Veranstaltungsgruppe anlegen. Der Assistent erkennt automatisch Team und Teilstamm des Leiters, dupliziert eine zentral gepflegte Vorlagengruppe, hängt das Ergebnis in die richtige Sammelgruppe, trägt Organisatoren und Leiter ein und legt den Termin im öffentlichen „Royal Rangers“-Kalender an. Damit entfallen das fehleranfällige manuelle Duplizieren und der daraus entstandene Berechtigungs- und Hierarchie-Wildwuchs. Erfolg zeigt sich daran, dass neue Hajk-Gruppen ausschließlich über den Assistenten entstehen und ohne Nacharbeit korrekt sind.

## Problem Statement

**Problem:** Team-Leiter können heute keine Hajk-Gruppen sauber anlegen. Das manuelle Duplizieren der Vorlagengruppe scheitert an fehlenden Berechtigungen oder erzeugt inkonsistente Gruppen (fehlende Anmeldefelder, falsche Namen, falsche oder mehrfache Eltern-Gruppen, fehlende Organisatoren).

**Aktueller Zustand:** Leiter duplizieren die Vorlagengruppe von Hand oder bitten Administratoren darum. Die Recon der Live-Instanz zeigt den Effekt: Hajk-Gruppen mit 4+ Eltern-Gruppen, Hajks unter Team- oder Verwaltungsgruppen statt in den Sammelgruppen, eine Hajk-Gruppe, die versehentlich Eltern-Gruppe anderer Hajks ist, uneinheitliche Namen.

**Auswirkung:** Zeitverlust bei Leitern und Admins, kaputte Gruppenhierarchie, fehlende Anmeldefelder bei laufenden Anmeldungen, und die Organisatorin für Förderanträge (Irma Betz) fehlt teils in Gruppen — dadurch riskiert der Stamm verpasste Fördermittel.

## Target Users / Personas

### Team-Leiter *(Primary)*

- **Kontext:** Ehrenamtliche Leiter/Co-Leiter eines Stufenteams (z. B. „RR Kundschafterteam Eisbären“). Nutzen ChurchTools gelegentlich, kein Admin-Wissen.
- **Jobs-to-be-done:** Für das eigene Team einen Hajk planen: Gruppe mit Anmeldung aufsetzen, Teilnehmer verwalten, Termin sichtbar machen.
- **Pain Points:** Fehlende Rechte zum Gruppen-Anlegen, Unsicherheit bei Sichtbarkeit/Feldern/Namen, Abhängigkeit von Admins.

### Stammleiter

- **Kontext:** Mitglieder der Gesamt-Stammleitung bzw. Leiter eines Teilstamms („RR &lt;Stufe&gt;stamm-MA“). Höheres CT-Verständnis.
- **Jobs-to-be-done:** Hajks auch für fremde Teams anlegen; Überblick und Konsistenz über alle Aktionen behalten.
- **Pain Points:** Räumen heute den Wildwuchs anderer auf.

### Organisatorin Förderanträge (sekundär, passiv)

- **Kontext:** Irma Betz; stellt Förderanträge (Zuschüsse gibt es ab zwei Übernachtungen).
- **Jobs-to-be-done:** Von jedem Hajk automatisch erfahren (Mitgliedschaft als Organisator in jeder Hajk-Gruppe), inkl. Anzahl Nächte aus der Beschreibung.
- **Pain Points:** Wird heute bei manuell angelegten Gruppen vergessen.

## Goals

- Ein Team-Leiter legt ohne fremde Hilfe und ohne CT-Detailwissen einen vollständigen Hajk an; erkennbar daran, dass keine Admin-Nacharbeit (Felder, Hierarchie, Organisatoren, Name) mehr nötig ist.
- Jede über den Assistenten angelegte Gruppe hängt in genau einer Sammelgruppe („RR | Camps und Aktionen – &lt;Stufe&gt;“) und folgt dem Namensschema — beobachtbar in der Gruppenhierarchie.
- Die Organisatorinnen für Förderanträge sind in 100 % der neu angelegten Hajk-Gruppen als Organisator eingetragen.
- Anpassungen am Feldkatalog, an Settings und an Organisatoren erfolgen ausschließlich in der Vorlagengruppe über die CT-Oberfläche — ohne Code-Änderung oder Deployment.
- Jeder neue Hajk ist ohne weiteren Pflegeschritt im öffentlichen „Royal Rangers“-Kalender sichtbar.

## Scope

- Extension-Seite „Neuen Hajk anlegen“ in ChurchTools (läuft mit den Rechten des angemeldeten Nutzers).
- Berechtigungs- und Teamermittlung des angemeldeten Nutzers über die CT-API (Team-Leiter → eigene Teams; Stammleiter → alle Teams).
- Formular: Team, Datum von/bis, Anmeldemodus (Selbstanmeldung oder manuelles Eintragen), Auswahl der Anmeldefelder, Anmeldeschluss, maximale Teilnehmerzahl, Kurzbeschreibung, Treffpunkt/Ort.
- Automatische Namensvergabe nach Schema `RR Hajk <Team> <Datum von–bis>`.
- Provisionierung durch Duplizieren der Vorlagengruppe „=== Vorlage Hajks“ (ID 2587) inkl. Korrektur der Eltern-Gruppen, Entfernen nicht gewählter Felder, Setzen der Formularangaben, Übernahme der Organisatoren aus der Vorlage, Eintragen des Leiters.
- Anlage eines Termins im öffentlichen Kalender „Royal Rangers“ (ID 69), verknüpft mit der Gruppe.
- Bestätigungsseite mit Link zur Gruppe; Rollback bei Fehlschlag.
- Dokumentierte Berechtigungsmatrix (`docs/PERMISSIONS.md`) und Konventionen (`docs/CONVENTIONS.md`) als Begleitartefakte.

## Out-of-Scope / Non-Goals (global)

- Weitere Aktionstypen (Tagesaktion, Übernachtung, Camp) werden im MVP NICHT angeboten — nur Hajk.
- Der Assistent bearbeitet, verschiebt oder storniert KEINE bestehenden Hajk-Gruppen und räumt Altbestand NICHT auf.
- Es wird KEIN Backend/Dienstkonto betrieben; alle Aktionen laufen mit den Rechten des angemeldeten Nutzers (Entscheidung vom 21.09.2026).
- Es werden KEINE Termine in Stufen-Kalendern angelegt — nur im öffentlichen „Royal Rangers“-Kalender.
- Der Assistent legt KEINE neuen Anmeldefeld-Typen an; wählbar ist nur, was die Vorlagengruppe vorgibt.
- KEINE Teilnehmer-/Anmeldeverwaltung innerhalb der Extension — das bleibt die normale CT-Gruppenansicht.
- KEIN eigener Gruppentyp „RR Aktion“ im MVP; es wird der bestehende Typ „Veranstaltung“ genutzt.

## User Stories

### US-1: Zugang und Teamauswahl

**Priorität:** P0
**Story:** Als Team-Leiter möchte ich, dass der Assistent meine Teams automatisch erkennt, damit ich ohne Konfigurationswissen nur noch auswählen muss, für welches Team der Hajk ist.

#### Beschreibung

Der Assistent ermittelt beim Start die Rollen des angemeldeten Nutzers über die CT-API und leitet daraus die wählbaren Teams und den jeweiligen Teilstamm (für Ablage) ab. Nicht berechtigte Nutzer sehen eine erklärende Hinweisseite statt des Formulars.

#### Acceptance Criteria (Given/When/Then)

- **GIVEN** ein Nutzer ist Leiter oder Co-Leiter (Rolle 9/10) in genau einem Stufenteam
  **WHEN** er den Assistenten öffnet
  **THEN** ist dieses Team vorausgewählt und keine weitere Teamwahl nötig.
- **GIVEN** ein Nutzer ist Leiter/Co-Leiter in mehreren Stufenteams
  **WHEN** er den Assistenten öffnet
  **THEN** wählt er aus einer Liste genau seiner Teams.
- **GIVEN** ein Nutzer ist Stammleiter (Leiter-Rolle in einer „RR &lt;Stufe&gt;stamm-MA“-Gruppe oder Mitglied der „RR Gesamt-Stammleitung“, ID 950)
  **WHEN** er den Assistenten öffnet
  **THEN** kann er jedes Stufenteam des Stamms auswählen (Teilstamm-Leiter: alle Teams; zur Einschränkung auf den eigenen Teilstamm siehe Open Questions).
- **GIVEN** ein Nutzer hat keine dieser Rollen
  **WHEN** er den Assistenten öffnet
  **THEN** sieht er eine Hinweisseite, wer den Assistenten nutzen darf und an wen er sich wenden kann — kein Formular.

#### Edge Cases

- Nutzer ist Leiter in einem Team, dessen Teilstamm keine Sammelgruppe „RR | Camps und Aktionen – &lt;Stufe&gt;“ hat → Fehlermeldung mit Handlungshinweis (Sammelgruppe fehlt), kein Anlegen möglich.
- Team hängt unter mehreren Eltern (Datenwildwuchs) → maßgeblich ist die Eltern-Gruppe vom Typ „RR &lt;Stufe&gt;stamm-MA“.
- Nutzer-Session abgelaufen → Standard-CT-Loginverhalten, kein eigener Auth-Flow.

#### Non-Goals (Story-spezifisch)

- Diese Story implementiert KEINE Freigabeliste/manuelle Berechtigungspflege — Berechtigung ergibt sich ausschließlich aus CT-Rollen.
- Keine Anzeige oder Auswahl fremder Teams für normale Team-Leiter.

#### Abhängigkeiten

- Keine (Startpunkt des Flows).

---

### US-2: Hajk konfigurieren

**Priorität:** P0
**Story:** Als Team-Leiter möchte ich die Eckdaten meines Hajks in einem Formular erfassen, damit die Gruppe vollständig und einheitlich entsteht, ohne dass ich CT-Einstellungen kennen muss.

#### Beschreibung

Ein einzelnes Formular erfasst alle Angaben: Datum von/bis, Anmeldemodus, Anmeldeschluss, maximale Teilnehmerzahl, Kurzbeschreibung, Treffpunkt/Ort. Der Gruppenname wird ausschließlich generiert (`RR Hajk <Team> <DD.MM.–DD.MM.YYYY>`) und als Vorschau angezeigt — kein Freitextname.

#### Acceptance Criteria (Given/When/Then)

- **GIVEN** das Formular ist geöffnet
  **WHEN** der Leiter Team und Datum eingibt
  **THEN** zeigt der Assistent live den generierten Gruppennamen als nicht editierbare Vorschau an.
- **GIVEN** der Leiter wählt den Anmeldemodus „Selbstanmeldung“
  **WHEN** er fortfährt
  **THEN** sind Anmeldeschluss und Feldauswahl (US-3) aktiv; die spätere Gruppe erlaubt Mitgliedern die Selbstanmeldung.
- **GIVEN** der Leiter wählt den Anmeldemodus „Ich trage Teilnehmer manuell ein“
  **WHEN** er fortfährt
  **THEN** entsteht die Gruppe ohne offene Selbstanmeldung; Anmeldeschluss entfällt, die Feldauswahl bleibt möglich (Felder dienen dann der Datenpflege durch den Leiter).
- **GIVEN** Enddatum liegt vor Startdatum oder Anmeldeschluss nach Startdatum
  **WHEN** der Leiter absenden will
  **THEN** verhindert eine Feldvalidierung mit konkreter Meldung das Absenden.
- **GIVEN** der Zeitraum umfasst weniger als zwei Übernachtungen
  **WHEN** der Leiter das Datum eingibt
  **THEN** erscheint ein nicht blockierender Hinweis, dass Förderungen erst ab zwei Nächten möglich sind.

#### Edge Cases

- Kurzbeschreibung leer → blockierende Validierung; die Beschreibung ist Pflicht (Fördernachweis: Nächte, Inhalt).
- Maximale Teilnehmerzahl leer → keine Begrenzung (kein Default erzwingen).
- Browser-Reload während der Eingabe → Formular startet leer; kein Auto-Save im MVP.

#### Non-Goals (Story-spezifisch)

- Kein frei editierbarer Gruppenname, auch nicht für Stammleiter.
- Keine Warteliste-Konfiguration im Formular (Vorlagen-Setting gilt).

#### Abhängigkeiten

- Baut auf US-1 auf (Team steht fest).

---

### US-3: Anmeldefelder aus der Vorlage auswählen

**Priorität:** P0
**Story:** Als Team-Leiter möchte ich aus einer vorgegebenen Liste ankreuzen, welche Angaben ich von Teilnehmern brauche (z. B. Vegetarisch, T-Shirt-Größe), damit die Anmeldung genau die nötigen Daten erhebt.

#### Beschreibung

Der Assistent liest die Anmeldefelder der Vorlagengruppe aus und zeigt sie als Checkliste. Die Vorlage ist die Single Source of Truth: Neue Wunschfelder werden von Berechtigten in der Vorlagengruppe gepflegt und erscheinen ohne Code-Änderung im Assistenten.

#### Acceptance Criteria (Given/When/Then)

- **GIVEN** die Vorlagengruppe enthält Anmeldefelder
  **WHEN** der Leiter die Feldauswahl öffnet
  **THEN** sieht er jedes Feld der Vorlage mit Name und ggf. Optionen als an-/abwählbaren Eintrag.
- **GIVEN** der Leiter wählt eine Teilmenge der Felder
  **WHEN** die Gruppe provisioniert wird (US-4)
  **THEN** enthält die neue Gruppe genau die gewählten Felder — nicht gewählte Felder sind entfernt.
- **GIVEN** die Vorlagengruppe enthält keine Felder
  **WHEN** der Leiter die Feldauswahl öffnet
  **THEN** erscheint ein Hinweis, dass der Feldkatalog in der Vorlage gepflegt wird, und der Flow bleibt fortsetzbar.

#### Edge Cases

- Felder werden in der Vorlage geändert, während der Leiter das Formular offen hat → maßgeblich ist der Stand beim Absenden (Duplikat der Vorlage zu diesem Zeitpunkt).
- Feld in der Vorlage ist als „im Anmeldeformular Pflicht“ markiert → Markierung wird unverändert übernommen, der Assistent ändert sie nicht.

#### Non-Goals (Story-spezifisch)

- Der Leiter kann KEINE eigenen Felder definieren und KEINE Feldeigenschaften (Pflicht, Optionen, Reihenfolge) ändern.

#### Abhängigkeiten

- Baut auf US-2 auf (Teil desselben Formulars); benötigt Lesezugriff auf die Vorlagengruppe.

---

### US-4: Gruppe provisionieren

**Priorität:** P0
**Story:** Als Team-Leiter möchte ich, dass nach dem Absenden eine vollständig konfigurierte Hajk-Gruppe am richtigen Ort entsteht, damit ich sofort mit der Planung weitermachen kann.

#### Beschreibung

Kernstück der Extension. Ablauf: Vorlagengruppe duplizieren (Felder, Settings, Sichtbarkeit kommen mit) → nicht gewählte Felder löschen → Eltern-Gruppen korrigieren (genau eine: Sammelgruppe des Teilstamms) → Name, Datum, Beschreibung (inkl. Ort), Anmeldeschluss, maximale Teilnehmerzahl, Anmeldemodus setzen → Organisator-Mitglieder der Vorlage übernehmen → anfragenden Leiter als „Leiter“ (Rolle 23) eintragen. Alle Einzelschritte wurden per API auf der Dev-Instanz verifiziert (Recon 21.09.2026).

#### Acceptance Criteria (Given/When/Then)

- **GIVEN** ein gültiges Formular
  **WHEN** der Leiter absendet
  **THEN** existiert danach eine Gruppe mit generiertem Namen, gewählten Feldern, gesetzten Eckdaten und genau einer Eltern-Gruppe: „RR | Camps und Aktionen – &lt;Stufe des Teams&gt;“.
- **GIVEN** die Vorlage enthält Mitglieder mit Rolle „Organisator“ (Rolle 26)
  **WHEN** die Gruppe entsteht
  **THEN** sind alle diese Personen in der neuen Gruppe als Organisator eingetragen; andere Vorlagen-Mitglieder (z. B. der Vorlagen-Pfleger als „Leiter“) werden NICHT übernommen.
- **GIVEN** die Gruppe wurde angelegt
  **WHEN** der Vorgang abschließt
  **THEN** ist der anfragende Nutzer als „Leiter“ (Rolle 23) Mitglied der neuen Gruppe.
- **GIVEN** ein Provisionierungsschritt schlägt fehl (z. B. Feld löschen, Eltern setzen)
  **WHEN** der Fehler auftritt
  **THEN** löscht der Assistent die teilangelegte Gruppe wieder und zeigt eine verständliche Fehlermeldung mit dem fehlgeschlagenen Schritt — es bleibt kein Teilzustand zurück.

#### Edge Cases

- Eine Gruppe mit identischem Namen existiert bereits → Abbruch vor dem Duplizieren, Meldung mit Link zur bestehenden Gruppe.
- Duplizieren übernimmt die Eltern-Gruppen der Vorlage → der Assistent entfernt alle geerbten Eltern und setzt genau die Ziel-Sammelgruppe.
- Rollback selbst schlägt fehl (Gruppe lässt sich nicht löschen) → Fehlermeldung nennt die verwaiste Gruppe samt Link, damit sie manuell entfernt werden kann.
- Doppelklick auf „Anlegen“ → Absenden ist während der Provisionierung gesperrt (keine Duplikate).

#### Non-Goals (Story-spezifisch)

- Kein nachträgliches Ändern einer einmal angelegten Gruppe durch den Assistenten.
- Keine Übernahme von Teilnehmern, Terminen oder Chat-Inhalten aus der Vorlage.

#### Abhängigkeiten

- Baut auf US-1 bis US-3 auf; benötigt für den Nutzer die CT-Rechte aus `docs/PERMISSIONS.md` (Gruppen anlegen/duplizieren für Typ „Veranstaltung“).

---

### US-5: Kalendertermin anlegen

**Priorität:** P0
**Story:** Als Stamm möchte ich, dass jeder neue Hajk automatisch im öffentlichen „Royal Rangers“-Kalender steht, damit Termine ohne Doppelpflege für alle sichtbar sind.

#### Beschreibung

Nach erfolgreicher Gruppen-Provisionierung legt der Assistent einen Termin im Kalender „Royal Rangers“ (ID 69) an: Titel = Gruppenname, Zeitraum = Datum von/bis (ganztägig), Beschreibung mit Link zur Gruppe.

#### Acceptance Criteria (Given/When/Then)

- **GIVEN** die Gruppe wurde erfolgreich angelegt
  **WHEN** die Provisionierung abschließt
  **THEN** existiert im Kalender „Royal Rangers“ ein ganztägiger Termin über den Hajk-Zeitraum mit dem Gruppennamen als Titel.
- **GIVEN** die Terminanlage schlägt fehl (z. B. fehlendes Kalenderrecht)
  **WHEN** der Fehler auftritt
  **THEN** bleibt die Gruppe bestehen; die Bestätigungsseite weist deutlich darauf hin, dass der Kalendereintrag fehlt und manuell nachgetragen werden muss (kein Rollback der Gruppe).

#### Edge Cases

- Terminüberschneidung mit bestehenden Terminen → kein Konfliktverhalten; Überschneidungen sind erlaubt.
- Datum wird nach Anlage in CT geändert → keine Synchronisation; der Termin wird manuell gepflegt (siehe globale Non-Goals).

#### Non-Goals (Story-spezifisch)

- Keine Termine in Stufen-Kalendern, keine Terminserien, keine Ressourcenbuchung.

#### Abhängigkeiten

- Baut auf US-4 auf; benötigt Schreibrecht des Nutzers auf Kalender 69 (Teil der Berechtigungsmatrix).

---

### US-6: Bestätigung und Ergebnisübersicht

**Priorität:** P0
**Story:** Als Team-Leiter möchte ich nach dem Anlegen eine klare Bestätigung mit Link zur Gruppe, damit ich sicher weiß, was entstanden ist und wo ich weiterarbeite.

#### Beschreibung

Abschlussseite des Assistenten: Ergebnis der Provisionierung als Übersicht (Gruppe, Ablageort, Felder, Organisatoren, Kalendertermin) mit direktem Link zur Gruppe.

#### Acceptance Criteria (Given/When/Then)

- **GIVEN** die Provisionierung war vollständig erfolgreich
  **WHEN** die Bestätigungsseite erscheint
  **THEN** zeigt sie den Gruppennamen, den Ablageort (Sammelgruppe), die übernommenen Felder und Organisatoren, den Kalendertermin und einen Link, der direkt zur neuen Gruppe in ChurchTools führt.
- **GIVEN** ein optionaler Schritt ist fehlgeschlagen (nur Kalender, US-5)
  **WHEN** die Bestätigungsseite erscheint
  **THEN** ist der fehlgeschlagene Schritt deutlich als „manuell nachzuholen“ markiert, der Rest als erfolgreich.

#### Edge Cases

- Nutzer schließt den Tab vor Anzeige der Bestätigung → die Gruppe existiert trotzdem; sie ist über „Meine Gruppen“ in CT auffindbar (kein eigener Wiederaufnahme-Flow).

#### Non-Goals (Story-spezifisch)

- Keine E-Mail-/Chat-Benachrichtigungen durch den Assistenten (CT-Standardverhalten bleibt unberührt).

#### Abhängigkeiten

- Baut auf US-4 und US-5 auf.

## Non-Functional Requirements

- **Security:** Keine Tokens oder Dienstkonto-Zugangsdaten im Extension-Code oder Browser-Storage; alle API-Aufrufe laufen über die bestehende CT-Session des angemeldeten Nutzers. Berechtigungsprüfung (US-1) ist serverseitig durch CT-Rechte abgesichert — die UI-Prüfung ist Komfort, nicht Schutz.
- **Reliability:** Kein dauerhafter Teilzustand: Nach Fehlern existiert entweder die vollständige Gruppe (ggf. mit markiertem fehlendem Kalendereintrag) oder keine. Jede Fehlermeldung nennt den fehlgeschlagenen Schritt.
- **Performance:** Provisionierung (US-4 + US-5) zeigt Fortschritt pro Schritt an; bei mehr als 10 Sekunden Gesamtdauer bleibt die UI bedienbar und informiert weiter.
- **Compatibility:** Läuft als ChurchTools-Extension in den von der Instanz unterstützten aktuellen Browsern (Desktop und Mobile-Viewport ab 360 px Breite).
- **Internationalization:** Nur Deutsch. `N/A — Begründung:` einsprachiger Stamm, keine weiteren Locales geplant.
- **Observability:** Fehler der CT-API werden mit Schritt, HTTP-Status und CT-Fehlermeldung in der Browser-Konsole geloggt; die UI zeigt eine nutzerverständliche Übersetzung.

## Dependencies & Risks

**Dependencies:**

- ChurchTools-Instanz jms-altensteig.church.tools (live) bzw. rr-demo.church.tools (Entwicklung/Test) und deren REST-API.
- Vorlagengruppe „=== Vorlage Hajks“ (ID 2587) als Single Source of Truth für Settings, Feldkatalog und Organisatoren; gepflegt von der Stammleitung.
- Sammelgruppen „RR | Camps und Aktionen – &lt;Stufe&gt;“ (IDs 2606, 2609, 2612, 2615, 2618; Gesamtstamm 2600) und Teilstamm-Struktur („RR &lt;Stufe&gt;stamm-MA“: 1012, 80, 123, 129, 132; Gesamt-Stammleitung 950).
- Kalender „Royal Rangers“ (ID 69, öffentlich).
- CT-Rollenmodell: Stufenteam Leiter 9 / Co-Leiter 10; Veranstaltung Teilnehmer 22 / Leiter 23 / Co-Leiter 24 / Organisator 26.
- Berechtigungsvergabe an Leiter gemäß noch zu erstellender Matrix (`docs/PERMISSIONS.md`).

**Risks:**

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| CT-API ignoriert Anmelde-Settings (`visibility`, `isOpenForMembers`, `signUpOpeningDate`) beim PATCH stillschweigend (auf Dev-Instanz beobachtet) → Modus „manuelles Eintragen“ evtl. nicht per Settings-Änderung umsetzbar | High | High | Früh in der Implementierung klären (korrektes Payload-Format, ggf. CT-Support/Forum); Fallback: zweite Vorlagen-Variante „ohne Selbstanmeldung“, da Duplizieren Settings zuverlässig kopiert |
| Nur-Leiter-Accounts fehlen Rechte für Duplizieren/Gruppenanlage oder Kalenderschreiben | Medium | High | Berechtigungsmatrix zuerst umsetzen und mit Test-Leiter-Account auf der Live-Instanz verifizieren, bevor die Extension breit angekündigt wird |
| Vorlagengruppe wird versehentlich verändert/gelöscht (SSOT-Klumpenrisiko) | Low | High | Sichtbarkeit/Rechte der Vorlage restriktiv halten; Assistent validiert die Vorlage beim Start (existiert, Typ Veranstaltung, hat Organisator) und bricht mit klarer Meldung ab |
| Anlage-Recht ermöglicht Leitern auch manuelles (wildes) Gruppenanlegen außerhalb des Assistenten | Medium | Medium | Akzeptiert (Entscheidung Modell A); Konvention in `docs/CONVENTIONS.md` + Namens-/Hierarchie-Monitoring durch Stammleitung |
| Jährlich wechselnde Stufenteams machen statische Team-Listen falsch | High | Low | Teams werden zur Laufzeit dynamisch über die Hierarchie ermittelt, keine IDs im Code |

## User Flows

### Flow: Hajk anlegen (Happy Path)

**Beteiligt:** Team-Leiter
**Vorbedingung:** Nutzer ist in CT angemeldet und Leiter/Co-Leiter mindestens eines Stufenteams; Vorlagengruppe und Sammelgruppen existieren.

1. Leiter öffnet die Extension-Seite „Neuen Hajk anlegen“.
2. System ermittelt Teams und Rolle; Team ist vorausgewählt (oder Leiter wählt eines seiner Teams).
3. Leiter gibt Datum von/bis ein; System zeigt den generierten Gruppennamen und ggf. den Förder-Hinweis (unter zwei Nächten).
4. Leiter wählt den Anmeldemodus:
   - 4a. „Selbstanmeldung“: Anmeldeschluss angeben.
   - 4b. „Manuell eintragen“: Anmeldeschluss entfällt.
5. Leiter hakt die benötigten Anmeldefelder an, ergänzt maximale Teilnehmerzahl (optional), Kurzbeschreibung und Treffpunkt/Ort.
6. Leiter klickt „Hajk anlegen“; System zeigt den Fortschritt der Schritte (Duplizieren, Felder, Ablage, Mitglieder, Kalender).
7. System zeigt die Bestätigungsseite mit Übersicht und Link zur neuen Gruppe.

**Alternative Pfade:**

- Bei Validierungsfehler in Schritt 3–5: Absenden blockiert, Meldung am betroffenen Feld.
- Bei Namenskollision in Schritt 6: Abbruch mit Link zur bestehenden Gruppe.
- Bei Fehler in einem Provisionierungsschritt: Rollback (Gruppe löschen) und Fehlermeldung mit Schrittangabe; nur bei Kalender-Fehler bleibt die Gruppe bestehen (Hinweis auf Bestätigungsseite).

### Flow: Nicht berechtigter Nutzer

**Beteiligt:** CT-Nutzer ohne Leiter-Rolle
**Vorbedingung:** Nutzer ist in CT angemeldet.

1. Nutzer öffnet die Extension-Seite.
2. System findet keine qualifizierende Rolle.
3. System zeigt eine Hinweisseite: Wer den Assistenten nutzen darf und an wen man sich für einen Hajk wenden kann.

### Flow: Stammleiter legt Hajk für fremdes Team an

**Beteiligt:** Stammleiter
**Vorbedingung:** Nutzer ist Stammleiter (siehe US-1).

1. Stammleiter öffnet die Extension-Seite.
2. System bietet alle Stufenteams zur Auswahl an.
3. Ab hier identisch zum Happy Path ab Schritt 3; Ablage und Kalender richten sich nach dem gewählten Team, der Stammleiter wird selbst als Leiter der Gruppe eingetragen.

## Open Questions / TBDs

- [ ] **TBD:** Stammleiter-Definition bestätigen: Leiter-Rolle in „RR &lt;Stufe&gt;stamm-MA“ → nur eigener Teilstamm oder alle Teams? Mitglied „RR Gesamt-Stammleitung“ → alle Teams? → @Philipp
- [ ] **Offen:** Technische Umsetzung „Anmeldemodus manuell“ (Settings-PATCH-Problem, siehe Risks) — Payload-Format klären oder zweite Vorlagen-Variante.
- [ ] **Offen:** Exakte CT-Berechtigungen, die ein Leiter für Duplizieren + Eltern setzen + Mitglieder eintragen + Kalenderschreiben braucht → wird beim Erstellen von `docs/PERMISSIONS.md` mit Test-Account ermittelt.
- [ ] **Offen:** Soll der Stammleiter beim Anlegen für ein fremdes Team optional den dortigen Team-Leiter (statt sich selbst) als Gruppen-Leiter eintragen können?
- [ ] **Offen:** Dev-Instanz rr-demo hat keine Teams/Sammelgruppen/Vorlage — Seed-Struktur für Entwicklung und Tests dort anlegen.
- [x] ~~Entschieden: Modell A — Extension läuft mit Rechten des Nutzers, kein Backend/Dienstkonto~~ (2026-09-21)
- [x] ~~Entschieden: Nur Aktionstyp Hajk im MVP~~ (2026-09-21)
- [x] ~~Entschieden: Eine Vorlagengruppe als Single Source of Truth (Settings, Felder, Organisatoren)~~ (2026-09-21)
- [x] ~~Entschieden: Kalendertermin im öffentlichen „Royal Rangers“-Kalender, direkt im MVP~~ (2026-09-21)
- [x] ~~Entschieden: Namensschema `RR Hajk <Team> <Datum>`, generiert, kein Freitext~~ (2026-09-21)
