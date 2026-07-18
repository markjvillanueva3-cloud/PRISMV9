---
type: "chat-session"
source: "claude-code-cli"
session_id: "625e0262-c371-48f3-8e8f-320b790f8062"
title: "You are writing the FIRST per-domain CLAUDE.md for PRISM's BUSINESS/ERP galaxy u"
date: "2026-05-26"
first_ts: "2026-05-26T23:34:02.399Z"
last_ts: "2026-05-26T23:34:47.676Z"
cwd: "H:\\PRISM"
messages: 11
user_msgs: 5
assistant_msgs: 6
raw_file: "H:/.claude/projects/H--prism/625e0262-c371-48f3-8e8f-320b790f8062/subagents/agent-a9e52370481b5a09a.jsonl"
tags:
  - "chat-archive"
  - "claude-code-cli"
ingested: "2026-06-25T20:40:13"
---

# You are writing the FIRST per-domain CLAUDE.md for PRISM's BUSINESS/ERP galaxy u

> **claude-code-cli** | 2026-05-26 | 11 msgs (5 user / 6 assistant) | cwd: H:\PRISM
> Raw: `H:/.claude/projects/H--prism/625e0262-c371-48f3-8e8f-320b790f8062/subagents/agent-a9e52370481b5a09a.jsonl`

## Transcript

### User | 2026-05-26T23:34:02.399Z

You are writing the FIRST per-domain CLAUDE.md for PRISM's BUSINESS/ERP galaxy under the new Domain-Galaxy Doctrine (spec at H:/prism/state/shared/specs/DOMAIN-GALAXY-DOCTRINE-2026-05-26.md). This is the "galactic center" file per Bibryam's Context Cascade pattern.

DELIVERABLE — write ONE file:
- Path: H:/prism/mcp-server/src/engines/business/CLAUDE.md (use Glob to find actual dir — might be `engines/business/`, `engines/erp/`, or distributed)
- Length: ≤200 lines
- Audience: Claude working on ERP/HR/financial/scheduling tasks; canonical slot is hotel; dispatcher `prism_business:*` (~250 actions per CLAUDE.md hint)

CONTENT REQUIRED (each section ≤25 lines):
1. **Business/ERP scope** — financial (NPV/IRR), inventory (EOQ/safety stock), payroll, HR/PTO/benefits, scheduling, capacity planning, AP/AR, customer mgmt, vendor mgmt, asset depreciation, compliance (ISO9001/OSHA/AS9100/ISO13485), quality NCRs, supplier scorecards. This is the BIGGEST dispatcher in PRISM.
2. **Domain-specific tier doctrine** — business engines DON'T need shop_floor Ω≥0.95; they need different rigor (audit trail, immutable ledger, schema versioning). Surface the actual tier from omega-thresholds.json if it exists.
3. **Common business engines** — Glob `mcp-server/src/engines/business/*` and similar; list 10 highest-volume.
4. **State/persistence pattern** — business state files (jobs, employees, POs, invoices, JE) live in `mcp-server/data/state/`. List the directory if useful.
5. **Test commands** — business-test runs.
6. **Domain gotchas** — Glob knowledge/memories/feedback/feedback_*business*.md + feedback_*erp*.md + feedback_*payroll*.md. Surface 3-5 specific don'ts. The HOTEL-ERP-SCOPE-ASSESSMENT spec from this session is highly relevant.
7. **Cross-galaxy edges** — business ↔ quoting (job creation from quote), business ↔ shop-floor (capacity + work orders), business ↔ quality (NCRs into financial impact), business ↔ compliance.

WHEN DONE, return THIS exact format:
```
FILE: <actual path
... [+459 chars truncated]

### Assistant | 2026-05-26T23:34:19.368Z

I'll start by exploring the business/ERP structure in PRISM.

### Assistant | 2026-05-26T23:34:20.442Z

[tool_use: Bash]

### Assistant | 2026-05-26T23:34:20.871Z

[tool_use: Glob]

### Assistant | 2026-05-26T23:34:22.057Z

[tool_use: Glob]

### Assistant | 2026-05-26T23:34:22.717Z

[tool_use: Glob]

### User | 2026-05-26T23:34:27.253Z

[tool_result] state\shared\specs\DOMAIN-GALAXY-DOCTRINE-2026-05-26.md

### User | 2026-05-26T23:34:39.889Z

[tool_result] .claude/
__tests__/
hypermill/
lib/
mcp-server/
plugins/
A2AProtocolEngine.ts  5.7K
AGISafetyContainmentEngine.ts  6.7K
AHPEngine.ts  4.1K
AIAutoUtilizationEngine.ts  21.8K
AICapabilityMaximizerEngine.ts  19.9K
AIDecisionExplanationEngine.ts  42.5K
AIDeepKnowledgeIntegrationEngine.ts  25.3K
AIExtractionReasonerEngine.ts  21.9K
AIFeatureAutoRegistryEngine.ts  23.4K
AIGeneratedCodeApprovalGateEngine
... [+1096 chars truncated]

### User | 2026-05-26T23:34:45.953Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### User | 2026-05-26T23:34:45.977Z

[tool_result] Ripgrep search timed out after 20 seconds. The search may have matched files but did not complete in time. Try searching a more specific path or pattern.

### Assistant | 2026-05-26T23:34:47.676Z

API Error: Server is temporarily limiting requests (not your usage limit) · Rate limited
