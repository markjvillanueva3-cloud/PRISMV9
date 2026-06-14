---
name: reference_delta_fusion_isolation_flaky_regressed_2026_06_01
description: Fusion bridge isolation (delta:18365 vs kilo:18361 vs :18362) is UNSTABLE — regressed to one-shared-instance with NO delta action between 13:23 and 16:00 on 2026-06-01. Re-verify isolation EVERY session before running doc-creating loops.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.084Z
aliases: reference_delta_fusion_isolation_flaky_regressed_2026_06_01
---


The three-Fusion-bridge isolation is **not durable**. On 2026-06-01 it was proven isolated at 13:08–13:23 (3/3 closed-loop cycles ran clean on an isolated :18365), then **regressed back to a single shared instance by ~16:00 with delta doing nothing in between** — an operator/kilo relaunch or instance-close between those times collapsed it. So an "isolation fixed" memo is only true until the next relaunch.

**Reliable isolation test (the others lie):** `documents.count` is NOISY in this multi-bound setup — a single `app.documents.add` on :18365 reported +2, and activating DIE CASE auto-dropped 4 empty unsaved Untitled docs (5→1). Do NOT trust an absolute count. Use the **differential**: snapshot count on 18361/18362/18365, create ONE doc on :18365, re-snapshot. **Isolated ⇔ only :18365's delta is nonzero.** On the regression all three moved by the same +2 → one shared instance. (The 13:08 working test used `timeline_count` on a scratch doc — equivalent differential idea; never run it on the active DIE CASE part, that would mutate the operator's part.)

**Why it's still SAFE to run the loop in a shared instance** (destructive safety is independent of isolation): the live-cycle reaps ONLY by the `PRISM-DELTA-LOOP-<ts>-` doc prefix, and DIE CASE is active/modified → hard-guarded (never closed). So even shared, the loop never touches kilo's or the operator's docs. The isolation requirement is a *coordination* concern (active-doc race if kilo drives concurrently), not a data-loss one. Mitigation: post an exclusive-use claim to `state/shared/fusion-bridge-claims.json` + AGENT_CHAT before a run; kilo was idle (last Fusion bus msg 2026-05-31) so no live collision.

**True re-separation is operator-action-only:** relaunch a distinct Fusion with `PRISM_BRIDGE_CAD_PORT` set per-instance (the 13:08 fix). delta cannot relaunch kilo's/operator's Fusion from the bridge.

Supersedes the "isolation now works" claim in [[reference_delta_fusion_isolation_and_live_bridge_2026_06_01]] — that fix held only transiently. See also [[reference_delta_live_closed_loop_proven_2026_06_01]] (the loop proof) and [[reference_delta_doc_close_enforcement_and_dual_training_2026_06_01]] (prefix-scoped reap = the safety guarantee).
