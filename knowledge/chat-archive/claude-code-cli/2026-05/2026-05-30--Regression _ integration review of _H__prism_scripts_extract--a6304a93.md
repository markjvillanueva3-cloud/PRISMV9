---
type: "chat-session"
source: "claude-code-cli"
session_id: "a6304a93-9f8f-4616-b0a9-eaf94b272d80"
title: "Regression + integration review of `H:/prism/scripts/extract-monolith-databases."
date: "2026-05-30"
first_ts: "2026-05-30T15:19:36.561Z"
last_ts: "2026-05-30T15:24:12.205Z"
cwd: "H:\\prism-slot-juliett"
messages: 51
user_msgs: 18
assistant_msgs: 33
raw_file: "H:/.claude/projects/H--prism-slot-juliett/a6304a93-9f8f-4616-b0a9-eaf94b272d80/subagents/agent-afcc06590f584f9bf.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:58"
---

# Regression + integration review of `H:/prism/scripts/extract-monolith-databases.

> **claude-code-cli** | 2026-05-30 | 51 msgs (18 user / 33 assistant) | cwd: H:\prism-slot-juliett
> Raw: `H:/.claude/projects/H--prism-slot-juliett/a6304a93-9f8f-4616-b0a9-eaf94b272d80/subagents/agent-afcc06590f584f9bf.jsonl`

## Transcript

### User | 2026-05-30T15:19:36.561Z

Regression + integration review of `H:/prism/scripts/extract-monolith-databases.mjs` (read the whole file). Weight toward silent breakage, regression risk, resource safety, and downstream-consumer integration — things a correctness or integrity reviewer might miss.

It writes mcp-server/data/prism-reference-db/<category>.json bundles (one per category) + MANIFEST.json + README.md, extracted from the PRISM monolith HTML/JS sources. Consumers: the hotel (ERP), charlie (quoting), echo (post) chat slots will READ these bundles. Default dry-run; `--apply` writes; uses atomicWriteJson/atomicWriteText from scripts/lib/atomic-json.mjs for MANIFEST+README only, and tmp+rename for bundles.

FOCUS:
1. **Resource safety** — reads a 46MB + 11MB HTML fully + ~1713 files into memory; holds all store JSON strings (≈26MB) in a Map; builds per-category bundle strings. Any OOM / unbounded growth? The `MAX_EVAL_BYTES=8MB` cap on vm-eval — is it positioned to actually prevent the expensive compile (BEFORE the try)? ReDoS in ASSIGN_RE / STORE_KEYWORDS / CATEGORY_RULES over multi-MB input?
2. **Concurrency/idempotency** — re-running `--apply` over an existing prism-reference-db: does it cleanly overwrite (tmp+rename per bundle)? Stale bundles from a category that no longer exists would linger — is that a problem? (The author hit a multi-process write race earlier; confirm a single run is self-consistent.)
3. **Consumer contract** — is the bundle shape (`{category, count, stores:{<NAME>:<data>}}`) + MANIFEST (name→category→bundle→recordCount) a clean, documented contract for hotel/charlie/echo to consume? Is README accurate vs actual output?
4. **Path/filename safety on Windows/NTFS** — category names are a fixed internal set (safe); bundle filenames are `<category>.json`. Confirm no traversal/reserved-name risk.
5. **Cross-ref correctness** — `crossRef` vs src/data basenames is clearly ADVISORY and MANIFEST states nothing overwritten? Any chance the script writes into src/data?
6. **Regre
... [+550 chars truncated]

### Assistant | 2026-05-30T15:19:45.281Z

I'll review the script thoroughly. Let me start by reading the whole file plus its key dependency.

### Assistant | 2026-05-30T15:19:45.736Z

[tool_use: Read]

### Assistant | 2026-05-30T15:19:45.904Z

[tool_use: Read]

### User | 2026-05-30T15:19:48.067Z

[tool_result] read-once-guard: 'H:\prism\scripts\extract-monolith-databases.mjs' was already read 28s ago in this session and is unchanged (mtime 1780154109327). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-30T15:19:48.234Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\atomic-json.mjs' was already read 18s ago in this session and is unchanged (mtime 1779198413736). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-30T15:19:51.128Z

The read-once guard says both files are already in my context, but I don't actually see their contents in this conversation — the guard is mistaken about my context window. Let me bypass the cache to actually read them.

### Assistant | 2026-05-30T15:19:52.249Z

[tool_use: Bash]

### User | 2026-05-30T15:19:58.665Z

[tool_result] 20

### Assistant | 2026-05-30T15:20:01.196Z

Let me read the file directly with the cache disabled via the Read tool's documented escape hatch.

### Assistant | 2026-05-30T15:20:01.879Z

[tool_use: Bash]

### User | 2026-05-30T15:20:05.090Z

[tool_result] 574 extract-monolith-databases.mjs
115 lib/atomic-json.mjs
Σ 689

### Assistant | 2026-05-30T15:20:08.953Z

The Read tool's guard is blocking me even though the content isn't in my context. Let me set the env var for the session and use Read, or just cat the file contents directly.

### Assistant | 2026-05-30T15:20:09.547Z

[tool_use: Bash]

### User | 2026-05-30T15:20:15.858Z

[tool_result] <persisted-output>
Output too large (34.7KB). Full output saved to: C:\Users\wompu\.claude\projects\H--prism-slot-juliett\a6304a93-9f8f-4616-b0a9-eaf94b272d80\tool-results\btczv7f76.txt

Preview (first 2KB):
  1 │ #!/usr/bin/env node
  2 │ // extract-monolith-databases.mjs — deterministic extractor for EVERY data-store literal
  3 │ // embedded in the non-modular PRISM monolith HTMLs + the already
... [+1807 chars truncated]

### Assistant | 2026-05-30T15:20:17.579Z

The output was saved to a file. Let me read it directly.

### Assistant | 2026-05-30T15:20:18.352Z

[tool_use: Read]

### User | 2026-05-30T15:20:21.204Z

[tool_result] 1	  1 │ #!/usr/bin/env node
2	  2 │ // extract-monolith-databases.mjs — deterministic extractor for EVERY data-store literal
3	  3 │ // embedded in the non-modular PRISM monolith HTMLs + the already-split .js modules.
4	  4 │ //
5	  5 │ // WHY: the operator asked to "extract all other databases other than tooling … assume I want
6	  6 │ // the whole neighborhood: inserts, fixtures, materials, mach
... [+35615 chars truncated]

### Assistant | 2026-05-30T15:20:24.326Z

Now I have the full script. Let me read the atomic-json.mjs dependency to verify the write semantics, and check a few empirical facts about the actual output and source corpus.

### Assistant | 2026-05-30T15:20:24.867Z

[tool_use: Bash]

### User | 2026-05-30T15:20:32.087Z

[tool_result]   1 │ /**
  2 │  * atomic-json.mjs — the single canonical atomic JSON writer for PRISM scripts.
  3 │  *
  4 │  * U-ROADMAP-INDEX-WRITER-CONSOLIDATE (2026-05-19): collapses the five
  5 │  * independent roadmap-index.json writers (reconcile-milestones.mjs,
  6 │  * register-devtools-roadmap-envelopes.mjs, register-revenue-roadmap-
  7 │  * envelopes.mjs, reconcile-roadmap-drift.mjs, close-out-mile
... [+5825 chars truncated]

### Assistant | 2026-05-30T15:20:37.438Z

Now let me verify empirical facts against the actual output tree and confirm the MANIFEST shape and the parse-error fallback behaviors.

### Assistant | 2026-05-30T15:20:39.707Z

[tool_use: Bash]

### Assistant | 2026-05-30T15:20:42.290Z

[tool_use: Bash]

### User | 2026-05-30T15:20:44.091Z

[tool_result] MANIFEST.json  1.0M
README.md  1.8K
abrasives.json  599B
cad.json  4.7M
coatings.json  8.0K
controllers.json  344.2K
coolants.json  76.1K
cost.json  297.0K
holders.json  1.4M
inserts.json  24.6K
machines.json  1.9M
materials.json  9.0M
other.json  4.3M
physics.json  888.1K
post.json  125.0K
process.json  640.2K
safety.json  246.7K
tools.json  661.9K
workholding.json  132.9K
---STALE-TMP---
(none i
... [+14 chars truncated]

### User | 2026-05-30T15:20:46.031Z

[tool_result] bundlesWritten 17 storesWritten 1859 writeErrorCount 0 storesExtracted 1859 storesFailed 1066
byCategory keys [
  'other',       'machines',
  'controllers', 'materials',
  'workholding', 'cad',
  'process',     'post',
  'physics',     'holders',
  'tools',       'cost',
  'inserts',     'coatings',
  'abrasives',   'coolants',
  'safety'
]
sample store {"name":"WATERJET_ABRASIVES","category":"ab
... [+212 chars truncated]

### Assistant | 2026-05-30T15:20:50.406Z

17 bundles, 1859 stores, 0 write errors, 1066 failed — matches the empirical claims. Note `materials.json` is 9.0MB and `other.json` is 4.3MB — large but each is a single file. Let me verify a few specific concerns: the `m.index` undefined risk on `matchAll`, the validity of the `cad.json` JSON (4.7MB bundle from concatenation), and whether re-running `--apply` leaves stale bundles. Let me also confirm the `--limit` partial-run-then-apply hazard.

### Assistant | 2026-05-30T15:20:53.955Z

[tool_use: Bash]

### User | 2026-05-30T15:20:57.351Z

[tool_result] valid-json-files 18 invalid 0
cad bundle: category cad count 164 stores-keys 164 count===keys? true

### Assistant | 2026-05-30T15:21:01.360Z

All 18 JSON files valid (17 bundles + MANIFEST), and `count === Object.keys(stores).length`. Let me now examine the two specific edge cases that matter for regression/idempotency: (1) what happens with duplicate names that differ only by case landing in the same bundle, and (2) the stale-bundle scenario on re-run. Let me also check the `m.index` semantics for the assignment regex.

### Assistant | 2026-05-30T15:21:07.312Z

[tool_use: Bash]

### User | 2026-05-30T15:21:10.577Z

[tool_result] m.index 1 name FOO_BAR bracketIdx 12 char {
---CASE-COLLISION-IN-BUNDLE---
CASE-COLLISION in controllers.json : controllers vs CONTROLLERS
CASE-COLLISION in machines.json : MACHINES vs Machines
CASE-COLLISION in machines.json : MACHINES vs machines
CASE-COLLISION in materials.json : materials vs MATERIALS
case-collision scan done

### Assistant | 2026-05-30T15:21:15.252Z

This is a real finding. There ARE case-variant keys coexisting in the same bundle (`MACHINES`, `Machines`, `machines` all as distinct keys in `machines.json`). The author's comment on line 503-504 claims "distinct-case names (MACHINES vs machines) are distinct JSON keys, so the NTFS case-collision problem disappears entirely" — and that's true at the JSON-key level (JSON keys are case-sensitive). But it means a consumer doing a case-insensitive lookup, or treating bundle keys as canonical store identifiers, will see what look like duplicate stores. Let me check whether these are genuinely different data or near-duplicates, since dedup is only by exact name.

### Assistant | 2026-05-30T15:21:18.040Z

[tool_use: Bash]

### User | 2026-05-30T15:21:21.641Z

[tool_result] MACHINES -> object records 5 sampleKeys VMC,FIVE_AXIS,LATHE,SWISS,MILL_TURN
Machines -> object records 5 sampleKeys VMC,FIVE_AXIS,LATHE,SWISS,MILL_TURN
machines -> array records 9 sampleKeys (arr)

### Assistant | 2026-05-30T15:21:25.875Z

So `MACHINES` and `Machines` are genuinely different objects from different sources but with identical record shape (likely the same conceptual store extracted from two monolith files), while `machines` is a 9-element array — a different thing entirely. These are legitimately distinct data, so the dedup-by-exact-name is defensible, but the consumer contract needs to know that case-variant keys can coexist. Let me check the stale-bundle re-run concern and the `--limit`+`--apply` hazard, then verify nothing writes into src/data.

### Assistant | 2026-05-30T15:21:31.761Z

[tool_use: Bash]

### User | 2026-05-30T15:21:34.067Z

[tool_result] rmdir/rm of OUT_DIR present? false
writes into SRC_DATA_DIR? false
SRC_DATA_DIR only read via readdirSync? true
LIMIT gates writes? (no guard) true

### Assistant | 2026-05-30T15:21:38.522Z

Confirmed:
- No `rm`/`rmdir` of OUT_DIR → stale bundles can linger across re-runs.
- `SRC_DATA_DIR` is only ever read via `readdirSync` → nothing written to src/data (safe).
- `--limit` does NOT gate `--apply` → `--limit 5 --apply` would overwrite the full DB with a partial one.

Let me verify the ReDoS concern on the regexes over multi-MB input (the key resource-safety question), and confirm the category set is a closed safe set for filenames.

### Assistant | 2026-05-30T15:21:47.602Z

[tool_use: Bash]

### User | 2026-05-30T15:21:51.844Z

[tool_result] STORE_KEYWORDS.test applied to name only? true
CATEGORY_RULES re.test(name) only? true
ASSIGN_RE over 20MB of "=": 58ms matches 0
ASSIGN_RE over name+5MB ws (no bracket): 28ms matches 0

### Assistant | 2026-05-30T15:21:57.508Z

ReDoS is not a concern:
- `ASSIGN_RE` is linear (no nested quantifiers; `\s*` runs are simple). 20MB of adversarial `=` → 58ms. The `\s*` before the bracket could theoretically backtrack, but `=(?!=)` anchors it and there's no alternation overlap — 5MB of whitespace → 28ms. Safe.
- `STORE_KEYWORDS`, `UPPER_SNAKE`, and `CATEGORY_RULES` are applied **only to the matched identifier name** (`m[1]`), never to the MB-scale body. Identifiers are short, so even an alternation-heavy regex is bounded.

Now the key resource-safety question: the `MAX_EVAL_BYTES` cap. Let me verify its position relative to the expensive `vm.runInNewContext` compile, and check the peak-memory profile.

### Assistant | 2026-05-30T15:22:04.387Z

[tool_use: Bash]

### User | 2026-05-30T15:22:06.611Z

[tool_result] cap check at 16474 < evalOnce call at 16606 ? true
vm.runInNewContext at 1387 is inside evalOnce (after cap)? false
MAX_LITERAL_BYTES 25165824 > MAX_EVAL_BYTES 8388608

### Assistant | 2026-05-30T15:22:11.679Z

The `i_vm` index is misleading (it matched the comment at line 188, not the call). The logic is clear from reading: `safeEval` (line 287) checks `literal.length > MAX_EVAL_BYTES` and returns at line 288, *before* the `try { return evalOnce(literal) }` at line 290-291, and `evalOnce` is where `vm.runInNewContext` runs (line 262). So **the cap is correctly positioned before the expensive compile.** Confirmed by index ordering: cap-check (16474) < evalOnce-call (16606).

Let me do the final memory-profile reality check — run the script in dry-run with `--json` and watch peak RSS, since it holds the full corpus and all store JSON strings in memory simultaneously.

### Assistant | 2026-05-30T15:22:15.859Z

[tool_use: Bash]

### User | 2026-05-30T15:22:38.461Z

[tool_result] dry-run ok in 20261ms
storesExtracted 1859 totalBytes(MB) 25.8 totalRecords 13920
storesFailed 1066 failHistogram {"computed-runtime-ref":696,"parse-error":58,"other":136,"unbalanced":176}
crossRefCount 1092 emptyDropped 2832 recovered 5

### Assistant | 2026-05-30T15:22:45.648Z

Dry-run completes in ~20s, extracts 1859 stores / 25.8MB JSON / 13920 records — matching empirical claims. Note the failure histogram: 696 `computed-runtime-ref` (correct misses — runtime code, not data), 176 `unbalanced`, 58 `parse-error` (the only class that could hide real data), 136 `other`. The 58 parse-errors are surfaced loud. Let me capture peak memory to close the OOM question.

### Assistant | 2026-05-30T15:22:52.365Z

[tool_use: Bash]

### User | 2026-05-30T15:23:31.520Z

[tool_result] --max-old-space-size=512MB -> SURVIVED 
--max-old-space-size=256MB -> FAILED status=134 (OOM)

### Assistant | 2026-05-30T15:24:12.205Z

Memory is well-bounded: survives a 512MB heap cap, fails at 256MB. The default Node heap (and this project's 16GB build heap) is far above the ~300-500MB working set. Peak is driven by the 46MB+11MB HTML strings held during their scan plus the ~26MB store-JSON Map plus per-bundle concatenation — no unbounded growth, no OOM risk in practice. The largest single bundle is `materials.json` at 9MB, built by string concatenation (`list.map(...).join(",")`) — that's one transient 9MB string, fine.

I have everything I need. Let me write up the findings.

---

## Review: `H:/prism/scripts/extract-monolith-databases.mjs`

I read the whole file (574 lines) plus its `atomic-json.mjs` dependency, validated all 18 output files, and ran the script in dry-run with heap-cap probes. Empirical claims all check out: **17 bundles / 1859 stores / all valid JSON / MANIFEST consistent (`count===Object.keys(stores).length` per bundle) / 1066 failures / 1092 cross-refs / 0 write errors / 0 stale tmp siblings.**

### 1. Resource safety — PASS
- **OOM:** Bounded. Survives `--max-old-space-size=512`, fails only at 256MB. Default heap is far above the ~300-500MB working set (46MB+11MB HTML strings + 26MB store-JSON Map + transient per-bundle concat string, largest 9MB for `materials.json`). No unbounded growth.
- **`MAX_EVAL_BYTES=8MB` cap position (the focus question): correctly placed.** `safeEval` (line 287) returns *before* the `try{evalOnce()}` at line 290, and `vm.runInNewContext` lives inside `evalOnce` (line 262). The expensive V8 compile is genuinely skipped for >8MB literals. `extractLiteral` has its own 24MB `MAX_LITERAL_BYTES` runaway guard (line 180), so the cap window (8-24MB) is handled loud via `failed[]` (`literal-too-large-skipped:<n>`).
- **ReDoS: none.** `ASSIGN_RE` is linear — 20MB of adversarial `=` → 58ms, name+5MB whitespace → 28ms. Critically, `STORE_KEYWORDS`/`UPPER_SNAKE`/`CATEGORY_RULES` are applied **only to the matched identifier `m[1]`** (verified at lines 76, 109
... [+5009 chars truncated]
