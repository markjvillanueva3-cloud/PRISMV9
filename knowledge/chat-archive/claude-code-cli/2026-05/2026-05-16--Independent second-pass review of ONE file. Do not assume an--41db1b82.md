---
type: "chat-session"
source: "claude-code-cli"
session_id: "41db1b82-95ec-4f76-bff8-293146973f7e"
title: "Independent second-pass review of ONE file. Do not assume any other reviewer cau"
date: "2026-05-16"
first_ts: "2026-05-16T03:55:53.955Z"
last_ts: "2026-05-16T03:58:58.541Z"
cwd: "H:\\prism"
messages: 37
user_msgs: 14
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/41db1b82-95ec-4f76-bff8-293146973f7e/subagents/agent-a01313c4f10be777e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:11"
---

# Independent second-pass review of ONE file. Do not assume any other reviewer cau

> **claude-code-cli** | 2026-05-16 | 37 msgs (14 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/41db1b82-95ec-4f76-bff8-293146973f7e/subagents/agent-a01313c4f10be777e.jsonl`

## Transcript

### User | 2026-05-16T03:55:53.955Z

Independent second-pass review of ONE file. Do not assume any other reviewer caught anything. Grade PASS or FAIL.

FILE: H:\prism\scripts\lib\course-content-mine-lib.mjs

This is a PURE transform library (iter-7 of TRIBAL-GRAPH-MS0) that distills MIT OCW per-resource descriptor metadata into an ADVISORY ranked review queue of candidate PRISM assets (techniques/formulas/algorithms/engines/tips) via a local Ollama qwen2.5-coder call. It must NEVER cause auto-build of engines — output is a human/forge-gated queue. The course descriptor text is UNTRUSTED (external, possibly adversarial/prompt-injection).

Weight your review toward what a correctness pass is LIKELY TO MISS:
- HOSTILE-PAYLOAD SAFETY: a course `description` is attacker-controllable in principle. Trace every path external text takes into (a) the prompt and (b) the output JSONL record. Is prompt-injection neutralization actually effective, or trivially bypassed (unicode, casing, spacing, partial phrases)? Can crafted descriptor text cause the ranked queue to surface a high-rank malicious "candidate_asset" (e.g. a name/rationale engineered to look like a legit build target) that a human triager would plausibly action? Is the advisoryOnly/mustHumanVerify/caveat framing structurally load-bearing or just a string?
- SILENT VALUE CORRUPTION: scoreCandidate / corpusMfgPrior / clamp01 — can a candidate get an inflated rank from missing/garbage fields? Does the corpus-prior bound actually defend against descriptor-blind over-claiming as the JSDoc asserts, or is there an off-by-one / boundary that lets prior<0.25 still pass through high relevance?
- DEAD/UNREACHABLE GUARDS: any validation branch that can never fire (so the protection is illusory)?
- NAMING / CONVENTION / INLINED-CONSTANT conformance vs the surrounding scripts/lib/*.mjs style (compare against scripts/seed-ghost-llm-classify.mjs and scripts/lib/course-mapper-lib.mjs which it claims to compose without forking).
- INTEGRATION COUPLING: toCandidateRecord 
... [+528 chars truncated]

### Assistant | 2026-05-16T03:56:00.700Z

I'll read the file end-to-end, then examine the files it claims to compose with.

### Assistant | 2026-05-16T03:56:01.014Z

[tool_use: Read]

### User | 2026-05-16T03:56:01.474Z

[tool_result] read-once-guard: 'H:\prism\scripts\lib\course-content-mine-lib.mjs' was already read 17s ago in this session and is unchanged (mtime 1778903711384). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CACHE=0)

### Assistant | 2026-05-16T03:56:04.274Z

The guard says it's already in context, but I don't actually have the file content visible in this conversation. Let me bypass the cache to get the content for review.

### Assistant | 2026-05-16T03:56:05.397Z

[tool_use: Bash]

### User | 2026-05-16T03:56:11.152Z

[tool_result] 395 H:/prism/scripts/lib/course-content-mine-lib.mjs

### Assistant | 2026-05-16T03:56:13.480Z

395 lines. Let me read it with an offset to bypass the read-once guard, in chunks.

### Assistant | 2026-05-16T03:56:13.745Z

[tool_use: Read]

### User | 2026-05-16T03:56:16.659Z

[tool_result] 1	#!/usr/bin/env node
2	// course-content-mine-lib.mjs
3	// Iter 7 (TRIBAL-GRAPH-MS0): PURE transforms for mining the machine-readable
4	// per-resource descriptor layer of MIT OCW course zips into a RANKED REVIEW
5	// QUEUE of PRISM-value candidates (technique vocabulary + asset proposals).
6	//
7	// WHY THIS SHAPE (load-bearing — read before changing):
8	//   * MIT lecture-note PDFs are SCANNED 
... [+10122 chars truncated]

### Assistant | 2026-05-16T03:56:19.528Z

[tool_use: Read]

### User | 2026-05-16T03:56:21.677Z

[tool_result] 200	  return null; // unbalanced — fail loud (caller treats as parse failure)
201	}
202	
203	function clamp01(n) {
204	  const v = typeof n === "number" ? n : Number(n);
205	  if (!Number.isFinite(v)) return null;   // NaN/Infinity/garbage → null (NOT silently 0)
206	  return v < 0 ? 0 : v > 1 ? 1 : v;
207	}
208	
209	const VALID_KINDS = Object.freeze(new Set(["formula", "algorithm", "engine", "tec
... [+8680 chars truncated]

### Assistant | 2026-05-16T03:56:25.162Z

Now let me check the actual byte content of the two regexes on lines 52 and 54, since the Read tool strips C0 control chars (per the [[feedback_read_tool_strips_control_chars]] memory — this exact false-positive class was documented). The `CONTROL_CHARS_RE` on line 52 displays as `/[ --]/g` which is suspicious.

### Assistant | 2026-05-16T03:56:27.707Z

[tool_use: Bash]

### User | 2026-05-16T03:56:33.189Z

[tool_result] 52: const CONTROL_CHARS_RE = /[<0>-<8><11><12><14>-<31><127>]/g;
54: const PROMPT_INJECTION_RE = /\b(ignore (the )?(above|previous|prior)|disregard (all|the)|system prompt|you are now|new instructions?:|forget (everything|all))\b/gi;

### Assistant | 2026-05-16T03:56:36.867Z

Good — line 52's `CONTROL_CHARS_RE` is byte-correct: `/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g` (strips C0 control except `\t`=9, `\n`=10, `\r`=13, plus DEL 127). That guard is real, not a Read-render artifact. Now let me examine the files it claims to compose without forking.

### Assistant | 2026-05-16T03:56:38.145Z

[tool_use: Bash]

### User | 2026-05-16T03:56:43.096Z

[tool_result] Exit code 2
-rw-r--r-- 1 wompu 197611 23184 May 15 21:41 H:/prism/scripts/lib/course-mapper-lib.mjs
-rwxr-xr-x 1 wompu 197611 12049 May 15 20:35 H:/prism/scripts/seed-ghost-llm-classify.mjs*
---ORCH---
ls: cannot access 'H:/prism/scripts/tribal-graph-course-content-mine.mjs': No such file or directory

### Assistant | 2026-05-16T03:56:45.725Z

The orchestrator `tribal-graph-course-content-mine.mjs` doesn't exist yet (this is the lib of iter-7, in progress). Let me check the composition claims against the two sibling libs.

### Assistant | 2026-05-16T03:56:49.262Z

[tool_use: Bash]

### User | 2026-05-16T03:56:54.343Z

[tool_result] course-mapper-lib exports: NODE_KIND, PROVENANCE_SOURCE_DEFAULT, METADATA_CONFIDENCE_DEFAULT, SYLLABUS_CONFIDENCE_DEFAULT, FULL_TEXT_CONFIDENCE_DEFAULT, EXTRACTION_LEVEL_METADATA, EXTRACTION_LEVEL_SYLLABUS, EXTRACTION_LEVEL_FULL, COURSE_LAYER_BAND, parseCourseSlug, deptPrefix, deriveTagsFromCourse, buildCourseNodeId, buildCourseNode, nodesFromCatalog, nodesFromIndex, buildPrismMappingByCourseId, l
... [+221 chars truncated]

### Assistant | 2026-05-16T03:56:57.351Z

[tool_use: Bash]

### User | 2026-05-16T03:57:02.814Z

[tool_result] function buildCourseNodeId(courseSlug, source = PROVENANCE_SOURCE_DEFAULT) {
  const slug = String(courseSlug || "").toLowerCase().trim();
  const src = String(source || PROVENANCE_SOURCE_DEFAULT).toLowerCase().trim();
  if (!slug) throw new Error("buildCourseNodeId: courseSlug required");
  return `course:${src}:${slug}`;
}

/**
 * Build a TribalCourseNode from a single course metadata entry.
 * 
... [+1000 chars truncated]

### Assistant | 2026-05-16T03:57:05.958Z

[tool_use: Bash]

### User | 2026-05-16T03:57:12.558Z

[tool_result] function toGraphNode(courseNode) {
  if (!courseNode || typeof courseNode !== "object") {
    throw new TypeError("toGraphNode: courseNode must be object");
  }
  return {
    id: courseNode.id,
    kind: courseNode.kind,
    layerBand: courseNode.layerBand,
    title: courseNode.title,
    meta: {
      source: courseNode.source,
      courseId: courseNode.courseId,
      term: courseNode.term,
 
... [+498 chars truncated]

### Assistant | 2026-05-16T03:57:16.498Z

This is a **critical integration finding**. `toGraphNode()` — the canonical graph-node shape from the composed iters 3-6 lib — nests `domain` and `prismMapping` under `.meta`, NOT at top level. But `scoreCandidate()` (lines 299-303) and `toCandidateRecord()` read them from the **top level** of `courseNode`. Let me verify the raw `buildCourseNode` output shape (the pre-graph node) too.

### Assistant | 2026-05-16T03:57:17.934Z

[tool_use: Bash]

### User | 2026-05-16T03:57:24.595Z

[tool_result] --- buildCourseNode return block ---
return {
    id,
    kind: NODE_KIND,
    layerBand: COURSE_LAYER_BAND,
    source,
    title,
    courseId,
    term,
    category,
    domain,
    domains,    // full multi-domain array (classifyDomain returns multiple)
    school,
    discipline: l6 ? l6.replace(/^L6:/, "") : "",
    galaxy:     l7 ? l7.replace(/^L7:/, "") : "",
    prismMapping,
    tags,
 
... [+337 chars truncated]

### Assistant | 2026-05-16T03:57:26.890Z

Now I have a definitive picture. Let me check the prismMapping shape (the code expects `Array.isArray(courseNode.prismMapping)`).

### Assistant | 2026-05-16T03:57:29.477Z

[tool_use: Bash]

### User | 2026-05-16T03:57:35.455Z

[tool_result] --- buildPrismMappingByCourseId ---
function buildPrismMappingByCourseId(prismMapping) {
  const out = new Map();
  if (!prismMapping || typeof prismMapping !== "object") return out;
  for (const [product, courseIds] of Object.entries(prismMapping)) {
    if (!Array.isArray(courseIds)) continue;
    for (const cid of courseIds) {
      if (typeof cid !== "string") continue;
      const key = cid.t
... [+336 chars truncated]

### Assistant | 2026-05-16T03:57:42.068Z

[tool_use: Bash]

### User | 2026-05-16T03:57:47.455Z

[tool_result] prismMapping passthrough (array preferred; object accepted).
prismMapping = [];
prismMapping)) {
prismMapping = course.prismMapping.filter(k => typeof k === "string" && !RESERVED_KEYS.has(k));
prismMapping && typeof course.prismMapping === "object") {
prismMapping = Object.keys(course.prismMapping).filter(k => !RESERVED_KEYS.has(k));

--- seed-ghost ollama call ---
ill or script orchestration

Res
... [+648 chars truncated]

### Assistant | 2026-05-16T03:57:50.749Z

(That triage hint is a false positive — no test ran.) I now have everything needed. The Ollama call parity with `seed-ghost-llm-classify.mjs` is confirmed (same injectable `fetchImpl`, `AbortController`, `stream:false`, low temp). Let me do final targeted checks on the boundary-math findings before writing the verdict.

### Assistant | 2026-05-16T03:58:00.489Z

[tool_use: Bash]

### User | 2026-05-16T03:58:05.022Z

[tool_result] hits=2 prior= 0.25  -> bounded branch taken? false
worst-case low-prior rank= 0.4400 (RELEVANCE_FLOOR=0.35) survives? true
RELEVANCE_FLOOR used beyond declaration? 1 occurrences
MINE_CONFIDENCE used: 2
MAX_DESCRIPTOR_LEN cap line68 trimEnd present

### Assistant | 2026-05-16T03:58:58.541Z

I have a complete picture. Two confirmed P1 findings (one integration-coupling, one declared-but-unenforced floor) plus several P2s. Final verdict below.

---

## Independent second-pass review — `H:\prism\scripts\lib\course-content-mine-lib.mjs`

Read end-to-end (395 lines). Byte-verified the two regexes (Read-tool C0-strip false-positive class avoided per the documented E1 lesson — `CONTROL_CHARS_RE` is genuinely `/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g`, the guard is real). Cross-checked composition claims against `scripts/lib/course-mapper-lib.mjs` and `scripts/seed-ghost-llm-classify.mjs`.

### P1 — INTEGRATION COUPLING: `scoreCandidate`/`toCandidateRecord` read `domain`/`prismMapping` from the WRONG nesting level for the canonical graph node

**Lines 299–303, 325–334.** `scoreCandidate()` does:
```js
for (const p of (Array.isArray(courseNode.prismMapping) ? courseNode.prismMapping : [])) ...
if (typeof courseNode.domain === "string") nodeDomains.add(courseNode.domain.toLowerCase());
```
But the composed iters 3-6 lib's canonical graph-node emitter `toGraphNode()` (course-mapper-lib.mjs) nests these under `.meta`:
```js
return { id, kind, layerBand, title, meta: { ... domain, ... prismMapping, ... } };
```
The raw `buildCourseNode()` output *does* expose them top-level, but `toGraphNode()` (the form that lands in the system-viz graph that the iter-7 orchestrator will almost certainly read from) does not. **Repro:** pass a `toGraphNode(buildCourseNode(course))` result into `scoreCandidate` → `nodeDomains` is always empty → `domainMatchBoost` is **always 0** → every candidate's rank is silently deflated by the `(1 + 0.25)` factor it can never earn. This is exactly the "junk record that pollutes the tribal queue" / silent-value-corruption class the review brief flagged. It degrades *safely* (no crash, no inflated rank — it under-ranks, not over-ranks) so it is P1 not P0, but the domain-boost feature is **dead in the most likely integration path**. The JSDoc on `toCand
... [+6593 chars truncated]
