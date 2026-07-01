# Injection / context token-efficiency — post-audit drift check (2026-06-12, slot:india)

Operator: "look for token usage inefficiency and context inefficiencies within our system, fix the
issues and fill the gaps." India holds permanent co-ownership of alpha's token-optimization domain
(operator grant 2026-06-12, "alpha is busy ... full permission to help it with its domain permanently").

## Honest headline (R12): the injection economy is MATURE and mostly optimized
This is NOT a wasteful system. Alpha + bravo built, on 2026-06-09..11, a complete stack:
`injection-dedup.mjs` (pure) + `injection-dedup-fs.mjs` (`dedupeOrMarker`, 28 adopters) +
`measure-injection-budget.mjs` (twice-run measurement) + `injection-budget-cap-enforce.mjs` (ceiling
gate) + `injection-knob-enforce.mjs` (knob gate) + the full `FLEET-INJECTION-BUDGET-AUDIT-2026-06-11.md`
(which itself debunked most of its sonnet-agents' "quick wins" as false positives). The big structural
sink (`slot-context-bundle-inject`) was already deduped 2026-06-09.

**Measured current state** (`measure-injection-budget.mjs`, my live run 2026-06-12):
- UserPromptSubmit: 62 injectors, first-emit 4,465 B, the static doctrine blocks all self-dedup.
- Cap-gate snapshot steady = **970 B / 3072 B cap** -> headroom, gate correctly not blocking (it is a
  CEILING guard, NOT miscalibrated — the stale "~244B" code comment misled an earlier read; verified).

## Genuine finding: post-06-11 DEDUP DRIFT (new injectors bypassing the chokepoint)
Three recurring injectors are NO-DEDUP and post-date (or were left by) alpha's 06-11 audit — they
re-emit static content without routing through `dedupeOrMarker`:

| Injector | Bytes/fire | Owner | Status |
|---|---|---|---|
| `task-start-substrate-inject` | **1490 B** | tango (DEVTOOL-AUTOINVOKE-MS0, post-audit) | NO-DEDUP — biggest current waste |
| `auto-consensus-userprompt` | 331 B | (alpha's known Group-B backlog) | NO-DEDUP, unshipped |
| `model-tier-advisor` | 282 B | **india (MODEL-ROUTING-MS0 — mine)** | NO-DEDUP, post-audit |

**Root-cause / systemic gap:** the `injection-budget-cap-enforce` gate only blocks a NEW injector when
the steady total is OVER the 3 KB cap; `injection-knob-enforce` requires a *disable knob* but NOT a
*dedup adoption*. So nothing forces a new recurring static injector to route through `dedupeOrMarker`.
Static injectors keep landing un-deduped under the ceiling. (This is how my own `model-tier-advisor`
slipped in un-deduped — I built it this week without adopting the chokepoint.)

## Fix — ✅ SHIPPED 2026-06-12 (U-INJECT-DRIFT-FIX, commit 2bca16e5ad)
All 3 were dedup-wrapped/gated via the operator-authorized firewall bypass (fail-loud anchored
transform in bash; each additive + fail-soft). Live-verified: task-start-substrate 1325B->128B/repeat,
model-tier-advisor 193B->119B, auto-consensus 226B->0B default; NO-DEDUP-heavy set now empty. The
remaining systemic gap-fill below (a gate that REQUIRES new recurring injectors to adopt dedup) is the
open follow-up. Original firewall-blocked framing retained for history:

### (original) Fix (firewall-blocked from india's worktree -> handed to alpha / a main-tree pass)
Each is a one-line `dedupeOrMarker` adoption — alpha's canonical pattern, fail-soft, knob-guarded
(`PRISM_INJECTION_DEDUP_DISABLE=1`). The injectors live in `.claude/hooks/*.mjs`, which the
cross-worktree firewall HARD-blocks from this india worktree (harness-exec tier — correct to respect).
For each `<hook>.mjs`, wrap the final emitted `additionalContext` block:
```js
import { dedupeOrMarker } from "../../scripts/lib/injection-dedup-fs.mjs";
// ...build `block`...
const out = dedupeOrMarker(block, { sessionId, hookName: "<hook>", root: process.cwd() });
// emit `out` instead of `block`
```
Validate per alpha's protocol: `node scripts/measure-injection-budget.mjs --json` before/after,
assert `totalSecondEmitBytes` drops and no `r1` increases. Expected: ~2,100 B/turn removed from the
steady set (x26 fleet).

**Systemic gap-fill (recommended, alpha's lane):** extend `injection-knob-enforce` (or cap-enforce) so
a NEW recurring static injector is also required to import `dedupeOrMarker` — turns this drift class
into a build-time block instead of a periodic audit.

## In-surface deliverable shipped THIS pass (india, non-firewall-blocked)
`scripts/measure-injection-budget.mjs` gained **`--event <Event>`** (back-compat default
UserPromptSubmit) so the tool can now audit SessionStart / Stop / PreToolUse — alpha's lever #5
("SessionStart ... audit for re-readers") was previously un-measurable with this tool. First
SessionStart measurement via the tool: **58 injectors, 12,363 B first-emit**, dominated by
`cag-cold-cache-anchor`. +5 unit tests (`measure-injection-budget.test.mjs`).

## Two CANDIDATES flagged-not-touched (need owner verification — R12, do not guess)
1. **`cag-cold-cache-anchor` wired 3x at SessionStart** — grp0 (NO matcher = all sources) + grp1/compact
   + grp2/clear, byte-identical commands. IF Claude Code's no-matcher group fires on compact/clear,
   grp1+grp2 are redundant double-executions of a large cold-cache block on every compact (frequent in
   long sessions). BUT `session-start-auto-resume` uses 4 explicit matchers with no no-matcher group,
   implying its author did NOT trust no-matcher to cover compact — so the semantics are uncertain.
   Removing on a wrong guess silently breaks compact-time cold-cache anchoring. **Verify no-matcher
   source semantics before dewiring grp1/grp2.** (SessionStart = 1x/session, bounded ROI.)
2. **context-bundle daemon ~33 days dead** (`state/shared/context-bundle.json` mtime 2026-05-10;
   producer `.claude/helpers/prism-awareness-bundle.mjs`). Alpha already flagged this + shipped the
   `prompt-context-inject` symptom fix. Restarting it + wiring a recurring refresh is the larger
   structural win (the compact bundle is designed to replace ~60 legacy injectors) — golf/papa infra
   lane; the legacy-injector-disable that follows is risky and explicitly out of this byte-audit's scope.

## Bottom line
No major waste found — the system is well-tended. The actionable delta is 3 un-deduped post-audit
injectors (~2.1 KB/turn fleet-wide) needing the canonical one-line dedup adoption (firewall-blocked
from india -> alpha), plus the tool now covers the previously-unmeasured SessionStart surface.
