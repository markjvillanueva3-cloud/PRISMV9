/**
 * EmployeeInsertSideTrackerEngine.test.ts — HOTEL/U-EMP-INSERT-SIDE-TRACKER (iter7)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { employeeInsertSideTrackerEngine } from "../engines/EmployeeInsertSideTrackerEngine.js";

describe("EmployeeInsertSideTrackerEngine", () => {
  beforeEach(() => employeeInsertSideTrackerEngine.reset());

  describe("assignInsert", () => {
    it("creates an 8-corner CNMG assignment with all fresh", () => {
      const a = employeeInsertSideTrackerEngine.assignInsert({
        insert_tag: "INS-001",
        insert_type: "CNMG",
        part_id: "P-100",
        employee_id: "EMP-MV",
      });
      expect(a.corner_count).toBe(8);
      expect(a.corners).toHaveLength(8);
      expect(a.corners.every((c) => c.wear_status === "fresh")).toBe(true);
      expect(a.active_corner).toBe(1);
    });

    it("creates a 6-corner DCMT assignment", () => {
      const a = employeeInsertSideTrackerEngine.assignInsert({
        insert_tag: "INS-002",
        insert_type: "DCMT",
        part_id: "P-101",
        employee_id: "EMP-MV",
      });
      expect(a.corner_count).toBe(6);
    });

    it("creates a 3-corner TNMG assignment (single-sided)", () => {
      const a = employeeInsertSideTrackerEngine.assignInsert({
        insert_tag: "INS-003",
        insert_type: "TNMG",
        part_id: "P-102",
        employee_id: "EMP-MV",
      });
      expect(a.corner_count).toBe(3);
    });

    it("creates a 12-position round-insert assignment", () => {
      const a = employeeInsertSideTrackerEngine.assignInsert({
        insert_tag: "INS-004",
        insert_type: "RCMT",
        part_id: "P-103",
        employee_id: "EMP-MV",
      });
      expect(a.corner_count).toBe(12);
    });

    it("normalizes lowercase insert_type to uppercase", () => {
      const a = employeeInsertSideTrackerEngine.assignInsert({
        insert_tag: "INS-005",
        insert_type: "cnmg",
        part_id: "P-104",
        employee_id: "EMP-MV",
      });
      expect(a.insert_type).toBe("CNMG");
    });

    it("respects starting_corner override", () => {
      const a = employeeInsertSideTrackerEngine.assignInsert({
        insert_tag: "INS-006",
        insert_type: "CNMG",
        part_id: "P-105",
        starting_corner: 5,
        employee_id: "EMP-MV",
      });
      expect(a.active_corner).toBe(5);
    });

    it("R12 throws on unknown insert_type", () => {
      expect(() =>
        employeeInsertSideTrackerEngine.assignInsert({
          insert_tag: "INS-X",
          insert_type: "XXXX",
          part_id: "P-X",
          employee_id: "EMP-X",
        }),
      ).toThrow(/unknown insert_type/);
    });

    it("R12 throws on out-of-range starting_corner", () => {
      expect(() =>
        employeeInsertSideTrackerEngine.assignInsert({
          insert_tag: "INS-X",
          insert_type: "CNMG",
          part_id: "P-X",
          starting_corner: 99,
          employee_id: "EMP-X",
        }),
      ).toThrow(/starting_corner must be/);
    });

    it("R12 throws on missing required fields", () => {
      expect(() =>
        employeeInsertSideTrackerEngine.assignInsert({
          insert_tag: "",
          insert_type: "CNMG",
          part_id: "P-X",
          employee_id: "EMP-X",
        }),
      ).toThrow(/required/);
    });
  });

  describe("recordWear", () => {
    it("accumulates parts_cut + runtime on active corner only", () => {
      employeeInsertSideTrackerEngine.assignInsert({ insert_tag: "INS-W", insert_type: "CNMG", part_id: "P", employee_id: "E" });
      const a = employeeInsertSideTrackerEngine.recordWear({
        insert_tag: "INS-W",
        parts_cut_delta: 5,
        runtime_min_delta: 12.5,
      });
      const cur = a.corners.find((c) => c.corner === a.active_corner)!;
      expect(cur.parts_cut).toBe(5);
      expect(cur.runtime_min).toBe(12.5);
      const other = a.corners.find((c) => c.corner !== a.active_corner)!;
      expect(other.parts_cut).toBe(0);
    });

    it("updates wear_status when provided", () => {
      employeeInsertSideTrackerEngine.assignInsert({ insert_tag: "INS-W2", insert_type: "DCMT", part_id: "P", employee_id: "E" });
      const a = employeeInsertSideTrackerEngine.recordWear({
        insert_tag: "INS-W2",
        parts_cut_delta: 1,
        wear_status: "moderate_wear",
      });
      const cur = a.corners.find((c) => c.corner === a.active_corner)!;
      expect(cur.wear_status).toBe("moderate_wear");
    });

    it("R12 throws on negative deltas", () => {
      employeeInsertSideTrackerEngine.assignInsert({ insert_tag: "INS-N", insert_type: "CNMG", part_id: "P", employee_id: "E" });
      expect(() =>
        employeeInsertSideTrackerEngine.recordWear({ insert_tag: "INS-N", parts_cut_delta: -1 }),
      ).toThrow(/parts_cut_delta must be non-negative/);
    });

    it("R12 throws on unknown insert_tag", () => {
      expect(() =>
        employeeInsertSideTrackerEngine.recordWear({ insert_tag: "INS-NOPE", parts_cut_delta: 1 }),
      ).toThrow(/unknown insert_tag/);
    });
  });

  describe("rotate", () => {
    it("rotates active corner to next fresh; marks prior rotated_out", () => {
      employeeInsertSideTrackerEngine.assignInsert({ insert_tag: "INS-R", insert_type: "CNMG", part_id: "P", employee_id: "E" });
      const r = employeeInsertSideTrackerEngine.rotate({ insert_tag: "INS-R" });
      expect(r.active_corner).not.toBe(1);
      const c1 = r.corners.find((c) => c.corner === 1)!;
      expect(c1.wear_status).toBe("rotated_out");
    });

    it("THROWS when no usable corners remain (replacement needed)", () => {
      employeeInsertSideTrackerEngine.assignInsert({ insert_tag: "INS-DONE", insert_type: "TNMG", part_id: "P", employee_id: "E" });
      // TNMG has 3 corners — rotate 3 times → throws on 3rd
      employeeInsertSideTrackerEngine.rotate({ insert_tag: "INS-DONE" });
      employeeInsertSideTrackerEngine.rotate({ insert_tag: "INS-DONE" });
      expect(() => employeeInsertSideTrackerEngine.rotate({ insert_tag: "INS-DONE" })).toThrow(/no usable corners remain/);
    });
  });

  describe("suggestRotation", () => {
    it("suggests CONTINUE when wear is below threshold", () => {
      employeeInsertSideTrackerEngine.assignInsert({ insert_tag: "INS-S", insert_type: "CNMG", part_id: "P", employee_id: "E" });
      employeeInsertSideTrackerEngine.recordWear({ insert_tag: "INS-S", parts_cut_delta: 5 });
      const r = employeeInsertSideTrackerEngine.suggestRotation({ insert_tag: "INS-S" });
      expect(r.suggested_action).toBe("continue");
    });

    it("suggests ROTATE when parts_cut crosses threshold", () => {
      employeeInsertSideTrackerEngine.assignInsert({ insert_tag: "INS-S", insert_type: "CNMG", part_id: "P", employee_id: "E" });
      employeeInsertSideTrackerEngine.recordWear({ insert_tag: "INS-S", parts_cut_delta: 30 });
      const r = employeeInsertSideTrackerEngine.suggestRotation({ insert_tag: "INS-S" });
      expect(r.suggested_action).toBe("rotate");
      expect(r.next_corner).not.toBeNull();
      expect(r.reason).toMatch(/parts threshold/);
    });

    it("suggests ROTATE when runtime crosses threshold", () => {
      employeeInsertSideTrackerEngine.assignInsert({ insert_tag: "INS-S", insert_type: "CNMG", part_id: "P", employee_id: "E" });
      employeeInsertSideTrackerEngine.recordWear({ insert_tag: "INS-S", runtime_min_delta: 80 });
      const r = employeeInsertSideTrackerEngine.suggestRotation({ insert_tag: "INS-S" });
      expect(r.suggested_action).toBe("rotate");
      expect(r.reason).toMatch(/runtime threshold/);
    });

    it("suggests ROTATE when active corner marked worn", () => {
      employeeInsertSideTrackerEngine.assignInsert({ insert_tag: "INS-S", insert_type: "CNMG", part_id: "P", employee_id: "E" });
      employeeInsertSideTrackerEngine.recordWear({ insert_tag: "INS-S", wear_status: "worn" });
      const r = employeeInsertSideTrackerEngine.suggestRotation({ insert_tag: "INS-S" });
      expect(r.suggested_action).toBe("rotate");
    });

    it("suggests REPLACE when no usable corners remain", () => {
      employeeInsertSideTrackerEngine.assignInsert({ insert_tag: "INS-SX", insert_type: "TNMG", part_id: "P", employee_id: "E" });
      // Mark all corners worn
      employeeInsertSideTrackerEngine.recordWear({ insert_tag: "INS-SX", wear_status: "worn" });
      employeeInsertSideTrackerEngine.rotate({ insert_tag: "INS-SX" });
      employeeInsertSideTrackerEngine.recordWear({ insert_tag: "INS-SX", wear_status: "worn" });
      employeeInsertSideTrackerEngine.rotate({ insert_tag: "INS-SX" });
      employeeInsertSideTrackerEngine.recordWear({ insert_tag: "INS-SX", wear_status: "worn" });
      const r = employeeInsertSideTrackerEngine.suggestRotation({ insert_tag: "INS-SX" });
      expect(r.suggested_action).toBe("replace");
    });

    it("supports custom thresholds", () => {
      employeeInsertSideTrackerEngine.assignInsert({ insert_tag: "INS-CT", insert_type: "CNMG", part_id: "P", employee_id: "E" });
      employeeInsertSideTrackerEngine.recordWear({ insert_tag: "INS-CT", parts_cut_delta: 5 });
      const tight = employeeInsertSideTrackerEngine.suggestRotation({
        insert_tag: "INS-CT",
        parts_per_corner_threshold: 3,
      });
      expect(tight.suggested_action).toBe("rotate");
    });
  });

  describe("getStatus + listInsertTypes", () => {
    it("getStatus returns null on unknown insert_tag", () => {
      expect(employeeInsertSideTrackerEngine.getStatus("nope")).toBeNull();
    });

    it("listInsertTypes returns frozen list with corner counts", () => {
      const list = employeeInsertSideTrackerEngine.listInsertTypes();
      expect(Object.isFrozen(list)).toBe(true);
      const cnmg = list.find((t) => t.type === "CNMG");
      expect(cnmg?.corners).toBe(8);
      const dcmt = list.find((t) => t.type === "DCMT");
      expect(dcmt?.corners).toBe(6);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("all returned objects are frozen", () => {
      const a = employeeInsertSideTrackerEngine.assignInsert({ insert_tag: "INS-F", insert_type: "CNMG", part_id: "P", employee_id: "E" });
      expect(Object.isFrozen(a)).toBe(true);
      const s = employeeInsertSideTrackerEngine.suggestRotation({ insert_tag: "INS-F" });
      expect(Object.isFrozen(s)).toBe(true);
    });
  });
});
