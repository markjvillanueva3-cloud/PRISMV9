---
title: Fusion 360 .hsmlib Tooling-Catalog Extraction
type: architecture
status: shipped
unit: U-MIKE-FUSION-TOOLING-CATALOG
slot: mike
date: 2026-05-23
---

# Fusion 360 `.hsmlib` Tooling-Catalog Extraction

Reads HSMWorks tool-library XML (`.hsmlib`) and emits a structured speed/feed catalog JSON that the rest of PRISM can consume.

## Why this exists

JM Die's Fusion 360 `My Libraries/` folder holds 8 mill/EDM tool libraries totalling **712 tools / 329 presets**. None are lathe libraries. The lathe-post audit (`JM-LATHE-POST-AUDIT-2026-05-23`) flagged this gap. This extractor unlocks the existing data so a downstream unit (bravo, lathe-domain) can seed lathe-keyed libraries by cross-walking from the mill data — drill rpm/feed envelopes, end-mill diameter spreads, tap pitch ranges, etc.

## File format

`.hsmlib` files are **UTF-16 LE** XML with the HSMWorks `tool-library` schema:

```
<?xml version="1.0" encoding="UTF-16" standalone="no"?>
<tool-library xmlns="http://www.hsmworks.com/xml/2004/cnc/tool-library" guid="{...}" version="14">
  <tool guid="{...}" type="end mill" unit="inches" version="1.5">
    <description>3/16 End Mill</description>
    <manufacturer>OSG</manufacturer>
    <nc number="5" diameter-offset="5" length-offset="5" turret="0" live-tool="1" .../>
    <coolant mode="flood"/>
    <material name="carbide"/>
    <body diameter="0.1875" number-of-flutes="3" flute-length="0.94" overall-length="3" .../>
    <holder description="ER20 Collet" comment="High-speed"/>
    <presets>
      <preset id="{...}" name="Default Preset">
        <parameter key="tool_spindleSpeed" value="12000"/>
        <parameter key="tool_feedCutting" value="40"/>
        <parameter key="tool_feedPlunge" value="20"/>
        <parameter key="tool_feedEntry" value="40"/>
        <parameter key="tool_feedExit" value="40"/>
        <parameter key="tool_feedRamp" value="20"/>
        <parameter key="tool_coolant" value="flood"/>
      </preset>
    </presets>
  </tool>
  ...
</tool-library>
```

Key design notes for parsers:
- Encoding is UTF-16 LE with a BOM (`0xFF 0xFE`). Read as Buffer then decode `buf.toString("utf16le")` and strip the BOM character.
- `<parameter>` elements inside `<preset>` are self-closing (`/>`); units depend on the parent `<tool unit="inches">` attribute — `tool_feedCutting` is in/min for `unit="inches"` and mm/min for `unit="millimeters"`.
- `tool_spindleSpeed` is always rpm.

## Architecture

Pure-function ESM module — no I/O outside `node:fs`, no dependencies. 11 named exports:

| Export | Purpose |
|--------|---------|
| `readHsmlibText(path)` | Read file, decode UTF-16 LE → UTF-8 text |
| `attr(tagText, name)` | Extract one attribute value from an opening tag |
| `textElem(toolXml, name)` | Extract text content of a simple `<x>...</x>` (decodes `&quot;`, `&amp;`, `&lt;`, `&gt;`, `&apos;`) |
| `selfElem(toolXml, name)` | Extract attributes of a self-closing `<x .../>` |
| `extractPresets(toolXml)` | Pull all `<preset>...</preset>` blocks → `[{id, name, description, parameters}]` |
| `parseToolXml(openAttrs, toolXml)` | Build one structured tool record |
| `extractTools(text)` | Walk a library text, return tool array |
| `parseHsmlib(path)` | Parse one whole `.hsmlib` end-to-end |
| `listHsmlibFiles(dir)` | Enumerate `.hsmlib` files in a directory |
| `summarizeLibrary(lib)` | Per-type histogram for one library |
| `buildCatalog({libraries, generatedAt})` | Aggregate multi-library catalog |

## Output shape

`state/shared/FUSION-TOOLING-CATALOG-2026-05-23.json` (974 KB):

```jsonc
{
  "schemaVersion": "1.0.0",
  "generatedAt": "2026-05-24T03:48:53.211Z",
  "advisoryOnly": true,
  "must_human_verify": true,
  "domain_handoff_to": "bravo (lathe-domain owner per JULIETT-12CHAT)",
  "summary": { "library_count": 8, "total_tools": 712, "total_presets": 329, "distinct_tool_types": 16 },
  "libraries": [ { library_file, library_guid, library_version, tool_count, per_type_stats } ],
  "speed_feed_backbone_by_type": {
    "drill": { count, diameters_in: {n, min, median, max}, spindle_rpm: {...}, feed_cutting: {...}, feed_plunge: {...}, materials: {carbide: 250, hss: 8} },
    ...
  },
  "raw_tools": [ { ...tool, source_library } ],
  "notes": [ ... ]
}
```

`speed_feed_backbone_by_type` is the **value bucket** — pooled across all libraries by tool type. Bravo uses this to derive starting values for lathe `.hsmlib` seeding.

## R12 bug fix (regex word-boundary collision)

First pass used `<tool\b([^>]*)>` and reported 1 tool per library instead of 99+. `\b` matches at the `l → -` transition, so the regex matched `<tool-library>...</tool>` as a giant pseudo-tool, swallowing the actual first inner `<tool>` element. Fix: require whitespace after the tag name — `<tool\s+([^>]*)>`. Locked by test:

```js
it("extracts every <tool> from a multi-tool library", () => {
  const tools = extractTools(SAMPLE_LIBRARY_XML);
  expect(tools.length).toBe(2);  // FAILS pre-fix (returns 1)
});
```

Generalises to any HSMWorks-style XML where the wrapper-tag-name is a prefix of the element-tag-name.

## Windows entry-point guard

Used `fileURLToPath(import.meta.url)` + slash-normalised compare with `process.argv[1]` instead of string-concat `file://...` — the latter mismatches Windows triple-slash file URLs and the main() body silently skipped.

## Verification

```bash
# Run live extraction (writes catalog JSON to state/shared/)
node H:/prism-slot-mike/scripts/extract-fusion-tooling-catalog.mjs \
  --out H:/prism-slot-mike/state/shared/FUSION-TOOLING-CATALOG-2026-05-23.json

# Single-library mode (useful for spot-checking)
node H:/prism-slot-mike/scripts/extract-fusion-tooling-catalog.mjs --library HURCO

# Test suite
cd H:/prism-slot-mike && npx vitest run scripts/extract-fusion-tooling-catalog.test.mjs
# expect: 16/16 PASS
```

## Cross-refs

- Sister unit (post audit): `knowledge/wiki/architecture/jm-lathe-post-audit.md` (planned)
- Memory: `[[reference_fusion_tooling_catalog_2026_05_23]]`, `[[reference_jm_lathe_post_audit_2026_05_23]]`
- Race-mitigation patterns used this session: `[[mike-bridge-wiring-race-mitigation-2026-05-23]]`
