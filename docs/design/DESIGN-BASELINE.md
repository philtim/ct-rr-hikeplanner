# Design Baseline: HikePlanner

**Established:** 2026-09-22
**Owner:** UX/UI Design Director

## Accessibility target

Solide Basis nach Urteil (kein formales WCAG-Audit): vollständige Tastaturbedienung, sichtbarer Fokus, echte Labels für alle Eingaben, ausreichende Kontraste in beiden Themes, Fehlermeldungen am Feld und für Screenreader wahrnehmbar (aria-live), Statuswechsel (Schrittwechsel, Provisionierungsfortschritt) werden announced.

## Responsive strategy

Mobile-first. Breakpoints: 360 px (Mobile, first-class), 768 px (Tablet), 1024 px (Desktop). Leiter nutzen ChurchTools überwiegend am Handy; der Wizard muss einspaltig ab 360 px vollständig funktionieren. Desktop zentriert den Wizard in einer Spalte mit max. ~640 px Inhaltsbreite — kein Mehrspalten-Layout.

## Theming

Extension folgt dem ChurchTools-Erscheinungsbild in hell **und** dunkel (Theme-Einstellung des Nutzers wird respektiert). Farben ausschließlich über semantische Tokens/CSS-Variablen, keine Hex-Werte in Komponenten. Alle CSS-Regeln unter einem Root-Selektor der Extension (Konvention aus ct-rr-organigram).

## Density

Comfortable. Formular-Wizard, keine Datenmassen; großzügige Touch-Ziele (min. 44×44 px) wichtiger als Informationsdichte.

## Internationalization

Nur Deutsch, LTR, Du-Form. Lange deutsche Komposita („Anmeldeschluss“, „Teilnehmerbegrenzung“) dürfen Layouts nicht sprengen: Labels stehen über den Feldern, nie daneben.

## Browser support

Aktuelle Evergreen-Browser (Chrome, Firefox, Safari, Edge), Desktop und Mobile. Kein Legacy-Support.

## Design system choice

Component library: keine externe Library; schlanke eigene Komponenten im ChurchTools-Look (gemeinsame Entscheidung mit Architektur ausstehend, Konventionen aus ct-rr-organigram als Ausgangspunkt).
Token philosophy: semantische Tokens (surface, text, primary, danger, warning, success), gemappt auf CT-Theme-Variablen.

## Change log

- 2026-09-22 — created
