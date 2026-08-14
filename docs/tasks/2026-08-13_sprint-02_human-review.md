# Arbeitsauftrag — Sprint 02: Human Review vor Workflow-Handoff

Status: umgesetzt, technisch abgenommen und von der Product Ownerin am 2026-08-13 freigegeben  
Datum: 2026-08-13  
Ziel: Aus der heutigen Ein-Klick-Übernahme einen sichtbaren, echten Human-in-the-Loop-Prozess machen, ohne den n8n-Workflow umzubauen.

## Ausgangslage

- `renderApprovalControl()` sendet die AI-generierte Next Best Action derzeit direkt über `submitApproval()`.
- Die CSM kann Handlung, Kategorie und Begründung vor dem Handoff weder prüfen noch bearbeiten.
- Derselbe Approval-Control wird in Account Insight und Team Priority verwendet; der neue Ablauf muss deshalb an beiden Stellen identisch funktionieren.
- Sprint 01 ist fachlich freigegeben. Dessen Guardrail- und Confidence-Logik darf nicht geschwächt werden.
- Bestehende uncommitted Änderungen gehören der Product Ownerin und dürfen nicht zurückgesetzt oder großflächig überschrieben werden.

## Scope

### 1. Zweistufiger Inline-Review-Ablauf

Ersetze den sofort sendenden Button durch einen wiederverwendbaren Inline-Ablauf innerhalb der bestehenden Next-Best-Action-Box:

1. Ausgangszustand: Hinweis `Human review required` und Button `Review action`.
2. Nach Klick öffnet sich direkt in der Box ein kompaktes Review-Formular — kein Modal.
3. Formularfelder:
   - Kategorie als Select: `Risk mitigation` oder `Growth`
   - Handlung als verpflichtendes mehrzeiliges Textfeld
   - Begründung als mehrzeiliges Textfeld
4. Das Formular ist mit der AI-Empfehlung vorausgefüllt und klar als von der CSM prüf- und bearbeitbare Fassung gekennzeichnet.
5. Aktionen: `Cancel` und `Confirm & Send to Workflow`.
6. Erst der zweite Button darf `/api/approve-action` aufrufen.
7. Leere/nur aus Leerzeichen bestehende Handlung verhindert das Senden und zeigt einen verständlichen Inline-Hinweis.
8. Pending-, Fehler- und Erfolgszustand bleiben sichtbar. Nach einem Fehler muss die bearbeitete Fassung erhalten bleiben und erneut gesendet werden können.

Der Ablauf muss sowohl im Account Insight als auch in jeder Team-Priority-Karte funktionieren. Status darf nicht zwischen zwei Accounts vermischt werden.

### 2. Klare Verantwortungsdarstellung

- Die UI muss deutlich machen: Die AI hat vorgeschlagen; die CSM prüft und bestätigt die tatsächlich versendete Fassung.
- Nach Erfolg anzeigen, ob die Aktion an n8n gesendet oder nur lokal geloggt wurde.
- Die bestehende AI-Disclaimer-Sprache bleibt erhalten.
- Bestehende Empfehlungstexte sollen beim Öffnen des Review-Formulars nicht verschwinden; Original und bearbeitbare Fassung müssen nachvollziehbar bleiben.

### 3. Serverseitige Validierung des finalen Handoffs

`api/approve-action.js` darf sich nicht allein auf den Client verlassen:

- `accountId` muss existieren.
- `action` muss nach `trim()` nicht leer sein und maximal 500 Zeichen haben.
- `rationale` maximal 500 Zeichen.
- `category` muss exakt `risk_mitigation` oder `growth` sein; keine stille Umdeutung ungültiger Werte.
- Berechne serverseitig den Health Score des Accounts. Für High Risk ist `growth` auch im Approval-Endpunkt unzulässig; antworte mit Status 400 und verständlicher Fehlermeldung.
- Der an n8n oder ins Log übergebene Payload enthält die getrimmte, von der CSM bestätigte Fassung.
- Ergänze ein Feld wie `reviewedByHuman: true`, damit der Human-in-the-Loop im Demo-Payload sichtbar ist. Keine erfundene Nutzeridentität ergänzen.

### 4. Schlanke automatisierte Tests

Nutze den vorhandenen Node-Test-Runner. Prüfe mindestens:

- leere Handlung wird abgelehnt,
- zu lange Handlung/Begründung wird abgelehnt,
- unbekannte Kategorie wird abgelehnt,
- High Risk + Growth wird im Approval-Endpunkt abgelehnt,
- gültige Risk-Mitigation-Fassung wird getrimmt und akzeptiert,
- gültige Growth-Fassung für einen Low-Risk-Account wird akzeptiert,
- `reviewedByHuman: true` ist im finalen Payload vorhanden.

Die Tests dürfen keinen n8n-Webhook und keinen echten AI-Provider aufrufen.

## UX-/Design-Leitplanken

- Kompakt und ruhig; das Formular soll wie eine natürliche zweite Ebene der vorhandenen NBA-Box wirken.
- Saubere Labels oberhalb der Felder, sichtbarer Fokuszustand und ausreichend große Klickflächen.
- Keine Browser-Dialoge (`alert`, `confirm`, `prompt`).
- Buttons klar hierarchisieren: `Confirm & Send` primär, `Cancel` sekundär.
- Textfelder mobil und auf schmalen Ansichten ohne horizontales Überlaufen.
- Bestehende visuelle Sprache und Variablen aus `src/styles.css` verwenden.

## Nicht im Scope

- Governance-/Trust-Seite oder neuer Navigationstab
- Quellenzitate und AI-Feedbackschleife
- Änderungen am n8n-Workflow oder dessen Aktivierung
- Persistente Approval-Historie/Datenbank
- Authentifizierung oder echte CSM-Identität
- Scoring-, Confidence- oder Priority-Änderungen
- Ladefortschritt der AI, Namensbereinigung oder Referenzdatum
- Supabase, MCP, React/Framework
- echte AI-Aufrufe, Commit oder Push

## Voraussichtlich betroffene Dateien

- `src/app.js`
- `src/styles.css`
- `api/approve-action.js`
- vorhandene oder neue Tests unter `tests/`

`src/ai.js` nur ändern, wenn die vorhandene Übergabe des bearbeiteten NBA-Objekts nicht ausreicht. `api/analyze.js`, `src/scoring.js`, `index.html` und der Datensatz sind nicht Teil dieses Sprints.

## Akzeptanzkriterien

1. Kein Klick im Ausgangszustand sendet sofort an den Workflow.
2. Vor jedem Handoff sieht und bearbeitet die CSM Kategorie, Handlung und Begründung.
3. Account Insight und Team Priority nutzen denselben funktionsfähigen Review-Ablauf.
4. Client- und Servervalidierung verhindern leere oder ungültige Payloads.
5. High-Risk-Growth kann auch durch direkte API-Nutzung nicht versendet werden.
6. Bearbeitete Werte — nicht unbemerkt die AI-Originalwerte — erreichen den finalen Payload.
7. Erfolgs-, Fehler- und Abbruchzustände sind verständlich und visuell stabil.
8. Automatisierte Tests und Syntaxchecks sind grün; bestehende Sprint-01-Tests bleiben grün.
9. Manuelle Browserprüfung im Mock-Modus ohne echten AI- oder n8n-Aufruf ist dokumentiert.
10. Keine unbegründeten Änderungen außerhalb des Scopes; kein Commit und kein Push.

## Sichere manuelle Prüfung

Für die UI-Prüfung den lokalen Server explizit mit `MOCK_AI=true` und ohne wirksame `N8N_APPROVAL_WEBHOOK_URL` starten. Prüfe einen Account-Insight-Ablauf und eine Team-Priority-Karte einschließlich Bearbeiten, Cancel, Validierungsfehler und erfolgreichem lokalem Log.

## Abschlussbericht von Claude

Nach Umsetzung und Tests stoppen und knapp berichten:

1. geänderte Dateien,
2. umgesetzter Review-Ablauf,
3. serverseitige Validierungen,
4. ausgeführte Tests mit Ergebnis,
5. manuell geprüfte UI-Abläufe,
6. Abweichungen oder Restrisiken,
7. ausdrückliche Bestätigung: kein echter AI-/n8n-Aufruf, kein Commit, kein Push.

Noch keinen Folgesprint beginnen.

## Co-PO-Review — 2026-08-13

Erfolgreich geprüft:

- 23 automatisierte Tests, 0 Fehler; Syntaxchecks grün
- zweistufiger Review-Ablauf in Account Insight und Team Priority
- Bearbeiten, Cancel, leere Handlung, Fehlerzustand mit erhaltenem Draft und erfolgreicher Handoff
- serverseitige High-Risk-Growth-Sperre
- lokaler Testempfänger erhielt exakt die bearbeitete Fassung und `reviewedByHuman: true`
- keine Browserfehler oder Warnungen

Vor Freigabe zu korrigieren:

1. Die Review-Textfelder haben kein `maxlength="500"` und keine clientseitige Prüfung für mehr als 500 Zeichen. Die API schützt korrekt, aber Akzeptanzkriterium 4 verlangt Client- und Servervalidierung.
2. In `tests/human-review.test.js` wird `N8N_APPROVAL_WEBHOOK_URL` erst nach dem statischen Import von `api/approve-action.js` gelöscht. Da das Modul die URL beim Import in einer Konstante erfasst, garantiert dieser Testaufbau bei einer extern gesetzten Umgebungsvariable nicht, dass kein Webhook aufgerufen wird. Environment zuerst bereinigen und Handler danach dynamisch importieren oder eine gleichwertig sichere Lösung verwenden.

Nur diese zwei Punkte nachbessern, Tests/Syntaxchecks erneut ausführen und stoppen. Kein Folgesprint, kein echter AI-/n8n-Aufruf, kein Commit, kein Push.

### Nachprüfung der Korrekturen — 2026-08-13

- `maxlength="500"`, Zeichenzähler und clientseitige Längenprüfung für beide Textfelder vorhanden
- Überlange, per Testautomation gesetzte Eingabe wird vor dem API-Aufruf mit verständlicher Meldung blockiert
- Test importiert den Approval-Handler erst nach Entfernen der Webhook-Umgebungsvariable
- zusätzlicher Sicherheitstest mit extern gesetzter URL auf einen geschlossenen lokalen Port erfolgreich; kein Webhook-Aufruf
- gesamter Testbestand: 23 erfolgreich, 0 Fehler; Syntaxchecks grün
- sichtbare Browserprüfung erfolgreich; keine Browserfehler oder Warnungen
- Keine Freigabeblocker; Empfehlung: Sprint 02 fachlich freigeben
