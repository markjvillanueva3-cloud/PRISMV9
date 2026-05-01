/**
 * U-W100-31: Wire Break Recovery — N-Block Restart Markers + Inter-Profile Threading
 *
 * Validates:
 *   1. Restart markers (N-blocks) at every profile/pass boundary for all 5 dialects
 *   2. Wire cut → rapid → re-thread sequence between multi-profile programs
 *   3. Controller-specific M-codes: Mitsubishi M20/M21, Fanuc M50/M60,
 *      Sodick M60/M61, Makino M60/M61, AgieCharmilles M50/M51
 *   4. Restart marker N-block numbering scheme: N{(profile+1)*1000 + (pass+1)*100}
 *   5. RestartMarker[] array in EDMGCodeResult
 */
import { describe, it, expect } from "vitest";
import { EDMPostProcessGCodeEngine } from "../engines/EDMPostProcessGCodeEngine.js";
import type {
  EDMGCodeInput,
  EDMGCodeResult,
  EDMProfile,
  EDMPass,
  WireEDMController,
  RestartMarker,
} from "../engines/EDMPostProcessGCodeEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

/** Simple square contour for testing */
function squareProfile(name: string, startX: number, startY: number): EDMProfile {
  return {
    name,
    contour_points: [
      { x: startX, y: startY },
      { x: startX + 20, y: startY },
      { x: startX + 20, y: startY + 20 },
      { x: startX, y: startY + 20 },
      { x: startX, y: startY },
    ],
    start_hole: { x: startX + 10, y: startY + 10 },
    approach: { type: "perpendicular", length_mm: 2 },
    departure: { type: "perpendicular", length_mm: 2 },
  };
}

/** Standard 4-pass setup (rough + 3 skims) */
function fourPasses(): EDMPass[] {
  return [
    { pass_number: 1, offset_mm: 0.160, technology_table: "E1221", wire_speed_m_min: 12, tension_N: 15 },
    { pass_number: 2, offset_mm: 0.090, technology_table: "E1222", wire_speed_m_min: 8, tension_N: 12 },
    { pass_number: 3, offset_mm: 0.065, technology_table: "E1223", wire_speed_m_min: 6, tension_N: 10 },
    { pass_number: 4, offset_mm: 0.053, technology_table: "E1224", wire_speed_m_min: 6, tension_N: 10 },
  ];
}

/** Single-profile input */
function singleProfileInput(controller: WireEDMController): EDMGCodeInput {
  return {
    controller,
    profiles: [squareProfile("cavity-1", 0, 0)],
    passes: fourPasses(),
    wire_type: "brass_0.25",
    program_number: 1001,
    units: "metric",
    submerged: true,
  };
}

/** Multi-profile input (2 profiles — tests inter-profile threading) */
function multiProfileInput(controller: WireEDMController): EDMGCodeInput {
  return {
    controller,
    profiles: [
      squareProfile("cavity-1", 0, 0),
      squareProfile("cavity-2", 50, 0),
    ],
    passes: fourPasses(),
    wire_type: "brass_0.25",
    program_number: 1001,
    units: "metric",
    submerged: true,
  };
}

const ALL_CONTROLLERS: WireEDMController[] = [
  "fanuc", "sodick", "makino", "mitsubishi", "agiecharmilles",
];

/** Controller-specific M-codes for wire threading */
const THREAD_CODES: Record<WireEDMController, { thread: string; cut: string }> = {
  fanuc: { thread: "M50", cut: "M60" },
  sodick: { thread: "M60", cut: "M61" },
  makino: { thread: "M60", cut: "M61" },
  mitsubishi: { thread: "M20", cut: "M21" },
  agiecharmilles: { thread: "M50", cut: "M51" },
};

// ============================================================================
// TESTS
// ============================================================================

const engine = new EDMPostProcessGCodeEngine();

describe("U-W100-31: Wire Break Recovery", () => {

  describe("Restart markers present for all controllers", () => {
    for (const ctrl of ALL_CONTROLLERS) {
      it(`${ctrl}: has restart markers for single-profile 4-pass program`, () => {
        const result = engine.generate_gcode(singleProfileInput(ctrl));
        expect(result.restart_markers).toBeDefined();
        expect(result.restart_markers!.length).toBe(4); // 1 profile × 4 passes

        // Verify N-block numbering scheme: N{(profile+1)*1000 + (pass+1)*100}
        expect(result.restart_markers![0].n_block).toBe(1100); // Profile 1, Pass 1
        expect(result.restart_markers![1].n_block).toBe(1200); // Profile 1, Pass 2
        expect(result.restart_markers![2].n_block).toBe(1300); // Profile 1, Pass 3
        expect(result.restart_markers![3].n_block).toBe(1400); // Profile 1, Pass 4
      });

      it(`${ctrl}: has restart markers for multi-profile program`, () => {
        const result = engine.generate_gcode(multiProfileInput(ctrl));
        expect(result.restart_markers).toBeDefined();
        expect(result.restart_markers!.length).toBe(8); // 2 profiles × 4 passes

        // Profile 1 markers
        expect(result.restart_markers![0].n_block).toBe(1100);
        expect(result.restart_markers![0].profile_index).toBe(0);
        expect(result.restart_markers![0].pass_index).toBe(0);

        // Profile 2 markers
        expect(result.restart_markers![4].n_block).toBe(2100);
        expect(result.restart_markers![4].profile_index).toBe(1);
        expect(result.restart_markers![4].pass_index).toBe(0);

        expect(result.restart_markers![7].n_block).toBe(2400);
        expect(result.restart_markers![7].profile_index).toBe(1);
        expect(result.restart_markers![7].pass_index).toBe(3);
      });
    }
  });

  describe("Restart marker N-blocks appear in G-code", () => {
    for (const ctrl of ALL_CONTROLLERS) {
      it(`${ctrl}: G-code contains N-block restart markers`, () => {
        const result = engine.generate_gcode(singleProfileInput(ctrl));
        // N1100 should appear in the G-code text
        expect(result.gcode).toContain("N1100");
        expect(result.gcode).toContain("N1200");
        expect(result.gcode).toContain("N1300");
        expect(result.gcode).toContain("N1400");
        // Should contain RESTART MARKER comment
        expect(result.gcode).toMatch(/RESTART MARKER/);
      });
    }
  });

  describe("Restart marker labels are descriptive", () => {
    it("labels include profile number, pass number, and pass type", () => {
      const result = engine.generate_gcode(singleProfileInput("fanuc"));
      const markers = result.restart_markers!;
      expect(markers[0].label).toContain("PROFILE 1");
      expect(markers[0].label).toContain("PASS 1");
      expect(markers[0].label).toMatch(/ROUGH/i);
      expect(markers[1].label).toContain("PASS 2");
      expect(markers[1].label).toMatch(/TRIM/i);
    });
  });

  describe("Inter-profile wire threading for all controllers", () => {
    for (const ctrl of ALL_CONTROLLERS) {
      it(`${ctrl}: multi-profile program has wire cut + re-thread between profiles`, () => {
        const result = engine.generate_gcode(multiProfileInput(ctrl));
        const codes = THREAD_CODES[ctrl];
        const gcode = result.gcode;

        // Should have wire cut M-code in the program
        expect(gcode).toContain(codes.cut);
        // Should have wire thread M-code in the program
        expect(gcode).toContain(codes.thread);

        // Verify sequence: cut appears before the second profile's thread
        const lines = gcode.split("\n");
        let foundCutBeforeProfile2 = false;
        let passedProfile1 = false;
        for (const line of lines) {
          if (line.includes("PROFILE 2") || line.includes("PROFILE  2")) {
            passedProfile1 = true;
          }
          if (passedProfile1 && line.includes(codes.cut)) {
            // If we already passed profile 2 header but found cut, it's within profile 2
            // We need cut BEFORE profile 2
            break;
          }
          if (!passedProfile1 && line.includes(codes.cut)) {
            foundCutBeforeProfile2 = true;
          }
        }
        expect(foundCutBeforeProfile2).toBe(true);
      });

      it(`${ctrl}: uses correct controller-specific M-codes`, () => {
        const result = engine.generate_gcode(multiProfileInput(ctrl));
        const codes = THREAD_CODES[ctrl];
        // Both thread and cut codes must appear
        expect(result.gcode).toContain(codes.thread);
        expect(result.gcode).toContain(codes.cut);
      });
    }
  });

  describe("Single-profile programs still work correctly", () => {
    for (const ctrl of ALL_CONTROLLERS) {
      it(`${ctrl}: single profile generates valid G-code`, () => {
        const result = engine.generate_gcode(singleProfileInput(ctrl));
        expect(result.gcode.length).toBeGreaterThan(100);
        expect(result.line_count).toBeGreaterThan(10);
        expect(result.passes_generated).toBe(4);
        expect(result.profiles_cut).toBe(1);
      });
    }
  });

  describe("Restart markers are monotonically increasing", () => {
    it("N-blocks increase across profiles and passes", () => {
      const result = engine.generate_gcode(multiProfileInput("mitsubishi"));
      const markers = result.restart_markers!;
      for (let i = 1; i < markers.length; i++) {
        expect(markers[i].n_block).toBeGreaterThan(markers[i - 1].n_block);
      }
    });
  });

  describe("Wire break recovery data completeness", () => {
    it("every restart marker has valid profile and pass indices", () => {
      const result = engine.generate_gcode(multiProfileInput("fanuc"));
      const markers = result.restart_markers!;
      for (const m of markers) {
        expect(m.profile_index).toBeGreaterThanOrEqual(0);
        expect(m.profile_index).toBeLessThan(2);
        expect(m.pass_index).toBeGreaterThanOrEqual(0);
        expect(m.pass_index).toBeLessThan(4);
        expect(m.label.length).toBeGreaterThan(5);
        expect(m.n_block).toBeGreaterThan(0);
      }
    });

    it("restart markers cover all profiles × passes", () => {
      const input = multiProfileInput("sodick");
      const result = engine.generate_gcode(input);
      const markers = result.restart_markers!;
      const expected = input.profiles.length * input.passes.length;
      expect(markers.length).toBe(expected);

      // Every (profile, pass) pair should be covered
      const seen = new Set<string>();
      for (const m of markers) {
        seen.add(`${m.profile_index}-${m.pass_index}`);
      }
      for (let pi = 0; pi < input.profiles.length; pi++) {
        for (let pa = 0; pa < input.passes.length; pa++) {
          expect(seen.has(`${pi}-${pa}`)).toBe(true);
        }
      }
    });
  });

  describe("G-code structure preserved", () => {
    for (const ctrl of ALL_CONTROLLERS) {
      it(`${ctrl}: G-code still starts with program header`, () => {
        const result = engine.generate_gcode(singleProfileInput(ctrl));
        expect(result.gcode).toMatch(/^%/);
      });

      it(`${ctrl}: G-code ends with program end`, () => {
        const result = engine.generate_gcode(singleProfileInput(ctrl));
        const lastNonEmpty = result.gcode.split("\n").filter(l => l.trim().length > 0).pop()!;
        expect(lastNonEmpty).toMatch(/M02|M30|%/);
      });
    }
  });
});
