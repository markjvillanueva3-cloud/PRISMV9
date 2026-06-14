---
patch_for: H:/prism/CLAUDE.md
section: "## Recent regressions"
created: 2026-05-28T01:25:00Z
created_by: claude-168624b9 (slot:alpha)
reason: CLAUDE.md is peer-claimed by claude-88486e9e — using patch-sibling convention per [[feedback_commit_to_slot_worktree]]
target_lines: insert after the existing 2026-05-17 entries, sorted by date
---

# CLAUDE.md patch-sibling — Recent regressions for U-GALAXY-MS1-B3-HMEMV06-DISPATCHER-WIRE close-out

Holder of the CLAUDE.md lock: please merge these THREE entries into the `## Recent regressions` block (sorted by date, most recent at top of the 2026-05-28 cluster).

```markdown
- 2026-05-28 | **U-GALAXY-MS1-B3-HMEMV06-DISPATCHER-WIRE close-out + 3-unit silent close-out debt recovery** | observed-in: f3dce73b8d | fix: see commit. Three DOMAIN-GALAXY-DOCTRINE-MS1 HMEMV units had their CODE shipped (B1 in 0df9eac44c, B2 in 403aa127a4+3b53f835bb, B3 populater in 73ceb31ff4 + dispatcher-wire peer-tucked by sierra in MMO-MS0 commit 618184b818) but the envelope still said `not_started`. Net-new this session: +2 happy-path tests for `hermes_reflection` sidecar in `memoryDispatcher-namespace-routing.test.ts` (32/32 PASS). Boundary-race P1 (midnight-UTC-Sunday crossing in the snap-formula anti-regression test) fixed via snapshot-anchor-before+after-await + R12 fail-loud if disagreement. Per-file scrutiny round 1: arm-A PASS / arm-B FAIL (P0+P1+P1: doctrine non-compliance + non-atomic write + owner-credit confusion) → fixed → round 2: arm-B FAIL (NEW P0: milestone invisible to MILESTONE_PROGRESS because envelope had only `milestone_id`, no `id`; regen `if (!ms?.id) continue;` silently skipped it) → fixed via registering in roadmap-index.json + adding `id` field → all surfaces verified (envelope + MILESTONE_PROGRESS + BUILD_STATE + roadmap-index + chat-bus). | verify: `git -C H:/prism show f3dce73b8d` + `node -e "const j=require('H:/prism/state/shared/MILESTONE_PROGRESS.json'); console.log((j.milestones||[]).filter(m=>m.id.includes('DOMAIN-GALAXY')))"` → 1 entry showing shipped=8/26.

- 2026-05-28 | **`scripts/build-milestone-progress.mjs:174` silently skips 22 envelopes lacking top-level `id`** (only `milestone_id`). | observed-in: scrutiny-round-2 of f3dce73b8d (arm-B reviewer ab15cd4da1c25b3c6) | affected: AHMAD-LLM-CURRICULUM-ACADEMY-MS0, BOX-AUDIT, DEV-VELOCITY-AUTOTRIGGER-MS0, HERMES-AGI-ARCHITECTURE-MS0 + 18 others (total 22 of 751 envelopes). Workaround applied: added `id` field to DOMAIN-GALAXY-DOCTRINE-MS1.json this session. Systemic fix DEFERRED to `MILESTONE-PROGRESS-INFRA::U-MPP-FALLBACK-MILESTONE-ID` (registered in CLOSE-OUT-DEFERRED.md): replace `if (!ms?.id) continue;` with `const msId = ms.id || ms.milestone_id; if (!msId) continue;` and use msId throughout (~15 LoC, P2). | verify: `node -e "const fs=require('fs'),p=require('path'),d='H:/prism/mcp-server/data/milestones';let m=0,h=0;for(const f of fs.readdirSync(d).filter(x=>x.endsWith('.json'))){try{const j=JSON.parse(fs.readFileSync(p.join(d,f),'utf8'));j.id?h++:m++;}catch(e){}};console.log('missing id:',m,'of',m+h);"` — should drop from 22 to ≤22 (only goes UP if a new envelope is added without `id`).

- 2026-05-28 | **`memoryDispatcher.ts:738` uses `statSync` inside async `weekly_synthesis_get` case** (event-loop block class). | observed-in: scrutiny of f3dce73b8d (sync-fs-in-async hook nudge + arm-B P2) | Pre-existing, surfaced during U-GALAXY-MS1-B3-HMEMV06-DISPATCHER-WIRE test addition; out-of-scope for that commit. Fix DEFERRED to `DISPATCHER-HYGIENE::U-DISPATCHER-WEEKLY-ASYNC-STAT` (registered in CLOSE-OUT-DEFERRED.md): convert to `await (await import("node:fs/promises")).stat(hermesReflectPath)` matching surrounding async idiom. Effort 10 P3. | verify: `grep -nE "statSync|writeFileSync" H:/prism/mcp-server/src/tools/dispatchers/memoryDispatcher.ts` — line 738 should be the only hit; after fix it disappears.
```

---

Reasoning for patch-sibling vs direct edit: per session-start system reminders the CLAUDE.md `## Recent regressions` block has churn rate of ~40 entries/day across all slots. Direct concurrent edit from a non-locking slot would absorb into a peer's commit (the H8 misattribution class). The patch-sibling convention lets the lock-holder merge cleanly on their next pass.

Source files referenced:
- `H:/prism/mcp-server/data/milestones/DOMAIN-GALAXY-DOCTRINE-MS1.json` — envelope, 3 HMEMV units now `complete`
- `H:/prism/mcp-server/src/__tests__/memoryDispatcher-namespace-routing.test.ts` — 32 tests incl. 2 new
- `H:/prism/state/shared/CLOSE-OUT-DEFERRED.md` — 2 new follow-up entries
- `H:/prism/state/shared/MILESTONE_PROGRESS.{md,json}` — regenerated, DOMAIN-GALAXY-DOCTRINE-MS1 now visible
- `H:/prism/state/shared/BUILD_STATE.{md,json}` — regenerated

Wiki: [[u-galaxy-ms1-b3-hmemv06-dispatcher-wire-closeout]] · Memory: [[reference_b3_hmemv06_dispatcher_wire_closeout_2026_05_28]] · Commit: `f3dce73b8d`
