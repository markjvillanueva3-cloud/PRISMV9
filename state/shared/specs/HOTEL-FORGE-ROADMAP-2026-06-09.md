# HOTEL FORGE ROADMAP - finalize the ERP/business slot

> **Generated:** 2026-06-09 (slot:hotel, session 19dff632) via ultracode Workflow `wf_2bfa0b6b-9b0`
> (8 agents / 3 phases: Ollama-mined 19-session open-threads + live-code dedup verification → 4 strategic lenses → synthesis).
> **Method note (token economy):** Ollama did the mechanical mining (365MB→64KB at $0); the Workflow/Claude did the
> high-end strategic synthesis. Rate-limiting left only the adversarial lens populated, so the synthesis architect
> **re-verified every load-bearing claim against live code** (citations below) rather than trusting the gather lists.
> **Result: the raw gather roadmap was ~60% false gaps.** This is the trimmed, dependency-ordered truth.

## Ground-truth verified (file:line) — what is ALREADY shipped (do NOT rebuild)
- `routes/business.ts` EXISTS (5022 B, 2026-05-31, HOTEL-NETPLAT-UI/U-VNET-ROUTE), mounted `routes/index.ts:142-144` at
  `/api/v1/business` with `verifyToken` + deny-by-default `BUSINESS_DISPATCH_ALLOWLIST` (`business.ts` header + body).
  **The "404 dispatch route" gap is FALSE** — it was true on 2026-05-27 (transcript 09808061) but shipped 2026-05-31.
- `routes/hotel-portal.ts` EXISTS (9918 B), mounted `index.ts:136`. `routes/realtime.ts` EXISTS, mounted `index.ts:179`.
- `businessDispatcher.ts:2024` wires `engine.remitLiability(params.amount, params.date)` — **payroll-filing gap is FALSE** (shipped this session, U-PAYROLL-FILING-WIRE).
- `engines/business/` has **0 files** with sqlite/WAL/Database — persistence gap is **REAL but narrow**.
- `CustomerPortalEngine.ts:153-156` holds 4 in-memory `Map`s (tokens, messages, qualityDocs, serviceCases) — **in-memory portal state is REAL**.
- `business.ts` self-documents: hotel WRITE (`handoff_counterparty_respond`) + ~120 financial-write actions remain `403` "pending per-action security review" — **write-path gap is REAL**.
- `QuoteToShipOrchestratorEngine.ts:1471` `ctx.features = resolved?.features ?? resolved ?? []` — a non-array object lacking `.features` reaches DFM as a non-iterable. **Q2S contract bug is REAL but charlie/quoting-owned, not a hotel engine.**

---

## 1. DEFINITION OF DONE
"Finalized hotel" = the ERP/business slot is a **trustworthy, durable, write-capable back end behind an authenticated HTTP surface** — ALL of:
1. **Integrity** — every allowlisted `prism_business` action returns *real engine output*, not a dispatcher placeholder; a standing guard catches re-introduction of the 341-false-wire bug class.
2. **Durability** — no business state that must survive a restart lives only in a process `Map`. The 4 `CustomerPortalEngine` Maps (+ any peers) persist and pass a kill-restart-readback test. Scoped to *genuinely* in-memory state; do NOT re-persist what juliett's stores already own.
3. **Write front door** — a manager can perform core write actions (PTO approve, PO cut, counterparty respond) through the portal behind per-action auth; no longer blanket-`403`.
4. **Constants honesty** — every tax/PTO/CoA constant the engines import is confirmed present in `src/data/` (audit, not assumed-missing extraction).
5. **No false debt** — the Q2S DFM bug is fixed or filed to charlie/quoting on the chat bus; mobile/catalog/slot-migrate items are explicitly out-of-scope and tagged.

**DoD excludes** (adversarial trim): mobile-engine wiring (no consumer app → `WIRE-EXEMPT`), Docustrata catalog rebuild (shipped: JM-DOC-POPULATION-MS0), slot-worktree migration (hygiene), any "rebuild the live route" work.

---

## 2. PHASED UNITS (dependency order)

### Phase 0 — Unblock + dedup-verify (prove what's already done)
| U-id | WHAT | WHY | DEPENDS-ON | MODE | WIRE/TEST/VALIDATE | ACCEPTANCE |
|---|---|---|---|---|---|---|
| **U-HOTEL-P0-VERIFY-SHIPPED** | Confirm-and-close the 6 false gaps: business route, hotel-portal route, realtime route, payroll-filing wiring, DocuStrata population, JM data fill. Post "verified-shipped, no build" to chat bus + close-out ledger. | Stops the fleet re-building ~6 of the "10 blockers" that are live code. R8. | none | **VERIFY-FIRST** | VALIDATE: curl `/api/v1/business/dispatch` w/ an allowlisted read action → real JSON, not 404/placeholder. Confirm `index.ts:136,144,179` mounts. | All 6 confirmed live; close-out entry written; zero build. |
| **U-HOTEL-P0-CONSTANTS-AUDIT** | Grep `src/data/` for tax/PTO/CoA/payroll constants the business engines import; produce a confirmed-missing list (likely near-empty). | The `(verify)` tags in CLAUDE.md are NOT evidence of absence. | none | **VERIFY-FIRST** | For each engine import of a constants file, prove file exists + exports the symbol. | Report lists only *confirmed-missing* files. No speculative extraction. |

### Phase 1 — Durable foundation (persistence + auth front door)
| U-id | WHAT | WHY | DEPENDS-ON | MODE | WIRE/TEST/VALIDATE | ACCEPTANCE |
|---|---|---|---|---|---|---|
| **U-HOTEL-PORTAL-PERSISTENCE** | Persist the genuinely-in-memory portal surfaces — `CustomerPortalEngine.ts:153-156` (tokens, messages, qualityDocs, serviceCases) + any peers found in P0 — via juliett's SQLite-WAL store pattern. | Verified REAL: `engines/business/` has 0 persistence; portal state dies on restart → lost PTO drafts/NCRs/sessions. | U-HOTEL-P0-VERIFY-SHIPPED (scope-gate vs juliett stores) | **BUILD (scope-gated)** | WIRE through juliett's WAL store, not a new bespoke DB. TEST: kill-restart-readback E2E. VALIDATE: write a PTO draft → kill → restart → read back live. | Kill-restart-readback green for all 4 Maps; `git grep "new Map" engines/business` for *durable* state = 0 (transient caches tagged-exempt); NO juliett-store duplication. |
| **U-HOTEL-ALLOWLIST-WRITE-REVIEW** | Per-action security review of the `403` write set: `handoff_counterparty_respond` + core manager-writes (PTO approve, PO cut). Add reviewed actions to `business-dispatch-allowlist.ts` behind per-action auth + role check. | Verified REAL: portal is read-only through the front door; an ERP a manager can't *write* through isn't finalized. | U-HOTEL-PORTAL-PERSISTENCE (writes must be durable before exposed) | **BUILD** | WIRE: extend allowlist + role-gate middleware. TEST: authed manager → write succeeds + persists; unauthed/wrong-role → 403. VALIDATE: round-trip a real PTO approve. | Core manager-writes reachable behind auth; ~120 financial-writes still gated until individually reviewed (documented, not blanket-opened). |

### Phase 2 — Close the real ERP integrity gap
| U-id | WHAT | WHY | DEPENDS-ON | MODE | WIRE/TEST/VALIDATE | ACCEPTANCE |
|---|---|---|---|---|---|---|
| **U-HOTEL-FALSE-WIRE-REGRESSION-GUARD** | Standing test: every allowlisted `prism_business` action, round-tripped through `/api/v1/business/dispatch`, returns real engine output — NOT a placeholder/echo. | The BUSINESS-CLEANUP arc (`701210abf2`, `919e40e395`, `c9874f0623`) fixed **341 false-wires**; zero standing guard exists → silent regression risk. The bug-class hotel fought all month; higher ROI than any feature. | U-HOTEL-P0-VERIFY-SHIPPED | **BUILD** | TEST: parametric over the allowlist; assert response shape ≠ placeholder signatures + ≥1 engine-specific field present. VALIDATE: deliberately re-stub one action → test goes red. | Guard green over full allowlist; proven to fail on a deliberate re-stub (R9 intent test); wired into CI. |

### Phase 3 — Real-time + integration (verify-first, likely already done)
| U-id | WHAT | WHY | DEPENDS-ON | MODE | WIRE/TEST/VALIDATE | ACCEPTANCE |
|---|---|---|---|---|---|---|
| **U-HOTEL-P3-REALTIME-VERIFY** | Confirm `routes/realtime.ts` (mounted `index.ts:179`) backs the hotel portal's live surfaces. Build push ONLY if a *named* surface is proven polling-only. | "Polling only / no WebSocket" was a Gather claim; `realtime.ts` exists. Don't build a push layer already there. | U-HOTEL-PORTAL-PERSISTENCE | **VERIFY-FIRST** | Trace one portal dashboard surface to its data source — SSE/WS via realtime.ts vs poll. | Realtime backing confirmed for ≥1 surface, OR one named gap scoped as a follow-up. No speculative push build. |

### Phase 4 — Frontend + polish (cross-slot file, then stop)
| U-id | WHAT | WHY | DEPENDS-ON | MODE | WIRE/TEST/VALIDATE | ACCEPTANCE |
|---|---|---|---|---|---|---|
| **U-HOTEL-FILE-Q2S-DFM-TO-CHARLIE** | File the Q2S DFM contract bug to charlie/quoting on the chat bus with exact site `QuoteToShipOrchestratorEngine.ts:1471`. Do NOT build it in hotel. | Verified REAL + NOT hotel-owned. R8: don't absorb a shared/charlie engine. Hotel-finalization is unblocked without it. | U-HOTEL-P0-VERIFY-SHIPPED | **FILE (no build)** | Post to `AGENT_CHAT.md` + create claim note for charlie. If hotel is later directed to own it: normalize-to-array guard at the feature boundary + PDF-only round-trip test. | Chat-bus entry with file:line; charlie ack or claim queued. Hotel does not edit the orchestrator. |
| **U-HOTEL-P4-MOBILE-WIRE-EXEMPT** | Tag the 3 orphan mobile engines `// WIRE-EXEMPT: phone-app deferred - no consumer surface`. | No shipped phone app to consume them; wiring to satisfy `stop_on_unwired_assets` is busywork + consumer-before-dependency inversion (R13). | none | **BUILD (tag-only)** | `stop_on_unwired_assets` passes via exemption tag, not a fake wire. | 3 engines tagged; orphan audit clean; no dead backend surface. |

---

## 3. DISAGREEMENT RESOLUTION (R7 — surface, don't average)
Only the adversarial lens populated (ROI/DEPS/RISK rate-limited), so conflicts are adversarial vs the consolidated gather lists it critiques:
- **"Route is a 404 blocker" (gather) vs "route is shipped live code" (adversarial)** → **Adversarial wins.** Verified `business.ts` + `index.ts:144`. Building a route that exists is the worst waste in the gather roadmap. The gather item is *deleted*, not partially built.
- **"Persist all business records" (gather) vs "persist only what's truly in-memory; juliett owns the rest" (adversarial)** → **Adversarial wins, scope-gated.** `engines/business/` = 0 persistence BUT juliett's `8300622f39` financial stores exist. Re-persisting juliett-owned data = double-truth. Scope to the 4 portal Maps + P0-discovered peers.
- **"Q2S DFM is a hotel blocker" (gather) vs "real bug, wrong owner" (adversarial)** → **Adversarial wins.** Bug in `QuoteToShipOrchestratorEngine.ts` (charlie/quoting). Hotel files it; does not absorb a shared engine.
- **"Mobile wiring needed" (gather) vs "exempt, no consumer" (adversarial)** → **Adversarial wins.** WIRE-EXEMPT tag is the honest closure; a fake wire is a stub the hooks should reject.

**One extension of the adversarial lens:** it ranks the false-wire regression guard as the #1 real gap. Agreed it's the highest-*integrity* work, but it is sequenced in **Phase 2 (after persistence + write-path)** because the guard must exercise *durable, write-capable* actions to be meaningful (R13 logical-order refinement, not a disagreement on importance).

---

## 4. THE FIRST UNIT
**U-HOTEL-P0-VERIFY-SHIPPED** (Phase 0) — NOT the route-unblock the prompt anticipated.
The prompt (and an earlier hotel claim) hypothesized "unblock `/api/v1/business/dispatch` to free the frontend." **That route is already shipped + mounted** (verified this session). The highest-leverage first action is *proving the 6 false gaps are already done and writing that to the close-out ledger* — it converts a ~10-unit over-scoped roadmap into ~3 real units before an hour is wasted re-building live code. Costs minutes (curl + grep). If P0 surprises us (e.g., route mounted but allowlist empty → 403s everything), it self-escalates into the real first build — but the evidence says it won't.

---

## 5. CROSS-CUTTING RISKS + MITIGATIONS
- **Shared-tree commit absorption** — commit from `H:/prism-slot-hotel` on `slot/hotel`, or prefix `[MAIN]` + re-`git add` if a routing hook unstages (`feedback_commit_prefix_main_on_shared_tree`). Q2S file-to-charlie avoids the cross-slot edit entirely.
- **Financial-invariant integrity** — open only core operational writes (PTO/PO/counterparty) this pass; keep ~120 financial-writes `403` until individually reviewed. Every write keeps `verifyToken` + a role gate. Never blanket-open the allowlist.
- **PII** — portal messages/service-cases + counterparty data carry PII once persisted. Route untrusted intake through a PII scan; ensure the store is not world-readable; redact in any ledger/log via `scripts/lib/redact-secrets.mjs`.
- **In-memory data loss** — the gap U-HOTEL-PORTAL-PERSISTENCE closes; persistence is Phase 1 (before write-path exposure) so we never expose a durable-looking write that's actually volatile. Kill-restart-readback is the fail-loud acceptance gate.
- **Re-introduction of the 341 false-wire bug** — U-HOTEL-FALSE-WIRE-REGRESSION-GUARD in CI is the standing backstop; must be proven to go red on a deliberate re-stub (R9).

---

## NET
Phase 0 proves ~6 "blockers" are already live. The true hotel-finalization surface is **3 real build units** (persistence, write-review, false-wire guard) + **1 verify** (realtime) + **2 file/tag** (Q2→charlie, mobile-exempt). Build those, verify the rest, stop.

---

## EXECUTION LOG

### U-HOTEL-P0-VERIFY-SHIPPED — DONE 2026-06-09 (zero build, as predicted)
All 6 claimed blockers confirmed live (existence + wiring):
1. `routes/business.ts` (5022B) mounted `index.ts:144` `/api/v1/business` (`createBusinessRouter`) ✓
2. `routes/hotel-portal.ts` (9918B) mounted `index.ts:136` `/api/v1/hotel-portal` ✓
3. `routes/realtime.ts` (3553B) mounted `index.ts:179` `/api/v1/realtime` (SSE stream+emit+stats) ✓
4. payroll-filing: 10 refs (5 action enum + 5 switch case) in `businessDispatcher.ts` ✓ (U-PAYROLL-FILING-WIRE this session)
5. DocuStrata population: `state/shared/dashboards/jm-population-status.md` = GREEN/shipped ✓
6. JM data fill: `mcp-server/data/jm-die-database/manifest.json` exists ✓
**Outcome:** roadmap confirmed trimmed to 3 real builds + 1 verify + 2 file/tag. No code written.

### Session 2 (2026-06-09, /loop /goal) — 4 units closed
- **U-HOTEL-P0-CONSTANTS-AUDIT — DONE (zero build).** Deterministic audit: 3823 engine files scanned, 11 ERP constants files imported (bank-accounts, chart-of-accounts-policy, payroll-tax-tables, form-1099-thresholds, sales-tax-rates, ar-finance-charge-policy, cash-application-accounts, buyer-account-policy, bank-feed/reconciliation, bill-payment), **0 confirmed-missing**. The CLAUDE.md `(verify)` tags were not evidence of absence — full coverage proven. No speculative extraction.
- **U-HOTEL-P4-MOBILE-WIRE-EXEMPT — DONE (already satisfied).** Roadmap premise STALE: 7 mobile engines exist (not 3). 6/7 are real-wired (EmployeeShopFloorMobile, MobileLookup [devDispatcher:3995], MobileCache, MobileTimer, MobileAlarm, MobileInterface [2 dispatchers]); MobileVoice (only orphan) already carries a well-formed `// WIRE-EXEMPT:` tag. **Zero untagged orphans** — tagging the 6 wired engines would be a false tag (R12). No build.
- **U-HOTEL-FILE-Q2S-DFM-TO-CHARLIE — DONE (filed, not built).** Bug verified REAL at `QuoteToShipOrchestratorEngine.ts:1471` (`ctx.features = resolved?.features ?? resolved ?? []` assigns a non-array → DFM_CHECK :1512 iterates it → "features is not iterable" on PDF-only jobs). Filed to AGENT_CHAT with site + fix (Array.isArray normalize at :1471 + DFM boundary) + ref d6291f80. Hotel did NOT edit the orchestrator (quoting/CAD-feature domain, R8).
- **U-HOTEL-FALSE-WIRE-REGRESSION-GUARD — DONE (built, 20/20 green).** `businessDispatcher.false-wire-regression-guard.test.ts` round-trips all 17 allowlisted prism_business actions through the REAL dispatcher (the existing route test mocks callTool → can't catch a false-wire behind the gate). `isPlaceholder()` detector flags null/stub-marker/param-echo/empty-success while accepting real data, empty query results, and real validation errors. R9 red-on-restub PROVEN via detector meta-tests. Caught marketplace_lead_get supplierId-keying (verified correct) + a regex bug in the detector itself.

**Banked: 4 of 6 remaining units (3 verify/file + 1 real build).** Remaining: U-HOTEL-PORTAL-PERSISTENCE (Phase 1, heavy), U-HOTEL-ALLOWLIST-WRITE-REVIEW + U-HOTEL-P3-REALTIME-VERIFY (depend on persistence).
Next: U-HOTEL-PORTAL-PERSISTENCE (Phase 1) — heavier build, checkpointed pending fresh budget.
