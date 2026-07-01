# HERMES/ZULU FLEET-CONTROL READINESS — GO/NO-GO (2026-06-01)

> Produced by the `hermes-readiness-audit` Workflow (7 adversarial dimension-auditors + synthesis; run `wf_0bc33d45-25d`, slot:bravo) + a completing GOVERNANCE_SAFETY pass. Operator question: *"is our Hermes agent ready to operate and control all galaxies?"* **Advisory / decision artifact.**

## HEADLINE: **NO-GO — Hermes is NOT ready to operate and control all 34 galaxies.**

Hermes is a **well-built scaffold that is not currently running, cannot close a single assign→pickup loop, and has an unsafe/ungoverned control path.** Most of it exists as real, dispatcher-wired code — the failures are at the **runtime / closed-loop / provisioning / governance** layer, not the code-exists layer. **0 of 4 CRITICAL dimensions are READY.**

## Readiness scorecard (7/7 dimensions audited)

| Dimension | Tier | Verdict | Conf | One-line |
|---|---|---|---|---|
| REACH | CRITICAL | **PARTIAL** | 0.88 | Router addresses only **22/34** galaxies; 12 have zero owner-slot; bravo worktree map points at non-existent `hermes-zebra` |
| COMMAND_CONTROL | CRITICAL | **NOT_READY** | 0.90 | assign writes a schema slots reject/ignore; **no PUSH verb**, no pickup consumer; control server dormant |
| RUNTIME_LIVENESS | CRITICAL | **NOT_READY** | 0.95 | `PRISM Zebra Orchestrator` **Disabled + target script deleted**; `PRISM Zulu Orchestrator` never registered; dark ~2 days |
| GOVERNANCE_SAFETY | CRITICAL | **NOT_READY** | 0.90 | control path **bypasses all PreToolUse safety hooks**; **no actor auth** on :8767; refuse_list on 11/27 souls; no veto ceiling on Hermes |
| CONSENSUS | enhancing | NOT_READY | 0.90 | default path is a stub; live dispatch → 0 healthy voices (Ollama dead); no galaxy ever consumed a consensus |
| REASONING_ROUTING | enhancing | NOT_READY | 0.90 | no `MOONSHOT_API_KEY`; no router invokes heavy-reasoning; model-lock is test-only scaffold |
| REFLECTION_LEARNING | enhancing | PARTIAL | 0.85 | populater works; dream-cycle OOM-crashes; 0 reflection crons registered; octopus→synthesis wired but default-OFF |

**Decision rule:** READY iff all 4 CRITICAL dims READY → **0/4 → NO-GO.**

## Blocking issues (ordered; fix in this sequence)

1. **[RUNTIME_LIVENESS · zulu/golf] No live orchestrator.** `PRISM Zebra Orchestrator` Disabled + its target `scripts/zebra-orchestrator-sweep.mjs` deleted by the 2026-05-30 Zebra→Zulu migration; replacement `PRISM Zulu Orchestrator` never registered. **Zero autonomous Hermes liveness for ~2 days**, and `fleet-task-health-watch.mjs` doesn't track it by name → outage invisible to the safety net.
2. **[GOVERNANCE_SAFETY · bravo/golf] Control path is unsafe + ungoverned.** `:8767` HTTP actions bypass every PreToolUse hook (cross-worktree firewall, file-claim-guard, main-tree-write-block); `actor` is an unauthenticated string (the soul gate validates the *target*, not the *issuer*) → any loopback caller wields operator authority; `main-tree-write-block` is DEFAULT-OFF; `golf-slot-write-allowlist` not wired; refuse_list on only 11/27 souls with brittle substring matching; **no veto ceiling bounding Hermes itself** (`hzp-dash-vetoes.jsonl` doesn't even exist). **A working control loop here would be a working UNSAFE loop — GOVERNANCE must land BEFORE COMMAND_CONTROL.**
3. **[COMMAND_CONTROL · bravo] assign→pickup loop broken.** `hzp-dash-control-server.mjs handleAssign` writes a per-slot array as a SIBLING of `claims`/`schemaVersion`; canonical `slot-task-claim.mjs readStore` ignores it (`isValidClaimRow` shape mismatch) → **assignment silently lost while the audit log records `authorized:true` (the log lies)**. No `assign` verb (only self-service PULL: claim/release/heartbeat/list/check/sweep); no consumer reads `assigned_by`/`assigned_at`. Control server not running (:8767 closed, no task); auction recommends, dispatches nothing.
   - **UPDATE 2026-06-01 (commit `ca38013a4f`, U-HERMES-ASSIGN-FAILLOUD):** corruption + lying-audit arm **CLOSED**. `handleAssign` now **fails loud (HTTP 501 `assign-not-wired-to-canonical-claim-store`)** and writes NOTHING — the store can no longer be silently corrupted, and the handler no longer lies `ok:true`. The PUSH-assign wiring itself (blocker 3a/3b below) remains DELIBERATELY UNBUILT, gated behind GOVERNANCE (blocker 2) per the safety ordering. COMMAND_CONTROL stays **NOT_READY** by design; only the data-hazard is removed so the interim is honest. (Module made testable + 4 hermetic tests; both scrutiny arms PASS.)
4. **[REACH · operator + sierra/golf] 12/34 galaxies slot-unaddressable.** No `SLOT_GALAXY_MAP` owner for: agent-orchestration, backend-helper, cad-fusion-live, compliance-safety, corpus-aggregation, knowledge-conversion, mit-curriculum, pdf-corpus, pdf-corpus-mill, quality, shop-floor, tribal-knowledge. (MEMORY.md "golf owns these" = scaffold-authorship, not a routing edge.) + papa `frontend-app` vs `backend-helper` conflict.
5. **[REACH · bravo] bravo build-worktree maps its own target to a ghost** — `slot/bravo` `slot-galaxy-map.mjs` routes bravo/zulu → `hermes-zebra` (ENOENT); canonical is `hermes-zulu` (shared-tree fix `3ae2dcc3a2` not merged into this worktree).

## What already works (real wiring — credit)

- **Soul coverage 26/26** (slot identity/domain-filter substrate solid).
- **Chat bus reaches all slots** structurally (`AGENT_CHAT.jsonl` whole-file broadcast + advisory injectors).
- **C2 engines real + dispatcher-wired** (`ZuluDashboardControlEngine`/`ZuluTaskAuctionEngine`; governor + auction pure logic tested) — genuine scaffold, just not closed-loop.
- **Octopus consensus engine real + fail-loud** (`MultiModelConsensusEngine.ask()` spawns providers; never fabricates) — only the I/O endpoints are dead.
- **Reflection populater works** (live `memo_count:2419`); `composeOctopusLoader` correctly applied (prior dormant-import bug fixed, U-FLEET-CONSUME-WIRE).
- **Moonshot client real** (HTTP + retry/SSE; fails closed w/o key — correct).

## Minimal path to READY (ordered; safety-correct sequence)

**Cross-lane / operator + runtime (FIRST):**
1. (zulu/golf, elevated) `& .claude/helpers/install-zulu-orchestrator-task.ps1 -RunNow` → register `PRISM Zulu Orchestrator`; confirm `gateReason:"live"`; `Unregister-ScheduledTask 'PRISM Zebra Orchestrator'`. **(Blocker 1)**
2. (operator) **Audit + provision GOVERNANCE before any GO** — actor auth on :8767, issuer-soul gate, a `hermes_role: fleet-orchestrator` soul with bounded authority + veto ceiling, route control writes through the cross-worktree firewall, arm `PRISM_MAINTREE_WRITE_BLOCK_ENABLE=1` + wire `golf-slot-write-allowlist`. **(Blocker 2 — safety-sensitive, operator-greenlit)**
3. (operator + sierra/golf) Assign the 12 unowned galaxies in `SLOT_GALAXY_MAP` (or add a galaxy→slot reverse-resolver); resolve the papa conflict. **(Blocker 4)**

**bravo-lane (Hermes building — AFTER governance):**
4. (bravo) `handleAssign` writes through canonical `claimStore`/`commitStore` (object-keyed, schemaVersion-preserving, `isValidClaimRow` shape + `owner`/`assigned_by`); add an `assign` verb + a round-trip test asserting `slot-task-claim.mjs readStore` reads it. **(Blocker 3a)**
5. (bravo) Pickup consumer: `/pick-unit` + `/checkin` prefer `owner===slot && phase==='assigned'` before generic backlog. **(Blocker 3b)**
6. (bravo) Sync `slot/bravo` `slot-galaxy-map.mjs` to canonical (`bravo/zulu→hermes-zulu`, drop `zebra`); add `PRISM Zulu Orchestrator` to `fleet-task-health-watch.mjs` KNOWN/CRASH-CRITICAL tasks. **(Blocker 5 + safety-net gap)**
7. (golf/bravo) Durable control server (scheduled task / MCP-daemon supervision + `:8767` health probe); emit `hzp-dash-audit.jsonl` on first op; pickup-ack + dead-slot re-auction. **(Blocker 4-control)**

**GO trigger:** one domain-tagged E2E — Hermes assigns a unit → claim lands in the store slots read → that slot's `/pick-unit` surfaces it → ack logged — with GOVERNANCE provisioned. CONSENSUS/REASONING/REFLECTION are enhancing (flip GO independently).

## Honest caveat — "wired" ≠ "ready"
Ready in principle (code exists, dispatcher-bound): **yes**. Ready in practice (running + reachable + governed): **no** — orchestrator dark, assign→pickup broken by a schema collision, control server dormant, consensus voices down, no Moonshot key, reflection cron unregistered, control path unauthenticated + un-firewalled. Partial control of 22/34 galaxies exists today; **control of *all* 34, safely, does not.**
