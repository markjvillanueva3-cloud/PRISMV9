/**
 * OkumaB250LatheMasterPostEngine.SubSpindleTransfer.test.ts
 *
 * Reference-value + safety-ordering coverage for the VERIFIED Okuma Multus B250
 * sub-spindle (SP2) part-transfer emit (U-PP-SUBSPINDLE-EMIT, slot:echo).
 *
 * The codes are transcribed from JM Die's own running programs
 * (JM DIE/CNC OKUMA MULTUS/MARK'S {GRAB AND PULL, WORKING SPINDLE GRAB-PULL-CUTOFF}.min),
 * so these tests encode the *machine-true intent* (R9), NOT incidental formatting:
 *   - the verified codes are present and the WRONG ones (M38/M39, collet M68/M69,
 *     M227/M228, M87/M89, G145/G146) are absent;
 *   - the NO-DROP invariant: sub chuck CLAMPS (M248) before the main UNCLAMPS (M84);
 *   - every chuck state-change is immediately followed by a `G4 F<sec>` dwell;
 *   - synchronized rotation (M151) is ON before the sub approaches; OFF (M150) after;
 *   - interlock release brackets the transfer;
 *   - additive: a program with no transfer spec is byte-unchanged (no M248 anywhere);
 *   - fail-loud on a non-finite W (a malformed sub move is crash-class) [adversarial].
 */
import { describe, it, expect } from "vitest";
import {
  OkumaB250LatheMasterPostEngine,
  type TurningOperation,
  type SubSpindleTransferSpec,
} from "../engines/OkumaB250LatheMasterPostEngine.js";

const engine = new OkumaB250LatheMasterPostEngine();

/** A clean OD roughing op that passes every physics gate. */
function odRough(overrides: Partial<TurningOperation> = {}): TurningOperation {
  return {
    operation_type: "od_rough",
    tool_number: 1,
    tool_orientation: 3,
    insert_radius_mm: 0.8,
    material_iso: "P",
    css_m_min: 200,
    feed_mm_rev: 0.25,
    depth_of_cut_mm: 2,
    start_x: 50,
    start_z: 0,
    end_x: 48,
    end_z: -30,
    coolant: "flood",
    ...overrides,
  };
}

const BAR_PULL: SubSpindleTransferSpec = {
  grab_w_in: -2.341,
  bar_pull_w_in: -1.06,
  return_w_in: 31.8898,
};

/** Emit a program WITH a sub-spindle transfer on the verified Multus B250. */
function withTransfer(spec: SubSpindleTransferSpec = BAR_PULL) {
  return engine.generateProgram([odRough()], {
    machine_id: "MULTUS-B250II",
    sub_spindle_enabled: true,
    sub_spindle_transfer: spec,
  });
}

/** First index of a line that includes `needle` (-1 if absent). */
const idx = (gcode: string[], needle: string) => gcode.findIndex((l) => l.includes(needle));

describe("OkumaB250 sub-spindle transfer — verified codes present, wrong codes absent", () => {
  it("emits the verified Multus B250 chuck/sync/interlock codes", () => {
    const text = withTransfer().gcode.join("\n");
    // sub + main CHUCK clamp/unclamp
    expect(text).toContain("M248 (CLAMP SUB CHUCK)");
    expect(text).toContain("M249 (UNCLAMP SUB CHUCK)");
    expect(text).toContain("M83 (CLAMP MAIN CHUCK)");
    expect(text).toContain("M84 (UNCLAMP MAIN CHUCK)");
    // synchronized rotation
    expect(text).toContain("M151 (SYNCHRONIZED ROTATION ON)");
    expect(text).toContain("M150 (SYNCHRONIZED ROTATION OFF)");
    // interlock release bracket
    expect(text).toContain("M247 (SUB CHUCK INTERLOCK RELEASE ON)");
    expect(text).toContain("M185 (MAIN CHUCK INTERLOCK RELEASE ON)");
    expect(text).toContain("M246 (SUB CHUCK INTERLOCK RELEASE OFF)");
    expect(text).toContain("M184 (MAIN CHUCK INTERLOCK RELEASE OFF)");
    // sub-spindle longitudinal moves are on the W axis
    expect(text).toContain("W-2.341");
    expect(text).toContain("W31.8898");
    expect(text).toContain("W0.");
  });

  it("does NOT emit any of the divergent/wrong sub-spindle code sets", () => {
    const text = withTransfer().gcode.join("\n");
    // the wrong tip codes
    expect(text).not.toMatch(/\bM38\b/);
    expect(text).not.toMatch(/\bM39\b/);
    // PPOkumaSubSpindleSyncEngine's (LU3000) codes
    expect(text).not.toMatch(/\bM227\b/);
    expect(text).not.toMatch(/\bM228\b/);
    expect(text).not.toMatch(/\bM87\b/);
    expect(text).not.toMatch(/\bM89\b/);
    expect(text).not.toMatch(/\bG145\b/);
    expect(text).not.toMatch(/\bG146\b/);
    // collet codes from PAT-005/PAT-008
    expect(text).not.toMatch(/\bM68\b/);
    expect(text).not.toMatch(/\bM69\b/);
    expect(text).not.toMatch(/\bM102\b/);
    expect(text).not.toMatch(/\bM111\b/);
  });

  it("uses Okuma OSP dwell (G4 F<sec>), never Fanuc G04 P<ms>, inside the transfer block", () => {
    const lines = withTransfer().gcode;
    const start = idx(lines, "SUB-SPINDLE PART TRANSFER");
    const block = lines.slice(start);
    expect(block.some((l) => /^G4 F1\.$/.test(l))).toBe(true);
    expect(block.some((l) => /^G4 F3\.$/.test(l))).toBe(true);
    expect(block.some((l) => /G04 P/.test(l))).toBe(false);
  });
});

describe("OkumaB250 sub-spindle transfer — safety-ordering invariants", () => {
  it("NO-DROP: the sub chuck clamps (M248) BEFORE the main unclamps (M84)", () => {
    const lines = withTransfer().gcode;
    const subClamp = idx(lines, "M248 (CLAMP SUB CHUCK)");
    const mainUnclamp = idx(lines, "M84 (UNCLAMP MAIN CHUCK)");
    expect(subClamp).toBeGreaterThanOrEqual(0);
    expect(mainUnclamp).toBeGreaterThanOrEqual(0);
    expect(subClamp).toBeLessThan(mainUnclamp); // never both chucks released at once
  });

  it("every chuck clamp/unclamp is immediately followed by a G4 dwell", () => {
    const lines = withTransfer().gcode;
    const chuckOps = ["M248 (CLAMP SUB CHUCK)", "M249 (UNCLAMP SUB CHUCK)", "M83 (CLAMP MAIN CHUCK)", "M84 (UNCLAMP MAIN CHUCK)"];
    for (const op of chuckOps) {
      const i = idx(lines, op);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(lines[i + 1]).toMatch(/^G4 F/); // next line is a dwell
    }
  });

  it("synchronized rotation is ON before the sub approaches, and OFF after re-clamp", () => {
    const lines = withTransfer().gcode;
    const syncOn = idx(lines, "M151 (SYNCHRONIZED ROTATION ON)");
    const approach = idx(lines, "(SUB APPROACH/GRAB)");
    const mainReclamp = idx(lines, "M83 (CLAMP MAIN CHUCK)");
    const syncOff = idx(lines, "M150 (SYNCHRONIZED ROTATION OFF)");
    expect(syncOn).toBeLessThan(approach); // never approach a rotating part un-synced
    expect(syncOff).toBeGreaterThan(mainReclamp); // sync stays on through the handoff
  });

  it("interlock release brackets the whole transfer (on before approach, off after)", () => {
    const lines = withTransfer().gcode;
    const subOn = idx(lines, "M247 (SUB CHUCK INTERLOCK RELEASE ON)");
    const approach = idx(lines, "(SUB APPROACH/GRAB)");
    const subOff = idx(lines, "M246 (SUB CHUCK INTERLOCK RELEASE OFF)");
    expect(subOn).toBeGreaterThanOrEqual(0);
    expect(subOn).toBeLessThan(approach);
    expect(subOff).toBeGreaterThan(approach);
  });
});

describe("OkumaB250 sub-spindle transfer — modes + additivity", () => {
  it("bar_pull mode is self-contained: releases sub + retracts + tears down sync", () => {
    const lines = withTransfer({ ...BAR_PULL, mode: "bar_pull" }).gcode;
    const mainReclamp = idx(lines, "M83 (CLAMP MAIN CHUCK)");
    const subRelease = lines.findIndex((l, i) => i > mainReclamp && l.includes("M249 (UNCLAMP SUB CHUCK)"));
    expect(subRelease).toBeGreaterThan(mainReclamp); // sub released AFTER main re-clamps
    expect(idx(lines, "SUB SPINDLE RETURN")).toBeGreaterThan(subRelease);
    expect(idx(lines, "M150 (SYNCHRONIZED ROTATION OFF)")).toBeGreaterThanOrEqual(0);
  });

  it("pickoff mode holds the part (no sub-release/retract, sync teardown deferred)", () => {
    const lines = withTransfer({ grab_w_in: -1.23, bar_pull_w_in: 1.096, mode: "pickoff" }).gcode;
    const text = lines.join("\n");
    expect(text).toContain("SUB HOLDS PART -- READY FOR CUTOFF / BACK-OP");
    // the block must NOT tear sync down itself (that follows the cutoff op)
    const start = idx(lines, "SUB-SPINDLE PART TRANSFER");
    const block = lines.slice(start);
    expect(block.some((l) => l.includes("M150 (SYNCHRONIZED ROTATION OFF)"))).toBe(false);
    expect(block.some((l) => l.includes("SUB SPINDLE RETURN"))).toBe(false);
    // G141 is emitted ONLY as guidance inside the deferred-teardown advisory comment
    // (pickoff never runs sub-side machining itself), not as an executable block.
    const afterCutoff = lines.find((l) => l.includes("AFTER CUTOFF")) ?? "";
    expect(afterCutoff).toContain("G141"); // sub-coord for the back-op
    expect(afterCutoff).toContain("M150"); // the deferred sync-off teardown code is named
  });

  it("ADDITIVE: a program with no transfer spec emits NO transfer block (byte-unchanged behavior)", () => {
    const out = engine.generateProgram([odRough()], { machine_id: "MULTUS-B250II", sub_spindle_enabled: true });
    const text = out.gcode.join("\n");
    expect(text).not.toContain("SUB-SPINDLE PART TRANSFER");
    expect(text).not.toMatch(/\bM248\b/);
  });

  it("omits the bar-pull move when bar_pull_w_in is 0 (pure pickoff/grab)", () => {
    const lines = withTransfer({ grab_w_in: -1.0, bar_pull_w_in: 0, mode: "pickoff" }).gcode;
    expect(lines.some((l) => l.includes("(BAR PULL)"))).toBe(false);
    expect(idx(lines, "M248 (CLAMP SUB CHUCK)")).toBeGreaterThanOrEqual(0); // grab still happens
  });
});

describe("OkumaB250 sub-spindle transfer — guards + warnings [adversarial]", () => {
  it("fail-loud: a non-finite grab_w_in drops the transfer with a visible error block (no M248)", () => {
    const lines = withTransfer({ grab_w_in: Number.NaN, bar_pull_w_in: -1, return_w_in: 30 }).gcode;
    const text = lines.join("\n");
    expect(text).toMatch(/ERROR: SUB-SPINDLE TRANSFER SKIPPED.*grab_w_in/);
    expect(text).not.toMatch(/\bM248\b/); // never emit a malformed transfer
  });

  it("fail-loud: a non-positive transfer_rpm is rejected", () => {
    const lines = withTransfer({ ...BAR_PULL, transfer_rpm: 0 }).gcode;
    expect(lines.join("\n")).toMatch(/ERROR: SUB-SPINDLE TRANSFER SKIPPED.*transfer_rpm/);
  });

  it("warns (does not emit) when a transfer is requested but sub_spindle_enabled is false", () => {
    const out = engine.generateProgram([odRough()], {
      machine_id: "MULTUS-B250II",
      sub_spindle_enabled: false,
      sub_spindle_transfer: BAR_PULL,
    });
    expect(out.gcode.join("\n")).not.toContain("SUB-SPINDLE PART TRANSFER");
    expect(out.warnings.some((w) => w.includes("sub_spindle_enabled is false"))).toBe(true);
  });

  it("warns that codes are inferred (not verified) for a non-B250 sub-spindle machine", () => {
    const out = engine.generateProgram([odRough()], {
      machine_id: "LB3000",
      sub_spindle_enabled: true,
      sub_spindle_transfer: BAR_PULL,
    });
    expect(out.gcode.join("\n")).toContain("M248 (CLAMP SUB CHUCK)"); // still emits the verified sequence
    expect(out.warnings.some((w) => w.includes("verified for MULTUS-B250II"))).toBe(true);
  });

  it("fail-loud: a negative clamp_dwell_sec is rejected", () => {
    const lines = withTransfer({ ...BAR_PULL, clamp_dwell_sec: -1 }).gcode;
    expect(lines.join("\n")).toMatch(/ERROR: SUB-SPINDLE TRANSFER SKIPPED.*clamp_dwell_sec/);
  });

  it("bar_pull with return_w_in omitted: emits W0. retract but flags the missing clearance (honest)", () => {
    const lines = withTransfer({ grab_w_in: -2.0, bar_pull_w_in: -1.0, mode: "bar_pull" }).gcode;
    const text = lines.join("\n");
    expect(text).toContain("WARNING: return_w_in NOT SET");
    // the retract still emits (W0.) -- a defaulted, flagged move, never a malformed/absent one
    expect(text).toMatch(/G0 W0\. \(SUB SPINDLE RETURN\)/);
  });

  it("formats W words Okuma-style: integers carry a trailing dot, decimals trim trailing zeros", () => {
    const lines = withTransfer({ grab_w_in: -2.0, bar_pull_w_in: -1.06, return_w_in: 5 }).gcode;
    const text = lines.join("\n");
    expect(text).toContain("W-2."); // -2.0 -> W-2.
    expect(text).toContain("W-1.06"); // trailing zero trimmed
    expect(text).toContain("W5."); // 5 -> W5.
    expect(text).toContain("W0."); // the approach G0 W0.
  });
});
