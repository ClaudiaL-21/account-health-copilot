# Architektur-Konzept: Persistenz, Fortschritts-Simulation, MCP

Status: Konzeptionelle Diskussion, noch keine Code-Änderung. Festgehalten als Diskussionsgrundlage, bevor irgendetwas davon gebaut wird. Ergänzt `docs/07_response_to_chatgpt_review.md` um die Architektur-Themen, die unabhängig vom ChatGPT-Review entstanden sind.

## 1. Leitidee

Das Projekt soll zeigen, dass eine schlanke, transparente Architektur echten Mehrwert bringt — im Gegensatz zu teuren, starren Enterprise-Tools (Gainsight, SAS CI360). Das trägt nur, wenn jede Schicht der Architektur genau das tut, wofür sie wirklich gebraucht wird — kein AI-Overkill, kein DB-Overkill, kein Workflow-Overkill, aber auch keine künstliche Vereinfachung, wo echte Struktur nötig ist.

| Schicht | Zweck | Werkzeug |
|---|---|---|
| Scoring (deterministisch) | Health Score, Priority Score, Expansion Score | Reine Formel (`scoring.js`) |
| AI-Layer | Synthese, Next-Best-Action, Portfolio-Fragen | Direkte LLM-API oder n8n (austauschbar, siehe `docs/06`) |
| n8n | Aktionen nach menschlicher Freigabe, Prozess-Orchestrierung, künftig Daten-Ingestion | Workflow-Engine |
| Datenbank | Persistenz für alles, was entsteht und wiederkehrt | Supabase |
| MCP | Dynamischer, agentischer Datenzugriff statt starr zusammengebauter Prompts | Model Context Protocol |

## 2. Datenbank: volle Migration statt Hybrid-Ansatz

**Ursprüngliche Überlegung (verworfen):** Nur neue Daten (Notizen, Approvals) in Supabase, die 35 Demo-Accounts bleiben als JSON.

**Warum das verworfen wurde:** Sobald Notizen mit `accountId`-Bezug in einer Datenbank liegen und die Accounts selbst in einer separaten JSON-Datei, entsteht ein Split-Brain-Problem — kein echter Fremdschlüssel, keine gemeinsame Abfrage über beide Quellen hinweg möglich. Das ist ein anerkannter Anti-Pattern, kein akzeptabler Kompromiss. Zusätzlich: reale Kundendaten liegen in der Praxis ohnehin immer in Datenbanken — eine Flatfile-Lösung untergräbt die Glaubwürdigkeit des "so würde ich das echt bauen"-Anspruchs.

**Beschluss:** Vollständige Migration nach Supabase. `data/accounts.json` wird zum einmaligen Seed-/Migrations-Script, nicht mehr zur Laufzeit-Datenquelle.

### Grober Tabellen-Zuschnitt

```
accounts, csms, contracts, licensed_modules
usage_snapshots, support_summary
relationship (championName/Status, execSponsor, QBR-Termine)
weekly_csat, nps_history
free_text_artifacts (historische Kundenzitate, aus dem Seed)
value_milestones
─────────────────────────────
interactions          ← NEU, ersetzt/erweitert free_text_artifacts als lebendiger Strom
health_score_snapshots ← NEU, wächst über Zeit statt vorgefertigter Liste
notes                 ← NEU (CSM-Notizen-Feature)
approvals              ← NEU (ergänzt/ersetzt Google-Sheet-Log)
ai_insight_log          ← NEU (Audit-Trail jeder generierten Empfehlung)
```

## 3. Vom statischen Snapshot zum Ereignis-Strom

Aktuell ist der gesamte Datensatz an einem festen Zeitpunkt eingefroren (`generatedAt: 2026-08-10`), inklusive einer vorgefertigten 8-Wochen-Score-Historie. Für echten, nachvollziehbaren Fortschritt ist ein Wechsel im Datenmodell nötig:

**Von:** Account = Objekt mit festen aktuellen Werten
**Zu:** Account = Ereignis-Strom (`interactions`, `health_score_snapshots`), aus dem sich der aktuelle Zustand ableitet

### Quellen-agnostisches Schema für `interactions`

Damit später auch echte Kundendaten (z. B. echte E-Mails) einfließen könnten, ohne das Schema neu zu entwerfen:

- `source_type` (manual_note, email, support_ticket, call_transcript, chat, crm_activity, ...)
- `source_id` (ID aus dem Ursprungssystem, verhindert doppelten Import)
- `received_at` (wann ist es wirklich passiert) vs. `ingested_at` (wann haben wir es importiert)
- `account_id` als Fremdschlüssel

**n8n als natürlicher Ingestion-Pfad für später:** Ein Gmail-Trigger-Node → Zuordnung zum passenden Account → Insert in `interactions`. Die Architektur trägt das mit, ohne dass heute etwas gebaut werden muss.

**Offener Punkt, bewusst nicht gelöst:** Echte Kunden-E-Mails wären echte PII. Sobald das über den Demo-Rahmen hinausgeht, kommen DSGVO-Themen dazu (Einwilligung, Zweckbindung, ggf. Redaction vor LLM-Übergabe). Für den Piloten reicht der Hinweis "Architektur ist darauf vorbereitet" — nicht bauen, nur nicht verbauen.

## 4. Demo-Fortschritt: der "Simulate Update"-Admin-Button

**Idee:** Ein Admin-Werkzeug (nicht Teil der CSM-Oberfläche), das auf Knopfdruck ein neues "Kapitel" für einen Account erzeugt — und dabei auf bereits genehmigte CSM-Aktionen reagiert. Schließt die im ChatGPT-Review (P1-04) und unabhängig davon identifizierte Feedback-Lücke: aktuell prüft niemand, ob eine Next-Best-Action tatsächlich etwas bewirkt hat.

### Zweistufiger Mechanismus (bewusst nicht "alles AI")

1. **Deterministische Zahlen-Verschiebung** (kein LLM): Regelwerk verschiebt Adoption%, offene Tickets, CSAT je nachdem, ob seit dem letzten Update eine Aktion genehmigt wurde und welcher Kategorie sie angehörte. Genehmigt + `risk_mitigation` → leichte Verbesserung (nicht sofort perfekt — echte Verbesserung braucht mehrere Zyklen). Keine Aktion → Stillstand oder leichte Verschlechterung.
2. **Ein LLM-Call für die Erzählung**: generiert eine neue, plausible Kundennotiz/E-Mail, die zu den verschobenen Zahlen passt und ggf. explizit auf die genehmigte Aktion Bezug nimmt.

**Warum diese Kombination:** Zahlen bleiben reproduzierbar und für eine Live-Demo kontrollierbar; die AI liefert nur die erzählerische Ebene. Hält Kosten klein (ein kurzer Call pro Knopfdruck, nicht automatisch).

### Design-Entscheidungen

- Pro Account auslösbar, nicht portfolioweit auf einmal (bessere Kontrollierbarkeit für Live-Demos)
- **Vorschau vor dem Speichern**, keine Sofort-Übernahme — konsistent mit dem App-eigenen Prinzip "AI schlägt vor, Mensch genehmigt", hier reflexiv auf das Admin-Werkzeug selbst angewendet
- Schreibt in `interactions` + `health_score_snapshots`

### Ehrlicher Rahmen für die Präsentation

Das demonstriert den **Mechanismus** eines Outcome-Feedback-Loops. Es beweist nicht, dass die AI-Empfehlungen in der Realität wirken — die "Verbesserung" ist simuliert, nicht gemessen. Sollte im Pitch explizit so eingeordnet werden: *"So würde ein echter Outcome-Tracking-Loop aussehen — hier als kontrollierte Simulation, weil keine echten Kundendaten über Monate vorliegen."*

## 5. MCP-Integration

Zwei unterschiedliche Stoßrichtungen, oft verwechselt:

**Option A — App-Daten als MCP-Server exposen:** Externe MCP-fähige Clients (Claude Desktop etc.) könnten direkt gegen die CS-Daten fragen. Netter Showcase, aber nicht der CSM-Alltagsnutzen.

**Option B — Agentischer Tool-Layer (empfohlen):** Aktuell wird pro Anfrage ein großer Kontext-String von Hand zusammengebaut (`accountContext()`) und in einen einzigen Prompt gestopft. Mit MCP bekäme der AI-Agent stattdessen Tools (`get_account`, `get_notes`, `search_tickets`, `log_note`), die er selbst aufruft, statt dass wir vorab entscheiden, was hineinmuss. Löst nebenbei ein reales Skalierungsproblem: der "Ask about Portfolio"-Kontext wird bei 35+ Accounts irgendwann zu groß, wenn weiterhin alles in einen Prompt gestopft wird.

**Voraussetzung:** Setzt die Datenbank-Migration voraus (Tools würden gegen Supabase abfragen, nicht gegen eine JSON-Datei). Sinnvolle nächste Ausbaustufe nach Abschnitt 2–4, nicht parallel dazu.

## 6. Reproduzierbarkeit / GitHub

Geprüfter Ist-Zustand (Stand dieser Session):

- ✅ `.env` korrekt in `.gitignore`, nie committed, keine geleakten Keys
- ✅ `.env.example` mit sauberen Platzhaltern vorhanden
- ✅ Projekt bereits auf GitHub: `github.com/ClaudiaL-21/customer-success-ai-hub`
- ✅ `vercel.json` für Deployment vorhanden

Fehlt für "wirklich einfach nachbaubar":

- README mit Setup-Anleitung für Außenstehende
- Exportierte n8n-Workflow-JSONs im Repo (Import statt Neubau)
- DB-Schema/Migrations-Script, sobald Supabase umgesetzt ist

## 7. n8n-Hosting-Strategie

**Kurzfristig (beschlossen):** Öffentliche Erreichbarkeit ist nicht nötig — Präsentationen laufen auf `localhost`, während der eigene Rechner ohnehin an ist. Cloudflare-Tunnel-Aufwand ist damit zurückgestellt.

**Für später, falls doch gebraucht:**

| Szenario | Empfehlung | Kosten |
|---|---|---|
| Nur Entwicklung | Lokal (`npx n8n`), kein Tunnel | 0€ |
| Live-Demo mit externem Zugriff | Lokal + Cloudflare Quick Tunnel (URL ändert sich pro Sitzung, `.env` muss dann aktualisiert werden) | 0€ |
| Stabile URL über mehrere Sitzungen | Cloudflare Named Tunnel (braucht eigene Domain) | ~10€/Jahr |
| Echtes 24/7-Deployment für fremde Nutzer | Kleiner VPS (z. B. Hetzner) | ~5€/Monat |

**Migrationsaufwand beim Wechsel weg von Startplatz:** Beide Workflows (AI Analysis, Approval) müssen im neuen n8n neu aufgebaut werden — keine reine Konfigurationsumstellung. Nicht vergessen: neue Workflows müssen wieder auf **"Active"** gestellt werden, sonst dasselbe Problem wie zu Beginn dieses Projekts (Production-Webhooks liefern sonst Fehler).

## 8. Offene Reihenfolge-Frage

Diese vier Bausteine (DB-Migration, Ereignis-Modell, Simulate-Update-Button, MCP) bauen aufeinander auf — DB zuerst, dann Ereignis-Modell, dann Simulate-Update (braucht beides), MCP zuletzt (braucht die DB als Abfrageziel). Noch nicht entschieden: ob das parallel zu den Punkten aus `docs/07` (Governance, Confidence-Kalibrierung, Review-Schritt vor Approval) läuft, oder ob eine der beiden Spuren zuerst abgeschlossen werden sollte.
