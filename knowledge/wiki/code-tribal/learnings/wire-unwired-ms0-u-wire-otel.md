# WIRE-UNWIRED-MS0/U-WIRE-OTEL — [MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-OTEL: wire OpenTelemetryTracingEngine read-only into prism_dev (7 actions)

**Commit:** `f456add17117` · **By:** markjvillanueva3-cloud · **At:** 2026-05-16T23:59:38-05:00
**Tags:** wire-unwired-ms0, u-wire-otel, auto-distilled

## Subject
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-OTEL: wire OpenTelemetryTracingEngine read-only into prism_dev (7 actions)

## Body
```
[MAIN] [WIRE-UNWIRED-MS0]/U-WIRE-OTEL: wire OpenTelemetryTracingEngine read-only into prism_dev (7 actions)

Pure dev-observability surface — wires W3C traceparent parse/encode +
sampling decision + 4 read-only telemetry queries. Span-lifecycle
mutation methods (configure/startSpan/addEvent/setAttributes/setStatus/
endSpan/recordException/addManufacturingAttributes/flush/clear/trace)
DEFERRED (U-WIRE-OTEL-WRITE) — they mutate the in-flight distributed-
tracing graph which is load-bearing for observability; an LLM-driven
write could desync an active trace.

Actions:
  - otel_get_config            → getConfig()
  - otel_get_stats             → getStats() (8 TracerStats fields)
  - otel_active_span_count     → getActiveSpanCount()
  - otel_completed_spans       → getCompletedSpans() (limit-capped)
  - otel_extract_traceparent   → extract({traceparent, tracestate?})
                                  Returns {parsed:false} OR
                                  {parsed:true, context:SpanContext}
                                  isRemote=true on extracted ctx
                                  (came from upstream system).
  - otel_inject_traceparent    → inject(SpanContext) → {traceparent, tracestate?}
                                  isRemote=false on injected ctx
                                  (locally-originated header).
  - otel_should_sample         → shouldSample(parent?, forceSample?)

DoS guards in schema:
  - otel_completed_spans.limit ≤ 10000 (default 100)
  - otel_inject_traceparent.traceFlags ∈ [0, 255]
  - All string params min length 1

Test suite: 32 cases (10 schema + 2 config + 2 stats + 2 active + 3
completed + 4 extract + 3 inject + 3 sample + 3 error) including:
  - W3C round-trip: inject∘extract preserves the canonical OTel spec
    example "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01"
  - All-zero trace/span ids rejected per spec
  - tracestate preserved through extract
  - Sampling reason ∈ {head_sample, tail_sample_error, forced,
    parent_based, rate_limited} validated
  - Monotone-counter cross-check (wire ≥ engine-direct accounts for
    concurrent suite ticks against the shared singleton)

Pre-wire gate: src/__tests__/OpenTelemetryTracingEngine.test.ts 46/46
PASS unmodified.

Session running total: 11 backend-dev wires / 46 actions / 11 engines.

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

## Files touched (4)
- .../src/__tests__/dispatcher.otelTracing.test.ts   | 332 +++++++++++++++++++++
- mcp-server/src/schemas/devActionSchemas.ts         |  46 +++
- mcp-server/src/tools/dispatchers/devDispatcher.ts  |  73 ++++-
- 3 files changed, 450 insertions(+), 1 deletion(-)


## Verification
**Scrutiny ledger**: arms A✗ B✗ C✗ for session 

## Cross-references
- Full commit: `git -C H:/prism show f456add17117`
- Milestone envelope: `mcp-server/data/milestones/WIRE-UNWIRED-MS0.json`

---
_Auto-distilled by `scripts/distill-session-learnings.mjs` per [[feedback_auto_close_out]] / SYSTEM-VIZ-BRAIN-MS0/U-P1-POST-SHIP-DISTILL._