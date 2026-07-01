---
type: "chat-session"
source: "claude-code-cli"
session_id: "41db1b82-95ec-4f76-bff8-293146973f7e"
title: "Review this orchestrator script end-to-end for correctness, P0/P1 defects, and c"
date: "2026-05-16"
first_ts: "2026-05-16T04:31:43.410Z"
last_ts: "2026-05-16T04:33:42.384Z"
cwd: "H:\\prism"
messages: 22
user_msgs: 8
assistant_msgs: 14
raw_file: "H:/.claude/projects/H--prism/41db1b82-95ec-4f76-bff8-293146973f7e/subagents/agent-a2a9cfb1fdbf20fcd.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Review this orchestrator script end-to-end for correctness, P0/P1 defects, and c

> **claude-code-cli** | 2026-05-16 | 22 msgs (8 user / 14 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/41db1b82-95ec-4f76-bff8-293146973f7e/subagents/agent-a2a9cfb1fdbf20fcd.jsonl`

## Transcript

### User | 2026-05-16T04:31:43.410Z

Review this orchestrator script end-to-end for correctness, P0/P1 defects, and contract adherence. Grade PASS or FAIL.

FILE: H:\prism\scripts\tribal-graph-course-content-mine.mjs
COMPOSED LIB (already scrutiny-cleared, do not re-review it, just trust its contract): H:\prism\scripts\lib\course-content-mine-lib.mjs — exports collectResourceDescriptors, aggregateCourseCorpus, callOllamaMine ({ok,parsed?,raw?,error?}), scoreCandidate, passesRelevanceFloor, toCandidateRecord, corpusMfgPrior.

CONTRACT: iter-7 of TRIBAL-GRAPH-MS0. This is an fs/zip/Ollama I/O orchestrator (all pure logic is in the lib). It walks MIT-OCW course zips, extracts EVERY data.json via PowerShell System.IO.Compression, mines each course's resource-descriptor corpus through local Ollama qwen2.5-coder, filters via passesRelevanceFloor, and writes a RANKED ADVISORY review-queue JSONL + an idempotent-resume checkpoint + (optionally) advisory candidate nodes into system-graph.json. It must be idempotent (checkpoint resume), fail-loud, and never auto-build engines. It composes iters 3-6 (course-mapper-lib for buildCourseNodeId).

Focus on: (1) the PowerShell `extractAllDataJson` — is the embedded PS script injection-safe given zipPath is interpolated (note the `.replace(/'/g,"''")` — is that sufficient)? Does the single-element ConvertTo-Json object-vs-array normalization work? maxBuffer adequate? (2) checkpoint idempotency — on re-run does it correctly skip done courses AND reproduce the complete ranked JSONL; is the done-marking logic correct (thin/belowFloor marked done, ollamaFail NOT marked done so it retries)? (3) atomic writes — writeJsonAtomic / writeJsonlAtomic tmp+rename, cleanup on failure. (4) the records merge-by-courseId + rank sort — any way a stale record survives wrongly, or rank NaN poisons the sort? (5) graph emission — dedup of nodes/edges, does it avoid double-adding on re-run, is advisoryOnly correctly set? (6) failure modes: zip with 0 data.json, malformed sidecar, missing syste
... [+272 chars truncated]

### Assistant | 2026-05-16T04:31:48.886Z

I'll review this orchestrator script end-to-end.

### Assistant | 2026-05-16T04:31:49.741Z

[tool_use: Read]

### Assistant | 2026-05-16T04:31:49.792Z

[tool_use: Read]

### User | 2026-05-16T04:31:50.705Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\course-content-mine-lib.mjs' was already read 15m ago in this session and is unchanged (mtime 1778904950723). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### User | 2026-05-16T04:31:51.405Z

[tool_result] 1	#!/usr/bin/env node
2	// tribal-graph-course-content-mine.mjs
3	// Iter 7 (TRIBAL-GRAPH-MS0): I/O orchestrator that mines each MIT-OCW course
4	// zip's per-resource descriptor layer into a RANKED, ADVISORY review queue of
5	// PRISM-value candidates (technique vocabulary + asset proposals).
6	//
7	// PIPELINE: zip → ALL data.json entries → collectResourceDescriptors →
8	// aggregateCourseCorpus
... [+15629 chars truncated]

### Assistant | 2026-05-16T04:31:54.114Z

I have the orchestrator file. The lib was read earlier and I'm instructed to trust its contract. Let me verify a few specific lib contract points that the orchestrator depends on.

### Assistant | 2026-05-16T04:31:55.914Z

[tool_use: Grep]

### User | 2026-05-16T04:31:57.793Z

[tool_result] 88:export function collectResourceDescriptors(entries, opts = {}) {
89-  const minLen = Number.isFinite(opts.minLen) ? opts.minLen : MIN_DESCRIPTOR_LEN;
90-  if (!Array.isArray(entries)) return [];
91-  // Dedup identical blurbs (OCW repeats boilerplate across pages). Dedup must
92-  \ be INPUT-ORDER-INDEPENDENT: zip enumeration order is not guaranteed stable
93-  // across OS/PowerShell, and the 
... [+3499 chars truncated]

### Assistant | 2026-05-16T04:32:00.306Z

Let me check the rest of `toCandidateRecord` and `callOllamaMine` to verify the orchestrator's assumptions about return shapes.

### Assistant | 2026-05-16T04:32:01.111Z

[tool_use: Read]

### User | 2026-05-16T04:32:02.079Z

[tool_result] 200	    const ch = s[i];
201	    if (inStr) {
202	      if (esc) esc = false;
203	      else if (ch === "\\") esc = true;
204	      else if (ch === '"') inStr = false;
205	      continue;
206	    }
207	    if (ch === '"') { inStr = true; continue; }
208	    if (ch === "{") depth++;
209	    else if (ch === "}") {
210	      depth--;
211	      if (depth === 0) return s.slice(start, i + 1);
212	    }

... [+6310 chars truncated]

### Assistant | 2026-05-16T04:32:05.289Z

Now let me check the critical `callOllamaMine` contract — specifically what `res.parsed` is named, since the orchestrator at line 241/256 accesses `res.parsed`.

### Assistant | 2026-05-16T04:32:07.489Z

[tool_use: Grep]

### User | 2026-05-16T04:32:08.293Z

[tool_result] 32:export const RELEVANCE_FLOOR     = 0.35;  // boundedRelevance below this ⇒ belowFloor (orchestrator drops; testable via passesRelevanceFloor)
242:  if (body == null) return { ok: false, error: "no-balanced-json-object" };
245:  catch (e) { return { ok: false, error: "json-parse: " + (e?.message || "bad") }; }
247:    return { ok: false, error: "not-an-object" };
277:  if (mfgRelevance === null)
... [+1271 chars truncated]

### Assistant | 2026-05-16T04:32:12.053Z

I have the full contract picture. The orchestrator accesses `res.parsed` (line 241, 256) — `callOllamaMine` returns `{ ok: true, parsed: parsed.value, raw }` where `parsed.value` is `{ techniques, candidateAssets, prismDomains, mfgRelevance, confidence }`. That matches. Let me check `toCandidateRecord`'s full return shape and `scoreCandidate`'s `boundedRelevance` field to verify orchestrator field accesses.

### Assistant | 2026-05-16T04:32:12.602Z

[tool_use: Read]

### User | 2026-05-16T04:32:14.002Z

[tool_result] 355	  for (const pm of (Array.isArray(meta.prismMapping) ? meta.prismMapping : [])) {
356	    if (typeof pm === "string" && pm) nodeDomains.add(pm.toLowerCase());
357	  }
358	  if (typeof meta.domain === "string" && meta.domain) nodeDomains.add(meta.domain.toLowerCase());
359	  let domainMatchBoost = 0;
360	  for (const d of domains) {
361	    if (typeof d !== "string" || !d) continue;
362	    for
... [+3471 chars truncated]

### Assistant | 2026-05-16T04:32:20.487Z

I now have the complete contract picture. Let me verify one critical detail — the `callOllamaMine` function body to confirm timeout/abort behavior and whether it can throw.

### Assistant | 2026-05-16T04:32:21.395Z

[tool_use: Read]

### User | 2026-05-16T04:32:22.253Z

[tool_result] 429	/**
430	 * Call Ollama /api/generate for one course corpus. Injectable fetchImpl for
431	 * tests. Mirrors scripts/seed-ghost-llm-classify.mjs conventions (AbortController
432	 * timeout, stream:false, low temperature). Returns { ok, parsed?, raw?, error? }.
433	 */
434	export async function callOllamaMine(courseTitle, corpus, opts = {}) {
435	  // Respect an EXPLICITLY-passed fetchImpl as-is 
... [+2002 chars truncated]

### Assistant | 2026-05-16T04:33:42.384Z

I have the complete picture. The lib contract is clean and never throws (all paths return `{ok,...}`). Now the full review of the orchestrator.

---

## Code Quality Analysis Report — `scripts/tribal-graph-course-content-mine.mjs`

### Summary
- Files Analyzed: 1 orchestrator (333 lines) + lib contract verification
- Issues Found: 2 P1, 4 P2, 2 P3
- The orchestrator is well-structured, idempotency logic is largely correct, atomic writes are sound, and the lib composition matches the verified contract. No P0 defects. Two P1 issues prevent a clean PASS.

---

### P1 Issues

**P1-1 — `extractAllDataJson` PowerShell injection: the `.replace(/'/g,"''")` is NECESSARY but NOT SUFFICIENT. (line 124)**

The `''` doubling correctly neutralizes single quotes inside a PS single-quoted string literal — that part is safe. The unhandled vector is **backtick line-continuation / newline injection is not the problem** (single-quoted PS strings don't interpret backticks), but a real one remains:

A zip path containing a literal newline or carriage return is **not** escaped by `.replace(/'/g,"''")`. PS single-quoted strings *can* span lines, so a CRLF inside the path stays inside the string literal and is benign — **however** the actual P1 is different: the `-Command` argument is passed as a single array element to `spawnSync`, and on Windows `spawnSync` without `shell:true` builds the command line by quoting per Node's `cmd`-free rules. A `zipPath` containing a double-quote `"` is **not** escaped by the single-quote replace, and Node's argument-quoting for `powershell.exe` will embed it. Since the PS literal is single-quoted, an embedded `"` is harmless *inside* PS — but it can break Node's own argv-to-cmdline serialization for the child process, truncating or splitting the `-Command` payload.

Minimal repro:
```
echo '{}' > "H:/prism/resources/MIT COURSES/a`"b.zip"   # filename with embedded quote
node scripts/tribal-graph-course-content-mine.mjs --limit 1
```
The `"` survives `.repl
... [+10687 chars truncated]
