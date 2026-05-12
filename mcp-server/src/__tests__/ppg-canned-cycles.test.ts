/**
 * PPG-REAL S4a U-PPR14/15: Canned cycle tests.
 * Tests: Fanuc G81-G89, Siemens CYCLE81-87, Heidenhain CYCL DEF 200-207.
 * Verifies cycle syntax per controller family in the PRISM-Master.cps.
 */
import { describe, it, expect } from "vitest";
import * as fs from "fs";
import * as path from "path";

const CPS_PATH = path.resolve(__dirname, "../../scripts/fusion360-post/PRISM-Master.cps");
let cps: string;

function loadCps() {
  if (!cps) { cps = fs.readFileSync(CPS_PATH, "utf-8"); }
  return cps;
}

describe("U-PPR14: Fanuc-compatible canned cycles G81-G89", () => {
  it("G81 drilling present", () => {
    expect(loadCps()).toContain("gCycleModal.format(81)");
  });

  it("G82 counterboring with dwell (P word)", () => {
    const c = loadCps();
    expect(c).toContain("gCycleModal.format(82)");
    expect(c).toContain('"P" + secFormat.format(cycle.dwell)');
  });

  it("G83 peck drilling with Q depth word", () => {
    const c = loadCps();
    // G83 via ternary (deep-drilling ? 83 : 73)
    expect(c).toContain("? 83 : 73");
    expect(c).toContain('"Q" + xyzFormat.format(cycle.incrementalDepth)');
  });

  it("G84 rigid tapping with precise feed format", () => {
    const c = loadCps();
    expect(c).toContain("gCycleModal.format(84)");
    // Must use feedOutputPrecise, not feedOutput
    expect(c).toContain("feedOutputPrecise.format(F)");
  });

  it("G74 left-hand tapping", () => {
    expect(loadCps()).toContain("gCycleModal.format(74)");
  });

  it("G85 boring (feed out)", () => {
    expect(loadCps()).toContain("gCycleModal.format(85)");
  });

  it("G86 boring with spindle stop", () => {
    const c = loadCps();
    expect(c).toContain("gCycleModal.format(86)");
    expect(c).toContain('"stop-boring"');
  });

  it("G87 back boring with shift (Q word)", () => {
    const c = loadCps();
    expect(c).toContain("gCycleModal.format(87)");
    expect(c).toContain('"back-boring"');
    expect(c).toContain("cycle.shift");
  });

  it("G89 fine boring with dwell", () => {
    const c = loadCps();
    expect(c).toContain("gCycleModal.format(89)");
    expect(c).toContain('"fine-boring"');
  });

  it("G98/G99 retract plane handling", () => {
    expect(loadCps()).toContain("gRetractModal.format(98)");
  });
});

describe("U-PPR15: Siemens CYCLE81-87", () => {
  it("CYCLE81 drilling", () => {
    expect(loadCps()).toContain("MCALL CYCLE81(");
  });

  it("CYCLE82 counterboring with dwell", () => {
    expect(loadCps()).toContain("MCALL CYCLE82(");
  });

  it("CYCLE83 peck drilling", () => {
    expect(loadCps()).toContain("MCALL CYCLE83(");
  });

  it("CYCLE84 tapping", () => {
    expect(loadCps()).toContain("MCALL CYCLE84(");
  });

  it("CYCLE85 boring/reaming", () => {
    expect(loadCps()).toContain("MCALL CYCLE85(");
  });

  it("CYCLE86 boring orient spindle stop", () => {
    expect(loadCps()).toContain("MCALL CYCLE86(");
  });

  it("CYCLE87 back boring", () => {
    expect(loadCps()).toContain("MCALL CYCLE87(");
  });

  it("MCALL cancel at cycle end", () => {
    const c = loadCps();
    // Siemens cycle cancellation
    const mcallCancel = c.match(/writeln\("MCALL"\)/);
    expect(mcallCancel).not.toBeNull();
  });
});

describe("U-PPR15: Heidenhain CYCL DEF 200-207", () => {
  it("Heidenhain controller option exists in enum", () => {
    const c = loadCps();
    expect(c).toContain('"heidenhain"');
    expect(c).toContain("Heidenhain TNC 640");
  });

  it("CYCL DEF 200 DRILLING", () => {
    expect(loadCps()).toContain("CYCL DEF 200 DRILLING");
  });

  it("CYCL DEF 201 REAMING", () => {
    expect(loadCps()).toContain("CYCL DEF 201 REAMING");
  });

  it("CYCL DEF 202 BORING", () => {
    expect(loadCps()).toContain("CYCL DEF 202 BORING");
  });

  it("CYCL DEF 203 COUNTERSINKING (fine bore)", () => {
    expect(loadCps()).toContain("CYCL DEF 203 COUNTERSINKING");
  });

  it("CYCL DEF 204 BACK BORING", () => {
    expect(loadCps()).toContain("CYCL DEF 204 BACK BORING");
  });

  it("CYCL DEF 205 UNIVERSAL PECKING", () => {
    expect(loadCps()).toContain("CYCL DEF 205 UNIVERSAL PECKING");
  });

  it("CYCL DEF 206 TAPPING NEW (right-hand)", () => {
    expect(loadCps()).toContain("CYCL DEF 206 TAPPING NEW");
  });

  it("CYCL DEF 207 TAPPING NEW (left-hand)", () => {
    expect(loadCps()).toContain("CYCL DEF 207 TAPPING NEW");
  });

  it("Heidenhain uses CYCL CALL via M99 at position", () => {
    expect(loadCps()).toContain("M99");
  });

  it("Heidenhain uses Q-parameter format", () => {
    const c = loadCps();
    expect(c).toContain("Q200="); // Set-up clearance
    expect(c).toContain("Q201="); // Depth
    expect(c).toContain("Q206="); // Feed rate
    expect(c).toContain("Q239="); // Pitch (tapping)
  });

  it("Heidenhain program structure: BEGIN PGM / END PGM", () => {
    const c = loadCps();
    expect(c).toContain("BEGIN PGM PRISM MM");
    expect(c).toContain("END PGM PRISM MM");
  });

  it("Heidenhain tool call format: TOOL CALL n Z Sn", () => {
    expect(loadCps()).toContain("TOOL CALL ");
  });

  it("Heidenhain M120 look-ahead smoothing", () => {
    const c = loadCps();
    expect(c).toContain("M120 ");
    expect(c).toContain("LA0.01");  // finish
    expect(c).toContain("LA5.0");   // rough
  });
});
