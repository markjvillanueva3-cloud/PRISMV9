# PRISM Development Workflow v2.0 (GSD v15)

## Session Boot (2 calls max)

```
prism_session_boot → prism_todo_update
```

session_boot returns: quick_resume + action_tracker + roadmap in ONE call.
Skip boot entirely for simple questions.

---

## Development Modes

### 🔧 BUILD MODE (new tools, skills, hooks, wiring)

```
1. prism_server_info (orient)
2. prism_sp_brainstorm (goal + constraints → approval)
3. prism_code_template (get pattern)
4. prism_file_write (write source to src/tools/)
5. prism_build (esbuild, errors only)
6. Test tool via MCP call
7. Phase Checklist: skills→hooks→GSD→memories→orchestrators→state→scripts
```

### 🔍 AUDIT MODE (find gaps, dead code, underutilization)

```
1. prism_registry_status (what's loaded)
2. prism_working_tools (what's actually callable)
3. prism_code_search on src/ for imports/registrations
4. Compare: built vs wired vs functional
5. Report with priorities
```

### 🐛 DEBUG MODE (mandatory order)

```
EVIDENCE → ROOT CAUSE → HYPOTHESIS → FIX
prism_sp_debug at each phase. Never skip to fix.
```

### ⚡ WIRE MODE (connect existing code to MCP)

```
1. prism_file_read source .ts file (get signatures)
2. prism_code_template("tool_registration") for pattern
3. prism_file_write registerXTools() to src/tools/
4. prism_code_search to verify wiring in index.ts
5. prism_build → test
```

---

## MCP-Native Tool Priority (v15)

| Task | MCP Tool | NOT |
|------|----------|-----|
| Read ACTION_TRACKER | prism_action_tracker | DC:read_file |
| Read ROADMAP | prism_roadmap_status | DC:read_file |
| Write state docs | prism_doc_write | DC:write_file |
| Build project | prism_build | DC:start_process npm |
| Search code | prism_code_search | DC:start_search |
| Read source | prism_file_read | DC:read_file |
| Get patterns | prism_code_template | reading old files |

DC only for: files outside mcp-server/, binary files, process management.

---

## Auto-fire Cadence

| Trigger | Action |
|---|---|
| Every 5 tool calls | `prism_todo_update` |
| Every 10 tool calls | `prism_auto_checkpoint` |
| Before file replace | `validate_anti_regression` |
| After any build | Phase Checklist |
| Session end | `prism_state_save` → `prism_doc_write` ACTION_TRACKER |

---

## Known Broken → Workaround

| Broken | Use Instead |
|---|---|
| `tsc` compiler | `prism_build` (esbuild) |
| `DC:read_file` for state docs | `prism_doc_read` / `prism_action_tracker` / `prism_roadmap_status` |
| `autopilot` v1 | `autopilot_v2` |
| `ralph_loop_lite` | `ralph_loop` (needs API key) |
| machine bootstrap | manufacturer.toLowerCase bug |

---

## Quality Gates (non-negotiable)

- **S(x) ≥ 0.70** — hard block on safety-critical
- **Ω(x) ≥ 0.70** — release ready
- **Evidence ≥ L3** — no claiming "COMPLETE" without proof
- **Anti-regression** — new_count ≥ old_count always
- **No placeholders** — first response = final quality

---

## Token Efficiency Rules

- MCP-native tools for all state/planning docs (90% savings)
- `prism_build` for builds (errors only, 70% savings)
- `prism_code_search` instead of DC:start_search (50% savings)
- `prism_session_boot` for boot (70% savings vs 3-call)
- `knowledge_search` before building anything (might already exist)
- Skip GSD load for simple tasks
- Don't re-search data already in context

---

## Context Pressure Management

```
🟢 0-8 tool calls   → normal ops
🟡 9-14 tool calls  → plan checkpoint
🔴 15-18 tool calls → checkpoint NOW, prepare handoff
⚫ 19+ tool calls    → STOP, save state, end session
```

---

## Session End (always)

```
prism_state_save → prism_doc_write(ACTION_TRACKER.md) → prism_todo_update (final)
```

Include: what's done, what's next, any blockers.
