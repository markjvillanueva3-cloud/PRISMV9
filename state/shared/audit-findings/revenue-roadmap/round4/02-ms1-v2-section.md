# REVENUE-MS1 v2 — Subscription mechanics, billing, compliance, form-factor (43 units)

**Owner:** claude-99eca613 (revenue-roadmap lane) — Round-4 revision agent 2/10
**Source revisions consumed:** round3/03-ms1-expand-32-40 (18->43), round3-5/02-sfc-ui-pricing (tier matrix), original REVENUE-ROADMAP-2026-05-10.md REVENUE-MS1 (18 units, baseline)
**Generated:** 2026-05-10
**Schema:** standard PRISM milestone envelope (`mcp-server/data/milestones/MS-REV-MS1-*.json`) — each unit declares `id` / `title` / `status` / `files_modified` / `details` / `acceptance` / `depends_on` / `verifies_via` (v7.A HARD GATE) / `tiers_invoked` (v7.C where applicable) / `variability_axes_covered`

---

## Why MS1 v2 differs from v1

Round-2 reviewer found that the original 18 units **collapsed multiple compliance + form-factor + variability surfaces into single units**, hiding 6-12 weeks of work behind innocuous one-line titles. Round-3 forensics expanded MS1 from 18 to 43 units across 9 work axes:

| Axis | v1 units | v2 units | Net add |
|---|---|---|---|
| Dispatcher scaffolding | 0 (implicit) | 1 (`U-SUB-00`) | +1 |
| Webhook hardening (signature + dispatch + Paddle RSA) | 1 (`U-SUB-01` mashed all) | 3 (`U-SUB-19/20/21`) | +2 |
| Tax (bridge + invoice render + VAT-ID + exempt) | 1 (`U-SUB-13` mashed) | 4 (`U-SUB-22..25`) | +3 |
| Currency rounding + reconciliation | 0 | 1 (`U-SUB-26`) | +1 |
| Compliance (GDPR Art-17 + SOC2 hash-chain + PCI/SOX retention) | 0 | 3 (`U-SUB-27..29`) | +3 |
| Subscription state (proration + downgrade + grandfather + refund-math + chargeback + annual->monthly credit) | 2 (`U-SUB-12/17` partial) | 6 (`U-SUB-30..35`) | +4 |
| Dunning state machine (explicit FSM) | 1 (`U-SUB-09`) | 1 (`U-SUB-36`) | 0 (rewrite) |
| Form factor (offline JWT + browser->plugin bridge) | 0 | 2 (`U-SUB-37/38`) | +2 |
| Multi-seat (revoke+CRL + transfer + multi-org) | 1 (`U-SUB-15`) | 3 (`U-SUB-39/40/41`) | +2 |
| Pairwise variability matrix | 0 (ad-hoc 48/480) | 1 (`U-SUB-42`) | +1 |
| Anti-fraud (affiliate clawback) | 1 (`U-SUB-18` shallow) | 1 (`U-SUB-43` deep) | 0 (rewrite) |
| Original carryovers (Paddle, Tier-feature, License-validator, Trial conv, Customer dashboard BE/FE, Invoice PDF, API rate-limit, Tier-gate hook, Annual/monthly discount, Self-service upgrade) | 14 | 14 | 0 |
| **Totals** | **18** | **43** | **+25** |

Hoist law per round3/02: `U-SUB-01..U-SUB-04` (in v1 numbering -> `U-SUB-00`, `U-SUB-19`, `U-SUB-22`, `U-SUB-28` in v2) **MUST land before MS0 paywall units activate.** No revenue can flow safely otherwise.

---

## Pricing tier table (canonical — sourced from round3-5/02)

| Tier | Price (USD/mo) | Daily calc quota | ISO groups | Optimize mode | Recipes saved | Watermark | Seats | API quota | CAM plugins | SSO | Target |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Free** | $0 | 3/day | P-steel only | No (Quick only) | Last 5 | "PRISM-FREE" on CSV | 1 | — | — | — | Trial / hobbyist demo |
| **Hobbyist** | $9 | Unlimited | P/M/K/N/S/H all 6 | Yes | Unlimited | None | 1 | — | — | — | Garage shops, students |
| **Pro** | $39 | Unlimited | All 6 | Yes + What-if 3-up + stability lobes + overhang slider | Unlimited + tags + search | None | 1 | — | — | — | Professional machinists / programmers |
| **Shop** | $249 | Unlimited | All 6 | Yes + everything Pro | Team shared library | None | 10 (+$25/seat above) | 10k calls/mo | Fusion add-in | Google Workspace | 5-50 machinist job shops |
| **Enterprise** | $999 (floor) | Unlimited | All 6 + custom ingest | Yes + everything Pro | Unlimited + custom | None | Unlimited | Unlimited | All (Fusion + Mastercam + hyperMILL) | SAML SSO + SCIM | 50+ shops, OEMs, contract mfrs; on-prem option, audit logs, SLA 99.9% |

**Annual discount:** 20% off (Hobbyist $86/yr vs $108, Pro $375/yr vs $468). Shown at checkout.
**Trial:** 14-day Pro on first quota-hit, **credit-card-required** (G-Wizard's no-CC trial gets gamed). 60-day free-Pro for beta shops in week-3 soft-launch.
**Free-tier triggers `UpgradePromptModal`:** (a) 4th calc/day, (b) non-P material, (c) Optimize click, (d) Compare-3up click, (e) 6th save-recipe.

**Tier-feature mapping is canonical in `state/shared/feature-tiers.json`** (consumed by `FeatureTierEngine` from v1 `U-SUB-03`). v2 retains that engine; the table above is the source-of-truth for what that JSON encodes.

---

## Dependency chain (MS0 / MS1 / MS2 ordering)

```
                  U-REV-ADMIN-01..07 (MS0 admin pages)
                          │
                          ▼
   U-SUB-00 prism_subscription dispatcher scaffold   <-- foundation
                          │
        ┌─────────────────┼──────────────────┐
        ▼                 ▼                  ▼
  U-SUB-19 webhook     U-SUB-22 Stripe      U-SUB-28 SOC2 audit-log
  signature/dispatch    Tax bridge          hash-chain
        │                 │                  │
        ▼                 ▼                  ▼
  U-SUB-20 event       U-SUB-23/24/25       U-SUB-27 GDPR delete
  handler dispatch     (invoice/VAT/exempt) U-SUB-29 retention/PCI
        │                                    │
        ▼                                    ▼
  U-SUB-21 Paddle      U-SUB-30..35        U-SUB-32 grandfather
  RSA verify           sub-state mechanics
                          │
                          ▼
                  U-SUB-36 dunning FSM
                          │
                          ▼
                  U-SUB-37/38 offline JWT + browser->plugin bridge
                          │
                          ▼
                  U-SUB-39/40/41 seat revoke+CRL + transfer + multi-org
                          │
                          ▼
                  U-SUB-42 pairwise matrix gate (124 + 12 cases)
                  U-SUB-43 affiliate fraud + clawback
                          │
                          ▼
       ✅ MS0 paywall units activate
       ✅ MS2 invention units (per-product) gate-passable
```

**Hoist rule (Pareto-1 per round3/02):**
- Until `U-SUB-19` ships, **disable webhook intake** in production (no money flows through unverified endpoints).
- Until `U-SUB-22` ships, **block EU/UK/CA/AU GTM** (no compliant tax calc; sales to US-only).
- Until `U-SUB-28` ships, **enterprise sales gated** (SOC2 evidence chain is precondition for any customer with audit-procurement).

**MS0 ADMIN-01 + MS1 billing concurrency:** ADMIN-01 (user mgmt) and U-SUB-00..04 can run in parallel on separate worktrees; they merge through the shared `prism_subscription` dispatcher schema. No file-claim conflicts because ADMIN-01 lives in `mcp-server/web/admin/*` and SUB units live in `mcp-server/src/engines/Subscription*.ts`.

---

## v7.A verification-channel template (HARD GATE — applies to every unit below)

Every MS1 v2 unit declares `verifies_via: { tool, expected_signal, re_run_cost }` per the v7.A table in the parent spec. For subscription/compliance work the default is:

```
verifies_via.tool: rtk vitest run -- <engine>.test.ts && stripe webhook --test <event>
verifies_via.expected_signal: Webhook -> dispatcher round-trip green; ledger entry written
verifies_via.re_run_cost: ~15s
```

Special-case verifications are called out per-unit below.

---

## The 43 units

### Foundation (1 unit)

#### U-SUB-00 — `prism_subscription` dispatcher scaffold
- **Spec:** Create greenfield `prism_subscription` dispatcher with action enum (`webhook_receive`, `entitlement_grant`, `entitlement_revoke`, `tier_check`, `seat_allocate`, `seat_revoke`, `license_validate`, `dunning_advance`, `refund_process`, `audit_record`). Zod schemas, lazy imports. Wire-to-all-sources law: also register hooks into `prism_session` (entitlement context), `prism_context` (claim integration), `prism_dev` (inventory/build state).
- **Depends on:** none (foundation)
- **Acceptance:** Dispatcher registered in `DISPATCHER_DIGEST.md`; all 10 actions stub-routable; smoke test fires each action with empty payload returns structured error not crash; cross-dispatcher round-trip from `prism_session:dispatcher_map_compact` lists `prism_subscription` with action count = 10.
- **verifies_via:** `rtk vitest run -- prism_subscription.dispatcher.test.ts && node scripts/check-engine-wired.mjs --dispatcher prism_subscription`
- **Variability axes:** dispatcher schema (10 actions) × empty/malformed/oversize payloads (4) = 40 cases minimum

### Webhook hardening (3 units)

#### U-SUB-19 — Stripe webhook security primitives
- **Spec:** `StripeSignatureVerifierEngine` — HMAC-SHA256 verify against `STRIPE_WEBHOOK_SECRET`, raw-body middleware preservation (Stripe signature is computed on raw payload — body-parser breaks this), 300s replay-window enforcement, clock-skew tolerance ±60s, idempotency-key dedup table keyed by `event.id` with 30-day TTL.
- **Depends on:** `U-SUB-00`
- **Acceptance:** 5 adversarial tests pass — (1) replayed event rejected, (2) tampered amount rejected, (3) wrong secret rejected, (4) expired timestamp (>300s) rejected, (5) missing `Stripe-Signature` header rejected; idempotent re-delivery of same `event.id` increments dedup counter not entitlement (zero double-grant).
- **verifies_via:** `rtk vitest run -- StripeSignatureVerifierEngine.test.ts && stripe trigger checkout.session.completed --add metadata.test=replay`
- **Variability axes:** adversarial fuzz (5) × payload size (small/normal/oversize/zero) (4) = 20 cases

#### U-SUB-20 — Stripe webhook event handler dispatch
- **Spec:** `StripeEventDispatchEngine` routes verified events to handlers. Event taxonomy: `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `charge.dispute.created`. Each event type has dedicated handler; unknown event types logged and ack 200 (avoid Stripe retry storm); handler exceptions bubble for Stripe automatic retry (idempotent on next delivery via `U-SUB-19` dedup table).
- **Depends on:** `U-SUB-19`
- **Acceptance:** Each event type has dedicated handler with explicit state-transition log; unknown event types ack 200; handler exception triggers Stripe retry (test via injected throw); state transition recorded in `U-SUB-28` audit log.
- **verifies_via:** `rtk vitest run -- StripeEventDispatchEngine.test.ts && stripe trigger checkout.session.completed && stripe trigger customer.subscription.deleted`
- **Variability axes:** 6 event types × (happy / handler-throw / unknown) = 18 cases

#### U-SUB-21 — Paddle webhook RSA signature verifier
- **Spec:** `PaddleSignatureVerifierEngine` — RSA-SHA1 public-key verify (Paddle uses RSA, not HMAC); separate Paddle event taxonomy mapper (Paddle→internal canonical event type since taxonomies differ); separate idempotency table for Paddle `alert_id` (namespace-isolated from Stripe `event.id`). **Not a transparent Stripe fallback** — Paddle is a parallel rail for non-US customers per round3-5 form-factor analysis.
- **Depends on:** `U-SUB-00`
- **Acceptance:** Paddle test fixtures verify cleanly; mismatched signature rejected; namespace isolation verified (`event.id == alert_id` allowed without collision); mapping table covers Paddle `subscription_created/updated/cancelled/payment_succeeded/payment_failed`.
- **verifies_via:** `rtk vitest run -- PaddleSignatureVerifierEngine.test.ts && node scripts/paddle-fixture-replay.mjs`
- **Variability axes:** 5 Paddle event types × (valid sig / wrong key / tampered payload / replay) = 20 cases

### Tax decomposition (4 units)

#### U-SUB-22 — Stripe Tax bridge
- **Spec:** `TaxCalcBridgeEngine` — Stripe Tax API integration with nexus matrix config at `state/shared/tax-nexus-matrix.json` (per-jurisdiction nexus thresholds, schemaVersion 1.0.0 with N-1 backward compat); `automatic_tax=true` on Stripe invoice/subscription creation; `tax-id-collection` enabled.
- **Depends on:** `U-SUB-00`
- **Acceptance:** Stripe Tax sandbox creates invoice in US-CA (10.25%), US-DE (0%), UK (20%), EU-DE (19%), AU (10%) with correct rate; nexus matrix loads with N-1 schema version backward compat.
- **verifies_via:** `rtk vitest run -- TaxCalcBridgeEngine.test.ts && stripe tax_rates list`
- **Variability axes:** 5 jurisdictions × (B2C / B2B / exempt) = 15 cases

#### U-SUB-23 — Invoice tax-line rendering
- **Spec:** `InvoiceTaxRendererEngine` — per-line-item tax breakdown on PDF + HTML invoice; multi-jurisdiction stacking (state + county + city for US sub-jurisdictions); tax-exempt line annotation; VAT-MOSS quarterly summary export (EU schema compliance).
- **Depends on:** `U-SUB-22`
- **Acceptance:** Sample invoice EU-B2C shows VAT line; EU-B2B shows reverse-charge note + zero VAT; US-CA shows state+county+city breakdown; MOSS export CSV validates against EU schema.
- **verifies_via:** `rtk vitest run -- InvoiceTaxRendererEngine.test.ts && playwright test invoice-render.spec.ts`
- **Variability axes:** US-state × EU-B2C × EU-B2B × exempt × MOSS = 5 invoice classes

#### U-SUB-24 — B2B VAT-ID validation
- **Spec:** `VatIdValidatorEngine` — VIES SOAP API for EU VAT, UK VAT lookup, fallback to Stripe Tax `tax_ids` verification; reverse-charge auto-apply on validated B2B EU cross-border; retain validation timestamp + response payload for audit (SOC2 evidence — feeds `U-SUB-28`).
- **Depends on:** `U-SUB-22`
- **Acceptance:** Valid EU VAT-ID accepted; invalid rejected; VIES downtime falls back to format-regex with warning flag in audit log; cross-border B2B applies reverse-charge; validation snapshot persisted.
- **verifies_via:** `rtk vitest run -- VatIdValidatorEngine.test.ts && node scripts/vies-sandbox-probe.mjs`
- **Variability axes:** EU-DE valid × EU-FR invalid × UK valid × VIES-down × Stripe-fallback = 5 paths

#### U-SUB-25 — Tax-exempt customer flow
- **Spec:** `TaxExemptFlowEngine` — exemption certificate upload + admin review queue; per-jurisdiction exemption types (501c3, government, resale); exemption expiry tracking; retroactive credit on approved certificate.
- **Depends on:** `U-SUB-22`
- **Acceptance:** Admin approves certificate → Stripe `tax_exempt=exempt` flips; expired certificate triggers re-collection; retroactive credit generates Stripe credit-note for paid-with-tax invoices in eligibility window.
- **verifies_via:** `rtk vitest run -- TaxExemptFlowEngine.test.ts && stripe customers update --tax-exempt=exempt`
- **Variability axes:** 3 exemption types × (active / expired / revoked) × (retroactive / forward-only) = 18 cases

### Currency + reconciliation (1 unit)

#### U-SUB-26 — Currency rounding + reconciliation
- **Spec:** `CurrencyRoundingEngine` — banker's rounding (round-half-to-even) per ISO-4217 minor-unit; Stripe-compatible rounding policy; daily reconciliation report (PRISM totals vs Stripe payout totals) with drift alert > 0.01 base unit.
- **Depends on:** `U-SUB-00`
- **Acceptance:** USD/EUR/GBP/CAD/AUD/JPY rounding tests match Stripe behavior; JPY enforces zero decimal places; daily recon emits drift report; >$0.01 drift triggers alert via `infra-events`.
- **verifies_via:** `rtk vitest run -- CurrencyRoundingEngine.test.ts && node scripts/daily-stripe-recon.mjs --dry-run`
- **Variability axes:** 6 currencies × 5 rounding edge cases (0.5 / 0.495 / 0.005 / negatives / JPY zero-decimal) = 30 cases

### Compliance (3 units)

#### U-SUB-27 — GDPR Art-17 delete cascade
- **Spec:** `GdprDeleteCascadeEngine` — orchestrates Stripe `customer.deleted` + PRISM user record + license tokens + tribal-tip authorship anonymization + audit-log redaction (hash retained as compliance evidence); 30-day soft-delete window with cancel; irreversible after window.
- **Depends on:** `U-SUB-00`
- **Acceptance:** Delete request creates DSR ticket; 30d window permits cancel; on commit cascade verified across 5 surfaces (Stripe, user, licenses, tribal authorship, audit redaction); audit retains hashed evidence (proof of compliance) without PII; Stripe customer marked deleted via API.
- **verifies_via:** `rtk vitest run -- GdprDeleteCascadeEngine.test.ts && node scripts/dsr-replay.mjs`
- **Variability axes:** (cancel-during-window / commit-after-window) × (5 surfaces) × (data classes: PII / pseudonymous / public) = 30 cases

#### U-SUB-28 — SOC2 audit-log immutable hash-chain
- **Spec:** `AuditLogEngine` — append-only table for every entitlement change (`actor`, `timestamp`, `from_state`, `to_state`, `reason`, `request_id`); hash-chain (each row hashes prev-row-hash + payload); tamper-evident verify endpoint; 7-year retention (SOX baseline; trimmed by `U-SUB-29`).
- **Depends on:** `U-SUB-00`
- **Acceptance:** Every `tier_check` / `entitlement_grant` / `seat_allocate` logs immutable row; hash-chain verify endpoint detects tampering of any historical row (test: flip one byte, verify catches); retention enforced; SOC2 CC7.2 auditor sample-pull script produces signed report.
- **verifies_via:** `rtk vitest run -- AuditLogEngine.test.ts && node scripts/audit-chain-verify.mjs --tamper-test`
- **Variability axes:** 10 action types × (happy / tamper-attempt / retention-edge) = 30 cases

#### U-SUB-29 — Audit-log retention + PII minimization (PCI/SOX)
- **Spec:** `AuditRetentionEngine` — 7-year retention for financial events (SOX), 3-year for entitlement, **PCI-DSS scope minimization** (no raw PAN ever stored, only Stripe `customer_id` / `payment_method` tokens); automated retention purge with hash-chain re-anchoring on purge boundary.
- **Depends on:** `U-SUB-28`
- **Acceptance:** Retention scan validates no event past TTL; PCI scope audit script confirms zero PAN/CVV/full-card storage anywhere in PRISM (grep + schema scan); purge re-anchors hash chain so verification still works for retained window.
- **verifies_via:** `rtk vitest run -- AuditRetentionEngine.test.ts && node scripts/pci-scope-scan.mjs`
- **Variability axes:** event class (financial / entitlement / DSR) × retention boundary (in-window / at-edge / past-TTL) = 9 cases

### Subscription state mechanics (6 units)

#### U-SUB-30 — Proration engine (decoupled)
- **Spec:** `ProrationEngine` — pure-function mid-cycle plan-change math (credit unused period at old tier, charge prorated new tier); Stripe Prorations API integration; day-boundary policy (UTC); preview-before-commit endpoint for UI.
- **Depends on:** `U-SUB-00`
- **Acceptance:** Unit tests — upgrade mid-month credits + charges balance; downgrade scheduled vs immediate paths both correct; Stripe preview API mirrored locally; preview returns invoice-item array matching Stripe.
- **verifies_via:** `rtk vitest run -- ProrationEngine.test.ts && stripe invoices upcoming --subscription <id>`
- **Variability axes:** (upgrade / downgrade) × (immediate / scheduled) × (day-1 / mid / day-N) × (5 tier transitions) = 60 cases

#### U-SUB-31 — Plan-change downgrade state machine
- **Spec:** `PlanChangeStateEngine` — immediate vs end-of-cycle downgrade; seat-shuffle policy on multi-seat downgrade (LIFO by activation date with admin-override); entitlement-revoke timing per tier; scheduled-change cancellation window.
- **Depends on:** `U-SUB-30`
- **Acceptance:** Downgrade 10-seat→5-seat with no admin pick revokes 5 most-recently-added; admin override accepted via API; scheduled change cancellable until 1h before effective; revoke triggers CRL update (`U-SUB-39`).
- **verifies_via:** `rtk vitest run -- PlanChangeStateEngine.test.ts`
- **Variability axes:** seat count (1/5/10/50) × policy (LIFO / admin-pick) × timing (immediate / scheduled) = 24 cases

#### U-SUB-32 — Grandfather pricing table + reactivation window
- **Spec:** `GrandfatherTableEngine` — `state/shared/grandfather-pricing.json` with `schemaVersion` + N-1 compat; reactivation window (default 60d) preserves grandfather rate; beyond window forces current rate; admin force-grandfather override with audit-log entry.
- **Depends on:** `U-SUB-28`
- **Acceptance:** Cancel-then-resubscribe within 60d retains old price; beyond 60d uses current; admin override logged immutably in `U-SUB-28` chain; schema-version bump migration tested.
- **verifies_via:** `rtk vitest run -- GrandfatherTableEngine.test.ts`
- **Variability axes:** (within-window / at-edge / beyond) × (admin override / no override) × (3 historical pricing snapshots) = 18 cases

#### U-SUB-33 — Refund math + entitlement revoke atomicity
- **Spec:** `RefundMathEngine` — full vs partial refund proration; atomic refund+revoke transaction (both succeed or both rollback); prepaid-annual partial refund credits remaining months; idempotent on Stripe refund webhook re-delivery.
- **Depends on:** `U-SUB-20`, `U-SUB-30`
- **Acceptance:** Full refund revokes entitlement immediately; 50% refund prorates to remaining 50%; mid-transaction failure rolls back both; duplicate refund webhook is no-op.
- **verifies_via:** `rtk vitest run -- RefundMathEngine.test.ts && stripe refunds create --charge <id> --amount <partial>`
- **Variability axes:** (full / partial / zero) × (monthly / annual) × (rollback-injected / clean) = 18 cases

#### U-SUB-34 — Chargeback evidence pipeline
- **Spec:** `ChargebackEvidenceEngine` — auto-assembles Stripe Radar dispute evidence (signup IP, license usage logs, invoice PDFs, support tickets) within 7-day Stripe deadline; submits via `dispute.update` API; tracks win/loss outcome metric.
- **Depends on:** `U-SUB-20`
- **Acceptance:** Dispute webhook triggers evidence-gather job; assembled bundle submitted before deadline; win-rate metric tracked; replay test on synthetic dispute completes end-to-end.
- **verifies_via:** `rtk vitest run -- ChargebackEvidenceEngine.test.ts && stripe trigger charge.dispute.created`
- **Variability axes:** dispute reason (fraud / product-not-received / duplicate) × deadline (Day-1 / Day-6 / overdue) = 9 cases

#### U-SUB-35 — Annual-to-monthly credit conversion
- **Spec:** `CreditConversionEngine` — converts unused annual balance to Stripe `credit_balance` on plan downgrade; applies credit against future monthly invoices first; surfaces credit-remaining in customer portal.
- **Depends on:** `U-SUB-33`
- **Acceptance:** Annual $1200 downgraded at month-3 produces $900 credit; next 9 monthly invoices apply credit first; portal shows accurate `credit_remaining`.
- **verifies_via:** `rtk vitest run -- CreditConversionEngine.test.ts`
- **Variability axes:** annual amount (3 prices) × downgrade timing (4 months) × subsequent invoice cycles = 12 cases

### Dunning (1 unit)

#### U-SUB-36 — Dunning state machine
- **Spec:** `DunningStateMachineEngine` — `ACTIVE → PAST_DUE → GRACE → READ_ONLY → SUSPENDED → CANCELED` with configurable durations per tier; Stripe Smart Retries (d1/d3/d5/d7/d14); running-job exemption (in-flight CAM jobs allowed to finish before READ_ONLY); GDPR Art-20 data-export window before terminal state.
- **Depends on:** `U-SUB-20`
- **Acceptance:** State transitions logged in `U-SUB-28` chain; READ_ONLY blocks new operations but allows job completion; SUSPENDED triggers 30d data-export grace; reactivation-on-payment within 14d preserves grandfather (`U-SUB-32`).
- **verifies_via:** `rtk vitest run -- DunningStateMachineEngine.test.ts && stripe trigger invoice.payment_failed`
- **Variability axes:** 6 states × 5 retry days × (running-job / no-job) = 60 cases

### Form factor (2 units)

#### U-SUB-37 — Offline CAM-plugin JWT license
- **Spec:** `OfflineLicenseJwtEngine` — PRISM-signed JWT (ES256) containing `seat_id` + `exp` + `entitlements` + `nonce`; plugin caches token and refreshes when online; runs up to N days (configurable per tier — Pro 7d, Shop 14d, Enterprise 30d) offline; CRL pulled on reconnect.
- **Depends on:** `U-SUB-00`
- **Acceptance:** Plugin validates token offline; expired token blocks features; revoked token in CRL blocks on next online check; air-gapped 7-day operation test passes.
- **verifies_via:** `rtk vitest run -- OfflineLicenseJwtEngine.test.ts && node scripts/airgap-replay.mjs --days 7`
- **Variability axes:** tier (3) × offline duration (1d / N-1d / N+1d) × (valid / revoked / expired) = 27 cases

#### U-SUB-38 — Browser-to-plugin token bridge
- **Spec:** `TokenBridgeEngine` — web user logs in → short-lived bridge token via deep-link or local-loopback handshake passes signed JWT to plugin; replaces username+password in plugin entirely.
- **Depends on:** `U-SUB-37`
- **Acceptance:** Web login → launch plugin → plugin receives JWT without secret prompt; bridge token TTL ≤ 120s; replay of bridge token after consumption rejected.
- **verifies_via:** `rtk vitest run -- TokenBridgeEngine.test.ts && playwright test bridge-handshake.spec.ts`
- **Variability axes:** transport (deep-link / loopback) × (valid / expired / replayed / wrong-origin) = 8 cases

### Multi-seat (3 units)

#### U-SUB-39 — Seat revoke + token revocation list (CRL)
- **Spec:** `SeatRevokeEngine` — revoke triggers CRL update at `state/shared/license-crl.json`; offline-cache invalidation via push (online plugins) + pull-on-reconnect (offline plugins); in-flight job grace policy; audit-log entry via `U-SUB-28`.
- **Depends on:** `U-SUB-37`, `U-SUB-28`
- **Acceptance:** Revoke from admin UI; online plugin loses access within 30s via push; offline plugin loses access on next reconnect; running job completes with read-only output.
- **verifies_via:** `rtk vitest run -- SeatRevokeEngine.test.ts && node scripts/crl-push-test.mjs`
- **Variability axes:** (online / offline / running-job) × (CRL-up-to-date / stale) = 6 cases

#### U-SUB-40 — Seat transfer + history audit
- **Spec:** `SeatTransferEngine` — admin reassigns seat from user A to user B preserving `seat_id` continuity; full history table (`seat_id`, `user_id`, `granted_at`, `revoked_at`, `reason`) for SOC2 traceability + per-seat-license dispute resolution.
- **Depends on:** `U-SUB-39`
- **Acceptance:** Transfer preserves `seat_id`; history query returns chronological holders; SOC2 evidence pull shows who held seat X on date Y.
- **verifies_via:** `rtk vitest run -- SeatTransferEngine.test.ts`
- **Variability axes:** (1 transfer / 5 chained / cycle) × (within-org / cross-org) = 6 cases

#### U-SUB-41 — Multi-org membership
- **Spec:** `MultiOrgEngine` — single user can belong to N orgs with per-org tier + entitlements; active-org context in session; per-org billing isolation; user-leaves-org cleanup without affecting other org memberships.
- **Depends on:** `U-SUB-40`
- **Acceptance:** User in 3 orgs with different tiers gets correct entitlements per active-org context; leaving org A retains org B+C access; billing events scoped to `org_id`.
- **verifies_via:** `rtk vitest run -- MultiOrgEngine.test.ts`
- **Variability axes:** N-org membership (1/3/10) × tier-mix (uniform / mixed) × leave-event (initiator / target) = 18 cases

### Pairwise variability (1 unit)

#### U-SUB-42 — Pairwise test matrix generator (IPOG)
- **Spec:** `PairwiseMatrixEngine` — replaces ad-hoc 48/480 sampling with IPOG (in-parameter-order-general) pairwise coverage generator over **tier (5) × provider (4) × form_factor (4) × currency (6)** → ~124 pair-covered cases + 12 highest-revenue triplets exhaustive.
- **Depends on:** `U-SUB-00`
- **Acceptance:** Generator emits test-case CSV; all 2-way interactions covered (verified by combinatorial check); top-12 triplets enumerated; CI consumes CSV and runs each case against subscription dispatcher.
- **verifies_via:** `rtk vitest run -- PairwiseMatrixEngine.test.ts && node scripts/pairwise-coverage-verify.mjs`
- **Variability axes:** the matrix IS the variability surface — meta-unit; verifies all axes covered.

### Anti-fraud (1 unit)

#### U-SUB-43 — Affiliate fraud heuristics + clawback
- **Spec:** `AffiliateFraudEngine` — heuristic stack: (a) self-referral via IP/device-fingerprint match, (b) cookie-stuffing via referrer-chain anomaly, (c) refund-after-payout pattern; risk score per referral; auto-hold high-risk payouts for manual review; clawback policy on confirmed fraud + chargeback.
- **Depends on:** `U-SUB-28`
- **Acceptance:** Self-referral test case scored > 0.8 risk; cookie-stuffing pattern detected; clawback creates Stripe credit-note reversing payout; all fraud events logged immutably in `U-SUB-28`.
- **verifies_via:** `rtk vitest run -- AffiliateFraudEngine.test.ts`
- **Variability axes:** 3 fraud signatures × (high-conf / borderline / clean) × payout state (pending / paid) = 18 cases

### Original-v1 carryovers (14 units — retained verbatim with v7.A gates added)

These retain the v1 IDs `U-SUB-01..U-SUB-18` from the original spec (Paddle alt, FeatureTier, LicenseValidator, TrialConversion, CustomerDashboard BE+FE, InvoicePdf, RateLimit middleware, TierGateHook, annual/monthly discount param, multi-seat purchase, SubscriptionState pause/vacation, self-service upgrade/downgrade, affiliate/referral tracking). Each gains a `verifies_via` block per v7.A and a `variability_axes_covered` declaration.

| v1 ID | Title | New verifies_via | Variability axes added |
|---|---|---|---|
| `U-SUB-01` | Stripe webhook receiver (now thin shim — heavy work in `U-SUB-19/20`) | `rtk vitest run -- StripeWebhookEngine.test.ts` | 6 event types × 3 paths = 18 cases |
| `U-SUB-02` | Paddle alternative for non-US (thin shim — heavy in `U-SUB-21`) | `rtk vitest run -- PaddleWebhookEngine.test.ts` | 5 event types × 3 paths = 15 |
| `U-SUB-03` | Tier-feature mapping (`FeatureTierEngine` + `state/shared/feature-tiers.json`) | `rtk vitest run -- FeatureTierEngine.test.ts && node scripts/feature-tier-coverage.mjs` | 5 tiers × N features = full matrix |
| `U-SUB-04` | Per-seat license validation middleware | `rtk vitest run -- LicenseValidatorEngine.test.ts && curl -H 'X-License: ...' /sfc` | 5 tiers × (valid / expired / wrong-org) = 15 |
| `U-SUB-05` | Trial → paid conversion flow (`TrialConversionEngine` + 3 trial-gated pages) | `playwright test trial-conversion.spec.ts` | 5 trigger placements × (CC-required / -not) = 10 |
| `U-SUB-06` | Customer dashboard backend (`CustomerDashboardEngine`) | `rtk vitest run -- CustomerDashboardEngine.test.ts` | 5 tiers × (usage / billing / seats) = 15 |
| `U-SUB-07` | Customer dashboard frontend | `playwright test dashboard.spec.ts` | 5 tiers × responsive breakpoints (3) = 15 |
| `U-SUB-08` | Invoice/receipt PDF gen (`InvoicePdfEngine` consumes pdf-skill) | `rtk vitest run -- InvoicePdfEngine.test.ts` | 5 invoice classes × (B2C/B2B) = 10 |
| `U-SUB-09` | Failed-payment dunning flow (thin shim — heavy in `U-SUB-36`) | `rtk vitest run -- DunningFlowEngine.test.ts` | (replaced by `U-SUB-36`) |
| `U-SUB-10` | API rate-limit per-tier middleware | `rtk vitest run -- RateLimitEngine.test.ts && k6 run rate-limit-soak.js` | 5 tiers × (under / at / over limit) = 15 |
| `U-SUB-11` | Per-tier hook injection (`TierGateHookEngine`) | `rtk vitest run -- TierGateHookEngine.test.ts` | 5 tiers × dispatcher actions = full |
| `U-SUB-12` | Refund/dispute handler (thin shim — heavy in `U-SUB-33/34`) | `rtk vitest run -- RefundHandlerEngine.test.ts` | (replaced) |
| `U-SUB-13` | Tax calc (thin shim — heavy in `U-SUB-22..25`) | `rtk vitest run -- TaxCalcBridgeEngine.test.ts` | (replaced) |
| `U-SUB-14` | Annual-vs-monthly discount logic (parameter on `FeatureTierEngine`) | `rtk vitest run -- FeatureTierEngine.test.ts -- annual` | 5 tiers × (monthly / annual / mid-switch) = 15 |
| `U-SUB-15` | Multi-seat purchase + admin invite (thin shim — heavy in `U-SUB-39/40/41`) | `playwright test seat-invite.spec.ts` | (replaced) |
| `U-SUB-16` | Subscription pause / vacation mode (`SubscriptionStateEngine`) | `rtk vitest run -- SubscriptionStateEngine.test.ts` | 5 tiers × (pause / resume / expire) = 15 |
| `U-SUB-17` | Self-service plan upgrade/downgrade (extends `FeatureTierEngine`) | `playwright test upgrade-downgrade.spec.ts` | 20 transitions × (immediate / scheduled) = 40 |
| `U-SUB-18` | Affiliate / referral tracking (thin shim — fraud in `U-SUB-43`) | `rtk vitest run -- ReferralEngine.test.ts` | 3 attribution windows × N affiliates |

**Net effective unit count:** 43 (1 foundation + 3 webhook + 4 tax + 1 currency + 3 compliance + 6 sub-state + 1 dunning + 2 form-factor + 3 multi-seat + 1 pairwise + 1 anti-fraud + 18 carryovers, with several carryovers downgraded to "thin shim" status since their heavy work is now in the v2 expansions).

---

## P0 hoist set (5 units must merge before MS0 paywall lights up)

| P0 ID | Reason |
|---|---|
| `U-SUB-00` | Foundation — nothing routes without the dispatcher |
| `U-SUB-19` | F-r2-a2-1 CRITICAL: revenue-exfil prevention; no webhook intake until this lands |
| `U-SUB-22` | F-r2-a2-3 CRITICAL: tax compliance; blocks EU/UK/CA/AU GTM |
| `U-SUB-28` | F-r2-a2-6 HIGH: SOC2 substrate every other unit emits audit events into |
| `U-SUB-04` | License-validator middleware — paywall has no teeth without this |

**Total P0 count: 5 units** (foundation + 3 round-3 most-urgent + license middleware).

---

## Acceptance gate at MS1 close

MS1 v2 is `complete` when:
1. All 43 units have `status: shipped` with green `verifies_via` ledger entry in `mcp-server/data/state/SCRUTINY_LEDGER.json`.
2. `U-SUB-42` pairwise matrix has executed CI run with **zero failures across 124 + 12 cases**.
3. `U-SUB-28` audit-chain verify passes against full event history.
4. PCI scope scan (`U-SUB-29`) returns zero PAN/CVV findings across `mcp-server/`.
5. `stripe trigger checkout.session.completed --add metadata.test=e2e` round-trips through `prism_subscription:webhook_receive → entitlement_grant → audit_record` within p95 < 800ms (load-tested via k6 at 50 req/s peak).
6. 3-of-3 scrutiny consensus (Codex + Gemini + Opus reviewer) passes for the milestone-close PR.
7. `state/shared/REVENUE-READINESS.json` `ms1_subscription_pct == 1.0`.
