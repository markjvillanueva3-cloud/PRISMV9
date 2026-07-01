---
type: "chat-session"
source: "claude-code-cli"
session_id: "c0f06dee-d6f2-4070-8e01-4732115adb48"
title: "RE-SCRUTINY of PRISM unit COMMAND-KERNEL-MS0/U-CK12 pipeline frontmatter schema "
date: "2026-05-17"
first_ts: "2026-05-17T21:11:04.551Z"
last_ts: "2026-05-17T21:11:47.461Z"
cwd: "H:\\prism"
messages: 8
user_msgs: 3
assistant_msgs: 5
raw_file: "H:/.claude/projects/H--prism/c0f06dee-d6f2-4070-8e01-4732115adb48/subagents/agent-a7fcd1e93f8e9991d.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:25"
---

# RE-SCRUTINY of PRISM unit COMMAND-KERNEL-MS0/U-CK12 pipeline frontmatter schema 

> **claude-code-cli** | 2026-05-17 | 8 msgs (3 user / 5 assistant) | cwd: H:\prism
> Raw: `H:/.claude/projects/H--prism/c0f06dee-d6f2-4070-8e01-4732115adb48/subagents/agent-a7fcd1e93f8e9991d.jsonl`

## Transcript

### User | 2026-05-17T21:11:04.551Z

RE-SCRUTINY of PRISM unit COMMAND-KERNEL-MS0/U-CK12 pipeline frontmatter schema (Arm B — independent second-pass).

YOUR PRIOR VERDICT was FAIL with 2 findings:
- **P0-1**: `"const": "pipeline"` was a silent no-op under the CK06 validator. NOW FIXED → `"enum": ["pipeline"]`.
- **P1-2**: No top-level enforcement that at least one of composed_of/composes/stages is present. NOW MITIGATED in two ways:
  (a) Added `x-rationale.no_steps_required` documenting this is INTENTIONAL design (pure-trigger pipelines exist) — and committing the validator script (next file, scripts/validate-pipeline-registry.mjs) to emit a WARNING on entries with no steps field;
  (b) Added `x-rationale.validator_subset_limits` enumerating all unenforced semantic constraints + naming the U-CK13 executor + validator-script-warning layer as the enforcement surfaces.
  Schema-level enforcement via `anyOf`/`oneOf` would either need `anyOf` (CK06 doesn't implement) or `oneOf` (would break knowledge-injection.md which has BOTH `composes` AND `stages` — would match 2 branches and fail).

Also applied (your P3-2 nit): added `"deprecated": true` to `composes`.

RE-REVIEW THE FILE END-TO-END:
- H:\prism\.claude\schemas\pipeline-frontmatter.schema.json

You must verify:
1. The P0 fix is COMPLETE — does the CK06 validator's `enum` handler treat `enum: ["pipeline"]` as a hard check? (cross-reference H:\prism\scripts\validate-command-frontmatter.mjs lines ~197-265 if needed.)
2. The P1 mitigation is HONEST — the schema explicitly admits it cannot mechanically enforce "at-least-one-steps" and commits a non-schema enforcement layer. Is this an acceptable resolution given (a) the validator-subset limits, (b) that schema-side `oneOf` would break knowledge-injection.md, (c) the design choice for pure-trigger pipelines?
3. The validator script (next file) MUST actually implement the warning for the mitigation to be honest. Flag this as a P0 hold on the next file if missing.
4. No new defects introduced. The existing P
... [+270 chars truncated]

### Assistant | 2026-05-17T21:11:09.913Z

I'll re-review the pipeline frontmatter schema independently, focusing on whether the prior P0/P1 findings are genuinely resolved.

### Assistant | 2026-05-17T21:11:10.298Z

[tool_use: Read]

### User | 2026-05-17T21:11:11.843Z

[tool_result] read-once-guard: 'H:\prism\.claude\schemas\pipeline-frontmatter.schema.json' was already read 11s ago in this session and is unchanged (mtime 1779052229982). Its content is in your context — use it, don't re-read. For a different part of the file use Grep, or Read with a different offset/limit. If you just edited it, the Edit/Write tools already track the new state for you. (disable: PRISM_READ_CA
... [+6 chars truncated]

### Assistant | 2026-05-17T21:11:15.615Z

I have the file in context already. Let me cross-reference the CK06 validator to verify the `enum` handler.

### Assistant | 2026-05-17T21:11:16.618Z

[tool_use: Read]

### User | 2026-05-17T21:11:17.572Z

[tool_result] 180	        if (next && next > itemIndent) item[k] = parseBlock(next);
181	      }
182	    }
183	    return item;
184	  }
185	  return parseBlock(0);
186	}
187	
188	function extractFrontmatter(content) {
189	  if (!content.startsWith("---")) return null;
190	  const end = content.indexOf("\n---", 3);
191	  if (end < 0) return null;
192	  const body = content.slice(3, end).replace(/^\r?\n/, "");
19
... [+3863 chars truncated]

### Assistant | 2026-05-17T21:11:47.461Z

Confirmed. The CK06 validator implements `enum` at line 206-208 as a hard check — `enum: ["pipeline"]` will reject any value other than `"pipeline"`. The P0 fix is genuine.

Let me also confirm: the validator implements `oneOf` (line 259-263) but **not** `anyOf`. The schema's rationale that `oneOf` would break knowledge-injection.md and `anyOf` is unimplemented is accurate. Now let me re-read the relevant sections of the schema to verify the mitigation language is honest.

Looking at the schema as held in my context:

**P0 verification (line 22-23 of schema):**
```json
"kind": {
  "enum": ["pipeline"],
  "description": "..."
}
```
This is a HARD check under the CK06 validator (line 206-208 in validator). Non-`pipeline` values will produce `value "X" not in enum ["pipeline"]`. **P0 is genuinely fixed.**

**P1 mitigation verification:**
The schema has `x-rationale.no_steps_required` documenting design intent (pure-trigger pipelines), and `x-rationale.validator_subset_limits` enumerating unenforced constraints with named enforcement surfaces (U-CK13 executor + validator-script-warning layer).

Honest assessment:
- The schema cannot use `anyOf` (unimplemented in CK06 validator) — confirmed by reading validator (no `anyOf` handler exists between lines 196-265).
- Using `oneOf` would indeed reject knowledge-injection.md if it has BOTH `composes` AND `stages` — this is a real constraint of the CK06 validator's `oneOf` semantics (line 259-263 counts matching alternatives and requires exactly 1).
- The schema explicitly admits the limitation and names U-CK13 + the validator script's warning layer as enforcement surfaces.

This is an honest fail-loud (R12) approach: rather than silently passing pipelines with no steps, the design commits to surfacing them via a separate enforcement surface. **The mitigation is honest.**

**P1 HOLD on next file:** The mitigation is only honest if `scripts/validate-pipeline-registry.mjs` (next file per the re-scrutiny prompt) actually implement
... [+2544 chars truncated]
