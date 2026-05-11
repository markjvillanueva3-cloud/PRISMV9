# REVENUE-MS4 v2 + REVENUE-MS5 (NEW) — Round-4 Spec Revision

**Author:** round4-agent-05 (revenue-roadmap audit lane)
**Generated:** 2026-05-10
**Supersedes:** REVENUE-ROADMAP-2026-05-10.md §REVENUE-MS4 (L233-L245), which assumed `totals.drift=613`
**Premise correction:** Direct read of `state/shared/MILESTONE_PROGRESS.json` confirms `totals.drift=2` (rows: MF-MS1, MF-MS2 — both FeasibilityEngine, both `claimedStatus=completed` with `shipped=0`). The 613-figure quoted in the original spec (L13, L233) is a **306x overstatement** — likely a stale cached count from a pre-fix audit. Round-3/06 produced the corrected unit set; Round-4 adopts it and adds a separate REVENUE-SUPPORT-AUDIT milestone to capture the conflated revenue-cluster audit work the original MS4 silently smuggled into a drift-reconciliation framing.

**Boundary:** MS4 v2 is envelope hygiene only — narrow, mechanical, dry-run-gated. MS5 (NEW) is engine-grounded capability audit — evidence-driven, ENGINE_DIGEST/BUILD_STATE referenced row-by-row, no envelope mutations.

---

## REVENUE-MS4 v2 — Envelope drift reconciliation (2-3 units)

**Why:** Two envelope rows (MF-MS1, MF-MS2) claim `completed` but git shows `shipped=0`. These are the **entire** drift surface — not 613, not 10 clusters. The unit is to dry-run `/envelope-sync` on each, request the FeasibilityEngine owner's decision on the AGENT_CHAT bus, and apply only on human `--apply`. Per `envelope-sync.md` L80: *"Never auto-apply without user --apply flag and visual review."*

**Depends on:** none. **Blocks:** MS5 audit (so the audit output isn't polluted by envelope-noise rows). **Revenue impact:** indirect — hygiene only; reconciles trust in own roadmap.

### Units

#### U-DRIFT-01 — Reconcile MF-MS1 via `/envelope-sync` (dry-run + human approval)

**depends_on:** []
**unit_size:** small (≤4h, mostly waiting on owner response)
**risk:** low (dry-run by default; 1 envelope; no engine mutation)
**blocks_revenue:** false

**Spec:** Run `/envelope-sync MF-MS1` in default dry-run mode. Envelope currently claims `status=completed` with `shipped=0/4`. Two valid resolutions:
- **(a) Work genuinely abandoned →** propose flip `status=not_started`, mark units `pending`.
- **(b) Work in flight on another branch →** propose flip `status=in_progress`, leave units as-is.

Decision belongs to the FeasibilityEngine owner. This unit produces the patch JSON + a tagged review request — **never autonomous `--apply`.**

**Acceptance (evidence-grounded):**
1. `state/shared/envelope-sync-MF-MS1.patch.json` exists with full `--dry-run` output (current envelope state, proposed delta, decision branch).
2. `state/shared/AGENT_CHAT.md` contains a PR-style post tagging the FeasibilityEngine owner (last committer on `src/engines/FeasibilityEngine.ts` per `git log -1 --format=%an`).
3. After owner approval, `--apply` commit lands; re-running `node scripts/build-milestone-progress.mjs` reports `totals.drift` decremented by 1 (target: from 2 → 1).
4. If owner unreachable >48h: envelope tagged `envelope-stale`, unit closes `status=deferred-to-owner-response`. **NEVER autoflip without owner sign-off** (per round3/06 F-r2-a7-4 cascade-risk finding).
5. Verification re-runnable in <30s: `rtk git log --oneline -- mcp-server/data/milestones/MF-MS1.json && node scripts/build-milestone-progress.mjs`.

---

#### U-DRIFT-02 — Reconcile MF-MS2 via `/envelope-sync` (dry-run + human approval)

**depends_on:** []  (independent of U-DRIFT-01 — different envelope, different unit list, can run in parallel)
**unit_size:** small (≤4h)
**risk:** low
**blocks_revenue:** false

**Spec:** Identical workflow to U-DRIFT-01 but for `MF-MS2` (`shipped=0/3`, also `claimedStatus=completed`). Same dry-run-first, owner-approval gate, never-autoflip discipline.

**Acceptance (evidence-grounded):**
1. `state/shared/envelope-sync-MF-MS2.patch.json` exists with full `--dry-run` output.
2. AGENT_CHAT post tagging owner (same provenance check as U-DRIFT-01; likely same owner since both envelopes are FeasibilityEngine).
3. After owner approval, `--apply` commit lands; `totals.drift` decrements to 0 (combined with U-DRIFT-01 closure).
4. Owner-unreachable path identical: `envelope-stale` tag, `deferred-to-owner-response` close.
5. Verification re-runnable in <30s: `rtk git log --oneline -- mcp-server/data/milestones/MF-MS2.json && node scripts/build-milestone-progress.mjs`.

---

#### U-DRIFT-03 (OPTIONAL) — 6h drift-watch cron monitor

**depends_on:** ["U-DRIFT-01", "U-DRIFT-02"]
**unit_size:** small (≤4h)
**risk:** low (read-only monitor, no envelope mutation)
**blocks_revenue:** false
**optional:** true
**optional_rationale:** Nice-to-have, not gating. If U-DRIFT-01 + U-DRIFT-02 close the drift surface to 0 within 1 day and no new envelopes are being created at scale, the cron adds telemetry overhead without commensurate value. Defer to backlog if MS5 has unmet capacity.

**Spec:** Register a cron that runs `scripts/build-milestone-progress.mjs` every 6h. If `totals.drift > 0` after the run, post a one-line summary to `state/shared/AGENT_CHAT.md` naming the drifted milestones. **Silent on drift=0** (avoid spam). Use existing scheduling infrastructure (`/cron-bootstrap`, `/cron-manage`). Per round3/06 F-r2-a7-4: this is monitoring only, **never auto-remediation**.

**Acceptance (evidence-grounded):**
1. Cron registered via `/cron-bootstrap` or equivalent; fires every 6h with deterministic ID for `/cron-manage` lookup.
2. `MILESTONE_PROGRESS.json` regenerated each fire (mtime check confirms).
3. `AGENT_CHAT.md` receives a post **only** when `drift > 0`; silent runs leave the file untouched.
4. Cron writes telemetry to `state/shared/drift-watch-cron.json` with schema `{lastRun, driftCount, milestonesAffected[], runDurationMs}`.
5. Manual smoke test: artificially patch one envelope to create drift, confirm next fire posts alert within 6h (or trigger via `/cron-manage run <id>`), then revert. Documented in unit close comment.

---

## REVENUE-MS5 (NEW) — Revenue-cluster capability audit (4 units)

**Why:** The original MS4 attempted to use envelope drift as a proxy for *"revenue clusters not yet shipped."* That proxy is invalid — drift=2, and neither row touches SFC, Master Post, or CAM bridges. The actual revenue question is **"do these subsystems expose billable, dispatcher-wired, frontend-reachable capability?"** That requires direct evidence audit against `ENGINE_DIGEST.md` + `BUILD_STATE.json`, **not** envelope reconciliation.

**Evidence anchors (every audit must cite these by row/line, no fabricated counts):**
- `ENGINE_DIGEST.md` — E0182 (Hurco V11 Master Post), E0265-E0271 (Lathe Master Post family), E0321-E0322 (MasterPost AGI), E0337 (WEDM Master Post), E0355 (Okuma B250 Master Post)
- `BUILD_STATE.json` §`needs_wiring`, §`needs_frontend`
- Recent commit `9386a4e88` (U-WIRE-CALC-SCE — sanity-check that SFC wiring is reflected)
- Recent commit `bf041d0f5` (U-WIRE-LATHE-BATCH2 — Lathe AI/intelligence wiring)
- `state/shared/system-viz/system-graph.json` — node + edge presence per engine

**Depends on:**
- `REVENUE-MS0` (frontend merge plan — audit needs the frontend surface to score)
- `U-DRIFT-01` + `U-DRIFT-02` (closes envelope noise so audit verdicts aren't polluted)

**Blocks:**
- `REVENUE-MS1` billing/tier gating — cannot gate what doesn't exist as a complete revenue-grade surface (engine + dispatcher + frontend + billable boundary)

**Cross-referenced by:** round3-5/01 (SFC backend findings), round3-5/05 (Master Post controller-dialect findings)

---

### Audit acceptance template (used by all 4 units)

Every audit unit emits a JSON report under `state/shared/audit-findings/revenue-roadmap/round3-audit-<cluster>.json` with the schema:

```
{
  "auditedAt": "<ISO timestamp>",
  "cluster": "<sfc|masterpost|cam-bridges|synthesis>",
  "sources_cited": [{"file": "<path>", "anchor": "<line/row/commit>"}],
  "rows": [
    {
      "engine": "<EngineName>",
      "engine_digest_row": "E####",
      "wired_to_dispatcher": <bool>,
      "dispatcher_actions": ["prism_calc:action_name", ...],
      "stub_check": "<non-stub|stub|tagged-WIRE-EXEMPT:<wrapper-ref>>",
      "test_coverage": {"file": "<path>", "non_trivial_assertions": <count>},
      "frontend_exposed": <bool>,
      "billable_boundary_present": <bool>,
      "severity": "<high|medium|low>",
      "recent_fix_commit": "<sha if applicable>",
      "build_state_block": "<needs_wiring|needs_frontend|wired|null>"
    }
  ],
  "gaps": [
    {"gap": "<one-line>", "severity": "<high|med|low>", "suggested_unit": "<U-... id>"}
  ],
  "verdict_summary": {"ships_today": <int>, "needs_wiring": <int>, "needs_frontend": <int>, "missing": <int>}
}
```

**Universal acceptance criteria** (every audit unit must satisfy):

1. **Evidence-grounded:** Every row cites at least one source from `sources_cited` by line/row/commit. No fabricated counts. Auditor's claim is reproducible by `rtk grep` or `rtk git log` against the cited anchor.
2. **No envelope dependency:** Audit verdict is driven by engine presence + dispatcher wiring + frontend reachability, **not** by milestone-envelope claims. Envelope status is irrelevant data here.
3. **WIRE-EXEMPT compliance:** If an engine has `dispatcher_actions=[]` but is genuinely wrapped by a singleton, it must be tagged `WIRE-EXEMPT:<wrapper-ref>` per CLAUDE.md ENGINE WIRING law (e.g. `QdrantMemoryEngine` ← `QdrantMemoryEngineSingleton`).
4. **JM Die anchor:** Where the engine operates on machine programs (Master Post, CAM bridges), at least one row must reference a real `JM DIE/` sample file path proving round-trip on real shop data (per CLAUDE.md JM Die test-shop directive).
5. **Stub detection:** Use the `always-build-guard.mjs` heuristic to flag `return 0`, `TODO`, `throw new Error('not implemented')` and similar placeholder bodies. Stubs with `severity=high` cannot ship as revenue-grade.
6. **Round-trip via dispatcher:** Where `dispatcher_actions > 0`, at least one cited test must call **through the dispatcher**, not directly into the engine singleton (per CLAUDE.md round-trip law).
7. **Auditable in <5min:** Re-run cost documented at unit close: `rtk vitest run -- <audit-script>.test.ts && rtk grep -l <pattern> mcp-server/src/tools/dispatchers/`.

---

### Units

#### U-REV-AUDIT-SFC-01 — Audit SFC engine family for stub returns + dispatcher wiring

**depends_on:** ["U-DRIFT-01", "U-DRIFT-02"]
**unit_size:** medium (≤8h — enumeration + per-engine verification)
**risk:** low (read-only audit; no engine mutation)
**revenue_impact:** high — SFC is Product #1 (per-seat subscription); stubs here block revenue
**cross-check:** round3-5/01 SFC backend findings

**Spec:** Enumerate every engine in `mcp-server/src/engines/` matching the regex `SpecificCuttingEnergy|SpeedFeed|CuttingForce|Kienzle`. For each engine produce a row using the universal schema above. Specifically verify:
- (a) **Non-stub implementation** — body returns a computed value, not `0` / `null` / `throw new Error('TODO')`. Use the same `always-build-guard.mjs` heuristic the Stop hook uses for build discipline.
- (b) **Dispatcher wiring** — engine is referenced in `prism_calc` dispatcher (`mcp-server/src/tools/dispatchers/calcDispatcher.ts` and/or `camDispatcher.ts`). Use `prism_session:action_search` first; fall back to `rtk grep -l <EngineName> mcp-server/src/tools/dispatchers/` only if the dispatcher index is stale.
- (c) **Test coverage** — at least one `<EngineName>.test.ts` file asserts a non-trivial numeric output (not just `expect(result).toBeDefined()`).
- (d) **Cross-check recent fix** — commit `9386a4e88 [U-WIRE-CALC-SCE]` wired `SpecificCuttingEnergyEngine` into `prism_calc`; that wiring MUST appear in this audit. If it doesn't, the audit's grep regex or dispatcher resolution is broken.

**Acceptance (evidence-grounded, beyond universal):**
1. Audit JSON written to `state/shared/audit-findings/revenue-roadmap/round3-audit-sfc.json` per schema.
2. Every SFC-family engine has either `dispatcher_actions > 0` OR an explicit `WIRE-EXEMPT:<ref>` tag with wrapper reference.
3. Stubs flagged by severity: `high` if it's the canonical SFC engine (e.g. `SpecificCuttingEnergyEngine`); `low` if a deprecated variant.
4. Output cross-referenced with `BUILD_STATE.needs_wiring` — no SFC engine appears in `needs_wiring` without an entry in the audit's `gaps[]`.
5. Commit `9386a4e88` SCE wiring is visible in the audit row for `SpecificCuttingEnergyEngine` (`recent_fix_commit: "9386a4e88"`).
6. Re-run cost: `rtk vitest run -- *SpecificCuttingEnergy* && node scripts/audit-sfc-cluster.mjs` (target <2min).

---

#### U-REV-AUDIT-MASTERPOST-01 — Master Post controller-dialect coverage audit

**depends_on:** ["U-DRIFT-01", "U-DRIFT-02"]
**unit_size:** medium (≤8h)
**risk:** low
**revenue_impact:** high — Master Post is Product #2 (per-seat subscription); dialect gaps = lost customer segments
**cross-check:** round3-5/05 Master Post findings

**Spec:** ENGINE_DIGEST lists 11 Master Post engines: Lathe family (E0265-E0271), AGI variants (E0321-E0322), WEDM (E0337), Okuma B250 (E0355), Hurco V11 (E0182). For each:
- (a) **Dialect mapping** — identify target controller dialect (Fanuc / Siemens / Haas / Mazak / Mitsubishi / Sodick / Makino / AgieCharmilles / Okuma OSP / Hurco WinMax / etc.).
- (b) **JM DIE round-trip anchor** — cite at least one program file in `JM DIE/` that the engine handles (per CLAUDE.md JM Die test-shop law). If no sample exists for a dialect, flag in `gaps[]` with `severity=high` (no real-shop validation = not revenue-grade).
- (c) **Dispatcher exposure** — confirm `prism_cam` or `camDispatcher` has a `generate_post`-class action that routes to this engine. Use `prism_session:dispatcher_map_compact` to enumerate.
- (d) **Dialect gap list** — every controller in `ShopConfigurationEngine`'s 21-machine fleet must have either an engine OR a justified deferral row.

**Acceptance (evidence-grounded, beyond universal):**
1. Audit JSON written to `state/shared/audit-findings/revenue-roadmap/round3-audit-masterpost.json` per schema, with all 11+ engines enumerated.
2. Every row has a `jm_die_sample_path: "JM DIE/.../*.MIN"` (or `.f3d`/`.SLDPRT`/`.ipt`/`.iam` per CLAUDE.md JM Die program-save-practice memory) proving real-shop round-trip.
3. Dialect-gap list explicit: every shop-controller × machine-family pair has a coverage verdict.
4. For at least one dialect with `frontend_exposed=false`, a follow-up wiring task filed in `BUILD_STATE.needs_frontend` with `priority=revenue` tag.
5. Cross-check round3-5/05 findings — if round3-5/05 flagged a dialect gap, this audit's `gaps[]` must contain the matching row OR cite contradiction with evidence.
6. Re-run cost: `node scripts/audit-masterpost-cluster.mjs && rtk grep -l "Master Post\|MasterPost" mcp-server/src/tools/dispatchers/` (target <3min).

---

#### U-REV-AUDIT-CAM-BRIDGE-01 — Six tier-1 CAM-bridge audit

**depends_on:** ["U-DRIFT-01", "U-DRIFT-02"]
**unit_size:** medium (≤8h)
**risk:** low
**revenue_impact:** very high — each bridge is a sellable integration channel; CAM-vendor add-ins are the customer-discovery pipeline
**cross-check:** `cowork-connectors` skill ground-truth + ENGINE_DIGEST search for `*BridgeEngine`

**Spec:** Six external CAM systems: **Fusion 360, hyperMILL, Mastercam, ESPRIT, Inventor HSM, SolidWorks CAM**. For each:
- (a) **Bridge engine exists** — search ENGINE_DIGEST for `*BridgeEngine` / `*ConnectEngine` / `*HostEngine` matching the vendor. Use `prism_session:tool_route_best` for the search; fall back to `rtk grep -l "FusionBridge\|HyperMILLBridge\|MastercamBridge\|EspritBridge\|InventorHSMBridge\|SolidWorksCAMBridge" mcp-server/data/docs/ENGINE_DIGEST.md` if needed.
- (b) **Dispatcher-wired** — vendor-specific action in `prism_cam` (e.g. `prism_cam:fusion_send_post`) or dedicated vendor dispatcher (e.g. `prism_fusion`, `prism_hypermill`).
- (c) **Smoke test** — at least one E2E test path documents a real add-in handshake (HTTP for Fusion in-host runner, file-watch for hyperMILL Project Manager, COM/.NET for Mastercam C-Hook, etc.).
- (d) **Shipped surface** — is the add-in/plugin discoverable (CAM-vendor extension store entry, `mcp-server/web/cam-bridges/<vendor>/`, signed installer in `dist/`, etc.)?

**Acceptance (evidence-grounded, beyond universal):**
1. Audit JSON written to `state/shared/audit-findings/revenue-roadmap/round3-audit-cam-bridges.json` with six rows (one per vendor).
2. Each existing bridge row has one E2E smoke-test path documented + `ci_runnable: true|false` flag (Fusion 360 in-host runner won't be CI-runnable on Linux runners — that's a documented limitation, not a failure).
3. Each missing bridge has a one-paragraph `build_plan` field: target engine name, dispatcher action shape, minimum add-in surface (panel-only? full menu? toolbar?), estimated effort.
4. **Cowork-connectors cross-check:** if `cowork-connectors` skill lists a bridge but `src/engines/` has no matching `*BridgeEngine`, that's documentation drift → filed as `gaps[]` row with `severity=high` (skill lies about capability).
5. Vendor priority ordering matches `cowork-connectors` skill order — Fusion 360 first (live add-in panel exists per spec L31), hyperMILL second (production, 63 engines), then the four needing UI shells.
6. Re-run cost: `node scripts/audit-cam-bridges.mjs && grep "Bridge" mcp-server/data/docs/ENGINE_DIGEST.md` (target <2min).

---

#### U-REV-AUDIT-SYNTHESIS-01 — Synthesis report feeding REVENUE-MS1 billing gates

**depends_on:** ["U-REV-AUDIT-SFC-01", "U-REV-AUDIT-MASTERPOST-01", "U-REV-AUDIT-CAM-BRIDGE-01"]
**unit_size:** small (≤4h — synthesis only, no new audit)
**risk:** low
**revenue_impact:** critical — direct input to REVENUE-MS1 tier/billing gate design

**Spec:** Combine the three audit JSONs above into a single human-readable markdown report at `state/shared/audit-findings/revenue-roadmap/round3-revenue-cluster-gaps.md`. For each cluster (SFC, Master Post, CAM bridges), list:
- (a) **Ships TODAY at revenue grade** — dispatcher-wired + frontend-reachable + billable-able (subscription-gate-compatible).
- (b) **Engine-only** — implementation exists but needs wiring or frontend before billable.
- (c) **Missing entirely** — no engine, no plan, gap-to-build.

This report becomes the **input contract** for REVENUE-MS1 billing/tier gating. You cannot gate what does not exist as a complete revenue surface — MS1 needs the bucket-(a) list to know what to charge for, the bucket-(b) list to know what's coming, and the bucket-(c) list to deprioritize.

**Acceptance (evidence-grounded, beyond universal):**
1. Single markdown report with three cluster sections (SFC, Master Post, CAM bridges).
2. Each cluster has a `{ships, needs_wiring, missing}` count tally that **sums to the input audit JSON row count** (no rows lost or invented in synthesis).
3. Report cites `BUILD_STATE.json` blocks and `ENGINE_DIGEST.md` rows by line/row — every numeric claim is auditable; no fabricated counts (round3/06 explicitly rejected the 613 fabrication, this synthesis must not reintroduce that class of error).
4. Filed under `state/shared/audit-findings/revenue-roadmap/round3-revenue-cluster-gaps.md`, available for round-4 cross-validation by another agent and for REVENUE-MS1 consumption.
5. Synthesis includes a **"recommended MS1 tier matrix"** section mapping each ships-today capability to a proposed tier (free / hobbyist / pro / shop / enterprise per spec §REVENUE-MS1) — gives MS1 a head start.
6. Re-run cost: `node scripts/synthesize-revenue-cluster-audit.mjs` (target <30s — pure JSON-to-markdown transform).

---

## Unit count summary

| Milestone | Old unit count | New unit count | Delta |
|---|---|---|---|
| REVENUE-MS4 (original, drift-cluster premise) | 10 (U-DRIFT-01..10) | 2 required + 1 optional (U-DRIFT-01, -02, -03) | -7 to -8 |
| REVENUE-SUPPORT-AUDIT-MS5 (NEW — surfaces conflated audit work) | 0 (didn't exist) | 4 (U-REV-AUDIT-SFC-01, -MASTERPOST-01, -CAM-BRIDGE-01, -SYNTHESIS-01) | +4 |
| **Combined total** | **10** | **6 required + 1 optional = 6-7** | **-3 to -4** |

**Net effect:** -3 to -4 total units; **but** the new units are evidence-grounded (ENGINE_DIGEST + BUILD_STATE cited row-by-row) rather than envelope-grounded (a false 613-drift count). Quality of deliverables is dramatically higher per unit. No autonomous envelope mutation anywhere. Premise of every unit is direct evidence, not derived from a stale count.

---

## Boundaries and what this revision does NOT do

- Does **NOT** mutate envelopes autonomously — every flip needs human `--apply` per `envelope-sync.md` L80.
- Does **NOT** assume 613 drifted milestones — round-2 F-r2-a7-1 proved drift=2 and round-3/06 adopted that fix.
- Does **NOT** conflate envelope hygiene with revenue-grade capability audit — MS4 is hygiene only; MS5 is the audit.
- Does **NOT** invent counts — every count in audit deliverables must trace to a file row, commit sha, or dispatcher action enum entry.
- Does **NOT** depend on peer-chat-owned surfaces (dispatcher plumbing, infra, neural training, system-viz internals — per spec L327-L339).
