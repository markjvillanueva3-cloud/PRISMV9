---
name: feedback_low_take_rate_nudges_are_net_negative
description: "Token-optimization principle: an advisory nudge/inject hook that fires often but is acted on <5% of the time is NET-NEGATIVE (it injects context tokens fleet-wide for advice the model ignores). Measure take-rate, then suppress the worst offenders reversibly — keep telemetry counting the match so the need can be re-measured."
type: feedback
source: prism-memory
synced: 2026-06-27T20:30:46.433Z
aliases: feedback_low_take_rate_nudges_are_net_negative
---


# Low-take-rate advisory nudges are a net token COST, not a saving

**Principle (token-optimization):** an advisory inject/nudge hook is only worth its context cost if the model *acts* on it often enough. A classifier/nudge that fires N times and is taken <5% of the time is **net-negative** — every fire injects advisory tokens into every chat's context fleet-wide, and the advice is ignored. The nudge meant to *save* tokens is *spending* them.

**Why:** PRISM's `mcp-route-suggest` is the worked example. Its `mcp-route-takerate-audit` (`node scripts/audit-mcp-route-takerate.mjs`) showed `backendAuditChain` = **1682 fires / 1 take / 0.1% take-rate / 73.3% of ALL route-suggest fires** — the dominant noise generator. ~3 of every 4 route nudges were this one classifier, acted on 0.1% of the time. The audit's own recommendation legend: **suppress** = "≥30% of fleet fires AND <5% take-rate." Same pattern likely lurks in other fleet inject hooks (there are many advisory injectors on every SessionStart/UserPromptSubmit).

**How to apply:**
- **Measure before trusting a nudge.** A take-rate audit (fires vs takes, per-classifier) tells you which injects pay for themselves. <5% take-rate + high fire-share → suppress candidate.
- **Suppress reversibly, keep the telemetry.** Drop the message from OUTPUT but record the *match* (count the fire) BEFORE the suppression filter — so the audit can still measure the would-be need and you can revisit if a future change (e.g. a snippet injector that makes the nudge actionable) raises the take-rate. Gate behind a knob (e.g. `PRISM_MCP_ROUTE_SUPPRESS_LOW_TAKE=0` restores) per [[feedback_never_delete_only_disable]].
- **R7 when the code disagrees with the data.** If an in-code comment says "keep it, the real fix is a v2 injector" but the audit data says "suppress," act on the data-backed recent recommendation now (suppress interim) and leave the comprehensive fix (injector) queued — both coexist; flip the knob when the injector lands.
- The complementary positive: nudges that DO get taken (rtk-prefix, dedup) are real savings — this is about pruning the dead weight, not all nudges.

First action: `U-MCP-ROUTE-SUPPRESS-LOW-TAKE` (slot:alpha commit `26ff54ae02`) — a self-verifying patcher + patch-sibling to suppress `backendAuditChain`, ready for golf to apply to the live `mcp-route-suggest.mjs`.

Related: [[feedback_patch_sibling_queue_strategy]] · [[feedback_never_delete_only_disable]].
