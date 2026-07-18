---
title: FLEET-CONTROL GOVERNANCE DESIGN
version: 1.0.0
status: DESIGN (not yet built)
created: 2026-06-15
author: governance-design subagent (slot:zulu session)
source_docs:
  - state/shared/specs/HERMES-CONTROL-READINESS-2026-06-01.md
  - mcp-server/src/engines/ZuluFleetGovernorEngine.ts
  - scripts/hzp-dash-control-server.mjs
  - mcp-server/src/engines/ZuluDashboardControlEngine.ts
readiness_status: NO-GO (lifts when §5 GO criteria are all met)
blocking_soul: bravo HARD-REFUSES "unsafe-fleet-control-before-governance"
---

# FLEET-CONTROL GOVERNANCE DESIGN

> **This is a DESIGN document, not an enforcing build.**
> Nothing in this file is wired until the implementation milestone that references it.
> Until then the current NO-GO status (HERMES-CONTROL-READINESS §HEADLINE) remains in force.

---

## 0. Context and Problem Statement

The Hermes/Zulu fleet-control stack exposes a loopback HTTP surface on `:8767`
(`hzp-dash-control-server.mjs`) that accepts six operations:
`assign | veto | promote-refuse | adopt-doctrine | escalate | bus-send`.

The existing `ZuluFleetGovernorEngine.checkAuthority()` algorithm correctly gates
**what the target slot's soul will accept** (domain-filter match + refuse-list veto
+ orchestrator-role fallback). What it does not gate is **who the caller is**:

- The `actor` field in every request is a plain string supplied by the caller.
  Any process that can reach `127.0.0.1:8767` can set `actor: "zulu"` and wield
  fleet-orchestrator authority.
- The cross-worktree firewall, file-claim-guard, and main-tree-write-block
  PreToolUse hooks are completely bypassed by the HTTP path.
- `hzp-dash-vetoes.jsonl` does not exist, so there is no veto ceiling bounding
  Hermes's own authority.
- 16 of 27 souls have no `refuse_list`, leaving them fully addressable.
- `handleAssign` deliberately fails loud HTTP 501 (commit ca38013a4f) until
  governance lands — the data-hazard is closed, but the assign path is unusable.

This document specifies the governance layer that must be built before any
enforcing fleet-control delivery is attempted.

---

## 1. Authority Predicate — When the Orchestrator MAY Issue a Directive

An orchestrator directive is **authorized** if and only if ALL of the following
hold simultaneously. A single failure in any layer produces REJECT.

### Layer 0 — Transport Guard (pre-request)
- The request arrives on `127.0.0.1` (loopback-only; already enforced by the
  server's HOST bind — must never change to `0.0.0.0`).
- The `Origin` header matches `ALLOWED_ORIGINS`
  (`{http://127.0.0.1:8765, http://localhost:8765, null}`).
- Body size <= `MAX_BODY_BYTES` (64 KB; already enforced).

### Layer 1 — Issuer Authentication (NEW — not yet built)
The caller must present a pre-shared token that proves it is a recognized
orchestrator process, not an arbitrary loopback client.

Mechanism: HMAC-SHA256 token stored at `state/shared/hzp-dash-issuer-token.json`
(gitignored, operator-provisioned). Every POST request must include:
```
X-HZP-Issuer-Token: <hex-encoded HMAC>
X-HZP-Issuer-Slot:  <nato-slot-name>
```
The server verifies the token via constant-time comparison before any soul or
governor logic runs. A missing or mismatched token yields HTTP 401 immediately.

The issuer slot named in `X-HZP-Issuer-Slot` must itself have a soul file
(`state/shared/slot-souls/<slot>.md`) with `hermes_role` in
`ORCHESTRATOR_ROLES = {fleet-orchestrator, generalist, hermes-router, zulu-orchestrator}`.
This is the **issuer-soul gate**: validates the caller's identity, not just the
target's acceptance.

Knob: `PRISM_HZP_DASH_AUTH_DISABLE=1` downgrades to advisory-warn for local
development. Must never be set in production. The control server logs a LOUD
startup warning when this knob is active.

### Layer 2 — Target Soul Gate (EXISTING — ZuluFleetGovernorEngine logic)
The four-rule algorithm in `checkAuthority(req, soul)` runs against the
**target slot's** soul:
1. refuse-list substring match → REJECT (kills everything including informational)
2. domain_filter regex matches task_text → ACCEPT (domain-gated ops only)
3. domain_filter set but no match → REJECT (fail-closed; malformed regex = REJECT)
4. no domain_filter → ACCEPT only if issuer hermes_role in ORCHESTRATOR_ROLES

This layer is unchanged from the existing engine. The new issuer-soul gate
(Layer 1) is additive on top of it.

### Layer 3 — Veto Ceiling (NEW — not yet built)
Before writing any `assign` directive, the server checks the operator-set veto
ceiling stored in `state/shared/hzp-dash-governance.json`:
```jsonc
{
  "schemaVersion": "1.0.0",
  "max_autonomous_slots": 4,       // operator-set; orchestrator may not exceed
  "current_controlled_slots": [],  // live-tracked set of slots under active directives
  "ceiling_last_set_by": "operator",
  "ceiling_last_set_at": "<iso>"
}
```
If `current_controlled_slots.length >= max_autonomous_slots`, the assign is
REJECTED with reason `veto-ceiling-exceeded:<current>/<max>`. The operator must
either raise the ceiling (manual edit, logged) or wait for existing directives
to reach `verified` state.

The default ceiling is **4 slots** (conservative; operator raises it explicitly).
A ceiling of 0 means "no autonomous assigns at all" — a valid operator posture.

### Layer 4 — Hard Invariant Screen (NEW — cross-cuts all operations)
See §2. Any directive whose `task_text` or `draft_markdown` payload matches a
Hard Invariant pattern is REJECTED at this layer before the soul gate runs.
The server applies a static pattern list (see §2) with substring + regex matching.
REJECT reason: `hard-invariant-violation:<invariant-id>`.

### Composite Predicate (pseudocode)
```
AUTHORIZED iff:
  transport_guard(req) == OK
  AND issuer_auth(req) == OK           // Layer 1 (new)
  AND soul_gate(req, target_soul) == AUTHORIZED  // Layer 2 (existing)
  AND veto_ceiling_ok(req)             // Layer 3 (new, assign only)
  AND not_hard_invariant_violation(req)  // Layer 4 (new, all ops)
```

---

## 2. Hard Safety Invariants — What the Orchestrator Can NEVER Do

These are absolute prohibitions. No operation, no task_text, no authority level
overrides them. They are enforced at Layer 4 (pattern screen) and ALSO at the
audit-trail review gate (§4). A build that bypasses any of them is a regression.

| ID  | Invariant | Enforcement trigger |
|-----|-----------|---------------------|
| HI-01 | Never disable a PreToolUse or Stop hook (edit/delete any entry in `settings.json` `hooks` arrays, or set any `PRISM_*_DISABLE` flag that downgrades a HARD-BLOCK hook to advisory/off) | task_text pattern: `/settings\.json.*hook/i`, `/PRISM_.*_DISABLE/i` |
| HI-02 | Never weaken a test assertion (convert `toBe`/`toEqual` to `toBeDefined`/`toBeGreaterThan(0)`, add `.skip`, remove assertions) | task_text pattern: `/\.skip\b/`, `/toBeDefined\(\)/` |
| HI-03 | Never bypass the 3-of-3 scrutiny gate (mark any arm `pass` without a real review, call `--mark-opus/--mark-claude/--mark-analyst` without a legitimate review session having run) | task_text pattern: `/scrutiny.*bypass/i`, `/mark-(opus|claude|analyst).*pass/i` |
| HI-04 | Never auto-flip a milestone envelope `status` field to `done`/`shipped`/`complete` without a verified commit SHA | task_text pattern: `/envelope.*status.*done/i`, `/auto.*close.*milestone/i` |
| HI-05 | Never edit `settings.json` hook arrays, the scrutiny ledger (`SCRUTINY_LEDGER.json`), or the governance config (`hzp-dash-governance.json`) via the control path | operation: assign/veto + task_text pattern: `/SCRUTINY_LEDGER/i`, `/settings\.json/i`, `/hzp-dash-governance/i` |
| HI-06 | Never control more than `max_autonomous_slots` slots simultaneously without operator confirmation (the veto ceiling, Layer 3) | runtime check on current_controlled_slots count |
| HI-07 | Never send a directive to a slot whose soul is missing or unresolvable (fail-closed: missing soul = REJECT for all non-informational ops, same as existing Layer 2 behavior) | soul_gate returns `no-soul-resolved-for-slot:*` |
| HI-08 | Never issue an `assign` directive while `handleAssign` returns HTTP 501 (the deliberate fail-loud stub from U-HERMES-ASSIGN-FAILLOUD) — the assign→claim pipeline is not operational until explicitly unlocked by the governance build | runtime check: server startup probes `/healthz` on the assign route |
| HI-09 | Never issue a `promote-refuse` directive that targets a rule containing the substring `unsafe-fleet-control-before-governance` — bravo's hard-refusal of the governance blocker must remain intact until this spec is superseded by a new governance version | task_text/rule pattern: `/unsafe-fleet-control-before-governance/i` |

Hard invariants are immutable from within the control path. Changing this list
requires a manual operator edit of this spec file plus a new version tag.

---

## 3. Directive State Machine

Every issued directive transitions through five states. The state is recorded in
the audit trail (§4) at each transition. Illegal transitions produce a REJECTED
audit entry, not a silent skip.

```
                     REJECT (any layer)
                    ┌──────────────────────────┐
                    │                          │
  [request arrives] │                          ▼
  ──────────────────►  PROPOSED  ─────────► REJECTED (terminal)
                        │
                        │ All 4 layers pass
                        ▼
                    AUTHORIZED
                        │
                        │ Server writes directive to audit + slot-task-claims.json
                        ▼
                     ISSUED
                        │
                        │ Target slot reads the claim via /pick-unit
                        │ and acknowledges pickup (writes claim state = "building")
                        ▼
                      ACKED
                        │
                        │ Slot commits work and releases claim
                        │ (post-commit hook sets claim state = "done" or "failed")
                        ▼
                    VERIFIED (terminal — success)
                        │
                        │ OR: slot cannot complete, escalates
                        ▼
                   ESCALATED (terminal — routes back to orchestrator)
```

### State Artifacts

| State | Artifact written | Writer |
|-------|-----------------|--------|
| PROPOSED | (in-memory only — no persistence until AUTHORIZED) | control server |
| AUTHORIZED | `hzp-dash-audit.jsonl` entry with `state: "authorized"` | control server |
| ISSUED | `hzp-dash-audit.jsonl` entry with `state: "issued"` + `slot-task-claims.json` claim row | control server |
| ACKED | `hzp-dash-audit.jsonl` entry with `state: "acked"` | slot's `/pick-unit` ack path |
| VERIFIED | `hzp-dash-audit.jsonl` entry with `state: "verified"` | post-commit hook |
| REJECTED | `hzp-dash-audit.jsonl` entry with `state: "rejected"` + `reject_reason` | control server |
| ESCALATED | `hzp-dash-audit.jsonl` entry with `state: "escalated"` + `hermes-escalation-queue.jsonl` entry | slot escalation handler |

### Timeout and Stale-Directive Policy
A directive that reaches ISSUED but does not reach ACKED within `directive_ack_timeout_ms`
(default: 300,000 ms / 5 min; knob `PRISM_HZP_DIRECTIVE_ACK_TIMEOUT_MS`) is
automatically transitioned to REJECTED by the governance sweep (a cron-safe
idempotent function) with reason `ack-timeout`. The slot's claim is atomically
released. A directive that reaches ACKED but does not reach VERIFIED within
`directive_verify_timeout_ms` (default: 1,800,000 ms / 30 min) transitions to
ESCALATED and is appended to `hermes-escalation-queue.jsonl`.

---

## 4. Audit Trail and Reversibility

### Primary Audit Ledger: `state/shared/hzp-dash-audit.jsonl`
Already created by `hzp-dash-control-server.mjs` (HzpDashAuditEngine algorithm).
Each line is an append-only JSON record. The governance build extends the schema:

```jsonc
{
  "audit_id": "hzpd-<base36-ts>-<6hex>",    // unique per directive lifecycle
  "ts": "<iso>",
  "operation": "assign|veto|promote-refuse|adopt-doctrine|escalate|bus-send",
  "state": "proposed|authorized|issued|acked|verified|rejected|escalated",
  "actor": "<issuer-slot>",                   // from X-HZP-Issuer-Slot (verified)
  "slot": "<target-slot>",
  "task_id": "<roadmap-unit-id>",             // optional
  "task_text": "<first 200 chars>",
  "auth_result": { "authorized": bool, "reason": "...", "layer": 0|1|2|3|4 },
  "invariant_violations": [],                 // populated if HI-* fired
  "prev_state": "<prior state>",              // for transitions
  "transition_ts": "<iso>"
}
```

The file is append-only. No record is ever modified or deleted. The governance
build must wire a startup assertion: if the file exists and its last byte is not
`\n`, the server refuses to start (torn-file protection, per the tribal-embed
clobber lessons).

### Secondary Ledger: `state/shared/hzp-dash-vetoes.jsonl`
Currently does not exist. The governance build creates it. Every `veto` operation
produces one record:
```jsonc
{
  "veto_id": "<uuid>",
  "ts": "<iso>",
  "vetoed_audit_id": "<audit_id of the directive being vetoed>",
  "reason": "<human-readable>",
  "actor": "<issuer-slot>",
  "slot": "<target-slot>",
  "task_id": "<optional>"
}
```

### Reversibility Protocol
Reversibility in a fleet-control system means: "undo the side effects of an
already-issued directive, not just cancel a pending one."

| Directive state at reversal request | Reversal action |
|-------------------------------------|----------------|
| PROPOSED | Instant — no artifact exists |
| AUTHORIZED | Append `state: "reversed"` to audit; claim is not yet written |
| ISSUED | Append `state: "reversed"` to audit; atomically remove claim from `slot-task-claims.json` (lockfile-guarded RMW); no slot notification required (slot's next `/pick-unit` simply won't see it) |
| ACKED | Append `state: "reversal-requested"` to audit; write advisory to `AGENT_CHAT.jsonl` asking the slot to stop work and release claim; slot must manually ack the reversal or let the verify-timeout trigger ESCALATED |
| VERIFIED | NOT reversible via the control path. A verified directive means the slot committed work. Reversal requires a human-operator git revert. Append `state: "reversal-blocked-verified"` with explanation. |
| REJECTED / ESCALATED | Already terminal — no reversal needed |

The `veto` operation in the existing API is the primary reversal mechanism for
ISSUED and earlier states. ACKED and VERIFIED require human intervention.

### Audit Integrity Check
`scripts/audit-hzp-dash-integrity.mjs` (to be built as part of the governance
build):
- Validates every line is valid JSON.
- Validates each `audit_id` is unique.
- Validates state transitions follow the FSM (no PROPOSED→VERIFIED skip).
- Validates `actor` fields match a known issuer slot with a soul file.
- Reports counts by state for the ops dashboard.

---

## 5. GO Criteria — Lifting the Current NO-GO Status

The HERMES-CONTROL-READINESS-2026-06-01.md document records a CRITICAL NO-GO
with 0/4 critical dimensions ready. The following four criteria, when ALL met,
constitute the governance "GO" gate and allow the enforcing fleet-control build
to proceed.

### GO-1: Issuer Authentication Provisioned and Verified
- `state/shared/hzp-dash-issuer-token.json` exists (gitignored, operator-created).
- `scripts/hzp-dash-provision-issuer.mjs` script exists and provisions the token
  with a generated HMAC key.
- `hzp-dash-control-server.mjs` Layer 1 issuer auth is implemented and tested.
- A request without the token gets HTTP 401 (proven by a test that sends no header).
- A request with a valid token from an orchestrator-role soul gets HTTP 200
  (proven by an E2E test against a hermetic `PRISM_HZP_DASH_STATE_DIR` sandbox).
- Knob `PRISM_HZP_DASH_AUTH_DISABLE` is NOT set in production.

### GO-2: Veto Ceiling Configured and Enforced
- `state/shared/hzp-dash-governance.json` exists with `max_autonomous_slots >= 1`.
- Layer 3 veto ceiling check is implemented and tested.
- A request that would exceed `max_autonomous_slots` gets HTTP 403 with reason
  `veto-ceiling-exceeded` (proven by a test with ceiling=1 and 1 existing claim).
- The governance file is NOT writable via the control path (HI-05 blocks it).

### GO-3: Hard Invariants Active on All Six Operations
- Layer 4 pattern screen is implemented in `hzp-dash-control-server.mjs`.
- A test for each of the nine HI-* rules (HI-01 through HI-09) proves the pattern
  fires and returns HTTP 403 with `hard-invariant-violation:<id>`.
- Bravo's `refuse_list` entry `"unsafe-fleet-control-before-governance"` is
  preserved (HI-09 is the backstop if the soul entry is ever removed).

### GO-4: One Domain-Tagged E2E Round-Trip Passes
This is the readiness spec's own "GO trigger" (§MINIMAL PATH Blocker 2):
> "Hermes assigns a unit → claim lands in the store slots read → that slot's
> /pick-unit surfaces it → ack logged"

Specifically:
- `handleAssign` HTTP 501 stub is removed and the real implementation is wired
  (the stub from U-HERMES-ASSIGN-FAILLOUD can only be removed once GO-1 through
  GO-3 are verified).
- A hermetic E2E test (isolated `PRISM_HZP_DASH_STATE_DIR`) proves:
  1. Orchestrator soul with `hermes_role: fleet-orchestrator` calls `/assign`
     with a domain-tagged task (e.g., `task_text: "mill: optimize VMC-01 roughing"`).
  2. `hzp-dash-audit.jsonl` records `state: "authorized"` then `state: "issued"`.
  3. `slot-task-claims.json` contains a valid claim row for the target slot.
  4. A simulated `/pick-unit` call for that slot returns the claim.
  5. Ack is written to `hzp-dash-audit.jsonl` with `state: "acked"`.
- The test passes on a clean run with `PRISM_HZP_DASH_AUTH_DISABLE` NOT set.

---

## 6. Implementation Sequencing (Logical Dependency Order)

Per R13 (logical order) and R15 (wire → test → validate):

```
Phase 1 — Foundation (no control server changes yet)
  1a. Write `scripts/hzp-dash-provision-issuer.mjs` (token provisioner)
  1b. Write `state/shared/hzp-dash-governance.json` (operator-provisioned, gitignored)
  1c. Write `scripts/audit-hzp-dash-integrity.mjs` (audit chain verifier)

Phase 2 — Server hardening (all changes to hzp-dash-control-server.mjs)
  2a. Add Layer 1 issuer auth (HMAC verify + issuer-soul gate)
  2b. Add Layer 3 veto ceiling check
  2c. Add Layer 4 hard invariant pattern screen
  2d. Extend audit schema with state/layer/invariant_violations fields
  2e. Wire governance sweep (cron-safe ack-timeout + verify-timeout transitions)

Phase 3 — Assign path (blocked on Phase 2 complete + all HI-* tests pass)
  3a. Replace `handleAssign` HTTP 501 stub with real claim writer
  3b. Wire ack path from slot /pick-unit → audit ACKED state
  3c. Wire verified path from post-commit hook → audit VERIFIED state

Phase 4 — GO verification
  4a. Run the four GO criteria checks as a checklist
  4b. Update HERMES-CONTROL-READINESS-2026-06-01.md §HEADLINE to CONDITIONAL-GO
      (conditional on operator provisioning the issuer token + governance.json)
  4c. Remove bravo's "unsafe-fleet-control-before-governance" HARD-REFUSE
      entry ONLY AFTER the operator manually verifies GO-1 through GO-4
```

---

## 7. What This Design Does NOT Cover

These are out of scope for the governance design and must be addressed in
downstream milestones:

- **Multi-orchestrator contention**: what happens when two orchestrator slots
  (e.g., zulu and hermes) issue conflicting directives to the same target slot
  in the same window. (Mitigation: `DistributedLockManager.withLock("hzp-assign:<slot>", fn)`)
- **Cross-PC portability**: issuer token distribution across multiple hosts.
  The current design assumes single-host loopback-only; multi-PC requires a
  shared secret store (operator concern, beyond this spec).
- **Directive replay attacks**: an attacker capturing a valid HMAC token from
  a loopback pcap. Mitigation (not specified here): timestamp-bounded tokens
  with a replay cache.
- **Galaxy coverage gap**: `SLOT_GALAXY_MAP` has 12/34 galaxies with no
  owner-slot. Hermes cannot address these via domain-filter matching until
  the galaxy→slot mapping is complete. This is an addressability gap, not a
  governance gap — governance handles the security of the control path; the
  mapping is a configuration gap to be closed separately.
- **Veto ceiling arithmetic for multi-step tasks**: if a single logical task
  requires sequencing across 5 slots, the ceiling=4 default will block step 5.
  The operator must raise the ceiling or batch differently. The governance design
  intentionally does not auto-raise the ceiling.

---

## 8. Files This Design Governs (Reference Map)

| File | Role | Status |
|------|------|--------|
| `scripts/hzp-dash-control-server.mjs` | HTTP control surface; add Layers 1+3+4 | existing, needs extension |
| `mcp-server/src/engines/ZuluFleetGovernorEngine.ts` | Target-soul gate (Layer 2); NO changes | existing, correct |
| `mcp-server/src/engines/ZuluDashboardControlEngine.ts` | Thin MCP client; NO changes | existing, correct |
| `state/shared/hzp-dash-audit.jsonl` | Primary audit ledger (append-only) | existing (extend schema) |
| `state/shared/hzp-dash-vetoes.jsonl` | Veto ledger | DOES NOT EXIST (create in Phase 2) |
| `state/shared/hzp-dash-governance.json` | Veto ceiling + ceiling-ownership | DOES NOT EXIST (create in Phase 1) |
| `state/shared/hzp-dash-issuer-token.json` | Pre-shared HMAC token | DOES NOT EXIST (provision in Phase 1) |
| `scripts/hzp-dash-provision-issuer.mjs` | Token provisioner | DOES NOT EXIST (build in Phase 1) |
| `scripts/audit-hzp-dash-integrity.mjs` | Audit chain verifier | DOES NOT EXIST (build in Phase 1) |
| `state/shared/slot-souls/<slot>.md` | Per-slot soul frontmatter | existing; issuer soul must have fleet-orchestrator role |
