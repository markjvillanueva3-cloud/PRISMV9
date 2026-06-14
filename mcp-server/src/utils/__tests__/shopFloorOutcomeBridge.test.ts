/**
 * shopFloorOutcomeBridge — unit + integration tests.
 *
 * BRIDGE-DEEP / U-BRIDGE-SHOPFLOOR-LEARN — verifies the bridge correctly
 * translates producer records (MachineConnectivity alerts + WEDM job outcomes)
 * into OutcomeEvents that the universal bus accepts and that the cross-domain
 * learning consumers can read.
 *
 * Hermetic: every integration test injects a per-suite OutcomeCaptureBusEngine
 * rooted at a fresh tmpdir, so the tests never pollute the live
 * `state/outcomes/*.jsonl` shards (scrutiny round 2 P1-2 — every test emit
 * accumulated forever in production data). The tmpdir is cleaned in
 * `afterAll`; the unique-id suffix combines Date.now() with Math.random() to
 * survive retry-loops and parallel runs (scrutiny round 2 P1-1).
 *
 * @module utils/__tests__/shopFloorOutcomeBridge.test
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";

import {
  mapAlertTypeToKind,
  mapAlertSeverity,
  mapAlertSource,
  normalizeDomain,
  emitFromMachineAlerts,
  emitFromWEDMJobOutcome,
  MAX_ID_CHARS,
  MAX_NOTE_CHARS,
  type ShopFloorAlertLike,
  type WEDMJobOutcomeLike,
} from "../shopFloorOutcomeBridge.js";
import { OutcomeCaptureBusEngine } from "../../engines/OutcomeCaptureBusEngine.js";
import { OutcomeDomain, OutcomeEventSchema } from "../../schemas/outcomeEventSchema.js";

let tmpDir: string;
let bus: OutcomeCaptureBusEngine;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-sfob-test-"));
  bus = new OutcomeCaptureBusEngine(tmpDir);
});

afterAll(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
});

// Per-test unique-id helper: Date.now() + Math.random() so retries / parallel
// runs / same-ms tests never share a lineage_id (scrutiny round 2, P1-1).
function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ───────────────────────────────────────────────────────────────────────────
// Pure mapping fns — unit tests
// ───────────────────────────────────────────────────────────────────────────

describe("mapAlertTypeToKind", () => {
  it("maps chatter_detected → chatter_event (canonical OutcomeKind)", () => {
    expect(mapAlertTypeToKind("chatter_detected")).toBe("chatter_event");
  });

  it("maps feed_override_low → operator_override (operator-caused)", () => {
    expect(mapAlertTypeToKind("feed_override_low")).toBe("operator_override");
  });

  it("maps controller-derived analytics with no canonical OutcomeKind to 'other'", () => {
    expect(mapAlertTypeToKind("overload_trending")).toBe("other");
    expect(mapAlertTypeToKind("tool_wear_predicted")).toBe("other");
    expect(mapAlertTypeToKind("thermal_drift")).toBe("other");
    expect(mapAlertTypeToKind("alarm_active")).toBe("other");
  });
});

describe("mapAlertSeverity", () => {
  it("info → info (preserves)", () => {
    expect(mapAlertSeverity("info")).toBe("info");
  });

  it("warning → medium (upward — does NOT silently downgrade to info)", () => {
    expect(mapAlertSeverity("warning")).toBe("medium");
  });

  it("critical → critical (preserves at the top of the scale)", () => {
    expect(mapAlertSeverity("critical")).toBe("critical");
  });
});

describe("mapAlertSource — P1-2 fix (operator vs controller attribution)", () => {
  it("attributes feed_override_low to the operator (human turned the dial)", () => {
    expect(mapAlertSource("feed_override_low")).toBe("operator");
  });

  it("attributes every other alert type to controller (analytics)", () => {
    expect(mapAlertSource("chatter_detected")).toBe("controller");
    expect(mapAlertSource("overload_trending")).toBe("controller");
    expect(mapAlertSource("tool_wear_predicted")).toBe("controller");
    expect(mapAlertSource("thermal_drift")).toBe("controller");
    expect(mapAlertSource("alarm_active")).toBe("controller");
  });
});

describe("normalizeDomain — P1-1 fix (derive from Zod enum)", () => {
  it("preserves a known domain", () => {
    expect(normalizeDomain("mill")).toBe("mill");
    expect(normalizeDomain("wedm")).toBe("wedm");
  });

  it("preserves shop_floor (the case the hand-edited mirror was MISSING)", () => {
    // Regression oracle: a prior hand-edited whitelist omitted "shop_floor"
    // and silently downgraded every shop-floor hint to "other". Fix derives
    // from OutcomeDomain.options at module load, so this MUST pass.
    expect(normalizeDomain("shop_floor")).toBe("shop_floor");
  });

  it("falls through to 'other' on unknown / undefined / null / empty", () => {
    expect(normalizeDomain("knitting" as unknown as string)).toBe("other");
    expect(normalizeDomain(undefined)).toBe("other");
    expect(normalizeDomain(null)).toBe("other");
    expect(normalizeDomain("")).toBe("other");
  });

  it("accepts every domain the canonical Zod enum declares (no drift)", () => {
    for (const domain of OutcomeDomain.options) {
      expect(normalizeDomain(domain)).toBe(domain);
    }
  });
});

// ───────────────────────────────────────────────────────────────────────────
// emitFromMachineAlerts — integration against the tmpdir bus
// ───────────────────────────────────────────────────────────────────────────

describe("emitFromMachineAlerts — integration", () => {
  it("emits zero events on empty / invalid input (defensive)", () => {
    expect(emitFromMachineAlerts("m1", "mill", [], "2026-05-20T18:00:00Z", bus)).toEqual([]);
    expect(
      emitFromMachineAlerts(
        "m1",
        "mill",
        null as unknown as ShopFloorAlertLike[],
        "2026-05-20T18:00:00Z",
        bus,
      ),
    ).toEqual([]);
  });

  it("emits one event per alert, all sharing one lineage_id", () => {
    const machineId = uid("bulk");
    const ts = "2026-05-20T18:00:00Z";
    const alerts: ShopFloorAlertLike[] = [
      {
        id: "a1",
        machine_id: machineId,
        type: "chatter_detected",
        severity: "warning",
        message: "Chatter detected at 1500 Hz",
        timestamp: ts,
      },
      {
        id: "a2",
        machine_id: machineId,
        type: "overload_trending",
        severity: "critical",
        message: "Spindle load 96%",
        timestamp: "2026-05-20T18:00:01Z",
      },
    ];
    const results = emitFromMachineAlerts(machineId, "mill", alerts, ts, bus);
    expect(results.length).toBe(2);
    expect(results[0].ok).toBe(true);
    expect(results[1].ok).toBe(true);
    expect(results[0].lineage_id).toBe(results[1].lineage_id);
    expect(results[0].lineage_id).toBe(`machine:${machineId}@${ts}`);
    expect(results[0].event_id === results[1].event_id).toBe(false);
  });

  it("attributes feed_override_low to source='operator' on the persisted shard (P1-2 oracle)", () => {
    const machineId = uid("fov");
    const ts = "2026-05-20T18:00:00Z";
    const alerts: ShopFloorAlertLike[] = [
      {
        id: "a-fov",
        machine_id: machineId,
        type: "feed_override_low",
        severity: "info",
        message: "Feed override at 30%",
        timestamp: ts,
      },
    ];
    emitFromMachineAlerts(machineId, "mill", alerts, ts, bus);
    const lineageId = `machine:${machineId}@${ts}`;
    const q = bus.query({ domain: "mill", lineage_id: lineageId, limit: 10 });
    expect(q.events.length).toBe(1);
    expect(q.events[0].source).toBe("operator");
    expect(q.events[0].kind).toBe("operator_override");
  });

  it("attributes the 5 non-operator alert types to source='controller' E2E (P2-5 oracle)", () => {
    // Verifies the OTHER alert types end-to-end through emit → query → shard,
    // not just via the pure unit test — a hardcoded `source:"operator"` bug in
    // emitFromMachineAlerts would slip past unit tests alone.
    const cases: ShopFloorAlertLike["type"][] = [
      "chatter_detected",
      "overload_trending",
      "tool_wear_predicted",
      "thermal_drift",
      "alarm_active",
    ];
    for (const alertType of cases) {
      const machineId = uid(`ctrl-${alertType}`);
      const ts = "2026-05-20T18:00:00Z";
      emitFromMachineAlerts(
        machineId,
        "mill",
        [
          {
            id: `a-${alertType}`,
            machine_id: machineId,
            type: alertType,
            severity: "warning",
            message: `${alertType} test`,
            timestamp: ts,
          },
        ],
        ts,
        bus,
      );
      const q = bus.query({
        domain: "mill",
        lineage_id: `machine:${machineId}@${ts}`,
        limit: 10,
      });
      expect(q.events.length).toBe(1);
      expect(q.events[0].source).toBe("controller");
    }
  });

  it("hostile payload: strips CRLF from lineage_id so JSONL line is never split", () => {
    const ts = "2026-05-20T18:00:00Z";
    const alerts: ShopFloorAlertLike[] = [
      {
        id: "a1",
        machine_id: "evil",
        type: "chatter_detected",
        severity: "warning",
        message: "ok",
        timestamp: ts,
      },
    ];
    const results = emitFromMachineAlerts("evil\r\nINJECTED", "mill", alerts, ts, bus);
    expect(results.length).toBe(1);
    expect(results[0].ok).toBe(true);
    expect(results[0].lineage_id.includes("\n")).toBe(false);
    expect(results[0].lineage_id.includes("\r")).toBe(false);
    expect(results[0].lineage_id).toBe(`machine:evilINJECTED@${ts}`);
  });

  it("hostile payload: strips ASCII control bytes \\x00..\\x1f beyond just CRLF", () => {
    // CTRL_CHAR_RE coverage broader than CRLF alone — a null byte, vertical
    // tab, or DEL embedded in machineId must also be stripped (per the lib's
    // documented intent — scrutiny round 2, A's P2 #1 boundary case).
    const ts = "2026-05-20T18:00:00Z";
    const machineIdRaw = "m\x00\x07\x1fx";
    const alerts: ShopFloorAlertLike[] = [
      {
        id: "a1",
        machine_id: "x",
        type: "chatter_detected",
        severity: "warning",
        message: "ok",
        timestamp: ts,
      },
    ];
    const results = emitFromMachineAlerts(machineIdRaw, "mill", alerts, ts, bus);
    expect(results[0].lineage_id).toBe(`machine:mx@${ts}`);
  });

  it("hostile payload: clamps machineId to MAX_ID_CHARS (exact boundary)", () => {
    const ts = "2026-05-20T18:00:00Z";
    const overlong = "m".repeat(MAX_ID_CHARS + 100);
    const alerts: ShopFloorAlertLike[] = [
      {
        id: "a1",
        machine_id: "x",
        type: "chatter_detected",
        severity: "warning",
        message: "ok",
        timestamp: ts,
      },
    ];
    const results = emitFromMachineAlerts(overlong, "mill", alerts, ts, bus);
    // lineage_id = "machine:" + clamped(overlong, 256) + "@" + ts
    const expectedMachine = "m".repeat(MAX_ID_CHARS);
    expect(results[0].lineage_id).toBe(`machine:${expectedMachine}@${ts}`);
  });

  it("hostile payload: clamps oversize note to MAX_NOTE_CHARS on the persisted shard", () => {
    const machineId = uid("bignote");
    const ts = "2026-05-20T18:00:00Z";
    const oversize = MAX_NOTE_CHARS + 1000;
    const alerts: ShopFloorAlertLike[] = [
      {
        id: "a1",
        machine_id: machineId,
        type: "chatter_detected",
        severity: "warning",
        message: "x".repeat(oversize),
        timestamp: ts,
      },
    ];
    emitFromMachineAlerts(machineId, "mill", alerts, ts, bus);
    const q = bus.query({
      domain: "mill",
      lineage_id: `machine:${machineId}@${ts}`,
      limit: 1,
    });
    expect(q.events.length).toBe(1);
    const note = q.events[0].note ?? "";
    expect(note.length).toBe(MAX_NOTE_CHARS);
    expect(note).toBe("x".repeat(MAX_NOTE_CHARS));
    expect(note.length).toBeLessThan(oversize);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// emitFromWEDMJobOutcome — integration against the tmpdir bus
// ───────────────────────────────────────────────────────────────────────────

describe("emitFromWEDMJobOutcome — integration", () => {
  it("emits 2 events (cycle_time + surface_finish) when wireBreaks == 0", () => {
    const jobId = uid("wedm-zero");
    const outcome: WEDMJobOutcomeLike = {
      jobId,
      material: "D2",
      finishedAt: "2026-05-20T18:00:00Z",
      predicted: { raUm: 2.0, cycleTimeMin: 45 },
      actual: { raUm: 2.3, cycleTimeMin: 48, wireBreaks: 0 },
    };
    const results = emitFromWEDMJobOutcome(outcome, bus);
    expect(results.length).toBe(2);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(results.every((r) => r.lineage_id === jobId)).toBe(true);

    const q = bus.query({ domain: "wedm", lineage_id: jobId, limit: 10 });
    const kinds = q.events.map((e) => e.kind).sort();
    expect(kinds).toEqual(["cycle_time_measurement", "surface_finish_ra"]);
  });

  it("emits 3 events (adds tool_break) when wireBreaks >= 2 with severity='high'", () => {
    const jobId = uid("wedm-high");
    const outcome: WEDMJobOutcomeLike = {
      jobId,
      material: "D2",
      finishedAt: "2026-05-20T18:00:00Z",
      predicted: { raUm: 2.0, cycleTimeMin: 45 },
      actual: { raUm: 2.3, cycleTimeMin: 48, wireBreaks: 3 },
    };
    const results = emitFromWEDMJobOutcome(outcome, bus);
    expect(results.length).toBe(3);

    const q = bus.query({ domain: "wedm", lineage_id: jobId, limit: 10 });
    const breakEvt = q.events.find((e) => e.kind === "tool_break");
    expect(breakEvt?.kind).toBe("tool_break");
    expect(breakEvt?.severity).toBe("high");
    expect((breakEvt?.actual as { wire_breaks: number } | undefined)?.wire_breaks).toBe(3);
  });

  it("tool_break severity = medium when wireBreaks == 1", () => {
    const jobId = uid("wedm-1");
    const outcome: WEDMJobOutcomeLike = {
      jobId,
      material: "D2",
      finishedAt: "2026-05-20T18:00:00Z",
      predicted: { raUm: 2.0, cycleTimeMin: 45 },
      actual: { raUm: 2.3, cycleTimeMin: 48, wireBreaks: 1 },
    };
    const results = emitFromWEDMJobOutcome(outcome, bus);
    expect(results.length).toBe(3);
    expect(results.every((r) => r.ok)).toBe(true);
    // Regression oracle: every emit MUST route to the injected bus, not the
    // singleton. A prior bug had the tool_break call hardcoded to the live
    // singleton — its result.path pointed at the production shard instead of
    // the tmpDir. Pin the path now so any future re-introduction fails here.
    for (const r of results) {
      expect(r.path.startsWith(tmpDir)).toBe(true);
    }
    const q = bus.query({ domain: "wedm", lineage_id: jobId, limit: 10 });
    const breakEvt = q.events.find((e) => e.kind === "tool_break");
    expect(breakEvt?.severity).toBe("medium");
  });

  it("emits ZERO events on malformed input — R12 fail-loud (A's P2 #4)", () => {
    expect(
      emitFromWEDMJobOutcome(
        {
          jobId: "x",
          material: "D2",
          finishedAt: "t",
          actual: { raUm: 2, cycleTimeMin: 5, wireBreaks: 0 },
        } as unknown as WEDMJobOutcomeLike,
        bus,
      ),
    ).toEqual([]);

    expect(
      emitFromWEDMJobOutcome(
        {
          jobId: "x",
          material: "D2",
          finishedAt: "t",
          predicted: { raUm: NaN, cycleTimeMin: 5 },
          actual: { raUm: 2, cycleTimeMin: 5, wireBreaks: 0 },
        },
        bus,
      ),
    ).toEqual([]);

    // Infinity is finite-rejected by the guard (Number.isFinite(Infinity) === false)
    expect(
      emitFromWEDMJobOutcome(
        {
          jobId: "x",
          material: "D2",
          finishedAt: "t",
          predicted: { raUm: 2, cycleTimeMin: Infinity },
          actual: { raUm: 2, cycleTimeMin: 5, wireBreaks: 0 },
        },
        bus,
      ),
    ).toEqual([]);

    expect(
      emitFromWEDMJobOutcome(
        {
          jobId: "",
          material: "D2",
          finishedAt: "t",
          predicted: { raUm: 2, cycleTimeMin: 5 },
          actual: { raUm: 2, cycleTimeMin: 5, wireBreaks: 0 },
        },
        bus,
      ),
    ).toEqual([]);

    expect(emitFromWEDMJobOutcome(null as unknown as WEDMJobOutcomeLike, bus)).toEqual([]);
  });

  it("delta correctly captures predicted-vs-actual error (algebraic invariant)", () => {
    const jobId = uid("wedm-delta");
    emitFromWEDMJobOutcome(
      {
        jobId,
        material: "D2",
        finishedAt: "2026-05-20T18:00:00Z",
        // 48 - 45 = 3, 2.3 - 2.0 = 0.3 — concrete reference values per R9.
        predicted: { raUm: 2.0, cycleTimeMin: 45 },
        actual: { raUm: 2.3, cycleTimeMin: 48, wireBreaks: 0 },
      },
      bus,
    );
    const q = bus.query({ domain: "wedm", lineage_id: jobId, limit: 10 });
    const cycleEvt = q.events.find((e) => e.kind === "cycle_time_measurement");
    expect(cycleEvt?.kind).toBe("cycle_time_measurement");
    expect(
      (cycleEvt?.delta as { cycle_time_error_min: number }).cycle_time_error_min,
    ).toBeCloseTo(3, 5);
    const raEvt = q.events.find((e) => e.kind === "surface_finish_ra");
    expect(raEvt?.kind).toBe("surface_finish_ra");
    expect((raEvt?.delta as { ra_error_um: number }).ra_error_um).toBeCloseTo(0.3, 5);
  });
});

// ───────────────────────────────────────────────────────────────────────────
// End-to-end — schema conformance against the bus's Zod validator
// ───────────────────────────────────────────────────────────────────────────

describe("emitted events satisfy OutcomeEventSchema (round-trip)", () => {
  it("every WEDM emission round-trips through OutcomeEventSchema.safeParse", () => {
    const jobId = uid("wedm-rt");
    emitFromWEDMJobOutcome(
      {
        jobId,
        material: "D2",
        finishedAt: "2026-05-20T18:00:00Z",
        predicted: { raUm: 2.0, cycleTimeMin: 45 },
        actual: { raUm: 2.3, cycleTimeMin: 48, wireBreaks: 1 },
      },
      bus,
    );
    const q = bus.query({ domain: "wedm", lineage_id: jobId, limit: 10 });
    expect(q.events.length).toBe(3);
    for (const evt of q.events) {
      const parsed = OutcomeEventSchema.safeParse(evt);
      expect(parsed.success).toBe(true);
    }
  });

  it("every MachineAlert emission round-trips through OutcomeEventSchema.safeParse", () => {
    const machineId = uid("mc-rt");
    const ts = "2026-05-20T18:00:00Z";
    const alerts: ShopFloorAlertLike[] = [
      {
        id: "rt-a1",
        machine_id: machineId,
        type: "chatter_detected",
        severity: "warning",
        message: "rt",
        timestamp: ts,
      },
      {
        id: "rt-a2",
        machine_id: machineId,
        type: "feed_override_low",
        severity: "info",
        message: "rt",
        timestamp: "2026-05-20T18:00:01Z",
      },
    ];
    emitFromMachineAlerts(machineId, "mill", alerts, ts, bus);
    const q = bus.query({
      domain: "mill",
      lineage_id: `machine:${machineId}@${ts}`,
      limit: 10,
    });
    expect(q.events.length).toBe(2);
    for (const evt of q.events) {
      const parsed = OutcomeEventSchema.safeParse(evt);
      expect(parsed.success).toBe(true);
    }
  });
});
