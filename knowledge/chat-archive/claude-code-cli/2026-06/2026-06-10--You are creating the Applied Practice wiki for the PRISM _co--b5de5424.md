---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the Applied Practice wiki for the PRISM \"corpus-aggregation\" ga"
date: "2026-06-10"
first_ts: "2026-06-10T15:45:35.441Z"
last_ts: "2026-06-10T15:50:10.878Z"
cwd: "H:\\prism"
messages: 42
user_msgs: 16
assistant_msgs: 26
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_e23c4f2a-bb2/agent-adb5bf8245efbe34b.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the Applied Practice wiki for the PRISM "corpus-aggregation" ga

> **claude-code-cli** | 2026-06-10 | 42 msgs (16 user / 26 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_e23c4f2a-bb2/agent-adb5bf8245efbe34b.jsonl`

## Transcript

### User | 2026-06-10T15:45:35.441Z

You are creating the Applied Practice wiki for the PRISM "corpus-aggregation" galaxy (owner: golf): knowledge/wiki/corpus-aggregation/corpus-aggregation-applied-practice.md.

PURPOSE: the PRACTITIONER-KNOWLEDGE ("tribal knowledge") layer -- the hard-won CS-engineering gotchas, FAILURE MODES, and TECHNIQUE DECISIONS that pure theory does not teach. DISTINCT from corpus-aggregation-foundations.md (theory) -- read it first so you do not repeat it; this entry is "what goes wrong in practice and how an expert avoids it."

FOCUS for corpus-aggregation: ETL/data-aggregation practitioner gotchas (sibling of knowledge-conversion, the aggregation layer): silent-drop of a malformed record (vs fail-loud report loaded-N-of-M), dedup over-merge across heterogeneous sources, schema drift between sources breaking the join, incremental-vs-full reload correctness, late-arriving/out-of-order data, encoding mismatch across feeds. Free: data-engineering courses, Airflow/dbt docs, ETL literature.
CS-engineering claims here are papa-verifiable -- cite course/docs/paper. Leave any benchmark-specific number owner-gated.

ABSOLUTE RULES (R12 honesty):
1. ONLY state a claim you CONFIRM by WebFetch on a reputable free/legal source (OSTEP, MIT/Stanford courseware, official docs, man pages, arXiv, NIST/OSHA, reputable engineering reference). Never fabricate. If a fetch fails, retry once then drop it.
2. Aim for 8-12 cited gotchas/technique notes across 4-5 themed sections. Each = the gotcha + WHY + the expert's avoidance, source cited inline. Map each to how THIS PRISM galaxy hits it (one line).
3. Legal free sources ONLY. All ASCII in code; markdown fine in the body.
4. Frontmatter: title, galaxy: corpus-aggregation, owner_slot: golf, status: VERIFIED-PARTIAL, verified_by: "papa-applied-practice-meta (2026-06-10)", verification_method, tags. End with "## Owner-gate (NOT promoted)" + "## Sources".
5. Do NOT run git/commit, do NOT register in the index. If a file-claim hook blocks the Write, repo
... [+401 chars truncated]

### Assistant | 2026-06-10T15:45:53.105Z

I'll start by reading the foundations file to avoid repeating theory, then research practitioner gotchas from reputable sources.

### Assistant | 2026-06-10T15:45:53.106Z

[tool_use: Bash]

### User | 2026-06-10T15:45:58.620Z

[tool_result] corpus-aggregation-foundations.md
corpus-aggregation-source-atlas.md
---
knowledge-conversion-applied-practice.md
knowledge-conversion-foundations.md
knowledge-conversion-source-atlas.md

### Assistant | 2026-06-10T15:46:04.862Z

Both foundations and the sibling knowledge-conversion-applied-practice exist. Let me read the foundations file (to avoid repeating theory) and peek at the sibling's structure for consistency.

### Assistant | 2026-06-10T15:46:05.880Z

[tool_use: Read]

### User | 2026-06-10T15:46:07.376Z

[tool_result] read-once-guard: 'H:\prism\knowledge\wiki\corpus-aggregation\corpus-aggregation-foundations.md' was already read 17m ago in this session and is unchanged (mtime 1781081411931). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (dis
... [+25 chars truncated]

### Assistant | 2026-06-10T15:46:11.186Z

The foundations content is already in my context. Let me check the sibling applied-practice file for structure consistency.

### Assistant | 2026-06-10T15:46:11.472Z

[tool_use: Read]

### User | 2026-06-10T15:46:12.906Z

[tool_result] read-once-guard: 'H:\prism\knowledge\wiki\knowledge-conversion\knowledge-conversion-applied-practice.md' was already read 26m ago in this session and is unchanged (mtime 1781099860984). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for 
... [+34 chars truncated]

### Assistant | 2026-06-10T15:46:18.343Z

Both files are in my context. Now let me research the practitioner gotchas from reputable free sources. I'll fetch dbt and Airflow docs and ETL literature.

### Assistant | 2026-06-10T15:46:19.239Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T15:46:20.572Z

[tool_use: WebFetch]

### User | 2026-06-10T15:46:30.647Z

[tool_result] # dbt's Guidance on Incremental Model Tradeoffs

Based on the documentation provided, dbt acknowledges the complexity of incremental models but **does not provide explicit warnings that they're harder to reason about than full refresh**. However, they do offer clear guidance on when to use them:

## When Incremental Models Are Worth It

Incremental models are recommended when you **can't afford to
... [+1298 chars truncated]

### User | 2026-06-10T15:46:34.009Z

[tool_result] # Key Practitioner Gotchas with dbt Incremental Models

## How Incremental Models Avoid Full Reload

Incremental models limit data transformation by filtering rows on subsequent runs:

> "The first time a model is run, the table is built by transforming _all_ rows of source data. On subsequent runs, dbt transforms _only_ the rows in your source data that you tell dbt to filter for, inserting them 
... [+3414 chars truncated]

### Assistant | 2026-06-10T15:46:39.325Z

Excellent, two strong sources with multiple gotchas. Now let me fetch Airflow idempotency/backfill docs and ETL deduplication/schema-drift sources.

### Assistant | 2026-06-10T15:46:41.311Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T15:46:42.716Z

[tool_use: WebFetch]

### User | 2026-06-10T15:46:48.450Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T15:47:04.828Z

[tool_result] # Catchup, Backfilling, and Idempotency in Airflow

Based on the provided documentation, I cannot find specific guidance about catchup, backfilling, or idempotency requirements.

The documentation mentions backfilling conceptually:

> "running one copy of a Dag for every day in the last month to backfill some data"

It also explains that Dag Runs can execute for past dates:

> "Dags will run...for
... [+581 chars truncated]

### Assistant | 2026-06-10T15:47:08.261Z

Let me get Airflow's best practices page for the idempotency guidance.

### Assistant | 2026-06-10T15:47:10.776Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T15:47:12.529Z

[tool_use: WebFetch]

### User | 2026-06-10T15:47:19.952Z

[tool_result] # Airflow Best Practices on Task Idempotency

Airflow's best practices documentation emphasizes treating tasks like database transactions—they must produce consistent results across reruns.

## Key Guidance on Idempotency

The documentation states: **"Airflow can retry a task if it fails. Thus, the tasks should produce the same outcome on every re-run."**

## Specific Recommendations

**On data op
... [+1037 chars truncated]

### User | 2026-06-10T15:47:25.093Z

[tool_result] # ETL Data Quality Challenges

The article addresses several of these issues but with limited specificity:

**On deduplication:**
The article mentions "deduplicating the data" as a transformation type and notes that "Joining data from multiple sources (_e.g._, lookup, merge) and deduplicating the data" may be required.

**On data quality across sources:**
The article states that "ETL systems commo
... [+1004 chars truncated]

### Assistant | 2026-06-10T15:47:34.138Z

Strong sources. Now let me get encoding (Unicode/UTF-8) and a data-engineering courseware source for entity resolution / record linkage.

### Assistant | 2026-06-10T15:47:38.014Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T15:47:38.026Z

[tool_use: WebFetch]

### User | 2026-06-10T15:47:49.318Z

[tool_result] # Record Linkage: False Matches and Non-Matches Trade-offs

The Wikipedia article addresses the tension between false positives and false negatives through its discussion of probabilistic record linkage thresholds:

**On the fundamental trade-off:**
"Determining where to set the match/non-match thresholds is a balancing act between obtaining an acceptable sensitivity (or recall, the proportion of 
... [+1060 chars truncated]

### User | 2026-06-10T15:47:50.364Z

[tool_result] # Reading Text Files with Wrong Encoding

## What the Guide Says

The guide does **not extensively discuss mojibake or the dangers of wrong encoding assumptions**. However, it does cover the `errors` argument behavior when decoding bytes with incompatible codecs.

## The `errors` Argument and Decode Behavior

When using `bytes.decode()`, the guide explains four error handling strategies:

> Legal 
... [+1674 chars truncated]

### Assistant | 2026-06-10T15:48:00.970Z

All sources confirmed. I now have 6 distinct source URLs with multiple gotchas each. Let me get one more on schema drift / data validation to round out the schema-drift theme, and a UTF-8 BOM source.

### Assistant | 2026-06-10T15:48:01.771Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T15:48:03.513Z

[tool_use: WebFetch]

### User | 2026-06-10T15:48:07.216Z

[tool_result] # dbt Data Tests Overview

Based on the dbt documentation, here's what dbt says about the core data tests and their role in catching data quality issues:

## Built-in Generic Data Tests

dbt provides **four out-of-the-box generic data tests**:

### 1. **`not_null`**
Validates that there are no `null` values present in a column:
```yaml
models:
  - name: orders
    columns:
      - name: order_id
 
... [+1330 chars truncated]

### User | 2026-06-10T15:48:13.766Z

[tool_result] # RFC 3629 on UTF-8 BOM

RFC 3629 does not require UTF-8 decoders to handle or strip a leading BOM. Instead, it provides nuanced guidance:

**On BOM interpretation:**
"It is important to understand that the character U+FEFF appearing at any position other than the beginning of a stream MUST be interpreted with the semantics for the zero-width non-breaking space, and MUST NOT be interpreted as a si
... [+712 chars truncated]

### Assistant | 2026-06-10T15:48:21.115Z

I now have 8 distinct source URLs with strong, confirmed practitioner guidance. Let me verify the corpus-aggregation galaxy's actual aggregation surface so I can map each gotcha to PRISM accurately.

### Assistant | 2026-06-10T15:48:21.188Z

[tool_use: Bash]

### User | 2026-06-10T15:48:26.098Z

[tool_result] scripts/assemble-fleet-lora-corpus.mjs
scripts/assemble-fleet-lora-corpus.test.mjs
scripts/audit-jm-die-lathe-corpus.mjs
scripts/build-fleet-training-corpus-inventory.mjs
scripts/build-galaxy-free-source-corpus.mjs
scripts/build-print-corpus-manifest.mjs
scripts/build-print-corpus-manifest.test.mjs
scripts/build-psn-training-corpus.mjs
scripts/build-psn-training-corpus.test.mjs
scripts/cad-corpus-
... [+1461 chars truncated]

### Assistant | 2026-06-10T15:48:31.988Z

I have concrete PRISM aggregation surfaces to map gotchas to: `build-vendor-catalog-db.mjs` (consolidates 425 vendors + 77 catalog-vendors from heterogeneous sources), `build-fleet-training-corpus-inventory.mjs`, `build-print-corpus-manifest.mjs`, `assemble-fleet-lora-corpus.mjs`, `cag-stats-aggregator.mjs`, `octopus-corpus-loader.mjs`, `extraction-aggregator-lib.mjs`. These are real aggregation/ETL surfaces. Now I'll write the wiki entry.

### Assistant | 2026-06-10T15:49:58.193Z

[tool_use: Write]

### User | 2026-06-10T15:50:04.129Z

[tool_result] File created successfully at: H:/prism/knowledge/wiki/corpus-aggregation/corpus-aggregation-applied-practice.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T15:50:10.878Z

The file was created successfully. The write was not blocked by any file-claim hook.

GALAXY: corpus-aggregation
FILE: knowledge/wiki/corpus-aggregation/corpus-aggregation-applied-practice.md
CREATED: yes
CITED_GOTCHAS: 10
SOURCES: 8
NUMERICS_LEFT_GATED: yes
NOTE: A fail-open `catch -> return empty` on an EXISTING corpus is silent total destruction (clobbers the populated corpus with the staged delta) -- the read path must fail loud and the writer must carry a large-shrink clobber-guard.
