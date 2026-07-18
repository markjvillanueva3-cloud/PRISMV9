---
type: "chat-session"
source: "claude-code-cli"
session_id: "e9b75754-b179-40b0-b0fb-7007d65b2056"
title: "Independent second-pass review of a PRISM training-set curation tool. Read end t"
date: "2026-06-02"
first_ts: "2026-06-02T02:02:08.019Z"
last_ts: "2026-06-02T02:07:31.655Z"
cwd: "H:\\prism-slot-xray"
messages: 22
user_msgs: 9
assistant_msgs: 13
raw_file: "H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/agent-a385c2e823ed8f9f6.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:41:15"
---

# Independent second-pass review of a PRISM training-set curation tool. Read end t

> **claude-code-cli** | 2026-06-02 | 22 msgs (9 user / 13 assistant) | cwd: H:\prism-slot-xray
> Raw: `H:/.claude/projects/H--prism-slot-xray/e9b75754-b179-40b0-b0fb-7007d65b2056/subagents/agent-a385c2e823ed8f9f6.jsonl`

## Transcript

### User | 2026-06-02T02:02:08.019Z

Independent second-pass review of a PRISM training-set curation tool. Read end to end:
1. H:\prism\scripts\lib\blueprint-trainset-curate-lib.mjs
2. H:\prism\scripts\lib\blueprint-trainset-curate-lib.test.mjs (11 tests pass)
3. H:\prism\scripts\blueprint-trainset-curate.mjs (ran live over 76,205 real parts → 3,941 clean trainset)

It curates the supervised OCR/print→CAD trainset from blueprint-training-pairs.jsonl, excluding poison labels (match_confidence garbage/ambiguous with a real source) and unlabeled parts. Output: blueprint-trainset-clean.jsonl + a census JSON.

Weighted toward what a logic reviewer misses:
- DUPLICATION (R8): an existing producer build-blueprint-cad-program-pairs.mjs already emits coarse stats (total/print/program/cad/full_triple/train_eligible) and BUILDS the pairs file. Is THIS tool genuinely distinct (a CONSUMER that adds: poison exclusion, drawing_score profile, the clean-vs-eligible distinction, per-subset clean counts), or does it duplicate? Judge whether it should have been a flag on the existing tool instead.
- CORRECTNESS of the headline finding: is "clean_trainset=3,941 (not the 4,245 train_eligible)" actually defensible — i.e., is excluding ambiguous/garbage-confidence labels the right ML call (garbage-in-garbage-out), or is it over-aggressive (throwing away usable weak labels)? Should "loose" be kept or is it also risky?
- CONVENTION conformance with the sibling build-blueprint-training-manifest.mjs (streaming, atomic write, exports).
- EDGE CASES: a record with has_cad but has_print=false; multi-source label_source values; a part_number that is null; the clean trainset row shape (is it a usable training row for a downstream consumer — does it carry enough to locate the print/program/cad, or just counts?).
- R9 test integrity + determinism.

Return PASS or FAIL + your judgment on (a) is-it-a-duplicate and (b) is-the-curation-policy-sound, + any P0/P1. Concrete line refs. Terse.

### Assistant | 2026-06-02T02:02:25.019Z

[tool_use: Read]

### Assistant | 2026-06-02T02:02:24.361Z

I'll review this training-set curation tool end to end. Let me read all three files plus the sibling/producer files for the duplication and convention checks.

### Assistant | 2026-06-02T02:02:24.552Z

[tool_use: Read]

### Assistant | 2026-06-02T02:02:25.590Z

[tool_use: Read]

### User | 2026-06-02T02:02:50.493Z

[tool_result] 1	// scripts/lib/blueprint-trainset-curate-lib.test.mjs
2	// Tests for the OCR/print→CAD trainset curation core (U-PSGB-XRAY-TRAINSET-CURATE).
3	// The load-bearing intent (R9): POISON labels (garbage/ambiguous match_confidence) must be
4	// EXCLUDED from the supervised set, and only TRUSTWORTHY labels (exact/loose + real source)
5	// kept — the garbage-in-garbage-out guard. Pure, no I/O. Run: nod
... [+7982 chars truncated]

### User | 2026-06-02T02:02:50.499Z

[tool_result] 1	// scripts/lib/blueprint-trainset-curate-lib.mjs
2	//
3	// U-PSGB-XRAY-TRAINSET-CURATE — pure curation core for the OCR/print→CAD training set.
4	//
5	// THE PROBLEM (grounded in the real corpus, blueprint-training-pairs.jsonl, 76,205 parts):
6	// `train_eligible` (has_print && (has_program||has_cad)) OVERCOUNTS the trustworthy labels.
7	// The corpus' own `match_confidence` shows 5,029 "garbage
... [+6395 chars truncated]

### User | 2026-06-02T02:02:53.354Z

[tool_result] 1	#!/usr/bin/env node
2	// scripts/blueprint-trainset-curate.mjs
3	//
4	// U-PSGB-XRAY-TRAINSET-CURATE — curate the supervised OCR/print→CAD training set from the
5	// existing pairing manifest, EXCLUDING poison labels (garbage/ambiguous match_confidence).
6	//
7	// WHY: blueprint-training-pairs.jsonl marks 4,245 parts `train_eligible`, but the corpus'
8	// own match_confidence flags ~5,029 garbag
... [+4219 chars truncated]

### Assistant | 2026-06-02T02:03:03.755Z

Now let me read the producer and the sibling convention file to judge duplication and conformance.

### Assistant | 2026-06-02T02:03:04.206Z

[tool_use: Read]

### Assistant | 2026-06-02T02:03:04.457Z

[tool_use: Read]

### User | 2026-06-02T02:03:40.537Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-blueprint-cad-program-pairs.mjs — slot:xray (U-PSGB-XRAY training push, 2026-05-29)
4	 *
5	 * Builds the SUPERVISED training-pair spine for blueprint reading: joins the
6	 * print↔program answer-key (blueprint-program-join-full-v6.jsonl, 76,205 part_numbers)
7	 * with a part_number→CAD-file index derived from the jm-die files table. The CAD
8	 * geometry + CN
... [+7884 chars truncated]

### User | 2026-06-02T02:03:40.543Z

[tool_result] 1	#!/usr/bin/env node
2	/**
3	 * build-blueprint-training-manifest.mjs — slot:xray (U-PSGB-XRAY training push, 2026-05-29)
4	 *
5	 * Partitions the DocuStrata classified index into training-readiness buckets so the
6	 * operator knows EXACTLY how many real blueprints need the GPU-OCR run before the
7	 * LoRA corpus can be assembled. Spec: state/shared/specs/BLUEPRINT-VISION-TRAINING-READINESS-2026
... [+6254 chars truncated]

### Assistant | 2026-06-02T02:03:54.148Z

Now I have the full picture. Let me verify one factual claim — the producer emits `label_source` values of `"cad"`, `"program"`, `"cad+program"`, or `"none"` (line 134), and `match_confidence` is passed through verbatim from the v6 join (line 141). Let me confirm what `match_confidence` tier values actually exist in the corpus, since the curation policy hinges on that enum being complete.

### Assistant | 2026-06-02T02:03:57.927Z

[tool_use: Bash]

### Assistant | 2026-06-02T02:03:58.696Z

[tool_use: Bash]

### User | 2026-06-02T02:05:02.319Z

[tool_result] === match_confidence distribution ===
n= 76205
match_confidence: {"miss":67003,"loose":1958,"ambiguous":232,"garbage":5029,"exact":1983}
label_source: {"none":71960,"cad+program":426,"program":3747,"cad":72}

### User | 2026-06-02T02:05:52.192Z

[tool_result]   ...
# Subtest: finalizeCuration: empty corpus → zeros, no divide-by-zero
ok 10 - finalizeCuration: empty corpus → zeros, no divide-by-zero
  ---
  duration_ms: 0.3968
  ...
# Subtest: curateRecord: unknown/missing confidence tiers are excluded, not silently kept
ok 11 - curateRecord: unknown/missing confidence tiers are excluded, not silently kept
  ---
  duration_ms: 0.215
  ...
1..11
# tests 1
... [+89 chars truncated]

### Assistant | 2026-06-02T02:06:06.333Z

The real corpus confirms the headline arithmetic. Let me reconcile the exact numbers against the tool's claims and the producer's `train_eligible`.

The corpus has: `exact`=1983, `loose`=1958, `ambiguous`=232, `garbage`=5029, `miss`=67003. Confidence tiers in the corpus are exactly the 5 the tool enumerates (`exact/loose/ambiguous/garbage/miss`) — the enum is **complete**, no unknown tier exists in production. Let me verify the clean count is reproducible and check one subtle cross-field consistency issue (a `garbage`/`ambiguous` record can still have a real `label_source`, vs a `loose` record possibly having `label_source:none`).

### Assistant | 2026-06-02T02:06:12.037Z

[tool_use: Bash]

### User | 2026-06-02T02:06:45.148Z

[tool_result] {"clean":3941,"cleanByTier":{"exact":1983,"loose":1958},"eligible":4245,"exactNone":0,"looseNone":0,"garbageReal":4,"ambigReal":232,"cleanNoPrint":0}

### Assistant | 2026-06-02T02:07:31.655Z

This fully grounds the review. Independent recomputation confirms every headline number and surfaces the exact composition of the gap.

## Verdict: PASS

Independent re-derivation over the real 76,205-part corpus reproduces every claim: `clean_trainset=3941` (exact 1983 + loose 1958), `train_eligible=4245`, gap = 304. The 304 = `ambiguous` with a real source (232) + `garbage` with a real source (4) + the rest. Confirmed: the corpus confidence enum is exactly the 5 tiers the tool hardcodes (`exact/loose/ambiguous/garbage/miss`) — no unknown tier exists in production, so the `unknown-confidence` branch (lib:69) is a correct defensive guard, never hit live. 11/11 tests pass.

### (a) Is it a duplicate? NO — genuinely distinct CONSUMER. R8 satisfied.
- The producer (`build-blueprint-cad-program-pairs.mjs`) **builds** the pairs file by joining v6-join ↔ files-table, and emits only coarse boolean-count stats (`train_eligible` = `has_print && (has_program||has_cad)`, pairs:132). It **never reads `match_confidence` for filtering** — it passes it through verbatim (pairs:141). It has no concept of poison exclusion, no `drawing_score` profile, no per-subset clean counts, no clean-vs-eligible distinction.
- This tool is a pure downstream reader (curate.mjs:54-62 streams the producer's output) that applies the ML-correctness fold the producer structurally cannot: `train_eligible` is computed *before* `match_confidence` is even known to be trustworthy.
- **Verdict on "should it have been a flag on the producer instead": NO.** Folding curation into the producer would conflate two concerns the corpus deliberately separates — the producer's job is the *join* (which is confidence-agnostic; even `garbage` pairs must be emitted so the confidence signal survives). A `--curate` flag would force the producer to drop rows it is responsible for preserving, and would couple a 51.8MB-emitting joiner to a downstream training policy that may change independently. Separate consumer is the correc
... [+5665 chars truncated]
