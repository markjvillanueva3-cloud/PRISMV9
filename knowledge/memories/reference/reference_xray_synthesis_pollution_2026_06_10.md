---
name: reference_xray_synthesis_pollution_2026_06_10
description: blueprint-vision_synthesis.md is polluted with off-domain (post-processor/holder/Fusion) content — recall-precision bug in the fleet-wide galaxy synthesis tool
type: reference
galaxy: blueprint-vision
source: prism-memory
synced: 2026-06-27T20:30:47.278Z
aliases: reference_xray_synthesis_pollution_2026_06_10
---


**Finding (2026-06-10, xray d00dc7c4):** the auto-generated domain synthesis `knowledge/memories/patterns/blueprint-vision_synthesis.md` — which is **auto-injected into every xray session's context** (slot-context-bundle "domain synthesis" line) — is **polluted**: its "Recurring patterns" / "Key decisions" / "Open threads" are entirely about **post-processors, tool-holders (taper/contact taxonomy), Fusion tooling DB, and brain-refresh locks** — NONE of which is blueprint-vision (OCR / blueprint / CAD-extraction). Verified by reading the file directly.

**Root cause:** `scripts/galaxy-reflection-synthesis.mjs` builds the synthesis from "24 domain-relevant memories via the A6/A3 hybrid recall." `gatherGalaxyMemories()` runs `runMemoryIndexSearch(query, {topK})` where `query` is auto-extracted *generic galaxy vocabulary* from the brain body. Generic manufacturing terms (CAD, tooling, holder, post) match the recently fleet-dominant post-processor/holder memories (echo/romeo/juliett have been very active) → BM25/semantic ranks those above the sparse blueprint-vision-tagged memories → pollution. It is a **recall-precision** problem, not a content problem.

**Impact:** every xray session wastes context budget on, and is mildly misled by, off-domain "open threads." The AUTHORITATIVE current brain is the galaxy `MEMORY.md` (`mcp-server/src/engines/blueprint-vision/MEMORY.md`) — trust that, NOT the synthesis. The synthesis is `advisoryOnly:true, mustHumanVerify:true` (correctly caveated), so it is not load-bearing.

**Fix ownership:** the synthesis recall is a FLEET-WIDE tool affecting all 34 galaxies (other domains may be polluted too — worth a fleet audit). Proper fix = make `gatherGalaxyMemories` prefer/filter by `metadata.galaxy` tag (boost galaxy-tagged memories, or require a domain-specific token), owned by **sierra/india** (the synthesis-tool owners). NOT a safe drive-by from an xray OCR session — flagged here for the owner. Regenerating with the same broken recall reproduces the pollution, so a regen alone does not fix it.

Links: [[blueprint-vision_synthesis]] · [[galaxy-reflection-synthesis]] · galaxy MEMORY.md §"OCR corpus training — live state".
