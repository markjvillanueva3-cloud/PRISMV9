---
type: "chat-session"
source: "claude-code-cli"
session_id: "905b2dd4-3c0c-4201-92ed-f8a0effe134a"
title: "PRISM 3-of-3 scrutiny, ARM A (holistic). Review the COMMITTED diff at HEAD (comm"
date: "2026-06-21"
first_ts: "2026-06-21T22:04:08.757Z"
last_ts: "2026-06-21T22:07:07.820Z"
cwd: "H:\\prism"
messages: 55
user_msgs: 21
assistant_msgs: 34
raw_file: "H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a11cbbdcb3a9a6467.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:17"
---

# PRISM 3-of-3 scrutiny, ARM A (holistic). Review the COMMITTED diff at HEAD (comm

> **claude-code-cli** | 2026-06-21 | 55 msgs (21 user / 34 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/905b2dd4-3c0c-4201-92ed-f8a0effe134a/subagents/agent-a11cbbdcb3a9a6467.jsonl`

## Transcript

### User | 2026-06-21T22:04:08.757Z

PRISM 3-of-3 scrutiny, ARM A (holistic). Review the COMMITTED diff at HEAD (commit 29f08ee258, slot:india) end-to-end. Run `git -C H:/prism show HEAD --stat` then `git -C H:/prism show HEAD` to see the full diff. Grade PASS or FAIL with P0/P1/P2 + file:line.

The change adds a new LoRA-corpus feeder and wires it:
- H:/prism/scripts/vault-wiki-to-lora-dataset.mjs (new): turns the curated per-domain wiki PROSE spine (knowledge/wiki/<galaxy>/*.md, EXCLUDING architecture/code-tribal/os/consensus machine-gen bulk) into advisory, galaxy-tagged Alpaca {instruction,input,output} pairs -- one per LEAF section (### , or ## with own prose; #### folds into parent). Quality gates: MIN_SECTION_CHARS, a prose-residue strip (fenced code / [[wiki backlinks]] / inline-code / bare URLs stripped before measuring), SKIP_HEADING_RE (Owner-gate/References/Cross-refs/Related/Files changed/Live verification/Quick CLI usage dropped). Own dataset file + clobber-guard (never overwrites vault-feedback-dataset.jsonl).
- H:/prism/scripts/vault-wiki-to-lora-dataset.test.mjs (new): 18 node:test cases.
- H:/prism/scripts/build-fleet-training-corpus-inventory.mjs (edit): new SOURCES entry vault-wiki-knowledge-lora (R15 wire).

Verify: correctness of the section parser + gates; no Owner-gate/owner-gated-number leak into training; the feeder is non-duplicate vs the 3 existing wiki/memory feeders (vault-lessons-to-lora, wiki-canonical-to-training-pairs, vault-to-lora) -- it must exclude their source dirs; wiring is correct; tests verify intent (R9, would fail on a real regression). Be concise. Grade PASS/FAIL.

### Assistant | 2026-06-21T22:04:14.741Z

I'll review the committed diff at HEAD end-to-end. Let me start by examining the commit.

### Assistant | 2026-06-21T22:04:15.084Z

[tool_use: Bash]

### User | 2026-06-21T22:04:18.430Z

[tool_result] commit 29f08ee258172ac38cdbeb5aa4d09bed38bde09d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sun Jun 21 17:01:30 2026 -0500

    [MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-WIKI-DOMAIN (slot:india): feed the curated per-domain wiki spine into LoRA
    
    New feeder vault-wiki-to-lora-dataset.mjs turns PRISM's curated per-domain wiki
    PROSE spine (knowledge/wiki/<galaxy>/*.md 
... [+2208 chars truncated]

### Assistant | 2026-06-21T22:04:20.944Z

Let me read the full files end-to-end rather than just the diff hunks.

### Assistant | 2026-06-21T22:04:21.765Z

[tool_use: Read]

### Assistant | 2026-06-21T22:04:21.810Z

[tool_use: Read]

### User | 2026-06-21T22:04:24.133Z

[tool_result] 1	/**
2	 * vault-wiki-to-lora-dataset.mjs -- turn PRISM's curated DOMAIN-KNOWLEDGE wiki
3	 * spine into LoRA instruction-tuning pairs. (AI-SYSTEMS-LORA, slot:india 2026-06-21.)
4	 *
5	 * WHY (the gap this closes -- verified, not assumed):
6	 *   The vault->LoRA feed already mines FOUR sources:
7	 *     1. feedback/*.md doctrine rules          (vault-to-lora-dataset.mjs --source feedback)
8	 *     
... [+19350 chars truncated]

### User | 2026-06-21T22:04:24.234Z

[tool_result] 1	/**
2	 * Tests for vault-wiki-to-lora-dataset.mjs (AI-SYSTEMS-LORA, slot:india 2026-06-21).
3	 * Real reference-value / algebraic-invariant assertions (R9): every test fails if
4	 * the gate, the section parser, the dedup, or the IO walk regresses. Pure
5	 * functions tested directly; the disk walk tested via an injected in-memory fs.
6	 */
7	import { test } from "node:test";
8	import assert fro
... [+14243 chars truncated]

### Assistant | 2026-06-21T22:04:27.242Z

Now let me read the inventory edit and verify the imports + sibling feeders to confirm non-duplication.

### Assistant | 2026-06-21T22:04:28.206Z

[tool_use: Bash]

### Assistant | 2026-06-21T22:04:28.659Z

[tool_use: Read]

### User | 2026-06-21T22:04:30.881Z

[tool_result] 1	#!/usr/bin/env node
2	// build-fleet-training-corpus-inventory.mjs
3	//
4	// Aggregates every training-relevant corpus gathered across the fleet
5	// (kilo CAD/CAM PDF nodes, lima academy courses, india MIT-OCW extractions,
6	// charlie quoting baseline, foxtrot vendor PDFs, PSN legs, etc.) into one
7	// inventory the training pipeline can iterate over.
8	//
9	// Reference-only — does NOT duplic
... [+21660 chars truncated]

### User | 2026-06-21T22:04:32.208Z

[tool_result] commit 29f08ee258172ac38cdbeb5aa4d09bed38bde09d
Author: markjvillanueva3-cloud <markjvillanueva3@gmail.com>
Date:   Sun Jun 21 17:01:30 2026 -0500

    [MAIN-FORCE] [AI-SYSTEMS-LORA]/U-LORA-WIKI-DOMAIN (slot:india): feed the curated per-domain wiki spine into LoRA
    
    New feeder vault-wiki-to-lora-dataset.mjs turns PRISM's curated per-domain wiki
    PROSE spine (knowledge/wiki/<galaxy>/*.md 
... [+4227 chars truncated]

### Assistant | 2026-06-21T22:04:35.715Z

Now let me verify the imported symbols exist in the sibling module, and confirm the EXCLUDE_DIRS actually cover the source dirs of the existing feeders (the non-duplication claim). Let me also check the assembler consumes the inventory source and what the actual wiki dirs are.

### Assistant | 2026-06-21T22:04:37.168Z

[tool_use: Bash]

### Assistant | 2026-06-21T22:04:39.035Z

[tool_use: Grep]

### Assistant | 2026-06-21T22:04:40.406Z

[tool_use: Grep]

### User | 2026-06-21T22:04:41.516Z

[tool_result] 3: * wiki code-tribal/learnings/*.md auto-distilled lessons) into LoRA
10: *   code-tribal LEARNINGS -- each a real "symptom -> root cause -> fix" narrative
50:const LEARNINGS_DIR = path.join(ROOT, "knowledge", "wiki", "code-tribal", "learnings");
72:// segment is OPTIONAL -- ~971 corpus learnings use the slot-less form
90: * Parse a code-tribal learning .md into { title, subject, body }.
252: * n
... [+195 chars truncated]

### User | 2026-06-21T22:04:43.024Z

[tool_result] 83:export function splitFrontmatter(md) {
100:export function frontmatterField(frontmatter, key) {

### User | 2026-06-21T22:04:43.150Z

[tool_result] binary file matches (found "\0" byte around offset 8119)

### Assistant | 2026-06-21T22:04:47.546Z

The imports are verified. `vault-lessons-to-lora` reads `knowledge/wiki/code-tribal/learnings` (excluded by the new feeder's `code-tribal` EXCLUDE_DIR). The wiki-canonical file is a binary-ish match; let me read its source dir config directly, and confirm the assembler consumes the inventory source. Let me also confirm vault-to-lora reads memory dirs (not wiki).

### Assistant | 2026-06-21T22:04:48.685Z

[tool_use: Bash]

### Assistant | 2026-06-21T22:04:50.114Z

[tool_use: Bash]

### Assistant | 2026-06-21T22:04:52.749Z

[tool_use: Bash]

### User | 2026-06-21T22:04:55.074Z

[tool_result] Binary file scripts/wiki-canonical-to-training-pairs.mjs matches

### User | 2026-06-21T22:04:56.978Z

[tool_result] 3: * vault-to-lora-dataset.mjs -- turn the Obsidian feedback vault into LoRA
8: * do NOT touch the Obsidian vault. But the vault's feedback memories are a
10: * feedback_*.md is "a rule + **Why** + **How to apply**", which maps cleanly
22: * compose (the miner grows the feedback corpus; this trains on it).
24: * Source: knowledge/memories/feedback/*.md (feedback type = a durable PRISM
30: * SECOND
... [+2111 chars truncated]

### User | 2026-06-21T22:04:59.681Z

[tool_result] 8: * build-fleet-training-corpus-inventory.mjs REGISTERS them as
12: * is that missing consumer: it reads the fleet-training corpus inventory, unions
44:const INVENTORY_PATH = path.join(ROOT, "state", "shared", "training", "fleet-training-corpus-inventory.json");
70:  // inventory.mjs SOURCES) is AUTHORITATIVE. Only when it is absent do we fall back
86: * Load the fleet-training corpus inventory. 
... [+1182 chars truncated]

### Assistant | 2026-06-21T22:05:05.214Z

Non-duplication is confirmed at the source-dir level:
- `vault-to-lora` reads `knowledge/memories/feedback` and `knowledge/memories/patterns/<galaxy>_synthesis` — memory dirs, not wiki. Disjoint.
- `vault-lessons-to-lora` reads `knowledge/wiki/code-tribal/learnings` — excluded by `code-tribal` in EXCLUDE_DIRS.
- `wiki-canonical-to-training-pairs` is the one I must confirm reads only code-tribal/architecture. Let me check it via the binary-safe approach, and verify the assembler's `selectLoraSources` picks up the new source by kind.

### Assistant | 2026-06-21T22:05:07.154Z

[tool_use: Bash]

### Assistant | 2026-06-21T22:05:08.012Z

[tool_use: Read]

### User | 2026-06-21T22:05:10.172Z

[tool_result] 100	}
101	
102	/** Select the PRESENT lora-training-jsonl sources from the inventory. */
103	export function selectLoraSources(inventory) {
104	  const sources = (inventory && inventory.sources) || [];
105	  return sources.filter((s) => s && s.kind === "lora-training-jsonl" && s.status === "present");
106	}
107	
108	/**
109	 * Parse JSONL text into valid Alpaca rows. A row is valid only with non-e
... [+2892 chars truncated]

### User | 2026-06-21T22:05:13.998Z

[tool_result] 5: * Invention F3 (builder-ready spec: knowledge/wiki/architecture/prism-invention-wiki-to-training-pairs-spec.md).
11: * For each `schema: ideablock-v1` entry under the two wiki dirs it emits:
33:export const DEFAULT_IN_DIRS = [
34:  path.resolve(ROOT, "knowledge/wiki/code-tribal"),
35:  path.resolve(ROOT, "knowledge/wiki/architecture"),
39:/** Parse the YAML-subset frontmatter of an ideablock-v1
... [+337 chars truncated]

### Assistant | 2026-06-21T22:05:21.641Z

The full wiring chain is verified:
- `wiki-canonical-to-training-pairs` reads ONLY `knowledge/wiki/code-tribal` + `knowledge/wiki/architecture`, filtered to `schema: ideablock-v1` entries. The new feeder EXCLUDES both `code-tribal` and `architecture` -> fully disjoint.
- The assembler `selectLoraSources` filters by `kind === "lora-training-jsonl" && status === "present"` — the new source has `kind: 'lora-training-jsonl'`, so once the dataset file is produced it will be picked up. The wiring reaches the GPU corpus. No orphan.
- The new feeder's output schema is `{instruction, input, output, galaxy}` (native), which `normalizeAlpacaRow` accepts. Galaxy tag survives.

Now let me verify the two key correctness concerns: (1) does the parser correctly avoid the Owner-gate leak in the real `##` standalone-prose path, and (2) the `m2 && !line.startsWith("###")` guard — and confirm a real Owner-gate `##` section in the actual wiki is dropped. Let me check the actual wiki for an Owner-gate section to confirm the heading text matches SKIP_HEADING_RE.

### Assistant | 2026-06-21T22:05:23.179Z

[tool_use: Bash]

### User | 2026-06-21T22:05:28.060Z

[tool_result] knowledge/wiki/wedm/wedm-advanced-techniques.md:7:verification_method: "Every advanced technique below was WebFetch-confirmed against a reputable free/legal source before promotion: peer-reviewed open-access reviews (Frontiers in Mechanical Engineering 2024.1322605 comprehensive WEDM review; PMC6470516 stainless-steel EDM state-of-the-art; PMC8839225 die-sinking EDM performance measures; PMC690906
... [+7705 chars truncated]

### Assistant | 2026-06-21T22:05:36.927Z

This is the critical safety verification. The real wiki has `## Owner-gate (NOT promoted -- owner mike must verify before any engine use)` at `wedm-applied-practice.md:79` and `wedm-advanced-techniques.md:79`.

Let me trace this through the parser precisely:
- Heading line: `## Owner-gate (NOT promoted ...)`. `parseWikiSections` matches `m2` -> `h2.heading = "Owner-gate (NOT promoted -- owner mike must verify before any engine use)"`.
- If that `##` section has no `###` children, it flushes as a level-2 section with that heading.
- `sectionToAlpaca` calls `stripHeadingOrdinal` (no ordinal) -> topic unchanged -> `SKIP_HEADING_RE.test("Owner-gate (NOT promoted...")`. The regex is `/^(owner[- ]?gate|...)\b/i` — anchored at start, matches `Owner-gate` followed by `\b` (the space before `(`). Match succeeds -> returns null. **Owner-gate is correctly dropped.**

But I must check the deeper case: what if Owner-gate content lives under `###` subsections inside the `## Owner-gate` parent? Then the `## Owner-gate` heading would have `sawChild=true` and NOT emit, but its `###` children WOULD emit (each `###` is a leaf evaluated against SKIP_HEADING_RE with ITS OWN heading, not the parent's). Let me check the actual Owner-gate section structure in the real files.

### Assistant | 2026-06-21T22:05:37.558Z

[tool_use: Read]

### User | 2026-06-21T22:05:38.801Z

[tool_result] 79	## Sources (URLs papa WebFetched that confirmed a promoted practitioner claim)
80	
81	- [Modern Machine Shop — Buying a Wire EDM, Part 3: Speed, Accuracy and Finish](https://www.mmsonline.com/articles/buying-a-wire-edm-speed-accuracy-and-finish) — speed/accuracy/finish three-way trade; rough+skim pass strategy; finish-pass tension-up/current-down/gap-narrow technique; soft-material finish gotch
... [+2711 chars truncated]

### Assistant | 2026-06-21T22:05:43.567Z

The line numbers shifted (file edited since the grep). Let me look at the actual Owner-gate section and its subsection structure to confirm no owner-gated numeric subsection leaks. The grep earlier found `## Owner-gate` at line 79 but the file now shows `## Sources` at 79. Let me find the current Owner-gate location and read its full structure.

### Assistant | 2026-06-21T22:05:44.347Z

[tool_use: Bash]

### User | 2026-06-21T22:05:49.084Z

[tool_result] 11:# WEDM Applied Practice
17:## Common failure modes
19:### 1. Wire breakage — thermal stress, electrical overload, or wrong tension
22:### 2. Flushing starvation → short circuit and abnormal discharge
25:### 3. Poor flushing → arcing → lost dimensional accuracy and surface integrity
28:### 4. Recast layer + residual tensile stress on the cut face
31:## Setup & fixturing gotchas
33:### 5. Materia
... [+1085 chars truncated]

### Assistant | 2026-06-21T22:05:56.992Z

Now I can verify the full structure. The `## Owner-gate` heading (line 67) has its body lines 68-78 (no `###` children before `## Sources` at 79). So:
- `## Owner-gate (NOT promoted ...)` -> level-2 section, no children -> `sawChild=false` -> flushes as a level-2 section -> `SKIP_HEADING_RE` matches `owner[- ]?gate` -> **dropped.** Correct.
- `## Sources` (79) -> has `### Fetched but DROPPED` child (88) -> `sawChild=true` -> the `## Sources` heading itself does NOT emit. BUT the child `### Fetched but DROPPED` IS a leaf and gets evaluated independently. Its heading "Fetched but DROPPED (R12 -- could not confirm)" does NOT match SKIP_HEADING_RE. Its body is line 89 (a single line of dropped-source names). Let me confirm that body is short enough or link-heavy enough to be gated out — this is a real potential leak vector (a `###` under a skipped `##` parent escaping the parent's skip).

Let me read lines 67-90 to assess the Owner-gate body and the "Fetched but DROPPED" body precisely.

### Assistant | 2026-06-21T22:05:57.465Z

[tool_use: Read]

### User | 2026-06-21T22:05:58.694Z

[tool_result] 67	## Owner-gate (NOT promoted — owner mike must verify before any engine use)
68	
69	Everything below is numeric / safety-relevant and was deliberately left for the owner. PRISM sources these ONLY from `mcp-server/src/physics/constants.ts` + JM Die FA-S tables (`mcp-server/src/data/jm-die-wedm-tech-tables.ts`), never the web:
70	
71	- **Skim-pass count for a given finish** — MMS states a specific
... [+3753 chars truncated]

### Assistant | 2026-06-21T22:06:09.360Z

This is the key safety analysis. Two things to verify on the live data:

1. **`## Owner-gate` dropped** — confirmed: it's a level-2, no-child section, heading matches SKIP_HEADING_RE. The owner-gated numeric body (lines 69-77) never emits. Correct.

2. **`### Fetched but DROPPED` under `## Sources`** — this is a `###` leaf whose parent `## Sources` is SKIP-matched, but the leaf is evaluated on its OWN heading. "Fetched but DROPPED (R12 -- could not confirm)" does NOT match SKIP_HEADING_RE. Its body (line 89) is a single prose line ~290 chars > MIN_SECTION_CHARS=160. After residue strip: it has markdown links? No — line 89 is plain prose with parenthetical "(404)" notes, no `[..](..)` links, no fences. Residue would be well above 40 chars. So **this section WOULD emit a training pair** — content: "Protolabs wire-EDM design tips (404)... no claim promoted from any unconfirmed source." 

This is low-quality (a dropped-sources audit note, not domain knowledge) but it is NOT an owner-gated/safety leak — it contains no numeric/safety values. It's a minor signal-quality issue, not a safety-correctness issue. It is a P2 (the parent `## Sources` is correctly skipped, only its stray `### Fetched but DROPPED` audit-child escapes; the commit's own gate intent is "References/Sources footers dropped" and this child slips that intent).

Now let me verify the most important safety claim with a live run: does the actual generated dataset contain any owner-gated numbers? Let me run the feeder in dry-run/json against the live wiki and grep the output for owner-gate leakage and check the "Fetched but DROPPED" hypothesis.

### Assistant | 2026-06-21T22:06:10.186Z

[tool_use: Bash]

### User | 2026-06-21T22:06:15.514Z

[tool_result] {
  "source": "wiki-domain-knowledge",
  "files": 346,
  "dirs": 43,
  "scanned": 346,
  "accepted": 2714,
  "deduped": 0,
  "pairs": 2714,
  "byDomain": {
    "academy": 58,
    "agent-orchestration": 54,
    "ai-training": 67,
    "backend-helper": 51,
    "blueprint-vision": 54,
    "bug-hunting": 47,
    "business": 60,
    "cad": 108,
    "cad-fusion-live": 46,
    "cam": 61,
    "compliance-
... [+2810 chars truncated]

### Assistant | 2026-06-21T22:06:19.134Z

Live run confirms: 2714 pairs, 43 domains, matches the commit claim exactly (deduped=0, mill 163, software-engineering 363, wedm 68). Now the critical safety check — write the dataset to a temp file and grep for any owner-gate leakage and the "Fetched but DROPPED" hypothesis.

### Assistant | 2026-06-21T22:06:24.199Z

[tool_use: Bash]

### User | 2026-06-21T22:06:28.587Z

[tool_result]               input="PRISM academy knowledge (curated wiki, advisory -- verify against source)"
              output="Bloom's research found that learners receiving **one-to-one tutoring with mastery-learning technique..."
  WROTE 2714 pairs -> C:\Users\wompu\AppData\Local\Temp\wiki-lora-check.jsonl (+ .meta.json sidecar)
=== owner-gate heading leak (should be 0) ===
0
=== Fetched but DROPPED leak
... [+106 chars truncated]

### Assistant | 2026-06-21T22:06:34.055Z

Confirmed with live data:
- **0 owner-gate heading pairs** and **0 owner-gated numeric bodies** leak into training. The safety-critical claim holds: the `## Owner-gate` section's numeric/safety content is correctly excluded.
- **2 "Fetched but DROPPED" pairs DO leak** — exactly the P2 I predicted: a `### Fetched but DROPPED` audit-child under a SKIP-matched `## Sources` parent escapes because each `###` leaf is evaluated on its own heading. These are dropped-source-audit notes (no domain knowledge, no owner-gated numbers) — low-quality noise, not a safety leak.

Let me confirm the count of these stray-child junk pairs across the whole corpus to size the P2, and verify the test suite actually passes (R9 integrity).

### Assistant | 2026-06-21T22:06:37.190Z

[tool_use: Bash]

### User | 2026-06-21T22:06:41.721Z

[tool_result] === total stray-child junk: Fetched but DROPPED + any ### under skipped ## parents ===
5
=== sample one to confirm it's audit-noise not knowledge ===
{"instruction":"In PRISM's wedm domain, explain: Fetched but DROPPED (R12 — could not confirm)","input":"PRISM wedm knowledge (curated wiki, advisory -- verify against source)","output":"- Modern Machine Shop \"the ins
=== run the test suite (R9) ===
... [+137 chars truncated]

### Assistant | 2026-06-21T22:07:07.820Z

All 18 tests pass. The test suite is genuinely behavioral (R9): it tests the parser leaf logic, the skip-heading gate, the residue gate with real code-fence/backlink/inline-code adversarial fixtures, oversize truncation, JSON-safety, the dedup, the DI'd fs walk with EXCLUDE_DIRS, and the clobber-guard throw. Each would fail on a real regression.

The "Fetched but DROPPED" leak totals **5 pairs** across the corpus (out of 2714, ~0.18%) — pure audit-noise ("Modern Machine Shop deep-links 404... no claim promoted"), no domain knowledge, no owner-gated numbers. Confirmed P2.

Let me do one final correctness check on the parser: the `m2 && !line.startsWith("###")` guard and the regex `^##\s+` — verify a `####` line cannot be misclassified as `##` (it can't, since `^##\s+` requires whitespace after exactly the `##`-prefix but `####` starts `## ` only if... let me reason: `#### deeper` — `line.match(/^##\s+/)` requires `##` then `\s` — but `#### deeper` is `#`,`#`,`#`,`#`,` ` — position 2 is `#` not `\s`, so `^##\s+` does NOT match. Good. And `m3 = /^###\s+/` — `#### deeper` position 3 is `#` not `\s`, so m3 doesn't match either. So `####` falls through to the body-line branch and folds into the current `###`. Verified correct, and the test at line 69-75 confirms this.).

I have everything I need.

---

VERDICT: PASS

summary: The new `vault-wiki-to-lora-dataset.mjs` feeder is correct, safely gated, properly wired, and genuinely non-duplicate. I verified end-to-end against live data: 2714 pairs / 43 domains (matching the commit claim exactly, deduped=0), **0 owner-gate headings and 0 owner-gated numeric values leak into training**, all 18 tests pass and are behaviorally real (R9), and the source dirs are provably disjoint from the 3 existing feeders. One genuine P2 signal-quality issue (5 stray audit-note pairs) — not a safety or correctness defect, deferrable.

findings:
- [P2] `H:/prism/scripts/vault-wiki-to-lora-dataset.mjs:128-173` (parser) + `:86-87` (SKIP_HEADING_RE)
... [+2288 chars truncated]
