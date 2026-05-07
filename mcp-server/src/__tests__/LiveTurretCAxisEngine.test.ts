/**
 * LiveTurretCAxisEngine Tests
 * @milestone LATHE-PROD-READY-MS0 U-LPR12b
 */

import { describe, it, expect } from "vitest";
import {
  liveTurretCAxisEngine,
  type MachineKinematics,
  type LiveToolOperation,
  type PolarInterpolationParams,
  type CylindricalInterpolationParams,
} from "../engines/LiveTurretCAxisEngine.js";

const OKUMA_LB3000: MachineKinematics = {
  machineId: "okuma-lb3000-y",
  controllerDialect: "okuma",
  hasCAxis: true,
  cAxisRange_deg: 360,
  yAxisType: "real_y",
  yAxisTravel_mm: 100,
  hasBAxis: false,
  maxLiveToolRpm: 6000,
  liveToolSpindleAddress: "S2",
  turretCount: 1,
};

const FANUC_LATHE: MachineKinematics = {
  machineId: "fanuc-lt2000",
  controllerDialect: "fanuc",
  hasCAxis: true,
  cAxisRange_deg: 360,
  yAxisType: "none",
  hasBAxis: false,
  maxLiveToolRpm: 4500,
  liveToolSpindleAddress: "S",
  turretCount: 1,
};

const NO_C_AXIS: MachineKinematics = {
  machineId: "basic-lathe",
  controllerDialect: "fanuc",
  hasCAxis: false,
  cAxisRange_deg: 0,
  yAxisType: "none",
  hasBAxis: false,
  maxLiveToolRpm: 0,
  liveToolSpindleAddress: "S",
  turretCount: 1,
};

describe("LiveTurretCAxisEngine", () => {
  describe("selectCAxisMode", () => {
    it("should select polar for face milling", () => {
      const op: LiveToolOperation = {
        operationType: "face_mill",
        toolDiameter_mm: 50,
        depth_mm: 5,
        feedrate_mmpm: 200,
        spindleRpm: 3000,
      };
      expect(liveTurretCAxisEngine.selectCAxisMode(OKUMA_LB3000, op)).toBe("polar");
    });

    it("should select cylindrical for OD slot", () => {
      const op: LiveToolOperation = {
        operationType: "od_slot",
        toolDiameter_mm: 10,
        depth_mm: 3,
        feedrate_mmpm: 100,
        spindleRpm: 2000,
      };
      expect(liveTurretCAxisEngine.selectCAxisMode(OKUMA_LB3000, op)).toBe("cylindrical");
    });

    it("should return cartesian when no C-axis", () => {
      const op: LiveToolOperation = {
        operationType: "face_mill",
        toolDiameter_mm: 50,
        depth_mm: 5,
        feedrate_mmpm: 200,
        spindleRpm: 3000,
      };
      expect(liveTurretCAxisEngine.selectCAxisMode(NO_C_AXIS, op)).toBe("cartesian");
    });

    it("should prefer cartesian for cross drill with real Y", () => {
      const op: LiveToolOperation = {
        operationType: "cross_drill",
        toolDiameter_mm: 8,
        depth_mm: 15,
        feedrate_mmpm: 80,
        spindleRpm: 1500,
      };
      expect(liveTurretCAxisEngine.selectCAxisMode(OKUMA_LB3000, op)).toBe("cartesian");
    });
  });

  describe("generatePolarInterpolation", () => {
    it("should generate Okuma G137/G136 codes", () => {
      const params: PolarInterpolationParams = {
        mode: "G137",
        centerX_mm: 0,
        centerZ_mm: 0,
        radius_mm: 25,
        startAngle_deg: 0,
        endAngle_deg: 90,
        feedrate_mmpm: 200,
        direction: "CCW",
      };
      const result = liveTurretCAxisEngine.generatePolarInterpolation(OKUMA_LB3000, params);

      expect(result.mode).toBe("polar");
      expect(result.lines).toContain("G137");
      expect(result.lines.some(l => l.includes("G136"))).toBe(true);
      expect(result.warnings).toHaveLength(0);
      expect(result.estimatedCycleTime_sec).toBeGreaterThan(0);
    });

    it("should generate Fanuc G12.1/G13.1 codes", () => {
      const params: PolarInterpolationParams = {
        mode: "G12.1",
        centerX_mm: 0,
        centerZ_mm: 0,
        radius_mm: 30,
        startAngle_deg: 0,
        endAngle_deg: 180,
        feedrate_mmpm: 150,
        direction: "CW",
      };
      const result = liveTurretCAxisEngine.generatePolarInterpolation(FANUC_LATHE, params);

      expect(result.lines).toContain("G12.1");
      expect(result.lines.some(l => l.includes("G02"))).toBe(true); // CW arc
    });

    it("should warn when no C-axis available", () => {
      const params: PolarInterpolationParams = {
        mode: "G137",
        centerX_mm: 0,
        centerZ_mm: 0,
        radius_mm: 25,
        startAngle_deg: 0,
        endAngle_deg: 90,
        feedrate_mmpm: 200,
        direction: "CCW",
      };
      const result = liveTurretCAxisEngine.generatePolarInterpolation(NO_C_AXIS, params);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.lines).toHaveLength(0);
    });
  });

  describe("generateCylindricalInterpolation", () => {
    it("should generate G07.1 for cylindrical mode", () => {
      const params: CylindricalInterpolationParams = {
        mode: "G07.1",
        cylinderDiameter_mm: 50,
        startZ_mm: 0,
        endZ_mm: -20,
        startAngle_deg: 0,
        endAngle_deg: 45,
        feedrate_mmpm: 100,
      };
      const result = liveTurretCAxisEngine.generateCylindricalInterpolation(OKUMA_LB3000, params);

      expect(result.mode).toBe("cylindrical");
      expect(result.lines.some(l => l.includes("G07.1"))).toBe(true);
      expect(result.estimatedCycleTime_sec).toBeGreaterThan(0);
    });
  });

  describe("generateLiveToolStart", () => {
    it("should generate Okuma M45 for CW", () => {
      const lines = liveTurretCAxisEngine.generateLiveToolStart(OKUMA_LB3000, 3000, "CW");
      expect(lines.some(l => l.includes("M19"))).toBe(true); // Orient
      expect(lines.some(l => l.includes("M45"))).toBe(true); // Live CW
      expect(lines.some(l => l.includes("3000"))).toBe(true); // RPM
    });

    it("should generate Fanuc M13 for CW", () => {
      const lines = liveTurretCAxisEngine.generateLiveToolStart(FANUC_LATHE, 2500, "CW");
      expect(lines.some(l => l.includes("M13"))).toBe(true);
    });

    it("should generate M46/M14 for CCW", () => {
      const okumaLines = liveTurretCAxisEngine.generateLiveToolStart(OKUMA_LB3000, 3000, "CCW");
      expect(okumaLines.some(l => l.includes("M46"))).toBe(true);

      const fanucLines = liveTurretCAxisEngine.generateLiveToolStart(FANUC_LATHE, 2500, "CCW");
      expect(fanucLines.some(l => l.includes("M14"))).toBe(true);
    });
  });

  describe("calculateYOffset", () => {
    it("should use real Y when available", () => {
      const op: LiveToolOperation = {
        operationType: "cross_drill",
        toolDiameter_mm: 8,
        depth_mm: 15,
        feedrate_mmpm: 80,
        spindleRpm: 1500,
        yOffset_mm: 12.5,
      };
      const result = liveTurretCAxisEngine.calculateYOffset(OKUMA_LB3000, op);
      expect(result.compensationMethod).toBe("real");
      expect(result.yOffset_mm).toBe(12.5);
    });

    it("should return none when no Y capability", () => {
      const op: LiveToolOperation = {
        operationType: "cross_drill",
        toolDiameter_mm: 8,
        depth_mm: 15,
        feedrate_mmpm: 80,
        spindleRpm: 1500,
        yOffset_mm: 12.5,
      };
      const result = liveTurretCAxisEngine.calculateYOffset(FANUC_LATHE, op);
      expect(result.compensationMethod).toBe("none");
      expect(result.yOffset_mm).toBe(0);
    });
  });

  describe("validateKinematics", () => {
    it("should validate capable machine", () => {
      const result = liveTurretCAxisEngine.validateKinematics(OKUMA_LB3000);
      expect(result.valid).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should flag missing C-axis", () => {
      const result = liveTurretCAxisEngine.validateKinematics(NO_C_AXIS);
      expect(result.valid).toBe(false);
      expect(result.issues).toContain("C-axis required for live tooling");
    });
  });

  describe("generateLiveToolSequence", () => {
    it("should generate complete face mill sequence", () => {
      const op: LiveToolOperation = {
        operationType: "face_mill",
        toolDiameter_mm: 50,
        depth_mm: 3,
        feedrate_mmpm: 250,
        spindleRpm: 4000,
        cAxisPosition_deg: 0,
        startAngle_deg: 0,
        endAngle_deg: 360,
      };
      const result = liveTurretCAxisEngine.generateLiveToolSequence(OKUMA_LB3000, op);

      expect(result.mode).toBe("polar");
      expect(result.lines.length).toBeGreaterThan(5);
      expect(result.lines.some(l => l.includes("LIVE TOOL"))).toBe(true);
    });
  });
});
