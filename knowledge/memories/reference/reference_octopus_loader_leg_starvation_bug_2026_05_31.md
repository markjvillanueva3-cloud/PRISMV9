---
name: reference_octopus_loader_leg_starvation_bug_2026_05_31
description: SHIPPED-CODE BUG found by smoke-test — octopus-corpus-loader degrades to 1/5 PSN legs (master_index only) + 17.7s latency against real on-disk data, because the index-leg stage loads the 543MB graph and eats the whole deadline before wiki/memories/tribal/skills run. #1 Wave-3 fix for PSN-OCTOPUS-FLEET-SYNERGY-MS0.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.236Z
aliases: reference_octopus_loader_leg_starvation_bug_2026_05_31
---


2026-05-31 (slot:bravo). R12 "prove it works" smoke-test of the just-shipped octopus corpus
loader (`scripts/lib/octopus-corpus-loader.mjs`, P0-P1 / `5cb68aaad3`) against REAL on-disk data,
mill query `"kienzle cutting force tool life taylor wear"`, topK=4:

```
LEGS: ["master_index"]          # ONLY 1 of 5 legs returned
legCounts: {"master_index":4}
totalSnippets: 4 | errors: ["deadline-before:wiki"] | durationMs: 17726
REDACTION_LEAK_DETECTED: false  # redaction + private-mem gate HOLD (good)
[master-index-search-lib] system-graph 543.4MB > cap 200MB — falling back to architecture-graph (51.3MB)
```

**The bug:** `loadPsnCorpora` runs the **index legs (tribal + master_index) FIRST** (loader ~L424-435,
they reuse `master-index-search-lib`), THEN the cheap filesystem legs (wiki/memories/skills, ~L437-448).
The index-leg stage loads the 543MB→51MB graph and burns **17.7s**, blowing the per-call deadline
(`DEFAULT_DEADLINE_MS`, clamped 200-30000) before the fs legs ever run → every fs leg is skipped with
`deadline-before:<leg>`. Net: the octopus only ever sees **master_index**, never wiki/memories/tribal/skills.

**Why all 58 unit tests still pass:** they use small/mocked legRoots where the graph load is cheap and
the deadline never trips. The starvation only manifests against the real 543MB graph. Classic
"green in isolation, broken in production" — exactly what the R12 smoke-test is for.

**Blast radius:** RAG-starves the multi-model consensus (sees ~1/5 of the corpus); P6 leg-coverage dial
(`94bb94d022`) under-reports; 17s/call latency makes live dispatch impractical.

**Fix — SHIPPED `a6e4f165a8` (U-FLEET-P1-LEG-STARVATION-FIX, 2x scrutiny PASS):**
1. ✅ **Reorder** — the bounded fs legs (wiki/memories/skills) now run BEFORE the index legs, so a slow
   graph can't starve them. Pure reorder; redaction/private-mem gate untouched (they live inside
   `loadFsLeg`/`resolveMemoryRoots`). Smoke: **1→4 legs, 17.7s→2.6s**, redaction holds.
2. ✅ **Skip knob** — `PRISM_OCTOPUS_SKIP_INDEX_LEGS=1` skips the expensive index legs entirely
   (latency escape hatch: 54ms, 3 fs legs). The blocking master-index graph load can't be interrupted
   mid-flight, so a knob is the only in-loader latency lever short of #3.
3. ⏳ **Latency root cause (STILL OPEN)** — the real fix is a fresh `build-graph-index.mjs` sidecar +
   honoring the 200MB cap (the 543MB graph forces the 51MB architecture-graph fallback that costs ~2.2s).
   Separate infra unit; the reorder already restores coverage regardless.
4. ✅ **Regression tests** — 3 fail-on-revert locks: injected-slow-index-stage (DI seam + 500ms deadline
   vs 800ms stub), budget-cap priority (fs legs win `truncateCorporaToBudget`), and the skip-knob path.
   Reviewer B empirically confirmed all fail on revert (22/22 suite green).

Remaining Wave-3 after this: latency-sidecar (#3 above) · P1 corpus-tuning for deep-corpus domains
(wedm/speed-feed/cam/cad/post-proc) · P4 ledger-roosts (hermes-zulu/[[feedback_golf_owns_reaper|fleet-hygiene]]/database-expansion).

Belongs in `## Recent regressions` + the bug-finding-wiki-gate flow on fix. Wiki:
[[psn-octopus-fleet-synergy-ms0]]. Parent: [[reference_psn_octopus_fleet_synergy_2026_05_31]].
