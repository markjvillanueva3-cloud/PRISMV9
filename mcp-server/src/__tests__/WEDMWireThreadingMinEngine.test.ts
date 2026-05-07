/**
 * WEDMWireThreadingMinEngine Tests
 * U-PROD-15: Wire threading optimization
 */

import { describe, it, expect } from "vitest";
import {
  wedmWireThreadingMinEngine,
  WEDMWireThreadingMinEngine,
  type ThreadingProfile,
} from "../engines/WEDMWireThreadingMinEngine.js";

describe("WEDMWireThreadingMinEngine", () => {
  describe("calculateThreadingTime", () => {
    it("returns base time for standard profile", () => {
      const profile: ThreadingProfile = {
        id: "1",
        start_point: { x: 0, y: 0 },
        end_point: { x: 10, y: 0 },
        has_pilot_hole: false,
        thickness_mm: 0,
      };

      const time = wedmWireThreadingMinEngine.calculateThreadingTime(profile, {
        profiles: [profile],
        base_threading_time_sec: 45,
      });

      expect(time).toBe(45);
    });

    it("reduces time for pilot hole", () => {
      const profile: ThreadingProfile = {
        id: "1",
        start_point: { x: 0, y: 0 },
        end_point: { x: 10, y: 0 },
        has_pilot_hole: true,
        thickness_mm: 0,
      };

      const time = wedmWireThreadingMinEngine.calculateThreadingTime(profile, {
        profiles: [profile],
        base_threading_time_sec: 45,
        pilot_hole_time_factor: 0.4,
      });

      expect(time).toBe(18); // 45 * 0.4
    });

    it("increases time for submerged threading", () => {
      const profile: ThreadingProfile = {
        id: "1",
        start_point: { x: 0, y: 0 },
        end_point: { x: 10, y: 0 },
        has_pilot_hole: false,
        thickness_mm: 0,
        is_submerged: true,
      };

      const time = wedmWireThreadingMinEngine.calculateThreadingTime(profile, {
        profiles: [profile],
        base_threading_time_sec: 45,
        submerged_time_factor: 1.3,
      });

      expect(time).toBeCloseTo(58.5, 1); // 45 * 1.3
    });

    it("adds time for thickness", () => {
      const profile: ThreadingProfile = {
        id: "1",
        start_point: { x: 0, y: 0 },
        end_point: { x: 10, y: 0 },
        has_pilot_hole: false,
        thickness_mm: 50,
      };

      const time = wedmWireThreadingMinEngine.calculateThreadingTime(profile, {
        profiles: [profile],
        base_threading_time_sec: 45,
        thickness_time_factor_per_mm: 0.5,
      });

      expect(time).toBe(70); // 45 + 50*0.5
    });
  });

  describe("canShareThreading", () => {
    it("returns true for adjacent profiles", () => {
      const p1: ThreadingProfile = {
        id: "1",
        start_point: { x: 0, y: 0 },
        end_point: { x: 10, y: 0 },
        has_pilot_hole: false,
        thickness_mm: 25,
      };

      const p2: ThreadingProfile = {
        id: "2",
        start_point: { x: 10, y: 0 },
        end_point: { x: 20, y: 0 },
        has_pilot_hole: false,
        thickness_mm: 25,
      };

      const canShare = wedmWireThreadingMinEngine.canShareThreading(p1, p2, {
        profiles: [p1, p2],
        allow_sequence_threading: true,
      });

      expect(canShare).toBe(true);
    });

    it("returns false for distant profiles", () => {
      const p1: ThreadingProfile = {
        id: "1",
        start_point: { x: 0, y: 0 },
        end_point: { x: 10, y: 0 },
        has_pilot_hole: false,
        thickness_mm: 25,
      };

      const p2: ThreadingProfile = {
        id: "2",
        start_point: { x: 100, y: 100 },
        end_point: { x: 110, y: 100 },
        has_pilot_hole: false,
        thickness_mm: 25,
      };

      const canShare = wedmWireThreadingMinEngine.canShareThreading(p1, p2, {
        profiles: [p1, p2],
        allow_sequence_threading: true,
      });

      expect(canShare).toBe(false);
    });

    it("returns false when sequence threading disabled", () => {
      const p1: ThreadingProfile = {
        id: "1",
        start_point: { x: 0, y: 0 },
        end_point: { x: 10, y: 0 },
        has_pilot_hole: false,
        thickness_mm: 25,
      };

      const p2: ThreadingProfile = {
        id: "2",
        start_point: { x: 10, y: 0 },
        end_point: { x: 20, y: 0 },
        has_pilot_hole: false,
        thickness_mm: 25,
      };

      const canShare = wedmWireThreadingMinEngine.canShareThreading(p1, p2, {
        profiles: [p1, p2],
        allow_sequence_threading: false,
      });

      expect(canShare).toBe(false);
    });
  });

  describe("validatePilotHole", () => {
    it("validates adequate pilot hole", () => {
      const profile: ThreadingProfile = {
        id: "1",
        start_point: { x: 0, y: 0 },
        end_point: { x: 10, y: 0 },
        has_pilot_hole: true,
        pilot_hole_diameter_mm: 1.0,
        thickness_mm: 25,
      };

      const result = wedmWireThreadingMinEngine.validatePilotHole(profile, 0.25);

      expect(result.valid).toBe(true);
    });

    it("invalidates too-small pilot hole", () => {
      const profile: ThreadingProfile = {
        id: "1",
        start_point: { x: 0, y: 0 },
        end_point: { x: 10, y: 0 },
        has_pilot_hole: true,
        pilot_hole_diameter_mm: 0.26,
        thickness_mm: 25,
      };

      const result = wedmWireThreadingMinEngine.validatePilotHole(profile, 0.25);

      expect(result.valid).toBe(false);
      expect(result.message).toContain("too small");
    });
  });

  describe("optimize", () => {
    it("optimizes threading operations", () => {
      const profiles: ThreadingProfile[] = [
        {
          id: "1",
          start_point: { x: 0, y: 0 },
          end_point: { x: 10, y: 0 },
          has_pilot_hole: true,
          thickness_mm: 25,
        },
      ];

      const result = wedmWireThreadingMinEngine.optimize({
        profiles,
      });

      expect(result.threading_operations).toHaveLength(1);
      expect(result.threading_operations[0].threading_type).toBe("pilot_hole");
    });

    it("combines sequential profiles", () => {
      const profiles: ThreadingProfile[] = [
        {
          id: "1",
          start_point: { x: 0, y: 0 },
          end_point: { x: 10, y: 0 },
          has_pilot_hole: true,
          thickness_mm: 25,
        },
        {
          id: "2",
          start_point: { x: 10, y: 0 },
          end_point: { x: 20, y: 0 },
          has_pilot_hole: false,
          thickness_mm: 25,
        },
      ];

      const result = wedmWireThreadingMinEngine.optimize({
        profiles,
        allow_sequence_threading: true,
      });

      expect(result.threading_operations).toHaveLength(1);
      expect(result.threading_operations[0].profile_ids).toContain("1");
      expect(result.threading_operations[0].profile_ids).toContain("2");
      expect(result.saved_threading_ops).toBe(1);
    });

    it("calculates saved time", () => {
      const profiles: ThreadingProfile[] = [
        {
          id: "1",
          start_point: { x: 0, y: 0 },
          end_point: { x: 10, y: 0 },
          has_pilot_hole: true,
          thickness_mm: 25,
        },
        {
          id: "2",
          start_point: { x: 10, y: 0 },
          end_point: { x: 20, y: 0 },
          has_pilot_hole: false,
          thickness_mm: 25,
        },
      ];

      const result = wedmWireThreadingMinEngine.optimize({
        profiles,
        allow_sequence_threading: true,
      });

      expect(result.saved_time_sec).toBeGreaterThan(0);
    });

    it("generates recommendations for non-pilot profiles", () => {
      const profiles: ThreadingProfile[] = [
        {
          id: "1",
          start_point: { x: 0, y: 0 },
          end_point: { x: 10, y: 0 },
          has_pilot_hole: false,
          thickness_mm: 25,
        },
      ];

      const result = wedmWireThreadingMinEngine.optimize({
        profiles,
      });

      expect(result.recommendations.some(r => r.includes("pilot holes"))).toBe(true);
    });

    it("handles edge start threading", () => {
      const profiles: ThreadingProfile[] = [
        {
          id: "1",
          start_point: { x: 0, y: 0 },
          end_point: { x: 10, y: 0 },
          has_pilot_hole: false,
          thickness_mm: 25,
        },
      ];

      const result = wedmWireThreadingMinEngine.optimize({
        profiles,
      });

      expect(result.threading_operations[0].threading_type).toBe("edge_start");
    });
  });

  describe("estimateTime", () => {
    it("returns formatted time estimate", () => {
      const profiles: ThreadingProfile[] = [
        {
          id: "1",
          start_point: { x: 0, y: 0 },
          end_point: { x: 10, y: 0 },
          has_pilot_hole: true,
          thickness_mm: 25,
        },
      ];

      const est = wedmWireThreadingMinEngine.estimateTime({
        profiles,
      });

      expect(est.total_sec).toBeGreaterThan(0);
      expect(est.formatted).toBeTruthy();
    });
  });

  describe("configuration", () => {
    it("can update configuration", () => {
      const engine = new WEDMWireThreadingMinEngine();
      engine.configure({ base_threading_time_sec: 60 });

      expect(engine.getConfig().base_threading_time_sec).toBe(60);
    });
  });
});
