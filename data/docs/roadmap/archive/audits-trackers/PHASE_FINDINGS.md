# PHASE FINDINGS — P0 Activation

## CRITICAL FINDINGS

1. Safety validator (prism_validate:safety) does not consume flat params from preceding calc steps. Returns S(x)=0.225 even with all params provided. Requires structured material object format. FIX: R1 — wire validator to accept calc chain output format.

2. Thread registry data lookup fails for standard ISO designations (M8x1.25, M10x1.5). Dispatcher responds but returns "Could not find thread". FIX: R1 — verify thread data format in ThreadDispatcher.ts matches ISO designation format.

3. Alarm decode dispatcher has param name mismatch. Neither "controller"/"alarm_code" nor "manufacturer"/"code" works. Returns "undefined" for alarm lookup key. FIX: R1 — audit alarm_decode handler param extraction.

## MEDIUM FINDINGS

4. Compliance engine method mismatch: list_templates action calls complianceEngine.listProvisioned() which doesn't exist. Likely renamed. FIX: R1 — check ComplianceEngine method names.

5. Build produces 14 non-blocking warnings: description/count mismatches in 5 dispatchers + 5 duplicate function definitions across dispatchers. Not blocking but indicates copy-paste technical debt.

6. base.ts (243 lines) in registries/ is dead code — unused after legacy lowercase registry deletion.

7. prism_data:material_get requires "identifier" param, not "material". Undocumented API contract.

## LOW FINDINGS

8. GSD v22.0 references "119 skills" but system now has 126 — GSD needs a sync.
9. Session state still shows "F8-COMPLETE" phase — not updated to reflect P0 work.
10. ATCS materials-db-verified task shows 41.7% complete — stale from prior session.

## SECURITY FINDINGS (ALL RESOLVED)

11. HTTP server was binding to 0.0.0.0 → FIXED: 127.0.0.1
12. No input validation on material name params → FIXED: validateMaterialName()
13. No registry read-only flag → FIXED: REGISTRY_READONLY=true
