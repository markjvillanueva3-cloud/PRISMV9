# Stale Nodes vs Built Reality — Forge-Audit-v2 Findings
**Date:** 2026-05-16
**Status:** Re-shipped after peer-reviewer BLOCK (META-tool bugs fixed + F7 added)
**Scope:** Canonical-truth-source nodes (digests, indexes, awareness, envelopes) + high-leverage runtime surfaces (MEMORY.md, Ollama routing, utilization classification) — find what's drifted vs the 2,421-wired-engine / 7,715-action / 23,981-wiki-entry reality.
**Verification META artifact:** `scripts/node-staleness-rank.mjs` — baseline appended to `state/shared/node-staleness-history.jsonl`.
**Doctrine:** `/forge-audit-v2` per `state/shared/specs/BORIS-LOOP-AGENT-DOCTRINE.md`.

---

## Change log (post-peer-review)

Peer reviewer (worktree-isolated `reviewer` subagent) returned **BLOCK** on the first ship with three META-tool calculation bugs and one missed finding. All fixed:

| Bug | Was | Now |
|---|---|---|
| Ollama schema path | `o.totals.offloaded` (non-existent) → ratio 0.0 | `o.offloaded` top-level → **20.3%** |
| Envelope-drift regex | Counted ALL `"drift":"*"` rows → 681 false-positive | Allowlist `aligned/consistent/n/a` → **11 real drift** |
| BUILD_STATE wiki gap | Read `bs.engines.*` (schema drifted) → null | Read `bs.headline.{built_engines, built_with_wiki}` → **gap 1,348** |
| Missed finding | n/a | **F7: utilization classifier degenerate** (281,683 ghost / 0 orphan) added |

---

## TL;DR

Seven findings ranked by leverage. Three CRITICAL (must-fix), four WARN. Memory truncation is the only one actively degrading recall RIGHT NOW; envelope drift, engine digest staleness, and utilization-classifier degeneracy are deeper structural issues that silently mis-direct every chat that uses the corresponding pre-search injectors.

| # | Finding | Severity | Verified baseline | Target |
|---|---|---|---|---|
| 1 | MEMORY.md crossed truncation ceiling | **CRIT** | 24,688 B / 24,576 B (100.5%) | ≤22,000 B |
| 2 | ENGINE_DIGEST 72.6h stale | **CRIT** | 72.62h | ≤24h |
| 3 | 11 milestone envelopes drifted | **CRIT** | 11 (`claims_completed_but_units_pending`) | ≤5 |
| 4 | Utilization classifier degenerate (F7) | **CRIT** | 281,683 ghost / 0 orphan / 81.7% ghost density | non-zero orphan count OR ghost ≤50% |
| 5 | Ollama offload below target | **WARN** | 20.3% (target 30%, gap 9.7 pp) | ≥30% |
| 6 | 1,348 wired engines lack wiki entries | **WARN** | wired 2,421 / wiki 1,073 = gap 1,348 | gap ≤500 |
| 7 | DIRECTORY_DIGEST + WIKI_INDEX stale | **WARN** | 102.3h + 32.7h | ≤48h + ≤24h |

---

## Findings

### F1 — MEMORY.md crossed the 24,576-byte truncation ceiling [CRIT]

**State:** `C:/Users/wompu/.claude/projects/H--prism/memory/MEMORY.md` = **24,688 bytes (100.5%)**. The Anthropic harness emits a partial-load warning above 24,576 bytes, so cross-session recall is silently degraded as of this measurement. Headroom: **-112 bytes**.

**Why it matters:** MEMORY.md is the entry point Claude uses to find domain memories. Truncation cuts the tail (the freshest entries), making the most recent learnings unrecallable until compressed.

**Verification channel** (verified by peer reviewer):
```yaml
tool: "node H:/prism/scripts/node-staleness-rank.mjs --json | jq '.memory.bytes, .memory.status'"
expected_signal: "bytes < 22000  AND  status == 'fresh'"
re_run_cost: "~50ms"
baseline_2026-05-16: { bytes: 24688, pctOfCeiling: 1.0046, status: "critical" }
```

**Optimization:** Re-run the U-MEMORY-COMPRESS protocol that brought MEMORY.md from 73 KB → 21,474 B on 2026-05-16, and make the watchdog DURABLE — wire `scripts/memory-size-watch.mjs` into a Stop hook OR `/loop --interval 1d` so the next regression cannot grow past 22 KB silently. The one-shot compress without a watchdog is what allowed the re-growth.

---

### F2 — ENGINE_DIGEST.md is 72.6 hours stale [CRIT]

**State:** `mcp-server/data/docs/ENGINE_DIGEST.md` last regenerated **>3 days ago** against a 3,259-engine repo with 836 unwired. Canonical "check before creating any engine" surface — feeds `duplicationGuardEngine.checkBeforeCreating()` + `dedup-auto-invoke.mjs` hook.

**Why it matters:** Stale digest → false-negative dedup → engine duplication. The pre-flight write-block hook (`duplication-hard-block.mjs`) reads the digest; a 3-day-stale digest will let a new engine slip past the gate if it was added in the last 3 days.

**Verification channel** (verified):
```yaml
tool: "node H:/prism/scripts/node-staleness-rank.mjs --json | jq '.surfacesRanked[] | select(.key==\"ENGINE_DIGEST\") | .ageHours'"
expected_signal: "ageHours < 24  AND  status == 'fresh'"
re_run_cost: "~100ms"
baseline_2026-05-16: { ageHours: 72.62, sizeKB: 223, status: "critical" }
```

**Optimization:** Find the regen script (grep `scripts/` for `ENGINE_DIGEST`) and chain it onto the post-commit hook alongside `regen-wiki-from-viz.mjs`. Add a Stop hook advisory that surfaces stale-digest WARN if a new engine appeared in this session.

---

### F3 — 11 milestone envelopes drifted (claims_completed_but_units_pending) [CRIT]

**State:** `MILESTONE_PROGRESS.json` contains **11 rows** with `drift: "claims_completed_but_units_pending"` — envelopes that claim completed but units never shipped. Top examples: `MF-MS1`, `MF-MS2`, `ACP-MS0`, `HOOKS-AUTOMATION-V2-MS0`, `INFRA-CLOSEOUT-MS0`. The remaining 670 rows in the file are `consistent` (606) or `n/a` (64) — NOT drift. (First-pass count of 681 was a META-tool over-count bug now fixed.)

**Why it matters:** When envelopes claim completed but the units never shipped, `/pick-unit` and `/pick-dev` skip those units thinking they're done. Real work hides behind false-positive completion.

**Verification channel** (verified):
```yaml
tool: "node H:/prism/scripts/node-staleness-rank.mjs --json | jq '.envelopeDrift.driftedMilestones, .envelopeDrift.breakdown'"
expected_signal: "driftedMilestones <= 5"
re_run_cost: "~150ms (1.7MB JSON scan)"
baseline_2026-05-16: { driftedMilestones: 11, breakdown: {consistent: 606, "n/a": 64, claims_completed_but_units_pending: 11} }
```

**Optimization:**
1. Run `/envelope-sync` — proposes status-flip patches for drifted envelope JSONs against git reality. Human-verifies, then commits.
2. Run `/close-out-audit` to surface silent shipped-but-pending units (the inverse class: units shipped on disk but envelope still says `pending`).
3. Stop hook `goal-complete-gate.mjs` already enforces close-out-audit freshness when `/goal` is invoked — extend to advisory mode on every Stop.

---

### F4 — Utilization classifier degenerate: 281,683 ghost / 0 orphan [CRIT] *(missed-finding from peer review)*

**State:** `AWARENESS-SNAPSHOT.md` reports the system-graph classifier output as **281,683 ghost** (low-in + low-out + no docs) and **0 orphan** (low-in + low-out + WITH docs). 0 orphans across a 372K-node graph with active wiring debt is implausible — the classifier's ghost-vs-orphan distinction collapses because the binary threshold (any-doc-edge → not-ghost) is too coarse. Ghost class is 81.7% of the scanned graph.

**Why it matters:** The awareness-snapshot is injected into EVERY chat at SessionStart by `awareness-snapshot-inject.mjs`. Every chat reads "0 orphans" and concludes there's nothing built-but-undocumented to fix — when in reality F6 shows 1,348 wired engines lack wiki entries (a different but adjacent gap). The orphan signal — the "punch list of built-but-unwired-or-undocumented" — is broken at the SOURCE, propagating to every chat.

**Verification channel:**
```yaml
tool: "node H:/prism/scripts/node-staleness-rank.mjs --json | jq '.utilization | {ghost,orphan,ghostPct,classifierDegenerate}'"
expected_signal: "classifierDegenerate == false  AND  orphan > 0"
re_run_cost: "~50ms (reads AWARENESS-SNAPSHOT.md)"
baseline_2026-05-16: { ghost: 281683, orphan: 0, ghostPct: 0.817, classifierDegenerate: true }
```

**Optimization:**
1. Re-tune the orphan classifier in the system-graph augmenter — likely lives in `scripts/augment-graph-with-awareness.mjs` or `scripts/regen-viz.mjs`. Specifically: drop the strict "has-any-doc-edge → not-ghost" rule; use degree percentile + has-source-file as the real orphan signal.
2. Until re-tuned, the awareness-snapshot's "punch list" line ("Top orphans (built + documented + unwired)") is misinforming every chat — surface F6's "wired but no wiki" count there instead.

---

### F5 — Ollama offload at 20.3%, 9.7 pp below 30% target [WARN]

**State:** `mcp-server/data/state/ollama-offload-stats.json` shows **65 offloaded / 254 kept on Claude = 20.3%** offload ratio. Documented root cause (CLAUDE.md `## Recent regressions` 2026-05-16): `ollama-auto-router.mjs:166` `/`-prefix skip makes the auto-router dead-code for `/checkin`/`/loop`/`/forge*` prompts. Fix R1+R5 documented but not shipped.

**Verification channel** (verified — schema bug fixed):
```yaml
tool: "node H:/prism/scripts/node-staleness-rank.mjs --json | jq '.ollama.ratio, .ollama.gap'"
expected_signal: "ratio >= 0.30"
re_run_cost: "~50ms"
baseline_2026-05-16: { offloaded: 65, keptOnClaude: 254, ratio: 0.203, gap_pp: 9.7, status: "warn" }
```

**Optimization:** Ship R1 (drop `/`-prefix skip at `ollama-auto-router.mjs:166`) + R5 (auto-execute Ollama for safe categories at line 441). R1 alone is projected to clear the 30% bar.

---

### F6 — 1,348 wired engines lack wiki entries [WARN]

**State:** BUILD_STATE.json `headline.built_engines = 2,421` vs `headline.built_with_wiki = 1,073` → **1,348-engine gap**. 56% of wired engines have no wiki entry; recall-via-wiki-inject can only surface 44%.

**Why it matters:** Wiki entries are how Claude finds out what an engine does without re-reading its source. A wired-but-undocumented engine looks like a candidate for re-creation (until duplicationGuardEngine catches it). Cost compounds: every chat that needs the engine spends tokens re-reading source.

**Verification channel** (verified — schema bug fixed):
```yaml
tool: "node H:/prism/scripts/node-staleness-rank.mjs --json | jq '.wikiCoverage.coverageGap, .wikiCoverage.built, .wikiCoverage.wikiEntries'"
expected_signal: "coverageGap <= 500"
re_run_cost: "~80ms"
baseline_2026-05-16: { built: 2421, wikiEntries: 1073, coverageGap: 1348, status: "warn" }
```

**Optimization:** Batch wiki-ingest of the 1,348 unindexed engines via `scripts/regen-wiki-from-viz.mjs` — verify the script writes per-engine leaves (not just `index.md`). If it doesn't, add a sub-orchestrator that iterates engines, classifies via Ollama for the summary, writes the leaf.

---

### F7 — DIRECTORY_DIGEST + wiki/index.md stale [WARN]

**State:** `DIRECTORY_DIGEST.md` 102.3h stale (4+ days); `knowledge/wiki/index.md` 32.7h (1.4 days). Less urgent than F1-F4 but still part of the canonical recall chain.

**Verification channel:**
```yaml
tool: "node H:/prism/scripts/node-staleness-rank.mjs --json | jq '.surfacesRanked[] | select(.key==\"WIKI_INDEX\" or .key==\"DIRECTORY_DIGEST\") | {key,ageHours,status}'"
expected_signal: "both .status == 'fresh'"
re_run_cost: "~100ms"
baseline_2026-05-16: { DIRECTORY_DIGEST: 102.26h, WIKI_INDEX: 32.73h }
```

**Optimization:** Chain DIRECTORY_DIGEST regen onto post-commit alongside `regen-wiki-from-viz.mjs`. Verify the wiki regen script actually rewrites `index.md` (not just per-entry leaves) — if it doesn't, add the index rewrite to the orchestrator chain.

---

## Self-correcting feedback channel

Re-run `node scripts/node-staleness-rank.mjs` weekly to baseline. The tool appends one row per run to `state/shared/node-staleness-history.jsonl` — `--history` tails the last 20. Trend lines reveal whether fixes stuck or drift returned. Exit code 0=healthy, 1=warn, 2=critical (cron/CI-friendly).

Current baseline: **exit=2 CRITICAL**. Three crits (F1, F2, F3, F4) must be cleared before this falls to exit=1.

## Out-of-scope (queued — sequential per operator directive 2026-05-16)

- **Auto-injection signal-quality audit** — 121 injector hooks fire on every prompt; observable noise (random Sales/UI-UX expert blocks injected unconditionally; `tip-auto-*` tribal noise). Replacement-pipeline scope. Filed as TaskList #2.
- **PRISM awareness layer refresh** — awareness-snapshot itself + bootstrap hook + brief generator. Sister to the injection audit. Filed as TaskList #3. F4 above is part of this — the classifier degeneracy IS an awareness-layer bug.

---

_Generated by `/forge-audit-v2` · slot bravo · claude-416be9ac · 2026-05-16T23:57Z._
_Peer-reviewed by `reviewer` subagent in worktree isolation; BLOCK→FIX→re-review._
