# Customer Success AI Hub — Review Snapshot

Stand: 2026-08-15. Reiner Beobachtungs-Snapshot des aktuell lokal laufenden Produktstands (`http://localhost:5180/`) für einen externen Co-PO-/UX-Review. Keine Bewertung, keine Empfehlung — nur Bestandsaufnahme. Alle Daten im Produkt sind fiktiv (35 Demo-Accounts).

---

## 1. Sichtbare Hauptseiten/Views

Navigation (linke Sidebar), von oben nach unten:

1. **Portfolio** — Startseite/Übersicht
2. **Matrix** — Value Matrix / Renewal Radar (ein View, zwei Umschalt-Modi)
3. **Team** — CSM-Portfolios
4. **Map** — Geo Intelligence
5. **Features** — Feature-Request-Übersicht ("FR Feedback")
6. **Trust** — Trust & Governance

Zusätzlich zwei **inline eingebettete** Ansichten, keine eigenen Menüpunkte:

- **Account Detail** — klappt innerhalb der Portfolio-Tabelle unter der jeweiligen Zeile auf (kein Seitenwechsel)
- **Human Approval** — Formular innerhalb des Account-Detail-Bereichs, erscheint nach "Load AI Insights"

---

## 2. Kurzbeschreibung je View

### Portfolio
- **Zweck:** Priorisierte Übersicht aller Accounts — welcher Kunde braucht jetzt Aufmerksamkeit.
- **UI-Elemente:** Filterleiste (CSM/Region/Risk/Expansion/Trend + Suchfeld rechts), 4 KPI-Kacheln (Accounts in View, High Risk, ARR at Risk, Renewals ≤90 Tage), AI-Copilot-Fragebox ("Ask about this Portfolio"), Attention-Queue (Top 3 nach Priorität), sortierbare Tabelle (Account, Region, CSM, ARR, Renewal, Health Score, Risk, Adoption, Expansion, Last Interaction, Next QBR).
- **Interaktionen:** Filtern, Suchen (Name/ID, Teilbegriff, case-insensitiv), Tabelle sortieren, Zeile anklicken → Account Detail klappt auf, Copilot-Frage stellen (echter AI-Call).

### Account Detail (inline unter der Portfolio-Zeile)
- **Zweck:** Vollständige Score-Herleitung und Kontext für einen einzelnen Account.
- **UI-Elemente:** Score-Breakdown-Tabelle (8 gewichtete Kriterien mit Risk-Points-Balken), Health-Score-Trend- und CSAT-Trend-Mini-Charts nebeneinander, Contract & Licensing, Relationship, Support-Notizen (freitext), AI-Insights-Bereich.
- **Interaktionen:** "Load AI Insights" (echter AI-Call), freie Frage stellen, Next-Best-Action prüfen/freigeben (→ Human Approval).

### Value Matrix / Renewal Radar (Menüpunkt "Matrix")
- **Zweck:** Zwei-Achsen-Visualisierung zur Priorisierung — Value Matrix (Value Realization × Strategic Value) bzw. Renewal Radar (Health × Zeit bis Renewal).
- **UI-Elemente:** Modus-Umschalter, im Renewal-Modus zusätzlich Zeitfenster-Filter (30/60/90/180 Tage/All) und KPI-Zeile (ARR renewing, ARR at risk, Renewals, Critical), Streudiagramm mit 4 benannten Quadranten, Quick-Peek-Panel bei Klick auf einen Punkt.
- **Interaktionen:** Modus wechseln, Zeitfenster wechseln (nur Renewal), Punkt anklicken → Quick Peek (Account/Health/ARR/Renewal/CSM/Top-Risk-Signal), Link "View full details in Portfolio".

### Team
- **Zweck:** Wochenpriorität pro CSM und Team-weit.
- **UI-Elemente:** "AI Weekly Priorities"-Box (team-weit), Karten-Grid pro CSM (Name, Region, Accountzahl, Risk-Verteilung, ARR in High-Risk, Renewals ≤90 Tage, überfällige QBRs).
- **Interaktionen:** CSM-Karte anklicken → springt zur gefilterten Portfolio-Ansicht dieses CSM.

### Map (Geo Intelligence)
- **Zweck:** Geografischer Blick auf dasselbe gefilterte Portfolio.
- **UI-Elemente:** Modus-Umschalter (Health/ARR/Renewal — steuert Marker-Größe), echte OpenStreetMap-Karte mit Markern (Farbe = Risiko), Quick-Peek-Panel, Region-Summary-Karten (Accounts/ARR/At Risk/Renewals ≤90 Tage), Geo-Insight-Zeile (Region mit höchstem ARR at Risk).
- **Interaktionen:** Modus wechseln, Marker anklicken → Quick Peek, Link zu Portfolio.

### Features (FR Feedback)
- **Zweck:** Welche Feature-Requests kommen am häufigsten vor, mit wie viel gefährdetem ARR.
- **UI-Elemente:** Zusammenfassungs-Chips, sortierbare Tabelle (Feature Request, # Accounts, Total ARR, Avg Health Score, Oldest Ask, Sentiment, Requesting Accounts).
- **Interaktionen:** Spalten sortieren.

### Human Approval (inline im Account Detail)
- **Zweck:** Menschliche Freigabe vor jeder kundengerichteten Aktion.
- **UI-Elemente:** Review-Formular (Kategorie, empfohlene Aktion, Begründung — alle editierbar), Live-Kategorie-Badge, Cancel/Confirm-Buttons.
- **Interaktionen:** Bearbeiten, Abbrechen, oder "Confirm & Send to Workflow" (löst den echten n8n-Approval-Webhook aus, falls konfiguriert).

### Trust & Governance
- **Zweck:** Transparenz über KI-Einsatz, Guardrails und EU-AI-Act-Readiness.
- **UI-Elemente:** "How it works"-Flow (5 Schritte), "Who does what" (regelbasiert/AI-unterstützt/menschlich kontrolliert), Guardrails & Limits, EU-AI-Act-Readiness-Sektion (9 Punkte mit Status), Roadmap.
- **Interaktionen:** rein statisch, keine AI-Calls.

---

## 3. Kernfeatures (aktueller Stand)

- Deterministischer Health Score (8 gewichtete Kriterien) und Priority Score — beide serverseitig/clientseitig regelbasiert berechnet, nie von der KI verändert
- Expansion Score (Upsell-Potenzial) und Evidence Confidence (Datenqualität, nicht KI-Sicherheit)
- Filterbare/durchsuchbare Portfolio-Tabelle (CSM/Region/Risk/Expansion/Trend + Textsuche über Name/ID)
- Health-Score- und CSAT-Trend-Mini-Charts pro Account
- Value Matrix und Renewal Radar mit Zeitfenster-Filter und KPI-Zeile
- Geo Intelligence (Karte) mit Modus-Umschalter und Region-Summary
- Attention Queue (Top-3-Priorisierung)
- Human-in-the-Loop Approval-Workflow mit Doppelsubmit-Schutz
- Trust-&-Governance-Seite inkl. EU-AI-Act-Readiness-Übersicht

## 4. AI-Funktionen

- **Account Insight** — Sentiment, Narrative, Next-Best-Action-Vorschlag pro Account
- **Account-Ask** — freie Frage zu einem einzelnen Account
- **Team-/Portfolio-Priorities** — KI-Synthese + Next-Best-Action für Top-5-Accounts (Ranking selbst bleibt deterministisch)
- **Portfolio-Copilot-Ask** — freie Frage über das aktuell sichtbare, gefilterte Portfolio (inkl. Suchbegriff)
- Alle AI-Antworten sind klar als "AI-generated" gekennzeichnet; berechnete Scores werden nie von der KI überschrieben (serverseitiger Guardrail: High-Risk-Accounts erhalten nie automatisch eine Growth-Aktion)

## 5. n8n-/Approval-Funktionen

- **Analyze-Webhook** (`N8N_ANALYZE_WEBHOOK_URL`) — optionaler Provider-Pfad für die AI-Calls oben
- **Approval-Webhook** (`N8N_APPROVAL_WEBHOOK_URL`) — nach menschlicher Freigabe: schreibt eine Zeile in Google Sheets und versendet eine gebrandete Bestätigungs-E-Mail
- Gemeinsames Secret-Header-Verfahren für beide Webhooks; ohne Secret wird kein externer Call ausgeführt
- Kein automatischer Retry bei Fehlschlag (bewusst, um Doppel-Einträge/-Mails zu vermeiden)
- Fällt ohne konfigurierten Webhook auf reines Server-Logging zurück (Demo funktioniert auch ohne echtes n8n)

## 6. Bekannte offene UX-/Feature-Themen

- Value Matrix nutzt Adoption-Rate bzw. Expansion Score als Näherung für "Value Realization"/"Strategic Value" — kein dediziertes Feld dafür in den Demo-Daten vorhanden
- Renewal Radar: "Critical" ist als High-Risk-innerhalb-des-Zeitfensters definiert — keine Renewal-Likelihood/GRR/NRR, da nicht in den Daten
- n8n-E-Mail-Branding: Logo-Hosting für den echten Versand noch offen (lokaler Dateipfad reicht nur für die Preview)
- Renewal Radar kann bei sehr kleinen Laptop-Auflösungen (~1024×768) minimal scrollen
- Keine Spalten-Drag-and-Drop in der Portfolio-Tabelle (bewusst zurückgestellt)
- Rein sitzungsbasierter Zustand — kein Speichern von Filtern/Suche/Freigaben über einen Reload hinaus

## 7. Screenshots

Alle 7 angeforderten Views (Portfolio, Account Detail, Map, Value Matrix, Renewal Radar, Human Approval, Trust & Governance) wurden bei Desktop-Breite (1440px) aufgenommen und sind im Chat-Verlauf dieser Session sichtbar. Sie konnten technisch **nicht** als PNG-Dateien in diesem Ordner gespeichert werden — das Screenshot-Werkzeug liefert die Bilder direkt in die Unterhaltung, ohne Dateizugriff auf die Bild-Bytes. Details dazu im Abschlussbericht.
