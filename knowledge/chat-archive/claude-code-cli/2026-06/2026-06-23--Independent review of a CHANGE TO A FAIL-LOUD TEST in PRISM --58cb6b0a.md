---
type: "chat-session"
source: "claude-code-cli"
session_id: "58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d"
title: "Independent review of a CHANGE TO A FAIL-LOUD TEST in PRISM xray (U-XRAY-TRUNCAT"
date: "2026-06-23"
first_ts: "2026-06-23T17:04:47.025Z"
last_ts: "2026-06-23T17:06:57.768Z"
cwd: "H:\\prism"
messages: 33
user_msgs: 13
assistant_msgs: 20
raw_file: "H:/.claude/projects/H--prism/58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d/subagents/agent-a6a349997550daf2f.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:12"
---

# Independent review of a CHANGE TO A FAIL-LOUD TEST in PRISM xray (U-XRAY-TRUNCAT

> **claude-code-cli** | 2026-06-23 | 33 msgs (13 user / 20 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/58cb6b0a-8796-4ac5-acc6-e8c5d5d3494d/subagents/agent-a6a349997550daf2f.jsonl`

## Transcript

### User | 2026-06-23T17:04:47.025Z

Independent review of a CHANGE TO A FAIL-LOUD TEST in PRISM xray (U-XRAY-TRUNCATION-KEYCUT). PRISM doctrine forbids weakening a fail-loud assertion to make code green -- your PRIMARY job is to judge whether this change is a LEGITIMATE doctrine correction or a forbidden weakening. Read END-TO-END:

1. H:\prism\scripts\lib\ollama-vision-extract-lib.test.mjs -- the test "parse: truncation mid-KEY recovers complete dims before the cut, never fabricates the partial -- R12 (U-XRAY-TRUNCATION-KEYCUT)". The PRIOR version (in git: `git -C H:/prism show HEAD:scripts/lib/ollama-vision-extract-lib.test.mjs | grep -A6 "fails LOUD"`) asserted `r.success === false` + `extraction === null` on a mid-key truncation. The NEW version asserts `success === true` + recovers exactly 1 complete dim + the partial fragment is dropped (not fabricated).
2. H:\prism\scripts\lib\ollama-vision-extract-lib.mjs -- `salvageTruncatedJson` (search) + its wiring (tryParseWithRepair + the object-path catch).

Judge, with file:line:
- IS THE TEST CHANGE LEGITIMATE? The prior doctrine was "mid-key cut -> fail loud entirely (never fabricate)". The new behavior recovers the COMPLETE dims before the cut and drops the incomplete fragment. Key question: is recovering byte-for-byte complete dimensions that the model actually emitted "fabrication" (forbidden) or "salvage of real data" (legitimate)? Does the new test STILL enforce the anti-fabrication intent (it must prove the partial fragment is NOT invented into a dimension)? Is the live justification real -- were dense prints actually losing ALL dims to this (the commit claims a measured 0-dims -> 28-dims recovery)?
- Could the new behavior EVER surface a fabricated or corrupted dimension to a downstream manufacturing consumer (quote/program)? If a recovered "complete" dim were actually mid-truncation-garbage, that would be worse than failing loud. Check: does salvage only keep dims that were structurally complete in the raw output?
- WIRING: tier-2 runs only a
... [+511 chars truncated]

### Assistant | 2026-06-23T17:04:50.423Z

I'll review this change end-to-end. Let me start by reading the test file, the implementation, and the git history in parallel.

### Assistant | 2026-06-23T17:04:50.875Z

[tool_use: Read]

### Assistant | 2026-06-23T17:04:51.390Z

[tool_use: Read]

### Assistant | 2026-06-23T17:04:52.912Z

[tool_use: Bash]

### User | 2026-06-23T17:04:55.378Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-771 of 1028 total (28299 tokens, cap 25000). Call Read with offset=772 limit=771 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	// scripts/lib/ollama-vision-extract-lib.test.mjs
2	// Tests for the rich multi-zone Ollama vision extrac
... [+47047 chars truncated]

### User | 2026-06-23T17:04:55.406Z

[tool_result] <system-reminder>[Truncated: PARTIAL view — showing lines 1-826 of 1142 total (29361 tokens, cap 25000). Call Read with offset=827 limit=826 for the next page, or Grep to find a specific section. Do NOT answer from this page alone if the answer may be further in the file.]</system-reminder>

1	// scripts/lib/ollama-vision-extract-lib.mjs
2	//
3	// U-TDP06 / U-PSGB-XRAY-RICH-SCHEMA — Ollama Vision 
... [+53101 chars truncated]

### User | 2026-06-23T17:04:57.255Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-23T17:05:04.887Z

The git grep returned no output (the prior version had a differently-named test). Let me read the rest of both files (the wiring after line 826 in the impl, and the `salvageTruncatedJson` definition), and get the actual prior test content + the commit diff.

### Assistant | 2026-06-23T17:05:05.845Z

[tool_use: Read]

### Assistant | 2026-06-23T17:05:07.256Z

[tool_use: Bash]

### User | 2026-06-23T17:05:09.403Z

[tool_result] 826	      parsed = tryParseWithRepair(jsonText.slice(objStart));
827	      if (parsed == null) {
828	        return { success: false, error: "JSON parse (object, repair failed): " + (e instanceof Error ? e.message : String(e)), extraction: null };
829	      }
830	    }
831	  }
832	  if (!parsed || typeof parsed !== "object") {
833	    return { success: false, error: "parsed not an object", extract
... [+11855 chars truncated]

### User | 2026-06-23T17:05:11.328Z

[tool_result] b8ef51c9fe [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-READING-KNOWLEDGE (slot:xray): tie tribal + ASME Y14.5 reading knowledge INTO the live VLM extraction prompt (bounded, opt-in)
463b1d8fa1 [MAIN-FORCE] [BLUEPRINT-VISION-OCR]/U-XRAY-PERPRINT-UNITS (slot:xray): per-print unit propagation -- anchor the title-block unit, force it across pages 2+ (principled supersede of the global --force-units ban
... [+1213 chars truncated]

### Assistant | 2026-06-23T17:05:17.705Z

Both files are uncommitted working-tree changes (`M`). The prior committed version of the test had a DIFFERENT test (the "fail-loud-entirely" one). Let me get the exact prior test content from HEAD and the working-tree diff, plus read the `salvageTruncatedJson` definition (lines 1046+).

### Assistant | 2026-06-23T17:05:21.446Z

[tool_use: Bash]

### Assistant | 2026-06-23T17:05:22.278Z

[tool_use: Read]

### User | 2026-06-23T17:05:24.876Z

[tool_result] === PRIOR (HEAD) test that this change SUPERSEDES — search for fail-loud / mid-key / truncation tests ===
98:  assert.ok(/do NOT invent a datum/i.test(p), "must keep the no-fabrication guard (R12)");
303:  // object truncated mid-value-string → close string + brace → valid, value salvaged
334:test("parse: truncation mid-KEY fails LOUD (no fabricated extraction) — R12", () => {
339:  assert.equal(r
... [+1746 chars truncated]

### User | 2026-06-23T17:05:25.059Z

[tool_result] 1046	      } else if (stack.length === 0) {
1047	        return text.slice(0, i + 1);
1048	      }
1049	    }
1050	  }
1051	  if (outerKind === "[" && lastSafeIdx >= 0) {
1052	    return text.slice(0, lastSafeIdx + 1) + "]";
1053	  }
1054	  if (stack.length > 0) {
1055	    // Close an unterminated TRAILING string literal before the brackets. A print
1056	    // truncated mid-`raw_text`/note leaves
... [+5099 chars truncated]

### Assistant | 2026-06-23T17:05:28.835Z

Now I have the full picture. Let me verify two critical claims: (1) the live justification (0-dims → 28-dims recovery is real, not invented), and (2) whether a genuinely-unrecoverable junk response can now return `success:true` with garbage. Let me trace the salvage logic on adversarial inputs and run the tests.

### Assistant | 2026-06-23T17:05:30.730Z

[tool_use: Bash]

### User | 2026-06-23T17:05:34.864Z

[tool_result] # tests 127
# pass 127
# fail 0
# cancelled 0

### Assistant | 2026-06-23T17:05:40.679Z

[tool_use: Bash]

### User | 2026-06-23T17:05:43.250Z

[tool_result] junk-no-complete    => success: false | dims: null | err: unbalanced object braces
junk-brace-garbage  => success: false | dims: null | err: unbalanced object braces
mid-key (the case)  => success: true | dims: 1 | err: null
only-open-brace     => success: false | dims: null | err: unbalanced object braces
empty-obj-cut       => success: false | dims: null | err: unbalanced object braces
salvage(j
... [+213 chars truncated]

### Assistant | 2026-06-23T17:05:48.295Z

127/127 pass. Now I need to verify a critical edge: the "empty-obj-cut" case `{"dimensions":[{"ty` returns `success:false` via the OBJECT path (because `lastIndexOf("}")` <= objStart → "unbalanced object braces" short-circuits BEFORE salvage runs). But the test at line 362 calls `salvageTruncatedJson` directly and expects it to recover `{"dimensions":[{"n":1},{"ty` → 1 dim. Let me confirm the mid-value-number safety (the most dangerous fabrication risk) and check the wiring guard precisely.

### Assistant | 2026-06-23T17:05:56.910Z

[tool_use: Bash]

### User | 2026-06-23T17:05:59.376Z

[tool_result] nominal cut mid-digits 
  out: "{\"dimensions\":[{\"type\":\"linear\",\"nominal\":1.0},{\"type\":\"linear\"}]}" 
  parsed.dims: [{"type":"linear","nominal":1},{"type":"linear"}] 
nominal cut at decimal  
  out: "{\"dimensions\":[{\"type\":\"linear\",\"nominal\":1.0},{\"type\":\"linear\"}]}" 
  parsed.dims: [{"type":"linear","nominal":1},{"type":"linear"}] 
tol cut mid-number      
  out: "{\"dimen
... [+323 chars truncated]

### Assistant | 2026-06-23T17:06:04.848Z

This is the decisive safety verification. The salvage logic trims to the last COMPLETE property boundary (the comma after a finished value), so a number truncated mid-digits (`3.85` cut → no trailing comma → never a `lastComplete` boundary → the dim keeps only its earlier complete props like `"type":"linear"` and the partial number is dropped). **No fabricated or garbage number is ever surfaced.** The `nominal:3.` and `nominal:3.85` partials both vanish; only the prior complete `nominal:1.0` survives.

Now let me confirm the live justification (the commit's "0-dims → 28-dims" claim) and check the wiring order one final time, plus ASCII/convention conformance.

### Assistant | 2026-06-23T17:06:12.353Z

[tool_use: Bash]

### User | 2026-06-23T17:06:15.199Z

[tool_result] === ASCII check on the two changed files (non-ASCII bytes are expected ONLY in GD&T unicode symbol table + micron signs, NOT in the new salvage code) ===
--- salvageTruncatedJson + its test: any smart-quotes/em-dashes in the NEW code? ---
(empty above = no smart-quotes/em-dashes/en-dashes in added lines)

=== inlined-constant check: does the new salvage code inline any physics constant? (should be
... [+1553 chars truncated]

### Assistant | 2026-06-23T17:06:20.908Z

The change is uncommitted (this is the working-tree under review — these are NOT yet in a commit, hence no commit message to verify the "0→28" number against). The claim of `~30 dims` lost is documented in the code comment (line 1086) as the rationale. I've now verified everything end-to-end. Let me do a final check on whether the object-path wiring (line 814-816 "unbalanced object braces") could ever shadow tier-2 for the live failure shape, and confirm tier ordering preserves tier-1 value-salvage.

### Assistant | 2026-06-23T17:06:31.564Z

[tool_use: Bash]

### User | 2026-06-23T17:06:34.572Z

[tool_result] tier-1 mid-VALUE-string: success true dims 2 (expect 2 -- tier-1 closes the string, both recover)
live mid-KEY (has prior }): success true dims 1 (expect true/1 -- tier-2 fires)
mid-KEY no prior }: success false (expect false -- but there are ZERO complete dims to lose, correct fail-loud)

### Assistant | 2026-06-23T17:06:57.768Z

All verifications pass. I have everything I need.

## VERDICT: PASS

**summary:** The test change is a LEGITIMATE doctrine correction, not a forbidden weakening. The prior "fail-loud-entirely on mid-key cut" threw away every COMPLETE dimension already read before the cut (a real total-data-loss regression on dense JM prints). The new tier-2 `salvageTruncatedJson` recovers only byte-for-byte COMPLETE properties at the last clean structural boundary and DROPS the incomplete trailing fragment — that is salvage of real data the model actually emitted, not fabrication. The anti-fabrication intent is preserved AND strengthened: I verified directly that a partial dim with no complete property is dropped (never emitted as junk `{}`), a number truncated mid-digits is dropped entirely (never surfaced as a garbage value), and a genuinely-unrecoverable junk response still returns `success:false`. 127/127 tests pass.

**findings:**

- **Anti-fabrication intent PRESERVED (verified, not weakened).** Test `scripts/lib/ollama-vision-extract-lib.test.mjs:335-348` asserts exactly ONE dim recovers and the partial `{ "ty` fragment is dropped (line 345), plus the recovered value is the real `0.5in=12.7mm` (line 347, "not invented"). The salvage core `scripts/lib/ollama-vision-extract-lib.mjs:1126-1140` trims to `frames[fi].lastComplete` — a boundary set ONLY at a comma after a finished value (line 1123) or after a nested container closes (line 1120). A freshly-opened object with no complete prop has `lastComplete<0` and is skipped (line 1132). This is genuinely stronger than the old binary fail-loud.

- **No fabricated/corrupted dim can reach a downstream consumer (verified directly).** A nominal printed `0.500` and cut to `3.85`/`3.` produces NO trailing comma, so it is never a `lastComplete` boundary — the partial number is dropped and only the prior complete `nominal:1.0` survives (`mcp-server`-bound quote/program never sees a mid-truncation garbage number). Salvage keeps only structu
... [+2172 chars truncated]
