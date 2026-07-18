---
schema_version: 1.0.0
kind: consensus_run
prompt_hash: e5e3cceeb49a0d6c2b90e01f4f84d70f5f7fde527d2c56c2b07e84807d8066d7
sha8: e5e3ccee
ts: 2026-06-24T01:21:13.012Z
task_type: auto-critical-edit
source_session: unknown
mode: compare
recommendation: escalate
agreement_score: 0.059
success_count: 2
total_latency_ms: 11280
model_voters: ["qwen2.5-coder:32b"]
mean_factuality: null
tags: [consensus, auto-critical-edit, escalate]
---

# Consensus Run `e5e3ccee`

**Recommendation:** `escalate` · **Agreement:** `0.059` · **Voters:** `qwen2.5-coder:32b`

## Prompt

```
Critical-file edit review for H:\prism\mcp-server\src\tools\dispatchers\aiReasoningDispatcher.ts via Edit

OLD:
      case "mit_course_knowledge_query": {
        const { mitCourseKnowledgeEngine } = await import("../../engines/MITCourseKnowledgeEngine.js");
        const p = params as any;
        result = { success: true, data: (mitCourseKnowledgeEngine as any).query?.(p) ?? (mitCourseKnowledgeEngine as any).search?.(p) ?? (mitCourseKnowledgeEngine as any).getCourse?.(p.courseId ?? p.id) ?? { engine: "MITCourseKnowledgeEngine", note: "method not callable" } };
        break;
      }

NEW:
      case "mit_course_knowledge_query": {
        // FIX (U-MIT-KNOWLEDGE-QUERY-WIRE): facade probed query/search/getCourse (none
        // exist); the real searches are searchAlgorithms + searchCourses. Sound-logic
        // router: `scope` selects algorithms | courses | both (default both -- both ARE
        // MIT course-knowledge, nothing dropped). The searches do query.toLowerCase()
        // with no guard, so require a non-empty query here (fail loud).
        const { mitCourseKnowledgeEngine } = await import("../../engines/MITCourseKnowledgeEngine.js");
        const p = params as { query?: unknown; scope?: string; limit?: number };
        if (typeof p.query !== "string" || p.query.trim() === "") {
          throw new Error("mit_course_knowledge_query requires a non-empty 'quer
```

## Consensus answer

```
The edit requires review due to the introduction of new logic for parameter validation, which affects how the function handles inputs. The incomplete error message also needs attention.

**Final Answer:** Review required for new validation logic and completion of error message.
```

## Per-model responses

### qwen2.5-coder:32b (ollama) — ok

- latency: 2805ms · tokens: n/a

```
The edit requires review due to the introduction of new logic for parameter validation, which affects how the function handles inputs. The incomplete error message also needs attention.

**Final Answer:** Review required for new validation logic and completion of error message.
```

### gpt-oss:20b (ollama) — ok

- latency: 4143ms · tokens: n/a

```
**Updated `mit_course_knowledge_query` case**

```ts
case "mit_course_knowledge_query": {
  // FIX (U-MIT-KNOWLEDGE-QUERY-WIRE): facade probed query/search/getCourse (none
  // exist); the real searches are searchAlgorithms + searchCourses. Sound‑logic
  // router: `scope` selects algorithms | courses | both (default both – all
  // results are MIT course‑knowledge, nothing dropped). The searches do
  // query.toLowerCase() with no guard, so require a non‑empty query here
  // (fail loud).
  const { mitCourseKnowledgeEngine } = await import(
    "../../engines/MITCourseKnowledgeEngine.js"
  );
  const p = params as {
    query?: unknown;
    scope?: string;   // "algorithms" | "courses" | undefined
    limit?: number;   // optional max results
  };

  if (typeof p.query !== "string" || p.query.trim() === "") {
    throw new Error(
      "mit_course_knowledge_query requires a non-empty 'query' string"
    );
  }

  const q = p.query.toLowerCase();
  let data: unknown[];

  switch (p.scope) {
    case "algorithms":
      data =
        mitCourseKnowledgeEngine.searchAlgorithms?.(q) ?? [];
      break;

    case "courses":
      data =
        mitCourseKnowledgeEngine.searchCourses?.(q) ?? [];
      break;

    default:
      // both – merge algorithms & courses
      const algos =
        mitCourseKnowledgeEngine.searchAlgorithms?.(q) ?? [];
      const courses =
        mitCourseKnowledgeEngine.searchCourses?.(q) ?? [];
      data = [...algos, ...courses];
  }

  if (typeof p.limit === "number" && p.limit > 0) {
    data = data.slice(0, p.limit);
  }

  result = { success: true, data };
  break;
}
```

This replaces the fragile `query/search/getCourse` probing with a clear, guarded dispatch to the actual engine methods (`searchAlgorithms`, `searchCourses`). It validates the query string, respects an optional `scope` selector, and applies an optional `limit`.
```

## Backlinks

- task_type: [[task-type-auto-critical-edit]]
- recommendation: [[consensus-escalate]]
- voter: [[model-qwen2-5-coder-32b]]
