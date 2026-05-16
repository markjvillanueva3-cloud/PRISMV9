# RGS-TOOL-AUTOINVOKE — MS1 Punch List (post-ship 10-agent audit, 2026-05-16)

> Source: 10 parallel post-ship audit agents on the shipped MS0 (commits 04ccd9556..807e631d1).
> **Honest verdict: MS0 architecture is sound; the real reader-binding integration layer is broken.**
> The 97 MS0 unit tests passed because they injected FAKE readers — the bugs all live in the
> orchestrator's REAL reader factories (`makeTribalReader`, `makeCapabilitiesReader`, the Ollama
> URL/timeout) and the hook↔sidecar schema seam, none of which had an end-to-end integration test.
> **Core lesson:** hermetic unit tests with injected fakes do NOT prove the production wiring works.
> Any milestone with a "pure core + injected readers" design MUST also ship one real-data E2E test.

## P0 — correctness bugs (system produces noise until fixed)

| # | Bug | File | Fix |
|---|-----|------|-----|
| P0-1 | Tribal reader: `(hits??[]).map()` on `runTribalSearch`'s `{tokens,hits}` object → TypeError swallowed → `tribal:[]` on 100% of plans. `tip` also maps `h.tip/h.text/h.label` but real field is `h.title`. | `scripts/rgs-tool-planner.mjs` `makeTribalReader` | `const {hits}=await runTribalSearch(...); return hits.map(h=>({id:h.id,tip:h.title??"",score:h.score,domain:h.domain}))` |
| P0-2 | Ollama 0% offload — bug A: `ollama-hook-bridge.mjs` defaults `http://localhost:11434` → Node resolves IPv6 `::1`, Ollama is IPv4-only → ECONNREFUSED → `degraded` always. | `.claude/hooks/lib/ollama-hook-bridge.mjs:12` | default `http://127.0.0.1:11434` |
| P0-3 | Ollama 0% offload — bug B: `DEFAULT_TIMEOUT_MS=500` but qwen-7b takes 2.5–4.3s → every call AbortError. `makeOllamaReader` never overrides `timeoutMs`. | `rgs-tool-planner.mjs` `makeOllamaReader` | pass `timeoutMs:30000` to `queryOllama` |
| P0-4 | capabilities reader: `findInGraph` does full-phrase substring match; planner passes the ENTIRE unit text → 0 hits → `engines:[]`,`mcpTools:[]` always. | `rgs-tool-planner.mjs` `makeCapabilitiesReader` | tokenize text, query findInGraph per top-3-5 tokens, union; OR use `runMasterIndexSearch` |
| P0-5 | `/forge-triple` fires on 98.6% of units — envelope descriptions carry boilerplate `"forge-triple ownership in milestone header"` which the rule matches. | `scripts/lib/rgs-pipeline-rules.mjs` | title-scope the `forge.?triple` phrase match, or drop that branch (engine+hook branch already covers real cases) |
| P0-6 | Feedback loop severed ×3: (a) `pick-prefresh-inject` guards `entry.plan` but sidecar stores flat → 0 picked events ever; (b) composite-key `::` not in `UNIT_ID_RE` → shipped units misclassified `blocked`; (c) outcome record `{unitKey,outcome}` ≠ re-rank reader's expected `{pipeline,tier,verdict,shipped}` → re-rank always no-op. | `pick-prefresh-inject.mjs`, `rgs-plan-outcome.mjs` `extractOutcomes`, `rgs-tool-planner.mjs` `makeOutcomesReader` | (a) drop `.plan` nesting; (b) add `unitKey.split('::')[1]` to candidateIds; (c) redesign outcome record to aggregate per `(pipeline,tier,verdict)` |
| P0-7 | `coverage()` reads `entry.plan.source` (sidecar is flat) → `bySource` always `unknown`. | `scripts/rgs-plan-coverage.mjs:83` | `entry?.source` |
| P0-8 | `/rgs tool-plan` + `tool-plan-coverage` are Args menu entries with NO `## Route:` handler in rgs.md. | `.claude/commands/rgs.md` (gitignored) | add `## Route: tool-plan` + `## Route: tool-plan-coverage` sections |
| P0-9 | BUILD_STATE.json/.md still classify the milestone `not_started_real` despite envelope `completed` — 3-way drift (envelope/wiki/BUILD_STATE). | `state/shared/BUILD_STATE.*` | re-run `build-state-snapshot.mjs` after envelope is correct; verify drift clears |
| P0-10 | `rgs-outcome-record-stop.mjs` spawnSync git timeout 8000ms but settings.json harness timeout 3000ms → git child orphaned on kill. | `rgs-outcome-record-stop.mjs` | reduce spawnSync timeout to 2500ms (advisory hook — must not hold Stop) |

## P1 — quality / behavioral gaps

- Feedback loop will never accumulate data: operators don't type composite `MS::unit` keys → picked events never fire. Needs the hook to fall back to active-claim / CURRENT_POSITION.md.
- `complexityFor` heuristic: 57.6% of units have `effort:0` → all default to tier M; verdict regex crude. (Spec said use RoadmapIntelligenceEngine — undocumented divergence.)
- `_skill-triggers.jsonl`: 38 harness skills, ZERO manufacturing-domain skills → `skills` empty for most units. Pipeline rules: only 7 rules, no mill/lathe/wedm/cam/cad domain rules → 42% generic fallback; "Wire EDM" units false-match `/wire-unwired`.
- `sourceHash` separator is `\x00` in code but spec/plan say `""` — silent contract mismatch.
- Wiki documents 2 knobs (`PRISM_RGS_PLANNER_BATCH_SIZE`, `PRISM_RGS_PLAN_STALE_DAYS`) that don't exist in code.
- Resume is broken for invalid-skipped units (not checkpointed) → every run cold for the dominant class. Needs a skip-ledger.
- Checkpoint JSONL grows unbounded with duplicates; lock-refresh is dead code; lock acquire has TOCTOU.
- Coverage `coveragePct` is anti-GAP not anti-ROT (never compares sourceHash) — the "anti-rot metric" label overpromises.

## P1 — improvements (validated MS1 backlog, reordered by the audit)

1. **Nightly cron replan** (highest leverage) — Windows scheduled task, planner + Ollama, `--time-budget 60`. Without it the sidecar rots; everything else depends on live Ollama-synth plans. Pattern: `install-fleet-reaper-task.ps1`.
2. **Invalidate-on-pickup re-enqueue** — `pick-prefresh-inject` appends `replan-requested` to a queue JSONL on stale-hash; a drainer spawns `--unit`. Zero new infra.
3. **Dispatcher wiring** — `prism_dev:roadmap_tool_plan_{query,build,coverage}` — 948 plans in a sidecar no dispatcher can read (engine-wiring doctrine violation).
4. **RoadmapIntelligenceEngine adapter** — replace `complexityFor` heuristic (synthetic-Milestone adapter, per-MS cache).
5. **Calibration** — compose `CAMConfidenceCalibrationEngine` once ≥50 outcomes accumulate (degenerate before).
6. **Cross-milestone transfer priors** — `prism_ai:xproc_transfer_*` for cold-start milestones.

## Recommended MS1 unit order
U-INTEG-FIX-P0 (bugs P0-1..10, one focused TDD pass + real-data E2E test + fresh 3-of-3) →
U-CRON (nightly replan) → U-DOMAIN-RULES (mill/lathe/wedm/cam/cad pipeline rules + skill triggers) →
U-DISPATCHER (prism_dev actions) → U-FEEDBACK-FORCING (pickup composite-key fallback) →
U-RIE-ADAPTER → U-CALIBRATION → U-TRANSFER.
