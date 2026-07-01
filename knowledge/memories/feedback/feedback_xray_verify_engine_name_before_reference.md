---
name: feedback_xray_verify_engine_name_before_reference
description: Glob/Grep an engine/path name on disk before enshrining it in any doc — the alpha-seed hallucination class
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.455Z
aliases: feedback_xray_verify_engine_name_before_reference
---


Standing rule for slot:xray (and any galaxy-doc author): NEVER write an engine / dispatcher-action / file path into a CLAUDE.md, MEMORY.md, PATHS.md, or soul without first confirming it exists on disk (`Glob`, `Grep`, or `[ -f <path> ]`).

**Why:** the alpha galaxy seeds were generated from plausible-but-unverified naming conventions. The blueprint-vision seed named 21 `CAD*Engine` classes that don't exist; the corpus/script/ledger paths were 3-for-3 wrong (no `PRINTS/` dir, no `lima-pypdf-page-extract.mjs`, no `blueprint-extraction-log.jsonl`). bravo "corrected 3 asset-hallucination errors" and india "~6 alpha-hallucinated paths" in their buildouts — this is a recurring class. A wrong path in a PATHS.md (an O(N)→O(1) atlas) is actively harmful: it sends every future session chasing ghosts.

**How to apply:** in any galaxy/awareness doc, treat every named asset as a claim to verify. One `Glob mcp-server/src/engines/<Name>.ts` per name. Mark phantom names explicitly under a `## Phantom paths` section so the next author doesn't re-add them. Per [[feedback_verify_actual_contract_not_proxy]] · [[reference_xray_engine_inventory_verified_2026_05_29]].
