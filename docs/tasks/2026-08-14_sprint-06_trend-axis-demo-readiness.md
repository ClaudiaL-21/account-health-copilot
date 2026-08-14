# Sprint 06 — Trend-Zeitachse und Demo-Readiness

Status: Von der Product Ownerin am 2026-08-14 freigegeben; Umsetzung offen.

## Ziel

Der Health-Score-Verlauf wird zeitlich eindeutig lesbar. Nutzerinnen und Nutzer sollen nicht nur erkennen, dass sich ein Score über sieben Wochen verändert hat, sondern auch, welche reale Zeitspanne die Linie abbildet.

## Modell und Aufwand für Claude Code

- Modell: Claude Sonnet
- Reasoning/Aufwand: Hoch
- Grund: Kleine sichtbare Änderung mit fachlicher Datenbindung, Responsive-Anforderungen und Risiko für SVG-/Layout-Regressionsfehler.

## Verbindlicher Scope

1. Unter der vorhandenen Trendlinie eine echte x-Achse ergänzen.
2. Achsenbeschriftungen ausschließlich aus den bereits vorhandenen Datumswerten der Score-Historie ableiten; keine erfundenen Daten und keine Änderung der Scoreberechnung.
3. Mindestens Start- und Enddatum anzeigen. Bei ausreichender Breite dürfen sinnvolle Zwischenmarken ergänzt werden.
4. Die Beschriftung muss klar machen, ob Kalenderdatum oder Kalenderwoche dargestellt wird; englische UI-Texte und das bestehende Datumsformat beibehalten.
5. Start-/Endwerte, y-Achse 0/50/100, Trendprozent und Erklärung bleiben erhalten.
6. Bei 390 × 844 dürfen Beschriftungen weder kollidieren noch abgeschnitten werden. Falls nötig, auf Mobile nur Start- und Enddatum zeigen.
7. Die SVG-Darstellung erhält einen verständlichen zugänglichen Namen bzw. eine Textalternative mit Zeitraum, Startwert und Endwert.

## Nicht im Scope

- keine neue Chart-Bibliothek;
- keine Änderung an Health Score, Risikoformeln, Historienwerten oder Referenzdatum;
- keine API-, n8n-, Approval-, Datenbank-, MCP- oder Supabase-Änderung;
- kein Frameworkwechsel;
- kein Commit und kein Push.

## Akzeptanzkriterien

- Die x-Achse zeigt den echten Zeitraum der jeweiligen Account-Historie.
- Ein Betrachter versteht ohne Erklärung, wann die Entwicklung begann und endete.
- 1440 × 900, 1024 × 768 und 390 × 844 bleiben ohne Dokument-Overflow oder überlappende Labels.
- Bestehende Account-Details, AI Insights und Review-/Approval-Pfade funktionieren unverändert.
- `node --check src/app.js`, `npm test` und `git diff --check` sind erfolgreich.
- Manuelle Sichtprüfung mindestens an einem fallenden, einem stabilen und einem steigenden Verlauf.

## Voraussichtliche Dateien

- `src/app.js`
- `src/styles.css`
- bei erforderlicher Testergänzung ausschließlich passende Dateien unter `tests/`

## Abschlussbericht von Claude

Status: umgesetzt am 2026-08-14. Kein Commit, kein Push, kein Folgesprint gestartet.

**Geänderte Dateien**

- `src/app.js` — `renderScoreTrend()` erweitert, neue Hilfsfunktion `pickTickIndices()`, neue Konstante `fmtAxisDate`. Keine sonstige Datei verändert; keine Tests ergänzt (bestehende 70 Tests decken Sprint 06 nicht ab, da rein visuell/SVG — kein neuer automatisierter Test nötig, da keine neue Berechnungslogik entstanden ist, nur Darstellung bestehender Werte).
- `src/styles.css` — `.score-trend` von Reihen- auf Spalten-Layout umgestellt (Sparkline braucht jetzt die volle Zeilenbreite für die x-Achse statt sich mit dem Infotext eine Reihe zu teilen); `.score-sparkline` erhält `max-width:100%; height:auto;` als zusätzliches Sicherheitsnetz gegen Overflow.

**Verwendete Datums-/Tick-Logik**

- Datenquelle ausschließlich `acc.healthScoreHistory` (bereits vorhandene, wöchentliche `{date, score}`-Punkte, unverändert von der Scoreberechnung in `src/scoring.js`) — keine neuen/erfundenen Datumswerte, keine Änderung an `computeHealthScore`/`computeTrend`.
- Start- und Endpunkt (erster/letzter Historieneintrag) werden immer als Tick angezeigt. Zusätzliche Zwischenmarken werden gleichmäßig aus den vorhandenen Indizes ausgewählt (`pickTickIndices`), niemals interpoliert oder erfunden.
- Tick-Dichte richtet sich nach der tatsächlich verfügbaren Kartenbreite, approximiert über `window.innerWidth` zum Renderzeitpunkt (drei Stufen, passend zur bestehenden `.detail-grid`-Breakpoint-Struktur bei 700px):
  - ≥ 1200px (deckt 1440 × 900 ab): SVG-Breite 340px, 4 Beschriftungen (Start + 2 Zwischenmarken + Ende).
  - 700–1199px (deckt 1024 × 768 ab): SVG-Breite 260px, 3 Beschriftungen (Start + 1 Zwischenmarke + Ende).
  - < 700px (deckt 390 × 844 ab): SVG-Breite 200px, ausschließlich Start und Ende — wie im Scope für Mobile vorgesehen.
- Beschriftungsformat auf der Achse: kompaktes Kalenderdatum ohne Jahr (`"MMM D"`, z. B. „Jun 23"), abgeleitet über dieselbe `toLocaleDateString("en-US", …)`-Mechanik wie die bestehende `fmtDate`-Funktion, nur mit engerem Optionsumfang für den begrenzten Platz. Ein Monatsname macht bereits eindeutig, dass ein Kalenderdatum (kein Kalenderwochen-Index) dargestellt wird. Die vollständige, jahresgenaue Form (`fmtDate`, bestehendes Format) steht weiterhin im zugänglichen Namen der Grafik (siehe unten) sowie in der bereits vorhandenen Textzusammenfassung darunter.
- Bestehende Plot-Geometrie (y-Skala 0/50/100, Trendlinie, Start-/End-Punkte samt Zahlen, Trendprozent, Erklärsatz) bleibt pixelgenau unverändert — `plotH` ist fest auf 48 gesetzt, unabhängig von der neuen x-Achsen-Höhe darunter; die x-Achse ist rein additiv.
- Zugänglicher Name: `<title>` als erstes Kind im `<svg>` (plus `role="img"`), z. B. „Health Score trend, Jun 23, 2026 to Aug 11, 2026: started at 34, ended at 9.“ — nutzt die volle `fmtDate`-Form für Zeitraum sowie den echten Start-/Endwert.

**Ergebnisse der drei Viewports** (jeweils per Browser-Messung verifiziert, keine Kollisionen, kein Abschneiden, kein Dokument-Overflow)

- 1440 × 900: 4 Ticks („Jun 23", „Jul 7", „Jul 28", „Aug 11"), SVG 340px, keine Überlappung der Labels (Bounding-Box-Check), Sparkline-Karte passt problemlos.
- 1024 × 768: 3 Ticks („Jun 23", „Jul 21", „Aug 11"), SVG 260px innerhalb einer 337px breiten Karte, keine Überlappung.
- 390 × 844: 2 Ticks („Jun 23", „Aug 11"), SVG 200px innerhalb einer ca. 292–298px breiten Karte, keine Überlappung, kein horizontales Dokument-Overflow.

**Geprüfte Beispiele**

- Fallend: Benelux Mobility Group (34 → 9), Danube Logistics AG (30 → 10), Fjord Telecom (61 → 28).
- Stabil: Alpenbank AG (59 → 58), Rio Digital Bank (16 → 18).
- Steigend: Helvetia Retail Holding (59 → 94), Celtic Financial Services (69 → 85), Java Coast Retail (60 → 89).

Jeweils per programmgesteuertem Klicktest geöffnet, `<title>`-Inhalt und Tick-Beschriftungen gegen die tatsächlichen Historienwerte geprüft.

**Syntax-, Test- und Diff-Check**

- `node --check src/app.js`: erfolgreich.
- `npm test`: 70/70 grün, keine Regressionen.
- `git diff --check`: Exit 0 (nur bekannte, harmlose CRLF-Warnungen in unveränderten Zeilen).
- Zusätzlicher manueller Regressionsdurchlauf (alle 6 Tabs, Portfolio-Detail auf/zu, Attention-Queue-Klick, Matrix-Dot/Detail, Team-Karten) bei 1440 × 900: unauffällig, keine Konsolenfehler.

**Bekannte Restrisiken**

- Die Tick-Dichte wird über `window.innerWidth` zum Renderzeitpunkt bestimmt, nicht über die tatsächlich gemessene Kartenbreite. Das deckt die drei geforderten Viewports zuverlässig ab; bei ungewöhnlichen Zwischenbreiten (z. B. sehr schmales Browserfenster bei gleichzeitig sehr breitem Gerät, oder Zoomstufen ungleich 100 %) könnte die Zwischenmarken-Dichte theoretisch knapper bemessen sein als optimal. Das zusätzliche `max-width:100%` auf der SVG verhindert in jedem Fall ein Overflow, im Zweifel würde die Grafik lediglich verkleinert dargestellt.
- Die Änderung ist rein clientseitig/visuell; sie berührt keine Berechnung, keine API und keine gespeicherten Werte.

---

## Korrekturrunde — Referenzdatum-Widerspruch in healthScoreHistory

Status: umgesetzt am 2026-08-14. Kein Commit, kein Push, kein neuer Sprint gestartet.

**Problem**

`scripts/add-health-score-history.js` verwendete ein eigenes, unabhängig hartcodiertes `TODAY = new Date("2026-08-11")` statt des verbindlichen `REFERENCE_DATE_ISO` aus `src/scoring.js` (2026-08-10). Dadurch endeten alle `healthScoreHistory`-Verläufe am 2026-08-11, einen Tag nach dem in der Anwendung angezeigten „Snapshot as of Aug 10, 2026". Durch die in diesem Sprint neu ergänzte x-Achse wurde dieser Widerspruch erstmals sichtbar („Aug 11" auf der Achse vs. „Aug 10" im Snapshot-Text).

**Geänderte Dateien**

- `scripts/add-health-score-history.js` — importiert jetzt `REFERENCE_DATE_ISO` aus `src/scoring.js` und leitet `TODAY` ausschließlich daraus ab (`new Date(REFERENCE_DATE_ISO)`); das unabhängige `"2026-08-11"`-Literal wurde entfernt. Keine sonstige Logik im Skript verändert (Wochenanzahl, Trendrichtung, Score-Interpolation, Seed-Rauschen unverändert).
- `data/accounts.json` — ausschließlich `healthScoreHistory` neu generiert (Skript erneut ausgeführt). Alle 34 übrigen Felder pro Account sowie `generatedAt` und `csms` per automatisiertem Vorher/Nachher-Vergleich als unverändert bestätigt (0 Abweichungen bei allen 35 Accounts).
- `tests/health-score-history.test.js` — neu, 4 Regressionstests (siehe unten).

**Ergebnis der Regenerierung** (automatisiert geprüft, nicht nur stichprobenartig)

- Alle 35 Historien enden jetzt exakt am 2026-08-10 (vorher 2026-08-11) — jeder Datumswert um genau 1 Tag vorverlegt, sonst unverändert.
- Alle Historien weiterhin exakt 8 Wochenpunkte, exakt 7 Tage Abstand zwischen benachbarten Punkten.
- Alle Scorewerte pro Account und Index identisch zu vorher (0 Abweichungen) — nur die Datumsachse hat sich verschoben, keine Werte.
- Letzter Historienpunkt jedes Accounts entspricht exakt `computeHealthScore(account).score` zum jetzigen Zeitpunkt (0 Abweichungen).
- `data.generatedAt` (bereits vorher „2026-08-10") stimmt mit `REFERENCE_DATE_ISO` überein — dieses Feld war nicht Teil des Fehlers und wurde nicht verändert.

**Neuer Regressionstest** (`tests/health-score-history.test.js`, 4 Tests)

1. `data.generatedAt` entspricht `REFERENCE_DATE_ISO`.
2. Jede `healthScoreHistory` endet am `REFERENCE_DATE_ISO`.
3. Kein Historienpunkt liegt nach dem Referenzdatum.
4. Der letzte Historien-Score entspricht `computeHealthScore(account).score`.

**Browserprüfung**

Account „Benelux Mobility Group" bei 1440 × 900 geöffnet: x-Achse zeigt jetzt „Jun 22 … Jul 6 … Jul 27 … Aug 10" (vorher endete sie auf „Aug 11"); der zugängliche Titel der Grafik lautet „Health Score trend, Jun 22, 2026 to Aug 10, 2026: started at 34, ended at 9." — deckungsgleich mit „Snapshot as of Aug 10, 2026" im Topbar. Keine Konsolenfehler.

**Abschlussprüfung**

- `node --check src/app.js`: erfolgreich (unverändert von dieser Korrekturrunde, zur Vollständigkeit erneut geprüft).
- `node --check scripts/add-health-score-history.js`: erfolgreich.
- `npm test`: **74/74 grün** (70 bestehende + 4 neue), keine Regressionen.
- `git diff --check`: Exit 0 (nur bekannte, harmlose CRLF-Warnungen).
- Automatisierter Feldvergleich `data/accounts.json` vorher/nachher: 0 Abweichungen außerhalb von `healthScoreHistory` (geprüft über alle 35 Accounts, alle Felder inkl. `generatedAt` und `csms`).

**Bekannte Restrisiken**

- Keine neuen. Die Korrektur ist rein datumsbezogen in einem Offline-Datengenerierungsskript; Scoreformeln, sonstige Datumsfelder, andere Datengenerierungsskripte, API/n8n, Approval-Funktion und UI-Design außerhalb der Achsenanzeige wurden nicht angefasst.
