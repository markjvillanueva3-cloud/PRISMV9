# OPUS 4.6 CONFIGURATION BASELINE — v13.9
# Generated: 2026-02-14 during P0-MS0b

## Feature Status

| Feature | Status | Implementation |
|---|---|---|
| Adaptive Thinking | WIRED | apiWrapper.ts — budget_tokens per effort tier (max:16K, high:8K, med:4K, low:1K) |
| Effort Tiers | WIRED | effortTiers.ts — type-safe EFFORT_MAP, getEffort() fallback→max, auditEffortMap() |
| Compaction API | CONFIGURED | compaction.ts — hardcoded COMPACTION_INSTRUCTIONS as const |
| Structured Outputs | CREATED | safetyCalcSchema.ts, alarmDecodeSchema.ts, healthSchema.ts — not yet enforced at API call level |
| Prefilling Removed | VERIFIED | No prefilling found in codebase (search: 0 results) |
| Fine-grained Streaming | DEFERRED | Wire in R1+ when large output operations justify it |
| Fast Mode | DEFERRED | Wire after P0 for LOW effort operations only |
| Context Editing | AVAILABLE | Via Compaction API |
| Data Residency | DEFERRED | R4 enterprise feature |
| 1M Context Beta | OPTIONAL | Not enabled — current sessions fit in 200K |

## Utilities Created

| Utility | File | Verified |
|---|---|---|
| atomicWrite | src/utils/atomicWrite.ts | 4 unit tests pass |
| env parsing | src/utils/env.ts | 14 unit tests pass |
| API timeout | src/utils/apiTimeout.ts | 4 unit tests pass |
| Structured logger | src/utils/structuredLogger.ts | Importable, stdout JSON |

## Error Taxonomy

| Error Class | Category | Severity | File |
|---|---|---|---|
| PrismError | any | any | src/errors/PrismError.ts |
| SafetyBlockError | safety | block | src/errors/PrismError.ts |
| DataError | data | retry | src/errors/PrismError.ts |
| SchemaError | schema | block | src/errors/PrismError.ts |
| NetworkError | network | retry | src/errors/PrismError.ts |
| ValidationError | validation | block | src/errors/PrismError.ts |

## Schemas

| Schema | File | Physics Bounds | Cross-Field Validation |
|---|---|---|---|
| Safety Calc | safetyCalcSchema.ts | Vc≤2000, fz≤10, ap≤100, Fc≤100K, n_rpm≤100K, tool_life≤10K | crossFieldPhysics.ts |
| Alarm Decode | alarmDecodeSchema.ts | N/A | N/A |
| Health | healthSchema.ts | N/A | N/A |
| Tolerances | tolerances.ts | speed_feed±15%, force±20%, tool_life±25%, thread±5% | N/A |

## Reference Values

| Count | Source | File |
|---|---|---|
| 50 reference points | Sandvik, Metcut, ASM, ISCAR | src/data/referenceValues.ts |
| 10 materials × 5 operations | Published cutting parameters | Minimum for R2 validation |

## Model Strings

| Variable | Value | Source |
|---|---|---|
| OPUS_MODEL | claude-opus-4-6 | .env + claude_desktop_config.json |
| SONNET_MODEL | claude-sonnet-4-5-20250929 | .env + claude_desktop_config.json |
| HAIKU_MODEL | claude-haiku-4-5-20251001 | .env + claude_desktop_config.json |

## Security Foundation (XA-6)

| Control | Status | Details |
|---|---|---|
| Local-only transport | ACTIVE | HTTP server bound to 127.0.0.1 |
| Registry read-only | ACTIVE | REGISTRY_READONLY=true in .env |
| Input validation | ACTIVE | validateMaterialName() in calcDispatcher |
| Namespace audit | PASS | Only 1 MCP server (prism) configured |


## Skill Size Audit (IA2-5.1 — P0-MS1)

| Metric | Value | Notes |
|---|---|---|
| Skills registered | 126 | Exceeds 119 target |
| Total skill lines | 33740 | From skill_stats_v2 |
| Total skill size | 1111.5KB | 126 skills across 14 categories |
| Largest skill loaded | prism-hook-system: 39KB raw | Well above 0.5K metadata estimate |
| Truncation cap | 20KB per response | responseSlimmer prevents overflow |
| Recommendation | Phase-specific loading preferred | Budget 15-100KB for 3-5 skill loads |
