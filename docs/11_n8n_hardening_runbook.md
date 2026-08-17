# n8n Hardening Runbook — Sprint 03

Status: Am 2026-08-13 manuell in n8n umgesetzt und veröffentlicht. Beide aktiven Webhooks verwenden dasselbe Header-Credential wie die lokale App. Der Analyse-Workflow wurde erfolgreich Ende-zu-Ende getestet; der Approval-Workflow wurde wegen seiner echten Gmail-/Sheets-Nebenwirkungen nur per sicherem Auth-Negativtest geprüft.

## Nachtrag 2026-08-14 — Demo-Betriebsstand

- Der Analyse-Workflow wurde erneut veröffentlicht. Das feste Ausgabelimit des OpenAI-Chat-Model-Knotens beträgt für die Präsentationsdemo **2.400 Tokens**.
- Grund: 600 und anschließend 1.400 Tokens schnitten die JSON-Antwort der Team-Priorisierung mit fünf Accounts ab. Die App verwarf diese unvollständige Antwort korrekterweise als `AI call failed`.
- Kontrollierte End-to-End-Tests waren danach erfolgreich für **Account Insight** und **Team-Priorisierung mit fünf Accounts**.
- Für die lokale Demo muss `npm run dev:local` in einem Prozess mit ausgehendem Netzwerkzugriff laufen. Ist der Webhook von diesem Prozess aus nicht erreichbar, entsteht keine n8n-Ausführung und die App zeigt den kontrollierten Fehlerzustand.
- Die weiter unten beschriebene dynamische `body.maxTokens`-Begrenzung ist eine spätere Kosten-/Architekturverbesserung. Für die Präsentation bleibt bewusst die getestete feste Obergrenze von 2.400 Tokens aktiv.

## Nachtrag 2026-08-17 — Sprint 15 (QBR Copilot): Max Tokens auf 3.500 angehoben

- **Aktueller, verbindlicher Wert: Analyse-Workflow → OpenAI Chat Model → Max Tokens = 3.500.** Der oben dokumentierte Wert 2.400 aus Sprint 03 ist damit überholt — dieses Limit darf nicht versehentlich wieder auf 2.400 zurückgesetzt werden.
- Grund: Sprint 15 führte den `qbr-draft`-Mode ein (12-Section-QBR-Antwort, App sendet `maxTokens: 2800` — mit Abstand der größte Wert aller Modes, siehe `api/analyze.js`). Das feste 2.400-Token-Limit im Node lag darunter und begrenzte die Antwort trotzdem, unabhängig vom gesendeten `body.maxTokens`.
- Beobachteter Fehler: Ein realer QBR-Testcall auf ACC-01 (Alpenbank AG) brach mit `502 Bad Gateway` ab, Ursache serverseitig protokolliert als `Unterminated string in JSON at position 10295` — die Modellantwort wurde mitten im JSON abgeschnitten. Ein sofortiger Retry funktionierte, da diesmal offenbar unter dem Limit geblieben wurde.
- Fix: Max Tokens im selben Node auf **3.500** erhöht (mit Sicherheitsmarge über den von der App gesendeten 2.800, da QBR-Antwortlänge je nach Account variiert).
- Verifiziert: Erneuter realer QBR-Call auf ACC-01 → `200 OK` beim ersten Versuch, vollständiges JSON, alle Sensitive-Guardrails (`healthTrends`/`risks`/`previousInterventions` → `customerSafeDefault: null`) weiterhin korrekt.
- Bewusst **nicht** auf unbegrenzt gestellt: Die App validiert ohnehin serverseitig max. 1.500 Zeichen pro Feld (`validateQbrDraftShape` in `api/analyze.js`), ein höheres Limit brächte keinen Nutzen, nur unvorhersehbare Kosten/Latenz.
- Der Approval-Workflow (Workflow B) ist von dieser Änderung nicht betroffen — er ruft serverseitig kein LLM auf (`api/approve-action.js` reicht nur die bereits vom CSM geprüfte Aktion durch).

## Umsetzungsprotokoll 2026-08-13

- Analyse-Workflow: Header Auth aktiv; Agent-Prompt-Zuordnung geprüft; unverbundene Output-Parser-Pflicht deaktiviert; `gpt-5-mini` mit Reasoning Effort `Low`, maximal 600 Tokens und JSON-Objekt-Antwort; robuste String-Antwort an die App.
- Analyse-Test: lokale App auf Port 5180 → geschützter n8n-Webhook → OpenAI → sichtbare Portfolioantwort erfolgreich.
- Approval-Workflow: Header Auth aktiv; Google-Sheets-Spalten, Gmail-Empfänger, Betreff, Nachricht und Webhook-Antwort geprüft; vorhandene Reihenfolge unverändert. Google-Sheets-OAuth wurde nach einem kontrolliert fehlgeschlagenen Ersttest erneut verbunden.
- Approval-Sicherheitstest: Aufruf ohne Secret wurde mit HTTP 403 abgelehnt; dadurch keine Sheet-Zeile und keine E-Mail.
- Approval-End-to-End-Test: klar gekennzeichneter Testdatensatz lief nach dem Google-Reconnect in 2,649 Sekunden erfolgreich durch Webhook, Google Sheets, Gmail und Response.
- Neues Restrisiko aus dem Test: Bei einem internen n8n-Knotenfehler kann der Webhook dennoch HTTP 200 liefern. Die App kann dann fälschlich `sent` anzeigen. Vor einem externen Piloten sollte der Approval-Antwortvertrag serverseitig validiert oder n8n so konfiguriert werden, dass interne Fehler sicher als Nicht-2xx zurückgegeben werden.
- Bewusste Demo-Entscheidung: Kein zusätzlicher IF-/Code-Knoten kurz vor der Präsentation. Die serverseitige Payload-Validierung plus Header Auth bilden die aktive Schutzschicht; eine zusätzliche n8n-interne Validierung bleibt Pilot-Readiness-Arbeit.
- Lokale Laufzeit: `N8N_ANALYZE_TIMEOUT_MS=60000` als Sicherheitsreserve; das Secret verbleibt ausschließlich in `.env` und n8n Credentials.

Dieses Dokument enthält bewusst **keine echten URLs, Webhook-Pfade, Workflow-/Tabellen-/Credential-IDs oder E-Mail-Adressen**. Wo eine konkrete Eingabe nötig ist, steht ein Platzhalter.

## Vorbereitung (einmalig)

1. Erzeuge einen zufälligen, ausreichend langen Geheimtext (z. B. über einen Passwort-Generator, mindestens 32 Zeichen). Das ist der Wert für `N8N_WEBHOOK_SECRET`.
2. Trage diesen Wert in eure lokale `.env`-Datei ein: `N8N_WEBHOOK_SECRET=<euer Geheimtext>`. Niemals in ein Dokument, einen Chat oder das Repository kopieren.
3. Diesen **exakt gleichen** Wert benutzt ihr gleich in n8n als Credential-Wert — einmal pro Workflow (oder als eine gemeinsame Credential, die beide Workflows verwenden, wenn sie im selben n8n-Workspace liegen).
4. **Wichtig — Neustart nötig:** Die lokale App liest `.env` nur beim Start ein. Nach jeder Änderung an `.env` (Secret eintragen, Webhook-URLs ändern, Demo-Fallback aktivieren/deaktivieren) muss `npm run dev:local` neu gestartet werden, sonst wirkt die Änderung nicht.

Grundprinzip für beide Workflows: **erst speichern, dann mit Fantasiedaten testen, erst danach veröffentlichen/aktivieren.**

---

## Workflow A — AI Analysis

Knoten in der bestehenden Struktur: **Webhook** → **AI Agent** → (verbunden: **OpenAI Chat Model**) → **Respond to Webhook**.

### 1. Authentifizierung setzen
- Webhook-Knoten öffnen → Feld **Authentication** von "None" auf **Header Auth** umstellen.
- Neues Credential anlegen: Name frei wählbar (z. B. "CS AI Hub Shared Secret"), **Header Name** exakt `x-cs-ai-hub-secret`, **Header Value** = der Geheimtext aus der Vorbereitung.
- Speichern.

### 2. Mapping prüfen (unverändert lassen)
- Im **AI Agent**-Knoten: User Message muss weiterhin aus `body.user` kommen, System Message aus `body.system`. Beides ist bereits so konfiguriert — nur gegenprüfen, nichts ändern.

### 3. `maxTokens` tatsächlich verwenden, auf 1200 begrenzen
- Aktuell wird der von der App mitgeschickte Wert `body.maxTokens` nirgends im Workflow verwendet.
- Im **OpenAI Chat Model**-Knoten unter Options das Feld für die maximale Tokenanzahl auf einen Ausdruck setzen, der den gesendeten Wert begrenzt und bei ungültigem/fehlendem Wert einen sicheren Standardwert nutzt.
- **Wichtig:** Eine einfache `Math.min(Number(...) || 600, 1200)`-Prüfung reicht nicht — sie fängt einen negativen Wert nicht ab (z. B. `-5` bleibt `-5`, weil `-5` in JavaScript ein "wahrer" Wert ist und die `||`-Prüfung dadurch nicht greift). Stattdessen explizit auf eine endliche, positive Zahl prüfen, auf eine Ganzzahl runden und erst dann begrenzen:
  ```
  {{ (() => { const n = Number($json.body.maxTokens); return (Number.isFinite(n) && n > 0) ? Math.min(Math.floor(n), 1200) : 600; })() }}
  ```
  (600 als sicherer Standard bei fehlendem, negativem, nicht-numerischem oder unendlichem Wert; 1200 als harte Obergrenze — passend zum größten von der App verwendeten Wert.)

### 4. Modell beibehalten
- `gpt-5-mini` bleibt für diesen Sprint das konfigurierte Modell im **OpenAI Chat Model**-Knoten. Keine Änderung nötig, nur bestätigen.

### 5. Inkonsistenten Parser-Zustand beheben
- Im **AI Agent**-Knoten ist aktuell die Option **"Require Specific Output Format"** aktiviert, obwohl **kein** Output-Parser-Knoten angeschlossen ist. Das ist der im Sprint-Auftrag genannte inkonsistente Zustand.
- Diese Option **deaktivieren** (ausschalten), da kein Parser angeschlossen ist und für diesen Sprint auch keiner angeschlossen werden soll (der Webhook bedient vier unterschiedliche Antwortformen — ein einzelner starrer Parser wäre fachlich falsch). Die konkrete Schema-Prüfung bleibt bewusst in der App (`api/analyze.js`).

### 6. JSON-Modus im Sprach-Modell nutzen
- Im **OpenAI Chat Model**-Knoten unter Options den verfügbaren JSON-Object-/JSON-Response-Modus aktivieren (die Option, die das Modell anweist, valides JSON statt Freitext zu liefern). Das erhöht die Antwortqualität, ohne ein starres Schema zu erzwingen.

### 7. Antwort robust und ohne Doppel-Encoding zurückgeben
- Aktuell liefert **Respond to Webhook** die Antwort über einen Ausdruck, der `JSON.stringify(...)` auf das Ergebnis des AI Agent anwendet. Das funktioniert nur zuverlässig, wenn dieses Ergebnis bereits ein Text (String) ist — liefert der AI Agent stattdessen intern ein Objekt, entsteht eine ungültige bzw. doppelt kodierte Antwort.
- Robusterer Ausdruck für das **Response Body**-Feld (voller Ausdruck, nicht nur ein eingebetzter Platzhalter), der beide Fälle sauber behandelt und niemals doppelt kodiert:
  ```
  {{ { text: (typeof $json.output === 'string') ? $json.output : JSON.stringify($json.output) } }}
  ```
- Damit ist `text` immer genau der reine JSON-Text, den die App erwartet — unabhängig davon, ob der Agent intern einen String oder ein Objekt liefert.

### 8. Manueller Negativtest (vor Aktivierung durchführen)
- **Fehlende/falsche Authentifizierung:** Webhook einmal ohne den Header und einmal mit falschem Wert aufrufen (z. B. mit Postman, curl oder einem beliebigen HTTP-Testwerkzeug, nicht über die App). Erwartet: n8n antwortet mit einem Authentifizierungsfehler, der Workflow läuft nicht durch.
- **Ungültiger Modell-Output:** Einen Testlauf mit einer Frage durchführen, die das Modell voraussichtlich nicht als sauberes JSON beantwortet (z. B. sehr kurzer/leerer Prompt), und prüfen, dass die App diesen Fall kontrolliert abfängt (in der App erscheint "AI insights unavailable", kein Absturz).

---

## Workflow B — Human Approval

Knoten in der bestehenden Struktur: **Webhook** → **Append row in sheet** (Google Sheets) → **Send a message** (Gmail) → **Respond to Webhook**.

### 1. Authentifizierung setzen
- Gleiches Vorgehen wie bei Workflow A: Webhook-Knoten auf **Header Auth** umstellen, Header-Name `x-cs-ai-hub-secret`, gleicher Geheimtext wie oben (Credential kann wiederverwendet werden).

### 2. Validierung vor jeder Nebenwirkung einbauen
- Direkt nach dem Webhook-Knoten und **vor** dem Sheets-Knoten einen Bedingungs-Knoten (z. B. ein "If"-Knoten) einfügen, der prüft:
  - `body.reviewedByHuman` ist exakt `true`
  - `body.category` ist eine bekannte Kategorie (aktuell: "risk_mitigation" oder "growth")
  - `body.action` ist nach Trimmen nicht leer und höchstens 500 Zeichen lang
  - `body.rationale` ist höchstens 500 Zeichen lang — dieses Feld darf laut App-Vertrag leer sein (die App verlangt dafür keinen Nichtleer-Check), nur die Längengrenze gilt
  - `body.accountId` ist nach Trimmen nicht leer
  - `body.accountName` ist nach Trimmen nicht leer
  - `body.csmName` ist nach Trimmen nicht leer
  - `body.approvedAt` ist ein plausibles Datum (lässt sich als gültiges Datum interpretieren, z. B. über eine Datums-Parse-Funktion; kein leerer oder offensichtlich unsinniger Wert)
- **Falsch-Zweig:** direkt zu einem eigenen **Respond to Webhook**-Knoten mit einem Fehlerstatus (z. B. 400) — dieser Zweig darf **niemals** Sheets oder Gmail erreichen.
- **Wahr-Zweig:** wie bisher weiter zu Sheets → Gmail → Erfolgsantwort.

### 3. Google Sheets um `reviewedByHuman` ergänzen
- Im **Append row in sheet**-Knoten ist die Spalte für `approvedAt` bereits vorhanden und abgebildet — nur gegenprüfen.
- Eine weitere Spalte für `reviewedByHuman` ergänzen (im Sheet eine neue Spalte anlegen, dann im Knoten als weiteres Feld mit dem Ausdruck für `body.reviewedByHuman` zuordnen).

### 4. Gmail-Text klarstellen
- **Send a message** bleibt eine interne Benachrichtigung an die bereits hinterlegte interne Demo-Adresse — keine Kundenkommunikation, keine Änderung des Empfängers.
- Betreff und Nachrichtentext so anpassen, dass eindeutig steht, dass die Aktion **von einer Customer Success Managerin geprüft und freigegeben** wurde (z. B. sinngemäß "reviewed and confirmed by a CSM"). Es darf an keiner Stelle stehen oder anklingen, dass die KI die Aktion automatisch ausgeführt hätte.
- **Nachtrag 2026-08-17 — Zeilenumbrüche im "Recommended Action"-Feld:** Seit der NBA-Prompt-Anpassung (mehrschrittige Next Best Actions mit `a)`/`b)`/`c)` auf echten Zeilenumbrüchen, siehe `SYSTEM_PROMPT` in `api/analyze.js`) enthält `body.action` bei mehrteiligen Empfehlungen echte `\n`-Zeichen. HTML ignoriert `\n` standardmäßig — im Gmail-HTML-Template deshalb im Feld für die Aktion
  ```
  {{ $json['Action (action)'] }}
  ```
  ersetzen durch
  ```
  {{ $json['Action (action)'].replace(/\n/g, '<br>') }}
  ```
  damit a)/b)/c) auch in der Mail auf eigenen Zeilen erscheinen. Reine n8n-Node-Änderung, kein Repo-Code betroffen.

### 5. Erfolg erst nach beiden Schritten
- Die Erfolgsantwort (`status: "sent"`) darf erst nach **beiden** Nebenwirkungen erfolgen — Sheet-Zeile geschrieben **und** interne Nachricht verschickt. Das entspricht der bestehenden Verkettung Sheets → Gmail → Antwort; nur sicherstellen, dass die neue Validierung aus Schritt 2 davor sitzt.

### 6. Keine automatische Wiederholung — Duplikatrisiko dokumentiert
- Keinen Knoten in diesem Workflow auf automatisches Wiederholen bei Fehler ("Retry On Fail") stellen.
- **Bekanntes, bewusst nicht gelöstes Restrisiko:** Schlägt ein Versuch teilweise fehl (z. B. Sheet-Zeile wurde geschrieben, aber die E-Mail schlägt fehl) und klickt die CSM in der App danach erneut auf "Confirm & Send", kann es zu einem doppelten Sheet-Eintrag und/oder einer doppelten E-Mail für dieselbe Freigabe kommen. Es gibt aktuell keine Absicherung dagegen (keine `approvalId`, kein Duplikat-Check) — das ist bewusst für einen späteren Pilot-Readiness-Sprint vorgesehen, nicht Teil dieses Sprints.

### 7. Keine identifizierenden Werte in diesem Dokument
- Empfängeradresse und Sheet-ID/-URL stehen bewusst nicht in diesem Runbook — sie stehen nur in eurer eigenen n8n-Konfiguration.

---

## Aktivierung und sicherer Rollout

1. **Erst speichern, nicht sofort aktivieren.** Änderungen an beiden Workflows speichern, aber den Aktivierungsschalter noch nicht umlegen.
2. **Kontrollierter Testlauf mit rein synthetischen Daten.** Für jeden Workflow einen manuellen Testlauf über die n8n-eigene "Testlauf"-Funktion durchführen (nicht über die echte App, damit ihr die Eingabedaten voll unter Kontrolle habt) — zum Beispiel mit einem der fiktiven Testkonten aus `data/accounts.json` und klar als Test erkennbaren Texten (z. B. "TEST — bitte ignorieren" im Action-Feld beim Approval-Workflow).
3. **Ergebnis pro Knoten prüfen.** Im Ausführungsprotokoll jeden Knoten einzeln kontrollieren: korrekte Werte angekommen, kein Knoten mit Fehler.
4. **Wichtiger Hinweis vor dem Testlauf von Workflow B:** Ein Testlauf des Approval-Workflows erzeugt eine **echte interne E-Mail** und einen **echten Sheet-Eintrag** — es gibt keinen risikofreien "Trockenlauf"-Modus. Bewusst mit einem klar als Test erkennbaren Datensatz arbeiten und den Sheet-Eintrag danach bei Bedarf manuell wieder löschen.
5. **Erst danach veröffentlichen/aktivieren.**
6. **Demo-Fallback, falls n8n während der Präsentation nicht verfügbar sein soll:** In `.env` `N8N_APPROVAL_WEBHOOK_URL` entfernen (die App protokolliert Freigaben dann nur noch lokal, ohne echte Aktion) und für die KI-Analyse den vorhandenen `MOCK_AI=true`-Modus nutzen (keine echten OpenAI-Kosten, keine Abhängigkeit vom Analyse-Workflow). **Nach dieser Änderung die lokale App neu starten** (`.env` wird nur beim Start gelesen) — sonst greift der Fallback nicht.
7. **Rollback.** n8n legt bei jedem Speichern automatisch eine neue Version an. Über den Versionsverlauf im Workflow-Editor lässt sich die zuvor gespeicherte, bekannt funktionierende Version wiederherstellen, falls die neuen Änderungen ein Problem verursachen.
