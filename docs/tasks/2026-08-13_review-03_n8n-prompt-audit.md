# Review 03 — n8n-Workflows und AI-Prompts

Status: abgeschlossen; Befunde in Sprint 03 überführt  
Datum: 2026-08-13  
Art: rein lesender Architektur-, Sicherheits-, Prompt- und Demo-Review; keine Änderungen ohne separate PO-Freigabe

## Review-Gegenstand

### Workflow A — AI Analysis

Erwartete Kette laut Projekt: Webhook → AI Agent/LLM → Respond to Webhook.

Zu prüfen:

- Eingang und sichere Zuordnung von `system`, `user` und `maxTokens`
- System Message und User Message im Agent bzw. LLM
- verwendetes Modell und relevante Einstellungen
- zusätzliche Agent-Instruktionen, Memory, Tools und Output Parser
- Rückgabeformat `{ "text": "<raw AI JSON>" }`
- Vermeidung von doppelter JSON-Kodierung oder Markdown-Fences
- Fehlerpfade, Timeouts und Verhalten bei ungültigem Modelloutput
- Prompt-Injection-Schutz und Trennung von Kundenzitaten als Daten
- Kosten, Latenz und Eignung für die Live-Demo

### Workflow B — Human Approval

Erwartete Kette laut Projekt: Webhook → überprüfte Aktion weiterverarbeiten/loggen → Response.

Zu prüfen:

- Mapping der Felder inklusive `reviewedByHuman`
- keine erneute AI-Entscheidung nach menschlicher Freigabe
- Google-Sheet-/Zielsystem-Mapping
- keine automatische Kundenkommunikation
- Duplikat-/Retry-Verhalten und Fehlerpfad
- korrekter 2xx-Response an die App
- Aktivierungsstatus und sichere Demo-Fallbacks

## Benötigte Unterlagen

Bevorzugt:

1. Export-JSON des AI-Analysis-Workflows
2. Export-JSON des Human-Approval-Workflows

Zusätzlich oder ersatzweise Screenshots:

- vollständige Workflow-Übersicht jedes Workflows
- Webhook-Node: HTTP-Methode und Response-Verhalten
- AI-Agent-Node: Prompt-/Source-for-Prompt-Felder und alle Options
- verbundenes Chat-Model/LLM: Anbieter, Modellname und sichtbare Einstellungen
- System Message und User Message vollständig
- Structured Output Parser bzw. JSON-Schema, falls vorhanden
- Respond-to-Webhook-Node: Response Body und Statuscode
- Approval-Zielnode, z. B. Google Sheets: Feldmapping ohne Credentials
- je ein Screenshot einer erfolgreichen Execution mit Input/Output pro Node, sofern ohne Geheimnisse möglich

## Vor dem Teilen entfernen oder verdecken

- API-Keys, Tokens, Passwörter und OAuth-Inhalte
- Credential-Details
- vollständige Production-Webhook-URLs und geheime Webhook-Pfade
- echte personenbezogene Daten, falls wider Erwarten vorhanden

Credential-Namen und interne Node-Namen dürfen sichtbar bleiben, sofern sie selbst keine Geheimnisse enthalten. Keine `.env`-Datei hochladen.

## Ergebnis des Reviews

Der Co-PO liefert:

1. Befunde nach Kritikalität,
2. Prompt-Review mit konkreten Verbesserungsvorschlägen,
3. Architektur- und Sicherheitsbewertung,
4. Demo-Risiken und Fallback-Empfehlung,
5. klare Trennung zwischen Muss vor Präsentation und späterem Ausbau,
6. erst danach, falls nötig, einen kleinen dateibasierten Änderungsauftrag für Claude oder n8n.

Bis zur Review-Freigabe keine Workflow- oder Prompt-Änderungen vornehmen.

## Abschluss 2026-08-13

Die beiden Exportdateien wurden rein lesend geprüft. Wesentliche Befunde: fehlende Webhook-Authentifizierung, inkonsistente Output-Parser-Konfiguration im Analyse-Workflow, nicht verwendetes `maxTokens`, fehlendes Mapping des Human-Review-Nachweises sowie ein bekanntes Duplikatrisiko bei manueller Wiederholung des Approval-Workflows. Die Product Ownerin hat daraufhin die Erstellung von Sprint 03 — n8n Demo Hardening freigegeben.
