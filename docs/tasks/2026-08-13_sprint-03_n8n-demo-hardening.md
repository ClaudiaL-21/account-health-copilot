# Sprint 03 — n8n Demo Hardening

Status: von der Product Ownerin freigegeben  
Datum: 2026-08-13  
Umsetzung: Claude Code  
Empfohlenes Modell: Sonnet 5, Aufwand Hoch

## Ziel

Die vorhandene n8n-Integration wird für die Präsentation sicherer, nachvollziehbarer und stabiler. Die App authentifiziert beide n8n-Aufrufe, prüft die Antwortverträge und bricht bei Konfigurations- oder Zeitüberschreitungsfehlern kontrolliert ab. Für die aktiven n8n-Workflows entsteht eine genaue, geheimnisfreie Umsetzungsanleitung; reale Workflows, Google Sheets und Gmail werden in diesem Sprint nicht automatisch verändert oder ausgelöst.

Der Sprint ist Demo-Hardening, kein vollständiges Production- oder Pilot-Hardening. Idempotenz, Rollenmodell, Datenschutzkonzept, Monitoring und persistente Audit-Daten bleiben ein späterer Pilot-Readiness-Sprint.

## Verbindlicher Scope

### 1. Bestehenden Stand schützen

- Arbeite ausschließlich in `account-health-copilot`.
- Bestehende uncommitted Änderungen gehören der Nutzerin. Nichts zurücksetzen, überschreiben oder bereinigen.
- Keine Commits und kein Push.
- Kein MCP, keine Supabase-Arbeit und kein Framework-Wechsel.
- Keine echten OpenAI-, n8n-, Gmail- oder Google-Sheets-Aufrufe.
- `.env` nicht ausgeben und keine geheimen Werte in Quellcode, Tests, Logs oder Dokumentation übernehmen.
- Die zwei Exportdateien unter `C:\Users\mail\Downloads\` dürfen nur lesend als Referenz verwendet werden. Sie dürfen wegen Webhook-Pfaden, Workflow-/Tabellenkennungen und E-Mail-Adresse nicht unverändert ins Repository kopiert werden.

### 2. Gemeinsame Webhook-Authentifizierung in der App

Führe die Umgebungsvariable `N8N_WEBHOOK_SECRET` ein.

- `api/analyze.js` und `api/approve-action.js` senden bei n8n-Aufrufen zusätzlich den Header `x-cs-ai-hub-secret` mit diesem Wert.
- Der geheime Wert darf niemals geloggt oder an den Browser zurückgegeben werden.
- Ist eine n8n-Webhook-URL konfiguriert, aber `N8N_WEBHOOK_SECRET` fehlt, darf kein externer Request stattfinden. Liefere einen klaren, aber geheimnisfreien Konfigurationsfehler.
- Der bestehende Approval-Fallback bleibt erhalten: Ist gar keine Approval-Webhook-URL konfiguriert, wird weiterhin nur lokal protokolliert und erfolgreich mit `workflowConnected: false` geantwortet.
- Ergänze ausschließlich Platzhalter und Erläuterungen in `.env.example`; keine echten Werte.

### 3. Kontrollierte Timeouts und Antwortverträge

- Ergänze ein angemessenes Timeout für den Analyse-Webhook und ein kürzeres Timeout für den Approval-Webhook. Verwende keine automatische Wiederholung des Approval-Requests, weil das ohne Idempotenz doppelte Nebenwirkungen erzeugen kann.
- Fehler nach außen müssen kurz und demo-tauglich bleiben; URLs, Response-Inhalte mit sensiblen Daten und Secrets dürfen nicht offengelegt werden.
- Der Analyse-Webhook muss ein JSON-Objekt mit einem nichtleeren Feld `text` liefern. `text` muss der von der App erwartete JSON-Text sein. Ungültige oder leere Antworten werden kontrolliert abgelehnt.
- Die bestehenden fachlichen Server-Guardrails aus Sprint 01 und die Human-Review-Prüfungen aus Sprint 02 bleiben unverändert wirksam.
- Keine stillen Erfolgsantworten, wenn ein konfigurierter n8n-Workflow nicht erreicht wurde.

### 4. n8n-Hardening-Runbook erstellen

Erstelle `docs/11_n8n_hardening_runbook.md`. Das Dokument muss für eine nichttechnische Product Ownerin als genaue Klick- und Prüfanleitung verständlich sein und darf keine echten URLs, Pfade, IDs, E-Mail-Adressen oder Credential-Werte enthalten.

Das Runbook beschreibt verbindlich:

#### Workflow A — AI Analysis

- Webhook auf Header Authentication stellen und ein n8n Header-Auth-Credential mit Headername `x-cs-ai-hub-secret` verwenden.
- Mapping beibehalten: User Message aus `body.user`, System Message aus `body.system`.
- `body.maxTokens` tatsächlich verwenden und auf maximal 1200 begrenzen; ungültige Werte erhalten einen sicheren Standardwert.
- `gpt-5-mini` für diesen Sprint beibehalten.
- Den derzeit inkonsistenten Zustand beheben: `Require Specific Output Format`/`hasOutputParser` darf nicht aktiviert bleiben, wenn kein Parser verbunden ist.
- Weil derselbe Webhook vier unterschiedliche Antwortformen bedient, für diesen Sprint im OpenAI-Chat-Model den verfügbaren JSON-Object-/JSON-Response-Modus verwenden und die konkrete Schema-Prüfung weiterhin in der App belassen. Keinen einzelnen, fachlich falschen Fix-Schema-Parser erzwingen.
- Die Webhook-Antwort robust als `{ "text": "<JSON-Text>" }` zurückgeben — unabhängig davon, ob der vorherige Knoten intern einen String oder ein Objekt liefert. Keine doppelte JSON-Kodierung.
- Einen manuellen Negativtest für fehlende/falsche Authentifizierung und ungültigen Modelloutput beschreiben.

#### Workflow B — Human Approval

- Dieselbe Header Authentication verwenden.
- Vor Google Sheets und Gmail zwingend prüfen: `reviewedByHuman === true`, bekannte Kategorie, nichtleere Pflichtfelder und maximale Textlängen von 500 Zeichen. Ungültige Requests müssen vor jeder Nebenwirkung enden.
- Google Sheets um `reviewedByHuman` und `approvedAt` ergänzen und beide Felder abbilden.
- Gmail bleibt eine interne Benachrichtigung an die bereits konfigurierte interne Demo-Adresse; keine Kundenkommunikation.
- Betreff und Nachricht müssen deutlich sagen, dass die Aktion vom CSM geprüft und freigegeben wurde. Keine Behauptung, die KI habe die Aktion automatisch ausgeführt.
- Erfolg erst zurückgeben, wenn Tabellenprotokollierung und interne Nachricht erfolgreich waren.
- Keine automatische Workflow-Wiederholung aktivieren. Das noch bestehende Duplikatrisiko bei manueller Wiederholung ausdrücklich dokumentieren.
- Keine Empfängeradresse oder Sheet-ID in das Runbook schreiben.

#### Aktivierung und sicherer Rollout

- Erst Änderungen speichern, dann mit rein synthetischen Daten je einen kontrollierten Testlauf durchführen, Ergebnisse pro Knoten prüfen und erst danach veröffentlichen/aktivieren.
- Vor dem Test klar darauf hinweisen, dass Approval eine echte interne E-Mail und einen echten Sheet-Eintrag erzeugt.
- Einen Demo-Fallback beschreiben: Approval-Webhook-URL entfernen, damit die App nur lokal protokolliert; für AI den vorhandenen Mock-Modus verwenden.
- Rollback-Schritte auf die zuvor gespeicherte Workflow-Version beschreiben.

### 5. Dokumentation aktualisieren

- `docs/06_n8n_integration.md` an den neuen Authentifizierungsvertrag anpassen.
- Im Approval-Payload `reviewedByHuman` ergänzen.
- Klarstellen, dass die Roh-Exports nicht ins Repository gehören, solange sie nicht von Webhook-Pfaden, IDs, URLs und personenbezogenen Angaben bereinigt wurden.
- Nur bei echtem Bedarf weitere bestehende Dokumente minimal anpassen.

### 6. Tests

Ergänze fokussierte Tests, mindestens für:

- Analyse-Aufruf sendet den Auth-Header, ohne dessen Wert im Testbericht auszugeben.
- Approval-Aufruf sendet den Auth-Header und weiterhin exakt die vom CSM geprüften Werte plus `reviewedByHuman: true`.
- Konfigurierte Webhook-URL ohne Secret führt zu keinem Request.
- Nicht konfigurierte Approval-URL behält den lokalen Fallback.
- Leere oder falsche Analyse-Antwort wird abgelehnt.
- Timeout wird kontrolliert behandelt.
- Approval wird nicht automatisch wiederholt.
- Alle vorhandenen Sprint-01- und Sprint-02-Tests bleiben grün.

Tests dürfen nur lokale Stubs oder lokale Dummy-Server verwenden. Vor Modulimporten müssen relevante Umgebungsvariablen gezielt gesetzt beziehungsweise entfernt werden, damit eine lokale `.env` niemals versehentlich echte Webhooks aktiviert.

## Nicht im Scope

- aktive n8n-Workflows automatisch bearbeiten oder veröffentlichen
- echte Webhook-, OpenAI-, Gmail- oder Google-Sheets-Aufrufe
- vollständige Idempotenz oder `approvalId`
- Datenbank, Supabase, MCP, React oder anderes Framework
- Rollen-/Rechtesystem, SSO, DSGVO-Konzept oder produktives Monitoring
- Modellwechsel oder umfassendes Prompt-Redesign
- visuelles UI-Redesign

## Abnahmekriterien

- Beide n8n-Aufrufe verwenden denselben geheimen Header serverseitig.
- Bei URL ohne Secret erfolgt kein externer Request.
- Timeouts und fehlerhafte Analyseantworten werden kontrolliert behandelt.
- Approval besitzt keine automatische Retry-Logik.
- `.env.example`, Integrationsdokumentation und Runbook sind konsistent.
- Das Runbook enthält konkrete n8n-Schritte, aber keinerlei echte Geheimnisse oder identifizierende Exportdaten.
- Automatiktests und Syntaxprüfungen bestehen.
- Kein echter externer Aufruf wurde ausgeführt.
- Keine Änderungen außerhalb des Scopes, kein Commit, kein Push.

## Abschlussbericht von Claude

Am Ende ausschließlich kurz berichten:

1. geänderte und neu erstellte Dateien,
2. umgesetzte Sicherheits- und Stabilitätsmaßnahmen,
3. ausgeführte Prüfungen mit Ergebnissen,
4. Bestätigung, dass keine externen Aufrufe, Commits oder Pushes erfolgten,
5. offene Restrisiken, insbesondere manuelle n8n-Umsetzung und fehlende Idempotenz,
6. genaue nächste Handlung für Product Ownerin und Co-PO.

Nach dem Bericht stoppen. Keine n8n-Änderung, kein Commit, kein Push und kein Folgesprint ohne neue ausdrückliche Freigabe.

## Co-PO-Review — Korrekturrunde 1 (2026-08-13)

Ergebnis: noch nicht freigabefähig. Die Grundlösung ist richtig aufgebaut; 34/34 Tests und alle Syntaxprüfungen bestehen. Der lokale UI-Negativtest ohne Secret blieb stabil und löste keinen n8n-Aufruf aus. Vor der Freigabe sind folgende Punkte innerhalb des bestehenden Sprint-Scope zu korrigieren:

1. **Mode-spezifische AI-Antwortvalidierung ergänzen.** Ein nichtleeres `text` mit syntaktisch gültigem JSON reicht nicht. Validiere nach dem Parsen die tatsächlich erwartete Form für `account-insight`, `ask`, `portfolio-ask` und `team-priority`. Pflichttexte müssen nichtleer sein, Enums müssen stimmen und Next-Best-Action-Texte müssen die bestehenden Längenregeln einhalten. Beim Team-Resultat müssen Anzahl, Reihenfolge und `accountId` exakt den deterministisch vorgegebenen Accounts entsprechen; anderenfalls kontrolliert ablehnen, damit eine Modell-Umordnung nie Inhalte dem falschen Kunden zuordnet.
2. **Keine n8n-Response-Bodies in Fehler oder Logs übernehmen.** Bei einem Nicht-2xx-Status nur Statuscode und einen festen, geheimnisfreien Fehlergrund verwenden. Ergänze einen Test mit einem sensiblen Marker im Dummy-Response-Body und beweise, dass dieser weder Browserantwort noch `console.error` erreicht.
3. **Timeout-Konfiguration validieren.** Nur endliche, positive Werte in einem vernünftigen Bereich akzeptieren; negative Werte, `Infinity`, NaN und extreme Werte müssen auf sichere Defaults beziehungsweise eine dokumentierte Obergrenze fallen. Tests weiter mit kurzen lokalen Zeitwerten ermöglichen.
4. **Runbook-Tokenausdruck korrigieren.** Der aktuelle Ausdruck begrenzt negative Werte nicht. Verwende eine Prüfung auf endliche positive Zahl, Ganzzahlbildung und Obergrenze 1200; bei ungültiger Eingabe Standard 600.
5. **Approval-Validierung im Runbook vervollständigen.** Vor Nebenwirkungen zusätzlich die nichtleeren serverseitigen Pflichtfelder `accountId`, `accountName`, `csmName` und `approvedAt` prüfen; `approvedAt` muss ein plausibles Datum sein. `rationale` darf entsprechend dem App-Vertrag leer sein, bleibt aber auf 500 Zeichen begrenzt.
6. **Neustart-Hinweis ergänzen.** Nach Änderung von `.env` muss die lokale App neu gestartet werden. Das gilt auch für Secret-Einrichtung und Demo-Fallback.

Ergänze fokussierte Regressionstests für diese Fälle. Keine aktiven n8n-Workflows oder externen Systeme aufrufen. Danach gesamte Testsuite, Syntaxprüfungen und `git diff --check` ausführen und mit aktualisiertem Kurzbericht stoppen.

## Co-PO-Review — Korrekturrunde 2 (2026-08-13)

Ergebnis der ersten Korrekturrunde: Sicherheitsbereinigung und Dokumentation sind korrekt, 58/58 Tests sowie Syntax- und Diff-Prüfungen bestehen. Vor der Freigabe bleiben exakt zwei kleine Vertragskorrekturen:

1. Im Modus `team-priority` muss `synthesis` pro Account ein nichtleerer String sein und `nextBestAction` zwingend vorhanden sowie vollständig gültig sein. `null` oder `undefined` darf hier nicht akzeptiert werden, weil Prompt und Produktversprechen für jeden priorisierten Account genau eine Handlung verlangen. Ersetze den Test, der `null` derzeit ausdrücklich akzeptiert, durch Negativtests für leere `synthesis` sowie fehlende beziehungsweise `null` gesetzte `nextBestAction`.
2. `resolveTimeoutMs` muss zusätzlich eine dokumentierte sinnvolle Untergrenze und ganzzahlige Millisekunden erzwingen. Werte unter der Untergrenze fallen auf den sicheren Default zurück; gültige Dezimalwerte werden kontrolliert in ganze Millisekunden umgewandelt. Der lokale Testwert 150 ms muss weiterhin zulässig bleiben. Ergänze Tests für einen positiven, aber zu kleinen Wert sowie einen Dezimalwert.

Keine weiteren fachlichen oder technischen Änderungen vornehmen. Danach vollständige Testsuite, Syntaxprüfungen und `git diff --check` ausführen und mit kurzem Abschlussbericht stoppen.

## Technische Abnahme (2026-08-13)

Die Korrekturrunde 2 ist vollständig umgesetzt. Ergebnis der unabhängigen Abnahme: 63/63 Automatiktests bestanden, alle Syntaxprüfungen bestanden, `git diff --check` ohne Fehler, keine sensiblen Muster in den neuen Integrationsdateien und Dokumenten sowie erfolgreicher lokaler UI-Fallbacktest ohne externen Workflow-Aufruf. Co-PO-Empfehlung: Sprint 03 freigeben. Die manuellen n8n-Schritte aus `docs/11_n8n_hardening_runbook.md` bleiben der nächste kontrollierte operative Schritt.

PO-Freigabe erteilt am 2026-08-13.
