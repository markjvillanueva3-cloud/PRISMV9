# RESUME — "continue post processor work" (NEXT SESSION'S START)

**Trigger phrase:** `continue post processor work`
**Last updated:** 2026-05-05 ~18:50 UTC by claude-32612444 (prior: ~14:55 by claude-9435742c, ~08:10 by claude-803437e0)
**For:** the next post-processor chat (any session ID)
**Companion:** `RESUME_POSTS.md` (full PPG history) · this file is the focused next-action brief.

---

## 2026-05-05 SESSION (claude-32612444) — U-PPGM18 + U-PPGMU01 LANDED ON work/ppgh05

### U-PPGMU01 — Multus B250II facade scaffold (NEW ENGINE)

**Why this engine is a FACADE not a from-scratch mill-turn engine:** the canonical asset is already the PRISM-Enhanced Mastercam/Fusion CPS post at `JM DIE/PRISM MODIFIED POST PROCESSORS/OKUMA_MULTUS_B250IIW-PRISM-Enhanced-v5_2_7.cps` (233 KB, OSP-P300SA controller, FORKID `D93DAA65-1C09-402E-9871-3280B561D994`, 11 `usePRISMxxx` intelligence flags already wired into the .cps's properties block). The .cps does the actual G-code emission — Mastercam/Fusion drives it. PRISM's job is to wrap and validate, not to re-emit. **Never** scaffold a from-scratch mill-turn engine here; the existing post is the source of truth.

**Files:**
- `mcp-server/src/engines/OkumaMultusB250IIMillTurnMasterPostEngine.ts` (NEW, ~310 lines)
- `mcp-server/src/__tests__/OkumaMultusB250IIMillTurnMasterPostEngine.test.ts` (NEW, ~250 lines)

**Surface:**
- 7 pinned constants (`CANONICAL_POST_RELATIVE_PATH`, `CANONICAL_POST_FILENAME`, `CANONICAL_CONTROLLER`, `CANONICAL_FORKID`, `CANONICAL_REVISION_TAG`, `CANONICAL_MINIMUM_RUNTIME_REVISION`, `PRISM_INTELLIGENCE_FLAGS`)
- `parseMetadata(cpsContent)` — pure regex extraction (no eval), returns typed `MultusPostMetadata`
- `validateCanonical(meta)` — drift detection (FORKID swap, revision regression, missing PRISM flags, lost capability)
- `inspectCanonical({cpsContent? | cpsPath? | repoRoot?})` — load + parse + validate, with dependency injection for tests
- `getStats()` — capability census surface

**Tests:** 15/15 pass + 1 skipped (live `.cps` read — skipped here because `JM DIE/` isn't checked out in the ppgh05 worktree; main worktree CI exercises it). Regression sweep on Hurco/OkumaOSP/Mitsubishi/seal: 199/199 GREEN. tsc clean.

**KEY GOTCHA fixed during authoring:** the property-name regex `/^\s{2}(name): \{$/gm` rejected single-line `name: { ... },` PRISM-flag declarations because of the `$` anchor — only the 2 multi-line shop-level properties matched, giving `propertyCount=2`. Drop `$` (the regex docstring above the constant explains why).

### U-PPGM18 — sealMasterPostOutput schema_version assertion fix

**SHIPPED:** `[CAM-EXHAUST-MS0]/U-PPGM18: align stale sealMasterPostOutput schema_version assertion with current 1.2.0 constant`

**WHAT:** `sealMasterPostOutput.test.ts:71` was the lone failure across the seal+sidecar suite — pre-existing 1.1.0 vs 1.2.0 drift documented by claude-803437e0 on 2026-05-05 ~08:00 (caused by PPG-WIRE-MS6/U-PPGM16 bumping the WEDM schema). Fixed by importing the exported `POST_PHYSICS_SIDECAR_SCHEMA_VERSION` constant rather than re-hardcoding "1.2.0", so the next additive bump won't break this assertion the same way.

**STATE:** running `sealMasterPostOutput + sealWEDM + four SidecarIntegration suites + PhysicsSidecarBuilderEngine` = **127/127 GREEN, zero regressions**. tsc clean on touched file under project tsconfig.

**STATE OF Hurco/Okuma engines on this branch:** `HurcoV11MillMasterPostEngine.test.ts` 88/88 · `OkumaOSPMillMasterPostEngine.test.ts` 67/67 · `MitsubishiMV1200RWireEDMMasterPostEngine.test.ts` 23/23. Earlier briefs' "12 fail / 81 total" Hurco snapshot is OBSOLETE — U-PPGH10..U-PPGH15 + U-PPGOH01..U-PPGOH05 all landed since (see git log `work/ppgh05`).

---

## NEXT ACTIONS (priority order, refreshed 2026-05-05 ~18:50)

### Priority 1 — Continue the U-PPGMU0N Multus progression
The facade is shipped (U-PPGMU01). Next units, smallest-first:
- **U-PPGMU02** — wire the engine to camDispatcher: add `master_post_okuma_multus_b250` action that invokes `inspectCanonical()` and threads the result through `sealMasterPostOutput`. **Caution:** camDispatcher.ts in **main** worktree is permanently churned by peer chats — edit ppgh05's copy here, cherry-pick later.
- **U-PPGMU03** — Kienzle Fc cross-check: when `usePRISMCuttingForceEstimate` is on, parse the .cps's emitted `(Fc=XXX N)` comment lines and verify against `CANONICAL_KIENZLE` for each op's `material_iso` + `axial_depth_mm` + `fz`. Hard-block if drift > 15%.
- **U-PPGMU04** — Taylor T cross-check: when `usePRISMToolLifeTracking` is on, verify the post's emitted tool-life estimate against `CANONICAL_TAYLOR`. Same drift threshold.
- **U-PPGMU05** — BlockAnnotation envelope: parse the .cps output stream, attribute each block to an op, emit `block_annotations[]` so `sealMasterPostOutput` can seal Multus output the same way it seals Hurco/OkumaOSP/Mitsubishi.
- **U-PPGMU06+** — feature parity sweep against the 11 PRISM flags one at a time (warmup, thermal-comp, arc-feed, corner-decel, tool-break, chip-load, stability, cycle-time, surface-finish, force-est, tool-life).

### Priority 2 — `OkumaB250LatheMasterPostEngine.test.ts` does not exist
Only `OkumaB250LatheMasterPostEngine.SidecarIntegration.test.ts` and `integration/MasterPostOkumaB250.integration.test.ts` exist — no full unit-test file. The `stop_on_untested_engine` hook may already flag this. Authoring one would bring the lathe master post to feature parity with Hurco/OkumaOSP coverage.

### Priority 3 — Bring OkumaB250 + Mitsubishi WEDM to Hurco/OkumaOSP feature parity
Hurco/OkumaOSP gained these in U-PPGH10..U-PPGH15 + U-PPGOH01..U-PPGOH05:
- `postSingle` simplified API
- structured `op.tool` shadowing flow
- structured `setup_sheet` payload (machine-flavored)
- Kienzle-bounded feed clamp on sync path
- stickout deflection physics check

OkumaB250 (lathe) and Mitsubishi WEDM most likely lack a subset. Audit each, pick smallest gap, ship one feature per unit (`U-PPGOB01+`, `U-PPGMV01+`).

### Priority 4 — Cherry-pick ppgh05 → cam-exhaust-ms0
`work/ppgh05` is now several units ahead of `work/cam-exhaust-ms0`. When the camDispatcher peer-claim chain in main releases, the ppgh05 lineage should be merged or cherry-picked back. Don't fight for camDispatcher — this is engine + test work only.

### (Stale) Priority — U-PPGM17d camDispatcher verify_tier wiring
Still applicable but blocked: camDispatcher.ts is permanently churned by peer chats on the main worktree. Do NOT take this on without a fresh worktree fork.

---

## 2026-05-05 SESSION (claude-803437e0) — U-PPGH04 LANDED + U-PPGH05 REGRESSION FIX

**REPO HEALTH:** Earlier in this session `H:/prism/.git` had corrupt tree/blob objects (unreadable tree `c91078d8...`, blob `577dffe1...` for CAMAnalyzeEngine.test.ts, unreadable parent commit `fc960eeb...`). `git fetch --refetch origin` (exit 0, ~minutes) repopulated all missing objects; `git status` and commits now work. A stale `.git/index.lock` from 07:37 was also removed manually (user-approved). If a future session sees `unable to read tree` errors again, run `git fetch --refetch origin` first before any other recovery.

**REGRESSION INTRODUCED + FIXED THIS SESSION:** U-PPGH04 (commit `5b0812d10`) was authored against a STALE 1407-line copy of `HurcoV11MillMasterPostEngine.ts` while the canonical version on the branch was 1664 lines (with U-PPGH02 aggressiveness L1-L5 + U-PPGH03 prove-out features). The commit silently dropped 257 lines of feature code. Detected by re-running the unit-test suite — 28 tests still failed because `HURCO_AGGRESSIVENESS_TABLE`, `prove_out`, etc. were absent from the engine. **U-PPGH05** (next commit) restores the engine from `HEAD~3` and re-applies the U-PPGH04 changes (material override + sanity bounds + `(kc1_1=X mc=Y)` suffix) on top. After U-PPGH05: aggressiveness suite GREEN, coolant suite GREEN, sidecar integration GREEN, material override GREEN — net +13 tests vs. broken-U-PPGH04 state.

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
