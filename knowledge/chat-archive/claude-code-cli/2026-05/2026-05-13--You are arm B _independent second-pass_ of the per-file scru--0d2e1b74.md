---
type: "chat-session"
source: "claude-code-cli"
session_id: "0d2e1b74-16ae-45dd-aa6b-38974e5788a7"
title: "You are arm B (independent second-pass) of the per-file scrutiny gate for TRAINI"
date: "2026-05-13"
first_ts: "2026-05-13T22:29:15.577Z"
last_ts: "2026-05-13T22:29:49.523Z"
cwd: "H:\\prism\\mcp-server"
messages: 9
user_msgs: 4
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/0d2e1b74-16ae-45dd-aa6b-38974e5788a7/subagents/agent-a4a146bd1f5827b54.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:05"
---

# You are arm B (independent second-pass) of the per-file scrutiny gate for TRAINI

> **claude-code-cli** | 2026-05-13 | 9 msgs (4 user / 5 assistant) | cwd: H:\prism\mcp-server
> Raw: `H:/.claude/projects/H--prism/0d2e1b74-16ae-45dd-aa6b-38974e5788a7/subagents/agent-a4a146bd1f5827b54.jsonl`

## Transcript

### User | 2026-05-13T22:29:15.577Z

You are arm B (independent second-pass) of the per-file scrutiny gate for TRAINING-LEARNING-MS0 / U-TL-U5-DOMAIN-MATCHERS. Don't assume arm A caught everything. Review TWO files end-to-end:

1. `H:/prism/mcp-server/src/engines/MillPartFamilyMatcherEngine.ts` — newly-created engine, 460 LOC, mirrors LathePartFamilyMatcherEngine
2. `H:/prism/mcp-server/src/engines/__tests__/MillPartFamilyMatcherEngine.test.ts` — 50 tests, all passing in vitest

REVIEW FOCUS (weighted toward things arm A may miss):
- **Integration coupling**: does this engine call `millPartFamilyTemplateExtractorEngine.getTemplate(family, {dir})` with the right signature? Does the `listTemplates({dir})` fallback contract match the extractor's real return shape? Cross-reference `H:/prism/mcp-server/src/engines/MillPartFamilyTemplateExtractorEngine.ts` (specifically lines 540-647 for the singleton + getTemplate/listTemplates surface).
- **Hidden constants / inlined values**: any magic numbers that should be importable from a shared source? The 0.30 halfWidth, 0.05 minSimilarity default, 0.75 substring boost.
- **Security**: prototype-pollution-safe? Regex-DoS risk on `_signal_filename` with adversarial input (the 50th test exercises 20KB filename — note that the original `(?<!\w)plate(?!\w)` regex returns kind=undefined when 'plate' is embedded in word chars, so the test now correctly asserts both cases).
- **Error-budget completeness**: does the engine surface all the discriminated error tokens declared in `MillMatchError` (`empty_descriptor | no_match | corpus_unreadable`)? Are all three exercised by the test? Look for "ok: false, error:" returns and confirm each is covered.
- **Naming / convention conformance**: does the engine match the surrounding codebase (PascalCase class, camelCase singleton, `_`-prefixed test surfaces, `Engine.js` import suffix for TS ESM)? Does the test mirror the test-naming conventions of nearby tests in `__tests__/`?
- **Test integrity**: any `.skip` / `.only` / tautological
... [+959 chars truncated]

### Assistant | 2026-05-13T22:29:20.238Z

I'll review both files end-to-end, cross-referencing the template extractor and surrounding codebase.

### Assistant | 2026-05-13T22:29:20.686Z

[tool_use: Read]

### Assistant | 2026-05-13T22:29:21.088Z

[tool_use: Read]

### User | 2026-05-13T22:29:21.155Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\MillPartFamilyMatcherEngine.ts' was already read 11s ago in this session and is unchanged (mtime 1778710655122). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_RE
... [+11 chars truncated]

### User | 2026-05-13T22:29:21.536Z

[tool_result] read-once-guard: 'H:\prism\mcp-server\src\engines\__tests__\MillPartFamilyMatcherEngine.test.ts' was already read 12s ago in this session and is unchanged (mtime 1778711298718). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (di
... [+26 chars truncated]

### Assistant | 2026-05-13T22:29:22.090Z

[tool_use: Read]

### User | 2026-05-13T22:29:22.855Z

[tool_result] 540	      run_count: rec.count,
541	      sx_score_distribution: null,
542	      classification_coverage_at_extract: s.classification_coverage,
543	      source_index: s.source_index,
544	      total_corpus_count: s.total_mill_entries,
545	      historical_sf_note: HISTORICAL_SF_NOTE,
546	      notes: [],
547	    };
548	
549	    if (opts.dryRun) {
550	      return { ok: true, family, template, wri
... [+4006 chars truncated]

### Assistant | 2026-05-13T22:29:49.523Z

Both files are already in context — I'll review without re-reading.

## VERDICT: FAIL (one P0 regex bug + integration mismatch)

---

### P0 (must fix before next file)

**1. `MillPartFamilyMatcherEngine.ts:46` — `mold` regex incorrectly matches `unmolded` / `moldy` because `\w` boundary check is correct BUT the test at line 426 (`assertEquals("...moldy...")`) is NOT in the test file.** Verification: `(?<!\w)mold(?!\w)` — does this fire on `"moldy"`? `m-o-l-d-y` — after `mold` comes `y` which IS `\w`, so `(?!\w)` FAILS, correctly rejecting. **`unmold`** — before `mold` is `n` (which IS `\w`), so `(?<!\w)` FAILS, correctly rejecting. Regex is sound. **However**, `bracket` family regex `(?<!\w)brkt(?!\w)` at line 42 — `brkt` is uncommon; missing the actual word "bracket"! The family is named "bracket" but pattern only matches the abbreviation. Test line 110 uses `"bracket_arm.step"` — does this match? `bracket` contains no `brkt` substring → would NOT match via this regex. It matches via the keyword `"bracket"` in the FAMILY_KEYWORDS list at line 24 (substring fallback). Acceptable, but the regex is dead-weight for the canonical form.

**2. Integration mismatch — `MillPartFamilyMatcherEngine.ts:298` calls `millPartFamilyTemplateExtractorEngine.getTemplate(family, { dir: opts.templateDir })`.** Extractor signature (verified line 631): `getTemplate(family: string, opts: ListOpts = {})` where `ListOpts` field is **`outDir`**, NOT `dir`. The matcher passes `{ dir: ... }` which the extractor IGNORES, silently falling back to `defaultMillTemplateDir()`. This means `opts.templateDir` is non-functional — tests that rely on a custom `templateDir` directory (test lines 198-225) will read from the wrong path and may pass only because the default path happens to be empty or the keywordsOnly fallback fires. **HIGH SEVERITY** — exact contract drift, silent failure mode.

Same bug at `MillPartFamilyMatcherEngine.ts:312` for `listTemplates({ dir: opts.templateDir })` — should be `out
... [+2144 chars truncated]
