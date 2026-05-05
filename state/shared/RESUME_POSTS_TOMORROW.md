# RESUME — "continue post processor work" (NEXT SESSION'S START)

**Trigger phrase:** `continue post processor work`
**Last updated:** 2026-05-05 ~08:10 UTC by claude-803437e0 (was 2026-05-04 13:00 by claude-04c0e75c)
**For:** the next post-processor chat (any session ID)
**Companion:** `RESUME_POSTS.md` (full PPG history) · this file is the focused next-action brief.

---

## 2026-05-05 SESSION (claude-803437e0) — U-PPGH04 LANDED

**REPO HEALTH:** Earlier in this session `H:/prism/.git` had corrupt tree/blob objects (unreadable tree `c91078d8...`, blob `577dffe1...` for CAMAnalyzeEngine.test.ts, unreadable parent commit `fc960eeb...`). `git fetch --refetch origin` (exit 0, ~minutes) repopulated all missing objects; `git status` and commits now work. A stale `.git/index.lock` from 07:37 was also removed manually (user-approved). If a future session sees `unable to read tree` errors again, run `git fetch --refetch origin` first before any other recovery.

**U-PPGH04 — code complete, tests green, awaiting repo recovery to commit:**

Files staged (uncommitted):
- `mcp-server/src/engines/HurcoV11MillMasterPostEngine.ts` — added optional `material?: { iso_group?, kc1_1?, mc? }` to `MillOperation` interface; `performPhysicsChecks` now resolves canonical-vs-override Kienzle constants with sanity bounds (`kc1_1 ∈ [100, 5000]`, `mc ∈ [0.10, 0.45]`) and throws on iso_group mismatch; cutting force check string now suffixes `(kc1_1=X mc=Y)` for traceability.
- `mcp-server/src/__tests__/HurcoV11MillMasterPostEngine.test.ts` — added 5 new tests (kc1_1 floor/ceiling, mc range, iso_group mismatch, partial override). Was untracked in git index — `git add` blocked by tree corruption.

Test results (2026-05-05 ~08:00):
- `HurcoV11MillMasterPostEngine.test.ts -t "material constant overrides"` — **7/7 GREEN** (2 originally-failing + 5 new guard tests)
- Full file: 38 pass / 28 fail (was 35/31 before my edit) — **net +3 fixes, zero regressions**
- Sidecar integration suites (`HurcoV11SidecarIntegration`, `PostPhysicsSidecar.integration`, `verifyBlockAnnotations`, `PhysicsSidecarBuilderEngine`, `camDispatcher-PhysicsSidecar`) — **120/121 GREEN**, the 1 fail (`sealMasterPostOutput.test.ts` line 71 expected schema_version `1.1.0` got `1.2.0`) is a **pre-existing stale assertion** from before PPG-WIRE-MS6/U-PPGM16 bumped the WEDM schema; **not caused by U-PPGH04**.
- `tsc --noEmit` clean (exit 0).

Multi-model consensus: 2 specialist reviewers (physics-reviewer + test-review-agent) consulted in parallel; both APPROVE-WITH-CHANGES; their required guards (sanity bounds + iso_group mismatch error) are implemented.

Commit message ready (paste verbatim once repo recovers):
```
[CAM-EXHAUST-MS0]/U-PPGH04: HurcoV11 material override + Kienzle source attribution

- MillOperation gains optional material?:{iso_group?, kc1_1?, mc?} per-op override
- performPhysicsChecks resolves canonical vs override with sanity bounds
  (kc1_1 ∈ [100, 5000], mc ∈ [0.10, 0.45]) — guards against silent disable
  of the Fc<=maxForce safety gate when caller passes underflow value
- Cutting force check string now surfaces (kc1_1=X mc=Y) for traceability
- Throws on iso_group mismatch between op.material_iso and op.material.iso_group
- 5 new test cases (floor/ceiling/range/mismatch/partial override) — 7/7 GREEN
- HurcoV11MillMasterPostEngine.test.ts: 35→38 passing, zero regressions
- 120/121 GREEN across sidecar integration suites; remaining failure is a
  pre-existing schema 1.1.0→1.2.0 drift in sealMasterPostOutput.test.ts
  (separate unit, not U-PPGH04 scope)

Multi-model consensus: physics-reviewer + test-review-agent both APPROVE-WITH-CHANGES
```

**Remaining HurcoV11 sync-path failures still open (28 tests):** `postSingle is not a function`, UltiMotion `G187 P3` default emission, `Op 1 line ... 50000 RPM` warning prefix, `physics_checks` count 4 vs 5 in getStats, structured tool/coating in setup_sheet — all candidates for U-PPGH03..U-PPGH05.

---

---

## DO THIS FIRST (30-second orientation)

```bash
# 1. Confirm work/cam-exhaust-ms0 has the U-PPGM17* trio committed
git -C H:/prism log --oneline | head -10 | grep -E "PPGM17[abc]|PPGM17a"

# 2. Check if peer claim on camDispatcher.ts has released
node H:/prism/.claude/helpers/agent-coordination.mjs read-active-claims | grep camDispatcher

# 3. Verify PPG suite still green
cd H:/prism/mcp-server && node H:/prism/node_modules/vitest/vitest.mjs run \
  src/__tests__/sealWEDMMasterPostOutput.test.ts \
  src/__tests__/postPhysicsSidecarSchema.WEDM.test.ts \
  src/__tests__/PostPhysicsSidecarBlockAnnotations.test.ts \
  src/__tests__/MitsubishiMV1200RWireEDMMasterPostEngine.SidecarIntegration.test.ts \
  src/__tests__/MitsubishiMV1200RWireEDMMasterPostEngine.test.ts \
  src/__tests__/integration/MasterPostMitsubishiMV1200R.integration.test.ts \
  src/__tests__/routes/ppg-master-routes.test.ts \
  src/__tests__/verifyWEDMBlockAnnotations.test.ts
# Expect: 229/229 GREEN.
```

---

## WHAT JUST SHIPPED (2026-05-04 session by claude-04c0e75c)

Three PPG units landed on `work/cam-exhaust-ms0`:

| Commit       | Unit                                              |
|--------------|---------------------------------------------------|
| `018517bb5`  | U-PPGM17a — WEDM seal helper foundation (cherry-picked from `work/wedm-seal` fork; fork retired) |
| `14c4ffb2b`  | U-PPGM17b — `verifyWEDMBlockAnnotations()` tier-aware physics gate (28 tests; PASS_DEFAULTS / E_PACK_TABLE consistency check) |
| `334d9b82c`  | U-PPGM17c — Mitsubishi confidence/safety_margin derivation (3 tests; replaces hardcoded 0.85 / 1.0) |

Test totals: **229/229 GREEN** across 8-file PPG suite. Reviewer agent (subagent_type=reviewer) returned PASS on U-PPGM17b with one cosmetic observation (Object.prototype.toString vs Array.isArray at verifyWEDMBlockAnnotations.ts:238 — non-blocking).

---

## NEXT ACTIONS (priority order)

### Priority 1 — Wire `verify_tier` through camDispatcher.ts (`U-PPGM17d`, was U-PPGM17c in prior brief)

**WHY:** U-PPGM17b ships the `verify_tier` parameter on `sealWEDMMasterPostOutput()` but the dispatcher cases (`master_post_mitsubishi_mv1200r` ~line 5577 and `master_post_by_machine` MITSUBISHI branch ~line 5649) currently DO NOT pass `verify_tier` through. The peer claude-6f69688f had an active edit-claim on `camDispatcher.ts` for U-CAM-HM-MEDMAT-WIRE-01 which blocked the wiring.

**Plan:**
```bash
# 1. Confirm peer claim has released (5min timeout)
node H:/prism/.claude/helpers/agent-coordination.mjs read-active-claims | grep camDispatcher

# 2. If clear: edit camDispatcher.ts to pass verify_tier:
#    - master_post_mitsubishi_mv1200r case (look for `sealWEDM(wedmEngineOutput, {`)
#      Add `verify_tier: p.verify_tier` to the opts object
#    - master_post_by_machine MITSUBISHI branch (look for `sealWEDMRouter(`)
#      Add `verify_tier: (params as any).verify_tier`
#
# 3. Tests in camDispatcher routes test will need to assert the verify
#    field appears on the response when verify_tier is provided. Add
#    ≥2 tests covering pass + hard_block via dispatcher round-trip.
#
# If peer claim still active: fork to H:/prism-ppg-dispatcher-wire on
# work/ppg-dispatcher-wire, do the same edit there, cherry-pick back.
```

### Priority 2 — Tackle pre-existing HurcoV11MillMasterPostEngine sync bugs (`PPG-HARDEN`)

**WHY:** During U-PPGW-AdvancedPost-Wiring (prior session) detected 30/66 pre-existing failures in `HurcoV11MillMasterPostEngine.test.ts`. Symptoms: work-offset, spindle, tool-name emission in the SYNC `generateProgram` path. Async `generateProgramAsync` path is fine.

**Strategy:** triage into ≤5 named sub-failures, fix each with a unit (`U-PPGH01` … `U-PPGH05`), commit independently.

### Priority 3 — Investigate other master post engines for parallel verifier coverage

**WHY:** Now that `verifyWEDMBlockAnnotations()` exists, the same pattern (per-tier physics consistency gate) could apply to:
- Okuma OSP-P*M mill (currently only routes through `sealMasterPostOutput` milling/turning verifier)
- Okuma B250 lathe (same)
- Hurco V11 (same)

Likely lower-priority since the milling/turning verifier already covers their S/F shape — but worth a 30-min sweep to confirm there's no tribal-knowledge-driven emit deviation that the generic verifier misses.

---

## ENVIRONMENT REMINDERS

### vitest path (lives in repo root, not mcp-server)
```bash
cd H:/prism/mcp-server && node H:/prism/node_modules/vitest/vitest.mjs run <file>
```

### tsc path
```bash
cd H:/prism/mcp-server && node H:/prism/node_modules/typescript/bin/tsc --noEmit
```

### Cross-machine git warnings
The H: drive was last used on DESKTOP-N7MI1VB; on MarkV every git command emits:
> warning: safe.directory '%(prefix)\H;C:\Program Files\Git\prism-mill-master' not absolute

This is harmless (a stray `safe.directory` entry from an old config). Don't try to "fix" by editing global gitconfig — pipes still work, status/diff/commit all function.

### Peer-claimed files (refresh on resume)
Sample peer claims observed during 2026-05-04 session:
- `claude-6f69688f` editing `camDispatcher.ts` (U-CAM-HM-MEDMAT-WIRE-01)
- `claude-b93f4e4d` editing `HyperMillJobMonitor.ts` and HyperMill test files
- `claude-9897c938` working on `H:/prism-cad-sw-fidx` worktree (CrossProcessAIBridge / aiReasoningDispatcher)

Re-check `prism_context:read_active_claims` on resume — claims expire after ~5min idle.

---

## KEY FILES (where to look)

| File | Purpose |
|------|---------|
| `mcp-server/src/cps/verifyWEDMBlockAnnotations.ts` | NEW — tier-aware WEDM physics gate |
| `mcp-server/src/cps/verifyBlockAnnotations.ts` | Milling/turning S/F gate (parallel pattern) |
| `mcp-server/src/cps/sealMasterPostOutput.ts` | Both `sealMasterPostOutput()` and `sealWEDMMasterPostOutput()` (now with verify_tier wired for both) |
| `mcp-server/src/engines/MitsubishiMV1200RWireEDMMasterPostEngine.ts` | Now exports PASS_DEFAULTS, E_PACK_TABLE, CONFIDENCE_BY_BASIS, DEFAULT_SAFETY_MARGIN |
| `mcp-server/src/schemas/postPhysicsSidecarSchema.ts` | Schema 1.2.0 — `block_annotations[]` (milling/turning) + `wedm_block_annotations[]` (WEDM) |
| `mcp-server/src/tools/dispatchers/camDispatcher.ts` | master_post_* cases (~5400-5700) — verify_tier wiring DEFERRED to U-PPGM17d |

---

## SUCCESS CRITERIA FOR NEXT SESSION

You're done with one chat-session-worth of post-processor work when:
1. U-PPGM17d (camDispatcher verify_tier wiring) committed with reviewer PASS, OR
2. AT LEAST ONE U-PPGH0* HurcoV11 sync fix committed.
3. RESUME_POSTS_TOMORROW.md refreshed.
4. `/handoff` written for the chat.

That's enough for one session.
