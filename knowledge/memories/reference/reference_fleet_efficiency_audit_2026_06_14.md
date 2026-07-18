---
name: reference_fleet_efficiency_audit_2026_06_14
description: "Tango efficiency audit (2026-06-14): the operator's named areas (node-spawn / git / grep / bash / search / mcp-server) are LARGELY ALREADY OPTIMIZED — measured proof per area, so the fleet doesn't re-optimize. The 3 genuine remaining gaps are large cross-domain builds routed to owners. Headline: the 262MB search sidecar is dead weight (rejected fleet-wide by the 384MB hook heap cap)."
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.574Z
aliases: reference_fleet_efficiency_audit_2026_06_14
---


# Fleet efficiency audit (tango, 2026-06-14) — measured, prior-art-grounded

Operator: *"find ways to improve system efficiency especially with nodes, gits, greps, bashs, searches, and other tool calls ... improve mcp-server performance."* Tango verified each named area against the live code + measurements rather than assuming. **Most are already heavily optimized — building a redundant "optimization" would violate the anti-duplication law. Below: what's DONE (don't re-do) + the genuine gaps (routed to owners).**

## ALREADY OPTIMIZED (measured — do NOT re-build)
- **grep/search/master-index** — `scripts/lib/master-index-search-lib.mjs` has a cap-safe streaming reader + an mtime process-cache + a sidecar. A real `pre-read-graph-inject` spawn measures **~43 ms** (NOT a 745 MB parse). The 745 MB `system-graph.json` is never parsed per spawn — the reader falls to the 59 MB architecture-graph. Per-spawn search is fast already.
- **bash / PowerShell enumeration** — golf's fleet-reaper **enum-cache** (`state/shared/.fleet-reaper-enum-cache-<host>.json`) already replaces the ~526 ms `Get-CimInstance` for most hooks. Only 2 wired hooks still enumerate raw, and `node-process-janitor.mjs` (PreToolUse `.*`) is **stamp-throttled** (~20 ms no-op hot-path, real sweep once/30 s). Marginal.
- **mcp-server** — `buildRequestServer()` re-binds per /mcp request, but the HEAVY work (engine imports, DB migrations, registry seed, module-health) is `_postBindDone`-guarded → runs ONCE at boot, not per request (`index.ts:850`). Per-request cost is ~64 light dispatcher registrations. golf's concurrency gate (`PRISM_MCP_MAX_CONCURRENCY`) caps the memory spike. A server-pool would be marginal ROI + real concurrency risk.
- **hooks** — HOOK-SYNERGY-MS0 already shipped async hook dispatcher + IPC + fast-lane matcher split + bundles.
- **git** — slot-worktree model (per-slot index, no main-tree contention) + git-lock-sweeper + git-sync throttle.

## GENUINE GAPS (real wins, but large/cross-domain — routed, not tango-quick-wins)
1. **61 of 64 PreToolUse hooks are INDIVIDUAL `node` spawns** (only 3 bundled), fired on `.*` (every tool call). Node cold-start dominates (~30-40 ms × 61 × every tool call × 26 chats). The dominant raw fleet cost. **Fix = bundle more PreToolUse hooks into the existing bundle pattern** (one node process runs many). HIGH value, HIGH risk (fleet hook re-wire). → **owner: alpha / HOOK-SYNERGY lane.**
2. **The 262 MB search sidecar (`system-graph-index.json`) is DEAD WEIGHT — built nightly, REJECTED fleet-wide.** `master-index-search-lib.mjs:183-214` (MASTER-INDEX-OOM-FIX) rejects any sidecar > 35% of the hook's heap; fleet hooks run at a **384 MB heap cap** (portable-node, MCP-FLEET-CAPACITY-MS0) → ceiling ≈ **151 MB** < 262 MB → rejected → degraded 59 MB graph used instead. On a **127 GB Blackwell box** this is the exact "stale low default — gap is utilization not capacity" the Blackwell directive names. BUT raising the cap alone makes per-spawn search SLOWER (parsing 262 MB ≈ 1-2 s + ~1 GB transient). **Correct fix = a persistent index daemon (parse the 262 MB sidecar ONCE, serve search over the existing HOOK-SYNERGY IPC at <10 ms) OR build a smaller cap-fitting (≤140 MB) sidecar.** → **owner: sierra (system-viz / build-graph-index.mjs).**
3. **mcp-server cold-start ~40-50 s** (boots 4234 tribal tips). Lazy-loading tips (load-on-first-use) would cut bridge-respawn latency. Risky (boot-sequence change). → **owner: papa / backend.**

## Recommended next move (operator-gated — each is a deliberate build, not autonomous)
Cleanest Blackwell-aligned systemic lever: **raise the fleet hook heap cap** (portable-node `--max-old-space-size`, set for the OLD box) to match the 127 GB Blackwell — but pair it with gap #2's persistent-daemon design so full-coverage search is also FAST, not just possible. Greenlight which gap to build.

## Side-finding (close-out integrity, tango domain)
`U-NN-INTEG-05` shows `shipped:false` in MILESTONE_PROGRESS but IS genuinely shipped — verified `ConsensusNeuralFeedbackEngine.ts` (403 lines) in commit `5fe75fdb36`, tagged jointly `[NN-STACK-INTEG-MS0]/U-NN-INTEG-03+05-F2`. Root cause: `build-milestone-progress.mjs`'s git-matcher can't parse the **joint-tag notation** (`03+05`) into `U-NN-INTEG-05` → a generalizable silent close-out drift class (any jointly-tagged unit). Clean tango fix candidate: teach the matcher to split `NN-INTEG-03+05` joint tags. → queue `U-MATCHER-JOINT-TAG`.

Related: [[reference_efficiency_utilization_audit_2026_06_11]], [[reference_injection_surface_token_audit_2026_06_10]], [[reference_mcp_client_enforce_ms0_2026_06_13]], [[feedback_build_for_blackwell_hardware]].
