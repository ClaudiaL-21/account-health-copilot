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
| Sichtbare Score-Veränderungen | ❌ **Fehlt** — nur CSAT/NPS-Trend vorhanden, kein Verlauf des Health Scores selbst über Zeit |
| Sichtbare Risikotreiber | ✅ Score-Breakdown mit Gewichtung + Rohwert |
| AI-generierte Account Summary | ✅ vorhanden, aber ohne explizite Unsicherheits-Angabe |
| Begründete Next Best Action | ⚠️ aktuell 1–3 Empfehlungen statt einer einzigen, klar begründeten |
| n8n-Workflow mit menschlicher Freigabe | ❌ **komplett neu zu bauen** |
| Primärnutzerin passt zum Datenset | ✅ 35 Accounts, 6 CSMs, je 5–7 Accounts pro CSM — im Zielkorridor |
| Kein reines Churn-Alarmsystem | ✅ Matrix (Health×ARR, Health×Renewal) + Expansion Score zeigen auch Wachstum, nicht nur Risiko |

## Demo-Szenario (konkreter Vorschlag)

**"Benelux Mobility Group"** (bereits im Datenset) kombiniert mehrere der im Brief geforderten Signal-Dimensionen:
- Adoption -35 %, Sessions-Trend stark rückläufig
- Wiederkehrendes SSO/Login-Ticket (Support-Eskalation)
- Champion kürzlich abgesprungen, Exec Sponsor nicht engagiert
- Renewal in ~2 Monaten
- Freitext-Zitat erwähnt explizit Budget-Rechtfertigung vor Renewal

Fehlt: ein explizites "Value Milestone verfehlt"-Signal — dieses Konzept existiert im aktuellen Datenmodell noch nicht (siehe unten).

## Lücken für die nächste Phase (Scope/Architektur/Datenmodell)

1. **Health-Score-Verlauf** — Score-History statt nur Snapshot ("fiel in 6 Wochen von 48 auf 9")
2. **Genau eine Next Best Action** statt Liste — Prompt-Anpassung
3. **Unsicherheit explizit benennen** in der Account Summary (z. B. "nur 2 Textquellen, geringe Konfidenz")
4. **Value-Milestone-Feld** im Datenmodell (`valueMilestones: [{name, status, dueDate}]`) — neu
5. **n8n Human-Approval-Workflow** — eigene Infrastruktur, größtes offenes Stück
6. **Positiv-/Wachstumsszenario** als eigene Next-Best-Action-Kategorie (Upsell-Empfehlung, nicht nur Risiko-Fix) — teilweise durch Matrix/Expansion Score abgedeckt

## Non-Goals (bestätigt)

Kein eigenes ML-Modell, keine produktionsreife SaaS-Plattform, keine vollständige CRM-/Support-/Produkt-Integration, keine automatische Kundenkommunikation ohne Freigabe, keine umfassende Vorhersagegenauigkeit auf Realdaten-Basis, keine vollständige Abbildung aller CS-Prozesse.

## Offen für die nächste Phase

- Reihenfolge der 6 Lücken oben — was zuerst?
- n8n: selbst gehostet oder n8n.cloud? Was löst den Workflow aus?
- Value-Milestone-Feld: rückwirkend ins ganze Datenset oder nur für die Demo-Accounts?
- Projektname (siehe separate Diskussion — Arbeitstitel aktuell "CS AI Command Center" / "CS AI Dashboard")
