# Sprint 08 — EU AI Act Readiness im Trust-Bereich

Status: Umgesetzt am 2026-08-14. Kein Commit, kein Push, kein Folgesprint gestartet.

## Abschlussbericht von Claude

- Neue Sektion „EU AI Act readiness" im Trust-View (`src/app.js`, `renderTrust`) mit 9 Punkten (Status-Pills: 5× „Umgesetzt", 1× „Teilweise", 3× „Pilot-Gate"), Link zur Nachweisseite.
- Neue Nachweisseite `docs/12_eu_ai_act_readiness.md`: Intended purpose, vorläufige Einordnung, Rollen (Provider/Betreiber/CSM-Reviewer), Kontrollen-/Pilot-Gate-Tabellen, Verantwortlichkeit, offizielle EUR-Lex-Quelle (Art. 4, 26, 50).
- Keine Rechts-/Compliance-Aussage getroffen; durchgängig „Readiness", „vorläufige Einordnung", „Pilot-Gate" verwendet.
- Nur `src/app.js`, `src/styles.css` (neue `.trust-readiness-*`-Regeln inkl. Mobile-Breakpoint) und die neue Doc geändert — keine Änderung an Scores, Prompts, Payloads, n8n, DB.
- `node --check src/app.js`: OK. `npm test`: 74/74 grün. `git diff --check`: Exit 0 (nur bekannte CRLF-Warnungen).
- Trust-View Desktop: 3-Spalten-Grid, 9 Items, kein horizontales Overflow. Bei 390×844: 1-Spalte, kein Overflow.
- Keine externen Aufrufe, keine echte Mail, kein Webhook ausgelöst während der Prüfung.
- Kein Commit, kein Push.

## Ziel

Die Demo zeigt nachvollziehbar, welche zentralen EU-AI-Act-Prinzipien bereits
umgesetzt sind und welche Punkte vor einem echten Pilotbetrieb noch geprüft
werden müssen. Keine Aussage „rechtlich compliant“.

## Verbindlicher Scope

1. Ergänze im bestehenden Trust-View eine kompakte Sektion `EU AI Act readiness`.
2. Zeige mindestens diese Punkte mit Status und kurzem Nachweis:
   - AI-Inhalte gekennzeichnet;
   - Human Review vor Aktionen;
   - nachvollziehbare regelbasierte Scores;
   - Guardrails und Validierung;
   - fiktive Demo-Daten;
   - Action Logging nur teilweise vorhanden;
   - AI-Literacy/Betreiberrollen vor Pilot zu dokumentieren;
   - Monitoring, Incident- und Abschaltprozess vor Pilot zu ergänzen;
   - DSGVO-/DPIA-Prüfung bei echten Kundendaten erforderlich.
3. Füge `docs/12_eu_ai_act_readiness.md` als kurze Nachweisseite hinzu mit:
   - Intended purpose;
   - vorläufiger Einordnung als interner, wahrscheinlich nicht-hochriskanter
     B2B-Entscheidungsassistent, vorbehaltlich einer Prüfung des Einsatzkontexts;
   - Rollen: Provider/Betreiber/CSM-Reviewer;
   - umgesetzte Kontrollen, offene Pilot-Gates und Verantwortlichkeit.
4. Verlinke ausschließlich offizielle Quellen: EU AI Act Artikel 4, 26 und 50.

## Grenzen

- keine Rechtsberatung und keine Compliance-Zertifizierung;
- keine Änderung an Scoreformeln, AI-Prompts, Payloads, n8n, Datenbank oder
  echten Kundendaten;
- keine externen Aufrufe, keine echte Mail, kein Commit und kein Push;
- bestehendes Trust-Design und Brand-Sprache beibehalten.

## Prüfung

- `node --check src/app.js`
- `npm test`
- `git diff --check`
- Trust-View bei Desktop und 390px ohne Überlauf prüfen.

Abschlussbericht maximal acht kurze Punkte direkt in dieser Datei.
