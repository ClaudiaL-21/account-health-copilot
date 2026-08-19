# QBR_Customer.pptx — bundled master template

This is the design-approved QBR customer-presentation master, patched only
for a technical pptx-automizer compatibility issue — **no visual change**.

## The patch

The master's SVG chart images (Health & Adoption trend backgrounds) store
their image reference only inside the OOXML SVG extension
(`<a:blip><a:extLst>...<asvg:svgBlip r:embed="rIdX"/>...`), with no
`r:embed` on the outer `<a:blip>` itself. This is valid OOXML and renders
correctly in PowerPoint, but pptx-automizer's shape-type detector requires
`r:embed` directly on the outer `<a:blip>` and throws `ElementNotFoundError`
without it.

The patch (see the session's feasibility-spike scripts) duplicates the same
`r:embed` value onto the outer `<a:blip>` — redundant with the value already
present in the SVG extension, changes no pixel, verified via COM-rendered
screenshots against the untouched original.

## Regenerating this file

If the design team supplies an updated master, re-run the same patch before
replacing this file — otherwise `src/qbrMasterRenderer.js` will fail on the
chart slides. See the patch script referenced in the Block B implementation
notes (2026-08).
