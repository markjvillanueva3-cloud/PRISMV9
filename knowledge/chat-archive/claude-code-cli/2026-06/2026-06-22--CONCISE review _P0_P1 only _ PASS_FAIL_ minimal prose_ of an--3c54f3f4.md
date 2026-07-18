---
type: "chat-session"
source: "claude-code-cli"
session_id: "3c54f3f4-6786-4c39-84d6-62b0a0db8cad"
title: "CONCISE review (P0/P1 only + PASS/FAIL, minimal prose) of an uncommitted PRISM c"
date: "2026-06-22"
first_ts: "2026-06-22T13:41:14.222Z"
last_ts: "2026-06-22T13:50:36.541Z"
cwd: "H:\\prism"
messages: 34
user_msgs: 12
assistant_msgs: 22
raw_file: "H:/.claude/projects/H--prism/3c54f3f4-6786-4c39-84d6-62b0a0db8cad/subagents/agent-aee3d4d6457b7f6a1.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# CONCISE review (P0/P1 only + PASS/FAIL, minimal prose) of an uncommitted PRISM c

> **claude-code-cli** | 2026-06-22 | 34 msgs (12 user / 22 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/3c54f3f4-6786-4c39-84d6-62b0a0db8cad/subagents/agent-aee3d4d6457b7f6a1.jsonl`

## Transcript

### User | 2026-06-22T13:41:14.222Z

CONCISE review (P0/P1 only + PASS/FAIL, minimal prose) of an uncommitted PRISM change on slot xray. Run `git -C H:/prism diff scripts/lib/ollama-vision-extract-lib.mjs scripts/lib/ollama-vision-extract-lib.test.mjs`.

It adds `normalizeThreadCallout(raw)` (a pure thread-callout parser, sibling of the existing `normalizeSurfaceFinish`) + helper `maybeThread` + `fracInch` + tables `M_COARSE_PITCH_MM`/`SCREW_MAJOR_DIA_IN`, and wires an additive `thread:` field into `extractDimension`'s output (one line: `thread: maybeThread(type, rawText)`).

Verify with file:line + grade PASS/FAIL:
- CORRECTNESS of the thread parsing: Unified inch (fraction/decimal/screw/integer-major), metric (MxP + bare-M coarse-pitch fill), NPT (major_dia_in null since nominal pipe size != thread major). Spot-check: is the screw-vs-inch disambiguation right (a bare "10-24 UNC" = #10 .190in via tpi>=16, but "1-8 UNC" = 1in via tpi<16)? Are the SCREW_MAJOR_DIA_IN (#0..#12 ASME B1.1) and M_COARSE_PITCH_MM (ISO 261) table values correct? Any wrong constant?
- SELF-SAFETY (R12): does a bare integer-integer with no series/class/fraction ("1-2", "10-32") correctly return resolved:false (not fabricate a thread)?
- The additive wiring: does adding `thread:` to extractDimension break any existing field/consumer? Is `maybeThread`'s gate (type thread-ish OR thread-signature in raw_text) sound, so a plain linear dim is never mis-probed?
- Regex safety in the live OCR path: catastrophic backtracking? a false-positive that mints a thread from a non-thread dimension raw_text?
You may run `node H:/prism/scripts/lib/ollama-vision-extract-lib.test.mjs` (expect 87 pass). Do NOT run the GPU/OCR pipeline.

### Assistant | 2026-06-22T13:41:17.918Z

I'll review this uncommitted change. Let me start by reading the diff and the full file.

### Assistant | 2026-06-22T13:41:18.953Z

[tool_use: Bash]

### User | 2026-06-22T13:41:23.279Z

[tool_result] diff --git a/scripts/lib/ollama-vision-extract-lib.mjs b/scripts/lib/ollama-vision-extract-lib.mjs
index 8a15a9dbf7..2bffcb58d0 100644
--- a/scripts/lib/ollama-vision-extract-lib.mjs
+++ b/scripts/lib/ollama-vision-extract-lib.mjs
@@ -279,6 +279,120 @@ export function normalizeSurfaceFinish(raw) {
   return { ra_um: null, system: null, resolved: false, assumed: false, raw: s, note: "ambiguous unit
... [+11898 chars truncated]

### Assistant | 2026-06-22T13:41:28.914Z

I have the diff. Now let me read the full file end-to-end to verify the surrounding contract (the existing helpers like `round4`, `MM_PER_INCH`, `normalizeSurfaceFinish`, and how `extractDimension` is consumed).

### Assistant | 2026-06-22T13:41:29.171Z

[tool_use: Read]

### User | 2026-06-22T13:46:42.745Z

[tool_result] 1	// scripts/lib/ollama-vision-extract-lib.mjs
2	//
3	// U-TDP06 / U-PSGB-XRAY-RICH-SCHEMA — Ollama Vision Extractor (pure core).
4	//
5	// Builds the engineering-print extraction prompt and parses the model's JSON
6	// response into the RICH multi-zone BlueprintExtraction shape (title_block +
7	// dimensions + gdt + notes + profiles + part_bounds + thickness + surface
8	// finishes), mirroring th
... [+50556 chars truncated]

### Assistant | 2026-06-22T13:46:46.344Z

I've read the full file. Now let me verify the disambiguation logic and check for consumers of `extractDimension` output that might break with the new `thread` field. Let me also run the tests and check consumers.

### Assistant | 2026-06-22T13:46:47.028Z

[tool_use: Bash]

### Assistant | 2026-06-22T13:46:48.004Z

[tool_use: Grep]

### User | 2026-06-22T13:47:09.828Z

[tool_result]   ...
# Subtest: normalizeThreadCallout: SELF-SAFE + de-garble + adversarial (R12 -- never fabricate a thread)
ok 86 - normalizeThreadCallout: SELF-SAFE + de-garble + adversarial (R12 -- never fabricate a thread)
  ---
  duration_ms: 0.2758
  ...
# Subtest: parseVisionResponse: a thread dimension gets a canonical thread spec; non-thread dims get null
ok 87 - parseVisionResponse: a thread dimension
... [+195 chars truncated]

### User | 2026-06-22T13:47:12.029Z

[tool_result] Found 30 files limit: 30
scripts\lib\ollama-vision-extract-lib.test.mjs
scripts\lib\ollama-vision-extract-lib.mjs
scripts\validate-perfect-parts.mjs
scripts\probe-vision-model.mjs
scripts\blueprint-ocr-training-loop.mjs
scripts\lib\ocr-training-loop-lib.mjs
scripts\lib\vision-ensemble-fuse.mjs
scripts\lib\vision-ensemble-fuse.test.mjs
scripts\run-ollama-vision-extract.mjs
scripts\lib\cad-ground-tr
... [+785 chars truncated]

### Assistant | 2026-06-22T13:47:20.242Z

87/87 tests pass. Now let me verify the consumers iterate dimensions in a way that won't break on the new additive field. Let me check the most likely consumers that index into `.thread` or iterate dimension keys.

### Assistant | 2026-06-22T13:47:22.200Z

[tool_use: Bash]

### User | 2026-06-22T13:47:31.041Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-22T13:47:36.378Z

No consumers access `.thread` or do whole-key iteration over dimension objects (they read named fields), so the additive field is safe. Let me verify the disambiguation edge cases by spot-checking the actual constants and the screw-vs-inch boundary with a quick scratch eval, and check the regex for backtracking risk.

### Assistant | 2026-06-22T13:47:41.692Z

[tool_use: Bash]

### User | 2026-06-22T13:48:03.502Z

[tool_result] 1/4-20 UNC-2B    -> {"sys":"unified","maj":0.25,"tpi":20,"p":null,"res":true,"asm":false}
#10-32 UNF       -> {"sys":"unified","maj":0.19,"tpi":32,"p":null,"res":true,"asm":false}
10-24 UNC        -> {"sys":"unified","maj":0.19,"tpi":24,"p":null,"res":true,"asm":false}
1-8 UNC          -> {"sys":"unified","maj":1,"tpi":8,"p":null,"res":true,"asm":false}
6-32 UNC         -> {"sys":"unified","maj":0
... [+1931 chars truncated]

### Assistant | 2026-06-22T13:48:08.917Z

The spot-check surfaces a real correctness issue. Let me look closely at `2-56` and the screw-without-hash disambiguation boundary. `2-56 UNC` is a standard #2-56 machine screw (major dia .086"), but it returned `resolved:false` because the tpi-based gate only resolves a bare integer as a screw when `tpi >= 16`. Wait, 56 >= 16, so it should resolve. Let me investigate why `2-56` returned false.

### Assistant | 2026-06-22T13:48:13.049Z

[tool_use: Bash]

### User | 2026-06-22T13:48:25.317Z

[tool_result] 2-56         -> {"sys":null,"maj":null,"tpi":null,"p":null,"res":false,"asm":false,"note":"not a recognized thread callout"}
2-56 UNC     -> {"sys":"unified","maj":0.086,"tpi":56,"p":null,"res":true,"asm":false}
3-48 UNC     -> {"sys":"unified","maj":0.099,"tpi":48,"p":null,"res":true,"asm":false}
5-40 UNC     -> {"sys":"unified","maj":0.125,"tpi":40,"p":null,"res":true,"asm":false}
1-64 UNC     -
... [+581 chars truncated]

### Assistant | 2026-06-22T13:48:31.182Z

This confirms the self-safety design is intentional and correct: a bare `2-56` (no series/class/fraction/screw-hash) is deliberately NOT resolved because it is ambiguous with a numeric range. Only when a series keyword (`UNC`) or class is present does the screw resolve. This is the documented R12 self-safe behavior, not a bug. The `2-56 UNC` case resolves correctly to #2 (.086"). Good.

Now let me verify the screw disambiguation boundary more carefully — the danger case is a bare integer with a screw-class tpi. The gate resolves `n in [0..12] && tpi>=16` as a screw. Let me check the boundary cases where this could be wrong, e.g. a real fractional-inch thread written as integer with high tpi, and the ReDoS / backtracking risk on the live path.

### Assistant | 2026-06-22T13:48:38.273Z

[tool_use: Bash]

### User | 2026-06-22T13:49:01.314Z

[tool_result] 1-72 UNF     -> {"maj":0.073,"tpi":72,"res":true}
1-64 UNF     -> {"maj":0.073,"tpi":64,"res":true}
2-64 UNF     -> {"maj":0.086,"tpi":64,"res":true}
10-32 UNF    -> {"maj":0.19,"tpi":32,"res":true}
12-28 UNF    -> {"maj":0.216,"tpi":28,"res":true}
1-20 UNC     -> {"maj":0.073,"tpi":20,"res":true}
2-20 UNC     -> {"maj":0.086,"tpi":20,"res":true}
8-16 UNC     -> {"maj":0.164,"tpi":16,"res":true}
M
... [+72 chars truncated]

### Assistant | 2026-06-22T13:49:09.311Z

No catastrophic backtracking — all degenerate inputs complete in ≤1ms (the regexes use bounded `\d{1,2}` quantifiers and no nested ambiguous repetition). 

One subtle case to flag: `1-20 UNC` resolves to `#1` (.073"), but `1-20 UNC` could legitimately be a 1-inch UNC-equivalent... actually no — 1"-20 is not a standard UN thread (1" coarse is 8 tpi, fine is 12/14), and #1-20 is also non-standard (#1 is 64/72). So `1-20` is non-canonical either way; the tpi>=16 rule picks screw, which is the more defensible default for a small integer with high tpi. This is a reasonable disambiguation, not a defect.

Let me verify one more thing — the metric regex's word-boundary behavior on a raw_text that contains "M" as part of another word (e.g. material callout "MM" or "DIM"), and confirm `maybeThread`'s gate doesn't false-fire on plain dimensions.

### Assistant | 2026-06-22T13:49:13.870Z

[tool_use: Bash]

### User | 2026-06-22T13:49:28.453Z

[tool_result] 25.4 MM          -> {"sys":null,"maj":null,"res":false}
DIM 6 PLACES     -> {"sys":null,"maj":null,"res":false}
NOMINAL .250     -> {"sys":null,"maj":null,"res":false}
12.7 MAX         -> {"sys":null,"maj":null,"res":false}
R0.5 MIN         -> {"sys":null,"maj":null,"res":false}
M                -> {"sys":null,"maj":null,"res":false}
MM               -> {"sys":null,"maj":null,"res":false}
2 X .500
... [+271 chars truncated]

### Assistant | 2026-06-22T13:49:35.108Z

All non-thread inputs correctly return `resolved:false`. Note `25.4 MM` does not false-mint a metric thread — the `\bM\s*(\d...)` regex requires a digit immediately after M (with optional space), and "MM" has no trailing digit; "25.4 MM" has "MM" before end-of-string, no digit, so no match. The `MIN`/`MAX` guard also protects against `M\s*\d` matching inside those words (though those don't have digits anyway). 

Let me check one potential gap: a metric callout where the major-diameter falls between coarse-table entries gets `pitch_mm: null` but still `resolved:true` (e.g. M22, M30 above had `p:null`). That's honest (no fabricated pitch) — acceptable. Let me also double check the `±0.015`-style and verify the de-garble handles the multiplication sign variants the OCR emits.

### Assistant | 2026-06-22T13:49:39.987Z

[tool_use: Bash]

### User | 2026-06-22T13:49:54.459Z

[tool_result] multU00D7    -> {"sys":"metric","maj":0.2362,"tpi":null,"p":1,"res":true}
fwX          -> {"sys":"metric","maj":0.2362,"tpi":null,"p":1,"res":true}
minus2212    -> {"sys":null,"maj":null,"tpi":null,"p":null,"res":false}
emdash       -> {"sys":"unified","maj":0.25,"tpi":20,"p":null,"res":true}

### Assistant | 2026-06-22T13:50:00.501Z

One finding: the U+2212 MINUS SIGN (`minus2212`) is NOT normalized — `1/4−20 UNC` returns `resolved:false`. The de-garble only handles `\p{Pd}` (Unicode dash-punctuation category, which includes hyphen/en-dash/em-dash U+2014) but U+2212 MINUS SIGN is category `Sm` (Math Symbol), not `Pd`. VLMs DO emit U+2212 for hyphens. The em-dash worked because it is `Pd`; the minus sign is a real gap. This is a minor recall leak (P2) — it fails closed (returns unresolved, never fabricates), so it's not a correctness/safety risk, just a missed de-garble.

Let me confirm U+2212's category and that the fullwidth-x and mult-sign (handled) plus the `×` replace covers the common cases, then finalize.

### Assistant | 2026-06-22T13:50:02.931Z

[tool_use: Bash]

### User | 2026-06-22T13:50:17.501Z

[tool_result] U+2212 is Pd: false
U+2014 (em) is Pd: true
U+2013 (en) is Pd: true
U+2212 is Sm: true

### Assistant | 2026-06-22T13:50:36.541Z

Confirmed. U+2212 MINUS SIGN is `Sm` (Math Symbol), not `Pd`, so the de-garble at line 319 misses it. This is a P2 (fail-closed recall leak, not a correctness/safety defect).

I've completed the review. All constants verified against ASME B1.1 / B18.6.3 (screw major diameters) and ISO 261 (coarse pitch); disambiguation logic, self-safety, additive wiring, consumer-safety, and ReDoS all checked.

---

VERDICT: PASS

summary: The `normalizeThreadCallout` thread parser is correct across Unified inch (fraction/decimal/screw/integer-major), metric (MxP + bare-M coarse-pitch fill), and NPT, with sound R12 self-safety (bare integer-integer returns `resolved:false`) and a clean additive `thread:` wiring that no consumer breaks on. All table constants are canonical, the screw-vs-inch tpi disambiguation is right, and the live regexes have no catastrophic backtracking (degenerate 100K-char inputs complete in ≤1ms). 87/87 tests pass. One non-blocking P2 de-garble gap.

findings:
- [P2] `H:/prism/scripts/lib/ollama-vision-extract-lib.mjs:319` -- the de-garble normalizes only `\p{Pd}` dashes (hyphen/en/em) to `-`, but VLMs also emit U+2212 MINUS SIGN (category `Sm`, not `Pd`); `"1/4−20 UNC"` with U+2212 returns `resolved:false` (verified live). Fail-closed (never fabricates), so it's a recall leak only, not a correctness/safety risk. -- fix: extend the replace to cover the math minus, e.g. `.replace(/[\p{Pd}\u2212]/gu, "-")`.

Verification performed (auditable PASS):
- Read the entire file end-to-end (`ollama-vision-extract-lib.mjs`, 866 lines) — verified `round4`, `MM_PER_INCH`, and the `normalizeSurfaceFinish` sibling pattern the new code mirrors.
- Constants: `SCREW_MAJOR_DIA_IN` (#0=.060 … #12=.216) match ASME B1.1; `M_COARSE_PITCH_MM` (M1.6=.35 … M24=3.0) match ISO 261. No wrong values.
- Disambiguation spot-checks (lines 358-364): `10-24 UNC`→#10/.190, `1-8 UNC`→1in, `6-32 UNC`→#6/.138, `#10-32 UNF`→.190, `2-56 UNC`→#2/.086 — all correct; tpi>=16 screw / tpi<16 inch boundar
... [+880 chars truncated]
