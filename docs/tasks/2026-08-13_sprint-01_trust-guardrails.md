# Arbeitsauftrag — Sprint 01: Trust Guardrails

Status: umgesetzt und technisch reviewt; wartet auf Freigabe durch die Product Ownerin  
Datum: 2026-08-13  
Ziel: Zwei serverseitig überprüfbare Vertrauensregeln schließen, ohne neue Produktbreite aufzubauen.

## Ausgangslage

- Growth-Empfehlungen für High-Risk-Accounts werden derzeit nur über den Prompt verhindert.
- `confidence` ist derzeit eine freie Selbsteinschätzung des LLM.
- Beide Punkte widersprechen dem Produktprinzip, dass entscheidungsrelevante Regeln deterministisch und nachvollziehbar sein sollen.
- Bestehende uncommitted Änderungen gehören der Product Ownerin und dürfen nicht zurückgesetzt oder großflächig überschrieben werden.

## Scope

### 1. Harte Expansion-Guardrail

Nach jedem AI-Ergebnis muss der Server die Next Best Action validieren — unabhängig vom Provider (`anthropic`, `openai`, `n8n`) und auch im Mock-Modus.

- Für `riskCategory === "high"` ist `nextBestAction.category === "growth"` unzulässig.
- Bei einem Verstoß muss die komplette Next Best Action durch eine deterministische Risk-Mitigation-Fallback-Aktion ersetzt werden. Nur das Category-Feld umzubenennen ist nicht ausreichend, weil Handlung und Begründung sonst weiterhin Wachstum empfehlen könnten.
- Die Fallback-Aktion soll den wichtigsten berechneten Risikotreiber und, soweit vorhanden, den Champion verwenden, aber keine neuen Fakten erfinden.
- Die Regel muss für `account-insight` und jede Position in `team-priority` gelten.
- Low- und Medium-Risk-Ergebnisse werden durch diese Guardrail nicht automatisch umkategorisiert.

### 2. Messbare Evidence Confidence

`confidence` wird nach dem AI-Call serverseitig aus den vorhandenen `freeTextArtifacts` abgeleitet und überschreibt jede LLM-Angabe. Sie bewertet Datenbasis/Evidenz, nicht Modellrichtigkeit.

Verwende eine nachvollziehbare 5-Punkte-Regel gegen das bestehende feste Referenzdatum `2026-08-10`:

- Menge: mindestens 4 Artefakte = 2 Punkte; 2–3 = 1; 0–1 = 0
- Aktualität des jüngsten Artefakts: höchstens 30 Tage alt = 2 Punkte; 31–60 Tage = 1; älter oder nicht vorhanden = 0
- Quellenvielfalt: mindestens 2 unterschiedliche `type`-Werte = 1 Punkt; sonst 0
- Level: 4–5 Punkte = `high`; 2–3 = `medium`; 0–1 = `low`

Die API liefert weiterhin das bestehende Objekt `{ level, reason }`. `reason` soll immer eine kurze, sachliche Erklärung mit Artefaktzahl, Alter des jüngsten Artefakts und Zahl der Quellentypen enthalten. Die UI soll klar von „Evidence confidence“ bzw. „Evidence strength“ sprechen; keine Prozentwahrscheinlichkeit anzeigen.

Die freie Confidence-Anweisung und das Confidence-Feld im erwarteten LLM-Antwortschema sind zu entfernen, sofern sie nach der serverseitigen Ableitung nicht mehr benötigt werden.

### 3. Kleine automatisierte Verifikation

Nutze bevorzugt den eingebauten Node-Test-Runner oder eine ebenso schlanke, dependency-freie Lösung. Prüfe mindestens:

- High Risk + AI-Growth-Ergebnis wird vollständig in Risk Mitigation umgewandelt.
- Eine bereits zulässige High-Risk-Risk-Mitigation bleibt inhaltlich erhalten.
- Low Risk + Growth bleibt erhalten.
- Die Confidence-Schwellen 0–1, 2–3 und 4–5 liefern `low`, `medium`, `high`.
- Mock- und Team-Priority-Pfad passieren dieselbe Guardrail.

Falls dafür reine Hilfsfunktionen exportiert werden, darf das Laufzeitverhalten des Handlers nicht verändert werden.

## Nicht im Scope

- Governance-/Trust-Seite oder neuer Navigationstab
- Review-/Edit-Schritt vor Approval
- Quellenzitate in AI-Narrativen
- Ladefortschritt, Namensbereinigung oder sichtbares Referenzdatum
- Änderungen an Scoring-Gewichten oder Priority-Reihenfolge
- Supabase, MCP, React/Framework, n8n-Umbau
- echte AI-Aufrufe, Commit oder Push

## Voraussichtlich betroffene Dateien

- `api/analyze.js`
- `src/app.js` nur für die präzisere Confidence-Bezeichnung
- eine neue kleine Testdatei und gegebenenfalls `package.json` für ein Test-Script

`src/scoring.js`, `index.html`, `src/styles.css` und der Datensatz sollen nur geändert werden, wenn Claude vorab einen konkreten, zwingenden Grund meldet.

## Akzeptanzkriterien

1. Kein High-Risk-Account kann über `account-insight` oder `team-priority` eine Growth-Aktion an den Client liefern.
2. Die Guardrail gilt identisch für alle Provider und Mock AI.
3. Confidence stammt ausschließlich aus der definierten 5-Punkte-Regel und wird im UI als Evidenzstärke erklärt.
4. Bestehende API-Formate bleiben clientkompatibel.
5. Automatisierte Tests und Syntaxchecks sind grün.
6. Portfolio, Account Insight und Team Priority funktionieren im Mock-Modus weiterhin.
7. Keine Dateien außerhalb des Scopes wurden unbegründet verändert; keine bestehenden Änderungen wurden zurückgesetzt.

## Abschlussbericht von Claude

Nach der Umsetzung stoppen und knapp berichten:

1. geänderte Dateien,
2. umgesetzte Regeln,
3. ausgeführte Tests mit Ergebnis,
4. manuell geprüfte UI-Abläufe,
5. Abweichungen oder Restrisiken,
6. ausdrückliche Bestätigung: kein echter AI-Call, kein Commit, kein Push.

Noch keinen Folgesprint beginnen.

## Review durch Co-PO/Projektleitung — 2026-08-13

- 14 automatisierte Tests erfolgreich, 0 Fehler
- Syntaxchecks der betroffenen Kernmodule erfolgreich
- `account-insight` und `team-priority` unabhängig über die lokale API mit `MOCK_AI=true` geprüft
- High-Risk-Ergebnisse liefern in beiden Pfaden ausschließlich `risk_mitigation`
- Evidence Confidence wird sichtbar mit Artefaktzahl, Aktualität und Quellenvielfalt erklärt
- UI-Darstellung im Browser geprüft; keine Browserfehler oder Warnungen
- Kleines Restrisiko: Mock- und Team-Priority-Pfad sind im Testbestand nicht als vollständige Integrationstests automatisiert; die unabhängige Laufzeitprüfung war erfolgreich
- Keine Freigabeblocker gefunden; Empfehlung: Sprint 01 fachlich freigeben
