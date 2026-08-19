// QBR Master-Template PPTX — geometry-based text capacity model.
//
// Replaces arbitrary character-count guesses with an estimate derived from
// the master's OWN real shape geometry (EMU box size, font size, insets),
// per the 2026-08 feasibility-spike decision. Calibrated against the
// master's own placeholder text in its own boxes (see the spike report):
// intentionally on the strict side of what PowerPoint's own autofit would
// silently allow, because autofit has no guaranteed minimum readable size.
//
// Model:
//   avgCharWidth  ≈ fontSizePt * 0.50 / 72 in   (Source Sans 3, proportional)
//   lineHeight    ≈ fontSizePt * 1.20 / 72 in
//   capacityChars ≈ floor(textAreaWidthIn / avgCharWidth)
//                   * floor(textAreaHeightIn / lineHeight) * 0.85 fillEfficiency
const EMU_PER_IN = 914400;
const AVG_CHAR_WIDTH_EM = 0.50;
const LINE_HEIGHT_MULT = 1.20;
const FILL_EFFICIENCY = 0.85;
export const MIN_READABLE_PT = 11; // approved floor — never shrink below this
export const MAX_SHRINK_PT = 2;    // small approved controlled-shrink range

export function estimateCapacity({ boxW_emu, boxH_emu, fontSizePt, insets_emu }) {
  const textW_in = (boxW_emu - insets_emu.l - insets_emu.r) / EMU_PER_IN;
  const textH_in = (boxH_emu - insets_emu.t - insets_emu.b) / EMU_PER_IN;
  const avgCharW_in = (fontSizePt * AVG_CHAR_WIDTH_EM) / 72;
  const lineH_in = (fontSizePt * LINE_HEIGHT_MULT) / 72;
  const charsPerLine = Math.floor(textW_in / avgCharW_in);
  const maxLines = Math.max(1, Math.floor(textH_in / lineH_in));
  const capacityChars = Math.floor(charsPerLine * maxLines * FILL_EFFICIENCY);
  return { charsPerLine, maxLines, capacityChars };
}

// Controlled font-shrink search (0.5pt steps, never below MIN_READABLE_PT,
// never more than MAX_SHRINK_PT below the shape's approved size). Returns
// 'fits' | 'shrink-font' | 'overflow' — 'overflow' means the caller must
// block export with a field-level warning, never truncate silently.
export function planFit(shape, text) {
  const len = (text || "").length;
  const base = estimateCapacity(shape);
  if (len <= base.capacityChars) {
    return { action: "fits", fontSizePt: shape.fontSizePt, capacityChars: base.capacityChars };
  }
  for (let d = 0.5; d <= MAX_SHRINK_PT; d += 0.5) {
    const shrunk = shape.fontSizePt - d;
    if (shrunk < MIN_READABLE_PT) break;
    const cap = estimateCapacity({ ...shape, fontSizePt: shrunk });
    if (len <= cap.capacityChars) {
      return { action: "shrink-font", fontSizePt: shrunk, capacityChars: cap.capacityChars };
    }
  }
  return { action: "overflow", fontSizePt: shape.fontSizePt, capacityChars: base.capacityChars };
}
