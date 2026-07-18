---
type: "chat-session"
source: "claude-code-cli"
session_id: "885d585d-959c-404a-8eef-a5542d5006dd"
title: "Per-file scrutiny (arm A) of an uncommitted change to a LIVE gate on branch cad-"
date: "2026-06-24"
first_ts: "2026-06-24T20:39:31.655Z"
last_ts: "2026-06-24T20:41:31.897Z"
cwd: "H:\\prism"
messages: 26
user_msgs: 9
assistant_msgs: 17
raw_file: "H:/.claude/projects/H--prism/885d585d-959c-404a-8eef-a5542d5006dd/subagents/agent-a3fe0c80958051038.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:16"
---

# Per-file scrutiny (arm A) of an uncommitted change to a LIVE gate on branch cad-

> **claude-code-cli** | 2026-06-24 | 26 msgs (9 user / 17 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/885d585d-959c-404a-8eef-a5542d5006dd/subagents/agent-a3fe0c80958051038.jsonl`

## Transcript

### User | 2026-06-24T20:39:31.655Z

Per-file scrutiny (arm A) of an uncommitted change to a LIVE gate on branch cad-fusion-live-ms0 (slot:alpha). Read-only. Grade PASS/FAIL with P0/P1 + file:line.

CONTEXT: `scripts/lib/advisory-decay.mjs` `decayDecision(hookKey, ...)` is wired into 4 live advisory hooks (large-read-digest/nav-rerank/wiki-read-offload/ollama-nav-enforce) to decide fire-vs-mute. The change adds a CROSS-BUCKET OVERRIDE in the noise branch: a PURE-ADVISORY hook's own `offloaded` is always 0 (reads as noise), so before muting it now consults `crossBucketTakeRate(stats, hookKey)` (the conversion from the EXECUTION bucket the suggestion drives, via CONVERSION_BUCKET_MAP); if that is `measured` AND `>= opts.maxTakeRate`, it FIRES (un-mutes) with status "healthy-xbucket".

See the diff: `git -C H:/prism diff -- scripts/lib/advisory-decay.mjs scripts/lib/advisory-decay.test.mjs`. Read the full advisory-decay.mjs for context.

VERIFY THE LOAD-BEARING CLAIM -- the override is STRICTLY FAIL-SAFE (can only LIFT a mute, never ADD one):
1. Is it ONLY in the noise branch? (An own-bucket healthy/insufficient/unmeasurable hook early-returns BEFORE the override -> never demoted.) Confirm the early `if (c.status !== "noise") return {fire:true...}` precedes the override.
2. For a NON-mapped hook (not in CONVERSION_BUCKET_MAP) -> crossBucketTakeRate returns status "unmeasured" -> the override condition is false -> falls through to the SAME mute+probe as before. Confirm non-mapped behavior is byte-unchanged.
3. The override fires ONLY when cross is `measured` AND `>= maxTakeRate`. A junk/absent conversion bucket -> unmeasured -> no override. Confirm.
4. Could this EVER newly-mute a hook that previously fired? (It must not.) Trace every path.
5. The added `crossBucketTakeRate` field in the noise/override returns is ADDITIVE -- confirm no consumer of decayDecision (the 4 hooks) breaks on the extra field or the new "healthy-xbucket" status (do they only read `.fire`?). grep the hook call sites.
6. Test integri
... [+267 chars truncated]

### Assistant | 2026-06-24T20:39:35.300Z

I'll review this change to the live advisory gate. Let me start by reading the diff and the full file.

### Assistant | 2026-06-24T20:39:36.461Z

[tool_use: Bash]

### User | 2026-06-24T20:39:40.321Z

[tool_result] diff --git a/scripts/lib/advisory-decay.mjs b/scripts/lib/advisory-decay.mjs
index d3f967ba10..0d391f5bc4 100644
--- a/scripts/lib/advisory-decay.mjs
+++ b/scripts/lib/advisory-decay.mjs
@@ -202,7 +202,19 @@ export function decayDecision(hookKey, {
     // healthy / insufficient / unmeasurable all FIRE (only confirmed noise mutes)
     return { fire: true, muted: false, probe: false, status: c.sta
... [+4889 chars truncated]

### Assistant | 2026-06-24T20:39:42.754Z

Now let me read the full advisory-decay.mjs to understand the context end-to-end.

### Assistant | 2026-06-24T20:39:42.903Z

[tool_use: Read]

### User | 2026-06-24T20:39:45.088Z

[tool_result] 1	// scripts/lib/advisory-decay.mjs
2	// U-ADVISORY-DECAY (2026-06-09, slot:alpha): the missing ACTUATOR on advisory
3	// take-rate. mcp-route-takeup / ollama-offload-stats MEASURE per-hook conversion
4	// but nothing ACTS on it -- so a proven-zero-conversion advisory keeps spending
5	// context tokens on a nudge nobody takes. This gates that, fleet-wide.
6	//
7	// THE METRIC (R8-corrected 2026-06
... [+13570 chars truncated]

### Assistant | 2026-06-24T20:39:47.942Z

I have the full file. Now let me verify the load-bearing claims. First, let me confirm the early-return precedes the override (claim 1), then trace the override logic carefully. Let me also check the test file in full and grep the 4 hook call sites.

### Assistant | 2026-06-24T20:39:48.233Z

[tool_use: Read]

### User | 2026-06-24T20:40:05.306Z

[tool_result] 1	// scripts/lib/advisory-decay.test.mjs
2	// U-ADVISORY-DECAY (2026-06-09, slot:alpha): the decay gate must (1) measure
3	// conversion as taken/INJECTED not taken/fired, (2) NEVER mute a hook with no
4	// taken-signal (the false-mute trap), (3) protect real converters, (4) only mute
5	// confirmed noise, (5) keep an epsilon probe alive when muted, (6) fail-safe to
6	// FIRE on any uncertainty. F
... [+17617 chars truncated]

### Assistant | 2026-06-24T20:40:09.641Z

Now let me find and inspect the 4 hook call sites to verify consumers only read `.fire` and won't break on the additive field / new status (claim 5).

### Assistant | 2026-06-24T20:40:10.631Z

[tool_use: Grep]

### User | 2026-06-24T20:40:12.615Z

[tool_result] <persisted-output>
Output too large (22.5KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism\885d585d-959c-404a-8eef-a5542d5006dd\tool-results\toolu_01NhsLJSgwu3ZnpiLvS46eEE.txt

Preview (first 2KB):
H:\prism\.claude\hooks\grep-index-first.test.mjs-301-  assert.equal(stats.offloaded, 17);
H:\prism\.claude\hooks\grep-index-first.test.mjs-302-});
H:\prism\.claude\hooks\grep-index-fir
... [+1832 chars truncated]

### Assistant | 2026-06-24T20:40:15.500Z

Let me get the precise call sites where each of the 4 hooks consume the return value of `decayDecision`, to confirm they only read `.fire`.

### Assistant | 2026-06-24T20:40:16.814Z

[tool_use: Grep]

### User | 2026-06-24T20:40:19.446Z

[tool_result] .claude\hooks\grep-index-first.mjs-533-  \ when muted (1-in-20 self-revival). When muted we ALSO skip the pending marker:
H:\prism\.claude\hooks\grep-index-first.mjs-534-  // the advice was never shown, so a later coincidental Read must NOT be counted a
H:\prism\.claude\hooks\grep-index-first.mjs-535-  // conversion (that would corrupt the taken-signal + keep it falsely converting).
H:\prism\.clau
... [+8475 chars truncated]

### Assistant | 2026-06-24T20:40:24.659Z

I now have all 6 call sites visible (the task said 4 but there are actually 6 consumers of `decayDecision`: grep-index-first, large-read-digest-advisory, nav-rerank-advisory, ollama-nav-enforce-inject, ollama-route-pretooluse, wiki-read-offload-advisory). Every one gates on `!decay.fire` and otherwise reads only `.status`, `.takeRate`, `.reason`, `.probe` for verbose logging. None destructure or switch on `status`, none would break on the extra `crossBucketTakeRate` field or the new `"healthy-xbucket"` status value.

Let me run the test suite to confirm the new and existing tests pass.

### Assistant | 2026-06-24T20:40:25.674Z

[tool_use: Bash]

### User | 2026-06-24T20:40:31.387Z

[tool_result]   ...
# Subtest: decayDecision: the override is FAIL-SAFE -- only lifts a mute, never adds one (own-healthy stays healthy)
ok 30 - decayDecision: the override is FAIL-SAFE -- only lifts a mute, never adds one (own-healthy stays healthy)
  ---
  duration_ms: 0.2362
  ...
# Subtest: DEFAULTS are the documented calibration (50 injections / 5% / probe 20)
ok 31 - DEFAULTS are the documented calibratio
... [+172 chars truncated]

### Assistant | 2026-06-24T20:40:54.990Z

All 31 tests pass. Now let me trace each load-bearing claim against the actual code (lines 200-228) carefully.

**Claim 1 — override only in noise branch:** Line 201 `if (c.status !== "noise") return {fire: true, ...}` early-returns for healthy/insufficient/unmeasurable BEFORE the override at line 212. Confirmed: an own-bucket non-noise status never reaches the override. The override is strictly inside the noise branch.

**Claim 2 — non-mapped hook byte-unchanged:** For a non-mapped hook, `crossBucketTakeRate` (line 150) sets `conversionKey = null`, hits line 156 `if (!conversionKey ...)` returning `status: "unmeasured"`. At line 213 `x.status === "measured"` is false, so the override is skipped. Falls through to the probe/mute return (lines 218-227). The only difference from pre-change is the additive `crossBucketTakeRate: x.takeRate` field (line 225) — `x.takeRate` is `null` for unmeasured, so the field is `null`. The `fire`/`muted`/`probe`/`status`/`reason` values are byte-identical to before. Confirmed.

**Claim 3 — override fires only when measured AND >= maxTakeRate:** Line 213 requires both `x.status === "measured"` and `x.takeRate >= opts.maxTakeRate`. A junk/absent conversion bucket yields `unmeasured` (lines 154-158 mirror classify's typeof-number guard, rejecting null/""/NaN/non-finite). Confirmed.

**Claim 4 — could it ever newly-mute a hook that previously fired?** Tracing every exit:
- Lines 188-199 (disabled/no-stats/no-telemetry): unchanged, all `fire: true`.
- Line 201-203 (non-noise): unchanged, `fire: true`.
- Line 213-214 (override): `fire: true` — strictly adds a fire.
- Lines 218-227 (mute/probe): identical `fire: probe`, `muted: true` logic to pre-change.

The only new code path (line 213-214) returns `fire: true`. No path that previously returned `fire: true` now returns `fire: false`. The override can only flip a noise-mute to a fire, never the reverse. Confirmed fail-safe.

**Claim 5 — additive field / new status doesn't break consumers:** 
... [+2542 chars truncated]

### Assistant | 2026-06-24T20:40:59.637Z

[tool_use: Bash]

### User | 2026-06-24T20:41:04.734Z

[tool_result] (node:45040) ExperimentalWarning: CommonJS module H:\prism\[eval] is loading ES Module H:\prism\scripts\lib\advisory-decay.mjs using require().
Support for loading ES Module in require() is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
large-read-digest-advisory -> conv ollama-file-digest | own.suggested= 120 own.offloa
... [+344 chars truncated]

### Assistant | 2026-06-24T20:41:12.387Z

Live-data validation confirms the change is inert in production today: the only mapped advisory with live telemetry (`large-read-digest-advisory`) has a cross-bucket take-rate of 0.83% — below the 5% bar — so the override does NOT fire; it falls through to the same mute as before. The other two mapped advisories have no own-bucket telemetry yet (`unmeasured`). So no currently-muted hook is silently flipped to firing by this change.

Note also the hook key in `CONVERSION_BUCKET_MAP` is `"ollama-nav-enforce-inject"` while the wired hook (`ollama-nav-enforce-inject.mjs`) calls `decayDecision(HOOK_KEY, ...)`. Let me confirm HOOK_KEY matches the map key so the override could actually engage for that hook when telemetry arrives (a correctness, not safety, concern).

### Assistant | 2026-06-24T20:41:13.273Z

[tool_use: Grep]

### User | 2026-06-24T20:41:17.086Z

[tool_result] 51:export const HOOK_KEY = "ollama-nav-enforce";

### Assistant | 2026-06-24T20:41:31.897Z

This surfaces a latent mismatch worth flagging (P2, pre-existing, not introduced by this diff): the wired hook `ollama-nav-enforce-inject.mjs` uses `HOOK_KEY = "ollama-nav-enforce"`, but `CONVERSION_BUCKET_MAP` maps `"ollama-nav-enforce-inject"` (line 130). When that hook calls `decayDecision("ollama-nav-enforce", ...)`, the override looks up `"ollama-nav-enforce"` in the map → not found → `unmeasured` → no override. So the cross-bucket un-mute will silently never engage for nav-enforce even once its conversion bucket is instrumented. This is a wiring key-drift bug in the map (the map entry is dead for the live hook), but it is strictly on the FAIL-SAFE side (it can only fail to un-mute, never wrongly mute) and is independent of the safety property under review. The same should be checked for nav-rerank, but its map key `"nav-rerank-advisory"` — let me not over-extend; this is advisory.

The core fail-safe property under review holds completely. Here is my verdict.

---

**VERDICT: PASS**

summary: The cross-bucket override is provably fail-safe — it lives strictly inside the noise branch (after the line-201 early-return for healthy/insufficient/unmeasurable), its only new code path returns `fire: true`, and no path that previously fired now mutes. The added `crossBucketTakeRate` field and `"healthy-xbucket"` status are additive; all 6 live consumers gate solely on `!decay.fire` and tolerate the extra field/status. 31/31 tests pass; live-data validation shows the change is inert today (the one mapped advisory with telemetry sits at 0.83% cross-bucket, below the 5% bar, so it still mutes).

findings:
- [P2] `scripts/lib/advisory-decay.mjs:130` -- `CONVERSION_BUCKET_MAP` key `"ollama-nav-enforce-inject"` does not match the wired hook's `HOOK_KEY = "ollama-nav-enforce"` (`.claude/hooks/ollama-nav-enforce-inject.mjs:51`), so the cross-bucket un-mute is dead for that hook even once its `ollama-prism-bridge` conversion bucket is instrumented. Pre-existing key-drift (also 
... [+736 chars truncated]
