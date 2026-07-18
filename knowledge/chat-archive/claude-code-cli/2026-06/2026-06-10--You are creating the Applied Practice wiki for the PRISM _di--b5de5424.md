---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the Applied Practice wiki for the PRISM \"discovery\" galaxy (own"
date: "2026-06-10"
first_ts: "2026-06-10T10:28:01.513Z"
last_ts: "2026-06-10T10:31:31.982Z"
cwd: "H:\\prism"
messages: 37
user_msgs: 14
assistant_msgs: 23
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_e23c4f2a-bb2/agent-af8c745381c396f93.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the Applied Practice wiki for the PRISM "discovery" galaxy (own

> **claude-code-cli** | 2026-06-10 | 37 msgs (14 user / 23 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_e23c4f2a-bb2/agent-af8c745381c396f93.jsonl`

## Transcript

### User | 2026-06-10T10:28:01.513Z

You are creating the Applied Practice wiki for the PRISM "discovery" galaxy (owner: tango): knowledge/wiki/discovery/discovery-applied-practice.md.

PURPOSE: the PRACTITIONER-KNOWLEDGE ("tribal knowledge") layer -- the hard-won CS-engineering gotchas, FAILURE MODES, and TECHNIQUE DECISIONS that pure theory does not teach. DISTINCT from discovery-foundations.md (theory) -- read it first so you do not repeat it; this entry is "what goes wrong in practice and how an expert avoids it."

FOCUS for discovery: IR/dedup practitioner gotchas: LSH band/row tuning false-negative-vs-false-positive trade, MinHash permutation-count vs accuracy, stop-word/stemming mismatch breaking matches, BM25 k1/b parameter sensitivity, exact-vs-fuzzy dedup threshold, stale index returning ghosts. Free: MMDS, Stanford CS276 / Manning IR.
CS-engineering claims here are papa-verifiable -- cite course/docs/paper. Leave any benchmark-specific number owner-gated.

ABSOLUTE RULES (R12 honesty):
1. ONLY state a claim you CONFIRM by WebFetch on a reputable free/legal source (OSTEP, MIT/Stanford courseware, official docs, man pages, arXiv, NIST/OSHA, reputable engineering reference). Never fabricate. If a fetch fails, retry once then drop it.
2. Aim for 8-12 cited gotchas/technique notes across 4-5 themed sections. Each = the gotcha + WHY + the expert's avoidance, source cited inline. Map each to how THIS PRISM galaxy hits it (one line).
3. Legal free sources ONLY. All ASCII in code; markdown fine in the body.
4. Frontmatter: title, galaxy: discovery, owner_slot: tango, status: VERIFIED-PARTIAL, verified_by: "papa-applied-practice-meta (2026-06-10)", verification_method, tags. End with "## Owner-gate (NOT promoted)" + "## Sources".
5. Do NOT run git/commit, do NOT register in the index. If a file-claim hook blocks the Write, report it and skip.

Return ONLY this exact plain-text block:
GALAXY: discovery
FILE: knowledge/wiki/discovery/discovery-applied-practice.md
CREATED: <yes/no>
CITED_GOTCHAS: <count 
... [+197 chars truncated]

### Assistant | 2026-06-10T10:28:04.626Z

I'll start by reading the foundations file to avoid repeating theory, then verify the discovery galaxy context.

### Assistant | 2026-06-10T10:28:05.662Z

[tool_use: Bash]

### User | 2026-06-10T10:28:11.228Z

[tool_result] total 24
drwxr-xr-x 1 wompu 197611     0 Jun 10 03:38 ./
drwxr-xr-x 1 wompu 197611     0 Jun 10 05:11 ../
-rw-r--r-- 1 wompu 197611 14789 Jun 10 03:38 discovery-foundations.md
---
H:/prism/knowledge/wiki/discovery/discovery-foundations.md
FOUNDATIONS EXISTS

### Assistant | 2026-06-10T10:28:12.992Z

Let me read the foundations file to understand what theory is already covered.

### Assistant | 2026-06-10T10:28:13.295Z

[tool_use: Read]

### User | 2026-06-10T10:28:14.667Z

[tool_result] 1	---
2	title: Discovery Galaxy Foundations — Information Retrieval, Search, and Near-Duplicate Detection
3	galaxy: discovery
4	owner_slot: tango
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-meta-create-workflow (2026-06-10)"
7	verification_method: "Each '##' theme section is grounded in a free-textbook / free-course / reputable-reference source confirmed by live WebFetch on 2026-06-10. Claims 
... [+15029 chars truncated]

### Assistant | 2026-06-10T10:28:23.320Z

The foundations file covers theory: inverted index, tf-idf/BM25 definitions, BSBI, shingling/Jaccard, MinHash/LSH amplification, SimHash, MAP/precision-recall. My applied-practice entry must cover the PRACTITIONER gotchas distinct from these: the *tuning traps* and *failure modes*.

Let me verify my practitioner claims via WebFetch. I'll fetch the relevant free sources in parallel — focusing on the gotchas the prompt names: LSH band/row tuning, MinHash permutation count, stop-word/stemming mismatch, BM25 k1/b sensitivity, exact-vs-fuzzy threshold, stale index/ghosts.

### Assistant | 2026-06-10T10:28:26.311Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:28:28.906Z

[tool_use: WebFetch]

### User | 2026-06-10T10:28:31.155Z

[tool_result] # Stop Words: Definition and Trade-offs

## What Stop Words Are

Stop words are "extremely common words which would appear to be of little value in helping select documents matching a user need" that get "excluded from the vocabulary entirely."

## Problems Caused by Removing Stop Words

The document identifies several significant downsides to dropping stop words:

**Phrase queries suffer:** The t
... [+1014 chars truncated]

### User | 2026-06-10T10:28:34.342Z

[tool_result] # Stemming and Lemmatization: Benefits and Drawbacks

## How Stemming Can Hurt Performance

The document provides a clear example of stemming's negative effects. Porter stemmer reduces these words identically:

> "operate operating operates operation operative operatives operational"

to "oper". This causes precision loss on queries like:

> "operational and research, operating and system, operati
... [+908 chars truncated]

### Assistant | 2026-06-10T10:28:38.090Z

Both confirmed. Now let me fetch the LSH false-positive/false-negative tuning detail and a BM25 parameter-sensitivity source. The Stanford LSH/MinHash and BM25 pages are in the foundations; I want the *practitioner* angles. Let me get the LSH page (banding tradeoff = false positives vs false negatives) and a reputable BM25 tuning source.

### Assistant | 2026-06-10T10:28:40.939Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:28:43.892Z

[tool_use: WebFetch]

### User | 2026-06-10T10:28:48.134Z

[tool_result] # LSH Trade-offs: False Positives vs. False Negatives

Based on the Wikipedia article, here are the precise statements about LSH amplification techniques:

## AND-Construction Effects

The article states that an AND-construction with k functions creates a family where:
- **Collision probability reduces to p₁^k and p₂^k**

This means both the true positive rate (p₁) and false positive rate (p₂) are
... [+1038 chars truncated]

### User | 2026-06-10T10:28:49.327Z

[tool_result] # MinHash: Hash Functions and Accuracy Trade-off

## Expected Error and k Requirements

The Wikipedia article states the fundamental relationship:

> "their average is also an unbiased estimator, and by standard deviation for sums of 0-1 random variables, its expected error is O(1/√_k_)."

For achieving a specific error threshold, the article specifies:

> "Therefore, for any constant ε > 0 there 
... [+688 chars truncated]

### Assistant | 2026-06-10T10:28:53.149Z

Both confirmed. Now let me verify BM25 k1/b parameter sensitivity from a reputable source, and a source on "stale index / ghost documents" (index freshness / deletion / tombstones). Let me also get an exact-vs-fuzzy threshold source.

### Assistant | 2026-06-10T10:28:56.503Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:28:58.990Z

[tool_use: WebFetch]

### User | 2026-06-10T10:29:02.135Z

[tool_result] # BM25 Free Parameters: k₁ and b

## Definition and Default Values

The document states:

> "k₁ and b are free parameters, usually chosen, in absence of an advanced optimization, as k₁ ∈ [1.2, 2.0] and b = 0.75"

## What They Control

**k₁** regulates term frequency saturation—how much additional occurrences of a query term in a document contribute to the relevance score.

**b** controls document 
... [+664 chars truncated]

### User | 2026-06-10T10:29:04.824Z

[tool_result] # Index Freshness, Deletion, and Staleness

Based on the Wikipedia article provided, there is **minimal explicit discussion** of index staleness, deletion synchronization, or how deleted documents are handled.

## What the Article States:

**On index updating challenges:**
"The additional computer storage required to store the index, as well as the considerable increase in the time required for an
... [+970 chars truncated]

### Assistant | 2026-06-10T10:29:09.618Z

BM25 k1/b confirmed. The search-engine-indexing page gives the index-merge/collision-between-competing-tasks quote, which is useful for the stale-index gotcha but not deletion specifically. Let me get a stronger source for the "stale index returns ghosts" gotcha — Lucene/segment tombstone deletion is the canonical mechanism. Let me try the Lucene docs and a near-duplicate threshold source.

### Assistant | 2026-06-10T10:29:12.632Z

[tool_use: WebFetch]

### User | 2026-06-10T10:29:18.931Z

[tool_result] # Document Deletion and Update Handling in Lucene

Based on the IndexWriter documentation, here's how deletions and updates are handled:

## Buffering and Visibility

Changes are buffered in memory and not immediately visible to readers:

> "These changes are buffered in memory and periodically flushed to the Directory"

Until a commit or refresh occurs, deleted documents remain searchable:

> "fl
... [+1010 chars truncated]

### Assistant | 2026-06-10T10:29:23.426Z

Confirmed — Lucene's buffered-delete / visible-only-after-commit / physical-removal-only-at-merge is the canonical "stale index returns ghosts" mechanism. That's 6 strong gotchas confirmed. Let me get 2-3 more to reach the 8-12 target: tokenization mismatch between index-time and query-time analysis (a classic IR practitioner gotcha), and the LSH "tune the threshold to your similarity target" / S-curve practitioner angle. Let me fetch the Stanford tokenization page and an MMDS-confirmable banding source.

### Assistant | 2026-06-10T10:29:27.667Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:29:30.762Z

[tool_use: WebFetch]

### User | 2026-06-10T10:29:32.897Z

[tool_result] The server returned HTTP 404 Not Found.

The response body was not retrieved. If this URL requires authentication, use an authenticated tool (e.g. `gh` for GitHub, or an MCP-provided fetch tool) instead of WebFetch.

### User | 2026-06-10T10:29:34.089Z

[tool_result] # Tokenization Pitfalls: Key Statements

**Same tokenization required for documents and queries:**
"you always want to do the exact same tokenization of document and query words, generally by processing queries with the same tokenizer."

**Language-specificity:**
"These issues of tokenization are language-specific."

**Apostrophe as a tricky case:**
"even for English there are a number of tricky c
... [+860 chars truncated]

### Assistant | 2026-06-10T10:29:36.559Z

Tokenization confirmed (the index-time/query-time mismatch gotcha — very strong). Skip-pointers URL 404'd; let me retry once with the correct Stanford IR book URL for skip pointers.

### Assistant | 2026-06-10T10:29:40.454Z

[tool_use: WebFetch]

### User | 2026-06-10T10:29:45.304Z

[tool_result] # Skip Pointers for Postings List Intersection

**Purpose:**
Skip pointers are "shortcuts that allow us to avoid processing parts of the postings list that will not figure in the search results."

**The Tradeoff:**
The document explains the fundamental trade-off in skip pointer placement:

"More skips means shorter skip spans, and that we are more likely to skip. But it also means lots of comparis
... [+572 chars truncated]

### Assistant | 2026-06-10T10:29:52.963Z

All confirmed. I now have 9 strong, distinctly-practitioner gotchas across the named focus areas, each WebFetch-verified, all distinct from the foundations theory:

1. Stop-word removal breaks phrase queries (Stanford IR)
2. Stemming hurts precision / collocations (Stanford IR)
3. LSH AND/OR amplification = FP-vs-FN trade (Wikipedia LSH)
4. MinHash k=O(1/eps^2), 400 hashes for err<=0.05 (Wikipedia MinHash)
5. BM25 k1/b free params must be tuned, b=0/b=1 meaning (Wikipedia BM25)
6. Index merge = "collision between two competing tasks" / rebuild-vs-merge (Wikipedia search-engine-indexing)
7. Lucene stale-index ghosts: buffered deletes, visible-only-after-commit, physical removal only at merge (Lucene docs)
8. Tokenization must match index-time and query-time; whitespace/hyphen/C++ splits (Stanford IR)
9. Skip-pointer √P placement trade-off (Stanford IR)

Sources: 6 distinct URLs (Stanford IR book ×4 distinct pages, Wikipedia LSH, Wikipedia MinHash, Wikipedia BM25, Wikipedia search-engine-indexing, Lucene IndexWriter). That's 8 distinct URLs actually. Let me write the file.

### Assistant | 2026-06-10T10:31:22.228Z

[tool_use: Write]

### User | 2026-06-10T10:31:27.300Z

[tool_result] File created successfully at: H:/prism/knowledge/wiki/discovery/discovery-applied-practice.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T10:31:31.982Z

The file was created successfully. The write hook is advisory only (no block). The file is a genuinely new asset (applied-practice companion to the existing foundations), not a duplicate of `wiki/discovery` or `discovery-galaxy` nodes.

GALAXY: discovery
FILE: knowledge/wiki/discovery/discovery-applied-practice.md
CREATED: yes
CITED_GOTCHAS: 9
SOURCES: 9
NUMERICS_LEFT_GATED: yes
NOTE: Buffered deletes (Lucene) mean a stale index returns GHOSTS until commit+merge -- the named "stale index returns ghosts" failure that makes search-first either block a legit build (false duplicate) or let a real duplicate through.
