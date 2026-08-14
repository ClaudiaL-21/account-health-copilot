# Sprint 04 — Trust & Governance UI

Status: Umsetzung, Co-PO-Review und finale PO-Freigabe am 2026-08-13 abgeschlossen.

## Ziel

Der Customer Success AI Hub erhält eine eigenständige, präsentationsfähige Ansicht, die ohne technische Vorkenntnisse erklärt, wie aus Kundensignalen nachvollziehbare Prioritäten und kontrollierte Aktionen werden. Die Ansicht stärkt Vertrauen, grenzt aktive Funktionen von Roadmap-Themen ab und macht die Zusammenarbeit zwischen deterministischer Logik, KI und Mensch sichtbar.

## Modell und Aufwand

- Modell: Claude Sonnet
- Aufwand/Reasoning: Hoch
- Grund: Navigation, Informationsarchitektur, UX-Texte, responsive Gestaltung und bestehendes Designsystem müssen konsistent zusammengeführt werden.

## Verbindlicher Scope

1. Ergänze in `index.html` einen sechsten Navigationspunkt `Trust`.
2. Ergänze in `src/app.js` den View `trust` und eine Renderfunktion für eine rein lokale, statische Trust-&-Governance-Ansicht.
3. Blende die Portfoliofilter in den Views `team` und `trust` aus; alle bestehenden Views und Filter bleiben ansonsten unverändert.
4. Baue die neue Ansicht aus folgenden Bereichen:
   - kompakter Einstieg mit dem Leitgedanken `Human-led AI, explainable by design`;
   - Prozessdarstellung: `Customer signals` → `Rule-based scores` → `AI explanation` → `Human review` → `Logged action`;
   - klare Verantwortungsaufteilung in drei Karten: `Calculated by rules`, `AI-assisted`, `Human-controlled`;
   - sichtbare Guardrails und Grenzen;
   - kleiner Roadmap-Ausblick mit `EBR / QBR Prep` als `Next` und Datenintegrationen bzw. read-only connectors als `Later`.
5. Nutze in `src/styles.css` das bestehende Navy-/Teal-System. Gewünscht ist eine moderne, ruhige Bento-/Kartenstruktur mit klarer Hierarchie, großzügigem Weißraum und guter Scanbarkeit.
6. Verwende für das feste Demo-Referenzdatum keine zweite unabhängige Konstante. Exportiere in `src/scoring.js` eine geeignete unveränderliche Referenz (`2026-08-10`) und nutze sie sowohl für die bestehende Berechnung als auch für die Anzeige.

## Verbindliche Aussagen in der UI

- Alle Accounts und Kundendaten sind vollständig fiktiv.
- Health Scores, Rankings und Risk-/Expansion-Kategorien werden deterministisch berechnet.
- KI erzeugt Erklärungen, Zusammenfassungen, Antworten und Handlungsvorschläge; sie entscheidet keine Kundenzahl eigenständig.
- `Evidence Confidence` beschreibt Abdeckung, Aktualität und Vielfalt der Evidenz — nicht die Wahrscheinlichkeit, dass die KI recht hat.
- High-Risk-Accounts erhalten serverseitig keine Growth-Aktion.
- Kundenwirksame Aktionen werden vor dem Versand von einem Menschen geprüft und können bearbeitet werden.
- Freigegebene Aktionen werden über einen authentifizierten Workflow protokolliert; fehlgeschlagene Aktionen werden nicht automatisch erneut versendet.
- Die Demo ist ein Snapshot mit festem Referenzdatum und keine produktive Churn-Prognose.
- Roadmap-Inhalte müssen deutlich als noch nicht aktiv gekennzeichnet sein.

## Bewusst nicht im Scope

- keine neue KI-Funktion und kein zusätzlicher API-Aufruf;
- keine SWOT- oder EBR-Generierung in diesem Sprint;
- kein MCP, keine Supabase-Migration, keine neue Datenintegration;
- kein Framework- oder Komponentenbibliothekswechsel;
- keine Änderungen an n8n, API-Endpunkten oder Approval-Verhalten;
- keine Verwendung oder Nachbildung von Planhat-Screenshots, Logos, Kundenlogos, Texten oder Markenbegriffen;
- keine neuen Pakete und keine externen Bildassets.

## UX-/Designanforderungen

- Die Seite muss wie ein Teil des bestehenden Produkts wirken, nicht wie eine Präsentationsfolie oder Dokumentationsseite.
- Inhalt primär auf Englisch, passend zur vorhandenen Produktoberfläche.
- Kurze Texte; Details über Mikrocopy, Badges und kompakte Karten statt langer Absätze.
- Desktop bei ca. 1440 px und Mobile bei ca. 390 px ohne horizontales Scrollen prüfen.
- Bestehende Fokuszustände erhalten bzw. für neue interaktive Elemente sichtbar machen.
- Keine dekorativen Animationen, die von der Demo ablenken; `prefers-reduced-motion` respektieren, falls Bewegung eingesetzt wird.

## Akzeptanzkriterien

- `Trust` ist per Navigation erreichbar, korrekt aktiv markiert und ohne Reload wieder verlassbar.
- In `Trust` sind keine Portfoliofilter sichtbar; beim Wechsel zurück erscheinen sie wieder korrekt.
- Alle fünf Prozessschritte sowie Regeln/KI/Mensch sind auf Desktop und Mobile verständlich.
- Das Referenzdatum wird aus derselben Quelle wie die Berechnungslogik angezeigt.
- Keine Aussage suggeriert Autonomie, echte Kundendaten, produktive Vorhersage oder bereits vorhandene Roadmap-Funktionen.
- Keine bestehende Ansicht, Berechnung, KI-Funktion oder Freigabe wird funktional verändert.
- `npm test` ist vollständig grün.
- Abschlussbericht nennt geänderte Dateien, Testergebnis, visuell geprüfte Breiten und bekannte Restrisiken.

## Vorgehen für Claude Code

1. Lies vor Änderungen vollständig `docs/10_project_control.md`, diese Sprintdatei, `index.html`, `src/app.js`, `src/styles.css` und `src/scoring.js`.
2. Prüfe den Git-Status nur lesend und bewahre alle vorhandenen Änderungen.
3. Setze ausschließlich diesen Scope um.
4. Prüfe Syntax/Tests und die UI bei Desktop- und Mobilebreite.
5. Erstelle keinen Commit und keinen Push.
6. Beende mit einem kurzen Abschlussbericht; starte keinen Folgesprint.
