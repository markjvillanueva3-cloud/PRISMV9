---
name: reference_zulu_governor_wire_2026_06_01
description: ZuluFleetGovernorEngine (HZD-02 authority gate) was a built+tested but dispatcher-UNWIRED orphan; wired to prism_session as READ-ONLY zulu_authority_check. Key distinction — exposing the authority CHECK is safe + NOT the operator-gated control loop. Commit cb3f6a79d7.
type: reference
source: prism-memory
synced: 2026-06-27T20:30:47.282Z
aliases: reference_zulu_governor_wire_2026_06_01
---


2026-06-01 (slot:bravo, /loop stub-hunt). A stub/orphan hunt across the 8 Hermes/Zulu galaxy engines found
**ZuluFleetGovernorEngine** (HZD-02) was built + engine-tested (14 tests) but had **0 dispatcher refs** — a
true `stop_on_unwired_assets` orphan (referenced only by its own test + a doc; no WIRE-EXEMPT tag, no engine
consumed it). The other 7 Hermes/Zulu engines were each wired (1 ref). Clean stub scan otherwise.

**Fix (U-ZULU-GOVERNOR-WIRE, commit `cb3f6a79d7`):** wired it to `prism_session` (sessionDispatcher.ts, the
canonical home of all `zulu_*`/`hermes_*` actions) as two actions following the sibling pattern exactly:
`zulu_authority_check` (`{request, soul}` → `ZuluFleetGovernorEngine.checkAuthority(p.request, p.soul ?? null)`)
+ `zulu_authority_check_render`. 7 round-trip wiring tests via the real `registerSessionDispatcher` harness
(`zulu_governor_wire.test.ts`), covering all 4 authority rules + informational-op + render. 21/21 with the
engine suite. Type-clean (the project's 654-error tsc baseline is pre-existing — esbuild build doesn't
type-check; my 2 cases added 0 new errors). Per-file scrutiny arm A (wiring) + arm B (safety) both PASS.

**KEY GOVERNANCE DISTINCTION (load-bearing for future Hermes work):** the Hermes-readiness audit
([[reference_hermes_control_readiness_nogo_2026_06_01]]) flagged GOVERNANCE as operator-greenlit-before-
building-the-control-loop. Wiring this engine does NOT cross that line. `checkAuthority` is a **pure predicate**
— no state mutation, no file I/O, no control invocation (no assign/veto/task-claim); it just COMPUTES
`{authorized, reason}` from (slot, task_text, operation) + the slot's soul. Exposing a read-only authority
QUERY grants zero new capability — it's the *opposite* of the ungoverned state-changing :8767 control path the
audit warned about. Enforcement still happens independently in the control server (which calls the same engine).
So: exposing the authority CHECK = safe + governance-positive (queryable/auditable); building the control LOOP
(assign→pickup with actor-auth + veto ceiling) = still gated. Don't conflate the two.

Also fixed a stale header comment (P3 from arm B): the doc said fail-SOFT ("bad regex → treat as no filter →
fall through to orchestrator rule") but the code fail-CLOSES (malformed `domain_filter` → REJECT
`domain-filter-malformed:`, a 2026-05-25 arm-B hardening) — the comment understated the safer real behavior.

**Process note:** the Edit tool CRLF-flipped sessionDispatcher.ts (large file) → an 8404-line phantom diff that
got committed before the same-command CRLF check surfaced. Recovered via latin1 `\r\n`→`\n` + guarded
`git commit --amend`. LESSON: on large/contended files, run the CRLF + `git diff --stat` check in a SEPARATE
command BEFORE `git add`+commit, never chained after. See [[feedback_verify_actual_contract_not_proxy]].

Galaxy: hermes-zulu (bravo). Sibling units this session: U-HERMES-ASSIGN-FAILLOUD (`ca38013a4f`),
U-HERMES-FTH-DRIFT-SYNC (`213a1da6f8`).
