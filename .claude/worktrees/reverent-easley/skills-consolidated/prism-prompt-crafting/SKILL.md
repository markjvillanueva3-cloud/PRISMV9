---
name: prism-prompt-crafting
description: 7-step procedure for crafting PRISM prompts — analyze, select framework (Direct/CRAFT/RISEN/CoT), calibrate, contextualize, resolve ambiguity, format, document
---
# Prompt Crafting Protocol

## When To Use
- Building a new prompt for Claude API calls (ralph_loop, agent_execute, swarm tasks)
- "How should I structure this prompt?" / "Which framework for this task?"
- Designing system prompts for new PRISM engines or dispatchers
- When a prompt is producing unreliable or inconsistent results (recraft it)
- NOT for: scoring an existing prompt's quality (use prism-prompt-quality-scoring)
- NOT for: general Claude usage tips (this is for PRISM-internal prompt engineering)

## How To Use
EXECUTE THESE 7 STEPS IN ORDER for every non-trivial prompt:

**STEP 1: ANALYZE** — Define inputs, outputs, and constraints
  List: what data goes IN (material params, machine specs, user query)
  List: what comes OUT (JSON, code, prose, number with uncertainty)
  List: what must NOT happen (safety violations, hallucinated values, format deviations)
  Success criteria: how will you verify the output is correct?

**STEP 2: SELECT FRAMEWORK** based on task type:
  DIRECT: single-step, clear outcome → plain instruction
  CRAFT: multi-part complex → Context + Role + Action + Format + Tone
  RISEN: expert persona needed → Role + Instructions + Steps + End-goal + Narrowing
  CoT: reasoning/analysis/math → Setup + think step-by-step + validate + output
  When uncertain: reasoning → CoT. Expertise → RISEN. Default → CRAFT.

**STEP 3: CALIBRATE** — Balance specificity vs flexibility
  Too specific: "Return exactly 3 decimal places for all values" → brittle if some values are integers
  Too vague: "Return good results" → no actionable constraint
  Right: "Return numeric values with appropriate precision (integers for counts, 2-4 decimals for measurements)"
  Rule: match precision to task criticality. Safety calcs = very specific. Summaries = more flexible.

**STEP 4: CONTEXTUALIZE** — Add role + domain + output format
  Role: "You are a manufacturing process engineer analyzing CNC cutting parameters"
  Domain: "Working within PRISM Manufacturing Intelligence. Safety-critical context."
  Format: XML tags for structured output, JSON for data, markdown for prose
  For Opus: include thinking_process and quality_gates sections
  For Sonnet: compact role + task + output format
  For Haiku: minimal task + input + output only

**STEP 5: RESOLVE AMBIGUITY** — Find and fix every unclear term
  Scan prompt for words that could mean multiple things
  Replace or define: "good performance" → "S(x) >= 0.70 and MRR > 50 cm³/min"
  State assumptions: "Assuming dry machining unless coolant specified"
  Define edge cases: "If material not found, return error with suggestions"

**STEP 6: FORMAT** — Structure for reliable parsing
  Use XML tags for sections: <task>, <inputs>, <output_format>, <constraints>
  Use code blocks for data: ```json for structured output expectations
  Use numbered lists for multi-step instructions
  Include delimiters between user-provided data and prompt instructions

**STEP 7: DOCUMENT** — Record reasoning for future iteration
  Why this framework was chosen
  What alternatives were considered
  Expected failure modes and how prompt handles them
  Log prompt version for PE calibration feedback

## What It Returns
- A structured prompt following the selected framework (DIRECT/CRAFT/RISEN/CoT)
- Appropriate tier formatting (Opus full CoT, Sonnet focused, Haiku minimal)
- Resolved ambiguities with explicit definitions
- Parseable output format with XML/JSON structure
- Documentation of design decisions for future prompt iteration

## Examples
- Input: "Need a prompt for ralph_loop to validate a new material entry"
  Step 1: IN=material JSON, OUT=validation report with pass/fail, CONSTRAINT=check all 127 fields
  Step 2: CoT (reasoning needed to check field relationships and physical plausibility)
  Step 3: Specific — list exact fields to check, exact range bounds
  Step 4: Role=materials scientist, Domain=PRISM material database, Format=JSON report
  Step 5: Define "valid range" for each field type (hardness 0-70 HRC, density 1-25 g/cm³)
  Step 6: <material_data>...</material_data><validation_rules>...</validation_rules><output_format>JSON</output_format>
  Step 7: Log as PE-validate-material-v1, CoT chosen for multi-field reasoning

- Input: "Prompt for agent_execute to generate a G-code snippet"
  Step 2: RISEN (expert persona — CNC programmer)
  Step 4: Role=Senior CNC programmer with 20 years FANUC experience
  Step 5: Ambiguity: "G-code" could mean any controller → narrow to "FANUC 0i-MF"

- Edge case: "Simple lookup — get material name from ID"
  Step 2: DIRECT (single-step, no reasoning needed)
  Full prompt: "Return the material name for ID '{id}' from the PRISM registry. Format: plain text."
  No framework overhead needed. 7-step still applies but steps 3-7 are minimal.
SOURCE: Split from prism-prompt-engineering (33.9KB)
RELATED: prism-prompt-quality-scoring, prism-agent-selection
