# Antwort auf das Review "Customer Success AI Hub" (2026-08-13)

Status: Gegenprüfung und Einordnung des Reviews durch Claude (Implementierungs-Partner im Projekt). Richtet sich an ChatGPT als Co-Product-Owner sowie an die Projektleitung. Noch keine Code-Änderung — dies ist die konzeptionelle Reaktion, aus der als Nächstes priorisierte Umsetzungsschritte abgeleitet werden.

## 1. Einordnung

Das Review ist inhaltlich stark und fair — es bestätigt die bisherige Architektur-Richtung (deterministische Berechnung strikt getrennt von generativer KI, Human-in-the-Loop, Transparenz als Kernprinzip) und fordert zu Recht **Tiefe statt weiterer Breite**. Die Kernaussage des Reviews ("Nicht die KI entscheidet über den Kunden...") deckt sich vollständig mit dem im Projekt-Brief verankerten Verantwortungsprinzip.

Zwei Tatsachenbehauptungen im Review wurden vor dieser Antwort direkt im Code und im Datensatz nachgeprüft (nicht nur übernommen) — siehe Abschnitt 2.

## 2. Zwei Korrekturen

### P0-01 — "Interaktionen aus Oktober 2026, obwohl das Review am 13. August stattfand"

**Geprüft:** Vollständige Durchsuchung aller `freeTextArtifacts` (Kundennotizen, E-Mails, Chats) im Datensatz gegen das interne Referenzdatum `TODAY = 2026-08-10` (`src/scoring.js`).

**Befund:** Keine einzige Kundeninteraktion liegt in der Zukunft. Die vom Review beobachteten Oktober-Daten sind `nextQBRDate` und `nextRenewalDate` — das sind **absichtlich zukünftige** Planungstermine (nächste QBR, nächstes Renewal), kein Datenfehler.

**Was trotzdem bleibt:** Der zugrunde liegende Vorschlag (sichtbares Demo-Referenzdatum im UI) ist unabhängig davon sinnvoll, weil ohne sichtbares "Stand: TT.MM.JJJJ" jede relative Angabe ("83d", "in 54 Tagen") für einen unbeteiligten Betrachter nicht sofort einordenbar ist.

### P1-03 — "Sentiment wird als Risikotrajektorie-Schätzung getarnt präsentiert"

**Geprüft:** Code-Stelle `src/app.js` (Feedback-Tab-Rendering).

**Befund:** Es existiert bereits ein Disclaimer im UI: *"'Oldest Ask' and 'Sentiment' are estimated from each account's risk trajectory (a proxy, not a live satisfaction survey)"*. Der Punkt ist also nicht vollständig offen, wie im Review dargestellt.

**Präzisierung:** Der Disclaimer selbst ist ungenau. `featureRequestSentiment` ist **kein Live-Wert aus einer Risiko-Formel**, sondern ein fest hinterlegtes Feld pro fiktivem Account im synthetischen Datensatz (bei der Datengenerierung passend zum Risiko-Archetyp vergeben, nicht zur Laufzeit berechnet). Der Disclaimer-Text sollte präzisiert werden, nicht neu erfunden.

## 3. Status-Übersicht: bereits umgesetzt vs. offen

| Punkt aus dem Review | Status | Kommentar |
|---|---|---|
| 5. Customer Outcomes / Success Plan | ❌ Nicht vorhanden | Nur `valueMilestone` (Einzelwert), kein Ziel-vs-Ist-Tracking über Zeit. Größte strukturelle Lücke — braucht ein eigenes Datenmodell (siehe Abschnitt 5). |
| P0-01 Einheitliches Referenzdatum | ⚠️ Diagnose falsch, Empfehlung bleibt gültig | Siehe Korrektur oben. Sichtbares Demo-Datum ist trotzdem eine günstige Vertrauensmaßnahme. |
| P0-02 Echter Review-Schritt vor Approval | ❌ Nicht vorhanden | Aktuell Ein-Klick-Übernahme ("Approve & Send to Workflow"), kein Edit-/Review-Schritt davor. **Größte inhaltliche Lücke des Reviews, berechtigt.** |
| P0-03 Belege/Quellen an KI-Aussagen | ❌ Nicht vorhanden | Die KI bekommt Zitate mit Datum/Autor als Kontext, gibt sie aber nicht referenzierbar zurück. Technisch gut anschlussfähig an bestehende Prompt-Struktur. |
| P0-04 AI-Governance-Seite | ❌ Nicht vorhanden | Nur verstreute Disclaimer, keine zentrale Seite. Geringer Implementierungsaufwand, hoher Erzählwert für das KI-Manager-Narrativ. |
| P1-01 Expansion-Guardrails | ⚠️ Nur weich umgesetzt | System-Prompt bittet die KI, Growth-Empfehlungen nur bei positiven Signalen zu geben — das ist eine Empfehlung an die KI, keine harte Regel. Sollte serverseitig deterministisch erzwungen werden. |
| P1-02 Confidence aus Fakten statt LLM-Selbsteinschätzung | ❌ Nicht vorhanden | Aktuell reine LLM-Selbstauskunft ("high/medium/low" + Begründung, vom Modell frei gewählt). Fachlich der stärkste Einzelpunkt im Review — LLM-Selbstauskunft zu Konfidenz ist nachweislich nicht kalibriert. |
| P1-03 Sentiment-Naming | ✅ Teilweise vorhanden | Siehe Korrektur oben — Disclaimer existiert, Formulierung sollte präzisiert werden. |
| P1-04 KI-Feedbackschleife | ❌ Nicht vorhanden | Deckt sich mit einer bereits vor diesem Review identifizierten Lücke: keine Rückmeldung, ob eine Next Best Action tatsächlich wirksam war. |
| P1-05 Team-KI-Ladeverhalten | ⚠️ Teilweise | Fehler-Recovery ("Try Again") vorhanden, aber keine Fortschrittsanzeige während der 15-20s Wartezeit bei der Team-Priorisierung. |
| P2-01 Accessibility (Tabellenzeilen) | ❌ Nicht vorhanden | Zeilen sind klickbare `<tr>`-Elemente ohne Tastatursteuerung oder ARIA-Semantik. Zutreffend. |
| P2-02 Map als Phase-2 | — | Reine Priorisierungsfrage, kein technischer Befund. |
| P2-03 Gewichtetes ARR at Risk | ⚠️ Nur roh vorhanden | Aktuell Summen-ARR in High-Risk-Accounts pro CSM, keine nach Risiko/Renewal-Nähe gewichtete Kennzahl. |

## 4. Ergänzung, die im Review fehlt: bereits bestehende Priorisierungs-Architektur

Das Review führt "Team-Priorisierung" unter Abschnitt 7.2 als optionale Zusatzfunktion, nicht als Kernumfang. Das sollte nachgeschärft werden: seit dem Review-Zeitpunkt existiert bereits ein **zweistufiges Modell**, das genau das im Review geforderte Prinzip "KI entscheidet nicht, sie erklärt" strukturell umsetzt:

- Eine **deterministische Formel** (Risiko × ARR × Renewal-Nähe × Engagement-Recency) bestimmt die Rangfolge — die KI darf diese nicht verändern
- Die KI liefert ausschließlich Synthese + genau eine Next Best Action pro Account, gebunden an die vorgegebene Reihenfolge
- Ein zusätzliches, gerade erst getestetes Feature erkennt **portfolioweite Muster** (z. B. wiederkehrende Integrationsprobleme bei mehreren Accounts gleichzeitig) — das deckt sich mit der im Review unter 4.7 positiv erwähnten Beobachtung, ist aber bereits über Einzelbeobachtung hinaus strukturiert eingebaut.

Dieser Baustein sollte im Gesamtkonzept eher als Kernbeleg für "Trennung deterministischer Logik und generativer KI" (Review-Abschnitt 11) gewertet werden, nicht als Nice-to-have.

## 5. Vorschlag zur Priorisierung

Nicht alles gleichzeitig umsetzen. Vorschlag nach Aufwand/Wirkung:

**Stufe 1 — günstig, hoher Impact:**
1. Expansion-Guardrail hart erzwingen (P1-01)
2. Confidence aus messbaren Faktoren statt LLM-Selbstauskunft ableiten (P1-02)
3. AI-Governance-/Trust-Seite ergänzen (P0-04)

**Stufe 2 — mittlerer Aufwand, strukturell wichtig:**
4. Echter zweistufiger Review-Prozess vor Approval (P0-02)
5. Belege/Quellen an KI-Aussagen anbinden (P0-03)
6. KI-Feedbackschleife (P1-04)

**Stufe 3 — großer Aufwand, eigenes Architektur-Kapitel:**
7. Customer Outcomes / Success Plan (Review-Abschnitt 5) — setzt eine persistente Datenbank-Schicht voraus (aktuell in Planung, noch nicht umgesetzt), da Fortschritt über Zeit abgebildet werden muss, nicht nur ein statischer Wert.

## 6. Offene Fragen an ChatGPT als Co-Product-Owner

- Stimmt die Einschätzung überein, dass P0-02 (echter Review-Schritt vor Approval) die wichtigste einzelne Lücke ist, oder würdest du P1-02 (Confidence-Kalibrierung) höher gewichten?
- Wie viel Umsetzungstiefe ist für den Kurs-Piloten realistisch nötig — reicht eine sichtbare Governance-Seite mit dokumentierten Grenzen, oder wird eine messbare Evaluation (Abschnitt 8 des Reviews) erwartet?
- Ist Abschnitt 5 (Customer Outcomes/Success Plan) als eigenständiges Pilot-Kernstück zu sehen, oder als Ausblick für eine zweite Ausbaustufe nach dem Kurs?
