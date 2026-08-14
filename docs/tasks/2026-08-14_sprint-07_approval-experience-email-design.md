# Sprint 07 — Human Approval Experience und gebrandete E-Mail

Status: Von der Product Ownerin am 2026-08-14 fachlich freigegeben; Umsetzung durch Claude Code läuft.

## Ziel

Die menschliche Freigabe soll als bewusster, hochwertiger Kontrollschritt erkennbar sein. App und interne Benachrichtigungs-E-Mail sollen wie zwei Teile desselben Customer Success AI Hub wirken. Gleichzeitig wird transparent beschrieben, wo freigegebene Aktionen heute gespeichert werden und wie daraus später ein vollständiger Aufgaben-Lebenszyklus entsteht.

## Modell und Aufwand für Claude Code

- Modell: Claude Sonnet
- Reasoning/Aufwand: Hoch
- Grund: Die Aufgabe verbindet visuelle Hierarchie, semantische Statusfarben, Responsive-Verhalten, HTML-E-Mail-Kompatibilität und sicherheitsrelevante Behandlung dynamischer Texte.

## Teil A — Approval-Oberfläche im Hub

### Verbindliches Zielbild

- Der aufgeklappte Bereich erhält einen klaren Kopf: Eyebrow `HUMAN REVIEW` und Überschrift `Review & approve action`.
- Die aktuelle Kategorie wird als gut sichtbares Badge dargestellt:
  - `Risk Mitigation`: roter Text auf sehr hellem Rot;
  - `Growth`: grüner bzw. teal-farbener Text auf sehr hellem Grün.
- Rot/Grün kennzeichnet ausschließlich die Kategorie; der primäre Bestätigungsbutton bleibt im Marken-Teal.
- Die Informationshierarchie wird klar getrennt:
  1. `AI suggestion` als schreibgeschützte Herkunftsinformation;
  2. `Final action to send` als bearbeitbarer Bereich;
  3. Felder `Category`, `Recommended action` und `Rationale` mit deutlich lesbaren Überschriften.
- Hinweis `This is the version that will be sent` sichtbar, aber nicht als dominanter Fließtext.
- Abbrechen und Bestätigen bleiben klar getrennt. Bestehende Lade-, Fehler-, Validierungs- und Erfolgszustände bleiben erhalten.
- Mobile bei 390 × 844: Badge, Felder und Buttons ohne Überlauf; Aktionen dürfen untereinander stehen.

### Technische Grenzen

- Bestehender Payload, Servervalidierung, High-Risk-Growth-Guardrail und n8n-Aufruf bleiben unverändert.
- Keine neue Fachlogik und keine Persistenzänderung in Teil A.
- Voraussichtliche Dateien: `src/app.js`, `src/styles.css`, passende Tests nur bei Bedarf.

## Teil B — Gebrandete HTML-E-Mail als Designvorschau

Claude erstellt zunächst ausschließlich eine lokale, synthetische Vorschau unter `docs/mockups/approval-email-preview.html`. Keine echte Mail und kein n8n-Aufruf.

### Visuelle Richtung

- maximale Inhaltsbreite ungefähr 640 px;
- Navy-Header (`Customer Success AI Hub`) mit kleinem Teal-Akzent;
- Betreffvorschlag: `[Action approved] Risk Mitigation · Maple Financial Corp`;
- kompakter Human-Review-Hinweis;
- Accountname, Account-ID, CSM und Freigabezeitpunkt in einer ruhigen Metazeile;
- farbiges Kategorie-Badge entsprechend der App;
- `Recommended action` als visuell stärkster Inhaltsblock;
- `Rationale` als sekundärer Begründungsblock;
- Footer: `AI-generated suggestion, reviewed by a human before sending.`;
- optionaler Button `Open action register`, in der Vorschau ohne echte URL.

### E-Mail-Kompatibilität und Sicherheit

- tabellenbasiertes Layout und Inline-CSS; kein CSS Grid/Flex als tragende Struktur;
- keine externen Schriften, Bilder, Skripte oder Trackingelemente;
- dynamische Werte müssen vor Einfügung in HTML escaped werden (`&`, `<`, `>`, `"`, `'`);
- keine echten Mailadressen, Webhook-Pfade, Sheet-IDs, Credential-IDs oder Kundendaten in der Vorschau;
- Darstellung für Desktop und schmale Mailansicht prüfen.

## Teil C — Action Register: aktueller Stand und nächste Ausbaustufe

### Heute vorhanden

Der Approval-Workflow schreibt je Freigabe eine neue Google-Sheets-Zeile mit Zeitpunkt, Account-ID, Accountname, CSM, finaler Aktion, Kategorie und Begründung. Die App selbst speichert den Freigabestatus nur im Arbeitsspeicher; nach einem Reload ist er dort nicht mehr sichtbar.

### Präsentationsfähige Erweiterung im bestehenden Sheet

Nach visueller Freigabe soll das bestehende Sheet um folgende Spalten ergänzt werden:

- `Action ID` — stabile eindeutige Kennung;
- `Status` — Standardwert `Open`, später `In progress`, `Completed`, `Cancelled`;
- `Owner` — zunächst CSM;
- `Due date`;
- `Completed at`;
- `Outcome` — kurze Ergebnisbeschreibung;
- `Reviewed by human`;
- `Last updated`.

Damit entsteht ohne Datenbankmigration ein einfacher, ehrlicher Action-Register-Demofall. Status und Outcome werden vorerst direkt im Sheet gepflegt und sind noch nicht in der App sichtbar.

### Spätere Produktstufe

Ein echtes `Action Center` im Hub mit Lesen, Filtern, Abschließen und Outcome-Erfassung benötigt eine persistente Backend-Datenquelle und einen abgesicherten Read-/Update-Pfad. Das ist nach der Präsentation sinnvoll; keine Supabase- oder CRM-Migration in diesem Sprint.

## Geplante n8n-Umsetzung nach PO-Abnahme

Bestehende Kette: `Webhook → Append row in sheet → Gmail → Respond to Webhook`.

Empfohlene Erweiterung:

1. Sheet-Spalten ergänzen und beim Append sinnvolle Startwerte setzen (`Status = Open`, `Owner = CSM`).
2. Zwischen Sheet und Gmail einen Knoten `Prepare branded email` ergänzen.
3. Dieser Knoten escaped alle dynamischen Texte und erzeugt:
   - `categoryLabel`;
   - `categoryTextColor` und `categoryBackgroundColor`;
   - `emailSubject`;
   - `emailHtml`.
4. Gmail nutzt ausschließlich `emailSubject` und `emailHtml`.
5. Erfolgsantwort bleibt erst hinter erfolgreichem Sheet- und Gmail-Schritt.
6. Ein einziger kontrollierter Test mit klar gekennzeichneten synthetischen Daten; dadurch entstehen genau eine echte Sheet-Zeile und eine interne Testmail.

## Akzeptanzkriterien

- Approval-Bereich besitzt eine klare Überschriftenhierarchie und farbiges Kategorie-Badge.
- `Risk Mitigation` und `Growth` sind textlich lesbar und nicht nur über Farbe unterscheidbar.
- Bearbeitete Werte, Validierung und Sendeverhalten bleiben funktional unverändert.
- E-Mail-Vorschau bildet alle freigegebenen Kerntexte ab: Account, Account-ID, CSM, Kategorie, Aktion, Begründung, Freigabezeitpunkt und Human-Review-Hinweis.
- Vorschau passt visuell zum Executive-Design des Hubs.
- Keine echten externen Aktionen während Claudes Umsetzung.
- `node --check src/app.js`, `npm test` und `git diff --check` erfolgreich.
- Kein Commit und kein Push.

## Abschlussbericht von Claude

Status: umgesetzt am 2026-08-14. Kein Commit, kein Push, kein neuer Sprint gestartet.

**Geänderte/neue Dateien**

- `src/app.js` — `renderReviewForm()` überarbeitet (neuer Kopf mit Eyebrow/Titel/Badge, getrennte „AI suggestion"/„Final action to send"-Bereiche, umbenanntes Feld „Recommended action"); neue kleine Hilfsfunktion `reviewCategoryMeta()`. Payload, Servervalidierung, Guardrail und der `approveAction`/n8n-Aufrufpfad wurden nicht angefasst — `submitApproval()`, `reviewValidationError()` und alle State-Übergänge (`idle → reviewing → pending → done/error`) sind unverändert.
- `src/styles.css` — neue Regeln für `.review-head`, `.review-head-row`, `.review-title`, `.review-category-badge`, `.review-section-label`, `.review-hint-inline`, `.review-origin`; bestehende `.review-original`/`.review-hint` an die neue Struktur angepasst; neue Mobile-Regel `.review-actions { flex-direction: column; }` im bestehenden 480px-Media-Query. Badge-Farben nutzen die bereits vorhandenen `.status-pill.risk-high`/`.risk-low`-Klassen (kein neues Farbschema).
- `docs/mockups/approval-email-preview.html` — neu, lokale synthetische E-Mail-Designvorschau (Teil B).
- `docs/tasks/2026-08-14_sprint-07_approval-experience-email-design.md` — Status auf „freigegeben" aktualisiert, dieser Abschlussbericht ergänzt.

**Zentrale UI-Designentscheidungen (Teil A)**

- Kopf: Eyebrow „HUMAN REVIEW" (wiederverwendet `.ai-copilot-eyebrow`, keine neue Farbregel) + Überschrift „Review & approve action", daneben ein gut sichtbares Kategorie-Badge.
- Badge nutzt exakt dieselben Farben wie der Rest der App: Risk Mitigation = rot auf sehr hellem Rot (`.status-pill.risk-high`), Growth = grün auf sehr hellem Grün (`.status-pill.risk-low`). Das Badge folgt live dem aktuell gewählten `draft.category` (nicht nur dem ursprünglichen KI-Vorschlag) — ändert die CSM-Person die Kategorie im Dropdown, aktualisieren sich Text und Farbe des Badges sofort.
- Der primäre Bestätigungsbutton (`.review-confirm-btn`) bleibt unverändert Marken-Teal, unabhängig von der Kategorie — Rot/Grün kennzeichnet ausschließlich die Kategorie, nicht Erfolg/Gefahr.
- Informationshierarchie klar getrennt: „AI suggestion" als schreibgeschützter Block mit eigenem hellgrauen Hintergrund (`.review-origin`, `var(--surface-muted)`), darunter „Final action to send" als bearbeitbarer Bereich mit den drei Feldern „Category", „Recommended action", „Rationale" (deutlich lesbare, nicht rein kleingeschriebene Überschriften über den Formularfeld-Labels).
- Hinweistext „— this is the version that will be sent" sitzt jetzt klein und grau direkt neben der Bereichsüberschrift „Final action to send", nicht mehr als eigener dominanter Fließtext-Absatz.
- Abbrechen/Bestätigen bleiben zwei klar getrennte Buttons; alle bestehenden Zustände (Validierungsfehler, Sendefehler, „Sending…", disabled während `pending`, Erfolgsmeldung je nach `workflowConnected`) sind unverändert im Code und wurden geprüft (siehe unten).

**E-Mail-Design (Teil B)**

- `docs/mockups/approval-email-preview.html`: tabellenbasiertes Layout (7 verschachtelte `<table>`, kein CSS Grid/Flex als tragende Struktur), reines Inline-CSS, keine externen Schriften/Bilder/Skripte/Tracking (0 `<script>`, 0 externe `<link>`, 0 `<img>`).
- Maximale Inhaltsbreite 640px (`width="640"` plus `max-width:640px; width:100%`), Navy-Header (`#153450`) mit 3px Teal-Akzentlinie (`#14b8a6`).
- Betreffvorschlag exakt wie gefordert: „[Action approved] Risk Mitigation · Maple Financial Corp" (auch als `<title>` gesetzt).
- Kompakter Human-Review-Hinweis, ruhige Metazeile mit Accountname, Account-ID, CSM und Freigabezeitpunkt, farbiges Kategorie-Badge (dieselben Farben wie in der App), „Recommended action" als visuell stärkster Block (größere Schrift, Teal-Akzentbalken, hellteal Hintergrund), „Rationale" als sekundärer Block, Footer-Disclaimer exakt wie gefordert, optionaler Button „Open action register" mit `href="#"` (keine echte URL).
- Verwendete Beispieldaten stammen bewusst aus dem bereits vorhandenen, vollständig fiktiven Demo-Datensatz der App (`data/accounts.json`: Maple Financial Corp / ACC-29 / CSM Marcus Bennett) — keine realen Kundendaten, keine echten Mailadressen, keine Webhook-Pfade, Sheet-IDs oder Credential-IDs. Aktion, Begründung und Freigabezeitpunkt sind erkennbar illustrativer, synthetischer Beispieltext für die Designvorschau.
- HTML-Escaping demonstriert, nicht nur dokumentiert: Der Rationale-Text enthält bewusst ein `&amp;` im Quelltext (rendert korrekt als „&" im Browser) als lebendes Beispiel für das geforderte Escaping (`&`, `<`, `>`, `"`, `'`) — im Datei-Kommentar wird erläutert, dass ein künftiger n8n-Knoten „Prepare branded email" alle fünf dynamischen Felder (Accountname, Account-ID, CSM, Aktion, Begründung) exakt so escapen müsste wie `src/app.js`s `escapeHtml()`.

**Teil C — Action-Register-Stand (dokumentiert, keine Code-/Sheet-/n8n-Änderung)**

- Heute: Der Approval-Workflow schreibt je Freigabe eine neue Google-Sheets-Zeile (Zeitpunkt, Account-ID, Accountname, CSM, finale Aktion, Kategorie, Begründung); die App selbst hält den Freigabestatus nur im Arbeitsspeicher (nach Reload nicht mehr sichtbar). Unverändert von diesem Sprint.
- Präsentationsfähige Erweiterung (spezifiziert, nicht umgesetzt): geplante zusätzliche Sheet-Spalten `Action ID`, `Status` (Standard `Open`), `Owner`, `Due date`, `Completed at`, `Outcome`, `Reviewed by human`, `Last updated` — wie im Sprint-Auftrag beschrieben, ohne Datenbankmigration.
- Spätere Produktstufe (nicht Teil dieses Sprints): ein echtes `Action Center` im Hub mit Lesen/Filtern/Abschließen benötigt eine persistente Backend-Datenquelle — bewusst zurückgestellt.
- Wie verbindlich vorgegeben wurde **keine** Änderung am produktiven n8n-Workflow und **keine** Sheet-Spalten-Änderung vorgenommen; Teil C bleibt reine Dokumentation/Planung in dieser Sprint-Datei.

**Geprüfte Zustände und Responsive-Verhalten**

Da „keine AI-Buttons während der Browserprüfung ausgelöst" werden durften, wurde das Review-Formular nicht über den echten „Load AI Insights"-Button erreicht (das hätte einen AI-Aufruf ausgelöst). Stattdessen wurde die exakt gleiche Markup-/Event-Logik aus `renderReviewForm()` 1:1 in einen temporären Test-Container innerhalb eines regulär (nicht per AI-Button) geöffneten Account-Detail-Bereichs injiziert und dort mit echten DOM-Events geprüft — dieselbe live CSS/Seite, ohne jeden Netzwerk- oder Webhook-Aufruf. Der Container wurde nach jedem Test wieder entfernt.

- Risk-Mitigation-Darstellung: Badge „Risk Mitigation", Textfarbe `rgb(220,38,38)` auf Hintergrund `rgb(254,242,242)` — korrekt.
- Growth-Darstellung: Badge „Growth", Textfarbe `rgb(22,163,74)` auf Hintergrund `rgb(236,253,243)` — korrekt.
- Bestätigungsbutton bleibt in beiden Fällen Teal (`rgb(20,184,166)`).
- Bearbeiten: Eingabe im Action-Feld aktualisiert Zeichenzähler (`31/500`) und Draft korrekt.
- Kategoriewechsel: Badge aktualisiert sich live (Risk Mitigation → Growth) inkl. Farbwechsel.
- Validieren: leeres Action-Feld erzeugt „Action cannot be empty." (`.review-error`), wie im bestehenden `reviewValidationError()`.
- Pending-Zustand: „Sending…" sichtbar, Cancel/Confirm-Buttons disabled — kein Webhook ausgelöst.
- Fehlerzustand: „Could not send (network error). Your edits are kept — you can try again." korrekt gerendert.
- 1440 × 900: kein horizontales Dokument-Overflow, alle Elemente sichtbar.
- 390 × 844: `.review-actions` steht in Spalte (`flex-direction: column`), Cancel/Confirm je 240px (volle Breite), Badge bleibt innerhalb des Containers, Head-Zeile umbricht bei Bedarf (`flex-wrap: wrap`), 0 überlaufende Elemente, kein Dokument-Overflow.
- E-Mail-Vorschau breit (1440 px Viewport): Tabelle exakt 640px, Navy-Header/Teal-Akzent/Badge-Farben korrekt, kein Grid/Flex, 0 Skripte/externe Ressourcen, Button-Href `#`.
- E-Mail-Vorschau schmal (390 px Viewport): Tabelle schrumpft responsiv auf 366px, 0 überlaufende Elemente, kein Dokument-Overflow.
- Keine Konsolenfehler in App oder E-Mail-Vorschau bei keinem der geprüften Zustände/Viewports.
- Zusätzlicher Regressionsdurchlauf: alle 6 Tabs aktivierbar, Portfolio-Detail öffnet weiterhin normal, der reguläre „Load AI Insights"-Button ist unverändert vorhanden (aber bewusst nicht angeklickt).

**Testergebnisse**

- `node --check src/app.js`: erfolgreich.
- `npm test`: **74/74 grün** (unverändert gegenüber vor diesem Sprint — Teil A/B sind rein visuell bzw. eine statische Mockup-Datei, keine neue Fachlogik, daher kein neuer automatisierter Test nötig; bestehende Tests decken Payload/Validierung/Guardrail/n8n-Vertrag bereits ab und blieben unverändert grün).
- `git diff --check`: Exit 0 (nur bekannte, harmlose CRLF-Warnungen).
- `git status`: nur `src/app.js`, `src/styles.css` sowie diese Sprint-Datei als bestehende Dateien geändert; `docs/mockups/approval-email-preview.html` neu; alle anderen bereits vor diesem Sprint uncommitteten Änderungen unangetastet erhalten.

**Bekannte Restrisiken**

- Die E-Mail-Vorschau wurde ausschließlich im Browser geprüft, nicht in echten E-Mail-Clients (Outlook, Gmail-App etc.) gerendert — für die tatsächliche n8n-Umsetzung nach PO-Abnahme wird ein Test in mindestens einem echten Client empfohlen (im Sprint-Auftrag bereits als „ein einziger kontrollierter Test" vorgesehen).
- Das Review-Formular wurde aus den genannten Gründen nicht über den echten AI-Insight-Ladepfad, sondern über injiziertes, aber code-identisches Markup getestet; die Wahrscheinlichkeit einer Abweichung zwischen Testpfad und echtem Pfad ist sehr gering, da exakt derselbe Quelltext verwendet wurde, aber ein finaler Klicktest über den echten „Load AI Insights"-Button (mit Einverständnis zu einem AI-Aufruf) steht noch aus, falls gewünscht.
- Teil C ist bewusst nur Dokumentation; die Sheet-Spalten-Erweiterung und der n8n-Knoten „Prepare branded email" sind nicht umgesetzt und erfordern eine eigene, separat freizugebende n8n-Änderung.

**Ausdrückliche Bestätigung**

- Es wurde **keine echte E-Mail versendet**.
- Es wurde **kein n8n-Webhook und kein sonstiger externer Aufruf ausgelöst**.
- Es wurde **kein Commit und kein Push** durchgeführt.
