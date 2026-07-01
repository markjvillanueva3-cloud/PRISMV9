---
name: prism-prompt-quality-scoring
description: Score a prompt using 6 gates (clarity, completeness, format, constraints, safety, context), compute PQS, and determine go/no-go threshold
---
# Prompt Quality Scoring

## When To Use
- After crafting a prompt (via prism-prompt-crafting), before submitting it
- "Is this prompt good enough?" / "Will this produce reliable results?"
- When a prompt produced bad output — score it to find which gate failed
- During ralph_loop iteration — score each prompt revision to track improvement
- NOT for: crafting the prompt itself (use prism-prompt-crafting)
- NOT for: choosing model tier (use prism-agent-selection)

## How To Use
SCORE EACH OF 6 GATES (0.0 to 1.0), then compute PQS:

**G1: CLARITY** — Can this prompt be interpreted only one way?
  1.0: No ambiguous terms, single interpretation possible
  0.75: Minor ambiguity, likely understood correctly
  0.50: Some terms could be misinterpreted
  0.25: Multiple interpretations possible
  0.0: Prompt is unclear or contradictory

**G2: COMPLETENESS** — Are all inputs, outputs, and steps defined?
  1.0: All inputs, outputs, steps defined
  0.75: Most requirements specified, minor gaps
  0.50: Key requirements present, some missing
  0.25: Major requirements missing
  0.0: Insufficient specification to execute

**G3: FORMAT** — Is the output format specified precisely?
  1.0: Exact output format specified with example
  0.75: Format specified, no example
  0.50: General format guidance only
  0.25: Vague format hints
  0.0: No format specification

**G4: CONSTRAINTS** — Are boundaries and limits stated?
  1.0: All boundaries, limits, and exclusions stated
  0.75: Key constraints present
  0.50: Some constraints, gaps in coverage
  0.25: Minimal constraint specification
  0.0: No constraints (anything goes)

**G5: SAFETY** — Is there injection protection and input validation?
  1.0: Injection protection, input validation, sandboxing
  0.75: Basic safety measures in place
  0.50: Some safety consideration
  0.25: Minimal safety
  0.0: No safety measures (vulnerable)

**G6: CONTEXT** — Is PRISM domain context provided?
  1.0: Full PRISM context: domain, role, background knowledge
  0.75: Good context, minor gaps
  0.50: Partial context
  0.25: Minimal context
  0.0: No context provided

**COMPUTE PQS:**
  PQS = (G1 + G2 + G3 + G4 + G5 + G6) / 6

**APPLY THRESHOLD:**
  PQS >= 0.85: OPTIMAL — execute the prompt
  PQS 0.50-0.84: WARNING — execute with logging, plan to iterate
  PQS < 0.50: BLOCKED — must improve prompt before using it

**TOKEN EFFICIENCY CHECK (optional, for cost optimization):**
  TE = Output_Quality / Tokens_Used
  Opus target: TE >= 0.60 (unlimited tokens, quality-first)
  Sonnet target: TE >= 0.75 (4K input / 2K output budget)
  Haiku target: TE >= 0.90 (1K input / 500 output budget)
  If TE below target: prompt is too verbose for the tier. Trim or downgrade framework.

## What It Returns
- 6 individual gate scores (G1-G6) identifying exactly where the prompt is weak
- PQS composite score (0.0-1.0) with go/no-go verdict
- The weakest gate highlighted (focus improvement efforts there)
- TE score if token efficiency matters for the use case
- Actionable fix: "G3 scored 0.25 — add explicit output format with JSON example"

## Examples
- Input: "Score this prompt: 'Analyze the material and tell me if it's good'"
  G1=0.25 (what does "good" mean?), G2=0.25 (which material? what inputs?),
  G3=0.0 (no format), G4=0.0 (no constraints), G5=0.0 (no safety), G6=0.25 (no domain)
  PQS = (0.25+0.25+0+0+0+0.25)/6 = 0.125 → BLOCKED
  Fix: define "good" (S(x)>=0.70), specify material ID, add JSON output format, add safety bounds

- Input: "Score: 'You are a PRISM materials engineer. Validate material {id} against 127-field schema. Return JSON {valid: bool, failures: [{field, reason, value}]}. Reject if density outside 1-25 g/cm3 or hardness outside 0-70 HRC.'"
  G1=0.75 (clear but "validate against schema" could be more specific)
  G2=0.75 (inputs/outputs defined, steps implicit), G3=1.0 (JSON with exact fields)
  G4=0.75 (density/hardness bounds, but other fields unconstrained)
  G5=0.50 (no injection protection on material ID), G6=0.75 (PRISM context, role defined)
  PQS = (0.75+0.75+1.0+0.75+0.50+0.75)/6 = 0.75 → WARNING (proceed with logging)
  Weakest: G5 (safety). Fix: sanitize material ID input, add input validation.

- Edge case: "PQS was 0.72 last iteration, improved prompt, now scoring again"
  Track delta: if PQS improved (0.72 → 0.83), improvement is working but still WARNING.
  Focus on whichever gate improved least. If G5 still at 0.50, that's the bottleneck.
  One more iteration targeting G5 should push PQS above 0.85 → OPTIMAL.
SOURCE: Split from prism-prompt-engineering (33.9KB)
RELATED: prism-prompt-crafting, prism-agent-selection
