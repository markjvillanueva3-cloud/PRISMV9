# BATCH 3: S2 (wiring protocol) + C5 (smoke tests) into PHASE_TEMPLATE.md
# Also C6 (parallel checkpoints) into R1/R3/R7 gates
# Also S3 (knowledge extraction) into DA companion
$dir = "C:\PRISM\mcp-server\data\docs\roadmap"

# === PHASE_TEMPLATE.md: Add wiring protocol + smoke test ===
$tmpl = [System.IO.File]::ReadAllText("$dir\PHASE_TEMPLATE.md")

$newSection = @"

---

## WIRING PROTOCOL (v14.5 -- MANDATORY for every MS that creates a capability)

After completing ANY milestone that adds a new action, engine, or capability:

``````
1. COMPANION SKILL: Create or update the skill that teaches Claude how to use it
   Location: skills-consolidated/prism-[name]/SKILL.md (MCP) + .claude/skills/[name].md (CC)
   Contains: WHEN TO USE, FUNCTION, RELATED skills, source phase+MS
   
2. COMPANION HOOK: Register validation hook if the capability has safety/quality implications
   Location: hookRegistration.ts + .claude/settings.json
   Types: blocking (prevents bad input), warning (alerts on quality), telemetry (tracks usage)

3. UPDATE INDEXES:
   SKILL_PHASE_MAP.json: Add skill to current phase's auto-load list
   SKILL_INDEX.json: Add entry with triggers, tags, relationships
   CODEBASE_INDEX.json: Add entry for new engine/action/chain

4. SMOKE TEST: Execute 1-3 realistic queries that USE the new capability end-to-end
   The query must exercise the real code path, not just unit tests
   Document the smoke test query + expected result in the MS gate criteria
   Example: "Calculate speed/feed for 4140 turning" -> verify S(x)>=0.70, structured output valid

5. VERIFY COMPANION FIRES: Run a scenario that triggers the hook and loads the skill
   If hook doesn't fire -> fix registration. If skill doesn't load -> fix triggers.

GATE CHECK: All 5 wiring steps complete for every MS that created a capability.
If a MS doesn't create a new capability (e.g., pure data loading), steps 1-2 are optional.
``````

## SMOKE TEST EXAMPLES (v14.5 -- per-phase guidance)

``````
DA:  Start new session -> boot protocol completes in <60s, skills auto-load
R1:  "Query material 4140 properties" -> returns complete record with 127 params
R1:  "Find tool T-123 insert geometry" -> returns holder + insert + coating
R2:  "Calculate speed/feed for 4140 turning, HSS tool" -> S(x)>=0.70, structured output
R2:  "What is the safe depth of cut for Ti-6Al-4V at 60 m/min?" -> bounded result with uncertainty
R3:  "Plan a job for aluminum 6061 bracket, 3-axis" -> complete plan with all parameters
R3:  "Convert 500 SFM to m/min" -> unit-consistent result
R4:  "Create tenant for Shop_A" -> isolated tenant, no data leakage
R5:  "Show dashboard for current job" -> renders with correct data binding
R6:  "Run load test at 2x" -> S(x) stays >=0.70 under load
R7:  "Predict surface finish for 304SS face milling" -> coupled physics result
R8:  "I need to machine this part" -> intent engine routes to correct workflow
R9:  "Connect to machine M-001 via MTConnect" -> live data stream established
R10: "Generate process plan for this part geometry" -> multi-operation plan with trade-offs
R11: "Package PRISM for delivery" -> installable artifact with docs
``````

"@

# Insert before the BRAINSTORM QUALITY CHECKLIST section
$tmpl = $tmpl.Replace(
    "## BRAINSTORM QUALITY CHECKLIST",
    "$newSection`r`n## BRAINSTORM QUALITY CHECKLIST"
)

# Also add to checklist
$tmpl = $tmpl.Replace(
    "[] Every MS has Effort + Tier + Context + Response Budget headers",
    "[] Every MS has Effort + Tier + Context + Response Budget headers`r`n[] Every MS that creates a capability has WIRING PROTOCOL steps (skill + hook + index + smoke test)`r`n[] Every MS gate includes at least one SMOKE TEST query with expected result"
)

[System.IO.File]::WriteAllText("$dir\PHASE_TEMPLATE.md", $tmpl)
Write-Output "S2+C5: PHASE_TEMPLATE updated ($((Get-Content "$dir\PHASE_TEMPLATE.md").Count) lines)"
