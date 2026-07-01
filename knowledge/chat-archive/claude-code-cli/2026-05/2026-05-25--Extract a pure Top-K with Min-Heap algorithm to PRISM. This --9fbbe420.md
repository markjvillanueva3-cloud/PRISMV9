---
type: "chat-session"
source: "claude-code-cli"
session_id: "9fbbe420-5335-44ea-8eae-7244e85cd53b"
title: "Extract a pure Top-K with Min-Heap algorithm to PRISM. This is iter36 of an ongo"
date: "2026-05-25"
first_ts: "2026-05-25T00:47:14.606Z"
last_ts: "2026-05-25T00:51:43.063Z"
cwd: "H:\\prism"
messages: 16
user_msgs: 6
assistant_msgs: 10
raw_file: "H:/.claude/projects/H--prism/9fbbe420-5335-44ea-8eae-7244e85cd53b/subagents/agent-a91c62743793e7cf2.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:19"
---

# Extract a pure Top-K with Min-Heap algorithm to PRISM. This is iter36 of an ongo

> **claude-code-cli** | 2026-05-25 | 16 msgs (6 user / 10 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/9fbbe420-5335-44ea-8eae-7244e85cd53b/subagents/agent-a91c62743793e7cf2.jsonl`

## Transcript

### User | 2026-05-25T00:47:14.606Z

Extract a pure Top-K with Min-Heap algorithm to PRISM. This is iter36 of an ongoing extraction campaign that ships clean foundational primitives to the slot/golf branch in the H:/prism-slot-golf worktree.

WRITE 2 FILES (use the Write tool):

**File 1**: `H:/prism-slot-golf/mcp-server/src/algorithms/TopKMinHeapAlgorithm.ts`

Implements top-K-largest selection via a fixed-size min-heap. When processing N items to find the K largest, this gives O(N log K) — much better than O(N log N) full sort when K << N.

Algorithm:
- Maintain a min-heap of size at most K
- For each new item: if heap size < K, push. Else if item > heap.peek(), pop and push.
- At the end, heap contains the K largest items.

Required interface:
- `interface TopKHeap<T> { items: { value: T; key: number }[]; k: number; }`  (heap entries store value + numeric sort key)
- `static create<T>(k: number): TopKHeap<T>` — fresh empty heap of capacity k
- `static push<T>(heap: TopKHeap<T>, value: T, key: number): void` — insert; auto-evicts smallest if at capacity
- `static peek<T>(heap: TopKHeap<T>): { value: T; key: number } | null` — minimum entry (about to evict), null if empty
- `static size<T>(heap: TopKHeap<T>): number`
- `static toSortedArray<T>(heap: TopKHeap<T>): { value: T; key: number }[]` — returns top-K in DESCENDING order (largest key first)

Internal helpers (private/named):
- `_siftUp<T>(heap: TopKHeap<T>, i: number): void`
- `_siftDown<T>(heap: TopKHeap<T>, i: number): void`

R12 fail-loud:
- create() throws if k not positive integer
- push() throws if key not finite

Export a singleton `export const topKMinHeapAlgorithm = TopKMinHeapAlgorithm;`

Reference comment header: Standard CS Top-K selection via Min-Heap (CLRS Chapter 6). Foundational primitive for: nearest-neighbor search, recommendation systems, leaderboards, telemetry top-talkers, anomaly detection.

**File 2**: `H:/prism-slot-golf/mcp-server/src/__tests__/TopKMinHeapAlgorithm.test.ts`

Use vitest. Import from `../algorithms/TopKMin
... [+1871 chars truncated]

### Assistant | 2026-05-25T00:47:23.045Z

I'll start by reading the sibling extractions to match the style, then implement both files.

### Assistant | 2026-05-25T00:47:23.528Z

[tool_use: Read]

### Assistant | 2026-05-25T00:47:23.711Z

[tool_use: Read]

### User | 2026-05-25T00:47:35.838Z

[tool_result] 1	/**
2	 * PrioritizedReplayBufferAlgorithm — proportional prioritized experience replay.
3	 *
4	 * U-EXTRACT-PRIORITIZED-REPLAY (slot:golf 2026-05-24 iter22): extracted from
5	 * extracted_modules/ai_ml_engines/PRISM_ADVANCED_DQN.js (PrioritizedReplay
6	 * portion only; DoubleDQN/DuelingDQN/NStepReturns deferred as separate
7	 * algorithm extractions).
8	 *
9	 * Reference: Schaul, Quan, Antonoglo
... [+7442 chars truncated]

### User | 2026-05-25T00:47:35.869Z

[tool_result] 1	/**
2	 * WelfordOnlineStatisticsAlgorithm — single-pass numerically-stable mean/variance.
3	 *
4	 * U-EXTRACT-WELFORD (slot:golf 2026-05-24 iter33): foundational primitive
5	 * bridging manufacturing telemetry (SPC control charts, process-capability
6	 * indices) and ML (BatchNorm running statistics, online regression, RL
7	 * advantage normalization). Closes the numerical-stability gap that ite
... [+4968 chars truncated]

### Assistant | 2026-05-25T00:47:39.293Z

Good. I have the style reference. Now I'll write both files.

### Assistant | 2026-05-25T00:48:03.139Z

[tool_use: Write]

### User | 2026-05-25T00:48:55.967Z

[tool_result] File created successfully at: H:/prism-slot-golf/mcp-server/src/algorithms/TopKMinHeapAlgorithm.ts (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T00:48:58.090Z

Now writing the test file.

### Assistant | 2026-05-25T00:49:23.515Z

[tool_use: Write]

### User | 2026-05-25T00:49:34.395Z

[tool_result] File created successfully at: H:/prism-slot-golf/mcp-server/src/__tests__/TopKMinHeapAlgorithm.test.ts (file state is current in your context — no need to Read it back)

### Assistant | 2026-05-25T00:49:37.207Z

Now run the tests.

### Assistant | 2026-05-25T00:49:38.399Z

[tool_use: Bash]

### User | 2026-05-25T00:51:36.642Z

[tool_result] PASS (14) FAIL (0)

### Assistant | 2026-05-25T00:51:43.063Z

All 14 tests pass on first run.

**Files written:**

1. `H:/prism-slot-golf/mcp-server/src/algorithms/TopKMinHeapAlgorithm.ts` — 130 lines. Implements the min-heap via `_siftUp` / `_siftDown` module-private functions, `create` / `push` / `peek` / `size` / `toSortedArray` static methods on `TopKMinHeapAlgorithm`, R12 guards on `create` (non-positive-integer k) and `push` (non-finite key), singleton export.

2. `H:/prism-slot-golf/mcp-server/src/__tests__/TopKMinHeapAlgorithm.test.ts` — 110 lines, 14 tests covering all specified cases including the heap-invariant property check after every push.

**Vitest verdict: PASS (14) FAIL (0)**
