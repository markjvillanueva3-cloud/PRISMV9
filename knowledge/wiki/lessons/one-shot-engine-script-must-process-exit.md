---
title: One-shot engine-loading script must process.exit(0) or it "times out"
aliases:
  - script hangs after main completes
  - lingering handle non-exit
  - 184s timeout misdiagnosis
tags:
  - lessons
  - defect-class
  - harness
  - node
domain: ai-training
verified: 2026-07-02
source_commit: af86c9d42d
---

# One-shot engine-loading script must `process.exit(0)` or it "times out"

## The defect class
A **one-shot** node script (a verify/proof harness) that imports PRISM engine singletons
(`EventBus`, engines with timers/pools/subscriptions) will **complete its work, print "done", and then
hang** — the loaded machinery leaves lingering event-loop handles that keep node alive after `main()`
resolves. An external killer (CI runner, agent lane, `timeout N`) then kills it, and the failure is
**misread as a slow/timing-out pipeline**.

## Verified case (do not re-derive)
`scripts/verify-erp-autofeed-live.mts` was reported by KIENZLE-ALL-CHAT-APP-GAP-AUDIT as "times out at
184s". Instrumenting it (per-stage duration table + heartbeat) proved the 34-stage pipeline **completes in
~5s** (slowest stage `QUOTE @ 4177ms`); the "184s" was the post-`main()` handle hang. Fix = `process.exit(0)`
on the success path → clean 9s exit (`node_exit=0 wall=9s`). Commit `af86c9d42d`
([[reference_erp_autofeed_harness_184s_rootcause_2026_07_02]]).

## The fix
```js
main()
  .then(() => process.exit(0))   // force-exit past lingering engine handles
  .catch((e) => { console.error(e); process.exit(1); });
```
Also give a one-shot harness its **own** timebox (race `runFullPipeline` against a `--timeout=<sec>` /
env budget → exit 3 on a true stage hang) so a real hang fails LOUD instead of a silent external kill,
and print a **per-stage duration table** so a slow-but-completing run names its bottleneck.

## CRITICAL caveat — do NOT apply to daemons
This ONLY applies to **one-shot** scripts that finish and should exit. It does **NOT** apply to
long-running **drivers / loops / daemons** — those correctly never `process.exit(0)` (they are meant to
keep running). A naive grep for "loads engines + no `process.exit(0)`" false-positives on
`*-driver.mts`, `*-drive.mts`, `*work-loop*`, `*-run.mts` (e.g. `hermes-autonomous-drive.mts`,
`cad-hermes-builder-driver.mts`). **Verify one-shot-vs-daemon before adding an exit** — adding it to a
daemon breaks it. Tell them apart by intent: does the script do a bounded task and report, or does it
subscribe/poll/loop indefinitely?

## Diagnosis heuristic
"Script prints its final result, then hangs until killed" = **open handles, not slow work.** Confirm with
`node --trace-exit` or by observing (as here) that the work log completes long before the wall-clock kill.
