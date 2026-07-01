# /quote — Universal Job Quotation

Generate quotes for manufacturing jobs with accurate cost estimation, cycle time prediction, and competitive pricing.

## Usage
```
/quote [job-spec] [--format detailed|summary|customer]
```

## MCP Action
```
prism_business:quote_generate
```

## Advisor Strategy (`advisor_20260418`)
- **Executor**: Sonnet 4.6 (drives quotation pipeline)
- **Advisor**: Opus 4.6, `max_uses: 3`, `caching: {"type": "ephemeral", "ttl": "5m"}`

## What it does
1. Parse job specification (part, material, quantity, tolerances)
2. Estimate cycle time via CycleTimeEngine
3. Calculate material cost via MaterialCostEngine
4. Estimate tooling cost via ToolLifeCostEngine
5. Add setup, inspection, secondary ops
6. Apply shop rates and margins
7. Generate customer-ready quote

## Pricing Components
- **Material**: Raw stock + waste + handling
- **Machining**: Cycle time × machine rate
- **Tooling**: Tool wear + special tooling
- **Setup**: First article + batch setup
- **Secondary**: Heat treat, plating, assembly
- **Overhead**: Shop rate allocation

## Output Formats
- **detailed**: Full cost breakdown
- **summary**: Single-page summary
- **customer**: Customer-facing quote PDF

## Related
- `/estimate` — Quick estimation
- `/quote-job` — Legacy quote command
- `/quote-to-ship` — Full quote-to-ship pipeline
