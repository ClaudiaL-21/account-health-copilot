# Sprint 06B — Logo und Brand-Shell-Polish

Status: Von der Product Ownerin am 2026-08-14 fachlich freigegeben; Umsetzung nach Sprint 06 offen.

## Ziel

Das vorhandene Customer Success AI Hub Logo ist in der Präsentationsdemo sofort erkennbar und bildet einen hochwertigen Einstieg in die Executive-Oberfläche.

## Ausgangsproblem

Die Sidebar verwendet derzeit das breite `assets/logo-full.jpg` in einem nur 34 × 34 px großen, quadratischen Element mit `object-fit: cover`. Dadurch wird der größte Teil des Logos abgeschnitten und das Markenzeichen ist kaum erkennbar.

## Modell und Aufwand für Claude Code

- Modell: Claude Sonnet
- Reasoning/Aufwand: Hoch
- Grund: Kleine, aber präsentationskritische Designänderung mit Desktop-, Tablet- und Mobile-Abwägung sowie sauberem Umgang mit bestehenden Bildformaten.

## Verbindliche Designrichtung

- In der Sidebar das quadratische `assets/logo-icon.png` vollständig sichtbar verwenden; kein beschnittener Ausschnitt des breiten Logos.
- Desktop: Symbol ungefähr 52–60 px groß in einer bewusst weißen bzw. sehr hellen Logo-Kachel mit moderatem Radius, feiner Kontur und sehr dezentem Türkis-/Mint-Akzent.
- Der helle Hintergrund des vorhandenen `logo-icon.png` bleibt bewusst erhalten. Keine Transparenzbearbeitung: Sie würde die dunkelblauen Logoanteile auf der Navy-Sidebar schwächen und die feinen Negativräume verändern.
- Produktname rechts daneben oder direkt darunter klar lesbar und visuell mit dem Symbol gruppiert.
- Brand-Block darf mehr Präsenz als bisher erhalten, soll die Navigation aber nicht nach unten verdrängen.
- Dunkles Navy bleibt die tragende Sidebar-Fläche; Türkis/Mint nur als Licht- oder Konturakzent.
- Mobile: Symbol ungefähr 34–40 px, Produktname weiterhin lesbar; kompakte Navigation und bestehende Höhenkorrektur nicht regressieren.
- `alt="Customer Success AI Hub"` beibehalten bzw. korrekt setzen.
- Keine Animation in der dauerhaften Navigation. `prefers-reduced-motion` bleibt respektiert.

## Optionaler späterer Animations-Use-Case

Ein vorhandenes GIF oder MP4 wird separat geprüft. Geeignete Verwendung wäre ein einmaliger Präsentationseinstieg oder eine spätere Landingpage, nicht ein dauerhaft loopendes Sidebar-Logo. Diese Animation ist nicht Teil dieses Sprints, solange die Datei nicht geprüft und freigegeben wurde.

## Technische Grenzen

- Voraussichtliche Dateien: `index.html`, `src/styles.css`.
- Keine Änderung an App-Logik, Navigation, Daten, APIs, n8n oder Scoring.
- Keine neuen externen Assets oder Bibliotheken.
- Keine generierte oder chroma-key-basierte Logoversion verwenden; ausschließlich das vorhandene Original-Asset.
- Bestehende uncommitted Änderungen bewahren.
- Kein Commit und kein Push.

## Akzeptanzkriterien

- Logo-Symbol ist bei 1440 × 900 auf den ersten Blick erkennbar.
- Bei 1024 × 768 bleibt der Brand-Block ruhig und proportional.
- Bei 390 × 844 bleiben Logo, Produktname und Navigation kompakt ohne unnötige Navy-Leerfläche.
- Bild wird nicht verzerrt oder wesentlich beschnitten.
- Kein horizontales Dokument-Scrolling.
- `npm test` und `git diff --check` erfolgreich.

## Abschlussbericht von Claude

Status: umgesetzt am 2026-08-14. Kein Commit, kein Push, kein neuer Sprint gestartet.

**Geänderte Dateien**

- `index.html` — Sidebar-Logo-`<img>` von `assets/logo-full.jpg` auf `assets/logo-icon.png` umgestellt; `alt="Customer Success AI Hub"` unverändert beibehalten. Keine sonstige Markup-Änderung.
- `src/styles.css` — `.sidebar-logo` (Desktop und die bestehende ≤900px-Mobile-Regel) sowie `.sidebar-brand`-Padding angepasst. Keine sonstigen Selektoren verändert.

Ausschließlich das vorhandene Original-Asset `assets/logo-icon.png` (512×512, unverändert auf der Festplatte) wird verwendet — keine Bildbearbeitung, keine Transparenz-/Chroma-Key-Version, keine generierte oder pinke Variante, kein neues Asset.

**Designumsetzung**

- Logo wird vollständig sichtbar dargestellt (`object-fit: contain`, kein Zuschnitt) statt des vorherigen `object-fit: cover`-Ausschnitts von `logo-full.jpg`.
- Desktop: `.sidebar-logo` 56 × 56 px (innerhalb der geforderten 52–60 px) — der helle, im PNG bereits vorhandene Hintergrund bildet zusammen mit `background:#fbfdfd`, 6 px Padding und `box-sizing:border-box` eine weiße/sehr helle Logo-Kachel; moderater Radius (`var(--radius-md)`, 10 px); feine Kontur (`1px solid rgba(94,234,212,0.4)`, Mint-getönt); sehr dezenter Akzent über einen zweistufigen `box-shadow` (schwacher Teal-Ring + weicher dunkler Schlagschatten) statt lauter Farbfläche. Keine Transparenzbearbeitung der Bilddatei selbst — nur CSS-Hintergrund/-Rahmen um das unveränderte, weiterhin voll deckende PNG.
- Produktname bleibt wie im Ausgangszustand rechts neben dem Symbol, visuell durch `.sidebar-brand`s Flex-Gruppierung mit ihm verbunden; Schriftgröße unverändert (bereits klar lesbar), um das Risiko einer Layoutverschiebung nicht unnötig zu erhöhen.
- `.sidebar-brand`-Padding-unten von `var(--space-5)` (24px) auf `var(--space-4)` (16px) reduziert, um die durch das größere Symbol gewonnene Präsenz nicht 1:1 an zusätzlicher Blockhöhe zurückzugeben — die Navigation beginnt dadurch nur ca. 8 px tiefer als vorher (vorher Logo 34px+24px Padding ≈ 58px Blockhöhe, jetzt 56px+16px ≈ 96px inkl. oberem Sidebar-Padding; siehe Messwerte unten), nicht in vollem Umfang der Symbolgrößenzunahme.
- Mobile (≤900px, bestehende Media Query): Symbol 36 px (innerhalb 34–40 px), Padding auf 4px reduziert, Radius auf `var(--radius-sm)` verkleinert — gleiche Kachel-Optik, kompakter. Die in der Sprint-05B-Korrekturrunde behobene „leere Navy-Fläche"-Regression wurde erneut geprüft und bleibt behoben (siehe Messwerte).
- Keine Animation ergänzt; `prefers-reduced-motion` unberührt, da keine neuen Transitions/Keyframes eingeführt wurden.

**Messwerte je Viewport** (per Browser-DOM-Messung, keine AI-Buttons ausgelöst)

- 1440 × 900: Logo 56×56px, `object-fit: contain`, weißer Hintergrund (`rgb(251,253,253)`), Radius 10px, feine Mint-Kontur + Teal-Schatten; Brand-Block endet bei y=96px, Navigation beginnt exakt dort (kein Sprung/Überlappung); kein horizontales Overflow.
- 1024 × 768: identisch zu 1440 (beide oberhalb des 900px-Mobile-Breakpoints) — Brand-Block ruhig und proportional, keine Abweichung.
- 390 × 844: Logo 36×36px, Radius 6px; Sidebar-Gesamthöhe 148px (vorher, vor Sprint 06B, 143px — moderate, erwartete Zunahme durch das größere Symbol); Navigation endet bei y=140px, nur 8px Padding-Lücke bis Sidebar-Ende — keine unnötige Navy-Leerfläche; kein horizontales Overflow.

**Regressionsprüfung**

Alle 6 Tabs bei 1440 × 900 aktivierbar geprüft, keine Konsolenfehler. AI-Copilot-/Ask-Buttons wurden während der gesamten Browserprüfung bewusst nicht ausgelöst.

**Abschlussprüfung**

- `npm test`: **74/74 grün**, keine Regressionen.
- `git diff --check`: Exit 0 (nur bekannte, harmlose CRLF-Warnungen).

**Bekannte Restrisiken**

- Keine. Änderung ist rein visuell auf die Sidebar-Marke begrenzt; App-Logik, Navigation, Daten, APIs, n8n und Scoring wurden nicht angefasst; bestehende uncommittete Änderungen aus vorherigen Sprints bleiben unverändert erhalten.
