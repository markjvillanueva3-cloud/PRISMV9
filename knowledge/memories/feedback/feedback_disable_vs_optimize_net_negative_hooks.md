---
name: feedback_disable_vs_optimize_net_negative_hooks
description: "A hook that has been failing/net-negative for MANY sessions is a DISABLE candidate, not an optimize candidate. Before investing build effort optimizing a fleet-hygiene-domain hook (or any asset another slot owns), check the chat-bus / coordinate — it may be slated for retirement. Diagnosing the waste correctly ≠ the right fix being to make the waste cheaper."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.422Z
aliases: feedback_disable_vs_optimize_net_negative_hooks
---


# Disable beats optimize for a chronically net-negative hook — and coordinate before fixing a peer-domain asset

**Rule:** when a hook/asset has been *net-negative for many sessions* (100% skip, 0 takes, 0 savings, pure latency/context cost), the highest-ROI fix is usually to **disable it reversibly** ([[feedback_never_delete_only_disable]]) — NOT to engineer a cleverer way to make its waste cheaper. Correctly diagnosing the inefficiency does not mean the right response is an optimization; sometimes the asset shouldn't run at all.

**Why (verified 2026-06-02, slot alpha):** I found that `prompt-rewriter-ollama.mjs` fires on every UserPromptSubmit and, when a chat model is GPU-resident but inference is wedged, eats the full 8s `WALL_TIMEOUT_MS` per prompt fleet-wide (100% skip across 2026-05-24/27/28 + 06-02). I built a self-healing circuit-breaker (read the probe's stamp → fast-skip; 2-reviewer PASS, 9/9 tests). **Mid-build the operator said: "golf is disabling the rewriter, seems more trouble than its worth."** Golf's call was correct — a hook 100%-failing for 8+ days is a retirement candidate, and disabling removes the 8s waste entirely with zero residual code. My circuit-breaker was a fix for a doomed hook. I reverted it (and importantly, my uncommitted main-tree hook edit — which a concurrent golf/peer commit could have absorbed, the [[feedback_bootstrap_commit_check_peer_wip]] hazard).

**How to apply:**
- **Net-negative-for-N-sessions → disable first.** If telemetry shows a hook at ~0% take / 0 savings sustained across sessions (not a transient outage), the default is disable-reversibly, not optimize. Optimize only if there's a concrete path back to it paying for itself.
- **Coordinate before fixing a peer-domain asset.** [[feedback_golf_owns_reaper|Fleet-hygiene]] hooks (ollama/rewriter/route-suggest/reaper) are golf's domain; check the chat-bus for in-flight work on the same surface BEFORE investing a build. Golf was *actively in settings.json disabling the rewriter* while I built a fix for it — a chat-bus check would have caught the duplication.
- **Diagnosis is still valuable even when the fix changes.** The 8s-waste diagnosis was right and fed the disable decision; the rest of the hunt (`HIGH-ROI-INEFFICIENCY-HUNT-2026-06-02.md`) flagged other low-take advisory hooks (mcp-route-suggest 0.2% take, ollama-route-pretooluse 3557 fires/0 offloads) as the SAME disable-class.
- The complement: a hook with a real, recently-positive take-rate is worth optimizing — this is about chronic dead weight only.

Related: [[feedback_low_take_rate_nudges_are_net_negative]] · [[feedback_never_delete_only_disable]] · [[feedback_bootstrap_commit_check_peer_wip]] · [[feedback_golf_owns_reaper]].
