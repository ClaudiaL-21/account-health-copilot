# Sprint 05B — Executive AI Command Center Redesign

Status: Technisch durch Co-PO abgenommen am 2026-08-14; finale visuelle Freigabe durch die Product Ownerin steht aus. Verbindliche visuelle Richtung: **A — Executive**.

## PO-Designentscheidung — verbindlich

Die freigegebene Richtung ist **A — Executive** aus dem Designvergleich vom 2026-08-14. Claude setzt deren Gestaltungsprinzipien in der bestehenden Anwendung um; der Entwurf ist eine visuelle Leitlinie und keine pixelgenaue neue Produktlogik.

- dunkle Navy-Seitennavigation auf Desktop mit Teal-Akzent und eindeutigem aktivem Zustand;
- heller, ruhiger Arbeitsbereich mit hochwertiger Flächenhierarchie;
- kompakter Topbar-/Statusbereich statt großem, leerem Header;
- markanter Portfolio-Seitenkopf und vier deterministische KPI-Flächen;
- AI-Copilot als klar erkennbare, vertrauenswürdig beschriftete Arbeitsfläche;
- kompakte Attention Queue aus bereits vorhandenen, deterministisch priorisierten Daten;
- Filter und Accounttabelle als professionelles Arbeitswerkzeug;
- mobile Umsetzung darf die Seitennavigation in eine kompakte horizontale Navigation überführen;
- keine erfundenen Kennzahlen, Inhalte oder neuen Berechnungen: Alle sichtbaren Werte müssen aus vorhandenen Daten und Funktionen stammen;
- die Varianten B — Precision Light und C — Boardroom sind nicht umzusetzen.

## Ausgangslage

Sprint 05 hat Konsistenz, Responsive-Verhalten und den Approval-Antwortvertrag verbessert. Das Ergebnis wirkt jedoch weiterhin wie ein sauber formatierter Prototyp und noch nicht wie ein eigenständiges, hochwertiges B2B-SaaS-Produkt. Dieser Sprint ist deshalb keine weitere Kleinkorrektur, sondern eine gezielte visuelle Neugestaltung auf Basis der bestehenden Vanilla-HTML-/CSS-/JS-Architektur.

## Zielbild

Ein ruhiges, selbstbewusstes **Customer Success AI Command Center**: executive-ready, evidence-first und human-controlled. Die erste Bildschirmhöhe soll sofort vermitteln:

1. Wo braucht das Portfolio Aufmerksamkeit?
2. Wie groß ist das geschäftliche Risiko?
3. Welche Rolle spielt KI?
4. Wo bleibt die menschliche Kontrolle?

Das Produkt soll eigenständig wirken. Keine Kopie von Planhat, Gainsight oder einem generischen Admin-Template.

## Modell und Aufwand

- Modell: Claude Sonnet
- Reasoning/Aufwand: Hoch
- Grund: Die Aufgabe erfordert produktweites UX/UI-Design, responsive Informationsarchitektur und behutsame Änderungen an bestehendem Rendering ohne fachliche Regression.

## Verbindliche Designrichtung

### 1. Markanter Product Shell

- Kompakter, hochwertiger Header statt großer leerer Fläche: dunkles Navy als tragende Markenfläche, dezenter Verlauf oder Lichtakzent, Teal nur als gezielter Akzent.
- Logo, Produktname, Nutzenversprechen und Demo-/Snapshot-Status klar gruppieren.
- Navigation als hochwertige, gut erkennbare Produktnavigation mit ruhigem aktivem Zustand; keine schwarze Standard-Umrandung als sichtbarer Normalzustand.
- Hintergrund als warmer, sehr heller Canvas mit subtiler Tiefe; nicht ausschließlich weiße Karten auf grauer Fläche.
- Demo-Hinweis als kompakter, vertrauensbildender Status und nicht als breite Warnbox.

### 2. Executive Page Header und KPI-Leiste

- Portfolio, Matrix, Map, Team und Feedback erhalten einen konsistenten, visuell starken Seitenkopf.
- Portfolio zeigt oberhalb der Tabelle eine kompakte KPI-Leiste aus bereits vorhandenen, deterministisch berechneten Daten, zum Beispiel:
  - Accounts im aktuellen Filter,
  - High-Risk Accounts,
  - ARR in High-Risk Accounts,
  - Renewals innerhalb von 90 Tagen oder Expansion Candidates.
- Keine neue Fachlogik und keine neuen Daten. Nur vorhandene Werte verständlicher präsentieren.
- Snapshot-/Trust-Hinweis mit festem Referenzdatum sichtbar, aber unaufdringlich integrieren.

### 3. AI-Flächen klar als Copilot gestalten

- Portfolio Ask und Team Prioritization als bewusst gestaltete AI-Copilot-Flächen mit eigener visueller Identität, klarer Beschriftung und Trust-Hinweis.
- KI-Flächen dürfen nicht wie normale Formularboxen aussehen, aber auch nicht verspielt oder futuristisch überladen sein.
- Lade-, Fehler- und Ergebniszustände behalten feste Flächen und klare Statushierarchie.
- Keine echten AI-, n8n-, Gmail- oder Sheets-Aufrufe während der Umsetzung oder Prüfung.

### 4. Filter und Tabellen wie ein echtes Arbeitswerkzeug

- Filter als kompakte Toolbar mit klaren Labels, sinnvoller Gruppierung und optionaler sichtbarer Ergebnisanzahl.
- Portfolio- und Feedbacktabelle erhalten stärkere Hierarchie: ruhiger Sticky Header, klarer Accountname, bessere Zeilenabstände, dezente Hover-/Selected-Zustände und saubere Risk-Signale.
- Keine dekorative Farbübersättigung. Rot/Orange/Grün bleiben semantischen Zuständen vorbehalten.
- Tabellen bleiben auf kleinen Breiten ausschließlich innerhalb ihres Containers horizontal scrollbar; niemals das Dokument.
- Der aktuelle Sortierzustand muss sichtbar und für Tastaturbedienung verständlich bleiben.

### 5. Ansichten individuell, aber aus einem System

- **Matrix:** Visualisierung als fokussierte Analysefläche mit klarer Steuerleiste, lesbarer Legende und hochwertiger Detailkarte.
- **Map:** Karte in einer klar gerahmten Analysefläche; Legende und Detailkarte konsistent zur Matrix.
- **Team:** CSM-Karten mit Initialen-/Avatar-Platzhalter, klarer Portfolioverantwortung, Risiko-/ARR-Hierarchie und eindeutiger textlicher Aktion. Keine echten Profilbilder.
- **Feedback:** Top-Themen und kommerzielle Relevanz schneller erfassbar; die Tabelle bleibt die fachliche Quelle.
- **Trust:** Inhalt und Roadmap aus Sprint 04 unverändert lassen, aber visuell vollständig in den neuen Product Shell integrieren.

### 6. Typografie, Tiefe und Details

- Systemfont-Stack beibehalten; Hierarchie über Größe, Gewicht, Zeilenhöhe und Kontrast schaffen.
- Weniger gleichförmige „Card-Suppe“: Flächen bewusst unterscheiden, Schatten sparsam und hochwertig einsetzen, Border nur wo sie Orientierung schafft.
- Konsistente Radien, Abstände, Buttons, Inputs, Badges und Fokuszustände.
- Inline-SVG-Icons sind erlaubt, wenn sie klein, einheitlich und zugänglich sind. Keine neue Icon-Bibliothek, keine Emojis als Hauptnavigation und keine externen Assets.
- Keine auffälligen Animationen. `prefers-reduced-motion` weiter respektieren.

## Responsive Ziel

- Verbindlich prüfen: 1440 × 900, 1024 × 768 und 390 × 844.
- Bei 1440 × 900 müssen Product Shell, Portfolio-Seitenkopf, KPI-Leiste, AI-Copilot und der Beginn der Tabelle ohne übermäßige Leerflächen sichtbar sein.
- Bei 1024 × 768 darf nichts gequetscht wirken.
- Bei 390 × 844 müssen Navigation, KPI-Karten, Filter, Copilot und Tabellen-Scroll verständlich bleiben.
- Kein unbeabsichtigtes horizontales Dokument-Scrolling.

## Fachliche und technische Grenzen

- Bestehende Berechnungen, Daten, Sortierungen, Filter, Matrix-/Map-Logik, KI-Payloads, Review-/Approval-Logik und das Referenzdatum nicht ändern.
- Der bestandene Approval-Vertragsfix aus Sprint 05 bleibt unverändert.
- Keine neue Bibliothek, kein Frameworkwechsel, kein MCP und keine Supabase-Arbeit.
- Keine n8n-Konfiguration in diesem Auftrag. Der separat gefundene Team-Prioritization-Fehler wird anschließend kontrolliert im n8n-Workflow behoben.
- Keine echten AI-/Workflow-Aufrufe.
- Kein Commit und kein Push.

## Akzeptanzkriterien

- Der Hub hat eine klar erkennbare, eigenständige visuelle Identität und wirkt nicht mehr wie ein generischer Tabellenprototyp.
- Die erste Portfolio-Ansicht erzählt innerhalb weniger Sekunden Risiko, Geschäftswert, KI-Unterstützung und menschliche Kontrolle.
- Alle sechs Ansichten wirken wie Teile eines Produkts, behalten aber eine sinnvolle eigene Informationshierarchie.
- Product Shell, KPI-Leiste, AI-Flächen, Filter, Tabellen, Karten und Zustände sind sichtbar aus einem konsistenten Designsystem.
- 1440 × 900, 1024 × 768 und 390 × 844 bestehen ohne Dokument-Overflow.
- Bestehende Interaktionen und alle Tests bleiben grün.

## Vorgehen für Claude Code

1. Lies vollständig `docs/10_project_control.md`, `docs/tasks/2026-08-13_sprint-05_product-ui-demo-hardening.md`, diese Datei, `index.html`, `src/app.js` und `src/styles.css`.
2. Prüfe den Git-Status nur lesend. Alle bestehenden Änderungen gehören der Product Ownerin.
3. Erstelle vor der Umsetzung eine knappe interne Designhierarchie für Product Shell, Portfolio und die fünf weiteren Ansichten. Keine lange Analyse-Datei anlegen.
4. Setze das Zielbild primär in `index.html`, `src/app.js` und `src/styles.css` um. Fachliche Logik bleibt unverändert.
5. Prüfe Syntax, `npm test`, `git diff --check` und den manuellen Klicktest aus Sprint 05.
6. Prüfe die drei verbindlichen Viewports und dokumentiere je Viewport kurz das Ergebnis.
7. Führe keine echten AI-/n8n-/Gmail-/Sheets-Aktionen aus.
8. Erstelle keinen Commit und keinen Push.
9. Abschlussbericht: geänderte Dateien, zentrale Designentscheidungen, Testergebnis, Viewports, Klicktest, bekannte Restrisiken.

## Co-PO-Review — Nachbesserungsrunde 1

Der Stand vom 2026-08-14 besteht Syntaxprüfung, `git diff --check`, 70/70 Tests, Desktop/Laptop und die bestehenden Klickpfade. Die Executive-Gestaltung ist grundsätzlich erreicht. Vor der finalen PO-Abnahme sind ausschließlich folgende drei Punkte zu korrigieren:

1. **Mobile Navy-Navigation wirklich kompakt machen.** Bei 390 × 844 behält `.sidebar` durch die Desktop-Eigenschaft `flex: 0 0 var(--sidebar-width)` eine Höhe von ungefähr 240 px und erzeugt unter der Navigation eine große leere Navy-Fläche. Im mobilen Breakpoint Flex-Basis bzw. `flex` explizit auf den inhaltsabhängigen Wert zurücksetzen. Die Navigation soll direkt nach der zweiten Buttonzeile enden.
2. **Mobile KPI-Leiste als 2 × 2-Raster.** Die vier vorhandenen KPI-Flächen bei 390 px in zwei Spalten darstellen, sofern die bestehenden Werte ohne Überlauf lesbar bleiben. Lange Werte wie `$1,764,000` dürfen kleiner skalieren oder umbrechen, aber nicht abgeschnitten werden. Kein einspaltiger, unnötig langer KPI-Stapel.
3. **Freigegebene Attention Queue ergänzen.** Auf der Portfolio-Startansicht neben dem AI-Copilot bei breiten Desktopansichten eine kompakte Liste der drei dringendsten Accounts anzeigen. Ausschließlich die bestehende deterministische Funktion `computePriorityScore` und vorhandene Accountdaten verwenden; keine neue Formel, keine KI und keine erfundenen Inhalte. Je Account genügen Name, wichtigste vorhandene Dringlichkeitsinformation und Score/Risikostatus. Bei 1024 px und Mobile darf die Queue unter den Copilot umbrechen. Ein Klick darf wie die vorhandenen Matrix-/Team-Pfade die Accountdetails im Portfolio öffnen.

Danach erneut 1440 × 900, 1024 × 768 und 390 × 844 prüfen. Bestehende UI, Fachlogik, API-/n8n-Dateien und Tests außerhalb dieser drei Punkte nicht verändern. Keine echten AI-/n8n-Aktionen, kein Commit und kein Push.

## PO-Review — Nachbesserungsrunde 2

Die Product Ownerin hat das Portfolio-Promptfeld als zu kurz bewertet. Ursache: Das Feld verwendet `.portfolio-ask-input`, während die bestehende Flex-Breitenregel nur `.ai-ask-input` erfasst.

Verbindliche Korrektur:

- Der Portfolio-AI-Copilot nutzt auf Desktop die volle verfügbare Breite des Arbeitsbereichs.
- Das Promptfeld wächst innerhalb seiner Zeile bis zum rechts ausgerichteten `Ask`-Button (`flex: 1` und `min-width: 0`); der Button bleibt inhaltlich breit und schrumpft nicht.
- Die deterministische Attention Queue bleibt erhalten und wird darunter als kompakte, gut lesbare Zeile bzw. Fläche angeordnet; ihre Funktion und Berechnung bleiben unverändert.
- Bei 390 × 844 dürfen Eingabefeld und Button untereinander angeordnet werden, jeweils ohne Überlauf und mit gutem Touchziel.
- Lade-, Fehler- und Antwortzustände bleiben innerhalb des vollbreiten Copilot-Panels stabil.
- Ausschließlich `src/app.js` und/oder `src/styles.css` ändern. Keine API-, n8n-, Daten- oder Fachlogikänderung.
- Danach Syntax, vollständige Testsuite, `git diff --check` sowie 1440 × 900, 1024 × 768 und 390 × 844 prüfen. Keine echten AI-/n8n-Aufrufe, kein Commit und kein Push.

## Co-PO-Abnahme 2026-08-14

- Portfolio-AI-Copilot nutzt die volle verfügbare Arbeitsbreite; Attention Queue steht als eigene Fläche darunter.
- `.portfolio-ask-input` wächst mit `flex: 1` und `min-width: 0`; der Ask-Button schrumpft nicht. Im mobilen Layout stehen Eingabe und Button ohne Überlauf untereinander.
- Syntaxprüfungen für `src/app.js`, `src/ai.js` und `api/analyze.js` erfolgreich.
- Vollständige Testsuite: 70/70 bestanden.
- `git diff --check` ohne Fehler; ausschließlich bestehende Zeilenende-Hinweise.
- Account Insight und Team-Priorisierung wurden nach separater n8n-Stabilisierung erfolgreich Ende-zu-Ende geprüft.
- Keine Commits und kein Push.
