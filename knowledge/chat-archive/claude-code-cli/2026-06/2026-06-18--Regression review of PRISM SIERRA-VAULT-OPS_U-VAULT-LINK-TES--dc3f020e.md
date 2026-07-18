---
type: "chat-session"
source: "claude-code-cli"
session_id: "dc3f020e-9a94-4310-adf2-a60d9533cfec"
title: "Regression review of PRISM SIERRA-VAULT-OPS/U-VAULT-LINK-TESTDERANK. Read both f"
date: "2026-06-18"
first_ts: "2026-06-18T14:45:28.570Z"
last_ts: "2026-06-18T14:48:31.456Z"
cwd: "H:\\prism-slot-sierra"
messages: 38
user_msgs: 15
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-a3c390fa94d1da015.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:11"
---

# Regression review of PRISM SIERRA-VAULT-OPS/U-VAULT-LINK-TESTDERANK. Read both f

> **claude-code-cli** | 2026-06-18 | 38 msgs (15 user / 23 assistant) | cwd: H:\prism-slot-sierra
> Raw: `H:/.claude/projects/H--prism-slot-sierra/dc3f020e-9a94-4310-adf2-a60d9533cfec/subagents/agent-a3c390fa94d1da015.jsonl`

## Transcript

### User | 2026-06-18T14:45:28.570Z

Regression review of PRISM SIERRA-VAULT-OPS/U-VAULT-LINK-TESTDERANK. Read both files:

1. H:/prism/scripts/vault-link-doctor.mjs (new `isTestDoc` helper ~line 110, extended canonical filter in `classifyBrokenTarget` ~line 197)
2. H:/prism/scripts/vault-link-doctor.test.mjs (3 new tests)

WHAT CHANGED: Adds a SECOND non-canonical bucket to the link-doctor's slug-collision derank. Existing: drop mirror/stub copies (galaxies/|triplet-stubs/|_legacy-root/). New: ALSO drop generated test-node docs (a `tests/` path segment, `isTestDoc`). Rationale: a `[[qdrant-memory-engine]]` link targets the engine, never `tests/qd/qdrantmemoryengine.md` which shares the slug only because it's named after the engine. The canonical filter at classifyBrokenTarget became `cands.filter(r => !isMirrorStub(r) && !isTestDoc(r))`. If that leaves exactly 1 -> HEALABLE; if it empties (all candidates are mirror/test) the existing `pool = canonical.length>0 ? canonical : cands` fallback keeps the full set (never heal to a non-canonical). LIVE: ambiguous broken links 15->10 (5 engine/action-vs-test pairs resolved); 32/32 tests pass.

VERIFY (cite file:line):
- `TEST_DOC_SUBDIR_RE = /(^|\/)tests?\//` matches `tests/` (and `test/`) as a PATH SEGMENT, not a 'tests' substring in a filename (`tests-overview.md` must be false). Confirm + check windows-backslash normalization.
- The empty-canonical fallback: when ALL candidates are tests/ (or all mirror), does it correctly stay DANGLING with the full candidate set rather than healing to nothing or crashing?
- The single-candidate path (cands.length===1) is BEFORE the derank -- so a unique tests/-only match still heals. Confirm that's intended + unchanged.
- Interaction with the sep-variant collapse (runs after, on the now-test-filtered canonical pool): any bad interaction? e.g. a case with [engine, tests/x] where engine+test are sep-variants -- test dropped first, so sep-variant sees only [engine] -> length 1 path. Fine?
- Could isTestDoc over-match a LEGI
... [+295 chars truncated]

### Assistant | 2026-06-18T14:45:31.482Z

I'll analyze both files carefully, focusing on the regression risks in the test-doc derank logic.

### Assistant | 2026-06-18T14:45:31.956Z

[tool_use: Read]

### Assistant | 2026-06-18T14:45:32.074Z

[tool_use: Read]

### User | 2026-06-18T14:45:34.885Z

[tool_result] 1	// Tests for scripts/vault-link-doctor.mjs -- the broken-wikilink classifier+healer.
2	// Pure-function units + a hermetic real-FS vault (tmp) exercising diagnose() +
3	// applyHeals() on real file IO, with mutation-proof rewrite assertions (a mass
4	// vault mutator must never corrupt a note).
5	
6	import { test } from "node:test";
7	import assert from "node:assert/strict";
8	import { mkdtempSy
... [+23896 chars truncated]

### User | 2026-06-18T14:45:35.158Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/vault-link-doctor.mjs
3	//
4	// Link-graph DOCTOR for the PRISM Obsidian vault (H:/prism/knowledge): diagnose
5	// every BROKEN [[wikilink]] (an authored link whose target does not resolve to a
6	// note), CLASSIFY it, and SAFELY heal only the high-confidence tier.
7	//
8	// WHY: the vault has ~19.6K broken link instances across ~14.8K notes, which is
9	// the ro
... [+26808 chars truncated]

### Assistant | 2026-06-18T14:45:37.455Z

Both files read end-to-end. Now let me verify the specific claims, including whether any legitimate canonical wiki doc lives under a `tests/` directory (the over-match risk), and confirm the regex behavior.

### Assistant | 2026-06-18T14:45:44.991Z

[tool_use: Bash]

### Assistant | 2026-06-18T14:45:46.091Z

[tool_use: Bash]

### User | 2026-06-18T14:45:48.103Z

[tool_result] Exit code 1
[eval]:3
const norm = (r) => String(r).replace(/\/g, "/");
                                      ^^^^^^^^

SyntaxError: missing ) after argument list
    at makeContextifyScript (node:internal/vm:185:14)
    at node:internal/process/execution:107:22
    at [eval]-wrapper:6:24
    at runScript (node:internal/process/execution:101:62)
    at evalScript (node:internal/process/exe
... [+77 chars truncated]

### User | 2026-06-18T14:45:52.754Z

[tool_result]   ...
# Subtest: diagnose: a broken link ONLY inside code is NOT HEALABLE (converges with apply)
ok 31 - diagnose: a broken link ONLY inside code is NOT HEALABLE (converges with apply)
  ---
  duration_ms: 3.3988
  ...
# Subtest: applyHeals: backupDir snapshots the ORIGINAL before mutating (reversibility)
ok 32 - applyHeals: backupDir snapshots the ORIGINAL before mutating (reversibility)
  ---
  
... [+129 chars truncated]

### Assistant | 2026-06-18T14:45:56.085Z

The shell mangled my backslash escape. Let me rewrite the regex test using a heredoc to avoid the escaping issue, and separately probe the live vault for any canonical doc under a `tests/` directory.

### Assistant | 2026-06-18T14:46:01.213Z

[tool_use: Bash]

### Assistant | 2026-06-18T14:46:03.053Z

[tool_use: Bash]

### User | 2026-06-18T14:46:05.071Z

[tool_result] Exit code 1
file:///C:/Users/wompu/AppData/Local/Temp/re-test.mjs:2
const norm = (r) => String(r).replace(/\/g, "/");
                                      ^^^^^^^^

SyntaxError: missing ) after argument list
    at compileSourceTextModule (node:internal/modules/esm/utils:338:16)
    at ModuleLoader.moduleStrategy (node:internal/modules/esm/translators:102:18)
    at #translate (node:intern
... [+205 chars truncated]

### User | 2026-06-18T14:46:09.715Z

[tool_result] === dirs literally named tests/ or test/ under knowledge/ ===
knowledge/wiki/architecture/tests
=== count of .md files under any tests/ or test/ segment in knowledge/ ===
4856

### Assistant | 2026-06-18T14:46:14.937Z

The temp file went to a Windows temp path and the heredoc backslash got eaten by the C:/ temp roundtrip. Let me write the test script directly into the repo tmp with explicit char-code construction to avoid escaping entirely, and crucially investigate that `knowledge/wiki/architecture/tests` directory — 4856 md files under tests/ segments is a large population that needs scrutiny.

### Assistant | 2026-06-18T14:46:21.071Z

[tool_use: Bash]

### Assistant | 2026-06-18T14:46:23.177Z

[tool_use: Bash]

### User | 2026-06-18T14:46:26.042Z

[tool_result] OK "wiki/architecture/tests/qd/qdrantmemoryengine.md" -> true (exp true)
OK "wiki/architecture/test/x.md" -> true (exp true)
OK "wiki/architecture/engines/memory/qdrantmemoryengine.md" -> false (exp false)
OK "wiki/architecture/tests-overview.md" -> false (exp false)
OK "memories\\architecture\\tests\\x.md" -> true (exp true)
OK "tests/root.md" -> true (exp true)
OK "test/root.md" -> true (exp tru
... [+337 chars truncated]

### User | 2026-06-18T14:46:32.258Z

[tool_result] === ALL dirs containing a tests/ or test/ path segment under knowledge/ ===
knowledge/wiki/architecture/tests/5a
knowledge/wiki/architecture/tests/a2
knowledge/wiki/architecture/tests/ab
knowledge/wiki/architecture/tests/ac
knowledge/wiki/architecture/tests/ad
knowledge/wiki/architecture/tests/ae
knowledge/wiki/architecture/tests/ag
knowledge/wiki/architecture/tests/agi
knowledge/wiki/architecture
... [+1918 chars truncated]

### Assistant | 2026-06-18T14:46:36.300Z

The regex is correct and segment-anchored. Now the critical question: that `knowledge/wiki/architecture/tests/` tree holds 4856 md files. The whole derank premise hinges on these being NON-canonical (test-node docs that only collide because they're named after a subject). Let me verify what these actually are and whether any `[[wikilink]]` legitimately targets them as their canonical home.

### Assistant | 2026-06-18T14:46:39.234Z

[tool_use: Bash]

### Assistant | 2026-06-18T14:46:41.813Z

[tool_use: Bash]

### User | 2026-06-18T14:46:49.628Z

[tool_result] === total md under wiki/architecture/tests/ ===
4856

=== sample file paths ===
knowledge/wiki/architecture/tests/5a/5axis-deep.md
knowledge/wiki/architecture/tests/a2/a2aprotocolengine.md
knowledge/wiki/architecture/tests/ab/abcclassificationformula.md
knowledge/wiki/architecture/tests/ab/abrasivejetmachiningengine.md
knowledge/wiki/architecture/tests/ab/abstraction-hierarchy-engine.md
knowledge/
... [+720 chars truncated]

### User | 2026-06-18T14:47:04.589Z

[tool_result] === content of two sample test-node docs ===
--- knowledge/wiki/architecture/tests/5a/5axis-deep.md ---
---
title: Test — 5AXIS-DEEP.test.ts
type: architecture
kind: test
test_path: mcp-server/src/__tests__/5AXIS-DEEP.test.ts
group: _5a
milestone: MILL-HARD-MS5 extended
it_count: 86
expect_count: 129
line_count: 962
generated_by: scripts/generate-test-wiki.mjs
last_verified: 2026-05-11
tags: [arch
... [+1403 chars truncated]

### Assistant | 2026-06-18T14:47:10.284Z

This confirms the derank premise. These `tests/` docs are auto-generated `kind: test` wiki nodes (`generated_by: scripts/generate-test-wiki.mjs`), titled `Test — <EngineName>.test.ts`, that share the engine's slug only because they are named after it. They are correctly non-canonical — a `[[engine-name]]` link targets the engine, not its test-wiki node.

Now let me verify the two most important correctness claims: (1) the empty-canonical fallback doesn't crash and stays DANGLING with the full set, and (2) the single-candidate path precedes the derank. Let me also confirm the test that exercises `frontmatter aliases` — whether a test doc's `target:` frontmatter field could create an alias collision that the derank handles.

### Assistant | 2026-06-18T14:47:21.441Z

[tool_use: Bash]

### User | 2026-06-18T14:47:25.149Z

[tool_result] [all-tests] DANGLING candidates=2 cands=["wiki/architecture/tests/a/onlytest.md","wiki/architecture/tests/b/onlytest.md"]
[1canon+2test] HEALABLE to=wiki/architecture/engines/eng.md deranked=true
[mirror+test,0canon] DANGLING candidates=2 cands=["memories/galaxies/mill/mix.md","wiki/architecture/tests/a/mix.md"]
[lone-test-single] HEALABLE to=wiki/architecture/tests/a/lonetest.md (single-cand path
... [+104 chars truncated]

### Assistant | 2026-06-18T14:47:29.207Z

All five logic probes behave exactly as the spec claims. Let me verify the two remaining points: that the single-candidate path is structurally before the derank (re-confirm line ordering) and run a quick live diagnose to confirm the claimed 15→10 ambiguous reduction is real, plus confirm the new tests are genuine (not stubs) by checking they would fail if the logic regressed.

### Assistant | 2026-06-18T14:47:37.688Z

[tool_use: Bash]

### Assistant | 2026-06-18T14:47:39.608Z

[tool_use: Bash]

### User | 2026-06-18T14:47:42.765Z

[tool_result] NEW behavior: HEALABLE wiki/architecture/engines/memory/qdrantmemoryengine.md deranked=true
Would-be OLD behavior: DANGLING (2 rivals) because tests/ doc not filtered -> test discriminates: true

### User | 2026-06-18T14:47:56.010Z

[tool_result] notes=69722 brokenLinks=6625 healable=208 derankedHeals=128 dangling=6417 ambiguous=10

### Assistant | 2026-06-18T14:47:59.903Z

Live run confirms `ambiguous=10`, matching the claimed 15→10 reduction. The new tests genuinely discriminate against the pre-change behavior. Let me do one final check on the `git diff` to confirm the change scope matches the description (no unexpected collateral edits) and verify the `git status` shows these are the only two files touched in this unit.

### Assistant | 2026-06-18T14:48:01.389Z

[tool_use: Bash]

### User | 2026-06-18T14:48:07.445Z

[tool_result] scripts/vault-link-doctor.mjs      | 26 ++++++++++++++++++++------
 scripts/vault-link-doctor.test.mjs | 30 +++++++++++++++++++++++++++++-
 2 files changed, 49 insertions(+), 7 deletions(-)
=== diff of the .mjs (logic file) ===
scripts/vault-link-doctor.mjs | 26 ++++++++++++++++++++------
 1 file changed, 20 insertions(+), 6 deletions(-)

--- Changes ---

scripts/vault-link-doctor.mjs
  @@ -109,6 
... [+2704 chars truncated]

### Assistant | 2026-06-18T14:48:31.456Z

The diff is exactly the described change — surgical, no collateral. Every verification point is confirmed. Here is my analyst verdict.

---

VERDICT: PASS

summary: The `isTestDoc`/`tests/` derank is a clean, fail-safe addition to an existing canonical-preference filter. The regex is correctly segment-anchored (not substring), the empty-canonical fallback stays DANGLING with the full set without crashing, the single-candidate path correctly precedes the derank (a unique tests/-only match still heals), and the new tests genuinely discriminate against pre-change behavior. Live run confirms the claimed 15→10 (measured 10) ambiguous reduction with zero new healable-to-test risk.

findings: none

Auditable trace of what I verified (file:line + live evidence):

- **Regex segment-anchoring** — `TEST_DOC_SUBDIR_RE = /(^|\/)tests?\//` at `scripts/vault-link-doctor.mjs:118`. Probed 15 cases: matches `tests/`+`test/` as a leading or mid-path segment (incl. Windows backslash via the `.replace(/\\/g,"/")` at line 120), and correctly rejects `tests-overview.md`, `contests/`, `testing/`, `latest/`, `tester/`, `b-tests/`, `unit-test/`, `my_tests/`, and bare `tests.md`. The `s?` makes it `tests` OR `test`; the trailing `/` forces a directory boundary so no substring-in-filename false positive is possible.

- **Empty-canonical fallback (no crash, stays DANGLING with full set)** — `classifyBrokenTarget` lines 205–214. When all candidates are tests/ (or all mirror), `canonical` is empty → both length checks (`===1`, `>1`) are skipped → `pool = canonical.length>0 ? canonical : cands` at line 213 falls back to the full `cands`, returns `{cls:"DANGLING", cands}`. Probed `[all-tests]` and `[mirror+test, 0 canonical]` — both DANGLING with the original 2-candidate set, never a heal-to-test, never undefined/crash.

- **Single-candidate path precedes the derank (intended, unchanged)** — line 195 (`cands.length===1 → HEALABLE`) executes before the `cands.length>1` derank block at line 196. Conf
... [+2195 chars truncated]
