/**
 * U-WGAP06 — WEDMSchedulingEngine test suite.
 *
 * Tests: reserveMachine, checkAvailability, cancelReservation, listReservations.
 * Clears state file before each test for isolation.
 */
import { describe, it, expect, beforeEach, afterAll } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const STATE_FILE = path.resolve("data/state/wedm-reservations.json");

function clearState() {
  if (fs.existsSync(STATE_FILE)) fs.unlinkSync(STATE_FILE);
}

describe("U-WGAP06: WEDMSchedulingEngine", () => {
  beforeEach(() => {
    clearState();
  });

  afterAll(() => {
    clearState();
  });

  it("reserveMachine creates a reservation and persists it", async () => {
    const { wedmSchedulingEngine } = await import("../engines/WEDMSchedulingEngine.js");
    const now = new Date();
    const result = wedmSchedulingEngine.reserveMachine({
      estimated_hours: 2,
      starts_at: now.toISOString(),
      job_name: "Test Job 1",
    });
    expect(result.success).toBe(true);
    expect(result.reservation).toBeDefined();
    expect(result.reservation!.id).toBeTruthy();
    expect(result.reservation!.machine_id).toBe("mitsubishi-fa10s");
    expect(result.reservation!.estimated_hours).toBe(2);
  });

  it("reserveMachine rejects conflicting time slots", async () => {
    const { wedmSchedulingEngine } = await import("../engines/WEDMSchedulingEngine.js");
    const now = new Date();
    const first = wedmSchedulingEngine.reserveMachine({
      estimated_hours: 4,
      starts_at: now.toISOString(),
      job_name: "First Job",
    });
    expect(first.success).toBe(true);

    // Overlapping reservation 2 hours into the first
    const overlap = new Date(now.getTime() + 2 * 3600_000);
    const second = wedmSchedulingEngine.reserveMachine({
      estimated_hours: 2,
      starts_at: overlap.toISOString(),
      job_name: "Overlapping Job",
    });
    expect(second.success).toBe(false);
    expect(second.conflicts.length).toBeGreaterThan(0);
    expect(second.error).toContain("conflict");
  });

  it("reserveMachine allows non-overlapping slots", async () => {
    const { wedmSchedulingEngine } = await import("../engines/WEDMSchedulingEngine.js");
    const now = new Date();
    const first = wedmSchedulingEngine.reserveMachine({
      estimated_hours: 2,
      starts_at: now.toISOString(),
      job_name: "First Job",
    });
    expect(first.success).toBe(true);

    // After the first reservation ends
    const after = new Date(now.getTime() + 3 * 3600_000);
    const second = wedmSchedulingEngine.reserveMachine({
      estimated_hours: 2,
      starts_at: after.toISOString(),
      job_name: "Later Job",
    });
    expect(second.success).toBe(true);
  });

  it("checkAvailability returns available=true when no conflicts", async () => {
    const { wedmSchedulingEngine } = await import("../engines/WEDMSchedulingEngine.js");
    const now = new Date();
    const result = wedmSchedulingEngine.checkAvailability({
      starts_at: now.toISOString(),
      ends_at: new Date(now.getTime() + 3600_000).toISOString(),
    });
    expect(result.available).toBe(true);
    expect(result.conflicts.length).toBe(0);
  });

  it("checkAvailability detects conflicts", async () => {
    const { wedmSchedulingEngine } = await import("../engines/WEDMSchedulingEngine.js");
    const now = new Date();
    wedmSchedulingEngine.reserveMachine({
      estimated_hours: 4,
      starts_at: now.toISOString(),
    });
    const result = wedmSchedulingEngine.checkAvailability({
      starts_at: new Date(now.getTime() + 1 * 3600_000).toISOString(),
      ends_at: new Date(now.getTime() + 2 * 3600_000).toISOString(),
    });
    expect(result.available).toBe(false);
    expect(result.conflicts.length).toBe(1);
  });

  it("cancelReservation marks reservation as cancelled", async () => {
    const { wedmSchedulingEngine } = await import("../engines/WEDMSchedulingEngine.js");
    const now = new Date();
    const created = wedmSchedulingEngine.reserveMachine({
      estimated_hours: 2,
      starts_at: now.toISOString(),
    });
    expect(created.success).toBe(true);
    const id = created.reservation!.id;

    const cancelled = wedmSchedulingEngine.cancelReservation(id);
    expect(cancelled.success).toBe(true);
    expect(cancelled.reservation!.status).toBe("cancelled");

    // Cancelled slot should now be available
    const check = wedmSchedulingEngine.checkAvailability({
      starts_at: now.toISOString(),
      ends_at: new Date(now.getTime() + 2 * 3600_000).toISOString(),
    });
    expect(check.available).toBe(true);
  });

  it("cancelReservation returns error for unknown id", async () => {
    const { wedmSchedulingEngine } = await import("../engines/WEDMSchedulingEngine.js");
    const result = wedmSchedulingEngine.cancelReservation("nonexistent-id");
    expect(result.success).toBe(false);
    expect(result.error).toContain("not found");
  });

  it("listReservations returns all reservations sorted by start time", async () => {
    const { wedmSchedulingEngine } = await import("../engines/WEDMSchedulingEngine.js");
    const now = new Date();
    wedmSchedulingEngine.reserveMachine({
      estimated_hours: 1,
      starts_at: new Date(now.getTime() + 5 * 3600_000).toISOString(),
      job_name: "Later",
    });
    wedmSchedulingEngine.reserveMachine({
      estimated_hours: 1,
      starts_at: now.toISOString(),
      job_name: "Now",
    });
    const list = wedmSchedulingEngine.listReservations();
    expect(list.length).toBe(2);
    expect(list[0].job_name).toBe("Now");
    expect(list[1].job_name).toBe("Later");
  });

  it("reserveMachine rejects invalid parameters", async () => {
    const { wedmSchedulingEngine } = await import("../engines/WEDMSchedulingEngine.js");
    const result = wedmSchedulingEngine.reserveMachine({
      estimated_hours: 0,
      starts_at: "",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("Invalid");
  });
});
