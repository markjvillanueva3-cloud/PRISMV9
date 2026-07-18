---
type: "chat-session"
source: "claude-code-cli"
session_id: "6a8a0fc5-4275-43b0-b847-449c590c706b"
title: "Independent second-pass review (analyst) of a cohesive change (slot:xray, U-XRAY"
date: "2026-06-23"
first_ts: "2026-06-23T06:23:36.940Z"
last_ts: "2026-06-23T06:27:05.808Z"
cwd: "H:\\prism"
messages: 58
user_msgs: 21
assistant_msgs: 37
raw_file: "H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-afdd487eb1a08548d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:14"
---

# Independent second-pass review (analyst) of a cohesive change (slot:xray, U-XRAY

> **claude-code-cli** | 2026-06-23 | 58 msgs (21 user / 37 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/6a8a0fc5-4275-43b0-b847-449c590c706b/subagents/agent-afdd487eb1a08548d.jsonl`

## Transcript

### User | 2026-06-23T06:23:36.940Z

Independent second-pass review (analyst) of a cohesive change (slot:xray, U-XRAY-GDT-DOMAIN-TAG). Do NOT assume another reviewer caught everything. Read all THREE files; grade PASS/FAIL with P0/P1/P2 + file:line. Weighted toward SILENT BREAKAGE, regression risk, integration coupling.

UNIT: parameterize the PDF text extractor's hardcoded domain:"milling" so GD&T-corpus drops tag as gdt (not milling); milling/default path stays byte-identical. `deriveDomainTopic` resolves: explicit --domain wins; blueprint-gdt-corpus path -> gdt; else milling.

FILES:
1. H:/prism/scripts/lib/pdf-parse-extract-helpers.mjs
2. H:/prism/scripts/pdf-parse-extract.mjs
3. H:/prism/scripts/lib/pdf-parse-extract-helpers.test.mjs

SPECIFICALLY HUNT FOR:
- REGRESSION: any consumer of the milling tribal jsonl (`whiskey-milling-oop-*.jsonl`) or the milling tribal row id (`whiskey-mill-oop-*`) or the wiki frontmatter -- does the milling path remain byte-identical so they are unaffected? Trace `generate-milling-extracted-pdf-bridge.mjs` + any reader of these. Confirm gdt rows landing in a SEPARATE `pdf-extract-gdt-*.jsonl` won't be missed by a consumer that only globs the milling file (is that a feature or a gap?).
- The bridge_engines field is now conditionally added AFTER the row object literal for milling only. Confirm JSON.stringify key order is unchanged for milling (bridge_engines last) and the field is absent (not null/empty) for gdt.
- buildOutputDescriptor: for a non-milling domain with weird characters in the domain string, could the jsonl filename break? (domain comes from --domain or the hardcoded "gdt" -- assess injection/path-safety.)
- extractOne: record.domain/topic added -- does any other consumer of the extractOne record shape break? Does the dry-run path (which never calls extractOne) still work?
- deriveDomainTopic: explicit empty-string domain ("") -> falsy -> falls through to path derivation (is that intended/safe)? topic default "general" for explicit-domain-without-topic.
- 
... [+148 chars truncated]

### Assistant | 2026-06-23T06:23:41.034Z

I'll analyze this change methodically. Let me read all three files first.

### Assistant | 2026-06-23T06:23:41.961Z

[tool_use: Read]

### Assistant | 2026-06-23T06:23:42.451Z

[tool_use: Read]

### Assistant | 2026-06-23T06:23:42.612Z

[tool_use: Read]

### User | 2026-06-23T06:23:42.822Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\pdf-parse-extract-helpers.mjs' was already read 11s ago in this session and is unchanged (mtime 1782195640551). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T06:23:43.299Z

[tool_result] read-once-guard: 'H:\prism\scripts\pdf-parse-extract.mjs' was already read 11s ago in this session and is unchanged (mtime 1782195688005). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-06-23T06:23:43.450Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\pdf-parse-extract-helpers.test.mjs' was already read 11s ago in this session and is unchanged (mtime 1782195746221). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACH
... [+4 chars truncated]

### Assistant | 2026-06-23T06:23:47.010Z

The read-once guard says they're in context, but I don't actually see them. Let me bypass the cache to get the real content.

### Assistant | 2026-06-23T06:23:47.651Z

[tool_use: Read]

### User | 2026-06-23T06:23:49.343Z

[tool_result] 0	/**
1	 * pdf-parse-extract-helpers.mjs — pure helpers for scripts/pdf-parse-extract.mjs
2	 *
3	 * Bridges the pdftotext-missing gap (no system binary) by using the pdf-parse npm
4	 * package already present in mcp-server/node_modules. Emits batch-stub-quality
5	 * wiki entries (confidence 0.3, needs_curation true) + tribal jsonl rows so the
6	 * downstream curator surfaces them as candidates.
7	
... [+15080 chars truncated]

### Assistant | 2026-06-23T06:23:51.864Z

Now the main extractor script and the test file.

### Assistant | 2026-06-23T06:23:52.810Z

[tool_use: Read]

### Assistant | 2026-06-23T06:23:53.619Z

[tool_use: Read]

### User | 2026-06-23T06:23:54.381Z

[tool_result] 0	#!/usr/bin/env node
1	/**
2	 * pdf-parse-extract.mjs — pdftotext-free PDF extractor (uses mcp-server/node_modules/pdf-parse).
3	 *
4	 * Fallback for when the `pdftotext` binary is missing on the host (Windows often
5	 * lacks it). Walks a small, operator-curated set of top-priority milling
6	 * order-of-operations PDFs from H:/PRISM/resources/RESOURCE PDFS/, extracts
7	 * first N pages via pdf-p
... [+7041 chars truncated]

### User | 2026-06-23T06:23:54.987Z

[tool_result] 0	/**
1	 * Tests for pdf-parse-extract-helpers.mjs — node:test, no external deps.
2	 * @slot whiskey
3	 * @date 2026-05-25
4	 */
5	import test from "node:test";
6	import assert from "node:assert/strict";
7	import {
8	  parseArgs,
9	  pdfPathToSlug,
10	  chooseTargets,
11	  harvestStructure,
12	  formatTribalJsonl,
13	  formatWikiMarkdown,
14	  buildOutputDescriptor,
15	  classifyPdfExtraction,
16	
... [+19258 chars truncated]

### Assistant | 2026-06-23T06:24:00.253Z

Now let me trace the consumers. The critical regression question: does the milling tribal jsonl / row id / wiki frontmatter stay byte-identical, and do consumers of the milling jsonl miss gdt rows (feature or gap)?

### Assistant | 2026-06-23T06:24:01.220Z

[tool_use: Grep]

### Assistant | 2026-06-23T06:24:01.644Z

[tool_use: Grep]

### User | 2026-06-23T06:24:11.150Z

[tool_result] Found 17 files
state\shared\dashboards\injection-dedup-cache.json
scripts\lib\pdf-parse-extract-helpers.mjs
knowledge\memories\reference\reference_orphan_augmentation_dangling_diagnosis_2026_06_10.md
knowledge\memories\reference\reference_mill_domain_atlas_for_foxtrot_2026_05_27.md
state\shared\galaxy-cards\pdf-corpus-mill.card.md
state\shared\galaxy-cards\ALL-CARDS.md
scripts\generate-milling-tri
... [+547 chars truncated]

### User | 2026-06-23T06:24:11.258Z

[tool_result] Found 60 files limit: 60
scripts\lib\pdf-parse-extract-helpers.test.mjs
scripts\pdf-parse-extract.mjs
scripts\lib\pdf-parse-extract-helpers.mjs
knowledge\memories\reference\reference_xray_gdt_corpus_scan_route_2026_06_23.md
knowledge\memories\reference\reference_whiskey_lathe_design_memo_verification_checklist_2026_05_27.md
knowledge\memories\reference\reference_whiskey_lathe_complete_asset_map_20
... [+3361 chars truncated]

### Assistant | 2026-06-23T06:24:13.710Z

Let me read the milling bridge consumer to confirm exactly what it globs and parses.

### Assistant | 2026-06-23T06:24:14.188Z

[tool_use: Read]

### User | 2026-06-23T06:24:15.052Z

[tool_result] read-once-guard: 'H:\prism\scripts\generate-milling-extracted-pdf-bridge.mjs' was already read 35s ago in this session and is unchanged (mtime 1781331557876). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_C
... [+7 chars truncated]

### Assistant | 2026-06-23T06:24:19.250Z

The cache guard is blocking but I don't actually have the content. Let me disable the cache.

### Assistant | 2026-06-23T06:24:19.989Z

[tool_use: Bash]

### User | 2026-06-23T06:24:24.353Z

[tool_result] #!/usr/bin/env node
/**
 * generate-milling-extracted-pdf-bridge.mjs — bridges the 68 extracted
 * milling PDF wiki entries (whiskey slot output) to peer-echo's L10
 * jm-die-tribal-wiki-corpus nodes via /system-viz augmentation.
 *
 * Source: H:/prism-slot-whiskey/state/shared/extracted-pdfs/whiskey-milling-oop-*.jsonl
 *         (one row per extraction run; each carries slug, page_count, heading
... [+4953 chars truncated]

### Assistant | 2026-06-23T06:24:28.634Z

This confirms the key consumer behavior. The milling bridge globs `whiskey-milling-*` files and parses lines that have `pdf_path`. Let me verify the other consumers that glob the extracted-pdfs dir, particularly any that consume ALL files vs only milling, and the pdf-corpus-mill features generators.

### Assistant | 2026-06-23T06:24:30.370Z

[tool_use: Grep]

### User | 2026-06-23T06:24:32.676Z

[tool_result] H:\prism\scripts\batch-pdf-extract.mjs-5- * For each pending PDF (per iter43 coverage roost), runs pdftotext on the first
H:\prism\scripts\batch-pdf-extract.mjs-6- * N pages, harvests a heuristic "title + section anchor" tip, and emits a stub
scripts\batch-pdf-extract.mjs:7: * jsonl entry to state/shared/extracted-pdfs/batch-<batch>.jsonl. These show up
H:\prism\scripts\batch-pdf-extract.mjs-8- * 
... [+10354 chars truncated]

### Assistant | 2026-06-23T06:24:41.312Z

This is the critical finding for the "feature or gap" question. There are TWO classes of consumer of the `extracted-pdfs` directory:

1. **`generate-milling-extracted-pdf-bridge.mjs`** — globs ONLY `whiskey-milling-*` files (line 42). A gdt file named `pdf-extract-gdt-*.jsonl` is **silently skipped** by this consumer. That's intended (the bridge is milling-specific, wiring to milling L10 nodes).

2. **`generate-extracted-pdf-tips-features.mjs`**, **`generate-pdf-coverage-features.mjs`** — glob `extracted-pdfs/*.jsonl` (ALL files). These WILL pick up the new `pdf-extract-gdt-*.jsonl` rows. Let me check whether they depend on milling-specific fields (`bridge_engines`, `source.book`, `audience`, `topic`) that the gdt row shape omits — that's a potential silent break.

### Assistant | 2026-06-23T06:24:41.673Z

[tool_use: Read]

### User | 2026-06-23T06:24:43.025Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * generate-extracted-pdf-tips-features.mjs — system-viz augmentation: extracted-pdf tribal-tips roost.
4	 *
5	 * Pattern: same as generate-cadcam-training-corpus-features.mjs (india iter25).
6	 *
7	 * Walks `state/shared/extracted-pdfs/*.jsonl` (each line = a tribal tip with
8	 * source.book + topic + bridge_engines + audience). Emits:
9	 *   - one parent roost `ghos
... [+8682 chars truncated]

### Assistant | 2026-06-23T06:24:50.848Z

This is important. `generate-extracted-pdf-tips-features.mjs::parseTipsJsonl` (line 58) only pushes a row if it has both `id` AND `tip` string fields. The pdf-parse-extract rows (both milling and gdt) have NO `tip` field — they have `headings_sample`, `first_paragraph`, etc. So this consumer ALREADY skips ALL pdf-parse-extract rows (milling and gdt alike). The gdt addition doesn't change that — it was never reading these rows. No regression, no new coupling. Good.

Now `generate-pdf-coverage-features.mjs` — it determines "extracted" status by whether a tip cites `pdf_path`. Let me check if it requires the milling row shape specifically, and whether gdt rows would change coverage status (could be a feature or an unintended effect).

### Assistant | 2026-06-23T06:24:51.480Z

[tool_use: Read]

### User | 2026-06-23T06:24:52.795Z

[tool_result] 52	
53	/** Pure: normalize a path (Windows backslash → forward, lowercase drive letter). */
54	export function normalizePath(p) {
55	  if (!p || typeof p !== "string") return "";
56	  return p.replace(/\\/g, "/").replace(/^([a-z]):/i, (_, d) => d.toUpperCase() + ":");
57	}
58	
59	/** Pure: parse one jsonl line → tip object (or null on bad input). */
60	export function parseTipLine(line) {
61	  if 
... [+4570 chars truncated]

### Assistant | 2026-06-23T06:25:02.809Z

`generate-pdf-coverage-features.mjs::parseTipLine` (line 64) requires `id` + `source.pdf_path`. The pdf-parse-extract rows DO carry both `id` and `source.pdf_path` (helpers lines 231, 244-246). So this consumer reads these rows from the local `state/shared/extracted-pdfs` dir today and will continue to. A gdt row would mark its `source.pdf_path` as "extracted" in coverage — which is correct/benign (a gdt PDF that got extracted IS covered). No regression; the milling path output is byte-identical so milling coverage is unchanged.

Important note: these two consumers read the LOCAL `H:/prism/state/shared/extracted-pdfs/`, while the milling bridge reads `H:/prism-slot-whiskey/state/shared/extracted-pdfs/`. The extractor's `outRoot` default is `H:/prism-slot-whiskey`, so live runs land in the whiskey tree consumed by the bridge. The coverage/tips consumers reading the H:/prism tree see whatever was placed there. Either way, output shape is what matters, and it's unchanged for milling.

Now let me verify the byte-identical claim concretely by running the actual milling-path code and confirming JSON key order + that gdt produces a separate file. Also verify the path-safety concern on `buildOutputDescriptor` for weird domain strings.

### Assistant | 2026-06-23T06:25:14.815Z

[tool_use: Bash]

### User | 2026-06-23T06:25:18.861Z

[tool_result] LEGACY KEYS: schema_version,id,pdf_path,domain,topic,confidence,needs_curation,extraction_quality,extracted_at,extractor,title,pages_extracted,headings_sample,first_paragraph,source,bridge_engines
LEGACY bridge_engines last?: bridge_engines
WITH-DOMAIN == LEGACY?: true
GDT KEYS: schema_version,id,pdf_path,domain,topic,confidence,needs_curation,extraction_quality,extracted_at,extractor,title,pages_
... [+872 chars truncated]

### Assistant | 2026-06-23T06:25:32.032Z

This empirically confirms the core findings and surfaces the one real defect:

**Confirmed safe:**
- Milling row is byte-identical whether `domain` is absent (legacy) or explicitly `"milling"` (`WITH-DOMAIN == LEGACY?: true`). `bridge_engines` is last in key order. The milling tribal row id `whiskey-mill-oop-*`, milling jsonl filename `whiskey-milling-oop-*`, and wiki frontmatter all unchanged. Bridge consumer + milling-tip-bridge-features + post-pdf-corpus consumers are unaffected.
- gdt row omits `bridge_engines` entirely (`false`, not null/empty). gdt id is `pdf-gdt-y14-5`, lands in `pdf-extract-gdt-*.jsonl`. The milling bridge's `startsWith("whiskey-milling-")` filter correctly skips it — that's the intended feature (gdt rows wire to xray/delta, not milling L10 nodes).
- The two ALL-files consumers (`generate-extracted-pdf-tips-features` requires a `tip` field these rows lack → already skipped both milling+gdt; `generate-pdf-coverage-features` requires `id`+`source.pdf_path` which both shapes carry → benign, gdt just marks its own PDF covered).
- `deriveDomainTopic("")` explicit empty falls through to path derivation (gdt resolved from path) — intended and documented.

**The real defect — path injection / traversal in `buildOutputDescriptor`:** an explicit `--domain` with `/`, `..`, or unsafe chars flows UNVALIDATED into the jsonl filename:
- `--domain "../../etc/passwd"` → `pdf-extract-../../etc/passwd-2026-06-23.jsonl` → escapes the `extracted-pdfs` dir; `ensureDir`+`appendFileSync` will write outside the intended directory (path traversal).
- `--domain "a/b"` → creates a `pdf-extract-a` subdirectory.
- `--domain "weird domain!"` → space + `!` in a filename.

Let me confirm the slug path is already hardened (so the gap is specifically the new domain field), and check whether `--domain` is operator-only or could carry untrusted input (e.g. the corpus watcher referenced in the handoff).

### Assistant | 2026-06-23T06:25:33.769Z

[tool_use: Grep]

### User | 2026-06-23T06:25:36.296Z

[tool_result] .claude\scripts\tribal-tier2-precontext.mjs:22: *   node tribal-tier2-precontext.mjs --domain mill --task "thin wall chatter"
.claude\scripts\tribal-tier2-precontext.mjs:23: *   node tribal-tier2-precontext.mjs --domain wedm --task "..." --json
.claude\scripts\tribal-tier2-precontext.mjs:24: *   node tribal-tier2-precontext.mjs --domain mill --task "..." --k 5
.claude\scripts\tribal-tier2-preconte
... [+5258 chars truncated]

### Assistant | 2026-06-23T06:25:43.465Z

Let me check the corpus watcher cron, since the handoff says xray was working on durably logging per-PDF lane from the corpus watcher — this is the key question of whether `--domain` could ever carry untrusted input (path-derived domain is always "gdt" or "milling", but if the watcher passes a derived `--domain` from a filename, traversal becomes reachable).

### Assistant | 2026-06-23T06:25:44.143Z

[tool_use: Read]

### User | 2026-06-23T06:25:45.368Z

[tool_result] 1	# install-pdf-corpus-watcher-cron.ps1 — U-VICTOR-C3
2	# Periodic sweep of resources/ + JM DIE/ for new/modified PDFs. Closes the
3	# "operator manually compiles new PDFs" gap noted in [[feedback_enumerate_before_read]].
4	#
5	# Cadence: every 15min (more than fast enough for human-scale PDF drops).
6	# Default: --dry-run (log-only). Operator flips to --extract via the
7	# downstream pdf-parse-ex
... [+3538 chars truncated]

### Assistant | 2026-06-23T06:25:50.325Z

The watcher cron invokes `pdf-corpus-watcher-sweep.mjs --extract`. Let me confirm whether that sweep passes a `--domain` derived from the PDF filename/path (which would make the traversal reachable from untrusted file drops), or relies on `deriveDomainTopic`'s path-based resolution (always "gdt"/"milling", safe).

### Assistant | 2026-06-23T06:25:52.145Z

[tool_use: Grep]

### User | 2026-06-23T06:25:53.996Z

[tool_result] 19- *      `state/shared/dashboards/pdf-watcher-log.jsonl`
20- *   4. Update the seen-state
21: *   5. By default, log-only (operator triggers `pdf-parse-extract` via
22- *      `--extract` flag, or via a downstream skill that consumes the log).
23- *
24- * Modes:
25- *   --dry-run (default)  — scan + log diff; do not extract
26: *   --extract            — invoke pdf-parse-extract.mjs on each new 
... [+2013 chars truncated]

### Assistant | 2026-06-23T06:26:03.112Z

This resolves the path-safety severity. The watcher invokes `pdf-parse-extract.mjs --file <pdf> --pages 40` with NO `--domain` flag (line 266). So in the automated/untrusted path, `opts.domain` is always `null`, and `deriveDomainTopic` resolves domain from the PATH to either `"gdt"` (hardcoded literal) or `"milling"` (hardcoded literal) — both safe, both fixed strings. The unsafe domain value can ONLY come from an explicit operator-supplied `--domain` CLI flag.

So the path-traversal in `buildOutputDescriptor` is **operator-only-reachable** (a self-inflicted footgun, not an untrusted-input vuln). It downgrades from P1 to P2 — but it's still a real defect: an explicit `--domain "cad/cam"` silently writes to an unintended subdirectory, and `--domain ".."` escapes the dir. The unit's own design lists `--domain` as a first-class supported flag, and `pdfPathToSlug`/`safeSlug` elsewhere in this exact pipeline already sanitize, so the missing sanitization on `domain` is an inconsistency worth flagging.

Let me run the test suite to confirm the oracle strength (would tests pass if `deriveDomainTopic` always returned milling — the gdt tests must fail).

### Assistant | 2026-06-23T06:26:04.113Z

[tool_use: Bash]

### User | 2026-06-23T06:26:08.577Z

[tool_result]   ...
# Subtest: formatWikiMarkdown gdt: frontmatter domain/topic = gdt, NO Bridge engines section
ok 48 - formatWikiMarkdown gdt: frontmatter domain/topic = gdt, NO Bridge engines section
  ---
  duration_ms: 0.2314
  ...
# Subtest: formatWikiMarkdown back-compat: no domain -> milling frontmatter + Bridge engines section
ok 49 - formatWikiMarkdown back-compat: no domain -> milling frontmatter + B
... [+358 chars truncated]

### Assistant | 2026-06-23T06:26:13.148Z

50/50 pass. Now let me verify the oracle would actually FAIL if `deriveDomainTopic` were broken to always return milling — the test must be a real intent-test (R9), not a tautology.

### Assistant | 2026-06-23T06:26:20.777Z

[tool_use: Bash]

### User | 2026-06-23T06:26:25.317Z

[tool_result] node:fs:441
    return binding.readFileUtf8(path, stringToFlags(options.flag));
                   ^

Error: ENOENT: no such file or directory, open 'C:\tmp\helpers-mut.mjs'
    at Object.readFileSync (node:fs:441:20)
    at [eval]:3:10
    at runScriptInThisContext (node:internal/vm:209:10)
    at node:internal/process/execution:118:14
    at [eval]-wrapper:6:24
    at runScript (node:i
... [+955 chars truncated]

### Assistant | 2026-06-23T06:26:29.922Z

The `cd /tmp` (a Git-Bash path) maps to `C:\tmp` under Node, which doesn't exist as expected. Let me use a concrete Windows temp dir and absolute paths.

### Assistant | 2026-06-23T06:26:37.234Z

[tool_use: Bash]

### User | 2026-06-23T06:26:41.966Z

[tool_result] mutated deriveDomainTopic -> always milling
not ok 41 - deriveDomainTopic: blueprint-gdt-corpus path -> gdt (slash + backslash + case)
not ok 43 - deriveDomainTopic: explicit domain wins; explicit topic honored
# tests 50
# pass 48
# fail 2
---cleanup---

### Assistant | 2026-06-23T06:27:05.808Z

The oracle is genuine (R9-compliant). When `deriveDomainTopic` is mutated to always return milling, exactly the two gdt-discriminating tests fail (test 41: gdt-path-to-gdt, test 43: explicit-domain-wins). The tests would NOT pass if `deriveDomainTopic` always returned milling — they encode real intent. The temp dir is cleaned up.

Note: the `formatTribalJsonl`/`formatWikiMarkdown`/`buildOutputDescriptor` gdt tests (46/48/50) still passed under the mutation because they feed `domain:"gdt"` directly on the record (testing the formatters independent of the resolver) — that's correct separation, and tests 41+43 cover the resolver itself.

I have traced all consumers and verified the core claims empirically. Final assessment.

---

VERDICT: PASS

summary: The milling path is provably byte-identical — a milling tribal row is identical whether `domain` is absent (legacy callers) or explicitly `"milling"` (the new extractOne flow), with `bridge_engines` preserved as the last key; the milling jsonl filename (`whiskey-milling-oop-*`), row id (`whiskey-mill-oop-*`), and wiki frontmatter are unchanged, so every milling consumer is unaffected. gdt rows correctly land in a separate `pdf-extract-gdt-*.jsonl`, omit `bridge_engines` entirely (absent, not null), and the milling bridge's `startsWith("whiskey-milling-")` filter intentionally skips them. The one real defect is unsanitized injection of an explicit `--domain` value into the output jsonl filename — but it is operator-CLI-only-reachable (the automated watcher passes no `--domain`, and path-derived domains are the fixed literals "gdt"/"milling"), so it is a P2 footgun, not a P0/P1 silent break.

findings:
- [P2] H:/prism/scripts/lib/pdf-parse-extract-helpers.mjs:327-329 (`buildOutputDescriptor`) and 231 (`formatTribalJsonl` id) -- an explicit `--domain` containing `/`, `..`, or shell/path-unsafe chars flows UNVALIDATED into the jsonl filename. Verified live: `--domain "../../etc/passwd"` -> `pdf-extract-../../etc/passwd-...j
... [+2164 chars truncated]
