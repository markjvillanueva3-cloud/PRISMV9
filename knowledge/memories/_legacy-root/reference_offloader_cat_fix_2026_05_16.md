---
name: reference-offloader-cat-fix-2026-05-16
description: "U-OFFLOADER-CAT-FIX shipped 2026-05-16 commit 2bbf12654 slot echo. Fixed ollama-task-offloader's 90% category=unknown rate (76 of 84 events) by converting KEEP_ON_CLAUDE from RegExp[] to {pattern, category}[]. SURPRISE find during per-file scrutiny: SAFETY_PRE pre-gate was needed to prevent 'explain the kienzle model' from offloading to Ollama which lacks src/physics/constants.ts. Closed 15 Unicode-bypass classes (Cyrillic + Greek + Latin-Extended + 4 invisibility families + bidi controls + variation selectors + tag chars) via NFKD + \\p{Default_Ignorable_Code_Point} + 25-char homoglyph remap."
source: prism-memory
synced: 2026-05-18T01:02:09.612Z
aliases: reference_offloader_cat_fix_2026_05_16
---


# U-OFFLOADER-CAT-FIX — offloader category accuracy + Unicode-bypass safety pre-gate

## What it does

PRISM's `.claude/hooks/ollama-task-offloader.mjs` (UserPromptSubmit) was producing telemetry where 76 of 84 events labeled `category="unknown" decision="keep"`, making the offload-stats dashboard worthless for auditing keep-rate by category. Root cause: `KEEP_ON_CLAUDE` was a flat `RegExp[]` returning `category="complex"` for any match, and almost every PRISM orchestration prompt (`/checkin`, `/loop`, `/goal`, "fix this", "continue", "sync") fell through to `unknown` because none of the keep patterns matched them.

Fix: converted `KEEP_ON_CLAUDE` to `{pattern, category}[]` with explicit labels (orchestration / operator_directive / git_ops / multi_file / deep_reasoning). Routing decisions unchanged — only telemetry fidelity improved.

## The load-bearing surprise (caught only by per-file scrutiny)

During Arm B's round-1 review, found that "explain the kienzle model" was offloading to Ollama. The Ollama instance does NOT carry `mcp-server/src/physics/constants.ts` (kc1.1 per ISO group, Taylor coefficients, Johnson-Cook params). Sending a kienzle prompt to a local model that lacks the canonical constants → hallucinated values → exactly the failure class CLAUDE.md §SAFETY forbids one layer up.

Closed via new `SAFETY_PRE` pre-gate that runs BEFORE `OFFLOADABLE_PATTERNS`:
- `kienzle | johnson-cook | safety-critical` — bare match (rare outside physics)
- `taylor + (tool-life | wear | equation | formula)` — required physics context so "taylor swift" / "taylor series in calculus" / "john taylor" don't false-positive
- `collision-check + (on | for | the | toolpath | cycle | spindle | fixture | machine)` — required mfg context so "hash collision-check algorithm" doesn't false-positive
- `(force | stress | thermal | deflection) + (calculation | model | verify | validate)` — generic physics-verb fallback

## Unicode-bypass closure (R2 Arm B P0)

Naive ASCII regex like `\bkienzle\b` is bypassable with:
- **Cyrillic homoglyphs** — `кienzle` (U+043A looks like ASCII k)
- **Greek homoglyphs** — `jοhnson-cook` (U+03BF looks like ASCII o)
- **Turkish dotless-i** (U+0131) — `kıenzle`. NFKD does NOT decompose this codepoint; must be explicitly mapped.
- **Combining diacritics** — `kïenzle` = k + i + combining diaeresis (U+0308)
- **Zero-width characters** — `kien​zle` with U+200B/200C/200D/FEFF/00AD spliced between
- **Bidi controls** — `kien‮zle` with RLO/LRM/RLM (U+202E/U+200E/U+200F)
- **Word joiner** (U+2060)
- **Variation selectors** (U+FE00-FE0F, U+E0100-E01EF)
- **Tag chars** (U+E0000-E007F)

Closed via `normalizeForSafety(s)` helper:
```js
function normalizeForSafety(s) {
  return s.normalize("NFKD")
    .replace(INVISIBLE_RX, "")                            // /[̀-ͯ]|\p{Default_Ignorable_Code_Point}/gu
    .replace(HOMOGLYPH_RX, (c) => UNICODE_HOMOGLYPHS[c] || c);
}
```

The `\p{Default_Ignorable_Code_Point}` Unicode property covers ALL ~4174 default-ignorable codepoints in one declaration — the right primitive for invisibility-class bypasses. Hand-rolling individual ranges produces an incomplete list (this is what failed R1).

## Per-file scrutiny rounds

| Round | Arm A | Arm B | Findings |
|-------|-------|-------|----------|
| 1 | FAIL | PASS-P1 | P0 git_summary `changes?` over-match; P1 orchestration anchor; P1 SAFETY_PRE deflection of "explain the kienzle model" |
| 2 | PASS | **FAIL** | P0 Unicode-evasion bypass (Cyrillic was caught but Greek/Turkish/bidi/word-joiner all open); P1 spurious safety triggers ("taylor swift" → safety_physics) |
| 3 | PASS | PASS | All 15 hostile-payload classes closed; math-italic symbols + capital Cyrillic + compound bypasses all verified |

**Key lesson reinforced** ([[feedback_scrutiny_gate_finds_hostile_payload_class]]): Arm A passed round 2 with PASS verdict. Arm B caught 8 wide-open hostile classes. The 2-arm gate is load-bearing for LLM-input-boundary classifiers — without Arm B's independent weighting on hostile-payload safety, this would have shipped with a real Unicode bypass.

## Test suite

`H:/prism/.claude/hooks/__tests__/ollama-task-offloader-classify.test.mjs` — 36 node:test cases, 80ms. Locks:
- 6 category labels (orchestration / operator_directive / git_ops / multi_file / deep_reasoning / safety_physics)
- 15-case Unicode-bypass array (Cyrillic к/о, Greek omicron/alpha, Turkish dotless-i, combining diaeresis, ZWSP, ZWNJ, ZWJ, SHY, Word Joiner, RLO, LRM, RLM, Tag char U+E0000)
- 5-case spurious-trigger lock (taylor swift / taylor series / hash collision-check / john taylor / taylor expansion)
- 3-case word-boundary lock (discontinue / asynchronous / incontinent)
- 8-prompt regression replay from `ollama-offload-stats.json:events[]`

vitest harness still broken on this repo per [[reference_fleet_reaper_ms1]] — use `node --test` instead.

## Files

- `.claude/hooks/ollama-task-offloader.mjs` (~485 lines now)
- `.claude/hooks/__tests__/ollama-task-offloader-classify.test.mjs` (329 lines, 36 tests, all pass)

## Knobs

No new env knobs. Existing knobs unchanged: `OLLAMA_URL`, `PRISM_OLLAMA_OFFLOAD_DISABLE`.

## Verify wiring

The offloader hook was already wired in settings.json (one of the 4 of 17 ollama-* hooks that ARE wired per [[feedback_ollama_docker_pipeline_dead_code_2026_05_16]]). No settings change needed.

```bash
node -e "['H:/.claude/settings.json','C:/Users/wompu/.claude/settings.json'].forEach(p=>console.log(p+': ollama-task-offloader='+((require('fs').readFileSync(p,'utf8').match(/ollama-task-offloader/g)||[]).length)))"
# both should report ≥1
```

## Deferrals (logged for next session)

- **P2** — widen `(^|\s)` orchestration anchor to also accept `(^|[\s\("'>])` so quoted / bracketed forms (`"/checkin echo"`, `(/goal)`) also match. Currently falls to `unknown` (safe direction).
- **P3** — enlarge homoglyph map to Armenian (օ) + Cherokee (Ꭱ/Ꭺ) + Hebrew lookalikes. Currently not in `UNICODE_HOMOGLYPHS` so an attacker using these scripts bypasses. Lower probability than Greek/Cyrillic in real prompts.
- **P3** — build `HOMOGLYPH_RX` programmatically from `Object.keys(UNICODE_HOMOGLYPHS)` at module init to eliminate manual-sync drift between the map and the regex.

## Why this matters

3 of 4 audit memos this session ([[feedback_settings_wiring_drift_2026_05_16]] / [[feedback_checkin_loop_goal_utilization_audit_2026_05_16]] / [[feedback_ollama_docker_pipeline_dead_code_2026_05_16]]) document the "Named-not-Invoked" regression class. This commit is the FIRST diagnostic-and-fix that ALSO surfaced a latent safety-routing bug. The offloader has been deployed and silently labeling everything "unknown" since 2026-04-26 (when it was re-enabled per LOCAL-LLM-MS0 U-LLMH01). The kienzle bypass shipped at the same time — for ~3 weeks, any operator who typed "explain the kienzle model" got Ollama-generated values that may have looked plausible but lacked the canonical constants. The per-file scrutiny gate is what caught this — without it, this commit would have closed the labeling bug while LEAVING the safety bug open.

## Next-session pickups (high ROI from the same audit ladder)

- **Gap #2** scrutiny-verdict-persist.mjs Stop hook — capture the 3-of-3 ledger + per-file verdicts (which contain the actual Unicode-bypass findings) into Obsidian as a second permanent memory bank. Without this, 6 detailed scrutiny reports from THIS commit just evaporate.
- **Gap #4** error-fix-learner.mjs PostToolUse hook — detect test-fail → edit → test-pass cycles, auto-write the learning.
- **Diagnose remaining 13 unwired ollama-* hooks** per [[feedback_ollama_docker_pipeline_dead_code_2026_05_16]] — pipeline-injector + prewarm-on-pipeline shipped, 13 more sit dead-code-on-disk.


## Related
[[skills/hooks|/hooks]] • [[skills/ollama-task-offloader|/ollama-task-offloader]] • [[skills/checkin|/checkin]] • [[skills/loop|/loop]] • [[skills/goal|/goal]] • [[skills/src|/src]] • [[skills/physics|/physics]] • [[skills/constants|/constants]] • [[skills/gu|/gu]] • [[skills/bidi|/bidi]]