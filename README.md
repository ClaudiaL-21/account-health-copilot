# CS AI Signal Hub

*Which customer needs my attention now, why does it matter, and what should I do next?*

An AI-powered Customer Success prototype that turns fragmented customer signals — usage, support, relationship, contract — into transparent priorities, an explainable Health Score, and human-approved next actions. Portfolio project for repositioning as a *CX Systems & AI Enablement Specialist* (and final project for a KI-Manager certificate course).

The domain logic (modular licensing, sessions/user usage, weekly CSAT, quarterly NPS, renewal/QBR cadence, champion risk) is inspired by real experience as Head of Customer Success Management (EMEA/APAC) at SAS Institute, with SAS CI360 as the licensed product and Gainsight as the CS platform. **All customers, people, contracts, and figures in this project are entirely fictional** — no real customer data, module names, or prices.

## Project brief

See [docs/05_project_brief.md](docs/05_project_brief.md) for the full problem statement, target user, success criteria, demo scenario, and open gaps for the next build phase (Health Score history, single Next Best Action, n8n human-approval workflow).

## How this came together (chronologically)

1. **Starting point:** a simple single-file scorer (6 weighted churn criteria, adapted from a personal networking project called WARMPATH) — see [docs/00_prompt_original_scorer_FR-EN.md](docs/00_prompt_original_scorer_FR-EN.md) / [German translation](docs/01_prompt_original_scorer_DE.md).
2. **Ambitious extension:** added a real AI layer (Anthropic API via a serverless function) that reads ticket/chat text, explains risk in plain language, and generates recommended actions — with a clear separation between the calculated score (deterministic) and AI-generated insights (can be wrong).
3. **Domain focus:** applied to a real B2B SaaS context (CDP/Customer Intelligence product, international CSM team, annual renewals, volume-based module licensing).
4. **Scale-up:** grew from 25 to 35 fictional accounts across EMEA, APAC, and the Americas (6 CSMs total); added a Health-vs-Value quadrant matrix, a Renewal Radar view, a real OpenStreetMap view, and a feature-request aggregation view for the product team.
5. **Reframing:** sharpened into a formal project brief (see above) — positioning it explicitly as a decision-support system, not a churn-alarm dashboard, with a Customer Value + human-approval focus in preparation for an n8n-based approval workflow.

## Folder structure

```
customer-success-ai-hub/
├── README.md                          ← this file
├── docs/
│   ├── 00_prompt_original_scorer_FR-EN.md
│   ├── 01_prompt_original_scorer_DE.md
│   ├── 02_dataset_schema.md           ← dataset description
│   ├── 03_kpi_catalog.md              ← KPI catalog + scoring weights + AI ideas
│   ├── 04_prompt_dashboard_build.md   ← build prompt for the dashboard
│   └── 05_project_brief.md            ← current, authoritative project brief
├── src/                                ← frontend (scoring engine, views, styles)
├── api/                                ← Anthropic-powered serverless AI layer
└── data/
    └── accounts.json                  ← 35 fictional accounts, 6 fictional CSMs
```

## Dataset at a glance

- 35 fictional B2B accounts across EMEA, APAC, and the Americas, 6 fictional CSMs with regional coverage
- Per account: contract & ARR, licensed modules, usage/adoption, support tickets, feature requests, weekly CSAT (8 weeks), NPS (3 quarters), champion status, QBR dates, HQ location, free-text snippets for the AI layer
- Details: [docs/02_dataset_schema.md](docs/02_dataset_schema.md)

## Running locally

```bash
npm run dev:local
```

Starts a dependency-free local server (frontend + AI serverless function) on port 5180 (see `.claude/launch.json` if you're using the Claude Code preview tooling). Set `MOCK_AI=true` in a local `.env` to exercise the full AI layer without a real Anthropic API key or any cost.

## Next step

The gaps identified in [docs/05_project_brief.md](docs/05_project_brief.md) — Health Score history, a single well-reasoned Next Best Action, and the n8n human-approval workflow — are the current build priorities.
