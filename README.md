# Account Health Copilot

Portfolio-Projekt für die Repositionierung als *CX Systems & AI Enablement Specialist*.

Die Domänenlogik (modulare Lizenzierung, Sessions/User-Nutzung, wöchentliches CSAT, quartalsweises NPS, Renewal-/QBR-Rhythmus, Champion-Risiko) ist inspiriert von realer Erfahrung als Head of Customer Success Management (EMEA/APAC) bei SAS Institute, mit SAS CI360 als lizenziertem Produkt und Gainsight als CS-Plattform. **Alle Kunden, Personen, Verträge und Zahlen in diesem Projekt sind vollständig fiktiv** — keine echten Kundendaten, keine echten Modul-Namen oder Preise.

## Entstehungsweg (chronologisch)

1. **Ausgangspunkt:** einfacher Single-File Scorer (6 gewichtete Churn-Kriterien, adaptiert von einem persönlichen Networking-Projekt namens WARMPATH) — siehe [docs/00_prompt_original_scorer_FR-EN.md](docs/00_prompt_original_scorer_FR-EN.md) / [DE-Übersetzung](docs/01_prompt_original_scorer_DE.md).
2. **Ambitionierte Weiterentwicklung:** Erweiterung um einen echten KI-Layer (Anthropic API über eine Serverless Function), der Ticket-/Chat-Texte liest, Risiken in Klartext erklärt und Handlungsempfehlungen generiert — mit klarer Trennung zwischen berechnetem Score (deterministisch) und KI-generierten Insights (kann falsch liegen).
3. **Domänen-Fokussierung:** Übertragung auf einen realen B2B-SaaS-Kontext (CDP/Customer-Intelligence-Produkt, internationales CSM-Team, jährliche Renewals, volumenbasierte Modul-Lizenzierung).

## Ordnerstruktur

```
account-health-copilot/
├── README.md                          ← diese Datei
├── docs/
│   ├── 00_prompt_original_scorer_FR-EN.md
│   ├── 01_prompt_original_scorer_DE.md
│   ├── 02_dataset_schema.md           ← Beschreibung des Datensets
│   ├── 03_kpi_catalog.md              ← KPI-Katalog + Scoring-Gewichte + KI-Ideen
│   └── 04_prompt_dashboard_build.md   ← finaler Build-Prompt fürs Dashboard
└── data/
    └── accounts.json                  ← 25 fiktive Accounts, 4 fiktive CSMs
```

## Datenset auf einen Blick

- 25 fiktive B2B-Accounts, EMEA/APAC, 4 fiktive CSMs mit Regionalzuständigkeit
- Pro Account: Vertrag & ARR, lizenzierte Module, Nutzung/Adoption, Support-Tickets, Feature-Requests, wöchentliches CSAT (8 Wochen), NPS (3 Quartale), Champion-Status, QBR-Termine, freie Text-Snippets für den KI-Layer
- Details: [docs/02_dataset_schema.md](docs/02_dataset_schema.md)

## Nächster Schritt

Der Build-Prompt in [docs/04_prompt_dashboard_build.md](docs/04_prompt_dashboard_build.md) ist einsatzbereit — er beschreibt Scoring-Engine, Portfolio-/Team-/Detail-Ansichten und den KI-Layer, und referenziert `data/accounts.json` als vorhandene Datengrundlage.
