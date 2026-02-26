# PRISM Development Protocol

## MCP-FIRST (PRIORITY 1)
MCP Server v2.5: 116 tools. NEVER read files when MCP tool exists.

**Session Start:**
```
prism_gsd_core              → Get instructions (NOT file!)
Desktop Commander:read_file → ROADMAP_TRACKER.json, CURRENT_STATE.json only
```

**Key MCP Tools:**
| Need | Tool |
|------|------|
| Instructions | `prism_gsd_core` or `prism_gsd_quick` |
| Dev rules | `prism_dev_protocol` |
| Resources count | `prism_resources_summary` |
| Context check | `prism_master_context` |
| Batch 2+ ops | `prism_master_batch` |
| Multi-agent | `prism_master_swarm` |
| Checkpoint | `prism_master_checkpoint` |
| Material data | `prism_material_get` |
| Skill content | `prism_skill_read` |
| Formula calc | `prism_formula_apply` |
| Hook search | `prism_hook_search` |

**Context Pressure:**
- GREEN (0-60%): Normal
- YELLOW (60-75%): Batch ops
- ORANGE (75-85%): Checkpoint NOW
- RED (85-92%): Prepare handoff
- CRITICAL (>92%): STOP

**4 Laws:**
1. S(x)≥0.70 or BLOCKED
2. No placeholders
3. New≥Old
4. MCP First

**Anti-Patterns (NEVER DO):**
- Read GSD_CORE.md → Use `prism_gsd_core`
- Sequential 2+ ops → Use `prism_master_batch`
- Skip monitoring → Use `prism_master_context`
- Forget checkpoints → Every 5-8 ops

**Batch Pattern:**
```
prism_master_batch({operations: [
  {tool: "prism_material_get", params: {id: "AL-6061"}},
  {tool: "prism_material_get", params: {id: "STEEL-1045"}}
]})
```

**State Files (Desktop Commander only):**
- C:\PRISM\state\CURRENT_STATE.json
- C:\PRISM\state\ROADMAP_TRACKER.json

---
PRISM: Safety-critical CNC. Wrong calcs = injury/death. NO shortcuts.
