# SYSTEM-VIZ UPGRADES — AUDIT 2026-05-16

**Auditor:** claude-1a624844 (slot juliett, /forge-audit-v2)
**Scope:** Upgrade opportunities for the PRISM system-viz subsystem — improve **functionality** (what operators/agents can learn) and **efficiency** (regen, query, file size, wiring drift prevention).
**Verification channel (master):** `node H:/prism/scripts/system-viz-health.mjs` — re-runnable measurement script shipped as the META artifact of this audit.

---

## TL;DR — top 5 actionable upgrades, ranked

| # | Finding | Symptom | Lift | Effort |
|---|--------|--------|------|--------|
| **M1** | `loadGraph` duplicated across 18 scripts | each caller pays 24 MB parse | Prereq for P1 cache to actually take | S-M |
| **P1** | Shared `loadGraph` lib has no in-process cache | 261-833 ms/verb cold | ~80% drop on 2nd+ same-process call | S |
| **P4** | L12 FS expansion does full re-walk every `--full` | 2-5 min/run | Drops to <10 s w/ mtime cache | M |
| **W1** | `FOLD_NEWLY_BUILT=0` default → 1-commit blind spot | newly-built nodes invisible until next commit | Eliminates lag for fleet of 6-12 chats | S |
| **W4** | Drift consumer is Stop-advisory only, no auto-remediate | `truncated > 0` reaches operator but doesn't block | Closes corruption auto-fail loop | S |
| **F2** | No `action-trace` query verb | agents can't see why a dispatcher fired | Removes Grep round-trip from agent debugging | M |

**Combined parallel build estimate:** ~2 weeks of focused effort closes top 5. Lower-leverage items (P5 web pagination, F4 differential viz) are L-effort and gated on user demand signal.

---

## Phase 0 baseline (measurements, this session)

```
graph:        20,462 nodes / 77,099 edges / 23.9 MB / mtime ~6h ago
augmentations: 53 files, top-25 sum > 200 MB
scripts:      13 files, 6,408 LOC
worktrees:    41 active (KEEP 23 / MERGE 2 / PRUNE 9 / INVESTIGATE 7)
domains:      89% wired (4 laggards: Lathe 89, Machine 17, Turning 11, Multi 10)
milestones:   11 envelope-drift (claims vs git reality)

Per-verb query latency (cold, measured this session):
  headline:             674 ms
  find audit:           833 ms
  roadmap-candidates:   297 ms
  coverage-by-domain:   284 ms
  blast-radius:         274 ms
  node-status:          261 ms

Large files in state/shared/system-viz/:
  system-graph-normalized.json     259 MB  (NN-GRAPH-MS0 embeddings — distinct pipeline)
  h-drive-census.json              132 MB  (FS census — distinct pipeline)
  system-graph.json                 24 MB  (live graph)
  system-graph.previous.json        20 MB  (1-step history)
  wiki-entries-augmentation.json    17 MB  (largest single aug)
```

Hook wiring verified live: `audit-viz-first-inject` + `post-ship-distill` both present 2× each in C: and H: settings.json (the 2026-05-16 regression noted in CLAUDE.md is currently closed).

---

## PERFORMANCE findings (P1-P5)

### P1 — Shared `loadGraph` lib has no in-process cache (HIGHEST LEVERAGE — depends on M1)

- **Symptom:** Per-process: every `loadGraph()` does a full 24 MB `JSON.parse`. Cold latency 261-833 ms per query verb (this session). Hooks that fire on every `UserPromptSubmit` (master-index-precheck) and `SubagentStart` (per-subagent presearch via `master-index-search-lib.mjs`) pay the parse cost on every fire.
- **Root cause:** `scripts/lib/system-viz-graph.mjs:loadGraph()` — actual parse site. The query script merely imports it (`scripts/system-viz-query.mjs:23`). Cache must land in the **lib**, not the query script. (Reviewer correction: prior audit draft mis-attributed to the query script.)
- **Upgrade:** Module-scope `{ mtimeMs, graph }` cache inside `system-viz-graph.mjs`. On entry `fs.statSync(GRAPH).mtimeMs`; if unchanged return cached, else reload. 60 s TTL safety fallback. Add `--no-cache` flag for callers that just regenerated.
- **Prerequisite:** **M1 (lib consolidation) must land first** — 18 files currently reference `loadGraph` or inline `JSON.parse` of the graph; until they all route through the lib, caching is partial.
- **Verify:** `node H:/prism/scripts/system-viz-health.mjs --bench-query` before/after. Same-process re-issue of the same verb should drop to ≤ 50 ms.
- **Estimated lift:** 200-700 ms per non-first invocation in any process that issues ≥ 2 queries.
- **Effort:** S (lib cache) + M (M1 consolidation).

### P2 — Merge augmentations load sequentially

- **Symptom:** `merge-augmentations.mjs` calls `loadOptional()` for 53 augmentation files in a sync loop. Top-25 of those sum > 200 MB; I/O serialized.
- **Root cause:** `scripts/merge-augmentations.mjs` (1408 LOC) — sequential `fs.readFileSync` calls, no `Promise.all`.
- **Upgrade:** Convert load phase to `await Promise.all(files.map(f => fsp.readFile(f, "utf8")))` followed by serial `JSON.parse` (parse-bound, not I/O-bound). Keep merge phase serial since it mutates one graph.
- **Verify:** `time node scripts/merge-augmentations.mjs --dry-run` before/after; reviewer agent to read the diff and confirm parse-correctness preserved.
- **Estimated lift:** ~200-300 ms per regen-viz invocation (the load phase).
- **Effort:** S.
- **Verifies via:** `time node scripts/regen-viz.mjs` (existing tool, before/after).

### P3 — Four sequential `spawnSync` repair passes after merge

- **Symptom:** `regen-viz.mjs` runs engine-classification → dedup → reparent → parent→child-edges as 4 separate `spawnSync` processes, each re-parsing system-graph.json.
- **Root cause:** `scripts/regen-viz.mjs:122-165` — separate processes for what could be one in-memory traversal.
- **Upgrade:** Compose into a single `scripts/repair-passes-composite.mjs` that loads graph once, applies all 4 transforms, writes once.
- **Verify:** `time node scripts/regen-viz.mjs` post-change; check `system-graph.json` is byte-identical to pre-change (correctness gate).
- **Estimated lift:** ~60-80 ms per regen + 4× less process-spawn overhead.
- **Effort:** M (correctness-preserving merge of 4 transforms — needs test coverage).

### P4 — L12 file-walker has no mtime skip cache (HIGH IMPACT ON `--full`)

- **Symptom:** `expand-system-viz-l12-files.mjs` walks the full H: drive on every `--full` regen. 2-5 min wall time. Most directories haven't changed since last walk.
- **Root cause:** `scripts/expand-system-viz-l12-files.mjs` (609 LOC) — no `.l12-cache.json` mtime sentinel, no `git status --porcelain` short-circuit for tracked files.
- **Upgrade:** Persist per-directory mtime cache; skip subtree if `fs.statSync(dir).mtimeMs` unchanged. For paths under `H:/prism/`, prefer `git status --porcelain` delta. Worktree-aware (mtime per-worktree).
- **Verify:** First run cold (cache miss) ≈ 120-300 s baseline; second run with no FS changes should drop to < 10 s.
- **Estimated lift:** 110-290 s per `--full`. SYSTEM-VIZ-FS-COVERAGE-MS1 already shipped a cron re-walker (memory `reference_system_viz_fs_coverage_ms1_2026_05_16`) — that's complementary. This is the per-invocation incremental layer it's missing.
- **Effort:** M.

### P5 — OPEN QUESTION (was: web viewer monolith load)

- **Status:** Per peer reviewer FAIL: the "5-15 s TTI / 24 MB transferred" claim was inferred without measurement. **Demoted from a finding to an open question.**
- **What it would take to promote:** A Playwright-MCP measurement of `/system-viz` on a cold cache. Capture: `transferred bytes`, `domContentLoaded ms`, `largestContentfulPaint ms`. If transferred > 5 MB and TTI > 2 s, promote to a finding with `M effort` and the cited numbers. Otherwise drop.
- **Verify (the question):** `mcp__playwright__browser_navigate http://127.0.0.1:8765/system-viz` → `mcp__playwright__browser_network_requests` → inspect the largest payload.

---

## FUNCTIONALITY findings (F1-F5)

### F1 — `ghost-inventory` drill-down verb

- **Need:** Operators reanimating PARKED worktrees, agents deciding whether to consolidate DRAINED roosts, the misc-tasks (318) + bridge-synergy (16) + ROADMAP-CONSOLIDATED (5826) ghosts have no programmatic drill-down.
- **Gap:** Headlines report counts; no verb returns per-ghost metadata, recovery readiness, or age.
- **Upgrade:** `system-viz-query.mjs ghost-inventory [--category misc_tasks|bridge_synergy|parked|drained] [--json]` — returns each ghost with: id, kind, sourcePath, ageDays, lastTouchedSha, recoveryReadiness (heuristic score 0-1).
- **Verify:** `node scripts/system-viz-query.mjs ghost-inventory --category misc_tasks | jq '. | length'` should equal 318 (matches MISC-TASKS-INVENTORY.json).
- **Effort:** M.

### F2 — `action-trace` overlay verb (D4 surface complete, query missing)

- **Need:** D4 (action-traces append-only JSONL) shipped 2026-05-16 (`reference_d4_action_traces_2026_05_16`). The JSONL is being written; no query verb reads it through system-viz.
- **Gap:** Agents must `cat state/shared/action-traces/*.jsonl | grep ...` directly. Defeats the master-index doctrine.
- **Upgrade:** `system-viz-query.mjs action-trace <action_name> [--last N] [--agent <slot>]` — joins traces + dispatcher graph (in-edges/out-edges) + telemetry, renders tree.
- **Verify:** `node scripts/system-viz-query.mjs action-trace prism_calc:tool_life --last 5` returns ≥ 1 trace if action was invoked in this session.
- **Effort:** M.

### F3 — `search-act` composite verb (close-the-loop)

- **Need:** Hooks inject "found 5 nodes" but agent still has to call blast-radius + wiki-query as 3 separate hops.
- **Gap:** No single verb closes find → impact → next-action.
- **Upgrade:** `search-act <noun>` returns top-3 find hits, each with: blast-radius summary, wiki excerpt, recommended next action (e.g. "engine is unwired in L4a — emit wire-plan via /wire-unwired").
- **Verify:** A/B compare follow-up `Grep` / `Read` tool-call count per session in `state/shared/.tool-call-telemetry.jsonl` before and after the hook starts injecting `search-act` output. **No pre-baseline yet** — needs a 1-week observation window before any reduction target is claimed.
- **Effort:** M.

### F4 — Differential viz (`diff <sha1> <sha2>`)

- **Need:** PR reviewers + roadmap auditors want "what graph nodes/edges changed in this commit range?"
- **Gap:** `system-graph.previous.json` exists but no diff verb consumes it.
- **Upgrade:** `system-viz-query.mjs diff [--since <sha|date>]` — uses git log + per-sha graph snapshots (or single previous), emits added/removed/rewired counts + markdown table.
- **Verify:** `node scripts/system-viz-query.mjs diff --since HEAD~5` returns non-empty for any 5-commit window touching code.
- **Effort:** L (requires per-sha graph history or rolling snapshot — partially implemented via `.previous.json`).

### F5 — `agent-plan <dispatcher>` query

- **Need:** Tier-1 orchestrator deciding to call `prism_cam:cam_recommend` needs: which Tier-3 specialists handle this? prerequisite checks? fallback chain?
- **Gap:** G2 agent-overlay shipped today (`reference_g2_agent_overlay_2026_05_16`) but no query verb surfaces it.
- **Upgrade:** `agent-plan <dispatcher>` returns: agents that route here, prereq wiring status, current overlay state, fallback chain.
- **Verify:** Smoke-test against `prism_cam` — expect non-empty agents list + ≥ 1 fallback.
- **Effort:** M.

---

## WIRING findings (W1-W6)

### W1 — `FOLD_NEWLY_BUILT=0` default creates 1-commit blind spot

- **Symptom:** `system-viz-on-commit.mjs:103` skips final merge-augmentations pass unless `FOLD_NEWLY_BUILT=1` set. Newly-built nodes only highlight on the *next* commit.
- **Risk:** In a 6-12 chat fleet doing rapid commits, "latest state" lags by 1 commit per chat. Stop-time chat agents read stale graph.
- **Upgrade:** Either (a) default to ON if total newly-built delta < threshold, or (b) move the 91 s overhead to a separate background spawn that updates the next-commit slot.
- **Verify:** `grep -n "FOLD_NEWLY_BUILT" scripts/system-viz-on-commit.mjs` should show a default-true branch.
- **Effort:** S.

### W2 — Obsidian-bridge v2 only fires on `--full`

- **Symptom:** `regen-viz.mjs:173-179` runs `system-viz-obsidian-bridge-v2.mjs` only with `--full`. Post-commit fast path never refreshes wiki backlinks → wiki and node.knowledge fields drift.
- **Upgrade:** Move to FAST[] (profile + optimize if it's the bottleneck).
- **Verify:** `wc -l knowledge/wiki/architecture/*.md` mtime distribution before/after a non-`--full` regen.
- **Effort:** M.
- **Side note (separate, low-priority):** `system-viz-obsidian-bridge.mjs` (v1) has no live script callers per reviewer pass. Archive per `feedback_never_delete_only_disable` (rename to `.archive.<date>`); not a wiring concern, just unused-code hygiene.

### W3 — Detached wiki-regen child unsupervised

- **Symptom:** `system-viz-on-commit.mjs:127-138` spawns wiki regen with `detached: true; child.unref()`. No PID file, no health check. Silent crash leaves wiki stuck.
- **Upgrade:** Write `.viz-wiki-regen.pid` + `.viz-wiki-regen.last-success`; new health check hook compares timestamps every 30 s; alerts via chat-bus if stale > 10 min.
- **Verify:** Kill the child mid-run; alert should appear in `AGENT_CHAT.jsonl` within 10 min.
- **Effort:** M.

### W4 — Drift report consumer is Stop-advisory only; auto-remediation loop missing

- **Reviewer correction:** prior audit draft claimed "never consumed" — false. `H:/prism/.claude/hooks/stop-system-viz-drift.mjs` (lines 32-49) IS wired as a Stop hook and reads `DRIFT_REPORT.json`. It emits a one-line advisory when `truncated > 0`, `root-missing > 0`, drift count > 10, or report age > 12 h. Throttled 60 min/session. **Consumer exists; the gap is narrower.**
- **Symptom (corrected):** Consumer is **non-blocking advisory** (`continue:true, suppressOutput:false`) with 60-min throttle. It nudges the operator but does not (a) auto-trigger a re-walk, (b) block in `regen-viz.mjs`, or (c) escalate to the chat-bus. Current report: 4 `stale-churn` entries (disk Δ > 5 h since walk); within acceptable today, but a future `truncated > 0` event surfaces only as a nudge.
- **Upgrade:** Add post-detect stage in `regen-viz.mjs` that hard-fails on `truncated|root-missing` (currently those would still allow the merge to proceed). Optionally: chat-bus broadcast for any non-fresh count > threshold so other slots see it sooner than the next Stop.
- **Verify:** Inject a synthetic `truncated:1` into `DRIFT_REPORT.json`, run `node scripts/regen-viz.mjs` — current behavior continues; post-fix should exit non-zero before the merge step.
- **Effort:** S.

### W5 — No cross-worktree graph checksum

- **Symptom:** 41 active worktrees each maintain their own `system-graph.json`. Post-commit fires independently. No mechanism ensures fleet-wide consistency.
- **Upgrade:** `GRAPH_CHECKSUM` per worktree + 60 s cron diff. Alert if divergence > 2 min.
- **Verify:** `for d in H:/prism*/state/shared/system-viz; do sha256sum "$d/system-graph.json"; done` — fleet should converge within 2 min of last commit.
- **Effort:** M.

### W6 — Hook installer doesn't self-verify

- **Symptom:** `install-system-viz-git-hook.mjs` writes the hook but doesn't test-fire it. Permissions or path bugs leave commits silently skipping viz refresh.
- **Upgrade:** After install, run `git commit --allow-empty -m "viz hook smoke test"`; assert `system-graph.json` mtime advanced within 5 s. Hard-fail install on no advance.
- **Verify:** Run the installer in a fresh worktree; check exit code + mtime.
- **Effort:** S.

---

## Additional findings (added in v2 after peer review)

### M1 — `loadGraph` reimplemented or duplicated across ≥ 18 scripts (BLOCKS P1)

- **Symptom:** `grep -l 'loadGraph\\|JSON\\.parse.*system-graph' H:/prism/scripts` returns 18 files. The shared lib `scripts/lib/system-viz-graph.mjs` exports `loadGraph`, but multiple consumers (`build-system-viz-livediff.mjs`, `generate-combo-detector.mjs`, `generate-engine-graph.mjs`, `audit-roadmap-viz-bindings.mjs`, others) either reimplement the parse or duplicate the import surface in ways that defeat module-scope caching.
- **Why it blocks P1:** A cache landing in the lib only helps callers that route through the lib. Any inline-parse caller pays full cost on every invocation.
- **Upgrade:** Audit the 18 hits; route every caller through `loadGraph()`. Delete inline parses. Once the lib is the only path, P1's module-scope cache becomes effective fleet-wide.
- **Verify:** `rg -c "JSON\\.parse\\(.*readFileSync.*system-graph" H:/prism/scripts` should return 0 after the consolidation (only the lib remains).
- **Effort:** S-M (mostly mechanical — 18 small edits, byte-equal output gate on any function that mutates the graph).

### M2 — `merge-augmentations.mjs` byId index — silent-desync risk

- **Symptom:** `scripts/merge-augmentations.mjs` (1408 LOC) maintains a `byId` index with mutation guarded by `addNodeIndexed()`. If any merge block falls back to a raw `G.nodes.push(...)` (search the file), the index desyncs silently and downstream `byId.get()` returns stale.
- **Why it matters:** 53 augmentation blocks all share one index. A single bypass corrupts downstream queries with no detectable error message.
- **Upgrade:** Add an invariant check at end of merge: `assert(G.nodes.length === G.byId.size)`. If they diverge, log the delta + first 5 offending nodes. (Lower-cost: ESLint rule that bans raw `nodes.push` in this file.)
- **Verify:** `grep -nE '\\bnodes\\.push\\b' H:/prism/scripts/merge-augmentations.mjs` should return only references inside `addNodeIndexed()`.
- **Effort:** S (one assertion + one grep gate).

## Findings noted but not in top-N

- **53 augmentations, 0 mtime-orphans** — clean pipeline. No prune work needed.
- **259 MB `system-graph-normalized.json`** — written by `regen-graph-normalized.mjs` (NN-GRAPH-MS0 embedding pipeline, deploy DEFERRED per memory). Not orphan, but watch for unbounded growth.
- **`MS-VIZ-ROADMAP-BIND.json` + `VIZ-COVERAGE-MS0.json`** — pre-existing milestones; this audit's findings should be folded as new units in a fresh `SYSTEM-VIZ-UPGRADES-MS0`, NOT bolted onto these (avoids drift with their separate scope).

---

## Phase 6A — META artifact (compounding-gains tax)

**Shipped as:** `H:/prism/scripts/system-viz-health.mjs`

Re-runnable measurement that establishes the baseline this audit measured + flags regressions on re-run:
- Graph size + mtime + age (seconds)
- Augmentation count + total size + oldest mtime
- Per-verb query latency (headline, find, blast-radius, node-status, coverage-by-domain, roadmap-candidates) — 5-iter mean
- DRIFT_REPORT.json severity counts
- Cache-hit estimate (re-runs the same verb 5× and checks slope)
- Outputs JSON (`--json`) and human text (default)

`--bench-query <verb>` runs just that verb's latency sample.

---

## Verification feedback matrix

Every finding must have a re-measurable signal. Index:

| Finding | Verifying tool | Expected signal | Today's baseline |
|---------|---------------|------------------|------------------|
| M1 | `rg -c "JSON\\.parse\\(.*system-graph" H:/prism/scripts` | only `lib/system-viz-graph.mjs` matches | 18 files match |
| P1 | `system-viz-health.mjs --bench-query` (same-process re-issue) | 2nd-call latency ≤ 50 ms | 261-833 ms |
| M2 | `grep -nE '\\bnodes\\.push\\b' merge-augmentations.mjs` | only inside `addNodeIndexed()` | TBD — needs grep |
| P2 | `time node regen-viz.mjs` | merge phase ≤ 250 ms | TBD (not isolated) |
| P3 | `time node regen-viz.mjs` + byte-equal `system-graph.json` | repair phase ≤ 20 ms | ~80 ms |
| P4 | `time node expand-system-viz-l12-files.mjs` cold-vs-warm | warm ≤ 10 s | cold 120-300 s |
| P5 | Playwright-MCP cold-cache `/system-viz` | measure transferred MB + TTI | **open question, no baseline yet** |
| F1 | `query ghost-inventory --category misc_tasks \| jq length` | 318 | n/a (verb doesn't exist) |
| F2 | `query action-trace prism_calc:tool_life --last 5` | ≥ 1 trace | n/a |
| F3 | A/B `.tool-call-telemetry.jsonl` Grep-count delta | non-negative reduction post-rollout | no pre-baseline yet |
| F4 | `query diff --since HEAD~5` | non-empty on any 5-commit window | n/a |
| F5 | `query agent-plan prism_cam` | ≥ 1 agent + 1 fallback | n/a |
| W1 | `grep FOLD_NEWLY_BUILT system-viz-on-commit.mjs` | default-true branch present | currently default-off |
| W2 | wiki mtime distribution post non-`--full` regen | distribution shifts forward | currently static |
| W3 | kill detached child mid-run | chat-bus alert within 10 min | currently silent |
| W4 | synthetic `truncated:1` injection → `regen-viz.mjs` | exits non-zero before merge | currently exits 0 (advisory only) |
| W5 | sha256 across worktrees | converge within 2 min | currently undefined |
| W6 | run installer in fresh worktree | exit nonzero on broken install | currently exit-0 |

---

## Recommended next steps for the operator

1. **Sequence: M1 → P1 → W1 → W4.** All S-effort, all measurable, M1 unblocks P1.
2. **Spin a 5-unit milestone `SYSTEM-VIZ-UPGRADES-MS0`**: U-LIB-CONSOLIDATE (M1), U-CACHE-LIB (P1), U-FOLD-DEFAULT (W1), U-DRIFT-HARD-FAIL (W4), U-MERGE-INVARIANT (M2). Per-file scrutiny gate per project CLAUDE.md.
3. **P4 (L12 mtime cache) is the biggest absolute time-saver** but lives in `expand-system-viz-l12-files.mjs` — coordinate with whoever ships SYSTEM-VIZ-FS-COVERAGE-MS2.
4. **F2 (action-trace verb) is the highest-leverage functionality** because D4 traces are already being written — query layer is the only missing piece.
5. **P5 open question** — only promote after a Playwright-MCP measurement of `/system-viz`. Otherwise drop entirely.

---

## Self-scheduled re-run

Per `/forge-audit-v2` Phase 6C: this audit is registered for re-run in 7 days via `/loop --interval 7d --max 4`. After 4 re-runs (≈ 28 days), operator re-evaluates whether the audit is still worth running.

Re-run command: `/forge-audit-v2 /system-viz can we make further upgrades to the system-viz system to improve functionality and efficiency`
