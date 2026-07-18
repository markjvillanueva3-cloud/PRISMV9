---
session: claude-859c0089
topic: xray-cad-roundtrip-ocr-handoff
slot: romeo
written_at: 2026-06-01T16:21:39.550Z
machine: DESKTOP-N7MI1VB
family: Claude
session_key: claude-859c0089
status: active
---

# HANDOFF: claude-859c0089
Updated: 2026-06-01T16:21:39.550Z
Family: Claude | Machine: DESKTOP-N7MI1VB | Session: claude-859c0089

## STATE
iter4 landed: OCR->CAD schema contract posted to delta (producer-unblock for dual-training print-axis). Ledger still 0 print rows. Closed-loop proven: qwen3-vl:8b-instruct 100% value-recovery clean+degraded synthetic; real-corpus gap is INPUT QUALITY. Near token cap -> compact.

## RESUME
Loop iter4 DONE this session: posted delta the U-CADTP-ROUNDTRIP-B OCR->CAD schema contract on the bus (dimensioned/GD&T part-spec = parseVisionResponse extraction shape: {units, title_block, dimensions:[{type,nominal_mm,tol_plus_mm?,tol_minus_mm?,ref?}], gdt:[{symbol,tolerance_mm,datum_refs[]}], views?}; print-axis diffs via SPEC-DIFF not geom-diff; nominal_mm always canonical mm). NEXT (iter5): (a) PERSIST that contract to state/shared/specs/U-CADTP-ROUNDTRIP-B-ocr-handoff-schema.md so it survives the bus (durable contract for delta's back-half). (b) cad-fix-training-ledger.jsonl has 0 domain==print rows (delta producer-blocked on print<->print compares) — re-check + wire the tail-consumer when rows appear. (c) /loop iter5/6: build drawing-vs-paperwork PAGE CLASSIFIER (cheap VLM yes/no ~2s) to filter 193 non-drawing pages before full extract (~4x throughput; overnight 60ok/280=24% drawing rate). Standalone (no MCP), reuse scripts/lib/ollama-vision-extract-lib.mjs prompt/body; 2-of-2 scrutiny per file.

## CONTEXT

