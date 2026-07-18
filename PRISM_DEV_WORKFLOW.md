# PRISM Development Workflow v1.0

## Session Boot (3 tool calls max)

```
prism_quick_resume_v2 → DC:read_file C:\PRISM\state\ACTION_TRACKER.md → prism_todo_update
```

Skip boot entirely for simple questions.

---

## Development Modes

### 🔧 BUILD MODE (new tools, skills, hooks, wiring)

```
1. DC:list_directory C:\PRISM\mcp-server\src\tools\ (orient)
2. prism_sp_brainstorm (goal + constraints → approval)
3. Write JS directly to dist/ (bypass tsc OOM)
4. npm run build (esbuild, 150ms)
5. Test tool via MCP call
6. Phase Checklist: skills→hooks→GSD→memories→orchestrators→state→scripts
```

### 🔍 AUDIT MODE (find gaps, dead code, underutilization)

```
1. prism_registry_status (what's loaded)
2. prism_working_tools (what's actually callable)
3. DC:start_search on src/ for imports/registrations
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
1. DC:read_file source .ts/.py file (get signatures)
2. Write registerXTools() JS to dist/tools/
3. Import in dist/index.js
4. npm run build → test
Pattern: omegaTools.js is the gold standard template
```

---

## Auto-fire Cadence

| Trigger | Action |
|---|---|
| Every 5 tool calls | `prism_todo_update` |
| Every 10 tool calls | `prism_auto_checkpoint` |
| Before file replace | `validate_anti_regression` |
| After any build | Phase Checklist |
| Session end | `prism_state_save` → update ACTION_TRACKER.md |

---

## Known Broken → Workaround

| Broken | Use Instead |
|---|---|
| `tsc` compiler | `npm run build` (esbuild) |
| `prism_gsd_core` | `DC:read_file C:\PRISM\mcp-server\GSD_v14.md` |
| `autopilot` v1 | `autopilot_v2` |
| `ralph_loop_lite` | `ralph_loop` (needs API key) |
| machine/tool registries | Data files missing, need population |

---

## Quality Gates (non-negotiable)

- **S(x) ≥ 0.70** — hard block on safety-critical
- **Ω(x) ≥ 0.70** — release ready
- **Evidence ≥ L3** — no claiming "COMPLETE" without proof
- **Anti-regression** — new_count ≥ old_count always
- **No placeholders** — first response = final quality

---

## Token Efficiency Rules

- `DC:read_file` for quick file reads (don't load full skills if you already know the content)
- `knowledge_search` before building anything (might already exist)
- Skip GSD load for simple tasks
- Batch related file reads with `DC:read_multiple_files`
- Don't re-search data already in context
- Short status updates, not verbose narratives

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
prism_state_save → DC:write ACTION_TRACKER.md → prism_todo_update (final)
```

Include: what's done, what's next, any blockers.
