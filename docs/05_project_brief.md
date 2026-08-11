# Project Brief — CS AI Command Center

Status: finaler Brief-Text, Basis für Scope/Architektur/Datenmodell. Noch keine Code-Änderung. Der Brief-Text (Projektziel bis Portfolio-Ziel) ist die verbindliche Fassung; der Abgleich-Teil danach zeigt, was davon im bestehenden Prototyp schon steht und was für die nächste Phase noch fehlt.

## Projektziel

Entwicklung eines transparenten AI-gestützten Customer-Intelligence-Prototyps für ein internationales B2B-SaaS-Unternehmen. Das System soll Customer Success Manager dabei unterstützen, relevante Entwicklungen in ihrem Kundenportfolio früher zu erkennen, deren Ursachen zu verstehen und die sinnvollste nächste Handlung auszuwählen.

## Problem

Customer-Success-Daten sind häufig auf unterschiedliche Systeme verteilt. Produktnutzung, Support-Vorgänge, Stakeholder-Beziehungen, Vertragsinformationen und Value-Meilensteine werden getrennt betrachtet. Dadurch entstehen drei Probleme:

1. Kritische Entwicklungen werden zu spät erkannt.
2. CSMs verbringen viel Zeit mit manueller Informationssammlung.
3. Health Scores zeigen einen Status, erklären aber häufig weder dessen Ursachen noch die passende Reaktion.

## Zielnutzer

Primäre Nutzerin ist eine Customer Success Managerin, die ein Portfolio internationaler B2B-SaaS-Kunden betreut. Sekundäre Nutzer sind CS-Führungskräfte, die Risiken, Prioritäten und Handlungsbedarf auf Portfolioebene verstehen müssen.

## Lösung

Das CS AI Command Center führt unterschiedliche Kundensignale zusammen und stellt bereit:

- eine priorisierte Portfolioübersicht,
- einen transparenten Health Score,
- sichtbare Score-Veränderungen und Risikotreiber,
- eine AI-generierte Account Summary,
- eine begründete Next Best Action,
- einen n8n-Workflow mit menschlicher Freigabe.

## Zentrale Entscheidungssituation

Die Anwendung beantwortet für einen CSM: **Welcher Kunde braucht jetzt meine Aufmerksamkeit, warum ist das wichtig, und was sollte ich als Nächstes tun?**

## Nutzenversprechen

Der Prototyp reduziert nicht einfach administrative Arbeit. Er hilft CSMs, ihre begrenzte Zeit auf die Kunden und Maßnahmen mit dem größten potenziellen Wertbeitrag zu konzentrieren.

## Verantwortungsprinzip

AI unterstützt Analyse und Vorbereitung. Sie entscheidet nicht selbst über kundenwirksame Handlungen. Empfehlungen bleiben erklärbar und werden von einem Menschen geprüft.

## Portfolio-Ziel

Das Projekt demonstriert die Fähigkeit, Customer-Success-Strategie, Customer Value, Datenmodellierung, AI Automation, Prozessdesign und verantwortungsvolle Umsetzung in einer kohärenten Lösung zu verbinden.

**Positionierung (Kurzform für Bio/Profil):**
> Ich entwickle AI-gestützte Customer-Success-Lösungen, die fragmentierte Kundensignale in transparente Prioritäten, verständliche Erkenntnisse und verantwortungsvoll gesteuerte Maßnahmen übersetzen. Dabei verbinde ich Customer-Value-Strategie, operative CS-Prozesse, Daten und AI Automation.

---

## Abgleich: Brief vs. bestehender Prototyp (account-health-copilot)

| Element aus dem Brief | Status im Prototyp |
|---|---|
| Priorisierte Portfolioübersicht | ✅ Portfolio-Tab, sortiert nach Health Score |
| Transparenter Health Score | ✅ 8-Kriterien-Engine, vollständig offengelegt |
| Sichtbare Score-Veränderungen | ✅ Health-Score-Sparkline + Textzusammenfassung ("fiel von 48 auf 9 in 7 Wochen") pro Account |
| Sichtbare Risikotreiber | ✅ Score-Breakdown mit Gewichtung + Rohwert |
| AI-generierte Account Summary | ✅ inkl. explizitem Confidence-Level (high/medium/low + Begründung) |
| Begründete Next Best Action | ✅ genau eine Aktion, kategorisiert als Risk Mitigation oder Growth |
| n8n-Workflow mit menschlicher Freigabe | ✅ "Approve & Send to Workflow"-Button je Next Best Action, plus optionaler n8n-Provider für die AI-Analyse selbst (siehe [06_n8n_integration.md](06_n8n_integration.md)) |
| Primärnutzerin passt zum Datenset | ✅ 35 Accounts, 6 CSMs, je 5–7 Accounts pro CSM — im Zielkorridor |
| Kein reines Churn-Alarmsystem | ✅ Matrix (Health×ARR, Health×Renewal) + Expansion Score zeigen auch Wachstum, nicht nur Risiko |

## Demo-Szenario (konkreter Vorschlag)

**"Benelux Mobility Group"** (bereits im Datenset) kombiniert mehrere der im Brief geforderten Signal-Dimensionen:
- Adoption -35 %, Sessions-Trend stark rückläufig
- Wiederkehrendes SSO/Login-Ticket (Support-Eskalation)
- Champion kürzlich abgesprungen, Exec Sponsor nicht engagiert
- Renewal in ~2 Monaten
- Freitext-Zitat erwähnt explizit Budget-Rechtfertigung vor Renewal

Value Milestone ist inzwischen im Datenmodell vorhanden (`valueMilestone: {achievedDate, description}`, für Accounts mit echter Traktion — Health Score ≥ 60 oder Adoption ≥ 55 %).

## Lücken für die nächste Phase (Scope/Architektur/Datenmodell) — Status

1. ✅ **Health-Score-Verlauf** — `healthScoreHistory` (8 Wochenpunkte, deterministisch, endet exakt auf dem live berechneten Score), Sparkline + Zusammenfassungssatz in der Account-Detailansicht
2. ✅ **Genau eine Next Best Action** — `nextBestAction` mit `category` (`risk_mitigation`/`growth`) statt Liste
3. ✅ **Unsicherheit explizit benennen** — `confidence: {level, reason}` im AI-Insight-Schema
4. ✅ **Value-Milestone-Feld** im Datenmodell — `valueMilestone: {achievedDate, description}`, deterministisch vergeben an Accounts mit echter Traktion
5. ✅ **n8n Human-Approval-Workflow** — "Approve & Send to Workflow"-Button, `/api/approve-action`-Endpunkt; zusätzlich optionaler `AI_PROVIDER=n8n`, der die AI-Analyse selbst an einen n8n-Webhook delegiert. Details: [06_n8n_integration.md](06_n8n_integration.md)
6. ✅ **Positiv-/Wachstumsszenario** als eigene Next-Best-Action-Kategorie (`category: "growth"`), verstärkt durch das Value-Milestone-Feld als Kontext für die AI

Alle sechs Lücken sind geschlossen. Offene, bewusst zurückgestellte Punkte: Vercel-Deployment (siehe Non-Goals/Portfolio-Ziel — wird erst aktiviert, wenn alles final ist), und das tatsächliche Zusammenklicken der n8n-Workflows selbst (Webhook-Nodes, AI-Node, Respond-Node) in der n8n-Oberfläche.

## Non-Goals (bestätigt)

Kein eigenes ML-Modell, keine produktionsreife SaaS-Plattform, keine vollständige CRM-/Support-/Produkt-Integration, keine automatische Kundenkommunikation ohne Freigabe, keine umfassende Vorhersagegenauigkeit auf Realdaten-Basis, keine vollständige Abbildung aller CS-Prozesse.

## Offen für die nächste Phase

- Reihenfolge der 6 Lücken oben — was zuerst?
- n8n: selbst gehostet oder n8n.cloud? Was löst den Workflow aus?
- Value-Milestone-Feld: rückwirkend ins ganze Datenset oder nur für die Demo-Accounts?
- Projektname (siehe separate Diskussion — Arbeitstitel aktuell "CS AI Command Center" / "CS AI Dashboard")
