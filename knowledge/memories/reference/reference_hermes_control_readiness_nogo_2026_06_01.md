---
name: reference_hermes_control_readiness_nogo_2026_06_01
description: hermes-readiness-audit workflow (8 agents, slot:bravo 2026-06-01) — Hermes fleet-control is NO-GO (0/4 CRITICAL dims ready). Orchestrator runtime dark, control path unsafe+ungoverned, handleAssign schema-collides (silent loss + audit log lies), 12/34 galaxies unaddressable. Wired-but-dormant.
type: reference
source: prism-memory
synced: 2026-06-09T14:54:09.138Z
aliases: reference_hermes_control_readiness_nogo_2026_06_01
---


2026-06-01 (slot:bravo). Operator asked "is our Hermes agent ready to operate and control all galaxies?"
Ran the `hermes-readiness-audit` Workflow (7 adversarial dimension-auditors + synthesis; run
`wf_0bc33d45-25d`) + a completing GOVERNANCE_SAFETY pass. **VERDICT: NO-GO** — Hermes is NOT ready to
operate/control all 34 galaxies. **0 of 4 CRITICAL dims READY.** Full artifact:
`state/shared/specs/HERMES-CONTROL-READINESS-2026-06-01.md` (committed `U-HERMES-READINESS-AUDIT`).

**Scorecard:** REACH=PARTIAL(0.88) · COMMAND_CONTROL=NOT_READY(0.90) · RUNTIME_LIVENESS=NOT_READY(0.95) ·
GOVERNANCE_SAFETY=NOT_READY(0.90) [all 4 CRITICAL] · CONSENSUS=NOT_READY · REASONING_ROUTING=NOT_READY ·
REFLECTION_LEARNING=PARTIAL [enhancing].

**KEY: "wired ≠ ready."** Most of Hermes EXISTS as real, dispatcher-bound code (ZuluDashboardControl +
ZuluTaskAuction engines tested, MultiModelConsensus real+fail-loud, Moonshot HTTP client real, reflection
populater works). The failures are at the RUNTIME / CLOSED-LOOP / PROVISIONING / GOVERNANCE layer.

**BUG FINDINGS (belong in `## Recent regressions`):**
1. **Orchestrator runtime DARK ~2 days.** `PRISM Zebra Orchestrator` scheduled task is **Disabled** AND
   its target `scripts/zebra-orchestrator-sweep.mjs` was **deleted** by the 2026-05-30 Zebra→Zulu migration
   (double-broken). Replacement `PRISM Zulu Orchestrator` **never registered**. `fleet-task-health-watch.mjs`
   doesn't track it by name → outage invisible to the safety net. Fix: `install-zulu-orchestrator-task.ps1
   -RunNow` (elevated) + add the task to KNOWN/CRASH-CRITICAL in fleet-task-health-watch.
2. **`handleAssign` schema collision = silent loss + lying audit log.** `scripts/hzp-dash-control-server.mjs
   handleAssign` writes a per-slot ARRAY as a SIBLING of `claims`/`schemaVersion` in slot-task-claims.json;
   canonical `slot-task-claim.mjs readStore` requires object-keyed `{schemaVersion, claims:{unit:row}}` with
   `isValidClaimRow` shape → the orphaned key is SILENTLY IGNORED (not even flagged corrupt), the assignment
   is lost, and `hzp-dash-audit.jsonl` records `authorized:true` for an assign that never reached the claim
   system (the log LIES). No `assign` PUSH verb (only self-service PULL); no consumer reads
   `assigned_by`/`assigned_at`. Control server not running (:8767 closed). Auction recommends, dispatches nothing.
3. **Control path is UNSAFE + ungoverned.** `:8767` HTTP actions BYPASS every PreToolUse safety hook
   (cross-worktree firewall, file-claim-guard, main-tree-write-block — the last is DEFAULT-OFF anyway);
   `golf-slot-write-allowlist` not wired in settings.json; **no actor authentication** (the soul gate validates
   the TARGET slot, not the ISSUER → any loopback caller wields operator authority); refuse_list on only 11/27
   souls w/ brittle substring matching; **no veto ceiling bounding Hermes itself** (`hzp-dash-vetoes.jsonl`
   doesn't exist). → A working control loop here would be a working UNSAFE loop. **GOVERNANCE must land BEFORE
   COMMAND_CONTROL (safety order).**
4. **REACH 22/34.** 12 galaxies have no `SLOT_GALAXY_MAP` owner (agent-orchestration, backend-helper,
   cad-fusion-live, compliance-safety, corpus-aggregation, knowledge-conversion, mit-curriculum, pdf-corpus,
   pdf-corpus-mill, quality, shop-floor, tribal-knowledge). bravo's OWN slot/bravo worktree maps bravo/zulu →
   non-existent `hermes-zebra` (canonical `hermes-zulu`; shared-tree fix `3ae2dcc3a2` not merged into worktree).

**Path to READY (safety-correct order):** runtime (register Zulu task) → GOVERNANCE (actor auth + issuer-soul
gate + veto ceiling + firewall re-entry; operator-greenlit, safety-sensitive) → bravo control-loop (handleAssign
through canonical claimStore + assign verb + pickup consumer + worktree map sync). GO trigger = one E2E
assign→pickup→ack with governance provisioned. Routed to operator/golf/sierra via AGENT_CHAT. NOT a quick fix —
a sequenced milestone with safety implications; operator should greenlight before bravo builds the control loop.

Wiki: [[psn-octopus-fleet-synergy-ms0]]. Prior Hermes research: HERMES-MEMORY-VAULT / HERMES-CAPABILITY-EXPANSION /
HERMES-DASH deep-research (2026-05-23..25). Sibling: [[reference_fleet_synergy_audit_2026_06_01]].

**FIX LOG — bug #2 corruption arm CLOSED (commit `ca38013a4f`, U-HERMES-ASSIGN-FAILLOUD, slot:bravo 2026-06-01).**
`handleAssign` no longer writes the schema-incompatible per-slot sibling key. It now **fails loud — HTTP 501
`{ok:false, error:"assign-not-wired-to-canonical-claim-store"}`** and writes NOTHING to slot-task-claims.json
(R12). This kills the *silent loss + lying ok:true audit* half of bug #2; the canonical store can no longer be
corrupted by the control server. The OTHER half — the real PUSH-assign verb wired through `slot-task-claim.mjs`
claimStore + a pickup consumer — remains DELIBERATELY UNBUILT, gated behind GOVERNANCE_SAFETY per the safety
ordering (a working assign pre-governance = a working UNSAFE loop). So COMMAND_CONTROL stays NOT_READY by design;
this fix only removes the data-corruption hazard so the interim state is honest rather than lying. Module also made
testable (STATE_DIR env-overridable + listen-as-main guard + `{handleAssign,handleVeto,ROUTES,PATHS,checkAuthority}`
exports); 4 hermetic node:tests (`scripts/hzp-dash-control-server.test.mjs`), both per-file scrutiny arms PASS
(empirically verified: 501 + store byte-unchanged + no port-bind-on-import + fails-on-revert). Overall verdict
UNCHANGED: still NO-GO (0/4 CRITICAL dims) — runtime still dark, governance still absent, 12/34 galaxies still
slot-unaddressable.
