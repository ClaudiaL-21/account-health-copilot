# Sprint 05 — Product-wide UX/UI Polish & Demo Hardening

Status: Freigegeben für Umsetzung am 2026-08-13.

## Ziel

Der gesamte Customer Success AI Hub soll wie ein zusammenhängendes, modernes und präsentationsfähiges SaaS-Produkt wirken — nicht wie mehrere einzeln entstandene Prototypansichten. Gleichzeitig wird der im echten Approval-Test gefundene falsche Erfolgsfall geschlossen: Ein internes n8n-Problem darf in der App nicht mehr als `sent` erscheinen.

## Modell und Aufwand

- Modell: Claude Sonnet
- Aufwand/Reasoning: Hoch
- Grund: Der Sprint verbindet produktweites UX/UI-System, Responsive Design, bestehende Interaktionen und einen sicherheitsrelevanten API-Antwortvertrag.

## Designrichtung

Eigenständige, ruhige und hochwertige B2B-SaaS-Oberfläche: executive-ready, evidence-first und human-controlled. Bestehende Navy-/Teal-Markenfarben beibehalten, Weißraum und visuelle Hierarchie verbessern, Interaktionen konsistent machen. Keine Planhat-Gestaltung kopieren und keine fremden Markenassets verwenden.

## Teil A — Produktweite UX/UI-Politur

### 1. Gemeinsamer Product Shell

- Harmonisiere Header, Logo, Produktname, Unterzeile, Demo-Hinweis, Navigation, Filterbereich, Contentbreite und Footer.
- Ergänze in `index.html` eine korrekte mobile Viewport-Metangabe.
- Vereinheitliche den sichtbaren Produktnamen und den Browser-Titel auf `Customer Success AI Hub`.
- Navigation muss auf Desktop und Mobile übersichtlich bleiben; keine gequetschten Beschriftungen und kein unkontrolliertes horizontales Seiten-Scrolling.
- Der Demo-Hinweis soll sichtbar, aber deutlich ruhiger als ein Warn- oder Fehlerzustand wirken.

### 2. Kleines visuelles System statt Einzelkorrekturen

- Ergänze bzw. konsolidiere CSS-Variablen für Abstände, Radien, Schatten, Fokus und Oberflächen.
- Vereinheitliche Karten, Abschnittsüberschriften, Tabellencontainer, Buttons, Eingaben, Badges, Hinweiskästen und leere Zustände.
- Lege eine klare Button-Hierarchie fest: primary, secondary und text action. Gefährliche/fehlgeschlagene Zustände dürfen nicht wie normale Aktionen aussehen.
- Alle interaktiven Elemente benötigen gut sichtbare `:focus-visible`-Zustände und sinnvolle Hover-/Disabled-Zustände.
- Keine neue Bibliothek, keine externen Fonts, keine dekorativen Stockbilder und keine auffälligen Animationen.

### 3. Portfolio

- Portfolio-Frage, Summary-Chips und Tabelle visuell als zusammengehörigen Arbeitsbereich strukturieren.
- Die Tabelle auf kleineren Breiten kontrolliert horizontal scrollbar machen, ohne das gesamte Dokument zu verbreitern. Nutzer müssen erkennen können, dass weitere Spalten vorhanden sind.
- Accountzeilen, Sortierzustand und Expanded Detail klarer lesbar machen.
- Accountdetails, Score-Erläuterung, Evidenzen, KI-Inhalte und Human-Review visuell sauber gruppieren.
- Lade-, Fehler-, Retry- und Erfolgsmeldungen dürfen keinen Layoutsprung oder unklaren Status erzeugen.

### 4. Matrix und Map

- Beide Ansichten mit konsistentem Seitenkopf, Erklärung, Legende, Steuerung und Detailkarte ausstatten.
- Toggle-, Punkt-/Marker- und Detailinteraktionen auf Touchbreiten nutzbar halten.
- Bestehende Berechnung, SVG-/Leaflet-Logik und Navigation zu Accountdetails nicht ändern.

### 5. Team und Feedback

- Teamkarten, KI-Priorisierung, Pattern Alert und Next Best Action klar staffeln.
- Feedbacktabelle in dasselbe Tabellen-/Responsive-System wie Portfolio integrieren.
- Bestehende Sortierung und Klickpfade bewahren.

### 6. Trust

- Die freigegebene Informationsarchitektur und Copy aus Sprint 04 beibehalten.
- Nur so weit harmonisieren, wie es für das gemeinsame visuelle System erforderlich ist.
- Roadmap-Inhalte bleiben eindeutig als noch nicht aktiv gekennzeichnet.

### 7. Responsive und Accessibility

- Verbindlich prüfen: 1440 × 900, 1024 × 768 und 390 × 844.
- Kein horizontales Dokument-Scrolling bei diesen Breiten. Nur bewusst eingesetzte Tabellen-/Visualisierungscontainer dürfen intern horizontal scrollen.
- Touchziele, Textumbruch, Kontrast, Fokusreihenfolge und Lesbarkeit kontrollieren.
- Semantik bestehender Navigation und Überschriften erhalten oder verbessern.
- `prefers-reduced-motion` respektieren, falls Bewegung verwendet wird.

## Teil B — Approval-Rückmeldung zuverlässig machen

### Gefundener Fehler

Beim kontrollierten Approval-Test war das Google-Sheets-Credential abgelaufen. n8n markierte die Ausführung intern als Fehler, lieferte dem App-Server aber dennoch HTTP 200. `api/approve-action.js` wertete bisher jedes 2xx pauschal als Erfolg und antwortete fälschlich mit `status: sent`.

### Verbindliche Lösung

- Nach dem einmaligen n8n-Aufruf muss `api/approve-action.js` zusätzlich den JSON-Antwortvertrag prüfen.
- Erfolg gilt ausschließlich, wenn der Body ein Objekt mit `status === "sent"` und `workflowConnected === true` ist.
- Leerer Body, ungültiges JSON, fehlende/falsche Felder oder jeder andere 2xx-Body gelten als kontrollierter Fehler und führen gegenüber dem Browser zu HTTP 502.
- Externe Antwortinhalte, Credentials und URLs dürfen weder im Browser noch in Logs offengelegt werden.
- Keine automatische Wiederholung; ein Approval-Webhook darf pro Nutzeraktion weiterhin höchstens einmal aufgerufen werden.
- Der bestehende lokale Fallback ohne konfigurierte Approval-URL (`status: logged`, `workflowConnected: false`) bleibt unverändert.
- Ergänze gezielte Tests für gültigen Vertrag, leeren/malformed Body, fehlende Felder, falschen Status und `workflowConnected: false`.
- Passe vorhandene n8n-Approval-Testmocks an den realen Erfolgsvertrag an, ohne Tests abzuschwächen.

## Bewusst nicht im Scope

- keine neue Produktfunktion, kein EBR-/QBR-Generator und keine SWOT-Analyse;
- kein MCP, keine Supabase-Migration und kein Frameworkwechsel;
- keine Änderung an Scores, Rankings, Daten oder dem festen Referenzdatum;
- keine neue API außer der beschriebenen Vertragsprüfung;
- keine n8n-Konfigurationsänderung und kein echter E-Mail-/Sheet-Test durch Claude;
- keine neuen Abhängigkeiten oder Buildtools;
- keine Planhat-Screenshots, Texte, Logos, Kundenlogos oder visuelle Kopie;
- kein Commit und kein Push.

## Akzeptanzkriterien

- Alle sechs Ansichten wirken sichtbar wie ein Produkt aus einem Designsystem.
- Produktname, Navigation, Filter, Seitenköpfe, Karten, Tabellen und Zustände sind konsistent.
- Desktop, Laptop und Mobile sind lesbar und frei von unbeabsichtigtem horizontalem Dokument-Scrolling.
- Portfolio- und Feedbacktabellen bleiben vollständig erreichbar.
- Keine bestehende Berechnung, Filterung, Sortierung, Matrix-/Map-Interaktion, KI-Funktion oder Review-Bearbeitung regressiert.
- Ein interner n8n-Fehler mit HTTP 200, aber ungültigem Erfolgsbody, wird nicht mehr als `sent` angezeigt.
- Approval wird nie automatisch erneut gesendet.
- Syntaxprüfung und gesamte Testsuite sind grün; die neuen Vertragsfälle sind abgedeckt.
- Es werden keine echten KI-, Gmail-, Sheets- oder n8n-Aktionen während der Umsetzung ausgelöst.

## Verbindlicher manueller Klicktest

Ohne echte KI-/n8n-Aktionen prüfen:

1. Alle Tabs nacheinander öffnen und aktiven Zustand kontrollieren.
2. Filter setzen, Ansichten wechseln und Rückkehr der Filter prüfen.
3. Portfoliozeile öffnen/schließen und Detailbereiche prüfen.
4. Matrixmodus wechseln, Punkt auswählen und Detail schließen.
5. Map öffnen, Marker-/Detaildarstellung prüfen, soweit lokal verfügbar.
6. Teamkarte öffnen und zurücknavigieren.
7. Feedbacksortierung prüfen.
8. Trust vollständig prüfen.
9. Mobile: Navigation, Filter, Portfolio-/Feedbacktabelle, Detailkarte und Trust kontrollieren.
10. Browserkonsole auf neue Fehler/Warnungen prüfen.

## Vorgehen für Claude Code

1. Lies vollständig `docs/10_project_control.md`, diese Sprintdatei, `index.html`, `src/app.js`, `src/styles.css`, `src/ai.js`, `api/approve-action.js`, `api/_n8n.js` und alle Tests zum Approval-/n8n-Verhalten.
2. Prüfe den Git-Status nur lesend. Alle bestehenden Änderungen gehören der Product Ownerin und dürfen nicht zurückgesetzt oder überschrieben werden.
3. Erstelle vor der Änderung eine knappe visuelle Bestandsaufnahme der sechs Ansichten für dich; setze danach den Scope als ein kohärentes System um.
4. Verändere keine fachliche Logik außerhalb des ausdrücklich beschriebenen Approval-Antwortvertrags.
5. Führe Syntaxprüfung, `npm test`, `git diff --check` und den manuellen Klicktest aus.
6. Erstelle keinen Commit und keinen Push. Starte keinen Folgesprint.
7. Abschlussbericht: geänderte Dateien, wichtigste Designentscheidungen, neue Approval-Tests, Testergebnis, geprüfte Viewports, Klicktestergebnis und bekannte Restrisiken.

