# CONTEXT AUDIT — DA-MS0 | 2026-02-17
# Purpose: Track token costs of framework files to optimize context budget

## File Token Costs (estimated at ~4 bytes/token)

| File | Bytes | Lines | ~Tokens | Load Frequency |
|------|-------|-------|---------|----------------|
| CURRENT_POSITION.md | 92 | 1 | 23 | Every session |
| PRISM_RECOVERY_CARD.md | 11,273 | 179 | 2,818 | Every session |
| CLAUDE.md (root) | 2,712 | 66 | 678 | Auto (CC) |
| CLAUDE.md (engines) | ~1,200 | 36 | 300 | Auto (CC) |
| CLAUDE.md (dispatchers) | ~1,100 | 34 | 275 | Auto (CC) |
| ROADMAP_TRACKER.md | 1,376 | 19 | 344 | Every session |
| **Boot subtotal** | | | **~4,438** | |
| | | | | |
| PRISM_PROTOCOLS_CORE.md | 125,624 | 1,874 | 31,406 | ⚠️ NEVER (too big) |
| PRISM_MASTER_INDEX.md | 33,318 | 519 | 8,330 | On demand |
| SYSTEM_CONTRACT.md | 25,692 | 413 | 6,423 | On demand |
| ROLE_MODEL_EFFORT_MATRIX.md | 27,509 | 566 | 6,877 | On demand |
| | | | | |
| **Phase Docs** | | | | |
| PHASE_DA_DEV_ACCELERATION.md | 85,607 | 1,148 | 21,402 | Current phase |
| PHASE_R1_REGISTRY.md | 83,222 | 1,286 | 20,806 | Next phase |
| PHASE_R2_SAFETY.md | 43,525 | 669 | 10,881 | Future |
| PHASE_R3_CAMPAIGNS.md | 53,753 | 838 | 13,438 | Future |
| PHASE_R4_ENTERPRISE.md | 16,296 | 221 | 4,074 | Future |
| PHASE_R5_VISUAL.md | 18,580 | 254 | 4,645 | Future |
| PHASE_R6_PRODUCTION.md | 21,864 | 278 | 5,466 | Future |
| PHASE_R7_INTELLIGENCE.md | 61,446 | 918 | 15,362 | Future |
| PHASE_R8_EXPERIENCE.md | 134,386 | 776 | 33,596 | Future |
| PHASE_R9_INTEGRATION.md | 92,127 | 511 | 23,032 | Future |
| PHASE_R10_REVOLUTION.md | 184,825 | 828 | 46,206 | Future |
| PHASE_R11_PRODUCT.md | 11,309 | 189 | 2,827 | Future |
| **Phase subtotal** | | | **~201,735** | |

## Analysis

### Boot Cost (every session)
- Recovery Card + Position + Tracker + CLAUDE.md = ~4,438 tokens
- This is efficient. CLAUDE.md replaces most manual boot overhead.

### Current Phase Load (DA)
- Full DA doc: ~21,402 tokens — acceptable for active phase
- With SKIP markers at completed milestones: can reduce to ~15K-18K

### PROTOCOLS_CORE Problem
- 125KB / ~31,406 tokens — MUST be split per Step 0
- Most sessions use <30% of content
- Target: BOOT (~2K) + SAFETY (~2K) + CODING (~1.5K) = ~5.5K total, load as needed

### Phase Doc Sizes (concern)
- R8 (33.6K), R10 (46.2K), R9 (23K) are very large
- R10 at 184KB is the largest single file — will need section loading
- Section index (W1) will address this by enabling partial loads

### Recommendations
1. ✅ Split PROTOCOLS_CORE into 3 tiered files (Step 0 — DO NOW)
2. ✅ Add SKIP markers to phase docs with completed milestones (Step 3)
3. ✅ Build section index for large files (W1)
4. ⚠️ R10 and R8 may need further decomposition in future
5. ✅ Boot overhead is already lean at ~4.4K tokens

## Budget Targets
- Boot framework: <5K tokens (currently ~4.4K ✓)
- Active phase doc: <15K tokens with skip markers
- Total framework per session: <25K tokens
- Work context budget: remaining ~75K+ tokens for actual work
