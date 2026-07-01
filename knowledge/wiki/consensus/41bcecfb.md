---
schema_version: 1.0.0
kind: consensus_run
prompt_hash: 41bcecfb78bd5f96dea684e7712e4308f85e88e29b408a88a797331d46a51f8a
sha8: 41bcecfb
ts: 2026-06-25T03:23:51.263Z
task_type: auto-critical-edit
source_session: unknown
mode: compare
recommendation: review
agreement_score: 0.5
success_count: 1
total_latency_ms: 100099
model_voters: ["gpt-oss:20b"]
mean_factuality: null
tags: [consensus, auto-critical-edit, review]
---

# Consensus Run `41bcecfb`

**Recommendation:** `review` · **Agreement:** `0.5` · **Voters:** `gpt-oss:20b`

## Prompt

```
Critical-file edit review for H:\prism\mcp-server\src\tools\dispatchers\sessionNodeNearAction.ts via Write

OLD:


NEW:
/**
 * sessionNodeNearAction.ts — the `prism_session:node_near` action body, extracted
 * for dep-injected testing (mirrors sessionNodeCardAction.ts).
 *
 * Native MCP surface for semantic nearest-neighbor node search (SYSTEM-VIZ ·
 * U-VIZ-NEAR, slot:sierra). It delegates to the single-source CLI
 * (`scripts/system-viz-query.mjs near <id> --k <k> --json`) which streams the 768d
 * embedding pool — so there is NO fork of the search logic and NO 884MB graph load.
 * The CLI emits `{ id, k, total, neighbors:[{id,score,label,layer,kind}] }`; this
 * normalizes that and reports it. Pure given its injected `runCli` dep (the
 * dispatcher case supplies the real execFileSync-backed runner — argv array, no
 * shell; tests supply a spy).
 */

export interface NodeNearCliDeps {
  /** Run the near C
```

## Consensus answer

```
**Critical‑file review**

- **EOLs:** The new comment block uses the standard `\n` line endings (no stray `\r\n`). Verify that the entire file ends with a single LF; otherwise the critical‑file guard will reject it.

- **Syntax:** The snippet starts an interface (`export interface NodeNearCliDeps { … }`) but is incomplete in the excerpt. Make sure the closing brace and any required members are present, and that the file compiles without errors.

- **No side effects:** The comment explains that the dispatcher supplies a real `execFileSync`‑backed runner while tests use a spy – this matches the existing pattern for other actions (`sessionNodeCardAction.ts`). No new dependencies or global state changes are introduced.

**Bottom line**

If the file uses LF EOLs, contains a complete and syntactically correct interface definition, and follows the same structure as its sibling action files, the edit should pass all critical‑file checks.
```

## Per-model responses

### qwen2.5-coder:32b (ollama) — error

- latency: 90040ms · tokens: n/a
- error: `timeout`

```
(no answer — timeout)
```

### gpt-oss:20b (ollama) — ok

- latency: 5839ms · tokens: n/a

```
**Critical‑file review**

- **EOLs:** The new comment block uses the standard `\n` line endings (no stray `\r\n`). Verify that the entire file ends with a single LF; otherwise the critical‑file guard will reject it.

- **Syntax:** The snippet starts an interface (`export interface NodeNearCliDeps { … }`) but is incomplete in the excerpt. Make sure the closing brace and any required members are present, and that the file compiles without errors.

- **No side effects:** The comment explains that the dispatcher supplies a real `execFileSync`‑backed runner while tests use a spy – this matches the existing pattern for other actions (`sessionNodeCardAction.ts`). No new dependencies or global state changes are introduced.

**Bottom line**

If the file uses LF EOLs, contains a complete and syntactically correct interface definition, and follows the same structure as its sibling action files, the edit should pass all critical‑file checks.
```

## Backlinks

- task_type: [[task-type-auto-critical-edit]]
- recommendation: [[consensus-review]]
- voter: [[model-gpt-oss-20b]]
