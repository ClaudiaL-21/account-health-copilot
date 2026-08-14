# 12 — EU AI Act Readiness (vorläufige Einordnung)

Status: Interne Readiness-Notiz, Sprint 08, 2026-08-14. Keine Rechtsberatung
und keine Compliance-Zertifizierung. Dient ausschließlich der internen
Vorbereitung eines möglichen Pilotbetriebs.

## Intended purpose

Der Customer Success AI Hub ist ein internes B2B-Werkzeug für Customer
Success Manager (CSM). Er verdichtet fiktive Account-Signale zu
regelbasierten Scores (Health, Priority, Expansion) und liefert eine
KI-gestützte Erklärung sowie einen Aktionsvorschlag. Jede kundengerichtete
Aktion durchläuft ein menschliches Review, bevor sie versendet wird. Das Tool
trifft keine automatisierten Entscheidungen über natürliche Personen und
wird nicht gegenüber Endkund:innen eingesetzt.

## Vorläufige Einordnung

Auf Basis des aktuellen, internen Einsatzkontexts wird das System vorläufig
als wahrscheinlich **nicht-hochriskanter interner B2B-Entscheidungsassistent**
eingeordnet — vorbehaltlich einer Prüfung des tatsächlichen Einsatzkontexts
vor einem Pilotbetrieb mit echten Kundendaten. Diese Einordnung ist keine
rechtliche Feststellung und ersetzt keine Prüfung durch die zuständige
Rechts-/Compliance-Funktion.

## Rollen

- **Provider** — das Team, das den Customer Success AI Hub bereitstellt und
  weiterentwickelt.
- **Betreiber (Deployer)** — die Organisation, die das System im
  Pilotbetrieb operativ einsetzt.
- **CSM-Reviewer** — die Person, die jeden KI-Vorschlag vor dem Versand
  prüft, bearbeitet, freigibt oder ablehnt.

## Umgesetzte Kontrollen

| Kontrolle | Status | Kurzer Nachweis |
| --- | --- | --- |
| AI-Inhalte gekennzeichnet | Umgesetzt | UI kennzeichnet KI-generierte Inhalte durchgängig als „AI-assisted" / „AI suggestion", getrennt von regelbasierten Werten. |
| Human Review vor Aktionen | Umgesetzt | Keine kundengerichtete Aktion verlässt das System ohne CSM-Freigabe im Review-Formular. |
| Nachvollziehbare regelbasierte Scores | Umgesetzt | Health-, Priority- und Expansion-Score werden aus festen, dokumentierten Kriterien in `src/scoring.js` berechnet, nicht durch die KI. |
| Guardrails und Validierung | Umgesetzt | High-Risk-Accounts erhalten serverseitig nie eine Growth-Aktion; Eingaben im Review-Formular werden vor dem Absenden validiert. |
| Fiktive Demo-Daten | Umgesetzt | Alle Accounts, Kontakte und Vorgänge in dieser Demo sind frei erfunden. |

## Offene Pilot-Gates

| Punkt | Status | Kurzer Nachweis / offene Frage |
| --- | --- | --- |
| Action Logging | Nur teilweise vorhanden | Freigegebene Aktionen werden über den bestehenden Workflow protokolliert; ein durchsuchbares Audit-Log/Reporting fehlt noch. |
| AI-Literacy / Betreiberrollen | Vor Pilot zu dokumentieren | Schulungs- und Rollenkonzept für Betreiber und CSM-Reviewer ist noch nicht formal festgehalten. |
| Monitoring, Incident- und Abschaltprozess | Vor Pilot zu ergänzen | Es existiert noch kein dokumentierter Prozess für Monitoring, Störungsmeldung und geordnete Abschaltung. |
| DSGVO-/DPIA-Prüfung | Bei echten Kundendaten erforderlich | Diese Demo verwendet ausschließlich fiktive Daten; vor jedem Einsatz mit echten Kundendaten ist eine DSGVO-/DPIA-Prüfung durch die zuständige Stelle erforderlich. |

## Verantwortlichkeit

Die fachliche und rechtliche Freigabe eines Pilotbetriebs — einschließlich
der finalen Risikoeinordnung nach EU AI Act, der DSGVO-/DPIA-Prüfung und der
offenen Pilot-Gates oben — obliegt der Product Ownerin bzw. der zuständigen
Rechts-/Compliance-Funktion, nicht diesem Dokument.

## Offizielle Quellen

- EU AI Act, Verordnung (EU) 2024/1689 — Volltext auf EUR-Lex:
  [eur-lex.europa.eu/eli/reg/2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)
- Artikel 4 (KI-Kompetenz / AI Literacy) — siehe oben verlinkter Volltext.
- Artikel 26 (Pflichten der Betreiber) — siehe oben verlinkter Volltext.
- Artikel 50 (Transparenzpflichten) — siehe oben verlinkter Volltext.

Hinweis: Es wird bewusst auf den offiziellen EUR-Lex-Volltext verlinkt statt
auf nicht verifizierte Anker zu einzelnen Artikeln, um keine falsche
Tiefenverlinkung zu erzeugen.
