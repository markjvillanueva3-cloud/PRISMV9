---
title: PhD-continuity driver false-flagged a loop-deepened domain as cron-dead
type: lesson
domain: hermes-zulu / fleet-orchestration
slot: zulu
date: 2026-06-28
commits: [c82ef5815b, b65d6177d9]
tags: [fleet-phd-continuity, stall-classifier, false-positive, loop-deepened, frontend-app]
related: [[reference_fleet_phd_continuity_2026_06_27]], [[feedback_verify_files_not_agent_summaries]]
---

# Lesson — a campaign/continuity classifier must model HOW each domain deepens, not assume one mechanism

## The bug

`scripts/fleet-phd-continuity.mjs` (the read-only 16-domain FLEET-PHD-BUILDOUT progress driver)
false-flagged **quebec / frontend-app** as `stalled:cron-dead` while quebec was in fact the most
active slot in the fleet (26 commits in the window, building the Kienzle frontend).

Two compounding false-negatives, same root cause — the driver assumed **every** domain deepens the
same way (a `PRISM Galaxy Mine (<galaxy>)` scheduled task + commits to `engines/<galaxy>/`):

1. **Wrong work dir.** frontend-app has **0 AI engines**; quebec's real work lands in
   `mcp-server/web/` (pages, tests, api clients, the Kienzle `.dc.html` rollout), not the nominal
   `mcp-server/src/engines/frontend-app/`. `gitCommitCount(galaxyDir, …)` therefore counted ~0 and
   saw no activity.
2. **Nonexistent task.** There is no `PRISM Galaxy Mine (frontend-app)` task **by design** — a
   frontend galaxy deepens by *building pages* (+ capturing localization/WebSocket tribal tips),
   not by transcript-mining. The lookup returned `spec-only`, and the classifier's branch 5
   (`taskDead → stalled:cron-dead`) fired, emitting the **wrong remedy**: "register a cron."

## The fix

- `DOMAIN_TASK.quebec = { name: null, loopDeepened: true, commitDir: "mcp-server/web" }` — model
  frontend-app as **loop-deepened** (deepens via per-slot `/loop` page-build) with its real work dir.
- `buildDomain` counts commits in `commitDir` (falling back to `galaxyDir`) and threads
  `loopDeepened` + `commitDir` into the classifier joins.
- Classifier: `taskDead = DEAD_TASK.has(ts) && !j.loopDeepened` — a loop-deepened domain is **never**
  `cron-dead` for a (correctly) absent mine task; it's judged on commits/loop-tick like any domain.
- The advancing/no-progress **reason** names `j.commitDir || plan.galaxyDir` so the dashboard is
  honest about the dir actually counted (caught on both paths by the 3-of-3 scrutiny).

Live: campaign `13 advancing / 2 stalled` → `15 advancing / 1 done / 0 stalled`; quebec advancing on
26 `web/` commits. 19/19 classifier tests (3 new R9: loop-deepened-not-cron-dead, advancing-names-web,
regression-guard-keeps-cron-dead-for-real-mine-domains). 3-of-3 scrutiny PASS.

## The transferable lesson

A fleet/campaign **status classifier** is only as honest as its model of *how each unit makes
progress*. Before flagging a unit "stalled / cron-dead":

1. **Don't assume one deepening mechanism.** Some domains deepen via a scheduled job (mine/retrain/
   batch), some via per-slot build loops, some via a daily re-walk. A missing scheduled task is a
   real stall for the first kind and a **category error** for the others — and the *remedy* the
   dashboard prints ("register a cron" vs "run the loop") must match.
2. **Look where the work actually lands.** A domain's nominal "home dir" (`engines/<galaxy>/`) is not
   always where its commits go — pure-consumer/frontend galaxies work elsewhere. Count activity in
   the **real** work dir or you get a silent false-negative.
3. **Name the dir/source you actually measured** in the reason string — a label that says
   "0 commits to engines/frontend-app" while the count came from `web/` misleads every reader (R12).
4. A **regression-guard test** must prove the new exemption (loopDeepened) does **not** weaken the
   genuine signal (a real mine-deepened domain with a dead cron must still classify `cron-dead`).

Sibling of [[feedback_verify_files_not_agent_summaries]] (the same campaign's earlier
"judge from the artifact, not the proxy" failure). Both are: *the observer's model of the system
diverged from the system's real shape.*
