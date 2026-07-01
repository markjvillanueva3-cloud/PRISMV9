---
type: "chat-session"
source: "claude-code-cli"
session_id: "a459feb7-cb58-4e25-b789-c3070eedb10b"
title: "3-of-3 scrutiny arm A (HOLISTIC). Review commit 2e3b86a242 on branch cad-fusion-"
date: "2026-06-11"
first_ts: "2026-06-11T03:05:24.745Z"
last_ts: "2026-06-11T03:12:51.736Z"
cwd: "H:\\prism-slot-alpha"
messages: 64
user_msgs: 22
assistant_msgs: 42
raw_file: "H:/.claude/projects/H--prism-slot-alpha/a459feb7-cb58-4e25-b789-c3070eedb10b/subagents/agent-adc0ae73eefe5be93.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:35"
---

# 3-of-3 scrutiny arm A (HOLISTIC). Review commit 2e3b86a242 on branch cad-fusion-

> **claude-code-cli** | 2026-06-11 | 64 msgs (22 user / 42 assistant) | cwd: H:\prism-slot-alpha
> Raw: `H:/.claude/projects/H--prism-slot-alpha/a459feb7-cb58-4e25-b789-c3070eedb10b/subagents/agent-adc0ae73eefe5be93.jsonl`

## Transcript

### User | 2026-06-11T03:05:24.745Z

3-of-3 scrutiny arm A (HOLISTIC). Review commit 2e3b86a242 on branch cad-fusion-live-ms0 in repo H:/prism. Run: `git -C H:/prism show 2e3b86a242 --stat` then read the full diff of the 3 files.

Unit U-ALPHA-AWARENESS-AUTOREFRESH: an alpha-only SessionStart hook that injects a "token-optimization domain awareness" surface now self-heals it — when `state/shared/TOKEN-OPTIMIZATION-AWARENESS.md` is absent/older-than-staleHrs, it regenerates IN-PROCESS by importing the generator's pure exports (gatherInputs/computeAwareness/renderMarkdown) before reading. Also ports the generator `scripts/token-awareness-snapshot.mjs` into the live tree (it had been built only on slot/alpha and never integrated). Knob PRISM_TOKEN_AWARENESS_NO_AUTOREGEN; fail-soft R12; alpha-gated; CLI-entry guard added.

Files: H:/prism/.claude/hooks/alpha-token-domain-awareness-inject.mjs ; H:/prism/scripts/token-awareness-snapshot.mjs ; H:/prism/.claude/hooks/__tests__/alpha-token-domain-awareness-inject.test.mjs

Assess overall correctness, that the fix actually solves the stated root cause, fail-soft integrity, alpha-gate ordering (regen must run only after the gate), and any regression to the existing read/fallback/inject behavior. Grade PASS or FAIL with concrete P0/P1 (file:line). Run the test suite (`node --test <test file>`) to confirm green.

### Assistant | 2026-06-11T03:05:28.800Z

I'll review commit 2e3b86a242 as scrutiny arm A (holistic). Let me start by examining the commit and its files.

### Assistant | 2026-06-11T03:05:30.451Z

[tool_use: Bash]

### User | 2026-06-11T03:05:39.358Z

[tool_result] commit 2e3b86a2422a498e9c3ef100bbe0a8582a51970a
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 10 22:02:12 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ALPHA-SYNERGY]/U-ALPHA-AWARENESS-AUTOREFRESH (slot:alpha): self-maintaining token-optimization domain awareness. The alpha domain-awareness inject hook went ~300h stale because it only READ the surface and nothing r
... [+1043 chars truncated]

### Assistant | 2026-06-11T03:05:45.323Z

All three files are added (845 insertions). Let me read the full diff of each file.

### Assistant | 2026-06-11T03:05:46.078Z

[tool_use: Bash]

### User | 2026-06-11T03:05:53.368Z

[tool_result] commit 2e3b86a2422a498e9c3ef100bbe0a8582a51970a
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 10 22:02:12 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ALPHA-SYNERGY]/U-ALPHA-AWARENESS-AUTOREFRESH (slot:alpha): self-maintaining token-optimization domain awareness. The alpha domain-awareness inject hook went ~300h stale because it only READ the surface and nothing r
... [+8771 chars truncated]

### Assistant | 2026-06-11T03:05:55.811Z

Now let me read the generator and the test file.

### Assistant | 2026-06-11T03:05:56.618Z

[tool_use: Bash]

### User | 2026-06-11T03:06:09.409Z

[tool_result] commit 2e3b86a2422a498e9c3ef100bbe0a8582a51970a
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Wed Jun 10 22:02:12 2026 -0500

    [MAIN] [BOOTSTRAP-SLOT-ENFORCE] [ALPHA-SYNERGY]/U-ALPHA-AWARENESS-AUTOREFRESH (slot:alpha): self-maintaining token-optimization domain awareness. The alpha domain-awareness inject hook went ~300h stale because it only READ the surface and nothing r
... [+10338 chars truncated]

### Assistant | 2026-06-11T03:06:12.329Z

[tool_use: Bash]

### User | 2026-06-11T03:06:18.082Z

[tool_result] +    "1. Obsidian brain",
+    cN >= MIN_ALPHA_MEMORIES ? OK : cN > 0 ? PARTIAL : MISS,
+    `${cN} C: + ${hN} H:-mirror alpha memories`,
+    cN >= MIN_ALPHA_MEMORIES ? "" : "write more `*_alpha_*.md` (target ≥10)",
+  );
+
+  // Leg 2 — PRISM OS (token domain registered — not deterministically introspectable here)
+  add(
+    "2. PRISM OS",
+    UNK,
+    "documented (prism_operating_system)",

... [+8532 chars truncated]

### Assistant | 2026-06-11T03:06:20.558Z

Now the test file.

### Assistant | 2026-06-11T03:06:21.884Z

[tool_use: Bash]

### User | 2026-06-11T03:06:30.716Z

[tool_result] new file mode 100644
index 0000000000..1c2582bb57
--- /dev/null
+++ b/.claude/hooks/__tests__/alpha-token-domain-awareness-inject.test.mjs
@@ -0,0 +1,161 @@
+// Tests for alpha-token-domain-awareness-inject.mjs (U-ALPHA-AWARENESS-AUTOREFRESH).
+// Unit: decideRegen (pure). Integration: real subprocess oracle proving refresh-on-read
+// (the "hermetic fakes don't prove wiring" regression-log mandat
... [+6656 chars truncated]

### Assistant | 2026-06-11T03:06:33.316Z

I have read all three files in full. Now let me run the test suite to confirm green, and check a few correctness concerns.

### Assistant | 2026-06-11T03:06:34.241Z

[tool_use: Bash]

### User | 2026-06-11T03:06:41.387Z

[tool_result]   ...
# Subtest: integration: PRISM_TOKEN_AWARENESS_NO_AUTOREGEN=1 disables regen
ok 9 - integration: PRISM_TOKEN_AWARENESS_NO_AUTOREGEN=1 disables regen
  ---
  duration_ms: 44.6585
  ...
# Subtest: integration: non-alpha slot -> silent no-op, never regenerates
ok 10 - integration: non-alpha slot -> silent no-op, never regenerates
  ---
  duration_ms: 44.9253
  ...
# Subtest: integration: generat
... [+523 chars truncated]

### Assistant | 2026-06-11T03:06:45.309Z

12/12 pass. Now let me verify the key correctness concerns: alpha-gate ordering (regen runs only after the gate), the live wiring state, and whether the fix actually addresses the root cause.

### Assistant | 2026-06-11T03:06:51.921Z

[tool_use: Bash]

### User | 2026-06-11T03:06:57.140Z

[tool_result] === is the hook wired into settings.json? ===
H:/.claude/settings.json:1
C:/Users/wompu/.claude/settings.json:1
=== current live awareness surface mtime/age ===
ls: cannot access 'state/shared/TOKEN-OPTIMIZATION-AWARENESS.md': No such file or directory
ABSENT
=== generator present in live tree? ===
-rwxr-xr-x 1 wompu 197611 17871 Jun 10 21:50 scripts/token-awareness-snapshot.mjs*

### Assistant | 2026-06-11T03:07:00.995Z

The hook is wired (1 occurrence in both settings.json). The generator is now present in the live tree. The surface is currently ABSENT — which is exactly the `!fileExists -> regen` path. Let me verify the self-heal actually works end-to-end by running the hook against the real tree as the alpha slot, and confirm the generator runs cleanly.

### Assistant | 2026-06-11T03:07:02.045Z

[tool_use: Bash]

### User | 2026-06-11T03:07:41.004Z

[tool_result] === run generator standalone (real data) ===
# TOKEN-OPTIMIZATION-AWARENESS — slot:alpha custom domain surface

> Live 11-leg PSN synergy audit for the token-optimization galaxy. Regenerate: `node scripts/token-awareness-snapshot.mjs`. Auto-surfaced for slot:alpha by `alpha-token-domain-awareness-inject.mjs`.

**Generated:** 2026-06-11T03:07:18.006Z
**Verdict:** 🟢 **SYNERGIZED** — 7🟢 / 2◐ / 0○ / 2
... [+1065 chars truncated]

### Assistant | 2026-06-11T03:07:44.489Z

Generator runs clean against real data (exit 0, SYNERGIZED verdict, real counts: 36 C: memories, 20 wiki files, 10 engines). Now the critical end-to-end test: run the actual hook as the alpha slot against the real tree to confirm the self-heal writes the surface and injects the headline.

### Assistant | 2026-06-11T03:07:47.391Z

[tool_use: Bash]

### User | 2026-06-11T03:08:19.283Z

[tool_result] === run the HOOK as alpha (PRISM_BOOT_SLOT=alpha), surface currently ABSENT ===
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"## 🪙 Token-optimization domain awareness (slot:alpha custom surface)\n\n**Verdict:** 🟢 **SYNERGIZED** — 7🟢 / 2◐ / 0○ / 2⚠ across 11 PSN legs\n**Galaxy files:** ✓ 4/4 (CLAUDE.md, MEMORY.md, PATHS.md, TOOLBELT.md)\n**Ollama offload ratio:** 9.0% (
... [+427 chars truncated]

### Assistant | 2026-06-11T03:08:24.229Z

This is a significant finding. The hook **injected the headline correctly** (extracting verdict, galaxy, offload, PSN, legs-needing-attention) — but the surface file is **STILL ABSENT** after the run. The self-heal did NOT persist the file to disk in the real-tree run, even though the headline shows freshly-computed data.

Let me investigate why. The headline shows real data, so `maybeRegenerate` clearly produced markdown in-memory and `extractHeadline` ran on it... but wait, if the file is absent, `extractHeadline` should not have run. Let me trace this carefully.

### Assistant | 2026-06-11T03:08:28.312Z

[tool_use: Bash]

### User | 2026-06-11T03:08:37.145Z

[tool_result] === which root did the hook resolve? ROOT_CANDIDATES = [PRISM_ROOT, H:/prism-slot-alpha, H:/prism] ===
H:/prism-slot-alpha/state/shared/
--> H:/prism-slot-alpha EXISTS and wins resolveRoot()

=== so the hook wrote to the slot-alpha worktree, NOT H:/prism. Check there: ===
-rw-r--r-- 1 wompu 197611 2343 21:54 H:/prism-slot-alpha/state/shared/TOKEN-OPTIMIZATION-AWARENESS.md

=== is the generator pre
... [+139 chars truncated]

### Assistant | 2026-06-11T03:08:42.904Z

Now I understand the full picture. The `resolveRoot()` order is `[PRISM_ROOT, "H:/prism-slot-alpha", "H:/prism"]`. On this machine the `H:/prism-slot-alpha` worktree exists, so the hook resolves root to the **slot-alpha worktree**, NOT the integration tree `H:/prism`. The self-heal **did work correctly** — it wrote the surface into `H:/prism-slot-alpha/state/shared/` (file present, mtime 21:54, 2343 bytes).

So my earlier "STILL ABSENT" was checking the wrong tree (`H:/prism`). The hook is behaving as designed: it resolves to the slot-alpha worktree first. Let me verify this is consistent and assess whether this is a problem or intended behavior, and confirm the freshly-written file is well-formed.

### Assistant | 2026-06-11T03:08:47.210Z

[tool_use: Bash]

### User | 2026-06-11T03:08:58.056Z

[tool_result] === content of the self-healed surface in slot-alpha ===
# TOKEN-OPTIMIZATION-AWARENESS — slot:alpha custom domain surface

> Live 11-leg PSN synergy audit for the token-optimization galaxy. Regenerate: `node scripts/token-awareness-snapshot.mjs`. Auto-surfaced for slot:alpha by `alpha-token-domain-awareness-inject.mjs`.

**Generated:** 2026-06-11T02:54:33.581Z
**Verdict:** 🟢 **SYNERGIZED** — 7🟢 /
... [+285 chars truncated]

### Assistant | 2026-06-11T03:09:02.371Z

Self-heal works end-to-end and the no-churn invariant holds (mtime unchanged on re-run). The earlier "ABSENT" was a red herring on my part — I checked `H:/prism` but the hook correctly resolves to `H:/prism-slot-alpha` first.

Now let me examine the alpha-gate ordering concern carefully — the prompt specifically asks whether "regen runs only after the gate." Let me trace `main()` flow precisely.

### Assistant | 2026-06-11T03:09:03.756Z

[tool_use: Bash]

### User | 2026-06-11T03:09:08.417Z

[tool_result]   if (psn) out.push(psn.replace(/^-\s*/, "").trim());
  if (attn.length) {
    out.push("");
    out.push("**Legs needing attention:** " + attn.join(" · "));
  }
  if (ageHrs != null && ageHrs > staleHrs) {
    out.push("");
    out.push(`⚠ snapshot ${ageHrs.toFixed(0)}h old — regenerate: \`node scripts/token-awareness-snapshot.mjs\``);
  }
  out.push("");
  out.push(
    "_Full: `state/shared/TOK
... [+1146 chars truncated]

### Assistant | 2026-06-11T03:09:14.105Z

Alpha-gate ordering is **correct and load-bearing**: the `slot.toLowerCase() !== "alpha"` gate executes `process.exit(0)` BEFORE `maybeRegenerate` is ever called. A non-alpha slot can never trigger regen — this is the exact behavior the test "non-alpha slot -> silent no-op, never regenerates" verifies, and which I confirmed passes. This is the most important safety property for an in-process side-effecting hook running on every SessionStart fleet-wide, and it's correct.

Now let me check a couple of remaining concerns: (1) the `decideRegen` disabled-but-absent edge case, (2) whether `extractHeadline` could throw on malformed input (the read path catch-all), and (3) the stale-age regen path actually overwrites.

### Assistant | 2026-06-11T03:09:19.077Z

[tool_use: Bash]

### User | 2026-06-11T03:09:32.840Z

[tool_result] === EDGE 1: disabled=true + absent file. decideRegen returns false (read-only). Then main() falls to !existsSync -> fallback block. Verify NO crash, fallback emitted ===
{"hookSpecificOutput":{"hookEventName":"SessionStart","additionalContext":"## 🪙 Token-optimization domain awareness (slot:alpha)\n\nSnapshot not yet generated. Run: `node scripts/token-awareness-sn
file written? NO (correct: knob 
... [+8 chars truncated]

### Assistant | 2026-06-11T03:09:37.485Z

The `rm -rf "$T"` was on a `mktemp -d` temp directory — safe and contained, already executed. Edge case confirmed: disabled knob + absent file correctly yields the fallback block with no write.

Let me check the stale-overwrite path and one potential P1 concern: when the generator's pure exports throw at *call time* (not import time), does maybeRegenerate stay fail-soft?

### Assistant | 2026-06-11T03:09:47.249Z

[tool_use: Bash]

### User | 2026-06-11T03:09:53.180Z

[tool_result] === EDGE 2: stale file (age > staleHrs) gets overwritten by regen ===
STALE NOT regenerated: BUG

=== EDGE 3: generator exports present but computeAwareness THROWS at call time ===
exit=0 ; file written? NO (fail-soft correct)
fallback block emitted: CORRECT (R12 fail-soft)

### Assistant | 2026-06-11T03:09:56.825Z

EDGE 2 reported "STALE NOT regenerated: BUG" — I need to investigate whether this is a real defect or a test-harness artifact. EDGE 3 (call-time throw) is correctly fail-soft. The `rm -rf` was again on mktemp dirs — safe.

Let me dig into the stale path. The concern: did `touch -d "100 hours ago"` actually set mtime, and did regen fire?

### Assistant | 2026-06-11T03:10:03.423Z

[tool_use: Bash]

### User | 2026-06-11T03:10:19.517Z

[tool_result] mtime set to: 2026-06-06 18:10:15.316275700 -0500
now:          2026-06-10 22:10:15
computed ageHrs by node statSync: 100.0000535345459
--- run hook ---
post-run content:
**Verdict:** STALE-OLD

### Assistant | 2026-06-11T03:10:24.817Z

This confirms a real behavioral finding worth scrutiny. `ageHrs = 100` and `staleHrs = 24`, so `decideRegen` should return `true` (100 > 24) and regen should overwrite "STALE-OLD" with "REGEN-OK". But the file still says "STALE-OLD" — regen did NOT fire.

The difference from EDGE 2 vs the passing integration tests: the integration test's `setupRoot` with `withAwareness:false` (absent) regenerates fine. The stale case here is not in the test suite. Let me find the actual cause — is it the FAKE generator missing an export, or is `decideRegen`/`maybeRegenerate` genuinely not firing on stale?

### Assistant | 2026-06-11T03:10:31.486Z

[tool_use: Bash]

### User | 2026-06-11T03:10:47.240Z

[tool_result] decideRegen(stale)= true
--- now check: is STALE-HRS env maybe overriding? print effective staleHrs default ---
PRISM_TOKEN_AWARENESS_STALE_HRS=(unset, default 24)
PRISM_TOKEN_AWARENESS_NO_AUTOREGEN=(unset)

### Assistant | 2026-06-11T03:10:52.992Z

`decideRegen({fileExists:true, ageHrs:100, staleHrs:24, disabled:false})` returns `true` — so the pure decision is correct. The problem is therefore in `maybeRegenerate` between the decision and the write. Let me look very carefully at the `maybeRegenerate` env-disabled line and root resolution. There's a subtle ordering issue: `maybeRegenerate` reads `process.env.PRISM_TOKEN_AWARENESS_NO_AUTOREGEN` itself, but that's unset here. 

Wait — the key: in my harness I set `PRISM_ROOT="$T"` but the hook's `resolveRoot()` checks `existsSync(join(r, "state/shared"))`. `$T/state/shared` exists, so root=`$T`. Good. Let me add a direct instrumented trace inside a copy to see where maybeRegenerate bails.

### Assistant | 2026-06-11T03:11:02.514Z

[tool_use: Bash]

### User | 2026-06-11T03:11:07.174Z

[tool_result] fileExists= true ageHrs= 100.00003175286187
genPath exists= true
file:///C:/Users/wompu/AppData/Local/Temp/tmp.D0ww7vFXiR/scripts/token-awareness-snapshot.mjs:3
export function renderMarkdown(){return"# REGEN-OK
                                       ^^^^^^^^^^^

SyntaxError: Invalid or unexpected token
    at compileSourceTextModule (node:internal/modules/esm/utils:338:16)
    at ModuleLoad
... [+301 chars truncated]

### Assistant | 2026-06-11T03:11:12.841Z

Found it. The "BUG" in EDGE 2 was a **flaw in my test harness, not the code**: my `printf` wrote a literal newline inside the JS string `"# REGEN-OK\n..."` because `printf` interpreted the `\\n` → actual newline, producing an invalid module (`SyntaxError: Invalid or unexpected token`). So `maybeRegenerate`'s `import()` threw → fail-soft returned false → file left as STALE-OLD. **That is exactly the correct R12 fail-soft behavior** when the generator is broken — it does NOT clobber the existing surface.

The real test suite uses a properly-escaped `FAKE_GEN` constant. Let me confirm the stale-overwrite path works with a *valid* generator (matching the test's escaping).

### Assistant | 2026-06-11T03:11:18.658Z

[tool_use: Bash]

### User | 2026-06-11T03:11:30.223Z

[tool_result] post-run content of surface:
**Verdict:** STALE-OLD
---
still not regenerated

### Assistant | 2026-06-11T03:11:33.622Z

Now this is genuinely surprising — with a *valid* generator, the stale surface is STILL not regenerated. Let me verify the generator file is actually valid this time and trace the full hook path including root resolution (the hook may be resolving to `H:/prism-slot-alpha` instead of `$T` if PRISM_ROOT handling differs).

### Assistant | 2026-06-11T03:11:42.486Z

[tool_use: Bash]

### User | 2026-06-11T03:11:48.497Z

[tool_result] === generator valid? ===
C:\Users\wompu\AppData\Local\Temp\tmp.uCPuqbVuM4\scripts\token-awareness-snapshot.mjs:3
export function renderMarkdown(){return "# REGEN-OK
                                        ^^^^^^^^^^^

SyntaxError: Invalid or unexpected token
    at checkSyntax (node:internal/main/check_syntax:74:5)

Node.js v22.12.0
=== resolveRoot order: PRISM_ROOT first. But does the hoo
... [+339 chars truncated]

### Assistant | 2026-06-11T03:11:55.307Z

My harness is *still* producing an invalid generator — `node -e` with backtick template + `\\n` is also mangling. The escaping in my reproduction is the problem, not the code. The real test's `FAKE_GEN` uses single-quoted JS string concatenation with `'\\n'` which is correct. The integration test "absent surface -> regenerated" already proves the regen+write path works end-to-end with a valid generator (and I confirmed it live: the real generator wrote to `H:/prism-slot-alpha`).

Let me stop fighting shell escaping and instead reproduce the stale path using the **real** generator (which I already proved valid, exit 0) — copy it into a temp root, make the surface stale, and confirm overwrite.

### Assistant | 2026-06-11T03:12:02.057Z

[tool_use: Bash]

### User | 2026-06-11T03:12:13.251Z

[tool_result] mtime before=1780787530 after=1781147531  CHANGED -> regen fired
still has stale sentinel? NO -> overwritten by real generator
# TOKEN-OPTIMIZATION-AWARENESS — slot:alpha custom domain surface

> Live 11-leg PSN synergy audit for the token-optimization galaxy. Regenerate: `node scripts/token-awareness-snapshot.mjs`. Auto-surfaced for slot:alpha by `alpha-token-domain-awareness-inject.mjs`.

**Gene
... [+102 chars truncated]

### Assistant | 2026-06-11T03:12:18.104Z

Definitive: the **stale-overwrite path works correctly** with the real generator — mtime CHANGED, the stale sentinel was overwritten, and fresh real-data content was written. My earlier "BUG" findings were entirely shell-escaping artifacts in my own reproduction harness; they actually demonstrated the *correct* R12 fail-soft behavior (a broken/unparseable generator never clobbers the existing surface).

I have now verified every concern the prompt raised. Let me do a final consolidated verification: re-run the official test suite once more cleanly, and confirm the commit touches only the 3 stated files.

### Assistant | 2026-06-11T03:12:21.297Z

[tool_use: Bash]

### User | 2026-06-11T03:12:30.557Z

[tool_result] === official test suite (clean) ===
# tests 12
# pass 12
# fail 0

=== commit touches exactly 3 files? ===
 .../alpha-token-domain-awareness-inject.test.mjs   | 161 +++++++
 .../hooks/alpha-token-domain-awareness-inject.mjs  | 205 +++++++++
 scripts/token-awareness-snapshot.mjs               | 479 +++++++++++++++++++++

=== generator --check valid in live tree ===
generator OK
=== hook --check val
... [+14 chars truncated]

### Assistant | 2026-06-11T03:12:51.736Z

All checks pass. I have completed a thorough holistic review with live end-to-end verification. Here is my verdict.

---

## 3-of-3 SCRUTINY — ARM A (HOLISTIC) — VERDICT: **PASS**

**Commit:** `2e3b86a242` · Unit `U-ALPHA-AWARENESS-AUTOREFRESH` · 3 files, 845 insertions (all new)
**Test suite:** `node --test` → **12/12 pass, 0 fail** (re-run clean twice). Both files `node --check` valid.

### Root-cause fix — confirmed genuine
The stated root cause was a read-only inject hook over a surface nothing regenerated (~300h stale) + a generator that lived only on `slot/alpha`, never integrated. The commit addresses **both**: (1) ports `scripts/token-awareness-snapshot.mjs` into the live tree (verified present, `node --check` valid, runs clean against real data → exit 0, real counts 36 C-memories / 20 wiki / 10 engines), and (2) the hook self-heals in-process via the generator's pure exports before reading. This is the correct fix shape, not a workaround.

### Live end-to-end verification (not just unit tests)
- **Wiring:** hook present in both `H:/.claude/settings.json` and `C:/...settings.json` (1 each) — actually wired, not orphaned.
- **Self-heal works:** ran the real hook as alpha against an absent surface → it regenerated and wrote `H:/prism-slot-alpha/state/shared/TOKEN-OPTIMIZATION-AWARENESS.md` (2343 B, valid) and injected the correct headline (verdict/galaxy/offload 9.0%/PSN 1047 hits/legs-needing-attention).
- **No-churn invariant holds:** re-run on the fresh file left mtime UNCHANGED.
- **Stale-overwrite works:** with the real generator, a 100h-stale surface was overwritten (mtime changed, stale sentinel gone, fresh data written) — `decideRegen({ageHrs:100,staleHrs:24})===true` confirmed.

### Alpha-gate ordering — CORRECT (the load-bearing safety property)
`main()` executes `if (!slot || slot.toLowerCase() !== "alpha") process.exit(0)` **before** `await maybeRegenerate(...)`. A non-alpha slot can never trigger the in-process write. Verified live (bravo slot → e
... [+1604 chars truncated]
