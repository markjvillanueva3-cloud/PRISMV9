---
schema_version: 1.0.0
kind: consensus_run
prompt_hash: 5c6ec0da6150d731157cecdcf0b6af4ed90bdb44da67bef7d6feee0c2db5e874
sha8: 5c6ec0da
ts: 2026-06-25T20:49:40.456Z
task_type: auto-userprompt
source_session: 81ed1fc4-0c66-415a-8e1d-15977d41e14d
mode: compare
recommendation: escalate
agreement_score: 0.175
success_count: 2
total_latency_ms: 23267
model_voters: ["qwen2.5-coder:32b"]
mean_factuality: null
tags: [consensus, auto-userprompt, escalate]
---

# Consensus Run `5c6ec0da`

**Recommendation:** `escalate` · **Agreement:** `0.175` · **Voters:** `qwen2.5-coder:32b`

## Prompt

```
In H:/prism/mcp-server/web/src/pages/SalesPipelinePage.tsx, the `stageTone` map (around line 27-28) keys on an OLD/wrong pipeline vocabulary (prospect/qualification/proposal/negotiation/closed_won/closed_lost), but the backend now sends ProspectStatus values (cold/researched/first_contact/engaged/quoted) via the new /api/v1/erp/pipeline-stages route (prospect_pipeline_stages action, shipped commit 49bc4ed13a). Because no keys match, every stage pill falls to the default 'slate' tone. Re-key stageTone to the actual ProspectStatus vocabulary so each funnel stage gets a distinct color (e.g. cold=slate, researched=blue, first_contact=cyan, engaged=amber, quoted=emerald). Also consider rendering conversion_rate as "—" instead of "0%" when there are no closed deals (pipelineForecast returns 0 for both cases). This is FE-only polish in the quebec/frontend domain; the backend adapters are correct and live. Verify with the preview server if available.
```

## Consensus answer

```
**Final Answer:** Update `stageTone` map keys to ProspectStatus vocabulary (cold, researched, first_contact, engaged, quoted) with corresponding colors. Modify conversion_rate rendering to show "—" when both closed_won and closed_lost are 0.
```

## Per-model responses

### qwen2.5-coder:32b (ollama) — ok

- latency: 13638ms · tokens: n/a

```
**Final Answer:** Update `stageTone` map keys to ProspectStatus vocabulary (cold, researched, first_contact, engaged, quoted) with corresponding colors. Modify conversion_rate rendering to show "—" when both closed_won and closed_lost are 0.
```

### gpt-oss:20b (ollama) — ok

- latency: 6917ms · tokens: n/a

```
**SalesPipelinePage.tsx – key changes**

```tsx
// ~line 24‑30 – re‑key the stage tone map to match the new ProspectStatus values
const stageTone: Record<string, string> = {
  cold:          'slate',   // ❄️
  researched:    'blue',    // 🔵
  first_contact: 'cyan',    // 🟦
  engaged:       'amber',   // 🧡
  quoted:        'emerald', // 💚
};
```

```tsx
// ~line 78‑85 – show a dash when there are no closed deals (conversion_rate === 0)
const conversionRate = pipelineForecast?.conversion_rate ?? 0;
const displayConversionRate =
  conversionRate > 0 ? `${conversionRate}%` : '—';

// … later in the JSX …
<span className="text-sm text-gray-500">
  {displayConversionRate}
</span>
```

**What changed**

| Old | New |
|-----|-----|
| `stageTone` keys: `prospect`, `qualification`, `proposal`, `negotiation`, `closed_won`, `closed_lost` | `cold`, `researched`, `first_contact`, `engaged`, `quoted` |
| Color mapping: all defaulted to `'slate'` (because no key matched) | Distinct colors per stage (`slate`, `blue`, `cyan`, `amber`, `emerald`) |
| Conversion‑rate display: `"0%"` when there are no closed deals | Dash (`"—"`) when `conversion_rate === 0` |

These edits are purely front‑end; the backend already returns the correct ProspectStatus values via `/api/v1/erp/pipeline-stages`. After committing, run the preview server to confirm each funnel stage pill now has its intended color and that an empty pipeline shows “—” instead of “0%”.
```

## Backlinks

- task_type: [[task-type-auto-userprompt]]
- recommendation: [[consensus-escalate]]
- voter: [[model-qwen2-5-coder-32b]]
