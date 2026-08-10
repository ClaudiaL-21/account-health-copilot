# Account Health Copilot

Portfolio project for repositioning as a *CX Systems & AI Enablement Specialist*.

The domain logic (modular licensing, sessions/user usage, weekly CSAT, quarterly NPS, renewal/QBR cadence, champion risk) is inspired by real experience as Head of Customer Success Management (EMEA/APAC) at SAS Institute, with SAS CI360 as the licensed product and Gainsight as the CS platform. **All customers, people, contracts, and figures in this project are entirely fictional** — no real customer data, module names, or prices.

## How this came together (chronologically)

1. **Starting point:** a simple single-file scorer (6 weighted churn criteria, adapted from a personal networking project called WARMPATH) — see [docs/00_prompt_original_scorer_FR-EN.md](docs/00_prompt_original_scorer_FR-EN.md) / [German translation](docs/01_prompt_original_scorer_DE.md).
2. **Ambitious extension:** added a real AI layer (Anthropic API via a serverless function) that reads ticket/chat text, explains risk in plain language, and generates recommended actions — with a clear separation between the calculated score (deterministic) and AI-generated insights (can be wrong).
3. **Domain focus:** applied to a real B2B SaaS context (CDP/Customer Intelligence product, international CSM team, annual renewals, volume-based module licensing).

## Folder structure

```
account-health-copilot/
├── README.md                          ← this file
├── docs/
│   ├── 00_prompt_original_scorer_FR-EN.md
│   ├── 01_prompt_original_scorer_DE.md
│   ├── 02_dataset_schema.md           ← dataset description
│   ├── 03_kpi_catalog.md              ← KPI catalog + scoring weights + AI ideas
│   └── 04_prompt_dashboard_build.md   ← final build prompt for the dashboard
└── data/
    └── accounts.json                  ← 25 fictional accounts, 4 fictional CSMs
```

## Dataset at a glance

- 25 fictional B2B accounts, EMEA/APAC, 4 fictional CSMs with regional coverage
- Per account: contract & ARR, licensed modules, usage/adoption, support tickets, feature requests, weekly CSAT (8 weeks), NPS (3 quarters), champion status, QBR dates, free-text snippets for the AI layer
- Details: [docs/02_dataset_schema.md](docs/02_dataset_schema.md)

## Next step

The build prompt in [docs/04_prompt_dashboard_build.md](docs/04_prompt_dashboard_build.md) is ready to use — it describes the scoring engine, portfolio/team/detail views, and the AI layer, and references `data/accounts.json` as the existing data source.
