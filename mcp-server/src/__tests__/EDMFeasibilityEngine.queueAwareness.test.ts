/**
 * U-WGAP05 — Machine queue awareness in EDMFeasibilityEngine.
 *
 * Verifies that feasibility results surface queue wait time and that
 * queue-adjusted delivery exceeding the caller-supplied deadline produces
 * a warning + recommendation.
 *
 * Strategy: write a temporary reservation file to exercise the queued path,
 * then delete it to exercise the idle fallback. File location must match
 * path.resolve("data/state/wedm-reservations.json") in the engine.
 */
import { describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  edmFeasibilityEngine,
  type FeasibilityInput,
} from "../engines/EDMFeasibilityEngine.js";

const RESERVATIONS_PATH = path.resolve("data/state/wedm-reservations.json");

function makeInput(overrides: Partial<FeasibilityInput> = {}): FeasibilityInput {
  return {
    material: "D2 tool steel",
    features: [
      {
        name: "main-profile",
        is_through: true,
        profile_length_mm: 200,
        min_corner_radius_mm: 0.5,
        tolerance_mm: 0.01,
      },
    ],
    workpiece: { thickness_mm: 25, length_mm: 150, width_mm: 100, height_mm: 25 },
    wire_diameter_mm: 0.25,
    ...overrides,
  };
}

function writeReservations(resvs: Array<{ start_time: string; end_time: string }>) {
  fs.mkdirSync(path.dirname(RESERVATIONS_PATH), { recursive: true });
  fs.writeFileSync(RESERVATIONS_PATH, JSON.stringify({ reservations: resvs }), "utf-8");
}

function clearReservations() {
  if (fs.existsSync(RESERVATIONS_PATH)) fs.unlinkSync(RESERVATIONS_PATH);
}

describe("U-WGAP05: EDMFeasibilityEngine machine_availability", () => {
  afterEach(() => {
    clearReservations();
  });

  it("returns available=true with zero queue wait when no reservation file exists", () => {
    clearReservations();
    const r = edmFeasibilityEngine.assess(makeInput());
    expect(r.machine_availability).toBeDefined();
    expect(r.machine_availability!.available).toBe(true);
    expect(r.machine_availability!.queue_depth).toBe(0);
    expect(r.machine_availability!.queue_wait_hours).toBe(0);
    expect(r.machine_availability!.next_available_at).toBeNull();
  });

  it("includes the machine id/name in every response", () => {
    clearReservations();
    const r = edmFeasibilityEngine.assess(makeInput());
    expect(r.machine_availability!.machine_id).toBe("mitsubishi-fa10s");
    expect(r.machine_availability!.machine_name).toBe("Mitsubishi FA-10S");
  });

  it("reports queue depth and wait hours when reservations are active", () => {
    const now = Date.now();
    writeReservations([
      { start_time: new Date(now - 3600_000).toISOString(), end_time: new Date(now + 4 * 3600_000).toISOString() },
    ]);
    const r = edmFeasibilityEngine.assess(makeInput());
    expect(r.machine_availability!.available).toBe(false);
    expect(r.machine_availability!.queue_depth).toBe(1);
    expect(r.machine_availability!.queue_wait_hours).toBeGreaterThan(3.5);
    expect(r.machine_availability!.queue_wait_hours).toBeLessThan(4.5);
    expect(r.machine_availability!.next_available_at).toBeTruthy();
  });

  it("total_delivery_hours = cutting time + queue wait", () => {
    const now = Date.now();
    writeReservations([
      { start_time: new Date(now).toISOString(), end_time: new Date(now + 2 * 3600_000).toISOString() },
    ]);
    const r = edmFeasibilityEngine.assess(makeInput());
    const cutting = r.time_estimate.total_hours;
    const wait = r.machine_availability!.queue_wait_hours;
    // total is rounded from raw (unrounded) components, so allow ±0.15h of the rounded-input sum
    expect(Math.abs(r.machine_availability!.total_delivery_hours - (cutting + wait))).toBeLessThan(0.2);
    expect(r.machine_availability!.total_delivery_hours).toBeGreaterThan(wait);
  });

  it("meets_deadline_with_queue=true when total stays under the deadline", () => {
    clearReservations();
    const r = edmFeasibilityEngine.assess(makeInput({ delivery_hours: 1000 }));
    expect(r.machine_availability!.meets_deadline_with_queue).toBe(true);
  });

  it("meets_deadline_with_queue=false and emits warning when queue pushes past deadline", () => {
    const now = Date.now();
    writeReservations([
      { start_time: new Date(now).toISOString(), end_time: new Date(now + 48 * 3600_000).toISOString() },
    ]);
    const r = edmFeasibilityEngine.assess(makeInput({ delivery_hours: 4 }));
    expect(r.machine_availability!.meets_deadline_with_queue).toBe(false);
    expect(r.warnings.some(w => /queue wait/i.test(w))).toBe(true);
    expect(r.recommendations.some(rc => /alternate machine|extend deadline|shift start/i.test(rc))).toBe(true);
  });

  it("meets_deadline_with_queue defaults to true when caller omits delivery_hours", () => {
    const now = Date.now();
    writeReservations([
      { start_time: new Date(now).toISOString(), end_time: new Date(now + 72 * 3600_000).toISOString() },
    ]);
    const r = edmFeasibilityEngine.assess(makeInput());
    expect(r.machine_availability!.meets_deadline_with_queue).toBe(true);
  });

  it("falls back gracefully when the reservations file is malformed JSON", () => {
    fs.mkdirSync(path.dirname(RESERVATIONS_PATH), { recursive: true });
    fs.writeFileSync(RESERVATIONS_PATH, "not json at all", "utf-8");
    const r = edmFeasibilityEngine.assess(makeInput());
    expect(r.machine_availability!.available).toBe(true);
    expect(r.machine_availability!.queue_depth).toBe(0);
  });

  it("ignores reservations whose end_time has already passed", () => {
    const now = Date.now();
    writeReservations([
      { start_time: new Date(now - 4 * 3600_000).toISOString(), end_time: new Date(now - 1 * 3600_000).toISOString() },
    ]);
    const r = edmFeasibilityEngine.assess(makeInput());
    expect(r.machine_availability!.available).toBe(true);
    expect(r.machine_availability!.queue_depth).toBe(0);
    expect(r.machine_availability!.queue_wait_hours).toBe(0);
  });

  it("queue_depth counts every active reservation, wait reflects latest end_time", () => {
    const now = Date.now();
    writeReservations([
      { start_time: new Date(now).toISOString(), end_time: new Date(now + 2 * 3600_000).toISOString() },
      { start_time: new Date(now).toISOString(), end_time: new Date(now + 6 * 3600_000).toISOString() },
    ]);
    const r = edmFeasibilityEngine.assess(makeInput());
    expect(r.machine_availability!.queue_depth).toBe(2);
    expect(r.machine_availability!.queue_wait_hours).toBeGreaterThan(5.5);
    expect(r.machine_availability!.queue_wait_hours).toBeLessThan(6.5);
  });
});
