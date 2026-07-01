---
name: reference_sierra_audit_dormant_bridge_2026_06_18
description: "Sierra shipped U-AUDIT-DORMANT-BRIDGE (commit 7e65e4af9d, 2026-06-18, branch cad-fusion-live-ms0) -- the audit-accuracy half of the zulu BACKEND-COMPLETION-TRIAGE-2026-06-18 work-order routed to sierra (#1b). KEY R8/R12 FINDING: the work-order was PARTIALLY STALE -- item #1a (false-UNWIRED double-count: reactiveChainBootstrap both 'Skipped(3)' and in 'the 14') was ALREADY resolved by alpha's U-AUDIT-ENTRY-CONSUMER (9f54ef156a) + U-AUDIT-LAZY-IMPORT-DETECT: the live audit reports UNWIRED=8 (down from 14), all 8 genuine external CAD/CAM bridges. The 'Skipped (3)' the brief cited is a stripped COMMENT in aiReasoningDispatcher.ts:107 (`// Skipped (3): EnsembleMLEngine (no singleton), reactiveChainBootstrap`), NOT an audit bucket -- stripCommentLines correctly removes it (probed: engineReferencedInConsumer returns false). So I did NOT blindly re-fix an already-fixed script. The REAL remaining work was item #1b: a distinct DORMANT-BRIDGE classification. Added applyDormantBridgeClassification (pure, exported, unit-testable): an engine wired SOLELY via a gated module-load boot path (reactive-chains-boot.ts REGISTRATION_MODULES, gated default-off behind PRISM_REACTIVE_CHAINS_ENABLE) is BUILT+boot-wired but DORMANT in prod -- distinct from fully-active WIRED-* and from UNWIRED (remedy: enable the gate, NOT add a dispatcher action). Driven by the boot module's OWN REGISTRATION_MODULES + *_ENABLE export (nothing hardcoded). Live: cycleSchedulingBridge (no WIRE-EXEMPT marker -> was mislabeled WIRED-VIA-ENGINE) -> DORMANT-BRIDGE; reactiveChainBootstrap keeps its author `// WIRE-EXEMPT:` marker (highest-priority class, never overridden); a module ALSO wired by a real dispatcher stays active. +7 tests (42 green), 2-arm scrutiny (code-analyzer PASS + reviewer no-findings)."
type: reference
galaxy: system-viz
source: prism-memory
synced: 2026-06-27T20:30:47.188Z
aliases: reference_sierra_audit_dormant_bridge_2026_06_18
---


# Sierra: DORMANT-BRIDGE audit class + stale-work-order catch (2026-06-18)

Zulu/Hermes routed sierra a backend work-order: "fix audit-unwired-engines.mjs mis-classification
(double-count + EventBus-bridge blindness)". The audit feeds BUILD_STATE NEEDS_WIRING + the
/system-viz ghost-orphan roosts (sierra's domain), so signal accuracy is mine.

## The R8/R12 catch: measure before re-fixing
The brief described a state ALREADY FIXED. Ran the live audit FIRST (not blind implement):
UNWIRED=8 (not 14), reactiveChainBootstrap/cycleSchedulingBridge NOT unwired. git log showed
alpha's `U-AUDIT-ENTRY-CONSUMER` (WIRED-VIA-ENTRY + Form-4 module-array detection) already landed
today. The brief's "Skipped (3)" is a COMMENT in aiReasoningDispatcher.ts:107, not an audit bucket
(stripCommentLines strips it; probed engineReferencedInConsumer=false). Item #1a = already done.
Lesson: a routed work-order can be stale; verify the LIVE state before acting, or you redo done work.

## The real remaining work (#1b): DORMANT-BRIDGE
`applyDormantBridgeClassification(engines, bootSrc, bootBase)` -- reclassify an engine wired SOLELY
via the gated boot path. Eligibility: UNWIRED, or WIRED-VIA-ENGINE with ALL reasons citing the boot
module. SKIP: WIRE-EXEMPT (never override the highest-priority class) + any non-boot dispatcher reason
(genuinely active). Driven by reactive-chains-boot's own `REGISTRATION_MODULES` + `*_ENABLE` literal.

## The WIRE-EXEMPT asymmetry (intentional, both arms validated)
- cycleSchedulingBridge: NO marker -> was mislabeled WIRED-VIA-ENGINE -> now DORMANT-BRIDGE (the fix).
- reactiveChainBootstrap: has `// WIRE-EXEMPT:` (author: "load-time bootstrap, not a dispatcher
  action") -> stays WIRE-EXEMPT. WIRE-EXEMPT is the audit's highest-priority, never-overridden class.
Both are correctly "not a dispatcher-wiring gap"; the unmarked one gets the precise gated-dormant label.

## Validation
Live audit: DORMANT-BRIDGE=1 (cycleSchedulingBridge), UNWIRED still excludes it, dormantBridges list +
note emitted. +7 unit tests (UNWIRED->reclassify, solely-boot-wired->reclassify, WIRE-EXEMPT-preserved,
dispatcher-wired-preserved, ungated-no-op, absent-boot-no-op, basename-extraction); 42/42 green.
2-arm scrutiny PASS (analyzer: full correctness trace, false-positive surface empty on live tree).

## Next (sierra/backend)
Domain system-viz units (ghost-roost accuracy / regen-viz / FAST[]) OR the deferred
[[reference_sierra_fe_route_mount_2026_06_18]] U-FE-SPECIALTY-CONTRACT. Coordinate via AGENT_CHAT.
