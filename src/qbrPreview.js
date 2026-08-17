// QBR Repair & Hardening — the actual internal/customer-safe security
// boundary, extracted as a pure function so it's directly testable: the
// Customer QBR Preview must NEVER read `internal` or the original
// `customerSafeDefault` from a section — only a section a human has
// explicitly marked `included`, with their own (possibly edited) non-empty
// `safeText`, may ever reach the preview. Used by src/app.js's
// renderQbrPreview(), which then renders `s.title` + `review[s.key].safeText`
// only — never `s.internal`.
export function selectCustomerSafeSections(sections, review) {
  return sections.filter(s => {
    const r = review[s.key];
    return Boolean(r) && r.included === true && r.safeText.trim().length > 0;
  });
}
