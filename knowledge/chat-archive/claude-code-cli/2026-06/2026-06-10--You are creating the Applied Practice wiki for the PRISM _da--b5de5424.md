---
type: "chat-session"
source: "claude-code-cli"
session_id: "b5de5424-ef1f-447a-a3f1-e5a8ce2cad24"
title: "You are creating the Applied Practice wiki for the PRISM \"database-expansion\" ga"
date: "2026-06-10"
first_ts: "2026-06-10T10:13:44.636Z"
last_ts: "2026-06-10T10:17:03.846Z"
cwd: "H:\\prism"
messages: 31
user_msgs: 12
assistant_msgs: 19
raw_file: "H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_50266bf2-d45/agent-acaa8d4750d215a1e.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:23"
---

# You are creating the Applied Practice wiki for the PRISM "database-expansion" ga

> **claude-code-cli** | 2026-06-10 | 31 msgs (12 user / 19 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/b5de5424-ef1f-447a-a3f1-e5a8ce2cad24/subagents/workflows/wf_50266bf2-d45/agent-acaa8d4750d215a1e.jsonl`

## Transcript

### User | 2026-06-10T10:13:44.636Z

You are creating the Applied Practice wiki for the PRISM "database-expansion" galaxy (owner: juliett): knowledge/wiki/database-expansion/database-expansion-applied-practice.md.

PURPOSE: the PRACTITIONER-KNOWLEDGE ("tribal knowledge") layer -- the hard-won gotchas, FAILURE MODES, and TECHNIQUE DECISIONS a world-class database-expansion practitioner has that pure theory does not teach. This is DISTINCT from database-expansion-foundations.md (theory) and database-expansion-source-atlas.md (link directory) if those exist -- read them first so you do not repeat them.

FOCUS for database-expansion: database practitioner gotchas: N+1 query, missing vs over-indexing, lock contention + deadlock, transaction-isolation anomalies (dirty/non-repeatable/phantom read), migration pitfalls (long-held locks / blocking DDL), connection-pool exhaustion, vector-index (HNSW) recall vs build-time tuning, WAL/checkpoint + fsync durability. Free: PostgreSQL docs, SQLite docs, CMU 15-445, Use The Index Luke, Jepsen analyses.
Qualitative practitioner technique + gotchas. CS/software/ML claims here are papa-verifiable -- cite framework docs / courses / papers. Leave any benchmark-specific numbers owner-gated.

ABSOLUTE RULES (R12 honesty):
1. ONLY state a claim you CONFIRM by WebFetch on a reputable free/legal source (framework official docs, university course, gov, reputable practitioner reference, arXiv). Never fabricate. If a fetch fails, retry once then drop it.
2. Aim for 8-14 cited gotchas/technique notes across 4-6 themed sections (e.g. "## Common failure modes", "## Technique decisions", "## Verification/eval"). Each = the gotcha + WHY + the expert's avoidance, source cited inline.
3. Legal free sources ONLY. All ASCII in code; markdown fine in the body.
4. Frontmatter: title, galaxy: database-expansion, owner_slot: juliett, status: VERIFIED-PARTIAL, verified_by: "papa-applied-practice (2026-06-10)", verification_method, tags. End with "## Owner-gate (NOT promoted)" + "## Sources".
5.
... [+498 chars truncated]

### Assistant | 2026-06-10T10:13:48.958Z

I'll start by reading the existing companion files to avoid repeating theory and link content, then verify claims via WebFetch before writing.

### Assistant | 2026-06-10T10:13:49.188Z

[tool_use: Glob]

### User | 2026-06-10T10:13:59.267Z

[tool_result] knowledge\wiki\database-expansion\database-expansion-foundations.md

### Assistant | 2026-06-10T10:14:01.330Z

Let me read the existing foundations file to understand what theory is already covered.

### Assistant | 2026-06-10T10:14:01.794Z

[tool_use: Read]

### User | 2026-06-10T10:14:03.193Z

[tool_result] 1	---
2	title: Database-Expansion Foundations — relational model, ACID/isolation, indexing, WAL/recovery, consistency, vector search
3	galaxy: database-expansion
4	owner_slot: juliett
5	status: VERIFIED-PARTIAL
6	verified_by: "papa-create-workflow (2026-06-10)"
7	verification_method: software/CS facts WebFetch-confirmed against primary + free sources (CMU 15-445 course schedule by Andy Pavlo; Post
... [+18582 chars truncated]

### Assistant | 2026-06-10T10:14:12.150Z

The foundations file covers theory (isolation table, index types, WAL invariant, ARIES, CAP, HNSW basics). My applied-practice file must be DISTINCT: the practitioner gotchas, failure modes, and avoidance techniques. There is no source-atlas file. Let me now verify practitioner claims via WebFetch on free/legal sources, focusing on the FOCUS areas: N+1, indexing pitfalls, lock contention/deadlock, isolation anomalies in practice, migration pitfalls (blocking DDL), connection-pool exhaustion, HNSW recall tuning, WAL checkpoint/fsync durability.

Let me fetch several sources in parallel.

### Assistant | 2026-06-10T10:14:15.008Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:14:16.521Z

[tool_use: WebFetch]

### User | 2026-06-10T10:14:21.935Z

[tool_result] # Concatenated Index Column Ordering

## Why Order Matters

A concatenated index sorts entries by column position sequentially—the first column is the primary sort criterion, and subsequent columns determine order only when earlier columns match. The page uses a telephone directory analogy: entries are sorted by surname first, then by first name.

## When an Index Cannot Be Used

An index cannot b
... [+1234 chars truncated]

### User | 2026-06-10T10:14:23.766Z

[tool_result] # Deadlocks and Lock Contention in PostgreSQL

## How Deadlocks Occur

Deadlocks occur when two or more transactions hold locks that other transactions want. The documentation provides this example:

> "if transaction 1 acquires an exclusive lock on table A and then tries to acquire an exclusive lock on table B, while transaction 2 has already exclusive-locked table B and now wants an exclusive lo
... [+1683 chars truncated]

### Assistant | 2026-06-10T10:14:33.781Z

Two confirmed. Let me fetch more sources for the other FOCUS areas: N+1 queries, connection-pool sizing, blocking DDL/migration locks, and HNSW recall tuning.

### Assistant | 2026-06-10T10:14:34.574Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:14:37.178Z

[tool_use: WebFetch]

### User | 2026-06-10T10:14:38.654Z

[tool_result] # PostgreSQL MVCC Caveats

Based on the documentation page provided, PostgreSQL documents three main caveats about MVCC and isolation levels:

## 1. **DDL Commands Are Not MVCC-Safe**

> "Some DDL commands, currently only [`TRUNCATE`](sql-truncate.html "TRUNCATE") and the table-rewriting forms of [`ALTER TABLE`](sql-altertable.html "ALTER TABLE"), are not MVCC-safe."

This means that after these o
... [+1265 chars truncated]

### User | 2026-06-10T10:14:44.275Z

[tool_result] # HikariCP Connection Pool Sizing Guidance

## Why Bigger Pools Are Worse

HikariCP emphasizes that excessive connections cause performance degradation through context-switching overhead. The core principle is that "executing A and B sequentially will always be faster than executing A and B 'simultaneously' through time-slicing." Once threads exceed CPU cores, additional threads slow the system ra
... [+977 chars truncated]

### Assistant | 2026-06-10T10:14:48.449Z

Three more confirmed (MVCC DDL caveat, HikariCP pool sizing). The MVCC page gave me a great migration/DDL gotcha. Let me fetch the remaining sources: N+1 query problem, blocking DDL migration locks, and HNSW recall tuning.

### Assistant | 2026-06-10T10:14:50.829Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:14:52.681Z

[tool_use: WebFetch]

### User | 2026-06-10T10:14:57.947Z

[tool_result] # SQLAlchemy on N+1 Query Problem and Loading Strategies

## The N+1 Problem with Lazy Loading

SQLAlchemy explains that lazy loading causes the N+1 problem:

> "The [`lazyload()`](#sqlalchemy.orm.lazyload) strategy produces an effect that is one of the most common issues referred to in object relational mapping; the [N plus one problem](../../glossary.html#term-N-plus-one-problem), which states t
... [+988 chars truncated]

### User | 2026-06-10T10:14:58.976Z

[tool_result] # HNSW Index Parameters and Trade-offs in Qdrant

## Parameter Descriptions

Based on Qdrant's documentation, the HNSW index uses two key parameters:

**m (edges per node):** "Number of edges per node in the index graph. Larger the value - more accurate the search, more space required."

**ef_construct (build parameter):** "Number of neighbours to consider during the index building. Larger the val
... [+963 chars truncated]

### Assistant | 2026-06-10T10:15:02.674Z

Both confirmed (N+1 from SQLAlchemy, HNSW m/ef_construct from Qdrant). Now let me get the last critical FOCUS items: blocking DDL/migration locks (PostgreSQL ALTER TABLE lock behavior) and WAL fsync durability/checkpoint tuning. Let me fetch from sources I haven't already covered.

### Assistant | 2026-06-10T10:15:05.047Z

[tool_use: WebFetch]

### Assistant | 2026-06-10T10:15:06.726Z

[tool_use: WebFetch]

### User | 2026-06-10T10:15:12.589Z

[tool_result] # ALTER TABLE Lock Behavior and Column Addition Optimization

## Lock Acquisition

The documentation states:

> "An `ACCESS EXCLUSIVE` lock is acquired unless explicitly noted. When multiple subcommands are given, the lock acquired will be the strictest one required by any subcommand."

So yes, **ALTER TABLE acquires an ACCESS EXCLUSIVE lock by default**, which blocks all reads and writes.

### No
... [+1333 chars truncated]

### User | 2026-06-10T10:15:16.102Z

[tool_result] # SQLite Synchronous Pragma and Durability

## The Three Key Settings

**OFF (0)**: 
> "With synchronous OFF (0), SQLite continues without syncing as soon as it has handed data off to the operating system. If the application running SQLite crashes, the data will be safe, but the database **might become corrupted if the operating system crashes or the computer loses power** before that data has bee
... [+1660 chars truncated]

### Assistant | 2026-06-10T10:15:26.725Z

All FOCUS areas now have confirmed sources. That's a strong set of 8 distinct sources covering 9+ practitioner gotchas. Let me verify the count of distinct confirmed sources and gotchas:

1. **Use The Index Luke** — concatenated index leftmost-prefix rule (gotcha: wrong column first)
2. **PostgreSQL explicit-locking** — deadlock + consistent lock ordering avoidance
3. **PostgreSQL mvcc-caveats** — TRUNCATE/ALTER TABLE not MVCC-safe; serializable not on hot standby; catalog bypass
4. **HikariCP pool sizing** — small pool + formula, connection-pool exhaustion
5. **SQLAlchemy relationships** — N+1 / lazy vs eager loading
6. **Qdrant indexing** — HNSW m/ef_construct recall vs build/memory trade-off
7. **PostgreSQL sql-altertable** — ACCESS EXCLUSIVE lock + volatile-default table rewrite
8. **SQLite pragma** — synchronous OFF/NORMAL/FULL durability; WAL NORMAL not durable

That's 8 distinct source URLs and 10+ gotchas. Now let me write the file.

### Assistant | 2026-06-10T10:16:47.817Z

[tool_use: Write]

### User | 2026-06-10T10:16:50.916Z

[tool_result] File created successfully at: H:\prism\knowledge\wiki\database-expansion\database-expansion-applied-practice.md (file state is current in your context — no need to Read it back)

### Assistant | 2026-06-10T10:17:03.846Z

The file was created successfully. The graph context shows `database-expansion-applied-practice` is a new asset distinct from the foundations, atomic-write, and galaxy files — no duplication. The Write was not blocked by any file-claim hook.

GALAXY: database-expansion
FILE: knowledge/wiki/database-expansion/database-expansion-applied-practice.md
CREATED: yes
CITED_GOTCHAS: 9
SOURCES: 8
NUMERICS_LEFT_GATED: yes
NOTE: Connection-pool exhaustion is usually a too-BIG pool, not too-small — size to DB capacity (HikariCP formula) and keep threads waiting, don't add connections.
