# Prompt — Account Health & Churn Risk Scorer

**Contexte du projet :** repositionnement vers *CX Systems & AI Enablement Specialist*.
**Origine de la logique :** adapté du moteur de scoring `scoreNewConnection()` de WARMPATH (6 critères pondérés, initialement conçu pour scorer des connexions réseau LinkedIn) — ici transposé à la santé de compte client.
**Outil cible :** OpenCode (agent de code)
**Statut :** prêt à coller tel quel, sans validation intermédiaire.

---

## Le prompt (à coller dans OpenCode)

```markdown
# Role
You are a senior full-stack developer who builds lightweight, single-file 
internal tools for Customer Success teams. You prioritize clarity and 
functional simplicity over visual complexity.

# Context
Build a standalone web app called "Account Health & Churn Risk Scorer" 
for a Customer Success / CX use case. This reuses the weighted-scoring 
logic of an existing personal project called WARMPATH (a `scoreNewConnection()` 
function with 6 weighted criteria, originally built for scoring LinkedIn 
network connections). Here, the same weighted-scoring philosophy is adapted 
to customer account health instead of networking.

# Task
Build a single, self-contained HTML/JS file that:
1. Loads a mocked dataset of 10-15 fictional customer accounts (embedded 
   directly in the file as a JS array or JSON — no external file, no backend, 
   no database).
2. Scores each account's churn risk using the weighted criteria below.
3. Displays accounts sorted by risk score (highest risk first), with a 
   color-coded status: green (low risk), orange (medium risk), red (high risk).
4. For each account, shows an expandable or visible breakdown of *why* it 
   scored that way — which criteria contributed most to the risk score.

# Specifics — Scoring criteria (adapt weights if you have a better rationale, 
but explain any change)
- Response time increase (client replies slower than their historical average) — weight: 20%
- Repeated support tickets on the same unresolved topic — weight: 20%
- Negative sentiment detected in recent communications — weight: 20%
- Drop in product/feature usage vs. previous period — weight: 20%
- Recent NPS or CSAT score (if low or declining) — weight: 15%
- No meaningful interaction in the last 30+ days — weight: 5%

Note: these criteria reflect common, practitioner-level CS/CSM practice 
(response time, usage decline, ticket recurrence, sentiment, NPS/CSAT, 
interaction recency are all standard churn signals used across the industry). 
This is not sourced from a single published framework with a specific date — 
treat the weights as a reasonable starting point, not an authoritative standard.

# Format & Stack
- Single HTML file, vanilla JS (no build step, no npm install required).
- No external backend, no database, no API calls.
- Should run by simply opening the file in a browser.
- Clean, readable layout — a sortable/scannable list view, not a dashboard 
  with unnecessary charts.

# Constraints
- ALL data must be clearly fictional/mocked. Do not use any real customer, 
  company, or personal names that could be mistaken for real entities.
- Add a visible, explicit disclaimer in the UI (e.g. a small banner or footer) 
  stating: "Demo data only — no real customer information is used or stored."
- Do not add any data persistence (no localStorage, no cookies) — this is a 
  disposable demo tool.

# Example (illustrative account entry — for structure reference only, not to be copied verbatim)
{
  "accountName": "Fictional Corp A",
  "lastInteractionDaysAgo": 42,
  "responseTimeTrend": "increasing",
  "repeatedTicketTopic": true,
  "sentiment": "negative",
  "usageTrend": "declining",
  "recentCSAT": 2
}

Build the full app now, including the mocked dataset, the scoring logic, 
and the visual output — ready to run as-is.
```

---

## Explications des choix

| Bloc | Pourquoi ce choix |
|---|---|
| **Role** | Cadre l'agent sur "outil interne simple", évite qu'il sur-ingénierie (pas de framework inutile) |
| **Context** | Rattache explicitement à WARMPATH pour garder la cohérence de logique entre tes deux projets |
| **Task** | Séquencé en 4 points clairs pour que rien ne soit oublié (data, scoring, tri, justification) |
| **Specifics** | Les 6 critères sont des signaux churn standards du métier CS — pondération de départ, pas une vérité absolue |
| **Format & Stack** | Un seul fichier HTML/JS, zéro dépendance — conforme à ta demande de simplicité et déployabilité immédiate |
| **Constraints** | Sécurité explicite : aucune vraie donnée, disclaimer visible, pas de persistance |
| **Example** | Un seul exemple de structure, pas un few-shot complet — suffisant ici car la logique de scoring est déjà détaillée dans les Specifics |

## ⚠️ Note de transparence (source)

Les critères de churn risk proposés reflètent des pratiques courantes en Customer Success (délai de réponse, usage en baisse, tickets récurrents, sentiment, NPS/CSAT, récence d'interaction) — ce sont des signaux largement utilisés dans l'industrie, mais **pas issus d'un framework publié unique avec une date précise**. À traiter comme point de départ raisonnable, pas comme référence académique.

---

*Document généré pour la page WxTy — KI-Manager Toolkit.*
