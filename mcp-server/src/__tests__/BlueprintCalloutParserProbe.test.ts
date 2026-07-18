/**
 * BlueprintCalloutParserProbe — CAM-AI-TRAINING-MS0/U-CAMT-PARSER-PROBE
 *
 * 5-fixture probe of the BlueprintCalloutParserEngine against realistic
 * JM-Die-style blueprint text patterns spanning mill / lathe / wedm /
 * complex / simple part profiles. Measures extraction fidelity for the
 * "100% accuracy on all prints in the system" operator gate.
 */
import { describe, it, expect } from "vitest";
import { blueprintCalloutParserEngine } from "../engines/BlueprintCalloutParserEngine.js";

const FIXTURES: Array<{
  name: string;
  text: string;
  expect: {
    material?: RegExp;
    minDimensions?: number;
    minThreads?: number;
    minGDT?: number;
    minSurfaceFinishes?: number;
    partNumber?: string;
    revision?: string;
  };
}> = [
  {
    name: "simple-mill-bracket",
    text: `
PART NUMBER: BRKT-220
REVISION: B
MATERIAL: 6061-T6
SCALE: 1:1

Hole 1: ⌖ 0.10 MMC A B
M6x1.0 thru
Top face Ra 1.6
Side dim: 50.0 ±0.05
`,
    expect: {
      material: /6061-T6/,
      minDimensions: 1,
      minThreads: 1,
      minGDT: 1,
      minSurfaceFinishes: 1,
      partNumber: "BRKT-220",
      revision: "B",
    },
  },
  {
    name: "lathe-shaft",
    text: `
PART NUMBER: SHAFT-451
REVISION: A
MATERIAL: AISI 4140
SCALE: 1:2

OD: 25.000 +.013/-.000
ID: 12.000 ±0.025
Length: 152.4 ±0.13
Surface finish: Ra 0.8 on OD, Ra 1.6 on bore
1/4-20 UNC-2A thread on end
⌭ 0.025 A
`,
    expect: {
      material: /AISI/,
      minDimensions: 2,
      minThreads: 1,
      minGDT: 1,
      minSurfaceFinishes: 2,
      partNumber: "SHAFT-451",
      revision: "A",
    },
  },
  {
    name: "wedm-die-insert",
    text: `
PART NUMBER: DIE-INSERT-018
REVISION: C
MATERIAL: D2 tool steel
SCALE: 1:1

Cavity profile: per CAD
Pocket depth: 12.50 +.05/-.00
⌒ 0.005 (profile of surface)
⏥ 0.010
Surface: Ra 0.4
`,
    expect: {
      material: /D-?2/i,
      minDimensions: 1,
      minGDT: 1,
      minSurfaceFinishes: 1,
      partNumber: "DIE-INSERT-018",
    },
  },
  {
    name: "complex-5axis-impeller",
    text: `
PART NUMBER: IMP-007
REVISION: D
MATERIAL: Ti-6Al-4V
SCALE: 2:1

Hub OD: 80.0 ±0.03
Blade count: 7
Blade trailing edge Ra 0.4
Blade leading edge Ra 0.8
⌭ 0.020 datum A
⌖ 0.030 MMC A B C
M10x1.5-6H bolt circle
`,
    expect: {
      material: /Ti-6Al-4V/,
      minDimensions: 1,
      minThreads: 1,
      minGDT: 2,
      minSurfaceFinishes: 2,
      partNumber: "IMP-007",
      revision: "D",
    },
  },
  {
    name: "minimal-stamping-blank",
    text: `
PART NUMBER: BLANK-099
MATERIAL: 1018 cold rolled
Thickness: 1.5 ±0.05
No GD&T callouts
`,
    expect: {
      material: /1018|AISI/i,
      minDimensions: 1,
      partNumber: "BLANK-099",
    },
  },
];

describe("BlueprintCalloutParser probe — 5 JM-Die-style fixtures", () => {
  for (const fixture of FIXTURES) {
    it(`${fixture.name} parses with expected fidelity`, () => {
      const result = blueprintCalloutParserEngine.parse(fixture.text);

      if (fixture.expect.material) {
        expect(result.materialSpec).toMatch(fixture.expect.material);
      }
      if (fixture.expect.minDimensions != null) {
        expect(result.dimensions.length).toBeGreaterThanOrEqual(fixture.expect.minDimensions);
      }
      if (fixture.expect.minThreads != null) {
        expect(result.threads.length).toBeGreaterThanOrEqual(fixture.expect.minThreads);
      }
      if (fixture.expect.minGDT != null) {
        expect(result.gdt.length).toBeGreaterThanOrEqual(fixture.expect.minGDT);
      }
      if (fixture.expect.minSurfaceFinishes != null) {
        expect(result.surfaceFinishes.length).toBeGreaterThanOrEqual(fixture.expect.minSurfaceFinishes);
      }
      if (fixture.expect.partNumber) {
        expect(result.titleBlock.partNumber).toBe(fixture.expect.partNumber);
      }
      if (fixture.expect.revision) {
        expect(result.titleBlock.revision).toBe(fixture.expect.revision);
      }
    });
  }

  it("aggregate probe: all 5 fixtures produce non-empty title-block partNumber", () => {
    for (const fixture of FIXTURES) {
      const result = blueprintCalloutParserEngine.parse(fixture.text);
      expect(typeof result.titleBlock.partNumber).toBe("string");
      expect(result.titleBlock.partNumber!.length).toBeGreaterThan(0);
    }
  });
});
