/**
 * InventoryHookDefinitions.test.ts — ACP-MS0/P0-U02
 *
 * Real-behavior tests for scripts/inventory-hook-definitions.mjs.
 * The script ships with --self-test (78 inline cases); this file exists so
 * vitest runs them in CI and so the public exports get coverage outside the
 * CLI smoke path.
 *
 * Coverage floor enforced:
 *   - Happy path  ............ mapEventToStage, classifyHook,
 *                              isInfrastructureHook, mdCellEscape,
 *                              extractPlannedHooks, mergePlannedHooks,
 *                              buildHookRecord, groupByStage, renderMarkdown
 *   - Failure modes (≥3) ..... null input, missing events, malformed envelope
 *   - Adversarial (≥2) ....... non-string event names, planned input mutation,
 *                              status-as-object
 *   - Spanning configs (≥3) .. 3 hook-event configs the live registry uses:
 *                              (a) single-event single-layer, (b) dual-layer
 *                              same event, (c) multi-event fan-out with
 *                              precedence selection
 *   - Subprocess ............. real run of the --self-test entry point
 *
 * Companion: scripts/inventory-hook-definitions.mjs (78 inline tests — vitest
 * invokes them via subprocess in the last describe block).
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import { spawnSync } from "node:child_process";

import {
  mapEventToStage,
  classifyHook,
  isInfrastructureHook,
  mdCellEscape,
  extractPlannedHooks,
  mergePlannedHooks,
  buildHookRecord,
  groupByStage,
  renderMarkdown,
  inferPlannedStage,
  STAGES_DISPLAY_ORDER,
  STAGE_DESCRIPTIONS,
} from "../../../scripts/inventory-hook-definitions.mjs";

// ─── mapEventToStage ─────────────────────────────────────────────────────────

describe("mapEventToStage", () => {
  it("SessionStart → session-bootstrap", () => {
    expect(mapEventToStage("SessionStart")).toBe("session-bootstrap");
  });
  it("UserPromptSubmit → prompt-ingestion", () => {
    expect(mapEventToStage("UserPromptSubmit")).toBe("prompt-ingestion");
  });
  it("PreToolUse → pre-action-gate", () => {
    expect(mapEventToStage("PreToolUse")).toBe("pre-action-gate");
  });
  it("PostToolUse → post-action-observe", () => {
    expect(mapEventToStage("PostToolUse")).toBe("post-action-observe");
  });
  it("SubagentStart → subagent-lifecycle", () => {
    expect(mapEventToStage("SubagentStart")).toBe("subagent-lifecycle");
  });
  it("SubagentStop → subagent-lifecycle", () => {
    expect(mapEventToStage("SubagentStop")).toBe("subagent-lifecycle");
  });
  it("Stop → session-teardown", () => {
    expect(mapEventToStage("Stop")).toBe("session-teardown");
  });
  it("PreCompact → context-handoff", () => {
    expect(mapEventToStage("PreCompact")).toBe("context-handoff");
  });
  it("unknown event → unknown", () => {
    expect(mapEventToStage("BogusEvent")).toBe("unknown");
  });
  it("undefined → unknown", () => {
    expect(mapEventToStage(undefined as unknown as string)).toBe("unknown");
  });
  it("every value in STAGES_DISPLAY_ORDER has a description", () => {
    for (const s of STAGES_DISPLAY_ORDER) {
      expect(typeof STAGE_DESCRIPTIONS[s as keyof typeof STAGE_DESCRIPTIONS]).toBe("string");
      expect((STAGE_DESCRIPTIONS[s as keyof typeof STAGE_DESCRIPTIONS] as string).length).toBeGreaterThan(0);
    }
  });

  it("STAGE_DESCRIPTIONS keys are a subset of STAGES_DISPLAY_ORDER (no dead descriptions)", () => {
    for (const k of Object.keys(STAGE_DESCRIPTIONS)) {
      expect(STAGES_DISPLAY_ORDER).toContain(k);
    }
  });

  it("P0-1: 8 distinct events map to exactly 7 distinct stages (SubagentStart/Stop share)", () => {
    // A regression that aliased two events would silently collapse stages —
    // each per-event test would still pass on its own. This invariant catches it.
    const allEvents = ["SessionStart", "UserPromptSubmit", "PreToolUse", "PostToolUse",
                       "SubagentStart", "SubagentStop", "Stop", "PreCompact"];
    const distinctStages = new Set(allEvents.map(mapEventToStage));
    expect(distinctStages.size).toBe(7);
    expect(distinctStages.has("session-bootstrap")).toBe(true);
    expect(distinctStages.has("prompt-ingestion")).toBe(true);
    expect(distinctStages.has("pre-action-gate")).toBe(true);
    expect(distinctStages.has("post-action-observe")).toBe(true);
    expect(distinctStages.has("subagent-lifecycle")).toBe(true);
    expect(distinctStages.has("session-teardown")).toBe(true);
    expect(distinctStages.has("context-handoff")).toBe(true);
  });
});

// ─── inferPlannedStage (P1-2 — directly exercised, not just via extractPlannedHooks) ───────────

describe("inferPlannedStage", () => {
  it("'*-gate' → pre-action-gate (canonical ACP milestone gate pattern)", () => {
    expect(inferPlannedStage("acp-ms0-gate")).toBe("pre-action-gate");
    expect(inferPlannedStage("ccm-validate-gate")).toBe("pre-action-gate");
  });

  it("'*-precompact' → context-handoff (PreCompact lifecycle)", () => {
    expect(inferPlannedStage("foo-precompact")).toBe("context-handoff");
    expect(inferPlannedStage("precompact-handler")).toBe("context-handoff");
  });

  it("'*-stop' / '*teardown' → session-teardown (Stop hook lifecycle)", () => {
    expect(inferPlannedStage("stop-on-failing-tests")).toBe("session-teardown");
    expect(inferPlannedStage("teardown-cleanup")).toBe("session-teardown");
  });

  it("'subagent-*' → subagent-lifecycle", () => {
    expect(inferPlannedStage("subagent-verify")).toBe("subagent-lifecycle");
    expect(inferPlannedStage("subagent-start-context")).toBe("subagent-lifecycle");
  });

  it("'posttool-*' / 'on-edit' / 'on-write' → post-action-observe", () => {
    expect(inferPlannedStage("posttool-bar")).toBe("post-action-observe");
    expect(inferPlannedStage("foo-on-write")).toBe("post-action-observe");
    expect(inferPlannedStage("foo-on-edit")).toBe("post-action-observe");
  });

  it("'prompt-ingest-*' / '*-userpromptsubmit-*' → prompt-ingestion", () => {
    expect(inferPlannedStage("prompt-ingest-foo")).toBe("prompt-ingestion");
  });

  it("'*-guard' / 'enforce-*' / 'pre-*' → pre-action-gate fallback", () => {
    expect(inferPlannedStage("safety-guard")).toBe("pre-action-gate");
    expect(inferPlannedStage("enforce-role")).toBe("pre-action-gate");
    expect(inferPlannedStage("pre-flight")).toBe("pre-action-gate");
  });

  it("unrecognized name → unknown", () => {
    expect(inferPlannedStage("random-thing")).toBe("unknown");
  });

  it("non-string input → unknown (defensive)", () => {
    expect(inferPlannedStage(null as unknown as string)).toBe("unknown");
    expect(inferPlannedStage(undefined as unknown as string)).toBe("unknown");
  });
});

// ─── classifyHook ────────────────────────────────────────────────────────────

describe("classifyHook", () => {
  it("happy: single PreToolUse event → pre-action-gate", () => {
    const r = classifyHook({ id: "h", events: [{ event: "PreToolUse", matcher: "Edit" }] });
    expect(r.primary_stage).toBe("pre-action-gate");
    expect(r.all_stages).toEqual(["pre-action-gate"]);
    expect(r.event_count).toBe(1);
  });

  it("spanning A: dual-layer user+project same event → 1 stage, event_count=2", () => {
    const r = classifyHook({
      id: "h",
      events: [
        { event: "PreToolUse", layer: "user" },
        { event: "PreToolUse", layer: "project" },
      ],
    });
    expect(r.all_stages.length).toBe(1);
    expect(r.event_count).toBe(2);
  });

  it("spanning B: multi-event fan-out → all stages captured", () => {
    const r = classifyHook({
      id: "h",
      events: [{ event: "PreToolUse" }, { event: "PostToolUse" }],
    });
    expect(r.all_stages).toContain("pre-action-gate");
    expect(r.all_stages).toContain("post-action-observe");
  });

  it("spanning C: PRECEDENCE — PreToolUse beats PostToolUse for primary_stage even when listed second", () => {
    // P1.1 regression — `auto-lint-post-edit`-style fan-out
    const r = classifyHook({
      id: "auto-lint-post-edit",
      events: [
        { event: "PostToolUse" },
        { event: "PostToolUse" },
        { event: "PreToolUse" },
        { event: "PreToolUse" },
      ],
    });
    expect(r.primary_stage).toBe("pre-action-gate");
    expect(r.all_stages).toContain("post-action-observe");
  });

  it("precedence: Stop beats SessionStart", () => {
    const r = classifyHook({
      id: "h",
      events: [{ event: "SessionStart" }, { event: "Stop" }],
    });
    expect(r.primary_stage).toBe("session-teardown");
  });

  it("precedence: PreCompact beats PostToolUse", () => {
    const r = classifyHook({
      id: "h",
      events: [{ event: "PostToolUse" }, { event: "PreCompact" }],
    });
    expect(r.primary_stage).toBe("context-handoff");
  });

  it("orphan: empty events on regular hook → unknown", () => {
    const r = classifyHook({ id: "orphan-hook", events: [] });
    expect(r.primary_stage).toBe("unknown");
  });

  it("infra: _envelope shim with no events → infrastructure", () => {
    const r = classifyHook({ id: "_envelope", events: [] });
    expect(r.primary_stage).toBe("infrastructure");
  });

  it("infra: *-bundle host with no events → infrastructure", () => {
    const r = classifyHook({ id: "edit-bundle", events: [] });
    expect(r.primary_stage).toBe("infrastructure");
  });

  it("failure mode 1: null input → unknown, no throw", () => {
    expect(() => classifyHook(null)).not.toThrow();
    expect(classifyHook(null).primary_stage).toBe("unknown");
  });

  it("failure mode 2: missing events field → unknown", () => {
    expect(classifyHook({ id: "x" }).primary_stage).toBe("unknown");
  });

  it("failure mode 3: malformed event entries (null in array) → skipped", () => {
    const r = classifyHook({
      id: "x",
      events: [null, undefined, { event: "Stop" }] as never[],
    });
    expect(r.primary_stage).toBe("session-teardown");
  });

  it("adversarial: non-string event name in entry → skipped", () => {
    const r = classifyHook({
      id: "x",
      events: [{ event: 42 as unknown as string }, { event: "PreToolUse" }],
    });
    expect(r.primary_stage).toBe("pre-action-gate");
  });
});

// ─── isInfrastructureHook ────────────────────────────────────────────────────

describe("isInfrastructureHook", () => {
  it("_-prefix hook ID → true", () => {
    expect(isInfrastructureHook({ id: "_envelope" })).toBe(true);
  });

  it("-bundle suffix hook ID → true", () => {
    expect(isInfrastructureHook({ id: "posttool-edit-bundle" })).toBe(true);
  });

  it("viaBundle event marker → true", () => {
    expect(
      isInfrastructureHook({
        id: "auto-lint",
        events: [{ event: "PostToolUse", viaBundle: "posttool-edit-bundle" }],
      })
    ).toBe(true);
  });

  it("plain hook with direct event → false", () => {
    expect(
      isInfrastructureHook({
        id: "agent-boundary-guard",
        events: [{ event: "PreToolUse" }],
      })
    ).toBe(false);
  });

  it("null input → false (no throw)", () => {
    expect(() => isInfrastructureHook(null)).not.toThrow();
    expect(isInfrastructureHook(null)).toBe(false);
  });
});

// ─── mdCellEscape ────────────────────────────────────────────────────────────

describe("mdCellEscape", () => {
  it("escapes pipe", () => {
    expect(mdCellEscape("foo | bar")).toBe("foo \\| bar");
  });
  it("escapes backtick", () => {
    expect(mdCellEscape("has `tick`")).toBe("has \\`tick\\`");
  });
  it("collapses newlines into spaces", () => {
    expect(mdCellEscape("line\nbreak")).toBe("line break");
  });
  it("null → empty string", () => {
    expect(mdCellEscape(null)).toBe("");
  });
  it("undefined → empty string", () => {
    expect(mdCellEscape(undefined)).toBe("");
  });
  it("number is stringified", () => {
    expect(mdCellEscape(42 as unknown as string)).toBe("42");
  });
});

// ─── extractPlannedHooks ─────────────────────────────────────────────────────

describe("extractPlannedHooks", () => {
  it("happy: forge_triple + new_hooks merged, deduplicated by name", () => {
    const planned = extractPlannedHooks([
      {
        id: "A-MS0",
        envelope: {
          forge_triple: { protective_hook: "a-ms0-gate" },
          feature_cascade: { new_hooks: ["a-ms0-gate", "extra"] },
          status: "not_started",
        },
      },
    ]);
    expect(planned.length).toBe(2);
    expect(planned.map((p: { id: string }) => p.id).sort()).toEqual(["a-ms0-gate", "extra"]);
  });

  it("cross-milestone: same hook declared in 2 milestones → 1 record with 2 declared_by entries (P0-3: status preserved)", () => {
    const planned = extractPlannedHooks([
      { id: "A", envelope: { forge_triple: { protective_hook: "x-gate" }, status: "not_started" } },
      { id: "B", envelope: { forge_triple: { protective_hook: "x-gate" }, status: "in_progress" } },
    ]);
    expect(planned.length).toBe(1);
    expect(planned[0].declared_by.length).toBe(2);
    expect(
      planned[0].declared_by.map((d: { milestone: string }) => d.milestone).sort()
    ).toEqual(["A", "B"]);
    // P0-3: both statuses must survive merge — a future dedup that picks one
    // (e.g. preferring `in_progress` over `not_started`) would silently lose info
    expect(
      planned[0].declared_by.map((d: { status: string }) => d.status).sort()
    ).toEqual(["in_progress", "not_started"]);
  });

  it("adversarial: object-shape new_hooks entry (P1.3 — SCENARIO-TEST-MS0 form) is accepted", () => {
    const planned = extractPlannedHooks([
      {
        id: "ST",
        envelope: {
          feature_cascade: {
            new_hooks: [
              { name: "obj-hook", file: ".claude/hooks/obj-hook.mjs", built_in: "U-X1" },
              { hook: "obj-hook-alt" },
              { id: "obj-hook-by-id" },
              "string-form",
            ],
          },
          status: "not_started",
        },
      },
    ]);
    const ids = planned.map((p: { id: string }) => p.id).sort();
    expect(ids).toEqual(["obj-hook", "obj-hook-alt", "obj-hook-by-id", "string-form"]);
  });

  it("rejects null and empty-object entries silently", () => {
    const planned = extractPlannedHooks([
      {
        id: "ST",
        envelope: {
          feature_cascade: { new_hooks: [null, undefined, {}, { name: "" }, "valid"] as never[] },
        },
      },
    ]);
    expect(planned.length).toBe(1);
    expect(planned[0].id).toBe("valid");
  });

  it("rejects whitespace-only protective_hook (P2-B)", () => {
    const planned = extractPlannedHooks([
      { id: "X", envelope: { forge_triple: { protective_hook: "   " }, status: "in_progress" } },
    ]);
    expect(planned.length).toBe(0);
  });

  it("non-string milestone status coerced to 'unknown' (P2.4)", () => {
    const planned = extractPlannedHooks([
      {
        id: "X",
        envelope: {
          forge_triple: { protective_hook: "test-gate" },
          status: { current: "weird" } as unknown as string,
        },
      },
    ]);
    expect(planned[0].declared_by[0].status).toBe("unknown");
  });

  it("failure mode: empty input array → []", () => {
    expect(extractPlannedHooks([])).toEqual([]);
  });

  it("failure mode: malformed envelope (null) skipped", () => {
    expect(extractPlannedHooks([{ id: "X", envelope: null }])).toEqual([]);
  });
});

// ─── mergePlannedHooks ───────────────────────────────────────────────────────

describe("mergePlannedHooks", () => {
  it("planned hook matching existing ID → declared_by populated, removed from planned_only", () => {
    const existing = [
      buildHookRecord({
        id: "live",
        file: ".claude/hooks/live.mjs",
        wired: true,
        events: [{ event: "Stop" }],
      }),
    ];
    const planned = [
      {
        kind: "planned",
        id: "live",
        declared_by: [{ milestone: "M1", status: "completed" }],
        primary_stage: "session-teardown",
        all_stages: ["session-teardown"],
        events: [],
        wired: false,
        disabled: false,
        description: "",
        description_inferred: true,
        tier: null,
        file: null,
        registration_count: 0,
        size_bytes: 0,
        lines: 0,
      },
    ];
    const merged = mergePlannedHooks(existing, planned);
    expect(merged.declared_existing_count).toBe(1);
    expect(merged.planned_only.length).toBe(0);
    expect(merged.existing[0].declared_by[0].milestone).toBe("M1");
  });

  it("planned hook not matching any existing ID → stays in planned_only", () => {
    const merged = mergePlannedHooks([], [
      {
        kind: "planned",
        id: "future",
        declared_by: [{ milestone: "M2", status: "not_started" }],
        primary_stage: "pre-action-gate",
        all_stages: ["pre-action-gate"],
        events: [],
        wired: false,
        disabled: false,
        description: "",
        description_inferred: true,
        tier: null,
        file: null,
        registration_count: 0,
        size_bytes: 0,
        lines: 0,
      },
    ]);
    expect(merged.planned_only.length).toBe(1);
    expect(merged.planned_only[0].id).toBe("future");
  });

  it("P1.5: declared_by is a copy — mutating planned input does not leak into existing record", () => {
    const existing = [buildHookRecord({ id: "live", file: "f", wired: true, events: [{ event: "Stop" }] })];
    const plannedDeclaredBy = [{ milestone: "M1", status: "completed" }];
    const planned = [
      {
        kind: "planned", id: "live", declared_by: plannedDeclaredBy,
        primary_stage: "session-teardown", all_stages: ["session-teardown"], events: [],
        wired: false, disabled: false, description: "", description_inferred: true, tier: null,
        file: null, registration_count: 0, size_bytes: 0, lines: 0,
      },
    ];
    const merged = mergePlannedHooks(existing, planned);
    plannedDeclaredBy.push({ milestone: "POISON", status: "x" });
    expect(merged.existing[0].declared_by.length).toBe(1);
    expect(merged.existing[0].declared_by[0].milestone).toBe("M1");
  });
});

// ─── buildHookRecord ─────────────────────────────────────────────────────────

describe("buildHookRecord", () => {
  it("kind=existing, dedup event names across layers, primary_stage correct", () => {
    const r = buildHookRecord({
      id: "h",
      file: ".claude/hooks/h.mjs",
      wired: true,
      disabled: false,
      events: [
        { event: "PreToolUse", layer: "user" },
        { event: "PreToolUse", layer: "project" },
      ],
      description: "test",
      descriptionInferred: false,
      tier: "T1",
      sizeBytes: 100,
      lines: 50,
    });
    expect(r.kind).toBe("existing");
    expect(r.events).toEqual(["PreToolUse"]);
    expect(r.registration_count).toBe(2);
    expect(r.primary_stage).toBe("pre-action-gate");
    expect(r.declared_by).toBeNull();
  });

  it("orphan hook (zero events) → primary_stage=unknown", () => {
    const r = buildHookRecord({
      id: "orphan",
      file: ".claude/hooks/orphan.mjs",
      wired: false,
      events: [],
    });
    expect(r.primary_stage).toBe("unknown");
    expect(r.wired).toBe(false);
  });

  it("infrastructure: _envelope shim → primary_stage=infrastructure", () => {
    const r = buildHookRecord({
      id: "_envelope",
      file: ".claude/hooks/_envelope.mjs",
      wired: false,
      events: [],
    });
    expect(r.primary_stage).toBe("infrastructure");
  });
});

// ─── groupByStage ────────────────────────────────────────────────────────────

describe("groupByStage", () => {
  it("groups records by primary_stage; every stage key exists", () => {
    const recs = [
      { id: "a", primary_stage: "pre-action-gate", kind: "existing" },
      { id: "b", primary_stage: "session-teardown", kind: "existing" },
    ];
    const g = groupByStage(recs);
    expect(g["pre-action-gate"].length).toBe(1);
    expect(g["session-teardown"].length).toBe(1);
    for (const s of STAGES_DISPLAY_ORDER) {
      expect(Array.isArray(g[s])).toBe(true);
    }
  });

  it("sorts within each stage by id ascending", () => {
    const g = groupByStage([
      { id: "zulu", primary_stage: "pre-action-gate", kind: "existing" },
      { id: "alpha", primary_stage: "pre-action-gate", kind: "existing" },
      { id: "mike", primary_stage: "pre-action-gate", kind: "planned" },
    ]);
    expect(g["pre-action-gate"].map((r: { id: string }) => r.id)).toEqual(["alpha", "mike", "zulu"]);
  });
});

// ─── renderMarkdown ──────────────────────────────────────────────────────────

describe("renderMarkdown", () => {
  it("emits title, stage totals, per-stage tables, expected counts", () => {
    const recs = [
      {
        kind: "existing", id: "alpha", file: ".claude/hooks/alpha.mjs", wired: true, disabled: false,
        description: "alpha hook", tier: "T0", events: ["PreToolUse"], primary_stage: "pre-action-gate",
        all_stages: ["pre-action-gate"], registration_count: 1, size_bytes: 100, lines: 10,
        declared_by: null, description_inferred: false,
      },
    ];
    const md = renderMarkdown(recs, {
      existing_total: 1, existing_wired: 1, existing_orphaned: 0, existing_disabled: 0,
      planned_only_total: 0, declared_existing_count: 0,
    }, "2026-01-01T00:00:00Z");
    expect(md).toContain("# Hook Definitions Inventory");
    expect(md).toContain("## Stage totals");
    expect(md).toContain("`alpha`");
    expect(md).toContain("wired: 1");
  });

  it("P1-A: pipes inside description are escaped (no table-break)", () => {
    const recs = [
      {
        kind: "existing", id: "x", file: "f", wired: true, disabled: false,
        description: "foo | bar", tier: "T1", events: ["PreToolUse"],
        primary_stage: "pre-action-gate", all_stages: ["pre-action-gate"],
        registration_count: 1, size_bytes: 0, lines: 0, declared_by: null,
        description_inferred: false,
      },
    ];
    const md = renderMarkdown(recs, {
      existing_total: 1, existing_wired: 1, existing_orphaned: 0, existing_disabled: 0,
      planned_only_total: 0, declared_existing_count: 0,
    }, "2026-01-01T00:00:00Z");
    expect(md).toContain("foo \\| bar");
    expect(md).not.toContain("foo | bar");
  });

  it("planned and existing rows render with different kind labels", () => {
    const recs = [
      {
        kind: "existing", id: "ex", file: "f", wired: true, disabled: false,
        description: "", tier: null, events: ["Stop"], primary_stage: "session-teardown",
        all_stages: ["session-teardown"], registration_count: 1, size_bytes: 0, lines: 0,
        declared_by: null, description_inferred: false,
      },
      {
        kind: "planned", id: "pl", file: null, wired: false, disabled: false,
        description: "", tier: null, events: [], primary_stage: "pre-action-gate",
        all_stages: ["pre-action-gate"], registration_count: 0, size_bytes: 0, lines: 0,
        declared_by: [{ milestone: "M1", status: "not_started" }], description_inferred: true,
      },
    ];
    const md = renderMarkdown(recs, {
      existing_total: 1, existing_wired: 1, existing_orphaned: 0, existing_disabled: 0,
      planned_only_total: 1, declared_existing_count: 0,
    }, "2026-01-01T00:00:00Z");
    expect(md).toContain("| existing |");
    expect(md).toContain("| planned |");
  });
});

// ─── End-to-end: real-data smoke + self-test subprocess ──────────────────────

describe("end-to-end against real fleet data", () => {
  const scriptPath = path.resolve(__dirname, "../../../scripts/inventory-hook-definitions.mjs");
  const registryPath = path.resolve(__dirname, "../../../state/shared/HOOK_REGISTRY.json");

  it("runs inline --self-test successfully (78 assertions)", () => {
    const result = spawnSync(process.execPath, [scriptPath, "--self-test"], {
      encoding: "utf8",
      timeout: 20_000,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/self-test: \d+ passed, 0 failed/);
  });

  it("--no-write preview against real HOOK_REGISTRY.json + milestones reports plausible counts", () => {
    if (!fs.existsSync(registryPath)) {
      // CI/sandbox might not have the registry — skip cleanly.
      return;
    }
    const result = spawnSync(process.execPath, [scriptPath, "--no-write"], {
      encoding: "utf8",
      timeout: 30_000,
      maxBuffer: 16 * 1024 * 1024,
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/existing=\d+ {2}planned=\d+/);
    const match = result.stdout.match(/existing=(\d+)/);
    expect(match).not.toBeNull();
    if (match) {
      // P1-5 fix: structural floor (≥10) rather than brittle 100 — peer chats
      // consolidating hooks could legitimately drop count below 100.
      expect(parseInt(match[1], 10)).toBeGreaterThanOrEqual(10);
    }
  });

  it("--json output parses as schemaVersion-1 inventory shape with real counts (P0-2: pins SCENARIO-TEST-MS0)", () => {
    if (!fs.existsSync(registryPath)) {
      return;
    }
    const result = spawnSync(process.execPath, [scriptPath, "--json"], {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      timeout: 30_000,
    });
    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.stages).toEqual(STAGES_DISPLAY_ORDER);
    expect(typeof parsed.summary.existing_total).toBe("number");
    expect(parsed.summary.existing_total).toBeGreaterThanOrEqual(10);
    expect(typeof parsed.summary.existing_wired).toBe("number");
    expect(parsed.summary.existing_wired).toBeGreaterThanOrEqual(0);
    expect(parsed.summary.existing_wired).toBeLessThanOrEqual(parsed.summary.existing_total);
    expect(typeof parsed.summary.planned_only_total).toBe("number");
    expect(parsed.summary.planned_only_total).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(parsed.existing)).toBe(true);
    expect(Array.isArray(parsed.planned_only)).toBe(true);
    expect(parsed.existing.length).toBe(parsed.summary.existing_total);
    expect(parsed.planned_only.length).toBe(parsed.summary.planned_only_total);
    // P0-2 (reviewer B finding): pin one known SCENARIO-TEST-MS0 declaration
    // so a rename of `pre-commit-scenario-smoke.mjs` or its `built_in` field
    // surfaces as a test failure (proves the object-shape new_hooks parser
    // actually round-trips through the live envelope read path).
    const allIds = parsed.existing.concat(parsed.planned_only).map((r: { id: string }) => r.id);
    expect(
      allIds.some((id: string) => id === "pre-commit-scenario-smoke.mjs" || id === "pre-commit-scenario-smoke")
    ).toBe(true);
  });
});
