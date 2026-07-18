# Forge Engine — Auto-Generate a Fully Wired PRISM Engine

Generate all 7 artifacts for a new PRISM engine from a name and description, then wire them.

## Usage
- `/forge-engine MyNewEngine "Description of what it does"` — Dry-run preview of all artifacts
- `/forge-engine MyNewEngine "Description" --apply` — Generate and write all files
- `/forge-engine MyNewEngine "Description" --methods calculate,validate` — Custom methods

## Advisor Strategy (`advisor_20260301`)
Use Anthropic's advisor tool for this command:
- **Executor**: Sonnet 4.6 (generates code, calls MCP tools, writes files)
- **Advisor**: Opus 4.6, `max_uses: 2`
- **When Sonnet should call advisor**: (1) after duplication/discovery checks, before generating artifacts — to validate architecture decisions, (2) for `--apply` only: after writing files, before declaring done — to verify wiring correctness
- For dry-run (default): `max_uses: 1` (one planning call is sufficient).

## Procedure

### 1. Parse Arguments
Extract from $ARGUMENTS:
- Engine name (first word, PascalCase — Engine suffix added if missing)
- Description (quoted string)
- `--apply` flag → dry_run=false
- `--force` flag → skip duplication checks
- `--methods name1,name2` → custom method list

### 1B. Internal Wheel Detection (MANDATORY unless --force)
Run `/dont-reinvent engine <description>` to search for existing solutions:
1. Check SYSTEM_ARCHITECTURE.json for similar engines/actions
2. Grep codebase for matching function names
3. If similarity >= 70%: HALT and show alternatives
4. If similarity 40-69%: WARN and ask to confirm
5. If similarity < 40% or --force: PROCEED

This is a fast grep-based check (< 5 seconds) that catches obvious duplicates before the slower MCP-based checks below.

### 2. Duplication Check (CodingCopilot — MANDATORY)
BEFORE generating, call `prism_dev:copilot_suggest`:
```
action: "copilot_suggest"
params: { task_description: "<description>", proposed_name: "<EngineName>", existing_engines: [] }
```
- If `duplication_check.recommendation` is "skip" or "extend" → WARN the user and suggest reuse
- If `reuse_suggestions` has entries → show them: "Consider reusing: [engines]"
- Only proceed if recommendation is "proceed" or user overrides

### 2B. Discovery Check (DiscoverabilityEngine)
Search for related existing capabilities:
```
prism_dev:discover_search
params: { query: "<description keywords>" }
```
Show: "Related capabilities: [list with entry points]"
This helps the user understand what already exists before creating new.

### 2C. Domain Gap Check (UtilizationContractEngine)
Check if this engine fills a known gap:
```
prism_dev:utilization_map
params: {}
```
If the engine's domain has low utilization, note: "This fills a gap in [domain] (currently [N]% utilized)"

### 2D. Pillar Assignment (ProductPillarEngine)
Suggest which product pillar owns this engine:
```
prism_dev:pillar_list
params: {}
```
Match engine domain to pillar and note: "Assigned to pillar: [pillar_name]"

### 3. Call AutoForgeEngine
Use the `prism_dev:auto_forge` MCP action:
```
action: "auto_forge"
params: { name, description, dry_run, methods }
```

Optionally use `prism_dev:copilot_template` for the scaffold:
```
action: "copilot_template"
params: { name, domain: "<detected>", capabilities: ["<from description>"] }
```

### 3. Display Results
For dry run: show all 7 artifact contents with syntax highlighting.
For apply: show what was written and what needs manual insertion.

### 4. Manual Steps Reminder
After generation, remind the user:
- Dispatcher case and schema need manual paste (shown in output)
- Run `npx tsc --noEmit` to verify
- Run tests: `npx vitest run src/__tests__/[EngineName].test.ts`
- Update ENGINE_DIGEST.md and MASTER_INDEX_COMPACT.md
