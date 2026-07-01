# COMBO-EFFICIENCY-MS0 — Substrate-Combo Efficiency Design Spec

**Created:** 2026-05-25 12:35 CDT
**By:** `claude-227a8626` (slot:alpha)
**Trigger:** User question — *"can we utilize obsidian, /system-viz 2d graph, master index and ollama combos for better efficiency for search, audit and node utilization tasks?"*
**Envelope:** `mcp-server/data/milestones/COMBO-EFFICIENCY-MS0.json`

---

## TL;DR

The four substrates (Obsidian brain · System-viz · Master-index · Ollama) are independently wired but compositionally underutilized. The biggest single leakage: **master-index suggestions fire 1,774× per session at 0% take-rate** — the system searches for the agent, the agent ignores the result. Plus Ollama is dead (100% skip), blocking three downstream Ollama-shaped combos. Five units across three phases close both gaps and make efficiency self-tuning.

---

## Baseline (measured 2026-05-25 12:30 CDT)

| Substrate | Status | Headline metric | Gap |
|-----------|--------|-----------------|-----|
| Master-index | ✅ wired | 1774 fires/session, **0% take-rate** | Adoption — agents ignore the search-result |
| System-viz | ✅ wired | 593 ghost.unwired-engine, 980 orphans | Visibility — high-fan-in unwired not prioritized |
| Obsidian | ✅ wired | 4,136 broken `[[name]]` tokens (4.2%) | Link density — Ollama-shaped task that's blocked |
| Ollama | 🔴 **DOWN** | `/api/chat` 100% skip, top reason `low-confidence-calibrated` | Daemon dead or GPU contention |

Other supporting signals:
- PSN savings cumulative: 448 hits / 129 nudges / ~223k tokens saved (substrate working, not at peak)
- AI memo coverage 42.9% (4/7 PRISM-AI engines blind)
- NN/GNN tier-5 DORMANT — separate milestone (U-NN-PREDICTOR-EMBED-WIRE)

---

## Phase plan

### P0 — Gate opening (1 session, ~90 min total)

**P0-U01 — Revive Ollama** *(30 min, blocks P1-U02 + P1-U03 Ollama paths)*
The banner has been screaming all session. Likely root causes: NIM endpoints holding VRAM (alpha + sierra + delta all loaded different qwen variants today), or daemon stuck after a GPU OOM. Diagnostic ladder: `ollama ps` → `nvidia-smi` → `curl /api/tags` (already works) → `curl /api/chat` (hangs) → restart → verify qwen2.5-coder:7b resident → 50-call rewriter skip-rate < 20%. **No softening of `PRISM_REWRITER_HEALTH_FLOOR` — fix the root cause.**

**P0-U02 — Baseline telemetry** *(60 min)*
Pure aggregator over 5 existing JSON surfaces: `psn-savings-aggregate`, `mcp-route-takerate-audit`, `.knowledge-link-audit`, `ollama-offload-stats`, `system-graph` orphan layer. Becomes the cross-iter delta substrate. Wire into `/awareness-snapshot` inject so every session sees combo efficiency at start.

### P1 — Compositional wiring (1-2 sessions, ~300 min)

**P1-U01 — Take-rate-fix on master-index suggestions** *(120 min, the biggest leverage)*
Root cause: hooks emit `→ Take this route now: prism_X:action` but agents don't follow through. The fix: when classifier confidence ≥0.8 AND the suggested action is read-only (whitelist: `dispatcher_map_compact`, `action_search`, `master_index_query`, `wiki_search`), auto-dispatch the action and surface the **RESULT** in the prompt context instead of the **NUDGE**. Hard-block (`PRISM_ROUTE_AUTO_DISPATCH=hard`) for verb-triggers; advisory for low-confidence. Never auto-dispatch destructive actions.

This single fix turns ~1,774 wasted fires/session into ~1,500 effective searches.

**P1-U02 — Wiki link densifier** *(90 min, depends on Ollama)*
Walk 4,136 broken `[[name]]` tokens. For each: route to Ollama for nearest-match suggestion against memory + wiki BM25 + first-paragraph cosine. Auto-apply at confidence ≥0.85, operator-review JSON for <0.85. Run nightly via scheduled task. Target: 4.2% break-rate → ≤2.0%.

**P1-U03 — Unwired bridge surfacer** *(90 min)*
593 unwired engines × master-index fan-in → ranked list. Top-10 by "if wired, unlocks N downstream consumers" go into `state/shared/UNWIRED-BRIDGES-TOP10.json`, rendered as `ghost.bridge_priority` roost in /system-viz (orange tint). `/pick-unit --slot alpha` returns one of them by default. Highest-leverage version of "wire orphans" because it prioritizes the engines that unblock the most downstream features.

### P2 — Self-tuning (1 session, ~60 min)

**P2-U01 — Combo dashboard** *(60 min)*
Closes the loop. `state/shared/dashboards/combo-efficiency.{json,md,html}` updated every 5 min via scheduled task (phase offset +180s to avoid contention with fleet-reaper at +210s and fleet-memory-monitor at +330s). Surfaces: per-substrate 7d trend, per-combo take-rate, top-10 wasted-nudge classes, top-10 unwired bridges. `/awareness-snapshot` pulls headline (zone GREEN/YELLOW/RED). Makes WoW efficiency improvement visible.

---

## Why these 5 units (not 50)

**Skipped on purpose:**
- Building a new search engine — all 4 substrates exist, the leverage is in *composition* not retrieval
- Replacing Ollama with a different local LLM — that's downstream of revival; same substrate either way
- Touching the NN-GNN tier-5 — separate milestone tracked
- Generic "improve master-index" — too broad; this targets the *measured* 0% take-rate

**Picked because:**
- P0-U01 unblocks 3 downstream Ollama paths
- P0-U02 makes everything else measurable
- P1-U01 alone recovers ~1,500 effective searches/session
- P1-U02 + P1-U03 are well-scoped Ollama-shaped + graph-shaped jobs
- P2-U01 makes the gains compound across future iters

---

## Safety / risk

- **P1-U01 auto-dispatch MUST whitelist read-only actions.** Never auto-dispatch `delete`, `shutdown`, `federation_*`, `consensus_propose`, anything destructive. Use dispatcher introspection to enforce.
- **P1-U02 auto-apply gate at confidence ≥0.85.** Softer threshold leaks low-quality link suggestions into the wiki. Operator-review fallback for <0.85.
- **Per CLAUDE.md SAFETY RAILS:** no inline physics constants in any new code spawned by this milestone (none in scope, flag for builders).
- **Per `feedback_commit_to_slot_worktree.md`:** builders should run in `H:/prism-slot-<nato>` worktrees, not shared tree.

---

## Resume contract

- Envelope: `mcp-server/data/milestones/COMBO-EFFICIENCY-MS0.json` ✅
- Spec: `state/shared/specs/2026-05-25-COMBO-EFFICIENCY-MS0.md` ✅ (this file)
- Roadmap-index entry: appended ✅
- Build sequence: P0-U01 → P0-U02 (parallel ok) → P1-U01 + P1-U02 + P1-U03 (parallel, U-02/U-03 need P0-U01 first) → P2-U01
- Recommended owner slot: **alpha** (mill-domain canonical; this work is cross-cutting infra but alpha owns PSN-SYNERGIZE history)
- Recommended starter: `/checkin-alpha /loop COMBO-EFFICIENCY-MS0 P0`
