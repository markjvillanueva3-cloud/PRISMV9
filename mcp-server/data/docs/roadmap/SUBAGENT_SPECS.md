# PRISM SUBAGENT SPECIFICATIONS — CC_DEFERRED
# Created: DA-MS1 2026-02-17
# Status: Documented for future Claude Code setup
# Location: ~/.claude/agents/ (when CC available)

## 1. prism-safety-reviewer
- Model: Opus | Memory: project | Tools: Read, Grep, Glob, Bash
- Purpose: S(x)>=0.70 enforcement, calc verification against CALC_BENCHMARKS.json
- Persistent memory: Calculation failure patterns across sessions
- Test query: "Check if Vc=200 m/min for Ti-6Al-4V milling is safe"

## 2. prism-registry-expert
- Model: Sonnet | Memory: project | Tools: Read, Grep, Glob, Bash
- Purpose: Manages 3518 materials, 824 machines, tools, 9200+ alarms, 500 formulas
- Persistent memory: Data quality patterns discovered during loading
- Test query: "What's the Kienzle kc1.1 for AISI 4340?"

## 3. prism-architect
- Model: Opus | Memory: project | Tools: Read, Write, Grep, Glob, Bash
- Purpose: Design decisions with rationale, wiring registry consultation
- Persistent memory: Architectural decisions across sessions
- Test query: "Should we add a new dispatcher or extend calcDispatcher?"

## 4. prism-test-runner
- Model: Sonnet | Memory: project | Tools: Read, Bash, Glob
- Purpose: Test suites, regression checks, benchmark validation
- Persistent memory: Test coverage and failure history
- Test query: "Run npm run build and report status"

## 5. prism-data-validator
- Model: Sonnet | Memory: project | Tools: Read, Grep, Glob, Bash
- Purpose: Registry data quality — schema compliance, completeness, cross-references
- Persistent memory: Quarantine patterns with reason codes
- Test query: "Validate aluminum alloy entries have all 127 parameters"

## ACTIVATION PROTOCOL (when CC available)
1. Create ~/.claude/agents/ directory
2. Write each .md file with system prompt + tool permissions
3. Test each with test query above
4. End session, start new, verify memory persistence
5. Remove CC_DEFERRED from ACTION_TRACKER
