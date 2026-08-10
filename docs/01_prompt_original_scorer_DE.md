# Prompt — Account Health & Churn Risk Scorer

**Projektkontext:** Neupositionierung als *CX Systems & AI Enablement Specialist*.
**Ursprung der Logik:** adaptiert von der gewichteten Scoring-Engine `scoreNewConnection()` aus WARMPATH (6 gewichtete Kriterien, ursprünglich zum Bewerten von LinkedIn-Netzwerkverbindungen entwickelt) — hier übertragen auf die Gesundheit von Kundenkonten.
**Zielwerkzeug:** OpenCode (Code-Agent)
**Status:** bereit zum direkten Einfügen, ohne Zwischenprüfung.

---

## Der Prompt (zum Einfügen in OpenCode)

```markdown
# Rolle
Du bist ein erfahrener Full-Stack-Entwickler, der leichtgewichtige,
einzeldateibasierte interne Tools für Customer-Success-Teams baut.
Du priorisierst Klarheit und funktionale Einfachheit gegenüber visueller Komplexität.

# Kontext
Baue eine eigenständige Web-App namens "Account Health & Churn Risk Scorer"
für einen Customer-Success-/CX-Anwendungsfall. Diese nutzt die Logik der
gewichteten Bewertung eines bestehenden persönlichen Projekts namens WARMPATH
(eine `scoreNewConnection()`-Funktion mit 6 gewichteten Kriterien, ursprünglich
zum Bewerten von LinkedIn-Netzwerkverbindungen entwickelt). Hier wird dieselbe
Philosophie der gewichteten Bewertung auf die Gesundheit von Kundenkonten statt
auf Networking angewendet.

# Aufgabe
Baue eine einzelne, in sich geschlossene HTML/JS-Datei, die:
1. Einen simulierten Datensatz von 10–15 fiktiven Kundenkonten lädt (direkt in
   der Datei eingebettet als JS-Array oder JSON — keine externe Datei, kein
   Backend, keine Datenbank).
2. Das Churn-Risiko jedes Kontos anhand der unten stehenden gewichteten
   Kriterien bewertet.
3. Konten sortiert nach Risikoscore anzeigt (höchstes Risiko zuerst), mit
   farblich codiertem Status: grün (geringes Risiko), orange (mittleres
   Risiko), rot (hohes Risiko).
4. Für jedes Konto eine aus-/einklappbare oder sichtbare Aufschlüsselung zeigt,
   *warum* es so bewertet wurde — welche Kriterien am stärksten zum
   Risikoscore beigetragen haben.

# Details — Bewertungskriterien (Gewichte anpassen, falls du eine bessere
Begründung hast, aber jede Änderung erklären)
- Anstieg der Antwortzeit (Kunde antwortet langsamer als sein historischer Durchschnitt) — Gewicht: 20 %
- Wiederholte Support-Tickets zum selben ungelösten Thema — Gewicht: 20 %
- Negatives Sentiment in aktueller Kommunikation erkannt — Gewicht: 20 %
- Rückgang der Produkt-/Feature-Nutzung gegenüber der Vorperiode — Gewicht: 20 %
- Aktueller NPS- oder CSAT-Wert (falls niedrig oder sinkend) — Gewicht: 15 %
- Keine nennenswerte Interaktion in den letzten 30+ Tagen — Gewicht: 5 %

Hinweis: Diese Kriterien spiegeln gängige, praxisnahe CS/CSM-Praxis wider
(Antwortzeit, Nutzungsrückgang, wiederkehrende Tickets, Sentiment, NPS/CSAT
und Interaktionsaktualität sind branchenübliche Churn-Signale). Dies stammt
nicht aus einem einzelnen veröffentlichten Framework mit einem konkreten
Datum — die Gewichte sind als vernünftiger Ausgangspunkt zu verstehen, nicht
als autoritativer Standard.

# Format & Stack
- Einzelne HTML-Datei, reines Vanilla-JS (kein Build-Schritt, keine
  npm-Installation nötig).
- Kein externes Backend, keine Datenbank, keine API-Aufrufe.
- Soll durch einfaches Öffnen der Datei im Browser laufen.
- Sauberes, übersichtliches Layout — eine sortier-/scanbare Listenansicht,
  kein Dashboard mit unnötigen Diagrammen.

# Einschränkungen
- ALLE Daten müssen klar erkennbar fiktiv/simuliert sein. Keine echten
  Kunden-, Firmen- oder Personennamen verwenden, die mit realen Entitäten
  verwechselt werden könnten.
- Einen sichtbaren, expliziten Disclaimer in der UI einfügen (z. B. ein
  kleines Banner oder eine Fußzeile) mit dem Wortlaut: "Demodaten — keine
  echten Kundeninformationen werden verwendet oder gespeichert."
- Keine Datenpersistenz hinzufügen (kein localStorage, keine Cookies) — dies
  ist ein Wegwerf-Demo-Tool.

# Beispiel (illustrativer Kontoeintrag — nur zur Strukturreferenz, nicht wörtlich zu übernehmen)
{
  "accountName": "Fictional Corp A",
  "lastInteractionDaysAgo": 42,
  "responseTimeTrend": "increasing",
  "repeatedTicketTopic": true,
  "sentiment": "negative",
  "usageTrend": "declining",
  "recentCSAT": 2
}

Baue die vollständige App jetzt, inklusive simuliertem Datensatz,
Bewertungslogik und visueller Ausgabe — direkt lauffähig.
```

---

## Erklärung der Entscheidungen

| Block | Warum diese Wahl |
|---|---|
| **Rolle** | Rahmt den Agenten auf "einfaches internes Tool" ein, verhindert Over-Engineering (kein unnötiges Framework) |
| **Kontext** | Verknüpft explizit mit WARMPATH, um die logische Kohärenz zwischen den beiden Projekten zu wahren |
| **Aufgabe** | In 4 klare Punkte sequenziert, damit nichts vergessen wird (Daten, Bewertung, Sortierung, Begründung) |
| **Details** | Die 6 Kriterien sind branchenübliche CS-Churn-Signale — ein Startgewicht, keine absolute Wahrheit |
| **Format & Stack** | Eine einzige HTML/JS-Datei, null Abhängigkeiten — entspricht der geforderten Einfachheit und sofortigen Einsetzbarkeit |
| **Einschränkungen** | Explizite Sicherheit: keine echten Daten, sichtbarer Disclaimer, keine Persistenz |
| **Beispiel** | Ein einzelnes Strukturbeispiel, kein vollständiges Few-Shot — hier ausreichend, da die Bewertungslogik bereits in den Details detailliert ist |

## ⚠️ Transparenzhinweis (Quelle)

Die vorgeschlagenen Churn-Risk-Kriterien spiegeln gängige Customer-Success-Praktiken wider (Antwortzeit, Nutzungsrückgang, wiederkehrende Tickets, Sentiment, NPS/CSAT, Interaktionsaktualität) — das sind in der Branche weit verbreitete Signale, aber **nicht aus einem einzelnen veröffentlichten Framework mit konkretem Datum abgeleitet**. Als vernünftigen Ausgangspunkt behandeln, nicht als akademische Referenz.

---

*Dokument erstellt für die Seite WxTy — KI-Manager Toolkit.*
