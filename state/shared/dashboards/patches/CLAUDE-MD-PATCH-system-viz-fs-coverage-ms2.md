# CLAUDE.md PATCH — SYSTEM-VIZ-FS-COVERAGE-MS2 (charlie slot, 2026-05-20, U-SAF-B2 drain)

**Apply to**: `H:/PRISM/CLAUDE.md` between the existing `## SYSTEM-VIZ-FS-COVERAGE-MS0` block (if present) or the `## FLEET-MEMORY-MONITOR-MS0` block and the next family heading. Place under the SYSTEM-VIZ-FS-COVERAGE family so the SAF stale-family detector treats MS0 + MS1 + MS2 as siblings.

**Reason**: CLAUDE.md is golf-only-write. SAF baseline 2026-05-19 cat=5 flagged `SYSTEM-VIZ-FS-COVERAGE-MS2 missing` (sibling MS0 + MS1 wiki entries exist; CLAUDE.md only has MS0 reference). U-SAF-B2 drain produces this patch-sibling for golf to apply during its next drain pass.

---

## Insert this section under the SYSTEM-VIZ-FS-COVERAGE family:

### SYSTEM-VIZ-FS-COVERAGE-MS2 (2026-05-17..18, 4 units) — 4-tier dispatcher inference for unwired-engine ghosts

Closes the system-viz "ghost.unwired-engine" coverage gap from 39% → 98% (proposed-wire edges) across 810 engines on disk that had no dispatcher reference. 4 inference tiers stacked, each strictly additive over the prior, each capped to its own confidence band so downstream consumers can sort by certainty.

- **U-GHOST-UNWIRED** (`0148652887`) — 810 unwired-engine ghost nodes + 6 namespace walks. Baseline ghost emission from `audit-unwired-engines.mjs`; introduces the `ghost.unwired-engine` kind with `proposed_wiring` field. Initial confidence floor: keyword-only at 0.50 (UNKNOWN tail = 494).
- **U-GHOST-UNWIRED-TUNE** (`9ef5f995d9`) — 17 new keyword patterns. Expands the deterministic-keyword tier from 316 to 442 confidently-classified engines (UNKNOWN tail 494 → 331, +126 classified). Confidence band 0.50–0.85.
- **U-SIBLING-INFER** (`1644245953`) — sibling-prefix dispatcher inference. For engines that survived the keyword tier, walk wired siblings sharing the same filename prefix (e.g. `MillingFoo*Engine.ts` → `prism_cam` if 3/4 wired siblings route there). Statistical inference, confidence band 0.40–0.65 capped below keyword tier. UNKNOWN tail 331 → 139.
- **U-LLM-CLASSIFY** (`06f3fa418f`) — Ollama LLM-judgment final tier. `scripts/seed-ghost-llm-classify.mjs` (13 exports, 24 tests) batches the 139-engine UNKNOWN tail to `qwen2.5-coder:7b` via `/api/generate`; markdown-fence-tolerant JSON parser; dispatcher whitelist of 16 valid targets; failure-soft (Ollama unreachable → skip, batch timeout → log+skip, malformed JSON → skip). Routes 126/139 (91% success rate). Confidence: flat 0.55 (capped below sibling tier — LLM is the last resort, not the most certain).

**Cumulative coverage**: 39% → 98% (316/810 → 797/810). Graph state at MS2 close: 373,635 nodes · 592,239 → 592,365 edges (+126 LLM-derived).

**Anti-regression invariants**:
- Each tier writes to the SAME `proposed_wiring` field — later tiers never overwrite an earlier-tier classification (the keyword tier wins ties via its higher confidence band).
- LLM tier is the only tier requiring external service availability — 13/810 (1.6%) remaining UNKNOWN if Ollama is offline for an entire batch, not silent corruption.
- All 4 tiers are advisory — `ghost.unwired-engine` proposes the wiring; an operator (or the `seed-ghost-from-unwired.mjs` regen-viz post-merge stage) is the one that actually emits the ghost into the merged graph.

Wiki: [`knowledge/wiki/architecture/system-viz-fs-coverage.md`](knowledge/wiki/architecture/system-viz-fs-coverage.md) + [`system-viz-fs-coverage-ms1.md`](knowledge/wiki/architecture/system-viz-fs-coverage-ms1.md). Memory: queued — `reference_system_viz_fs_coverage_ms2_2026_05_17.md` (to be written by golf during drain).

---

## Drain notes for golf

When applying:
1. Search CLAUDE.md for the existing `SYSTEM-VIZ-FS-COVERAGE-MS0` reference; insert this MS2 block AFTER it. If no MS0 block exists, place above `## FLEET-MEMORY-MONITOR-MS0`.
2. Verify the 4 commit hashes still exist via `git log --oneline -E "SYSTEM-VIZ-FS-COVERAGE-MS2"` (4 commits expected: `0148652887`, `9ef5f995d9`, `1644245953`, `06f3fa418f`).
3. After insertion, run `node H:/prism/scripts/system-awareness-freshness-audit.mjs --json | jq '.findings | map(select(.category==5))'` — the MS2 finding should disappear from cat=5.
4. If a sister `reference_system_viz_fs_coverage_ms2_2026_05_17.md` memory file does not exist, golf should write one capturing the same content (advisory-side mirror per [[feedback_reflect_all_changes_post_update]]).

Once applied, this patch-sibling file becomes obsolete — golf may archive it via `state/shared/dashboards/patches/_archive/` or delete it.
