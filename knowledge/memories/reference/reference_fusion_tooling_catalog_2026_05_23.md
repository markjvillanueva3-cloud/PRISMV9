---
name: fusion-tooling-catalog-2026-05-23
description: "2026-05-23 mike /goal session — Fusion 360 .hsmlib XML extractor + live 712-tool / 329-preset / 8-library speed-feed backbone catalog. Closes the JM Die fusion_tool_lib_gap from the lathe post audit. Bravo (lathe-domain) can now seed lathe-keyed .hsmlib from the cross-lib type backbone."
aliases: reference_fusion_tooling_catalog_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.583Z
---


# Fusion 360 Tooling Catalog Extractor — mike 2026-05-23

## Mandate

Sister unit to [[jm-lathe-post-audit-2026-05-23]]. User /goal explicit clause:

*"extract tooling catalog from fusion libraries to use for the back bone of tooling data and speed and feed parameters"*

The lathe-post audit flagged `fusion_tool_lib_gap=true` — NO lathe-keyed `.hsmlib` exists in JM Die's `My Libraries/` folder. This unit ships the extractor + backbone JSON so bravo (lathe-domain) can derive lathe libraries from the existing mill/EDM data.

## Shipped

slot/mike worktree, commit subject `[FUSION-TOOLING-EXTRACT]/U-MIKE-FUSION-TOOLING-CATALOG`:
- `scripts/extract-fusion-tooling-catalog.mjs` — pure-function `.hsmlib` parser (11 exports)
- `scripts/extract-fusion-tooling-catalog.test.mjs` — 16/16 vitest PASS
- `state/shared/FUSION-TOOLING-CATALOG-2026-05-23.json` (974 KB) — live extraction output

## Catalog summary

| Source library | Tool count |
|----------------|-----------:|
| Haas Engraver.hsmlib | 8 |
| Haas VF-2 New.hsmlib | 118 |
| Haas VF-2 Old.hsmlib | 93 |
| Haas VF-3.hsmlib | **383** |
| HURCO.hsmlib | 99 |
| ROKU-ROKU - COPPER.hsmlib | 9 |
| ROKU-ROKU - GRAPHITE.hsmlib | 2 |
| Tool Holders.hsmlib | 0 |
| **Total** | **712** |

712 tools / 329 presets / 16 distinct tool types.

## Speed/feed backbone (top types — for bravo's lathe seeding)

| Tool type | n | Dia range (in) | Spindle rpm (min..med..max) | Feed cut (min..med..max) |
|-----------|---:|----------------|------------------------------|---------------------------|
| drill | 258 | 0.078 – 1.531 | 436 / 5000 / 5000 | — |
| flat end mill | 96 | 0.015 – 1.0 | 3000 / 7500 / 11500 | 254 / 1016 / 4242 |
| bull nose end mill | 87 | 0.063 – 2.5 | 994 / 7000 / 13483 | 381 / 2210 / 4801 |
| tap (RH) | 82 | 0.118 – 1.0 | 150 / 5000 / 11500 | — |
| ball end mill | 68 | 0.015 – 0.75 | 5000 / 7000 / 15000 | 127 / 1270 / 2667 |
| face mill | 55 | 0.5 – 3.0 | 955 / 1500 / 6672 | 127 / 1016 / 8636 |
| chamfer mill | 15 | 0.25 – 2.57 | 2000 / 7500 / 10000 | 635 / 1270 / 1270 |
| reamer | 13 | 0.118 – 0.754 | 1528 / 5000 / 9633 | — |
| spot drill | 12 | 0.25 – 0.75 | 500 / 560 / 6000 | 25 / 1524 / 1524 |

## Bug found + fixed (R12 fail-loud)

First regex `<tool\b([^>]*)>` matched `<tool-library>` because `\b` matches at the `l` → `-` word-boundary. Symptom: extractor reported 1 tool per library instead of N (and the cross-lib pool test "buildCatalog pools speed/feed across libs per tool type" hit `Cannot read properties of undefined`). Fix: require whitespace — `<tool\s+([^>]*)>`. **Lesson:** word-boundary on hyphenated tag names is a sharp edge; prefer explicit whitespace assertion when the wrapper tag is a prefix of the element tag. Mirror-class to wiki [[regex-word-boundary-hyphen-collision]] (planned).

## Entry-point guard (Windows)

Original `if (import.meta.url === \`file://${process.argv[1]...}\`)` failed silently on Windows because `import.meta.url` produces `file:///H:/...` (triple slash) while `file://` + path gives double. Fixed with `fileURLToPath()` + slash-normalize on both sides. Same fix pattern as the [[reference_jm_lathe_post_audit_2026_05_23|JM-LATHE-POST-AUDIT]] script.

## PSN synergy touched

- **Engines** — none (script-only; intentional, extractor is read-only infra)
- **System-viz** — next graph regen will pick up the catalog JSON as L8 leaf and the script as L10 leaf under `scripts/`
- **Memory** — this memo + cross-ref to [[jm-lathe-post-audit-2026-05-23]]
- **Wiki** — companion entry `knowledge/wiki/architecture/fusion-tooling-catalog-extraction.md` (in same commit chain)
- **RECENT-SHIPMENTS-2026-05-23.md** — appended under MIKE rollup

## Domain handoff (bravo)

Punch list bravo can now action with the backbone JSON:

1. **Seed `OKUMA_LATHE_DRILL.hsmlib`** — use the drill backbone (n=258, rpm med 5000) cross-walked to lathe spindle equivalents (note: lathe is workpiece-rotation, not tool-rotation — RPM directly applies to chuck SFM math, feed → ipr conversion via spindle rpm).
2. **Seed `OKUMA_LATHE_TURNING.hsmlib`** — bull-nose / face-mill diameter spread maps to turning-insert nose-radius + DOC ranges.
3. **Seed `OKUMA_LATHE_THREADING.hsmlib`** — tap (RH) catalog gives thread-pitch + RPM envelope.
4. **Material cross-walk** — backbone has `materials` histogram per type (`carbide` dominant); feed scaling per Kienzle kc1.1 per ISO group from `mcp-server/src/physics/constants.ts`.
5. **Post-processor coupling** — the 7 LTH-* posts from [[reference_jm_lathe_post_audit_2026_05_23|JM-LATHE-POST-AUDIT]] can ingest the seeded `.hsmlib` via Fusion's tool-library selector for downstream G-code generation.

## Verification commands

```bash
node H:/prism-slot-mike/scripts/extract-fusion-tooling-catalog.mjs
cd H:/prism-slot-mike && npx vitest run scripts/extract-fusion-tooling-catalog.test.mjs
node -e "const c=require('H:/prism-slot-mike/state/shared/FUSION-TOOLING-CATALOG-2026-05-23.json'); console.log(c.summary)"
```

## Cross-refs

- Sister unit (lathe post audit): [[jm-lathe-post-audit-2026-05-23]]
- Race-mitigation patterns this session: [[mike-bridge-wiring-race-mitigation-2026-05-23]]
- Slot soul (mike = misc-catcher, lathe-domain belongs to bravo): [[reference_juliett_12chat_allocation_2026_05_17|JULIETT-12CHAT-ALLOCATION]]-MS0 in CLAUDE.md
