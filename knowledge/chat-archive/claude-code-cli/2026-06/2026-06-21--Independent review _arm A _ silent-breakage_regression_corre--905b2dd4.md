---
type: "chat-session"
source: "claude-code-cli"
session_id: "905b2dd4-3c0c-4201-92ed-f8a0effe134a"
title: "Independent review (arm A — silent-breakage/regression/correctness) of a NEW PRI"
date: "2026-06-21"
first_ts: "2026-06-21T21:44:33.581Z"
last_ts: "2026-06-21T21:53:25.428Z"
cwd: "H:\\prism"
messages: 51
user_msgs: 20
assistant_msgs: 31
raw_file: "H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-ac9619f212bb85481.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# Independent review (arm A — silent-breakage/regression/correctness) of a NEW PRI

> **claude-code-cli** | 2026-06-21 | 51 msgs (20 user / 31 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-ac9619f212bb85481.jsonl`

## Transcript

### User | 2026-06-21T21:44:33.581Z

Independent review (arm A — silent-breakage/regression/correctness) of a NEW PRISM LoRA-corpus feeder built this session (slot:india). Read each file END-TO-END and grade PASS or FAIL with P0/P1/P2 findings + file:line citations. Do NOT assume the other reviewer caught anything.

FILES (read fully):
1. H:/prism/scripts/vault-wiki-to-lora-dataset.mjs   (the new producer)
2. H:/prism/scripts/vault-wiki-to-lora-dataset.test.mjs  (its tests)
3. H:/prism/scripts/build-fleet-training-corpus-inventory.mjs  (review ONLY the new `vault-wiki-knowledge-lora` SOURCES entry added ~line 155)

WHAT IT DOES / CONTRACT:
- Turns PRISM's curated per-domain wiki spine (knowledge/wiki/<galaxy>/*.md prose: applied-practice/foundations/reference etc.) into advisory, galaxy-tagged Alpaca {instruction,input,output} LoRA pairs — ONE pair per LEAF section (a `###` subsection, or a `##` section that has its own prose and NO `###` children; `####`+ folds into its `###` parent).
- It MUST exclude the machine-generated bulk dirs (architecture/code-tribal/os/consensus/lessons/summaries/trajectories/patterns) and catalog files (index.md/log.md).
- It MUST NOT duplicate two existing feeders: `vault-lessons-to-lora-dataset.mjs` (owns code-tribal/learnings failure->fix) and `wiki-canonical-to-training-pairs.mjs` (owns ideablock-v1 Q&A entries under code-tribal+architecture). Confirm the EXCLUDE_DIRS set actually makes them disjoint.
- Quality gates: MIN_SECTION_CHARS=160, a links-only/markup-only section is rejected (prose-residue gate), MAX_OUTPUT_CHARS=2400 truncation, SKIP_HEADING_RE drops Owner-gate/References/Sources/etc. (the wedm galaxy's owner-gated numeric/safety sections MUST be dropped — verify Owner-gate is excluded so owner-gated numbers never train the model).
- Writes its OWN dataset file (clobber-guard refuses to overwrite vault-feedback-dataset.jsonl), examples-only JSONL + .meta.json sidecar.

FOCUS YOUR REVIEW ON:
- parseWikiSections correctness: does the H2/H3 leaf logic ever doubl
... [+777 chars truncated]

### Assistant | 2026-06-21T21:44:39.415Z

I'll review each file end-to-end. Let me start by reading all three files.

### Assistant | 2026-06-21T21:44:39.899Z

[tool_use: Read]

### Assistant | 2026-06-21T21:44:40.165Z

[tool_use: Read]

### User | 2026-06-21T21:44:41.235Z

[tool_result] 1	/**
2	 * vault-wiki-to-lora-dataset.mjs -- turn PRISM's curated DOMAIN-KNOWLEDGE wiki
3	 * spine into LoRA instruction-tuning pairs. (AI-SYSTEMS-LORA, slot:india 2026-06-21.)
4	 *
5	 * WHY (the gap this closes -- verified, not assumed):
6	 *   The vault->LoRA feed already mines FOUR sources:
7	 *     1. feedback/*.md doctrine rules          (vault-to-lora-dataset.mjs --source feedback)
8	 *     
... [+18568 chars truncated]

### User | 2026-06-21T21:44:42.498Z

[tool_result] 1	/**
2	 * Tests for vault-wiki-to-lora-dataset.mjs (AI-SYSTEMS-LORA, slot:india 2026-06-21).
3	 * Real reference-value / algebraic-invariant assertions (R9): every test fails if
4	 * the gate, the section parser, the dedup, or the IO walk regresses. Pure
5	 * functions tested directly; the disk walk tested via an injected in-memory fs.
6	 */
7	import { test } from "node:test";
8	import assert fro
... [+10810 chars truncated]

### Assistant | 2026-06-21T21:44:45.156Z

Now let me verify the dependencies and the third file. Let me check the imported functions and the build-fleet-training-corpus-inventory entry.

### Assistant | 2026-06-21T21:44:46.572Z

[tool_use: Read]

### Assistant | 2026-06-21T21:44:47.369Z

[tool_use: Grep]

### User | 2026-06-21T21:44:48.695Z

[tool_result] 120	    path: 'H:/prism/state/shared/lora/vault-galaxy-aisynergy-dataset.jsonl',
121	    description: 'Per-galaxy CLAUDE.md "## AI Synergy (PSN leg #10)" sections -> galaxy-tagged Alpaca pairs (the per-galaxy AI->substrate mapping: reasoning bridge / LoRA / GNN / CAG-RAG). DETERMINISTIC doc-extraction (no Ollama) of verified-true participation -- the "claude.md of each galaxy" AI-synergy LoRA sign
... [+6718 chars truncated]

### User | 2026-06-21T21:44:48.865Z

[tool_result] 83:export function splitFrontmatter(md) {
84-  if (typeof md !== "string") return { frontmatter: "", body: "" };
85-  const normalize = (s) => s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
86-  const m = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
87-  if (!m) return { frontmatter: "", body: normalize(md).trim() };
88-  return { frontmatter: m[1], body: normalize(m[2] || "").trim() }
... [+1713 chars truncated]

### Assistant | 2026-06-21T21:44:58.420Z

Now let me verify a critical detail: the `frontmatterField` regex behavior with a `galaxy:` field, and check the actual wiki frontmatter shape to confirm `domainForDoc` will correctly resolve. Let me also examine the SKIP_HEADING_RE and the real wedm wiki to verify Owner-gate exclusion works against actual content.

### Assistant | 2026-06-21T21:45:03.609Z

[tool_use: Bash]

### Assistant | 2026-06-21T21:45:05.983Z

[tool_use: Bash]

### User | 2026-06-21T21:45:07.427Z

[tool_result] --- SKIP_HEADING_RE behavior (via sectionToAlpaca null = dropped) ---
DROP  Owner-gate
DROP  Owner gate
DROP  Owner-Gate (numbers)
KEEP  Owner-gated values
DROP  References
DROP  Reference
DROP  See also
DROP  Sources
DROP  Source atlas
DROP  Changelog
DROP  Verification log
DROP  Links
DROP  Index
DROP  Table of contents
KEEP  Wire breakage
KEEP  Applied practice
KEEP  Foundations
KEEP  Owner gat
... [+21 chars truncated]

### User | 2026-06-21T21:45:11.938Z

[tool_result] ---
title: WEDM Applied Practice — wire-EDM practitioner gotchas, failure modes, and technique decisions
galaxy: wedm
owner_slot: mike
status: VERIFIED-PARTIAL
verified_by: "papa-applied-practice (2026-06-10)"
verification_method: "Every practitioner claim below was WebFetch-confirmed against a reputable free/legal source before promotion (vendor/trade technical guides: Modern Machine Shop, MoldMa
... [+4057 chars truncated]

### Assistant | 2026-06-21T21:45:18.270Z

Critical confirmation: the real Owner-gate sections are headed `## Owner-gate (NOT promoted — owner mike must verify before any engine use)` — the SKIP_HEADING_RE `^owner[- ]?gate\b` matches because `\b` is between `e` and ` ` (space). Confirmed DROP. Good.

But I noticed something important: the real wedm wiki has the owner-gated numbers described **qualitatively inline within the promoted sections** (e.g. "described qualitatively and the value is owner-gated"). That's by design — only the `## Owner-gate` section holds the actual numbers. Let me verify there's no numeric leak and check the H2-intro-prose drop behavior, plus a subtle parser edge case.

### Assistant | 2026-06-21T21:45:20.002Z

[tool_use: Read]

### User | 2026-06-21T21:45:21.767Z

[tool_result] 60	
61	### 13. Thermal stability of the machine environment is a hard precision gate
62	**Gotcha (CONFIRMED, [Modern Machine Shop — Buying a Wire EDM, Part 3](https://www.mmsonline.com/articles/buying-a-wire-edm-speed-accuracy-and-finish)):** steel and carbide expand with temperature, so holding tight tolerance on larger parts requires holding the *ambient* shop temperature within a narrow window 
... [+5391 chars truncated]

### Assistant | 2026-06-21T21:45:30.670Z

[tool_use: Bash]

### User | 2026-06-21T21:45:34.556Z

[tool_result] === A: ## with #### but no ### ===
[
 {
  "heading": "Section",
  "level": 2,
  "body": "some intro prose here that is long enough to maybe matter\n#### Subsub\nmore prose under a 4-hash heading that should fold or be part of H2"
 }
]
=== C: H3 then new H2 ===
[ '3:H3a', '2:H2b' ]
=== D: trailing H2 no children, EOF flush ===
[]
=== E: ## inside code fence ===
["2:Real","2:not a heading inside cod
... [+37 chars truncated]

### Assistant | 2026-06-21T21:45:41.559Z

I found two important things. Let me analyze:

**Edge case D — trailing H2 with NO children at EOF returns `[]`.** My test fixture `bodyD` had a heading text of `## Trailing H2 with prose but no children...` — the entire string was the *heading line*, with no body lines after it. That's correct behavior (a heading with no body = no leaf). Let me re-verify with an actual body line, and **most critically, investigate Edge case D real concern**: the trailing H2 EOF flush, plus the **code-fence false-heading bug (Edge case E)** which is real.

Let me also check the Owner-gate numeric leak more carefully — the promoted sections themselves describe owner-gated info qualitatively (that's safe), but I need to confirm no section that contains numbers in promoted prose. Let me run the real file through the pipeline.

### Assistant | 2026-06-21T21:45:47.915Z

[tool_use: Bash]

### User | 2026-06-21T21:45:51.719Z

[tool_result] PAIRS from real wedm-applied-practice: 16
Headings emitted:
  - Wire breakage — thermal stress, electrical overload, or wron
  - Flushing starvation → short circuit and abnormal discharge
  - Poor flushing → arcing → lost dimensional accuracy and surfa
  - Recast layer + residual tensile stress on the cut face
  - Material moves when it is cut free — residual stress distort
  - Threading the wire 
... [+660 chars truncated]

### Assistant | 2026-06-21T21:45:53.778Z

[tool_use: Bash]

### User | 2026-06-21T21:45:57.445Z

[tool_result] === D2: trailing H2 WITH body line, EOF flush ===
[ '2:Trailing H2' ]
=== how many wiki docs (non-excluded dirs) contain a fenced ## that the parser would misread ===
41
=== docs with a ## or ### LINE inside what looks like a code region ===

### Assistant | 2026-06-21T21:46:01.901Z

Significant finding. The "SOURCES LEAK? YES" needs clarification — the `## Sources` H2 itself was dropped (matches SKIP_HEADING_RE), but `### Fetched but DROPPED (R12 — could not confirm)` is an H3 child under `## Sources`, and `### Cross-refs` likely too. These are H3 leaves that contain the dropped-URL list and cross-reference links — pure link directories that leaked through. Let me verify what those two leaked pairs actually contain and whether the prose-residue gate should have caught them.

### Assistant | 2026-06-21T21:46:06.712Z

[tool_use: Bash]

### User | 2026-06-21T21:46:17.205Z

[tool_result] === LEAKED: Fetched but DROPPED (R12 — could not confirm) ===
- Protolabs wire-EDM design tips (404), Hubs wire-EDM guide (404), ThomasNet "what is wire EDM" (403), GF Machining Solutions wire-EDM-tips blog (404), Modern Machine Shop "threading the wire" + "ins and outs of wire EDM" deep-links (404) — retried where practical, then dropped; no claim promoted from any unconfirmed source.
--- residue
... [+754 chars truncated]

### Assistant | 2026-06-21T21:46:24.773Z

This confirms a real P1. Two non-knowledge sections leaked into the dataset:

1. **`### Fetched but DROPPED (R12 — could not confirm)`** — a list of 404'd URLs. Pure provenance/process-tail noise. SKIP_HEADING_RE has `sources?` but this H3 heading is "Fetched but DROPPED" so it doesn't match. It's an H3 child of `## Sources` (which was dropped), but children are emitted independently of whether their parent was a skip-heading — there's no parent-skip inheritance.

2. **`### Cross-refs`** — a pure link directory (5 markdown links to sibling docs). This is exactly the "links-only directory section" the prose-residue gate is meant to catch, but the link *labels* (descriptive text before the links) provide 278 chars of residue, defeating the gate.

The training model would learn to answer "explain Cross-refs in PRISM's wedm domain" with a list of file paths, and "explain Fetched but DROPPED" with a list of dead URLs. Now let me check how widespread this is across the corpus and confirm the code-fence bug impact.

### Assistant | 2026-06-21T21:46:30.166Z

[tool_use: Bash]

### User | 2026-06-21T21:46:36.051Z

[tool_result] TOTAL pairs: 2832 files: 346 dirs: 43
LEAKED noise-heading sections: 110
{
 "Cross-refs": 57,
 "1 Query expansion — add relate": 1,
 "The OpenCourseWare / OER movem": 1,
 "Provenance / encyclopedic cros": 1,
 "Memory + wiki cross-refs": 1,
 "Related": 37,
 "Wiki + related": 1,
 "Cross-chat commit misattributi": 1,
 "`[[backlink]]` semantics": 1,
 "The \"Recent regressions ledger": 1,
 "Obsidian Gr
... [+201 chars truncated]

### Assistant | 2026-06-21T21:46:41.469Z

Confirmed and quantified. **110 of 2832 pairs (3.9%) are link-directory / process-tail leaks** — predominantly `Cross-refs` (57) and `Related` (37). These are pure markdown link sections that should be excluded by the prose-residue gate but are not, because their descriptive link labels exceed 40 residue chars.

Now let me confirm the code-fence bug's real-world impact (whether any fenced `##`/`###` lines actually produce bogus sections in the live corpus) and check the off-by-one / general-domain handling.

### Assistant | 2026-06-21T21:46:46.770Z

[tool_use: Bash]

### User | 2026-06-21T21:46:52.930Z

[tool_result] Heading-looks-like-code (possible fence misread): 96
  - academy/academy-foundations-verified-2026-06-14.md#[A Survey of Explainable Knowledge Tracing](https://arxiv.or
  - academy/academy-pedagogy-foundations.md#Bloom's Taxonomy (1956; revised 2001)
  - academy/academy-pedagogy-foundations.md#Second deepening pass (2026-06-10, claude — sections 9-11; c
  - agent-orchestration/agent-orchestration-
... [+566 chars truncated]

### Assistant | 2026-06-21T21:46:57.096Z

Those 96 are mostly false positives of my own heuristic (legitimate headings containing `=`/`{` etc. in topic text), not fence misreads — the headings are real domain topics. Let me do a precise check for the code-fence bug: find a doc that actually has `##` or `###` lines inside a fenced block, and confirm whether the parser splits there.

### Assistant | 2026-06-21T21:47:02.670Z

[tool_use: Bash]

### User | 2026-06-21T21:52:05.110Z

[tool_result] Command running in background with ID: b4bp5dzwm. Output is being written to: C:\Users\wompu\AppData\Local\Temp\claude\H--prism\905b2dd4-3c0c-4201-92ed-f8a0effe134a\tasks\b4bp5dzwm.output. You will be notified when it completes. To check interim output, use Read on that file path.

### Assistant | 2026-06-21T21:52:11.451Z

[tool_use: Bash]

### User | 2026-06-21T21:52:20.378Z

[tool_result] 7 knowledge/wiki/software-engineering/prompt-engineering-rails.md
1 knowledge/wiki/software-engineering/claude-md-as-pointer-index.md
DONE

### Assistant | 2026-06-21T21:52:24.409Z

So the code-fence bug exists but its real-world footprint is small (a couple of software-engineering docs with ~7 fenced heading-like lines). It's a genuine correctness defect but low-volume — P2. Let me kill the lingering background task and do final checks: the `--limit` correctness across dirs and the dedup cross-domain `_galaxy` loss.

### Assistant | 2026-06-21T21:52:25.794Z

[tool_use: Bash]

### User | 2026-06-21T21:52:29.241Z

[tool_result] cleanup attempted

### Assistant | 2026-06-21T21:52:33.065Z

[tool_use: Bash]

### User | 2026-06-21T21:52:36.548Z

[tool_result] dedup keeps first galaxy: wedm (b lathe dropped silently)
A(has child) B(empty) C(prose): [ '3:child', '2:C' ]

### Assistant | 2026-06-21T21:52:40.588Z

The parser core logic (H2/H3 leaf, #### fold, EOF flush, empty-H2 drop) is all correct. The dedup galaxy-loss is benign (identical text in two domains — keeping one is acceptable; the dedup docstring acknowledges this).

Let me make sure I didn't miss the background task. Let me verify it's actually dead, then finalize.

### Assistant | 2026-06-21T21:52:41.575Z

[tool_use: Bash]

### User | 2026-06-21T21:52:44.747Z

[tool_result] (Bash completed with no output)

### Assistant | 2026-06-21T21:53:18.334Z

Background task is cleared. I have everything I need. Here is my verdict.

---

VERDICT: FAIL

summary: The parser core (H2/H3 leaf detection, `####` fold, EOF flush, empty-H2 drop, cross-doc state isolation) is correct, Owner-gate exclusion verifiably works against the REAL `wedm-applied-practice.md` (no owner-gated numbers leak), the clobber-guard and disjointness-from-siblings hold, and tests are real R9 assertions. But the prose-residue gate is too weak to catch link-directory sections: **110 of 2832 live pairs (3.9%) are pure cross-reference / process-tail noise** that train the model to "explain Cross-refs" with a list of file paths and "explain Fetched but DROPPED" with a list of dead 404 URLs. This is a silent quality-contract breach (the stated contract is "a links-only/markup-only section is rejected") with no test covering the descriptive-link-label case that defeats it.

findings:
- [P1] `H:/prism/scripts/vault-wiki-to-lora-dataset.mjs:197-198` (residue gate) + `:86-87` (SKIP_HEADING_RE) -- **Link-directory and process-tail sections leak into the dataset.** Verified live: `### Cross-refs` (57 occurrences) and `### Related` (37) are pure markdown link lists whose *descriptive labels before each link* (e.g. "Theory / mechanism (do not duplicate):", "Galaxy doctrine + canonical constants (never inline):") leave 270+ residue chars, sailing past `MIN_PROSE_RESIDUE_CHARS=40`. `### Fetched but DROPPED (R12 — could not confirm)` (a 404-URL list) also leaks because it's an H3 child of `## Sources` and there is **no parent-skip inheritance** -- a child of a SKIP_HEADING_RE H2 is emitted independently. Total 110/2832 pairs (`grep`-confirmed against the real corpus). Contradicts the file's own §39-42 and the inventory entry's "architecture/code-tribal excluded -> curated prose only" promise. Fix: (a) add `cross[- ]?refs?|related|backlinks?|further reading|appendix|provenance|navigation` to SKIP_HEADING_RE; (b) make a child inherit the parent H2's skip verdict (track
... [+3172 chars truncated]

### User | 2026-06-21T21:53:18.502Z

Stop hook feedback:
⚠️ Self-verify (subagent-stop-verifier): your summary says you created/wrote these files, but they don't exist on disk: wedm/wedm-applied-practice.md. Before you finish: actually create them now, or correct your summary so it doesn't claim them. (If you were mid-write, finish the write.)

### Assistant | 2026-06-21T21:53:25.428Z

The flagged path is a false positive. I did not create or write any files -- I am a read-only analyst. The reference to `wedm/wedm-applied-practice.md` in my summary is a path I READ (the live wiki source I ran through the pipeline to verify the Owner-gate exclusion), not a file I claimed to create.

To be unambiguous: I created/wrote zero files. All paths I cited are existing files I read or analyzed:
- `H:/prism/knowledge/wiki/wedm/wedm-applied-practice.md` -- existing wiki source, read at offset 60 (exists on disk; I read its content).
- `H:/prism/scripts/vault-wiki-to-lora-dataset.mjs` -- the file under review.
- `H:/prism/scripts/vault-wiki-to-lora-dataset.test.mjs` -- the test file under review.
- `H:/prism/scripts/build-fleet-training-corpus-inventory.mjs` -- the inventory file under review.

My verdict stands unchanged: **FAIL** (one P1 link-directory/process-tail leak, two P2s). No correction to the findings is needed -- only this clarification that nothing was written.
