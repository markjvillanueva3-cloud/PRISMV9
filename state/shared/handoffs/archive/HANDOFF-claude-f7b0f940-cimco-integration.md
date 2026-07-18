---
session: claude-f7b0f940
topic: cimco-integration
slot: echo
written_at: 2026-06-02T20:07:43.616Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-f7b0f940
status: active
---

# HANDOFF: claude-f7b0f940
Updated: 2026-06-02T20:07:43.617Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-f7b0f940

## STATE
## iter10 scoping findings (this tick, read-only)
- byte-equiv gate UNBUILT (gap, not dup). MasterPostByteEquivalenceCI = echo CLAUDE.md doctrine reference only.
- golden Haas corpus: 26 .NC, nested under 'JM DIE/CNC MILL HAAS/<customer>/<job>/*.NC'
- pipeline emit: PostProcessorPipelineEngine.process(input: PipelineInput): Promise<PipelineOutput> @ L761
- normalize rules reasoned out (see resume STEP 1) — conservative-strict, renumber+EOL+trailing-ws only by default

## SPINE-1 prior tick (DONE): CimcoVerificationBridgeEngine + prism_cimco (6 actions), 22/22, 3-of-3 PASS (arm-B fail-open ??/|| fix)

## Operator unblocks: (1) live-app capture for SPINE-2 UIA (2) license tier: headless+REST API? (3) MariaDB creds juliett/hotel

## RESUME
CIMCO integration (/loop /yolo-mode). SPINE-1 SHIPPED (1031ecea70/d7dfb6ded6/91da6be597). NEXT UNIT — fully scoped, build core-first (R13): Haas golden byte-equivalence harness. STEP 1 (pure, testable, safe in any context): scripts/lib/nc-normalize.mjs — strict NC normalizer: strip leading block numbers (^N\d+\s?), normalize CRLF->LF + trailing ws + blank-line runs, PRESERVE case/all addresses(G/M/X/Y/Z/F/S/T)/comments/decimals EXACTLY; spacing-collapse = documented opt, default OFF (conservative-strict per echo refuse 'byte-equivalence-vs-golden'; CIMCO File Compare is too lenient on renumber/spacing). + node --test. STEP 2: harness script enumerating the 26 golden .NC (find 'JM DIE/CNC MILL HAAS' -iname '*.NC') -> normalize both sides -> strict diff. STEP 3 (optional): wire into prism_cimco as cimco_file_compare action (SPINE-1 consumer) OR an echo post-gate. DEDUP CLEARED: MasterPostByteEquivalenceCI is doctrine-only/unbuilt; no existing golden-NC-compare. Emit entry: PostProcessorPipelineEngine.process() L761. THEN SPINE-2 UIA driver (BLOCKED: needs running licensed CIMCO app).

## CONTEXT

