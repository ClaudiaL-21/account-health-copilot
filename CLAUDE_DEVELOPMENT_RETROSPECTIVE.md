# Entwicklungsretrospektive aus Sicht von Claude Code

**Projekt:** Customer Success AI Hub (a.k.a. "CS AI Signal Hub" / "CS AI Command Center")
**Repository:** `account-health-copilot` (lokal), verbunden mit `github.com/ClaudiaL-21/customer-success-ai-hub`
**Zeitraum laut Commit-Historie:** 2026-08-10 bis 2026-08-17 (8 Tage, 38 Commits auf `master`)
**Verfasst von:** Claude Code, als Implementierungsagent im Projekt
**Methodik:** Auswertung von Git-Historie (`git log`, `git show`), 13 Projektdokumenten in `docs/`, dem README, und dem Testverzeichnis. Keine vollständige Codebase-Analyse. Keine Code-Änderungen wurden für diese Retrospektive vorgenommen.

---

## 1. Executive Summary

Aus einer einzelnen, von einem persönlichen Networking-Projekt ("WARMPATH") adaptierten Scoring-Datei wurde in acht Tagen ein funktionsfähiger AI-Produktprototyp: eine Vanilla-JS-SPA mit deterministischer Scoring-Engine, einer generativen AI-Schicht (Anthropic/OpenAI, austauschbar), einem n8n-basierten Human-Approval-Workflow und einem 12-Section-QBR-Copiloten mit Customer-Safe-Review-Schicht. 173 automatisierte Tests laufen aktuell grün (Repository-verifiziert, siehe Abschnitt 15).

Das Projekt ist ein **Portfolio-Prototyp für ein KI-Manager-Zertifikat**, kein produktionsreifes SaaS-Produkt. Es nutzt ausschließlich fiktive Daten (35 Accounts, 6 CSMs), hat keine Datenbank (Supabase ist geplant, nicht gebaut) und macht ausdrücklich keine EU-AI-Act-Compliance-Aussage (siehe `docs/12_eu_ai_act_readiness.md`: "Keine Rechtsberatung und keine Compliance-Zertifizierung").

Das zentrale, wiederkehrende Muster der Zusammenarbeit war nicht "einmal beauftragen, fertiges Produkt erhalten", sondern ein enger Zyklus aus fachlicher Zielsetzung (Claudia) → strukturiertem Auftrag (ChatGPT/Work) → Implementierung und Selbstprüfung (Claude Code) → Review, teils in Form eines eigenständigen schriftlichen Reviews mit P0/P1/P2-Priorisierung → gezielter Nachschärfung. Sichtbarster Beleg dafür ist [`docs/07_response_to_chatgpt_review.md`](docs/07_response_to_chatgpt_review.md): eine faktenbasierte Gegenprüfung eines ChatGPT-Reviews durch Claude Code, inklusive zweier korrigierter Tatsachenbehauptungen und einer gemeinsam abgestimmten Umsetzungsreihenfolge.

Das zentrale Learning, das sich aus Commit-Historie und Dokumentation bestätigen lässt: **KI-gestützte Softwareentwicklung scheiterte hier nicht an Modellqualität, sondern wäre ohne explizites Kosten-, Kontext- und Scope-Management (kleinere Sprints, Sparmodus, klare Rollentrennung zwischen Planungs- und Implementierungswerkzeug) unkontrollierbar geworden.** Diese Aussage ist kontextbasiert aus der Rollenverteilung in den Dokumenten und der sichtbaren Verkleinerung der Commit-Scopes im Verlauf abgeleitet — nicht direkt durch Token-/Kosten-Logs verifiziert.

---

## 2. Rollen und Zusammenarbeitsmodell

Die im Auftrag beschriebene Rollenverteilung deckt sich mit der dokumentierten Evidenz und wird hier nur ergänzt, nicht korrigiert:

- **Claudia (Product Ownerin):** Fachliches Zielbild, Priorisierung, Freigaben. Repository-Evidenz dafür ist indirekt — z. B. trägt jeder Commit die Autorenidentität `ClaudiaL-21 <claudialiersch@googlemail.com>`, was zeigt, dass sämtliche Claude-Code-Arbeit über ihr lokales Git-Setup committet wurde (kein separater Bot-Account). Der Projekt-Brief (`docs/05_project_brief.md`) trägt ihre Handschrift als "verbindliche Fassung".
- **ChatGPT/Work (Co-PO/Projektleitung):** Am direktesten belegt durch `docs/07_response_to_chatgpt_review.md` — ein vollständiges, mit P0/P1/P2 priorisiertes Review vom 2026-08-13, das Claude Code anschließend faktisch gegengeprüft hat.
- **Claude Code (Implementierungsagent):** Belegt durch die Commit-Historie selbst sowie durch mehrere Dokumente, die explizit als Claude-Code-Statusberichte formatiert sind (`docs/09_developer_handover.md`: "Alle Aussagen unten wurden gegen den echten Code-/Repo-Zustand geprüft, nicht aus einer Chat-Historie übernommen").

Eine Ergänzung gegenüber der Auftragsbeschreibung: Aus `docs/07` geht hervor, dass Claude Code nicht nur Anforderungen umgesetzt, sondern aktiv **Tatsachenbehauptungen aus einem Review gegengeprüft und korrigiert** hat (Abschnitt 3), statt sie unkritisch zu übernehmen. Diese verifizierende Rolle geht über reine Implementierung hinaus und war für die Qualität der Zusammenarbeit sichtbar wichtig.

---

## 3. Wie ChatGPT/Work und Claude Code zusammengearbeitet haben

### Belegter Zyklus am konkreten Beispiel: das ChatGPT-Review vom 2026-08-13

1. **Ziel/Auftrag:** Ein umfassendes Review des bestehenden Prototyps wurde erstellt (Autor laut Dokument: ChatGPT als Co-PO), mit P0/P1/P2-priorisierten Punkten.
2. **Gegenprüfung durch Claude Code** (`docs/07`): Zwei Tatsachenbehauptungen wurden direkt am Code/Datensatz nachgeprüft, nicht übernommen:
   - **P0-01** ("Interaktionen aus Oktober 2026, obwohl Review im August stattfand") stellte sich als Fehldiagnose heraus — die Oktober-Daten waren absichtlich zukünftige Renewal-/QBR-Termine, keine Datenfehler. Die zugrunde liegende Empfehlung (sichtbares Referenzdatum im UI) blieb trotzdem gültig.
   - **P1-03** (Sentiment-Naming) wurde als teilweise bereits gelöst korrigiert — ein Disclaimer existierte schon im UI, war aber ungenau formuliert.
3. **Status-Tabelle mit 11 Punkten**, jeweils klassifiziert als umgesetzt/nicht vorhanden/teilweise, inklusive konkreter Code-Fundstellen (`src/app.js`, `api/analyze.js`).
4. **Gemeinsame Priorisierung in drei Stufen** (günstig/hoher Impact zuerst), mit expliziten offenen Rückfragen an ChatGPT als Co-PO am Ende des Dokuments.
5. **Umsetzung in Folge-Commits:** Die Stufe-1-Punkte aus `docs/07` (Expansion-Guardrail hart erzwingen, Confidence-Kalibrierung, Governance-Seite) lassen sich in der Commit-Historie ab `652ff17` ("Sprints 01-09: trust guardrails, human review, n8n hardening, EU AI Act readiness, presentation polish", 2026-08-14) wiederfinden — ein Tag nach dem Review.

Dieser eine dokumentierte Zyklus zeigt exemplarisch das Muster, das sich auch in der übrigen Commit-Struktur widerspiegelt: Sprints sind nach thematischen Häufungen benannt ("Sprint 14C: canonical customer AI context + review snapshot", "Sprint 2: AI enrichment layer"), nicht nach Kalenderwochen — ein Hinweis auf fokussierte, thematisch abgegrenzte Arbeitspakete statt eines einzigen Großauftrags.

### Weiteres Beispiel: LLM-Mathematik-Bug → serverseitige Vorberechnung (Abschnitt 6 unten)

Der Commit `566cefa` ("fix: harden portfolio summary numerical grounding") zeigt den vollen Zyklus: Ausgangslage (Prompt-Anweisung an die KI, keine Summen selbst zu bilden) → Problem (Anweisung allein reichte nicht) → Entscheidung (zusätzlich harte Vorberechnung in `scoring.js`) → Test (`portfolio-kpis.test.js`, `portfolio-summary.test.js` neu/erweitert) → Learning (im Code als Kommentar festgehalten, siehe Abschnitt 6).

### Grenze der Aussage

Wie ChatGPT/Work die Anforderungen *vor* der Übergabe an Claude Code intern strukturiert oder formuliert hat, ist aus diesem Repository nicht einsehbar (ChatGPT-Konversationen liegen außerhalb des Projektverzeichnisses). Die hier dokumentierten Zyklen sind auf das beschränkt, was in `docs/` und der Commit-Historie tatsächlich sichtbar ist.

---

## 4. Chronologische Produktentwicklung

Repository-verifiziert anhand `git log --reverse` und Commit-Inhalten. Die im Auftrag skizzierte Reihenfolge ("Portfolio/Health → AI Insight → Next Best Action → Human Review → n8n → Activity → Manager Intelligence → QBR Copilot → QBR Presentation") stimmt **im Kern**, muss aber präzisiert werden: Human Review kam in zwei Ausbaustufen (frühes Ein-Klick-Approve, später echter Review-Schritt vor Approval), und n8n kam vor dem "Activity"-Feature, nicht danach in einem separaten großen Sprung.

**2026-08-10 — Fundament**
- `3324e3b` Initial: Datensatz, KPI-Katalog, Build-Prompt
- `a3e3b0b` Sprint 1: deterministische Scoring-Engine + Portfolio/Team-Dashboard
- `caf0fdb` Sprint 2: AI-Enrichment-Layer via Anthropic API (Vercel serverless) — **hier entsteht die Kernarchitektur:** Score deterministisch, Insight generativ.
- `81576eb` Lokaler Mock-Modus, Standalone-Dev-Server, Security-Hardening
- `ccd3462` Bugfix: Health-Score-Richtung war invertiert ("höher = gesünder" stimmte nicht)
- `91aa2c9` Übersetzung UI/Mock/README auf Englisch
- `66b469c`, `773bc6c` 2x2 Health-vs-ARR-Matrix, Expansion-Score-Färbung

**2026-08-11 — Breite: Datensatz, Views, erste Guardrail-Vorstufen**
- Renewal-Radar-Matrix, HQ-Standorte, Adoption-Rate-Spalte, Map-Tab (später auf echtes OpenStreetMap/Leaflet umgestellt), Feedback-Tab
- `dc5dd8a` **"Fix P0 credibility bugs: score confusion, team priority bias, status text"** — ein früher, für das Projekt wichtiger Commit: Glaubwürdigkeitsfehler wurden explizit als P0 benannt und behoben, nicht nur als kosmetisch abgetan.
- Rebranding zu "CS AI Signal Hub", eigenes Logo/Favicon
- `146d358` **Von Multi-Item-Empfehlungen zu genau einer kategorisierten Next Best Action** — eine bewusste Vereinfachung/Verschärfung, kein Feature-Zuwachs.
- `a8470b8` Value-Milestone-Feld (positive Momente, nicht nur Risiko)
- `6328994` **n8n-Integration: AI-as-Provider und Human-Approval-Handoff** — n8n kam also bereits am zweiten Projekttag, deutlich früher als der Auftrag suggeriert.
- `7a39517` "Mark all 6 project brief gaps as closed" — Meilenstein-Commit, in dem der ursprüngliche Brief als vollständig abgearbeitet markiert wird.

**2026-08-14 bis 2026-08-15 — größere, gebündelte Sprints**
- `652ff17` "Sprints 01-09: trust guardrails, human review, n8n hardening, EU AI Act readiness, presentation polish" — ein einzelner Commit, der laut Titel neun thematische Sprints bündelt. Dies ist der Punkt, an dem Human Review von einem einfachen Approve-Button zu einem gehärteten Workflow ausgebaut wurde, begleitet von `docs/11_n8n_hardening_runbook.md` und `docs/12_eu_ai_act_readiness.md`.
- `ca3db98` "Sprints 10-14B: demo hardening and portfolio intelligence"

**2026-08-17 — QBR-Woche (dichteste Entwicklungsphase, 7 Commits an einem Tag)**
- `518bac9` Sprint 14C: kanonischer Customer-AI-Kontext + Review-Snapshot
- `54bc14c` **feat: AI QBR Copilot mit Human-Review-Guardrails** (185 Zeilen `api/analyze.js`, 133 Zeilen neue Tests `qbr-draft.test.js`)
- `cae0136` feat: Portfolio Manager Intelligence
- `c9ad5e6` feat: Account Activity Feed
- `7772c6f` chore: expliziter Opt-in für externe Aktionen erforderlich
- `cdfa956` **fix: QBR Customer Review und Preview-Sicherheit gehärtet** (68 neue Zeilen `qbr-preview.test.js`)
- `566cefa` **fix: Portfolio-Summary numerische Grounding gehärtet**
- `0434544` **Phase 3: Brand-Redesign, QBR-Workspace-Tabs, Executive Drill-down, Text-Politur** — dies ist der im Auftrag genannte "Phase-3-Checkpoint" (siehe Abschnitt 15).

**Einordnung des Musters "Feature → sofortiger Härtungs-Commit":** Auffällig ist, dass die letzten vier QBR/Portfolio-Commits paarweise auftreten — ein `feat`-Commit, gefolgt kurz danach von einem `fix: harden ...`-Commit für dasselbe Feature. Das deutet auf einen Review-Schritt zwischen Bau und Freigabe hin, nicht auf unentdeckte Nacharbeit Wochen später.

---

## 5. Entwicklung der AI-Architektur

Konstant über das gesamte Projekt (bereits ab `caf0fdb`, Sprint 2): strikte Trennung zwischen deterministischer Berechnung (`src/scoring.js`: Health-, Priority-, Expansion-Score) und generativer KI (`api/analyze.js`: Erklärung, Next Best Action, Synthese). Diese Trennung wird in mehreren Dokumenten explizit als Kernprinzip benannt (`docs/08_architecture_concept.md`, `docs/09_developer_handover.md`) und ist der rote Faden, der alle späteren Guardrail-Entscheidungen (Abschnitt 6) trägt.

**Dualer AI-Provider:** `AI_PROVIDER` in `.env` schaltet zwischen direkter Anthropic-/OpenAI-API und einem n8n-Webhook als Compute-Layer um (`docs/06_n8n_integration.md`). Für Letzteres validiert die App die Rückgabe (`text`-Feld muss vorhanden und nicht leer sein) und gibt bei Fehlkonfiguration einen kontrollierten, secret-freien Fehler zurück statt eines stillen Fallbacks.

**Sicherheitsschicht:** `api/_security.js` — Origin-Allowlist und Rate-Limiting, bereits ab `81576eb` (2026-08-10) angelegt. Jeder ausgehende n8n-Call trägt seit Sprint 03 einen Shared-Secret-Header (`x-cs-ai-hub-secret`); fehlt der Secret bei gesetzter Webhook-URL, verweigert die App den Call komplett, statt unauthentifiziert zu senden.

**Geplant, nicht gebaut:** Supabase-Migration, Ereignis-Strom-Datenmodell (`interactions`, `health_score_snapshots`), ein "Simulate Update"-Admin-Button für Outcome-Feedback, und MCP als agentischer Tool-Layer. Alle vier sind in `docs/08_architecture_concept.md` konzeptionell durchdacht (inklusive einer bewusst verworfenen Hybrid-Lösung, siehe Abschnitt 6) — Status **GEPLANT**, nicht implementiert.

---

## 6. Wichtige Probleme und Kurskorrekturen

### 6.1 LLM-Mathematik (Numerical Grounding)

**Ausgangslage:** Portfolio- und Renewal-KPIs (ARR-Summen, Account-Zahlen) werden deterministisch in `src/scoring.js` berechnet und der KI im Prompt als Kontext mitgegeben.

**Problem:** Eine reine Prompt-Anweisung ("nutze diese Zahl, addiere nicht selbst") reichte nicht aus. Der ursprüngliche Prompt (vor `566cefa`) verbot explizit nur das Aufsummieren mehrerer Renewal-Fenster zu einem neuen Gesamtwert — das Modell konnte also potenziell trotzdem eigene, nicht angeforderte Kombinationen bilden.

**Entscheidung:** Nicht die Prompt-Formulierung weiter verschärfen, sondern die benötigte Summe **serverseitig vorab berechnen** und der KI direkt als fertigen Wert mitgeben, statt sie überhaupt vor die Aufgabe zu stellen, selbst zu addieren.

**Technische Umsetzung** (`566cefa`, `src/scoring.js`): `totalRenewalArrUSD` und `totalRenewalAccountCount` werden einmalig aus den bereits berechneten Pro-Fenster-Werten summiert und als eigene Felder in `computePortfolioKpis()` zurückgegeben. Der Prompt wurde zusätzlich umformuliert: von "addiere nicht" zu "berechne grundsätzlich nichts selbst, nutze bevorzugt gar keine Zahlen im Text, sondern interpretiere".

**Test/Ergebnis:** `tests/portfolio-kpis.test.js` (+34 Zeilen) und `tests/portfolio-summary.test.js` (+11 Zeilen) neu/erweitert; alle 173 Tests liefen zum Zeitpunkt der Prüfung grün.

**Learning** (im Commit-Diff als Codekommentar festgehalten): Eine Prompt-Regel reduziert das Risiko, verhindert es aber nicht zuverlässig — die robuste Lösung ist, dem Modell die Rechenaufgabe erst gar nicht zu stellen.

### 6.2 Account Scope

**Problem:** Bei Multi-Account-Kontexten (Portfolio-Summary, Executive Drill-down) liefert die KI `accountIds`-Arrays zu ihren Textaussagen zurück. Ohne Kontrolle könnte sie eine ID referenzieren, die außerhalb des tatsächlich übergebenen Scopes liegt (Halluzination einer nicht vorhandenen oder nicht autorisierten Account-Referenz).

**Entscheidung:** Prompt-Anweisungen ("nutze nur die exakten IDs oben") wurden **nicht als ausreichend betrachtet** — analog zum Numerical-Grounding-Fall wurde eine harte serverseitige Kontrolle ergänzt.

**Technische Umsetzung** (`api/analyze.js`, Kommentar bei `clampAccountIds`): *"actual in-scope clamping (dropping any id the model wasn't given) happens [server-side]"* — jede von der KI zurückgegebene `accountIds`-Liste wird gegen `validIds` (die tatsächlich in der Anfrage übergebenen Accounts) geclampt; IDs außerhalb des Scopes werden verworfen, nicht nur geloggt.

**Warum Prompt-Regeln allein nicht ausreichten:** Dieselbe Erkenntnis wie beim Numerical-Grounding-Problem — ein LLM kann eine Anweisung befolgen wollen und trotzdem stochastisch abweichen; nur eine deterministische Nachbearbeitung ist verlässlich.

### 6.3 Human Review — Recommendation ≠ Decision

Das Prinzip ist von Anfang an im Projekt-Brief verankert ("Verantwortungsprinzip": *"AI unterstützt Analyse und Vorbereitung. Sie entscheidet nicht selbst über kundenwirksame Handlungen."*), wurde aber technisch **in zwei erkennbaren Stufen** umgesetzt:

- **Stufe 1 (früh, ~2026-08-11):** Ein-Klick "Approve & Send to Workflow"-Button ohne Zwischenschritt.
- **Stufe 2 (ab `652ff17`, 2026-08-14, vertieft in `cdfa956`, 2026-08-17):** Ein echter Review-Schritt mit editierbarem Text vor der Freigabe. Dieser Ausbau war eine der im ChatGPT-Review (`docs/07`, P0-02) explizit als "größte inhaltliche Lücke" benannten Punkte — die Nachschärfung ist also direkt auf externes Review-Feedback zurückführbar, nicht auf eine ursprüngliche Eigenplanung.

### 6.4 Workflow: "Sent to Workflow" ≠ "Executed"

Belegt durch `docs/06_n8n_integration.md`: Der Approval-Call an n8n **wird nie automatisch retried**, ausdrücklich begründet mit dem Risiko einer doppelten Sheet-Zeile oder doppelten internen E-Mail bei einem stillen Retry ohne Idempotenz. Ist keine Webhook-URL konfiguriert, zeigt die UI explizit *"✓ Reviewed by CSM and logged, no workflow connected yet"* — eine bewusst andere Formulierung als ein erfolgreicher Versand, um Freigabe (durch den Menschen) nicht mit tatsächlicher externer Ausführung zu verwechseln. Fehlt bei gesetzter Webhook-URL der Shared Secret, wird das als Fehlkonfiguration behandelt und der Call verweigert, statt unauthentifiziert zu senden.

### 6.5 QBR: 12 Sections, Internal vs. Customer-Safe, 502/Truncated JSON

**Struktur:** `54bc14c` führt den QBR-Copiloten mit 12 strukturierten Sections ein (`src/app.js`: *"groups the 12 flat sections into a small tab set"*).

**Customer-Safe-Mechanismus** (`src/qbrPreview.js`, Code-Kommentar wörtlich zitiert): *"Only a section a human has [reviewed], `safeText`, may ever reach the preview."* Konkret: Ein Section-Objekt trägt sowohl einen internen Text als auch potenziell ein `customerSafeDefault`. Die Kundenvorschau (`renderQbrPreview`) liest **ausschließlich** aus `qbr.review[key].safeText` — nie direkt aus `s.internal` oder `s.customerSafeDefault`. Sensible Sections (`QBR_SENSITIVE_KEYS`) haben laut `src/app.js`-Kommentar ("QBR Repair & Hardening") ein eigenes UI-Verhalten: Sie können nicht per generischem "Include"-Toggle ohne echten, von Whitespace verschiedenen `safeText` in die Vorschau gelangen. Dies deckt sich mit den Testfällen in `cdfa956` (*"a sensitive section (Manual Review Required) with empty safeText cannot reach the preview, even if included is true"*, *"whitespace-only safeText does not count as a real customer-safe version"*) — Repository-/Test-verifiziert.

**Recommendation ≠ Commitment:** Aus den Testnamen in `qbr-preview.test.js` (siehe `npm test`-Lauf) ist ein Guardrail explizit belegt: *"high risk + growth is converted to a risk-mitigation action, not just relabeled"*, *"high risk fallback action omits champion name when none is on record (no invented facts)"*. Die dazugehörigen Prompt-Regeln (in `docs/07` als Ausgangspunkt referenziert) verbieten das Erfinden von Objectives/Commitments/Interventions, die nicht in den Daten stehen.

**QBR 502 / Truncated JSON** (`docs/11_n8n_hardening_runbook.md`, wörtlich): Ein realer QBR-Testcall auf Account ACC-01 brach mit `502 Bad Gateway` ab, serverseitig protokolliert als *"Unterminated string in JSON at position 10295"* — die Modellantwort wurde mitten im JSON abgeschnitten. Ursache: Der `qbr-draft`-Mode sendet `maxTokens: 2800` (der mit Abstand größte Wert aller Modi), während ein fest codiertes 2.400-Token-Limit im n8n-Node darunterlag und die Antwort unabhängig vom übermittelten Wert begrenzte. Ein sofortiger Retry funktionierte, da die Antwort diesmal unter dem Limit blieb — kein deterministischer Fix, sondern ein beobachtetes Workaround-Symptom.

**Weitere dokumentierte Härtung** (`api/analyze.js`): Sowohl für Anthropic (`stop_reason === "max_tokens"`) als auch OpenAI (`finish_reason === "length"`) wird eine abgeschnittene Antwort explizit als Fehler geworfen (*"response truncated ... got N chars"*), statt ein unvollständiges JSON stillschweigend weiterzureichen. Ein Codekommentar erklärt zudem eine Sonnet-5-spezifische Falle: *"Sonnet 5 runs adaptive thinking by default, and max_tokens caps [...] thinking alone can consume the whole budget and truncate the JSON"* — ein konkretes, modellspezifisches Learning, das in den Code eingeflossen ist.

**Bekannte Robustheitsprobleme / Workarounds** (Status: OFFEN/TECHNISCHE SCHULD): Das n8n-Node-Token-Limit war zum Zeitpunkt des Runbooks (`docs/11`) noch fest auf 2.400 gesetzt, mit einer im Dokument beschriebenen, aber laut Dokument selbst noch nicht aktivierten dynamischen Lösung ("spätere Kosten-/Architekturverbesserung ... bleibt bewusst die getestete feste Obergrenze ... aktiv"). Das ist eine bewusste, dokumentierte Entscheidung, keine übersehene Lücke.

### 6.6 Verworfene Architekturidee: Hybrid-Datenmodell

**Ausgangslage:** Für die geplante Persistenzschicht wurde zunächst überlegt, nur neue Daten (Notizen, Approvals) in Supabase zu halten, während die 35 Demo-Accounts als JSON bleiben.

**Verworfen, weil:** Ein Fremdschlüssel-Bezug (`accountId`) zwischen einer Datenbank und einer separaten JSON-Datei erzeugt ein Split-Brain-Problem — als "anerkanntes Anti-Pattern" explizit benannt (`docs/08_architecture_concept.md`). Zusätzliches Argument: reale Kundendaten liegen in der Praxis ohnehin in Datenbanken, eine Flatfile-Lösung würde die Glaubwürdigkeit des "so würde ich das echt bauen"-Anspruchs untergraben.

**Beschluss:** Vollständige Migration nach Supabase, sobald umgesetzt — **Status: GEPLANT, nicht implementiert.**

---

## 7. Human Review und Guardrails (Zusammenfassung)

- Deterministische Scores können von der KI nicht verändert werden, nur erklärt (durchgängiges Prinzip seit Sprint 2).
- Growth-Empfehlungen für High-Risk-Accounts werden serverseitig zwingend zu Risk-Mitigation umkategorisiert — nicht nur per Prompt erbeten (`docs/12`: "Umgesetzt"; test-verifiziert in `trust-guardrails.test.js`).
- Jede kundengerichtete Aktion durchläuft ein Review-Formular vor Versand; kein automatischer Trigger ohne Nutzeraktion (`docs/09`, Abschnitt 10: *"Kein automatischer/geplanter n8n-Trigger — nur durch explizite Nutzeraktion"*).
- KI-generierte Inhalte sind im UI durchgängig als solche gekennzeichnet, getrennt von regelbasierten Werten (`docs/12`).
- Account-Scope wird serverseitig geclampt (Abschnitt 6.2), nicht nur promptseitig eingeschränkt.

---

## 8. n8n und Workflow-Orchestrierung

n8n dient zwei unabhängigen Zwecken (`docs/06_n8n_integration.md`): (A) optional als AI-Compute-Layer anstelle direkter Anthropic/OpenAI-Calls, und (B) als Ziel des Human-Approval-Handoffs (Slack/Sheet/CRM-Task, je nach Workflow-Konfiguration). Beide sind bewusst optional — die App funktioniert vollständig ohne n8n (Mock-Modus oder direkte AI-Calls plus lokal geloggte Approvals).

**Sicherheitsentwicklung:** Ab Sprint 03 verpflichtender Shared-Secret-Header für jeden ausgehenden Call; Timeout-Konfiguration getrennt für Analyze- (länger, da LLM langsam) und Approval-Calls; kein automatischer Retry beim Approval-Call (Idempotenz-Risiko, siehe 6.4). `docs/11_n8n_hardening_runbook.md` dokumentiert darüber hinaus das reale 502/Truncated-JSON-Problem aus 6.5 mit einer klick-für-klick-Anleitung zur Behebung im n8n-Node selbst.

**Hosting:** Bewusst auf lokalem `localhost` belassen für Präsentationszwecke — ein öffentlich erreichbarer Cloudflare-Tunnel wurde als nicht nötig zurückgestellt (`docs/08`, Abschnitt 7). Status der eigentlichen n8n-Workflows (Webhook-Node, AI-Node, Respond-Node) selbst: laut `docs/05_project_brief.md` bewusst zurückgestellter offener Punkt — das "tatsächliche Zusammenklicken der n8n-Workflows in der Oberfläche" ist ausdrücklich als noch nicht erledigt vermerkt.

---

## 9. QBR Copilot und Customer-Safety

Siehe Abschnitt 6.5 für die technischen Details. Zusammengefasst nach Status:

- **IMPLEMENTIERT:** 12-Section-Struktur, Internal/Customer-Safe-Trennung über `safeText`, sensible Sections mit hartem Gate (kein leerer/Whitespace-only `safeText`), serverseitige Umkategorisierung riskanter Growth-Empfehlungen, Truncation-Erkennung für beide LLM-Provider.
- **PROTOTYP/DEMONSTRIERT:** Der volle QBR-Workflow inkl. Preview und Export wurde an einem realen Account (ACC-01) getestet, inklusive des dabei aufgetretenen 502-Fehlers.
- **OFFEN/TECHNISCHE SCHULD:** Fest codiertes 2.400-Token-Limit im n8n-Node (dynamische Lösung dokumentiert, aber laut `docs/11` bewusst noch nicht aktiviert); kein durchsuchbares Audit-Log für freigegebene Aktionen (`docs/12`).

---

## 10. QBR Presentation / Claude Design / Gamma

**Kontextbasiert — nicht gegen Repository verifiziert.** Weder Gamma noch "Claude Design" als separates Werkzeug tauchen in der Commit-Historie, den Docs oder den Tests dieses Repositories als Artefakte auf (keine Gamma-Exporte, keine Design-Dateien im Repo gefunden). Die im Auftrag beschriebene Beobachtung — Gamma als Explorationswerkzeug mit Deterministik-Problemen bei Brand/Layout/Fonts, "Theme → Master Layouts → Content" als Learning, Claude Design für Art Direction, Claude Code für die reproduzierbare technische Umsetzung — kann aus diesem Repository weder bestätigt noch widerlegt werden. Der Commit `0434544` ("Phase 3: brand redesign, QBR workspace tabs, executive drill-down") zeigt, dass ein Brand-Redesign stattfand und **danach** von Claude Code technisch umgesetzt wurde, was mit der beschriebenen Rollentrennung (visuelle Exploration extern, technische Umsetzung durch Claude Code) konsistent ist — aber das ist ein Plausibilitätsschluss, kein Beleg für die Beteiligung von Gamma oder Claude Design im Speziellen. **Nicht ausreichend belegbar.**

Ein PPTX-Export-Renderer ist im Test-Namen `qbr-export.test.js` sichtbar (Status: existiert, Details nicht tiefer geprüft im Rahmen dieses Sparmodus-Reviews).

---

## 11. Entwicklung des Testing-Ansatzes

**Aktueller Stand (verifiziert):** 20 Testdateien in `tests/`, `npm test` (Node's eingebauter Test-Runner, `node --test`) meldet **173 Tests, 173 bestanden, 0 fehlgeschlagen** (Lauf am Tag dieser Retrospektive). Dies weicht von der im Auftrag genannten Zahl **"148 automatisierte Tests grün"** ab — die 148 ist damit **nicht bestätigt**, sondern durch den aktuellen Repository-Stand mit 173 **ersetzt**. Möglliche Erklärung (nicht verifiziert): 148 könnte ein Zwischenstand vor den letzten QBR-/Portfolio-Härtungscommits (`cdfa956`, `566cefa`) gewesen sein, die zusammen mindestens 34+11+68 = über 100 neue Assertion-Zeilen hinzufügten.

**Wachstum entlang der Produktkomplexität:** `docs/09_developer_handover.md` (Stand 2026-08-13) hält fest: *"Kein separater Build- oder Test-Schritt vorhanden — keine automatisierten Tests im Projekt."* Das bedeutet: **Automatisierte Tests kamen erst nach dem 13.08., in der zweiten Hälfte des Projekts**, konzentriert auf die Sprints ab `652ff17` (14.08.) und besonders auf den QBR-/Guardrail-Tag (17.08.). Das ist ein klarer, Repository-verifizierter Bruch: Frühe Sprints (Scoring, Matrix, Map, n8n-Erstintegration) entstanden ohne Testabdeckung; erst mit wachsender Guardrail-Komplexität (Human Review, Scope-Clamping, QBR Customer-Safety) wurde Testing zum festen Bestandteil jedes Fix-Commits.

**Regressions-Charakter der Tests:** Testdateien wie `external-actions-disabled.test.js`, `external-actions-flag-false.test.js`, `n8n-analyze-unconfigured.test.js`, `n8n-approval-unconfigured.test.js` zeigen ein Muster: Für jeden sicherheitsrelevanten Edge Case (fehlende Konfiguration, deaktiviertes Flag) existiert ein eigener Test, nicht nur für den Erfolgspfad. Das ist typisch für Tests, die aus einem konkret beobachteten Fehlverhalten entstanden sind, nicht aus vorausschauendem Design.

**Real-AI-Smoke-Tests:** Nicht als separate Testkategorie im Testverzeichnis identifizierbar; das im Auftrag erwähnte reale QBR-Testcall auf ACC-01 (Abschnitt 6.5) war ein manueller/dokumentierter Testlauf, kein automatisierter Smoke-Test im `tests/`-Ordner. **Nicht ausreichend belegbar als formalisierte Testkategorie.**

---

## 12. Kosten-, Kontext- und Tool-Management

**Kontextbasiert — nicht gegen Repository verifiziert**, da Token-/Kosten-Logs außerhalb des Projektverzeichnisses liegen. Was sich indirekt aus der Repository-Struktur ablesen lässt und die im Auftrag beschriebene Entwicklung stützt:

- `MOCK_AI=true` existiert als expliziter Modus (README, `docs/09`) — ein direkter Beleg für Kostenbewusstsein: die volle App inklusive AI-Layer lässt sich ohne echte API-Kosten testen.
- Die Commit-Struktur zeigt eine klare Verkleinerung der Sprint-Scopes im Verlauf: frühe Commits bündeln oft mehrere Sprints in einem Commit (`652ff17`: neun Sprints, `ca3db98`: fünf Sprints), während die letzten QBR-Commits vom 17.08. einzeln, thematisch eng abgegrenzt und mit sofortigem Test-Pendant erscheinen (`54bc14c` feat → `cdfa956` fix, jeweils mit eigenem Test-Zuwachs). Das deckt sich mit der im Auftrag beschriebenen Verschiebung hin zu kleineren, fokussierten Sprints.
- `docs/09_developer_handover.md` selbst ist ein Artefakt dieses Kontext-Managements: ein expliziter "Handover"-Dump für einen neuen Claude-Code-Chat, der Kontext nicht neu erarbeiten, sondern aus einem geprüften Dokument übernehmen soll — ein direktes Gegenmittel gegen unnötig große Arbeitskontexte.

**Learning, wie im Auftrag formuliert und durch obige Punkte gestützt:** Die verfügbare Evidenz stützt die These, dass nicht Modellqualität der limitierende Faktor war, sondern Kontext-, Kosten- und Aufgabenzuschnitt. Eine quantitative Bestätigung (tatsächliche Credit-/Token-Zahlen für Work/Codex vs. Claude Code) liegt außerhalb dieses Repositories und kann hier nicht geliefert werden.

---

## 13. Aktueller technischer Stand

| Bereich | Status |
|---|---|
| Scoring-Engine (Health/Priority/Expansion) | IMPLEMENTIERT, deterministisch, `src/scoring.js` |
| AI Insight pro Account (Sentiment, Narrative, Confidence, NBA) | IMPLEMENTIERT |
| Next Best Action (genau eine, kategorisiert) | IMPLEMENTIERT |
| Human Review vor Approval | IMPLEMENTIERT (echter Edit-/Review-Schritt, nicht nur Ein-Klick) |
| n8n Human-Approval-Workflow (App-Seite) | IMPLEMENTIERT; eigentliche n8n-Workflows (Webhook/AI/Respond-Nodes) laut Brief bewusst noch nicht final gebaut |
| n8n als AI-Compute-Layer (optional) | IMPLEMENTIERT |
| Account Activity Feed | IMPLEMENTIERT |
| Manager/Portfolio Intelligence | IMPLEMENTIERT |
| Renewal Radar (Matrix/Map/CSAT) | IMPLEMENTIERT |
| QBR Copilot (12 Sections, Customer-Safe-Review) | IMPLEMENTIERT (Guardrails test-verifiziert) |
| QBR PPTX-Export | IMPLEMENTIERT (Testdatei vorhanden, nicht inhaltlich tiefergeprüft) |
| Serverseitige Guardrails (Scope-Clamping, Numerical Grounding, Growth-Guardrail) | IMPLEMENTIERT, test-verifiziert |
| Datenbank/Supabase-Persistenz | GEPLANT, nicht gebaut — `data/accounts.json` bleibt einzige Laufzeit-Datenquelle |
| Event-Stream-Datenmodell (`interactions`, `health_score_snapshots`) | GEPLANT, nicht gebaut |
| "Simulate Update"-Outcome-Feedback-Loop | GEPLANT, nicht gebaut |
| MCP-Integration | GEPLANT, nicht begonnen |
| EU-AI-Act-Compliance | AUSDRÜCKLICH NICHT BEHAUPTET — nur eine vorläufige, unverbindliche interne Einordnung als "wahrscheinlich nicht-hochriskant" |
| DSGVO/DPIA | NICHT DURCHGEFÜHRT (nicht nötig bei rein fiktiven Daten; vor echtem Kundendateneinsatz explizit gefordert) |
| Öffentliches Deployment (Vercel) | ZURÜCKGESTELLT, bewusst |

---

## 14. Offene technische Schulden

Direkt aus `docs/09_developer_handover.md` (2026-08-13) und `docs/12_eu_ai_act_readiness.md` übernommen, mit Prüfung, ob sie laut späterer Commits behoben wurden:

- **Projektname uneinheitlich** (Titel/H1/package.json/README wichen zum 13.08. voneinander ab) — im aktuellen README als "CS AI Signal Hub" konsistent, aber nicht abschließend gegen alle Dateien nachgeprüft in diesem Sparmodus-Review.
- **Kein sichtbares Referenzdatum im UI** für relative Zeitangaben — laut Docs zum 13.08. offen; nicht erneut im UI verifiziert.
- **Team-Priority-Ladezeit 15–20s ohne Fortschrittsanzeige** — als offen dokumentiert (P1-05 in `docs/07`), Status danach nicht erneut bestätigt.
- **Klickbare Tabellenzeilen ohne Tastatur-/Screenreader-Zugänglichkeit** (P2-01) — als offen dokumentiert, kein Fix-Commit dafür identifiziert.
- **Kein durchsuchbares Audit-Log für freigegebene Aktionen** (`docs/12`, "Offene Pilot-Gates") — ausdrücklich als vor einem Piloten zu ergänzen markiert.
- **n8n-Node-Token-Limit fest auf 2.400** statt dynamisch aus `body.maxTokens` abgeleitet — laut `docs/11` bewusst nicht aktiviert, bekannte Grenze.
- **Belege/Quellenverweise an einzelnen KI-Aussagen** (P0-03 in `docs/07`) — kein entsprechender Commit identifiziert, vermutlich weiterhin offen.
- **AI-Literacy-/Betreiberrollen-Schulungskonzept und Monitoring-/Incident-/Abschaltprozess** — laut `docs/12` explizit "vor Pilot zu dokumentieren/ergänzen", nicht Teil des aktuellen Prototyps.

---

## 15. Repository-/Git-Evidenz

- **38 Commits** auf `master`, Zeitraum 2026-08-10 bis 2026-08-17 (`git log --oneline` verifiziert).
- **Phase-3-Checkpoint `0434544`**: letzter Commit der Historie, Titel *"Phase 3: brand redesign, QBR workspace tabs, executive drill-down, text polish"*, datiert 2026-08-17. Er folgt unmittelbar auf die beiden Härtungs-Fixes (`cdfa956`, `566cefa`) desselben Tages und bündelt visuelle/strukturelle Politur nach der funktionalen Guardrail-Arbeit — konsistent mit dem Muster "Funktion + Sicherheit zuerst, Politur danach" für diesen Tag.
- **Aktueller Arbeitsstand:** Working Tree hat laut `git status` nicht committete Änderungen und ist einen Commit vor `origin/master` (lokal ungeschobene Arbeit) — für diese Retrospektive wurden ausschließlich committete Historie und der aktuelle Dateizustand gelesen, keine Änderungen vorgenommen.
- **Tests:** `npm test` → 173/173 bestanden (eigener Lauf zum Zeitpunkt dieser Retrospektive, node's `--test`-Runner).
- **Kein Gamma-, kein Claude-Design-Artefakt** im Repository auffindbar (siehe Abschnitt 10).
- **Kein Supabase-/DB-Migrationscode** im Repository auffindbar — bestätigt, dass Abschnitt 13's "GEPLANT, nicht gebaut"-Einordnung zutrifft.

---

## 16. Wichtigste Learnings aus Sicht des Implementierungsagenten

1. **Prompt-Regeln sind ein erster, aber kein hinreichender Guardrail.** Sowohl beim Numerical-Grounding- als auch beim Account-Scope-Problem war die erste Lösung eine Prompt-Anweisung; die belastbare Lösung war in beiden Fällen eine deterministische serverseitige Nachbearbeitung. Dieses Muster wiederholte sich unabhängig zweimal am selben Tag (17.08.) — kein Einzelfall, sondern ein architektonisches Prinzip, das sich im Verlauf herausgebildet hat.
2. **Externe Reviews (ChatGPT als Co-PO) wirkten am stärksten, wenn sie gegengeprüft statt blind übernommen wurden.** `docs/07` zeigt, dass zwei von elf Reviewpunkten bei genauer Prüfung präzisiert oder korrigiert werden mussten — ein Hinweis darauf, dass die Qualität der Zusammenarbeit auch von der Bereitschaft abhing, Reviewaussagen zu verifizieren statt sie als gegeben hinzunehmen.
3. **Testing folgte der Guardrail-Komplexität, nicht umgekehrt.** Bis zum 13.08. gab es laut eigener Dokumentation keine automatisierten Tests; ab dem Punkt, wo Sicherheits-/Vertrauensfragen (Human Review, Scope, Customer-Safety) zentral wurden, wurde jeder Fix-Commit von neuen Tests begleitet. Tests entstanden hier reaktiv aus konkreten Guardrail-Anforderungen, nicht als vorausschauende Grundausstattung.
4. **Bewusstes Verwerfen war Teil der Architekturqualität**, nicht ein Zeichen von Planungsschwäche — das Hybrid-Datenmodell (Abschnitt 6.6) wurde explizit diskutiert und dokumentiert verworfen, statt stillschweigend nie erwähnt zu werden.
5. **Modellspezifisches Wissen floss direkt in den Code ein** (Sonnet-5-Thinking-Budget-Kommentar in `api/analyze.js`) — ein Hinweis darauf, dass Implementierungsarbeit mit aktuellen Modellen laufende technische Anpassung erfordert, nicht nur einmalige Integration.

---

## 17. Nicht ausreichend verifizierbare Punkte

- Die genaue interne Arbeitsweise von ChatGPT/Work bei der Anforderungsstrukturierung vor Übergabe an Claude Code (liegt außerhalb dieses Repositories).
- Die Rolle von Gamma und "Claude Design" im QBR-Presentation-Prozess (Abschnitt 10) — im Repository nicht auffindbar.
- Konkrete Zahlen zu Credit-/Token-Verbrauch von ChatGPT/Work vs. Claude Code (Abschnitt 12) — keine Kostendaten im Projektverzeichnis.
- Die frühere Zahl "148 automatisierte Tests grün" — durch den aktuellen Stand von 173 ersetzt, aber die Quelle/der Zeitpunkt der 148 ist aus dem Repository nicht rekonstruierbar.
- Formalisierte "Real-AI-Smoke-Tests" als eigene Testkategorie — nicht im `tests/`-Ordner als solche identifizierbar; nur ein dokumentierter manueller Testlauf (ACC-01, QBR) ist belegt.
- Vollständiger Status aller in `docs/09` (13.08.) gelisteten technischen Schulden zum heutigen Zeitpunkt — einige wurden vermutlich durch spätere Sprints behoben, wurden aber im Rahmen dieses Sparmodus-Reviews nicht einzeln nachgeprüft (siehe Abschnitt 14).
