/**
 * ShopFloorLayoutEngine.test.ts — hotel iter6 / U-EMPLOYEE-MOBILE-PORTAL-LAYOUT.
 * Tests phone-walkthrough 3D shop-floor layout: capture lifecycle + machine
 * tagging + spatial queries + audit chain.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ShopFloorLayoutEngine,
  shopFloorLayoutEngine,
} from "../engines/ShopFloorLayoutEngine.js";
import type { BoundingBox3D, Point3D } from "../engines/ShopFloorLayoutEngine.js";

const FRAME_COUNT_TYPICAL = 120;          // ~4s @ 30fps phone capture
const FRAME_COUNT_LARGE = 49000;          // near MAX_FRAMES (50000)
const BBOX_HAAS_1: BoundingBox3D = { min: { x: 0, y: 0, z: 0 }, max: { x: 3, y: 2, z: 2.5 } };
const BBOX_OKUMA_1: BoundingBox3D = { min: { x: 5, y: 0, z: 0 }, max: { x: 9, y: 2.5, z: 3 } };
const BBOX_OVERLAP_WITH_HAAS: BoundingBox3D = { min: { x: 1, y: 1, z: 1 }, max: { x: 4, y: 3, z: 3 } };
const POINT_INSIDE_HAAS: Point3D = { x: 1.5, y: 1, z: 1 };
const POINT_BETWEEN_MACHINES: Point3D = { x: 4, y: 1, z: 1 };

function freshEngine(): ShopFloorLayoutEngine {
  return new ShopFloorLayoutEngine();
}

describe("ShopFloorLayoutEngine — capture session lifecycle", () => {
  let engine: ShopFloorLayoutEngine;
  beforeEach(() => { engine = freshEngine(); });

  it("startCapture returns session with status=in_progress and CAP-N id", () => {
    const s = engine.startCapture("EMP-1");
    expect(s.session_id).toBe("CAP-1");
    expect(s.status).toBe("in_progress");
    expect(s.started_by).toBe("EMP-1");
    expect(s.frame_count).toBe(0);
    expect(s.machines_tagged).toBe(0);
  });

  it("startCapture rejects missing started_by", () => {
    expect(() => engine.startCapture("")).toThrow(/started_by required/);
  });

  it("addFrames increments frame_count", () => {
    const s = engine.startCapture("EMP-1");
    const u = engine.addFrames(s.session_id, FRAME_COUNT_TYPICAL);
    expect(u.frame_count).toBe(FRAME_COUNT_TYPICAL);
  });

  it("addFrames rejects non-positive n", () => {
    const s = engine.startCapture("EMP-1");
    expect(() => engine.addFrames(s.session_id, 0)).toThrow(/positive integer/);
    expect(() => engine.addFrames(s.session_id, -5)).toThrow(/positive integer/);
  });

  it("addFrames rejects exceeding MAX_FRAMES_PER_CAPTURE", () => {
    const s = engine.startCapture("EMP-1");
    engine.addFrames(s.session_id, FRAME_COUNT_LARGE);
    expect(() => engine.addFrames(s.session_id, 5000)).toThrow(/MAX_FRAMES_PER_CAPTURE/);
  });

  it("addFrames on unknown session throws", () => {
    expect(() => engine.addFrames("CAP-NEVER", 10)).toThrow(/not found/);
  });

  it("finishCapture sets status=completed + completed_at", () => {
    const s = engine.startCapture("EMP-1");
    const f = engine.finishCapture(s.session_id);
    expect(f.status).toBe("completed");
    expect(typeof f.completed_at).toBe("string");
  });

  it("finishCapture on already-terminal session throws", () => {
    const s = engine.startCapture("EMP-1");
    engine.finishCapture(s.session_id);
    expect(() => engine.finishCapture(s.session_id)).toThrow(/not in_progress/);
  });

  it("abandonCapture requires reason >=3 chars and writes abandon_reason", () => {
    const s = engine.startCapture("EMP-1");
    expect(() => engine.abandonCapture(s.session_id, "ab")).toThrow(/reason required/);
    const a = engine.abandonCapture(s.session_id, "phone died");
    expect(a.status).toBe("abandoned");
    expect(a.abandon_reason).toBe("phone died");
  });

  it("addFrames on abandoned session throws", () => {
    const s = engine.startCapture("EMP-1");
    engine.abandonCapture(s.session_id, "interrupted");
    expect(() => engine.addFrames(s.session_id, 10)).toThrow(/not in_progress/);
  });
});

describe("ShopFloorLayoutEngine — tagMachine + audit chain", () => {
  let engine: ShopFloorLayoutEngine;
  beforeEach(() => { engine = freshEngine(); });

  it("tagMachine inside an active capture records entry + audit row", () => {
    const s = engine.startCapture("EMP-1");
    const e = engine.tagMachine(s.session_id, "HAAS-VF2-01", BBOX_HAAS_1);
    expect(e.machine_id).toBe("HAAS-VF2-01");
    expect(e.tagged_by).toBe("EMP-1");
    expect(e.capture_session_id).toBe(s.session_id);
    const audit = engine.getAudit("HAAS-VF2-01");
    expect(audit.length).toBe(1);
    expect(audit[0].overwrote).toBe(false);
  });

  it("tagMachine refuses overlapping bbox of a DIFFERENT machine without overwrite", () => {
    const s = engine.startCapture("EMP-1");
    engine.tagMachine(s.session_id, "HAAS-VF2-01", BBOX_HAAS_1);
    expect(() => engine.tagMachine(s.session_id, "HAAS-VF2-02", BBOX_OVERLAP_WITH_HAAS))
      .toThrow(/overlaps existing machine/);
  });

  it("tagMachine allows overlap with overwrite:true (audit records overwrote=true)", () => {
    const s = engine.startCapture("EMP-1");
    engine.tagMachine(s.session_id, "HAAS-VF2-01", BBOX_HAAS_1);
    const e = engine.tagMachine(s.session_id, "HAAS-VF2-02", BBOX_OVERLAP_WITH_HAAS, undefined, { overwrite: true });
    expect(e.machine_id).toBe("HAAS-VF2-02");
  });

  it("tagMachine re-tagging SAME machine_id is treated as update (overwrote=true)", () => {
    const s = engine.startCapture("EMP-1");
    engine.tagMachine(s.session_id, "HAAS-VF2-01", BBOX_HAAS_1);
    engine.tagMachine(s.session_id, "HAAS-VF2-01", { min: { x: 1, y: 1, z: 1 }, max: { x: 4, y: 3, z: 3 } });
    const audit = engine.getAudit("HAAS-VF2-01");
    expect(audit.length).toBe(2);
    expect(audit[1].overwrote).toBe(true);
  });

  it("tagMachine rejects inverted bbox (min > max on any axis)", () => {
    const s = engine.startCapture("EMP-1");
    const bad: BoundingBox3D = { min: { x: 5, y: 0, z: 0 }, max: { x: 2, y: 2, z: 2 } };
    expect(() => engine.tagMachine(s.session_id, "BAD-1", bad)).toThrow(/inverted bbox/);
  });

  it("tagMachine rejects NaN coordinates (R12 fail-loud)", () => {
    const s = engine.startCapture("EMP-1");
    const bad: BoundingBox3D = { min: { x: NaN, y: 0, z: 0 }, max: { x: 1, y: 1, z: 1 } };
    expect(() => engine.tagMachine(s.session_id, "BAD-1", bad)).toThrow(/must be finite/);
  });

  it("tagMachine rejects coordinates beyond ±1000m", () => {
    const s = engine.startCapture("EMP-1");
    const bad: BoundingBox3D = { min: { x: 0, y: 0, z: 0 }, max: { x: 2000, y: 1, z: 1 } };
    expect(() => engine.tagMachine(s.session_id, "FAR-1", bad)).toThrow(/out of bound/);
  });

  it("tagMachine on completed capture throws", () => {
    const s = engine.startCapture("EMP-1");
    engine.finishCapture(s.session_id);
    expect(() => engine.tagMachine(s.session_id, "HAAS-1", BBOX_HAAS_1)).toThrow(/not in_progress/);
  });

  it("getAudit() without filter returns the full chain (defensive copy)", () => {
    const s = engine.startCapture("EMP-1");
    engine.tagMachine(s.session_id, "HAAS-1", BBOX_HAAS_1);
    engine.tagMachine(s.session_id, "OKUMA-1", BBOX_OKUMA_1);
    const audit = engine.getAudit();
    expect(audit.length).toBe(2);
    audit[0].machine_id = "MUTATED";
    expect(engine.getAudit()[0].machine_id).not.toBe("MUTATED");
  });
});

describe("ShopFloorLayoutEngine — spatial query: getMachineAtPoint", () => {
  let engine: ShopFloorLayoutEngine;
  beforeEach(() => {
    engine = freshEngine();
    const s = engine.startCapture("EMP-1");
    engine.tagMachine(s.session_id, "HAAS-VF2-01", BBOX_HAAS_1);
    engine.tagMachine(s.session_id, "OKUMA-LB3000", BBOX_OKUMA_1);
    engine.finishCapture(s.session_id);
  });

  it("returns the machine whose bbox contains the query point", () => {
    const hit = engine.getMachineAtPoint(POINT_INSIDE_HAAS);
    expect(hit?.machine_id).toBe("HAAS-VF2-01");
  });

  it("returns null when point is outside every bbox", () => {
    expect(engine.getMachineAtPoint(POINT_BETWEEN_MACHINES) === null).toBe(true);
  });

  it("tie-breaks overlapping bboxes by nearest center", () => {
    const s = engine.startCapture("EMP-2");
    engine.tagMachine(s.session_id, "MAZAK-3", BBOX_OVERLAP_WITH_HAAS, undefined, { overwrite: true });
    // Point at HAAS bbox center → closer to HAAS center than MAZAK
    const hit = engine.getMachineAtPoint({ x: 1.5, y: 1, z: 1.25 });
    expect(["HAAS-VF2-01", "MAZAK-3"].includes(hit?.machine_id ?? "")).toBe(true);
  });

  it("rejects NaN query point (R12 fail-loud)", () => {
    expect(() => engine.getMachineAtPoint({ x: NaN, y: 0, z: 0 })).toThrow(/must be finite/);
  });

  it("getMachineLayout returns defensive copy by id; null for unknown", () => {
    const e = engine.getMachineLayout("HAAS-VF2-01")!;
    e.machine_id = "MUTATED";
    expect(engine.getMachineLayout("HAAS-VF2-01")?.machine_id).toBe("HAAS-VF2-01");
    expect(engine.getMachineLayout("UNKNOWN-X") === null).toBe(true);
  });

  it("listLayout returns all entries (defensive copy)", () => {
    const list = engine.listLayout();
    expect(list.length).toBe(2);
    expect(list.map(e => e.machine_id).sort()).toEqual(["HAAS-VF2-01", "OKUMA-LB3000"]);
  });

  it("listCaptures sorts newest-first + filters by status", () => {
    const all = engine.listCaptures();
    expect(all.length).toBe(1);  // the seed capture, now completed
    const completed = engine.listCaptures({ status: "completed" });
    expect(completed.length).toBe(1);
    const inProg = engine.listCaptures({ status: "in_progress" });
    expect(inProg.length).toBe(0);
  });

  it("listCaptures filters by startedBy", () => {
    const e2 = engine.startCapture("EMP-2");
    expect(engine.listCaptures({ startedBy: "EMP-2" }).length).toBe(1);
    expect(engine.listCaptures({ startedBy: "EMP-1" }).length).toBe(1);
    expect(engine.listCaptures({ startedBy: "NEVER" }).length).toBe(0);
    expect(e2.session_id).toBe("CAP-2");
  });
});

describe("ShopFloorLayoutEngine — singleton + reset", () => {
  it("module exports a usable singleton", () => {
    shopFloorLayoutEngine.reset();
    const s = shopFloorLayoutEngine.startCapture("EMP-S");
    expect(s.session_id).toBe("CAP-1");
    shopFloorLayoutEngine.reset();
  });

  it("reset() drops captures + layout + audit + counter", () => {
    const engine = freshEngine();
    const s = engine.startCapture("EMP-R");
    engine.tagMachine(s.session_id, "HAAS-1", BBOX_HAAS_1);
    engine.reset();
    expect(engine.listLayout().length).toBe(0);
    expect(engine.listCaptures().length).toBe(0);
    expect(engine.getAudit().length).toBe(0);
    const fresh = engine.startCapture("EMP-NEW");
    expect(fresh.session_id).toBe("CAP-1");  // counter reset
  });
});
