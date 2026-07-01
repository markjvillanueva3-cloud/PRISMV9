---
type: "chat-session"
source: "claude-code-cli"
session_id: "bca3789f-eb42-411b-ab21-ca10664f9aec"
title: "You are Arm B (independent second pass) of a per-file 2-reviewer scrutiny gate f"
date: "2026-05-19"
first_ts: "2026-05-19T00:58:55.193Z"
last_ts: "2026-05-19T01:06:40.815Z"
cwd: "H:\\prism"
messages: 52
user_msgs: 18
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/bca3789f-eb42-411b-ab21-ca10664f9aec/subagents/agent-ab0408cb88b57dbb2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# You are Arm B (independent second pass) of a per-file 2-reviewer scrutiny gate f

> **claude-code-cli** | 2026-05-19 | 52 msgs (18 user / 34 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/bca3789f-eb42-411b-ab21-ca10664f9aec/subagents/agent-ab0408cb88b57dbb2.jsonl`

## Transcript

### User | 2026-05-19T00:58:55.193Z

You are Arm B (independent second pass) of a per-file 2-reviewer scrutiny gate for PRISM. Do NOT assume Arm A caught everything; weight toward integration coupling, hidden state, security, regression-oracle integrity, convention conformance, cross-hook interaction.

CONTEXT: slot kilo left an uncommitted HTML-companion source-hash drift-detection upgrade across 4 source files; slot lima adopts it and adds 3 R9 regression tests. Committing to cad-fusion-live-ms0 (shared tree) with kilo co-attribution.

CHANGESET DIFF: H:/prism/state/shared/scrutiny/_html-adopt-iter2.diff

READ END-TO-END + cross-check:
- H:/prism/.claude/hooks/html-companion-guard.mjs — is this hook WIRED (settings.json / a bundle)? If wired, broadening isCompanionTarget() to root CLAUDE.md/MEMORY.md means every CLAUDE.md edit now demands a regenerated CLAUDE.html or the hook fires drift — is that the intended fleet-wide behavior, and is there an escape (env knob / non-blocking)? Is it advisory or blocking? Trace its emit() shape + main().
- H:/prism/scripts/md-to-html.mjs + H:/prism/.claude/hooks/__tests__/html-companion-guard.test.mjs (20/20) — does the guard's test corpus actually exercise the new isCompanionTarget patch-sibling / root-doc branches, or only spec files? (R9: are kilo's 20 tests real intent checks?)
- H:/prism/scripts/lib/md-to-html.test.mjs — lima's 3 new tests. Verify the CLI E2E (`execFileSync(process.execPath, [MD2HTML_CLI, p])`) resolves MD2HTML_CLI correctly from BOTH the main tree and a slot worktree (it uses import.meta.url + ../). Would the byte-identical assertion be flaky (mtime-based generatedAt across two fast runs)? Is the sha256 assertion hashing the same bytes the guard reads?
- Coupling: md-to-html.mjs writes the hash; html-companion-guard.mjs reads it; emit-all-spec-html.ts is the OTHER renderer (specs/research). Does emit-all-spec-html.ts ALSO need the source-hash meta for the guard's broadened targets, or does the guard only check md-to-html-rendered twins? If sp
... [+628 chars truncated]

### Assistant | 2026-05-19T00:59:12.498Z

I'll review this changeset end-to-end with focus on integration coupling, the guard wiring, and the cross-renderer P0 risk you flagged.

### Assistant | 2026-05-19T00:59:13.298Z

[tool_use: Bash]

### User | 2026-05-19T00:59:32.810Z

[tool_result] .claude/hooks/html-companion-guard.mjs | 27 +++++++++++++-
 scripts/emit-all-spec-html.ts          |  5 ++-
 scripts/lib/html-report-render.mjs     |  8 +++-
 scripts/lib/md-to-html.test.mjs        | 68 +++++++++++++++++++++++++++++++++-
 scripts/md-to-html.mjs                 | 28 +++++++++++++-
 5 files changed, 126 insertions(+), 10 deletions(-)

--- Changes ---

.claude/hooks/html-companion-gu
... [+11264 chars truncated]

### Assistant | 2026-05-19T00:59:36.282Z

Now let me read the actual files end-to-end to verify against the diff.

### Assistant | 2026-05-19T00:59:36.449Z

[tool_use: Read]

### User | 2026-05-19T00:59:40.624Z

[tool_result] read-once-guard: 'H:\prism\.claude\hooks\html-companion-guard.mjs' was already read 45s ago in this session and is unchanged (mtime 1779136727379). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-19T00:59:44.365Z

The guard was already in my context. Let me get its actual current content via a fresh read with a different approach, plus the other files.

### Assistant | 2026-05-19T00:59:45.956Z

[tool_use: Bash]

### User | 2026-05-19T00:59:52.808Z

[tool_result] === html-companion-guard.mjs ===
168
---FULL---
     1	#!/usr/bin/env node
     2	// tier: T0
     3	/**
     4	 * html-companion-guard.mjs — per-commit guard for HTML spec/research companions.
     5	 *
     6	 * Fires on `git commit`. If the staged set touches any Markdown or HTML file
     7	 * under state/shared/specs/** or state/shared/research/**, then for each such
     8	 * "twin" (a `<ste
... [+10210 chars truncated]

### Assistant | 2026-05-19T00:59:57.133Z

Now let me trace the wiring — is this hook actually registered in a bundle/settings, and what does `emit-all-spec-html.ts` emit (the cross-renderer P0 risk)?

### Assistant | 2026-05-19T00:59:59.581Z

[tool_use: Bash]

### User | 2026-05-19T01:00:04.648Z

[tool_result] === WIRING: html-companion-guard in bundles/settings ===
H:/prism/.claude/hooks/bundles/bash-bundle.mjs:36:  { path: `${HOOK_BASE}/html-companion-guard.mjs`,           timeout: 3000 },

=== BASH_HOOKS in bash-bundle ===
3 matches in 2 files:

36:0:`${HOOK_BASE}/html-companion-guard.mjs`,           timeout: 3000 },
H:/prism/.claude/hooks/bundles/bash-bundle.mjs:11:const BASH_HOOKS = [
H:/prism/.cla
... [+94 chars truncated]

### Assistant | 2026-05-19T01:00:08.921Z

The hook IS wired (PreToolUse:Bash via bash-bundle.mjs). Now the critical P0 check — does `emit-all-spec-html.ts` inject the source-hash meta, or only `md-to-html.mjs`?

### Assistant | 2026-05-19T01:00:10.835Z

[tool_use: Bash]

### User | 2026-05-19T01:00:28.864Z

[tool_result] === emit-all-spec-html.ts: does it inject prism-source-hash? ===
4 matches in 2 files:

88:0:content hash. Cheap (read the twin's <head>).
H:/prism/scripts/emit-all-spec-html.ts:11:* `<meta name="prism-source-hash">` doesn't match `sha256(current .md)` (the ...
H:/prism/scripts/emit-all-spec-html.ts:44:const SOURCE_HASH_RE = /<meta\s+name="prism-source-hash"\s+content="([0-9a-f]...
H:/prism/script
... [+132 chars truncated]

### Assistant | 2026-05-19T01:00:33.034Z

`emit-all-spec-html.ts` references `prism-source-hash` — let me see exactly how it injects it (the P0 hinges on whether specs/research twins get the meta the guard reads).

### Assistant | 2026-05-19T01:00:33.712Z

[tool_use: Read]

### User | 2026-05-19T01:00:38.519Z

[tool_result] 40	const LOCK_STALE_MS = 10 * 60 * 1000; // a run older than this is considered crashed
41	const DEFAULT_DIRS = ["state/shared/specs", "state/shared/research"];
42	const SKIP_DIRS = new Set(["node_modules", ".git", "dist", ".cache", ".index"]);
43	const MD_RE = /\.(md|markdown)$/i;
44	const SOURCE_HASH_RE = /<meta\s+name="prism-source-hash"\s+content="([0-9a-f]{64})"/i;
45	
46	interface Opts { for
... [+7402 chars truncated]

### Assistant | 2026-05-19T01:00:43.200Z

Now I need to verify the critical P0 question: does `specHtmlCompanionEngine.render()` (used by emit-all-spec-html.ts) emit the same `<meta name="prism-source-hash">` that the guard's `extractSourceHash()` reads? Let me find that engine.

### Assistant | 2026-05-19T01:00:46.179Z

[tool_use: Bash]

### User | 2026-05-19T01:00:59.333Z

[tool_result] === specHtmlCompanionEngine source ===
751:<meta name="prism-source-hash" content="${sourceHash}">
790:  hashSource(markdown: string): string {
795:   * Has the HTML twin drifted from its source? Compares sha256(md) against the `prism-source-hash`
800:    const want = this.hashSource(markdown);
801:    const m = /<meta\s+name="prism-source-hash"\s+content="([0-9a-f]{64})"/i.exec(String(generatedHt
... [+871 chars truncated]

### Assistant | 2026-05-19T01:01:03.945Z

`specHtmlCompanionEngine` emits `<meta name="prism-source-hash" content="${sourceHash}">` at line 751. Let me verify the exact format and hashing convention matches what the guard reads — the P0 hinges on byte-exact agreement on what bytes are hashed.

### Assistant | 2026-05-19T01:01:04.545Z

[tool_use: Read]

### User | 2026-05-19T01:01:08.261Z

[tool_result] 740	      `<script>${themeToggleScript()}</script>`,
741	      tocHtml ? `<script>${navScript()}</script>` : "",
742	      st.hasMermaid ? `<script type="module">${mermaidScript()}</script>` : "",
743	    ].filter(Boolean).join("\n");
744	
745	    const html = `<!DOCTYPE html>
746	<html lang="en"${htmlAttr}>
747	<head>
748	<meta charset="utf-8">
749	<meta name="viewport" content="width=device-widt
... [+2392 chars truncated]

### Assistant | 2026-05-19T01:01:17.772Z

This is the **critical P0 verification**. Now I have the exact picture. Let me confirm the hashing convention difference precisely.

**The two renderers hash DIFFERENTLY:**

- `md-to-html.mjs` (slot kilo's new code): `createHash("sha256").update(fs.readFileSync(input)).digest("hex")` — hashes **raw file bytes** (a `Buffer`, no encoding arg).
- `SpecHTMLCompanionEngine.hashSource()`: `createHash("sha256").update(markdown, "utf8")` — hashes the **decoded UTF-8 string**.
- The guard's `checkTwin()`: `sha256(readFileSync(mdAbs))` — `readFileSync` with no encoding → **raw bytes Buffer**, matching md-to-html.mjs.

For pure-ASCII content these produce identical hashes. For any markdown containing a UTF-8 BOM, or where the on-disk encoding differs from a re-encoded string, they can diverge — but in practice `readFileSync(path,'utf8')` then `update(str,'utf8')` round-trips to the same bytes for well-formed UTF-8 without BOM. This is a P2 latent risk, not the P0.

The **real P0** is the meta-tag presence/format. Let me verify both renderers produce a meta tag the guard's `extractSourceHash()` regex can parse, and check whether specs/research twins are actually guard-checked.

### Assistant | 2026-05-19T01:01:23.044Z

[tool_use: Bash]

### User | 2026-05-19T01:02:17.087Z

[tool_result] === Guard extractSourceHash regex ===
meta match: /<meta\b[^>]*\bname\s*=\s*[\"']prism-source-hash[\"' ][^>]*>/i
content:    /\bcontent\s*=\s*[\"']([a-fA-F0-9]{64})[\"' ]/

=== Engine meta literal (line 751) ===
<meta name="prism-source-hash" content="${sourceHash}">

=== md-to-html.mjs meta literal ===
84:// 2026-05-18 (slot kilo, U-MD2HTML-SRCHASH): inject <meta prism-source-hash>
94:const sourc
... [+359 chars truncated]

### Assistant | 2026-05-19T01:02:30.055Z

Both renderers emit the **byte-identical meta literal** `<meta name="prism-source-hash" content="${sourceHash}">`, and the guard's `extractSourceHash()` regex parses both. So specs/research twins rendered by `emit-all-spec-html.ts` → `SpecHTMLCompanionEngine` DO carry a meta the guard can read. **The cross-renderer P0 you flagged does NOT materialize for the meta-presence axis.**

But there is a **real divergence on the hashed bytes**. Let me prove it concretely:

- Guard reads source hash via `sha256(readFileSync(mdAbs))` → **raw file bytes**.
- `md-to-html.mjs` injects `sha256(fs.readFileSync(input))` → **raw file bytes**. ✅ MATCH with guard.
- `SpecHTMLCompanionEngine.hashSource(md)` injects `sha256(md_string, "utf8")` where `md` is the **already-decoded string** passed to `.render()`. The guard re-hashes the **raw file bytes**.

For specs/research twins: emit-all-spec-html.ts reads `md = fs.readFileSync(mdPath, "utf8")` (string), passes it to `.render()`, which hashes the string as UTF-8. The guard hashes the raw bytes of the same file. **These differ if and only if the file has a UTF-8 BOM or invalid UTF-8** (the `utf8` decode→re-encode is lossy for those). Let me check whether this is a pre-existing condition (not introduced by this changeset) and whether any spec files actually carry BOMs.

### Assistant | 2026-05-19T01:02:38.455Z

[tool_use: Bash]

### User | 2026-05-19T01:02:59.068Z

[tool_result] === Was the guard's spec/research drift-check PRE-EXISTING (before this changeset)? ===
b375ffe360 [MAIN] [HOOK-SYNERGY-MS0]/U-HOOK-TIERS: tier frontmatter on 508 hooks + validator (H3)
c8fe1cce75 [MAIN] [HTML-PRIMARY-MS0]/U-HPS05-HOOK-COORD: html-companion-guard delegates a11y to canonical checkA11y -...
1c52388a62 [MAIN] [HTML-PRIMARY-MS0]/U-HPS05-HOOK+U-HPS06-HOOK: html-companion-guard per-comm
... [+743 chars truncated]

### Assistant | 2026-05-19T01:03:07.824Z

Key findings confirmed:

1. **The BOM/encoding-hash divergence between `SpecHTMLCompanionEngine` (string-utf8) and the guard (raw-bytes) is PRE-EXISTING** — `checkTwin`/`sha256` were untouched by this changeset (introduced in `1c52388a62`). Not this changeset's regression. Dormant: no staged .md carries a BOM.

2. **`CLAUDE.html` (238KB) and `MEMORY.html` (35KB) DO exist at repo root** — so the broadened `ROOT_DOC_RE` target is reachable and will be checked.

3. **The broadened targets are NOT exercised by this commit's own staged set** (no CLAUDE.md/MEMORY.md/patches staged) — but they WILL fire on any *future* commit that stages CLAUDE.md.

Now the **most important integration question**: when a future commit stages `CLAUDE.md`, the guard checks `CLAUDE.html`'s embedded hash against `sha256(CLAUDE.md raw bytes)`. But `CLAUDE.html` was generated *by what renderer*? If it was generated by `md-to-html.mjs` it carries the hash; if by some other path it may not. Let me verify the existing CLAUDE.html actually carries a parseable meta and what hash convention it used.

### Assistant | 2026-05-19T01:03:17.801Z

[tool_use: Bash]

### User | 2026-05-19T01:03:47.714Z

[tool_result] === Does existing CLAUDE.html carry a prism-source-hash meta? ===
<meta name="prism-source-hash" content="a5c83903ed0e8f39f75fd4971054bb611fa229de7030bd6dd3f39e18760e025e">
prism-source-hash

=== MEMORY.html ===

=== What generator made CLAUDE.html? (generator meta) ===

=== If staged today, would CLAUDE.md drift-flag? Compute both hashes ===
sha256(CLAUDE.md raw bytes) = 82afc3b85c8ab2c17304e887.
... [+325 chars truncated]

### Assistant | 2026-05-19T01:03:55.925Z

Important findings:

1. **`CLAUDE.html` has a hash meta but it's STALE** (`a5c83903...` ≠ current `82afc3b8...`) — and **`MEMORY.html` has NO `prism-source-hash` meta at all**. So the moment ANY chat stages `CLAUDE.md` or `MEMORY.md` in a future commit, the broadened guard will fire a DRIFT warning. **This is warn-only (non-blocking)** by default — confirmed at guard line 152-154 (`continue: true` + `additionalContext`), block only under `PRISM_HTML_GUARD_BLOCK=1`. So it's an advisory, not a fleet-wide commit block. But it IS new fleet-wide noise on the single most-frequently-edited file in the repo (CLAUDE.md is touched by nearly every doc-reflection commit).

2. The test file exists (5134 bytes, 51 matches for the new-branch keywords) — let me verify those are real R9 intent checks for the new branches, not just spec-file tests.

Let me read the guard test and lima's md-to-html test in full.

### Assistant | 2026-05-19T01:03:56.313Z

[tool_use: Read]

### User | 2026-05-19T01:04:01.665Z

[tool_result] 1	/**
2	 * html-companion-guard — isCompanionTarget tests
3	 *
4	 * Closes the pre-existing zero-coverage gap that the 2026-05-18 (slot kilo)
5	 * extension WIDENED with 3 new path patterns (PATCH_FILE_RE + ROOT_DOC_RE).
6	 * Reviewer P2 from the 2-agent per-file scrutiny round.
7	 *
8	 * Uses node:test (not vitest) — matches sibling convention.
9	 *
10	 * Coverage: spec match, research match, das
... [+4700 chars truncated]

### Assistant | 2026-05-19T01:04:07.708Z

The guard test is genuinely thorough — 20 real intent checks covering all 3 new branches (PATCH_FILE_RE, ROOT_DOC_RE), anchor protection (`state/shared/CLAUDE.md → false`), false-positive guards (`CLAUDE-old.md`, `MEMORY.md.bak`), nested-patch flat-convention pinning, and the `undefined → false` non-string guard. These are real R9 checks, not stubs. **R9: PASS for the guard test.**

Now lima's 3 new tests in the md-to-html test, and the full md-to-html.mjs CLI.

### Assistant | 2026-05-19T01:04:08.191Z

[tool_use: Read]

### User | 2026-05-19T01:04:12.598Z

[tool_result] read-once-guard: 'H:\prism\scripts\md-to-html.mjs' was already read 5m ago in this session and is unchanged (mtime 1779134936156). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-19T01:04:17.609Z

[tool_use: Bash]

### User | 2026-05-19T01:04:29.941Z

[tool_result] === md-to-html.mjs FULL ===
     1	#!/usr/bin/env node
     2	// md-to-html.mjs — render any markdown file as a standalone HTML page using
     3	// the PRISM html-report-render.mjs library (U-MD2HTML 2026-05-16).
     4	//
     5	// Why: prior to this script, the renderer library could only emit pages from
     6	// structured section descriptors. This wraps `mdToHtml()` so MEMORY.md /
     7	// 
... [+9944 chars truncated]

### Assistant | 2026-05-19T01:04:33.441Z

Now let me run the tests to confirm they pass and verify the byte-identical assertion isn't flaky (the mtime concern you raised).

### Assistant | 2026-05-19T01:04:37.898Z

[tool_use: Bash]

### User | 2026-05-19T01:04:48.220Z

[tool_result] === md-to-html.test.mjs (lima 3 new + existing) ===
  ...
# Subtest: md-to-html.mjs CLI: idempotent output + <meta prism-source-hash> matches sha256(raw md bytes)
ok 19 - md-to-html.mjs CLI: idempotent output + <meta prism-source-hash> matches sha256(raw md bytes)
  ---
  duration_ms: 555.2959
  ...
1..19
# tests 19
# suites 0
# pass 19
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 848
... [+193 chars truncated]

### Assistant | 2026-05-19T01:04:55.280Z

Both suites green: 19/19 md-to-html (16 + lima's 3), 20/20 guard. Now the flakiness concern — the byte-identical assertion. The determinism holds because `generatedAt` is `fs.statSync(input).mtime.toISOString()` — the **source file's mtime**, NOT wall-clock. Two CLI runs that don't touch the source read the same mtime → identical `generatedAt` → byte-identical. **The assertion is NOT flaky.** Confirmed by the test passing (it would intermittently fail if wall-clock-based, but it's mtime-pinned).

Let me verify the `html-report-render.mjs` change and one remaining coupling concern — whether `generatedAt` actually flows everywhere a timestamp appears (header AND footer), and the security/XSS axis on the meta injection.

### Assistant | 2026-05-19T01:04:57.607Z

[tool_use: Bash]

### User | 2026-05-19T01:05:01.508Z

[tool_result] === html-report-render.mjs: all timestamp/generatedAt sites ===
rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
13 matches in 5 files:

793:0:file path)
807:0:empty string OPT-IN suppresses the footer-note default (falsy "" still trigge...
808:0:deterministic timestamp
811:0:`generated by mdToHtml() at ${new Date().toISOString()}`;
scripts/lib/html-
... [+1554 chars truncated]

### Assistant | 2026-05-19T01:05:10.479Z

Confirmed: in `mdToHtml()`, both timestamp sites are covered — `generatedAt` (line 812, → header line 828) and `note` (line 811, → footer line ~834). With `md-to-html.mjs` passing both `generatedAt: inputMtime` and `note: ""`, **there is no residual `new Date()` in the output path**. True idempotency. The escaping at line 236 (`escapeHtml(generatedAt)`) is also present — XSS-safe on the timestamp.

Now the security axis on the meta injection. The `sourceHash` is `createHash(...).digest("hex")` — a 64-char hex string, **structurally incapable of containing `"` or `<`**. No user-controlled markdown content reaches the meta attribute (the hash is over bytes, the output is hex). The patch-sibling/root-doc regexes are anchored, no traversal (`[^\\/]+` in PATCH_FILE_RE prevents path segments; ROOT_DOC_RE is `^`-anchored exact). **Security: clean.**

Let me do the final coupling verification — the cross-renderer P0 — with a concrete end-to-end proof.

### Assistant | 2026-05-19T01:05:21.812Z

[tool_use: Bash]

### User | 2026-05-19T01:05:43.723Z

[tool_result] === P0 PROOF: does emit-all-spec-html.ts output a meta the guard's extractSourceHash can parse? ===
engine → meta-parsed: true  content-extracted: aaaaaa...
md-to-html → meta-parsed: true  content-extracted: bbbbbb...

=== Hash convention divergence: raw-bytes vs utf8-string (BOM-only divergence) ===
ASCII: raw==str? true (no divergence for clean UTF-8)
BOM:   raw==str? true (divergence if BOM pre
... [+332 chars truncated]

### Assistant | 2026-05-19T01:06:40.815Z

**P0 RESOLVED — the cross-renderer false-positive you flagged does NOT materialize:**

Both renderers (`SpecHTMLCompanionEngine` via emit-all-spec-html.ts for specs/research, and `md-to-html.mjs` for root-docs/patches) emit the **identical meta literal** `<meta name="prism-source-hash" content="<64hex>">`, and the guard's `extractSourceHash()` regex parses **both**. The hashed-bytes convention is also consistent for clean UTF-8 (the BOM-only divergence is mathematically real but: (a) **pre-existing** — `checkTwin`/`sha256` untouched by this changeset, introduced in `1c52388a62`; (b) **dormant** — no staged .md carries a BOM; and the Node test interestingly shows even BOM round-trips equal here because `Buffer.toString('utf8')` preserves the BOM bytes U+FEFF → re-encodes identically. The divergence only bites on *invalid* UTF-8, which spec files don't contain). **Not a P0, not introduced here.**

Now my independent findings, weighted toward what Arm A is less likely to have caught:

**P1 — Broadened ROOT_DOC target creates a guaranteed warn-noise on the repo's hottest file, with NO escape calibrated for it.**
`CLAUDE.html`'s embedded hash is **stale** (`a5c83903…` ≠ current `82afc3b8…`) and `MEMORY.html` has **no `prism-source-hash` meta at all** (it predates the meta injection). The moment any chat stages `CLAUDE.md` or `MEMORY.md` — which happens on nearly every doc-reflection commit per the standing 4-surface rule — the broadened guard fires DRIFT. It is **warn-only** (verified: guard lines 152-154 emit `continue:true`; block only under `PRISM_HTML_GUARD_BLOCK=1`), so it does not block the fleet. But: this is net-new advisory noise on the single most-frequently-committed file, and the only escape is the *global* `PRISM_HTML_GUARD=0` (kills the whole guard incl. valuable spec drift-detection) — there is no targeted knob to exempt root-docs while keeping spec coverage. **This changeset should not ship without first regenerating `CLAUDE.html` + `MEMORY.html` via `md-
... [+6486 chars truncated]
