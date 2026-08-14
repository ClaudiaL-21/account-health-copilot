# Projektsteuerung — Customer Success AI Hub

Stand: 2026-08-13. Dieses Dokument ist die schlanke, verbindliche Übersicht für Product Owner, Co-PO/Projektleitung und Claude Code. Detailkonzepte bleiben in den bestehenden Fachdokumenten; hier stehen nur Entscheidungen, aktueller Sprint und Freigaberegeln.

## Ziel bis zur Präsentation

Eine stabile, moderne End-to-End-Demo, die nachvollziehbar beantwortet: Welcher Kunde braucht Aufmerksamkeit, warum, und welche eine Handlung ist jetzt sinnvoll? Deterministische Logik entscheidet Zahlen und Rangfolgen; KI erklärt und schlägt vor; ein Mensch gibt kundenwirksame Aktionen frei.

## Aktueller Status

- Produktkern: vorhanden und lokal lauffähig
- Daten: 35 vollständig fiktive Accounts aus `data/accounts.json`
- Aktiver Entwicklungsstand: mehrere bestehende, nicht eingecheckte Änderungen; nicht zurücksetzen oder überschreiben
- Review 03 — n8n & AI Prompts: abgeschlossen am 2026-08-13
- Zuletzt abgeschlossen: Sprint 04 — Trust & Governance UI (finale PO-Freigabe 2026-08-13)
- Sprint-04-Review: Code, 63/63 Tests sowie UI bei 1440 px und 390 px bestanden; Co-PO-Review und finale PO-Abnahme abgeschlossen
- Aktiver Sprint: Sprint 05 — Product-wide UX/UI Polish & Demo Hardening (PO-Freigabe 2026-08-13)
- Manuelles n8n-Hardening: Analyse- und Approval-Webhook am 2026-08-13 mit gemeinsamem Header-Secret veröffentlicht; Analyse-End-to-End-Test erfolgreich; Approval-Negativtest ohne Secret mit HTTP 403 und kontrollierter Approval-End-to-End-Test nach Google-Reconnect erfolgreich
- Arbeitsauftrag: `docs/tasks/2026-08-13_sprint-05_product-ui-demo-hardening.md`
- Commit/Push: nur nach ausdrücklicher Freigabe der Product Ownerin

## Verbindliche Entscheidungen

1. Bis nach der Präsentation kein MCP, keine Supabase-Migration und kein Framework-Wechsel.
2. `data/accounts.json` und das feste Demo-Referenzdatum bleiben bis nach der Präsentation bestehen.
3. Confidence bezeichnet ausschließlich die Stärke der verfügbaren Evidenz, nicht die Wahrscheinlichkeit, dass die KI „richtig“ liegt.
4. High-Risk-Accounts dürfen serverseitig niemals eine Growth-Next-Best-Action erhalten. Eine Prompt-Anweisung allein genügt nicht.
5. Die manuellen n8n-Anpassungen erfolgen kontrolliert nach `docs/11_n8n_hardening_runbook.md`; Governance UI und Demo Hardening bleiben eigene, separat freizugebende Arbeitspakete.
6. Keine echten, kostenpflichtigen AI-Aufrufe ohne vorherige Rücksprache.

## Reihenfolge bis zur Präsentation

| Reihenfolge | Paket | Zweck | Status |
|---|---|---|---|
| 1 | Trust Guardrails | Harte Expansion-Regel und messbare Evidence Confidence | Von PO freigegeben |
| 2 | Human Review | Prüfen/Bearbeiten vor „Approve & Send“ | Von PO freigegeben |
| 3 | n8n & Prompt Audit / Demo Hardening | AI- und Approval-Workflow, Agent-/LLM-Prompts, Sicherheit und Demo-Stabilität | Von PO freigegeben |
| 4 | Trust & Governance UI | Grenzen, Datenstand, Verantwortlichkeiten zentral sichtbar machen | Von PO freigegeben |
| 5 | Product-wide UX/UI Polish & Demo Hardening | Gesamtes Designsystem, responsive Politur, zuverlässiger Approval-Vertrag und Klicktest | Von PO freigegeben |
| 6 | Presentation Release | End-to-End-Abnahme und Demo-Drehbuch | Geplant |

Customer Outcomes, Feedbackschleife, Datenbank/Ereignismodell, Simulate Update und MCP sind Ausbau nach der Präsentation.

## Freigabegates pro Sprint

Ein Sprint ist erst freigabefähig, wenn:

- der vereinbarte Scope vollständig umgesetzt ist,
- Syntax-/Automatiktests erfolgreich sind,
- die betroffenen UI-Abläufe manuell geprüft wurden,
- Claude alle geänderten Dateien und bekannte Restrisiken nennt,
- Co-PO/Projektleitung Code und UI geprüft hat,
- die Product Ownerin die Freigabe erteilt.

## Rollen und Ablauf

- Product Ownerin: fachliche und geschäftliche Entscheidung, finale Freigabe
- Co-PO/Projektleitung: Sprintzuschnitt, Architektur- und UX-Vorgaben, Review und Freigabeempfehlung
- Claude Code: Umsetzung ausschließlich nach dem jeweiligen Arbeitsauftrag, Tests und kurzer Abschlussbericht

Claude startet keinen Folgesprint, erstellt keinen Commit und pusht nichts ohne neue ausdrückliche Freigabe.
