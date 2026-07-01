---
type: "chat-session"
source: "claude-code-cli"
session_id: "dbe88c14-d515-45a1-9acd-bd8c13fba259"
title: "Review a fix to a CORE system-viz graph-writer (slot:sierra, U-VIZ-SEEDGHOST-CAP"
date: "2026-06-23"
first_ts: "2026-06-23T00:25:36.611Z"
last_ts: "2026-06-23T00:27:07.674Z"
cwd: "H:\\prism"
messages: 32
user_msgs: 13
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/dbe88c14-d515-45a1-9acd-bd8c13fba259/subagents/agent-a544e3ac2c8d83c63.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:30"
---

# Review a fix to a CORE system-viz graph-writer (slot:sierra, U-VIZ-SEEDGHOST-CAP

> **claude-code-cli** | 2026-06-23 | 32 msgs (13 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/dbe88c14-d515-45a1-9acd-bd8c13fba259/subagents/agent-a544e3ac2c8d83c63.jsonl`

## Transcript

### User | 2026-06-23T00:25:36.611Z

Review a fix to a CORE system-viz graph-writer (slot:sierra, U-VIZ-SEEDGHOST-CAPSAFE). This script writes the live 862MB system-graph.json that all fleet search reads — be strict about data integrity. Read the diff regions end-to-end. Grade PASS/FAIL with P0/P1/P2 + file:line.

File: H:/prism/scripts/seed-ghost-from-unwired.mjs

The bug: `--apply` mode crashed with V8's string-cap OOM ("Cannot create a string longer than 0x1fffffe8") because line ~300 did `JSON.parse(fs.readFileSync(GRAPH_PATH,"utf8"))` on the >512MiB graph. This was the regen `failed=1` that blocked the `.last-successful-regen.json` success-stamp fleet-wide (--dry-run passed because it uses readGraphStreaming; --apply, the mode regen-viz runs, used the raw read).

The fix (4 edits):
1. import: added `writeGraphStreamingAtomic` alongside the existing `readGraphStreaming` (from ./lib/graph-io.mjs).
2. --apply READ (~line 300): `JSON.parse(fs.readFileSync(GRAPH_PATH,"utf8"))` -> `readGraphStreaming(GRAPH_PATH)`.
3. --apply WRITE (~line 328): `atomicWrite(GRAPH_PATH, JSON.stringify(g))` -> `writeGraphStreamingAtomic(GRAPH_PATH, g)`.
4. --revert WRITE (~line 263): same JSON.stringify -> writeGraphStreamingAtomic (latent same-class bug; --revert read was already streaming).
5. Removed the now-dead local `atomicWrite` helper (both call sites replaced).

This mirrors the sibling post-merge stages (repair-graph-engine-classification / dedup-graph-nodes / reparent-viz-categories) which already use readGraphStreaming + writeGraphStreamingAtomic.

VERIFIED LIVE: `node --max-old-space-size=24576 scripts/seed-ghost-from-unwired.mjs --apply` now exits 0 (was exit 1), wrote nodes=353886 edges=824616 (added 11 / updated 136 ghost nodes). `node --check` clean.

Verify specifically:
- The streaming read returns the same {nodes, edges} shape the downstream code uses (g.nodes.map, g.nodes.findIndex, g.edges.push) — no behavioral change vs JSON.parse.
- writeGraphStreamingAtomic is a correct drop-in for the removed atom
... [+476 chars truncated]

### Assistant | 2026-06-23T00:25:39.849Z

I'll review this fix to the system-viz graph-writer. Let me start by reading the file end-to-end and the library it depends on.

### Assistant | 2026-06-23T00:25:40.802Z

[tool_use: Read]

### Assistant | 2026-06-23T00:25:40.844Z

[tool_use: Read]

### User | 2026-06-23T00:25:42.134Z

[tool_result] 1	/**
2	 * scripts/lib/graph-io.mjs — streaming read+write for `system-graph.json`
3	 *
4	 * Bypasses V8's ~512MB max-string-length ceiling that crashes legacy
5	 * `JSON.parse(fs.readFileSync(p, "utf8"))` (read) and `JSON.stringify(G)`
6	 * (write) calls once the graph passes ~512MB serialized.
7	 *
8	 * Discovered: papa /loop 2026-05-23, U-PSN-VIZ-REGEN, on the 541MB graph.
9	 * Memory: `referen
... [+18449 chars truncated]

### User | 2026-06-23T00:25:43.226Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * seed-ghost-from-unwired.mjs — SYSTEM-VIZ-FS-COVERAGE-MS2/U-GHOST-UNWIRED
4	 *
5	 * Generates L13 ghost nodes for the BUILD_STATE-flagged unwired engines (861
6	 * engines on disk with no dispatcher reference). Each gets:
7	 *   - ghost.unwired-engine node with `proposed_wiring` + `confidence` fields
8	 *   - ghost-wire edge (relation: "proposed-wire") pointing at t
... [+20304 chars truncated]

### Assistant | 2026-06-23T00:25:45.722Z

I've read both files end-to-end. Let me verify a few claims: the removed `atomicWrite` helper has no dangling references, the `fs` import is still used, and the diff matches the description via git.

### Assistant | 2026-06-23T00:25:47.403Z

[tool_use: Bash]

### Assistant | 2026-06-23T00:25:48.127Z

[tool_use: Grep]

### Assistant | 2026-06-23T00:25:49.008Z

[tool_use: Grep]

### User | 2026-06-23T00:25:51.189Z

[tool_result] [rtk] /!\ No hook installed — run `rtk init -g` for automatic token savings
scripts/seed-ghost-from-unwired.mjs | 42 +++++++++++++++----------------------
 1 file changed, 17 insertions(+), 25 deletions(-)

--- Changes ---

scripts/seed-ghost-from-unwired.mjs
  @@ -28,7 +28,7 @@ import fs from "node:fs";
  -import { readGraphStreaming } from "./lib/graph-io.mjs";
  +import { readGraphStreaming, wr
... [+3492 chars truncated]

### User | 2026-06-23T00:25:52.894Z

[tool_result] 144:  if (!fs.existsSync(enginesDir) || !fs.existsSync(dispatchersDir)) return [];
145:  const engineFiles = fs.readdirSync(enginesDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts") && !f.endsWith(".test.ts"));
148:  const dispatcherFiles = fs.readdirSync(dispatchersDir).filter((f) => f.endsWith(".ts") && !f.endsWith(".d.ts") && !f.endsWith(".test.ts"));
151:    try { dispatcherSource +=
... [+153 chars truncated]

### User | 2026-06-23T00:25:52.982Z

[tool_result] grep-index-first FORCE: "atomicWrite" is the exact name of a known asset -- Read the file directly instead of grep-scanning (saves 50-80% tokens):
  • mcp-server/src/utils/atomicWrite.ts
Need call-sites/usages (not the definition)? re-run this exact Grep and it will be allowed (the deny fires once), or set PRISM_GREP_INDEX_FORCE=0.

### Assistant | 2026-06-23T00:25:56.531Z

The diff confirms the description exactly. The grep for `atomicWrite` inside the file returned no in-file matches (the deny-message references the unrelated `mcp-server/src/utils/atomicWrite.ts`, a different asset). Let me confirm there's no dangling reference to the local `atomicWrite` in this file and verify the test file references, plus confirm the sibling stages use the same pattern as claimed.

### Assistant | 2026-06-23T00:25:58.419Z

[tool_use: Bash]

### Assistant | 2026-06-23T00:25:59.842Z

[tool_use: Grep]

### Assistant | 2026-06-23T00:26:00.285Z

[tool_use: Glob]

### User | 2026-06-23T00:26:02.382Z

[tool_result] scripts\dedup-graph-nodes.mjs:12:import { readGraphStreaming, writeGraphStreamingAtomic } from "./lib/graph-io.mjs";
scripts\dedup-graph-nodes.mjs:31:const G = (fs.statSync(GRAPH).size > 256 * 1024 * 1024 ? readGraphStreaming(GRAPH) : JSON.parse(fs.readFileSync(GRAPH, "utf8")));
scripts\dedup-graph-nodes.mjs:73:writeGraphStreamingAtomic(GRAPH, G);  // per-element+atomic: JSON.stringify(G) throws I
... [+1099 chars truncated]

### User | 2026-06-23T00:26:05.076Z

[tool_result] 39:// system-graph.json (atomicWrite below). It is covered TODAY only because it

### User | 2026-06-23T00:26:12.612Z

[tool_result] scripts\seed-ghost-from-unwired.test.mjs

### Assistant | 2026-06-23T00:26:17.207Z

The only remaining `atomicWrite` in the file is at line 39, which is inside the WIRE-NOTE comment block (a stale doc reference, not a code call site). The sibling stages confirm the exact pattern claimed. Let me verify the test file still passes/references the right exports and check `node --check` cleanliness.

### Assistant | 2026-06-23T00:26:17.612Z

[tool_use: Read]

### Assistant | 2026-06-23T00:26:18.428Z

[tool_use: Bash]

### User | 2026-06-23T00:26:19.713Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * seed-ghost-from-unwired.test.mjs — tests for SYSTEM-VIZ-FS-COVERAGE-MS2/U-GHOST-UNWIRED
4	 * Run: node --test scripts/seed-ghost-from-unwired.test.mjs
5	 */
6	import { test, describe } from "node:test";
7	import assert from "node:assert/strict";
8	import fs from "node:fs";
9	import os from "node:os";
10	import path from "node:path";
11	import {
12	  inferDispatcher
... [+16111 chars truncated]

### User | 2026-06-23T00:26:23.113Z

[tool_result] CHECK_CLEAN

### Assistant | 2026-06-23T00:26:26.570Z

I've found a significant issue. The test file at lines 317-324 has a regression guard that asserts exactly 2 `atomicWrite(GRAPH_PATH, JSON.stringify(g))` writes exist in the source — but the fix removed both of those call sites. This test will now FAIL. Let me verify this concretely by running the test, since the diff did not touch the test file.

### Assistant | 2026-06-23T00:26:27.526Z

[tool_use: Bash]

### User | 2026-06-23T00:26:31.857Z

[tool_result]       error: |-
        expected exactly 2 compact graph writes (the --apply and --revert paths)
        
        0 !== 2
        
      code: 'ERR_ASSERTION'
      name: 'AssertionError'
      expected: 2
      actual: 0
      operator: 'strictEqual'
      stack: |-
        TestContext.<anonymous> (file:///H:/prism/scripts/seed-ghost-from-unwired.test.mjs:319:12)
        Test.runInAsyncScope (nod
... [+867 chars truncated]

### Assistant | 2026-06-23T00:26:36.785Z

Confirmed. The companion test file was left unupdated. The fix introduced a test regression: `seed-ghost-from-unwired.test.mjs:317-324` asserts exactly 2 occurrences of `atomicWrite(GRAPH_PATH, JSON.stringify(g))` in the source, which now match 0. The test suite fails 1/36. This is a P1 silent-breakage finding (a consumer left unupdated, per the review checklist) and it would be caught by `stop_on_failing_tests`.

Let me verify the streaming read/write round-trip preserves order and the exact shape, since that's the load-bearing data-integrity concern, and confirm the test's intent is now mis-stated (it was checking the wrong thing post-migration).

### Assistant | 2026-06-23T00:26:43.663Z

[tool_use: Bash]

### User | 2026-06-23T00:26:47.809Z

[tool_result] top-key order preserved: true => schemaVersion,meta,nodes,edges,trailing
node order: n1,n2,n3
edge order: n1>n2,n2>n3
deep-equal to original: true
tmp left behind: false

### Assistant | 2026-06-23T00:27:07.674Z

The streaming read/write round-trip is verified clean: top-level key order preserved, node and edge order preserved, deep-equal to the original (including strings containing `]`, `}`, `,`, and escaped quotes), and no orphan tmp left. The data-integrity core of the fix is sound.

I have everything I need. Here is my verdict.

---

VERDICT: FAIL

summary: The four code edits to `seed-ghost-from-unwired.mjs` are correct — the streaming read/write is a verified-clean drop-in for the removed `atomicWrite` (round-trip preserves top-level key order, node/edge order, deep-equality, atomic tmp+rename, no orphan tmp), the merge logic is untouched, no dangling local `atomicWrite` reference remains, `fs` is still needed, and the new comments are ASCII-only. BUT the companion test file was left unupdated: its V8-string-cap regression guard still asserts exactly 2 `atomicWrite(GRAPH_PATH, JSON.stringify(g))` occurrences, which the fix deleted, so the suite now fails 1/36 (R9/R15 — a consumer left unupdated in the same change).

findings:
- [P1] `H:/prism/scripts/seed-ghost-from-unwired.test.mjs:317-324` -- The test "both graph write sites (--apply + --revert) serialize compact" matches `/atomicWrite\(GRAPH_PATH, JSON\.stringify\(g\)\)/g` and asserts `length === 2`; the fix removed both call sites so it now matches 0 and the assertion fails (confirmed live: `# fail 1`, `0 !== 2` at test line 319). The fix's own diff scope left the test stale. This would be caught by `stop_on_failing_tests`. -- Update the guard to assert the new contract: exactly 2 `writeGraphStreamingAtomic(GRAPH_PATH, g)` calls (and keep/adjust the pretty-print negative guard at line 311-316, which still passes). This strengthens, not weakens, the oracle — it now pins the streaming-writer migration instead of the obsolete compact-stringify one.
- [P2] `H:/prism/scripts/seed-ghost-from-unwired.mjs:39` -- The WIRE-NOTE comment still says "this is a 4th DIRECT writer of system-graph.json (atomicWrite below)", but `a
... [+1672 chars truncated]
