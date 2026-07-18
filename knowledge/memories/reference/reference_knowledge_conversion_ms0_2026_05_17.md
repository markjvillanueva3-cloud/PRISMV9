---
name: reference-knowledge-conversion-ms0-2026-05-17
description: "KNOWLEDGE-CONVERSION-MS0 shipped 2026-05-17 (slot india, claude-41db1b82) — 4 phases / 7 units / 6 commits. Three-lane model (A direct-wire / B port-verify / C /forge-gated) routes MIT-OCW + monolith data into PRISM's 6 node-types."
aliases: reference_knowledge_conversion_ms0_2026_05_17
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.635Z
---


# KNOWLEDGE-CONVERSION-MS0 — shipped 2026-05-17

Slot **india** (claude-41db1b82). Closes the extracted-but-not-consumed gap
for both MIT-OCW courseware (65 candidates / 126 assets) and the v8.89
monolith extraction (12 formulas + 52 algorithms + 948 modules).

## Three-lane model — load-bearing

PRISM's no-stub / comprehensive-build-enforce / duplication-guard hooks
prevent LLM-generated stubs from polluting source. So conversion is split
by autonomy posture:

- **Lane A — direct-wire (autonomous-safe).** Target: tribal-knowledge tips.
  `scripts/course-to-tribal-tips.mjs` + `monolith-to-tribal-tips.mjs` emit
  `KnowledgeTip[]` into `cad-engine/knowledge_store/`. Engine auto-loads via
  `TribalKnowledgeEngine.loadDocumentLearnedTips()`. Round-trip verifiable
  through `prism_knowledge:tribal_search`.
- **Lane B — port (engineering, semi-autonomous).** Target: formulas +
  algorithms that already exist as real extracted code. Port = dedup check
  + verify + wire. U-KC-C1 (formulas) + U-KC-C2 (algorithms) both
  verification-only: 0 ports needed, 1 forge-candidate routed to Lane C.
- **Lane C — /forge-gated (human-in-loop).** Target: new
  engines/skills/hooks + course-derived proposals. `scripts/course-data-
  router.mjs` builds the ledger; operator runs `/forge-triple` on items.

## Six PRISM node-types course/monolith data can populate

| Node-type | Surface |
|-----------|---------|
| knowledge | `TribalKnowledgeEngine` → `prism_knowledge:tribal_search` |
| algorithm | `src/algorithms/*.ts` + `prism_calc:algorithm_*` |
| formula | `src/physics/constants.ts` + `prism_calc:<action>` (ALWAYS physics-reviewer gated) |
| engine | `src/engines/*.ts` |
| skill | `.claude/commands/*.md` (derived from technique clusters) |
| pipeline | `prism_orchestrate` / composed skill (derived) |

## Phase ship commits

| Phase | Unit | Commit | Note |
|-------|------|--------|------|
| 1 | U-KC-B1 (course tribal-tips) | `aa0335a8d` | 126 tips, 44/44 tests |
| 1 | U-KC-B2 (monolith tribal-tips) | `3d9324f2a` | 133 tips, 52/52 tests |
| 1 | U-KC-B3 (round-trip wiring) | `44980b391` | 8/8 tests, collision-absorbed under [AUDIT-TRIBAL-BRIDGE-FIX] |
| 2 | U-KC-C1 (formula verify) | `e4a48ebf3` | 12 files, 0 ports needed |
| 2 | U-KC-C2 (algorithm verify) | `05152dff62` | 52 files, 1 forge-candidate (ODESolvers) |
| 3 | U-KC-D1 (routing pipeline) | `cd00120dcd` | 30/30 tests, ledger `66aa07afa4` absorbed |
| 4 | U-KC-E1 (doc-reflection) | this commit | wiki + memory + plan-doc Phase 2/3/4 |

## Key reusable artifact

`scripts/lib/course-data-router-lib.mjs` — pure-core router (380 LOC, 14
exports, CamelCase-aware dedup, R12 fail-loud, advisoryOnly output). Same
router structure works for future external knowledge sources (PDF, video,
shop-floor capture): drop new items into `course-content-candidates.jsonl`
shape, rerun the CLI. Composes existing TribalKnowledgeEngine +
algorithms/engines inventories — no new dependencies.

## Live first-run numbers

65 candidates / 126 assets routed:
- TRIBAL-SHIPPED: 31 (Lane A — Phase 1 already shipped)
- FORGE-QUEUE: 69 (Lane C — real human-gated /forge candidates)
- DUPLICATE: 10 (Lane B — verify scope; some name-token false positives)
- DISCARD: 16 (below mfg-relevance floor)

Real candidates surfaced: `algorithm:operator-splitting` (course 10.34),
`algorithm:bernoullis-equation-solver` (1.060), `formula:moody-diagram-
analysis` (physics-reviewer first), `engine:lean-enterprise-engine` (16.852j).

## Doctrine pins preserved

- NEVER inline physics constants — formula path ALWAYS Lane C.
- NEVER auto-emit engines — router emits ADVISORY ledger only.
- R8 read-before-write — content cross-ref over name-match.
- R12 fail-loud — validators throw; unknown kinds DISCARD with audit trail.
- advisoryOnly + mustHumanVerify on every ledger.
- 1 real-data E2E test (RGS-TOOL-MS1 lesson).

## Future extensions

- `/forge-queue` slash-command — walks operator through 69 FORGE-QUEUE items.
- `ODESolversEngine` /forge — single Phase 2 gap (RK45/RK4-DP/BDF).
- `skill` + `pipeline` auto-detection via technique clustering.
- RGS6 threshold self-tuning from approve/reject rates.
- Apply router to `/pdf-learn` and `/video-learn` outputs (same schema).

Related: [[reference_tribal_graph_ms0_content_mine]] ·
[[reference_rgs_tool_autoinvoke_ms1_2026_05_16]] (for the pure-core + E2E
pattern) · [[reference_tribal_knowledge_search]] (JM Die test shop).
