# PRISM Brain / Obsidian-OS Acceleration Opportunities — 2026-06-09 (slot:papa)

> **Scope:** operator /goal — "find ways to accelerate obsidian os / prism brain intelligence level, context levels, overall value and token-saving features | wired, tested, validated, synergized across all galaxies."
> **Method:** evidence-grounded from THIS session's authoritative SessionStart/UserPromptSubmit hook metrics + live file verification (R12). NOT from a subagent fan-out — a 5-agent workflow (`wf_07062fe6-3e9`) was attempted and **failed on the session API limit** (resets 4:20pm America/Chicago), burning ~799K subagent tokens for zero output. Lesson reapplied: [[feedback_workflow_concurrency_and_local_routing_2026_06_08]] — bound fan-outs to ≤3-4 AND route mechanical/audit to local Ollama, not Claude subagents.
> **Advisory.** `mustHumanVerify:true`. Each item carries live evidence; lane = owning slot.

---

## ⭐ ROOT FIX (gates 3+ of the top items — do this FIRST)

**R0 — Register the `PRISM Brain Refresh` scheduled task.** Lane **golf/operator (ELEVATED shell)** · Impact **H** · Effort **S (one command)**.
- The galaxy-synth refresh + sidecar rebuilds ARE wired as `scripts/brain-refresh.mjs` stage 6, and `.claude/helpers/install-brain-refresh-task.ps1` exists — but the task is **NOT registered on this host** (`fleet-task-health-watch.mjs --json` → NOT FOUND). So embeddings-sidecar, master-index-sidecar, and galaxy syntheses all rot between manual runs.
- Fix: `powershell -NoProfile -ExecutionPolicy Bypass -File H:/prism/.claude/helpers/install-brain-refresh-task.ps1 -RunNow` (batch with `PRISM Blueprint OCR Batch`=stale + `PRISM Zombie Reaper v2`=disabled — same elevation class). Then verify `galaxy-synth=ok` (not deferred). See [[reference_brain_refresh_task_unregistered_2026_06_09]].
- **Papa cannot do this** (no elevated shell). It is the single highest-ROI item and it unblocks I1+I2+V1 below.

---

## A. Ranked acceleration opportunities

| # | Opportunity | Axis | Impact | Effort | Lane | Safe-now | Evidence (live this session) |
|---|---|---|---|---|---|---|---|
| T1 | Convert route-suggest from **advisory → actual auto-route** for deterministic/summarize ops | token | H | M | alpha *(CONTENDED — peer 928a8226 on ollama roster)* | N (coordinate) | route-suggest fired **9966×**, take-rate **38/9966 = 0.4%** vs 30% target; top classifier `doctrineSurface` 4323, `isLargeRead` 25 — suggestions are ignored |
| T2 | Lift **Ollama offload 8% → 30%** (enforce, don't suggest; verify reachability) | token | H | M | alpha | N | offload rate **8%** (target 30%); AUTO-OFFLOAD hook fired (summary, ~547 tok/88% saved) yet unutilized |
| I1 | **Embeddings sidecar freshness** — dense recall misses recent memories | intelligence/context | H | S | alpha/papa | Y *(maint run)* | "embeddings sidecar older than the BM25 index" warning fired **~20×** this session; remedy `build-memory-embeddings-sidecar.mjs --resume`; root auto-fix = R0 |
| I3 | **Wiki↔tribal embedding backlog** — brain can't recall 83% of its own wiki | intelligence/value | H | L (GPU) | alpha | Y *(heavy)* | coverage **17.1%** — 32,630 of 39,345 wiki files lack tribal embedding; per-domain worst: file-digest 0%, dev-infra 2.9% |
| T3 | **Context-injection budget trim/dedup** — every prompt pays for ~15+ inject blocks | token/context | M-H | M | alpha/papa | Y | this prompt injected chat-slot-domains **twice**, PSN-leg-state twice; CAG-consume already skips master-index+tribal when COLD (good) — extend that gating to the duplicated blocks |
| I2 | **Master-index sidecar freshness** — search degrades to architecture-graph fallback | intelligence | M-H | S (heavy 548MB) | sierra/papa | Y *(maint run)* | "master-index sidecar stale (0.8h behind graph)"; remedy `build-graph-index.mjs`; root = R0 |
| I4 | **NN/GNN tier-5 coverage growth** (ref-pool) | intelligence | M | L | india | N | AUROC 0.808 ✓ but SELECTIVE-DEPLOY @ τ=0.7, 32% coverage, 2/6 classes; full-coverage pending ref-pool growth |
| V2 | **Octopus multi-model consensus** utilization | value | M | M | india/bravo | Y | 3/5 voices ready (Claude+Ollama+Gemini); consensus queue drains via Stop hook but underused for synthesis |
| F1 | Tribal-index **write-side sharding** (future-proof) | intelligence | M *(future)* | M-L | **papa** | Y *(additive)* | **CORRECTED: index = 159.9 MB, 352 MB headroom under the 512 MB V8 cap → NOT frozen.** Reader (`load-tribal-index.mjs`) already cap-safe; only the writer lacks shard support. Build BEFORE I3 re-embedding pushes it back to 33K+ entries / over cap — but not urgent today. |
| V1 | Galaxy-synthesis auto-cadence | value | M | — | papa | — | 34/34 syntheses content-fresh NOW (papa verified `--dry-run`=0 stale); re-stales as content lands → depends on R0 auto-cadence |

---

## B. papa-lane build-now shortlist (backend/build/IO/data-structure)

Honest assessment under this session's constraints (API limit hit, YELLOW context, brain corpus is high-stakes):

1. **The single highest-ROI item (R0) is OTHER-lane** (golf/operator elevation). Papa must NOT build a band-aid around it — registering the task fixes the whole sidecar-rot class (I1+I2+V1) in one command.
2. **F1 (tribal shard writer)** is the only clean papa-lane BUILD — but verification shows it is **not urgent** (352 MB headroom). It becomes urgent only once I3 (wiki re-embedding) regrows the index toward the cap. **Logical order (R13): build F1 as the proven foundation BEFORE launching I3 at scale**, so the re-embed never hits the write-cap wall. Queue it as the papa unit; don't rush a half-build under limit pressure.
3. **I1/I2 are maintenance runs**, not builds — safe for any slot, but their durable fix is R0, not a manual papa run.

**Recommendation:** R0 first (golf/operator) → then F1 (papa, ahead of I3) → then I3 (alpha) on the now-shard-safe index. T1/T2 token-routing is the biggest token lever but is alpha-contended — coordinate, don't fork.

---

## Synergy / fleet routing (the "across all galaxies" axis)
These are cross-cutting **infrastructure** — accelerating recall/context/token-economy serves EVERY galaxy's build quality at once (better recall → better-grounded builds fleet-wide). Routing: R0→golf/operator · T1/T2/T3/I1/I3→alpha · I2→sierra · I4→india · V2→india/bravo · F1→papa.

---

## Appendix: build-ready specs (bounded ultracode pass `wf_108e7c01-acd`, 4 sonnet agents, file-grounded)

> Each item turned into a directly-buildable spec by the owning lane. **"ALREADY EXISTS" = the cheapest wins** (wire/flip, don't rebuild — R8). Papa built **F1** this session (commits `caf3bcbc30` + `U-TRIBAL-SHARD-WRITER-FIX`); the items below are for their owning lanes.

**Dependency-ordered build sequence:** `F1 (papa, DONE)` → `I3 (alpha, gated on F1)` ; `T1 (alpha)` ∥ `T3 (alpha)` ∥ `I2 (sierra)` ∥ `R0 (golf/operator)` are independent.

### T1 — token auto-route (lane alpha) · Effort **S** · safe
- **ALREADY EXISTS:** the auto-exec path is fully built — `SAFE_AUTOEXEC` map + `buildOffloadDirective()` AUTO-OFFLOAD emit + `isOllamaAvailable()` reachability gate in `.claude/hooks/ollama-task-offloader.mjs`. Route-suggest is correctly advisory-gated (not the lever). **The gap is one boolean.**
- **Change:** `ollama-task-offloader.mjs:~413` — add `AUTO_EXEC_CATEGORIES = new Set(["summary","git_summary"])`; `if (mode && hasFileTarget)` → `if (mode && (hasFileTarget || AUTO_EXEC_CATEGORIES.has(category)))`; extend telemetry. Do NOT touch `routeModelForTask`/roster (peer 928a8226). Test: 7 cases through the UPS wire path (auto vs stay-advisory vs safety-block).

### I3 — wiki↔tribal re-embed backlog (lane alpha) · code **S-M** / runtime **L (~45 GPU-h)**
- **P0 HARD DEP: F1 must ship first** (re-embedding 32,630 files pushes the index past the 512MiB write cap → `JSON.stringify` throws). **F1 shipped this session, so I3 is now unblocked.**
- **Change:** NEW `scripts/wiki-tribal-batch-reembed.mjs` — read `.wiki-tribal-cross-ref-audit.json` `missingFromTribal` minus a checkpoint cursor; **size-gate abort if index ≥400MB** (defense); semaphore embed loop (concurrency 3); `writeIndex` every 100; flags `--dry-run/--reset-cursor/--domain/--limit`. Wire a `PRISM_BRAIN_REFRESH_WIKI_TRIBAL_ENABLE=1` (default OFF) stage in `brain-refresh.mjs`. Test: resumable cursor + clobber-guard-fires (the 2026-06-08 regression) + rerank round-trip.

### T3 — context-injection trim (lane alpha/papa) · Effort **M**
- **ALREADY EXISTS:** CAG cold-tier skip live for 4 keys (`cag-router-inject.mjs` + `cag-consume.mjs SKIP_KEYS`, fail-OPEN + 30s-stale). **SILENT NO-OP BUG found:** `build-state-inject.mjs` calls `shouldSkip` with a key ABSENT from `SKIP_KEYS` → never skips (fold the fix in).
- **Change:** add 9 high-volume injector keys to both files (gate `tier==="COLD" && conf≥0.4`) + early-return `shouldSkip` in the 9 consumer hooks; fix build-state's wrong key → `buildStateInject`; NEW advisory `injection-budget-cap.mjs` (separate UPS entry, lane-isolated). ~1,800 tok/COLD-prompt recoverable (~54k/session). Test: extend `cag-injectors-consume.test.mjs` (COLD-skip/HOT-fire/fail-OPEN/build-state-regression).

### I2 — opportunistic sidecar freshness at Stop (lane sierra/papa) · Effort **M**
- **Do NOT create a new hook** — extend `session-consolidate-graph.mjs`. **Do NOT call `brain-refresh.orchestrate()`** (synchronous `execFileSync` → killed by the 5s Stop budget). `acquireLockAt`/`releaseLockAt` already exported; `build-graph-index.mjs` (self-heap-reexecs) + `build-memory-embeddings-sidecar.mjs --resume` ready.
- **Change:** `session-consolidate-graph.mjs:~211` — append a freshness phase with a HOOK-private lock/stamp (20min cooldown), mtime-compare source vs sidecar, `spawn(detached+unref)` the rebuild(s) (embed only if a 1.5s Ollama probe passes). Heavy work detached → 5s budget safe. This is the **no-elevation** complement to R0 (the scheduled task). Test: new `__tests__/sidecar-freshness.test.mjs` (stale-spawn/cooldown-suppress/lock-race/Ollama-down-suppress) + live smoke.
