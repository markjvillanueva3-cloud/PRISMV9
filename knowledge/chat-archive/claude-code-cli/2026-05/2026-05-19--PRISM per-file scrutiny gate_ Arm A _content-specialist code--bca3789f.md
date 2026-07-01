---
type: "chat-session"
source: "claude-code-cli"
session_id: "bca3789f-eb42-411b-ab21-ca10664f9aec"
title: "PRISM per-file scrutiny gate, Arm A (content-specialist code-analyzer). **File u"
date: "2026-05-19"
first_ts: "2026-05-19T04:31:13.469Z"
last_ts: "2026-05-19T04:34:00.763Z"
cwd: "H:\\prism-slot-lima"
messages: 30
user_msgs: 12
assistant_msgs: 18
raw_file: "H:/.claude/projects/H--prism/bca3789f-eb42-411b-ab21-ca10664f9aec/subagents/agent-a36ead84610055e38.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:24"
---

# PRISM per-file scrutiny gate, Arm A (content-specialist code-analyzer). **File u

> **claude-code-cli** | 2026-05-19 | 30 msgs (12 user / 18 assistant) | cwd: H:\prism-slot-lima
> Raw: `H:/.claude/projects/H--prism/bca3789f-eb42-411b-ab21-ca10664f9aec/subagents/agent-a36ead84610055e38.jsonl`

## Transcript

### User | 2026-05-19T04:31:13.469Z

PRISM per-file scrutiny gate, Arm A (content-specialist code-analyzer).

**File under review**: `H:/prism-slot-lima/scripts/build-wiki-leaf-index.mjs`
**Compare against original**: run `git -C H:/prism-slot-lima show HEAD:scripts/build-wiki-leaf-index.mjs > /tmp/orig.mjs` if needed; the diff at `/tmp/leafidx-failloud.diff` covers both this file and its test sibling.

**Unit**: U-WIKI-LEAFIDX-FAILLOUD — closes regression entry `[[reference_wiki_recall_index_stale_2026_05_18]]`. The pre-fix script could exit 0 with no print and no write (Fleet Reaper TerminateProcess under ~96% Windows commit pressure mid-walk, etc.), silently clobbering the recall surface on the next run. The fix is layered R12 fail-loud detection:

1. Post-walk: if ARCH_DIR existed but walkMd returned 0 .md → exit 3
2. Pre-write: if `lines.length < MIN_ENTRIES_FLOOR` (env `PRISM_WIKI_LEAFINDEX_MIN_ENTRIES`, default 1) → exit 4
3. Post-write: re-stat OUT_PATH; if size ≠ Buffer.byteLength(jsonl) → exit 6 (or 5 if stat fails)
4. Top-level try/catch around `main()` → JS throws exit 1
5. Signal handlers (SIGINT/SIGTERM/SIGBREAK/SIGHUP) → exit 128+sig with stage name
6. Stage heartbeats to stderr at each major step (walk-arch, parse-arch, tribal, hand-wiki, memories, write)
7. Module-level `currentStage` tracker named in kill diagnostic

**Read the WHOLE file end-to-end.** Verify:
- No regression to byte-identical happy-path output (existing 12 tests pass — confirmed locally)
- No new physics constants inlined (none expected — pure filesystem walk, no physics in scope)
- No stub returns
- Edge cases: empty input, garbage env knob, ARCH_DIR vanishing mid-walk, integer-overflow on MIN_ENTRIES_FLOOR parse, what if statSync throws partway, what if writeFileSync throws partway (it currently bubbles through the top-level try/catch — verify)
- Signal-handler `process.exit(128 + (sig === "SIGINT" ? 2 : ...))` — verify the bit-math is correct + Windows behavior reasonable
- The `currentStage` mutable global — race
... [+1167 chars truncated]

### Assistant | 2026-05-19T04:31:23.245Z

I'll review the file end-to-end against the spec.

### Assistant | 2026-05-19T04:31:23.781Z

[tool_use: Read]

### User | 2026-05-19T04:31:31.803Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-wiki-leaf-index.mjs
4	 *
5	 * Walks knowledge/wiki/architecture/**\/*.md and emits a compact JSONL index:
6	 *   knowledge/wiki/architecture/_leaf-index.jsonl
7	 *
8	 * One line per entry: { name, title, type, desc, path } where:
9	 *   - name  = basename without .md  (the [[wiki-link]] target)
10	 *   - title = frontmatter title (falls back to first H1)
11	 
... [+29466 chars truncated]

### Assistant | 2026-05-19T04:31:37.743Z

Now let me also check the test sibling and confirm there's no orchestrator coupling concern.

### Assistant | 2026-05-19T04:31:38.756Z

[tool_use: Bash]

### Assistant | 2026-05-19T04:31:40.097Z

[tool_use: Bash]

### User | 2026-05-19T04:31:44.529Z

[tool_result] scripts/build-wiki-leaf-index.mjs | 121 +++++++++++++++++++++++++++++++++++++-
 1 file changed, 119 insertions(+), 2 deletions(-)

--- Changes ---

scripts/build-wiki-leaf-index.mjs
  @@ -20,7 +20,7 @@
  -import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
  +import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs";
   import { resolve, d
... [+9369 chars truncated]

### User | 2026-05-19T04:31:45.706Z

[tool_result] 2 matches in 1 files:

H:/prism-slot-lima/scripts/regen-wiki-from-viz.mjs:84:...y tribal index pages (~73); tips themselves are indexed by build-wiki-leaf-index
H:/prism-slot-lima/scripts/regen-wiki-from-viz.mjs:94:"build-wiki-leaf-index.mjs",

### Assistant | 2026-05-19T04:31:49.763Z

Now let me inspect the orchestrator's reaction to non-zero exits and verify the `pathToFileURL` import is present.

### Assistant | 2026-05-19T04:31:50.783Z

[tool_use: Bash]

### Assistant | 2026-05-19T04:31:52.413Z

[tool_use: Bash]

### User | 2026-05-19T04:31:58.430Z

[tool_result] 84:  "generate-tribal-wiki.mjs",             // per-category tribal index pages (~73); tips themselves are indexed by build-wiki-leaf-index
85-  "generate-test-wiki.mjs",               // per-test entries (~3.4K); incremental (mtime sidecar) so steady-state runs are fast
86-  "generate-domain-mermaid.mjs",
87-  "generate-layer-stack-overview.mjs",
88-  "system-viz-obsidian-bridge-v2.mjs",
89-  "ex
... [+866 chars truncated]

### User | 2026-05-19T04:32:06.992Z

[tool_result] 20- *   --quiet     suppress per-step success lines (errors still print)
21- */
22:import { spawnSync } from "node:child_process";
23-import { createHash } from "node:crypto";
24-import { resolve, dirname } from "node:path";
25-import { fileURLToPath } from "node:url";
26-import { existsSync, statSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
27-
28-const __filename = fileURLToPath
... [+2187 chars truncated]

### Assistant | 2026-05-19T04:32:10.273Z

[tool_use: Bash]

### User | 2026-05-19T04:32:16.865Z

[tool_result] rtk: Failed to resolve 'rg' via PATH, falling back to direct exec: Binary 'rg' not found on PATH
3 matches in 3 files:

117:0:false, name, error: "missing" };
131:0:false, name, error: res.stderr || `exit ${res.status}` };
H:/prism-slot-lima/scripts/regen-wiki-from-viz.mjs:161:for (const g of GENERATORS) results.push(runGenerator(g));

### Assistant | 2026-05-19T04:32:20.192Z

[tool_use: Read]

### User | 2026-05-19T04:32:28.173Z

[tool_result] 155	      return;
156	    }
157	  }
158	
159	  const t0 = Date.now();
160	  const results = [];
161	  for (const g of GENERATORS) results.push(runGenerator(g));
162	  const total = Date.now() - t0;
163	
164	  const okCount = results.filter((r) => r.ok).length;
165	  const failCount = results.length - okCount;
166	  log(`[regen-wiki] done: ${okCount}/${results.length} OK · ${failCount} fail · total
... [+479 chars truncated]

### Assistant | 2026-05-19T04:32:36.262Z

Orchestrator handling confirmed: it loops over all generators and exits 1 if any failed. New exit codes 3/4/5/6/1 from the leaf-index script will be captured as `ok: false` and surface a clean orchestrator failure with the FATAL stderr — chain doesn't break, downstream generators still run, fingerprint is NOT persisted (so the next regen retries). That's correct integration.

Now let me verify the signal-handler bit-math and the Windows-import assumption:

### Assistant | 2026-05-19T04:32:36.369Z

[tool_use: Bash]

### Assistant | 2026-05-19T04:32:36.791Z

[tool_use: Bash]

### User | 2026-05-19T04:32:41.142Z

[tool_result] SIGINT 130
SIGTERM 143
SIGBREAK/SIGHUP 129

### User | 2026-05-19T04:32:47.632Z

[tool_result] SIGHUP registration on Win32 (no throw expected at register time): ok

### Assistant | 2026-05-19T04:32:52.982Z

Bit math: 130 (SIGINT), 143 (SIGTERM), 129 (SIGBREAK/SIGHUP). All match POSIX `128 + signum` convention. Even SIGHUP registers without throwing on Windows — but won't be delivered. The try/catch around the `process.on(sig, …)` is defensive but probably unnecessary in practice; not a bug, just over-cautious.

Now let me verify there are no subtle gotchas with `pathToFileURL` already being imported, and check the array of HAND_WIKI_DIRS handling with a malformed env override:

### Assistant | 2026-05-19T04:32:57.860Z

[tool_use: Bash]

### User | 2026-05-19T04:33:02.578Z

[tool_result] "0" -> 0
"-1" -> 1
"abc" -> 1
"" -> 1 (empty default)
null -> 1 (empty default)
"999999999999" -> 999999999999
"1.5" -> 1
"0x10" -> 0
"  42  " -> 42

### Assistant | 2026-05-19T04:33:12.991Z

Edge case findings from the stress test:

- `"0"` → 0 (floor disabled, allows empty index — operator opt-in, documented in comment)
- `"-1"` → 1 (negative correctly rejected via `n >= 0`)
- `"0x10"` → 0 — `parseInt(_,10)` correctly stops at `x`, returns `0`; falls under valid-zero path (floor disabled). Not a bug, but a sharp edge — operator setting `0x10` thinking "decimal 16" silently gets floor=0.
- `"999999999999"` → preserved as-is (no integer-overflow risk; JS safe up to 2^53). If an operator sets this absurdly high and the tree is normal-sized, exit-4 fires deterministically. Defensible.
- `"1.5"` → 1 (truncated cleanly)
- `"  42  "` → 42 (parseInt handles whitespace)

All within the spec's "fail-safe, never silently widen the contract" envelope.

Now let me check one last subtle item — the `pathToFileURL` import and whether the synchronous `writeFileSync` for `_stats.md` is also protected:

### Assistant | 2026-05-19T04:33:13.796Z

[tool_use: Read]

### User | 2026-05-19T04:33:16.544Z

[tool_result] 485	- Cypher export: \`state/shared/system-viz/graph.cypher\` + [[neo4j-import]]
486	`;
487	  writeFileSync(STATS_PATH, stats, "utf8");
488	
489	  const handWikiBreakdown = Object.entries(handWikiByDir).map(([k, v]) => `${k}:${v}`).join(",") || "none";
490	  process.stdout.write(`leaf-index: ${lines.length} entries (arch ${archCount} + tribal ${tribalCount} + hand-wiki ${handWikiCount} [${handWiki
... [+393 chars truncated]

### Assistant | 2026-05-19T04:34:00.763Z

Final observation on line 487: `writeFileSync(STATS_PATH, stats, …)` is NOT post-write-validated (no re-stat) and not signal-protected. If `_stats.md` write fails / partially writes, the script exits 0 with a misleading stdout summary because the post-write check earlier (lines 412-424) is for OUT_PATH (`_leaf-index.jsonl`) only.

However — `_stats.md` is human-facing documentation, NOT the recall surface. The regression `[[wiki-recall-index-stale-2026-05-18]]` is specifically about `_leaf-index.jsonl` going silently empty/stale. Inconsistent stats.md doesn't poison recall. Defensible scope, but worth a P3 note.

---

## Code Quality Analysis Report

### Summary
- Overall Quality Score: **9/10**
- Files Analyzed: 1 (`scripts/build-wiki-leaf-index.mjs`, 532 lines)
- Issues Found: 0 P0, 0 P1, 1 P2, 3 P3
- Spec compliance: **all 7 layered fail-loud detections present and correct**

### Spec verification (each layer)
1. **Post-walk empty-arch detection (exit 3)** — lines 222-230, fires when `existsSync(ARCH_DIR)` passed but `walkMd` returned 0 files. ✓
2. **Pre-write floor (exit 4)** — lines 392-400, `lines.length < MIN_ENTRIES_FLOOR`. Env override clamped sane (verified above). ✓
3. **Post-write size check** — lines 412-424. `Buffer.byteLength(jsonl)` is the correct ground truth: `writeFileSync(path, str, "utf8")` writes exactly the UTF-8 byte length (no BOM added; Node never prepends BOM unless explicitly asked). Exit 5 on stat failure, exit 6 on size mismatch. ✓
4. **Top-level try/catch** — lines 521-528, captures the regression class precisely (any throw inside `main()` → exit 1 + FATAL stderr + stack). ✓
5. **Signal handlers** — lines 505-515, exit codes 130/143/129 confirmed correct (POSIX `128+signum`). ✓
6. **Stage heartbeats to stderr** — at every major step (walk-arch, parse-arch, tribal, hand-wiki, memories, write, write-done). ✓
7. **`currentStage` tracker** — single-threaded JS, sync code, no async work in `main()`. Race-safe by construction (verified: no `
... [+4745 chars truncated]
