import { describe, it, expect } from "vitest";
import { buildMachineXml } from "../../scripts/generate-jm-fusion-machine-library.js";
import { jmDieMachineConfigEngine } from "../engines/JmDieMachineConfigEngine.js";

/**
 * Verifies the Fusion .machine XML generator emits structurally-correct,
 * kinematically-faithful definitions per JM machine type — and that 5-axis
 * machines carry the honest datasheet-unverified flag (R12).
 */
describe("buildMachineXml (Fusion .machine generation)", () => {
  const vmcs = jmDieMachineConfigEngine.getByType("vmc");
  const fiveAx = jmDieMachineConfigEngine.getByType("5axis");
  const millTurns = jmDieMachineConfigEngine.getByType("mill_turn");

  it("emits well-formed hsmworks-namespace .machine XML", () => {
    expect(vmcs.length).toBeGreaterThan(0);
    const xml = buildMachineXml(vmcs[0]);
    expect(xml.startsWith("<?xml")).toBe(true);
    expect(xml).toContain('<machine xmlns="http://www.hsmworks.com/xml/2009/machine">');
    expect(xml.trimEnd().endsWith("</machine>")).toBe(true);
  });

  it("3-axis VMC has exactly 3 linear axes, no rotary, milling on / turning off", () => {
    const m = vmcs.find((x) => x.axes.totalAxes === 3) ?? vmcs[0];
    const xml = buildMachineXml(m);
    expect((xml.match(/actuator="linear"/g) || []).length).toBe(3);
    expect((xml.match(/actuator="rotational"/g) || []).length).toBe(0);
    expect(xml).toContain('milling="yes"');
    expect(xml).toContain('turning="no"');
    expect(xml).toContain(`maximumSpeed="${m.spindle.maxRpm}rpm"`);
    expect(xml).not.toMatch(/WARNING/);
  });

  it("5-axis machine emits rotary axes with correct vectors + datasheet-unverified flag", () => {
    expect(fiveAx.length).toBeGreaterThan(0);
    const m = fiveAx[0];
    const xml = buildMachineXml(m);
    expect((xml.match(/actuator="rotational"/g) || []).length).toBe(m.axes.rotary.length);
    if (m.axes.rotary.includes("A")) expect(xml).toContain('axis="1 0 0"'); // A rotates about X
    if (m.axes.rotary.includes("B")) expect(xml).toContain('axis="0 1 0"'); // B rotates about Y
    expect(xml).toMatch(/WARNING.*datasheet-unverified/); // R12 honest flag on unverified pivot/range
    expect(xml).toContain('method="multiaxis"');
  });

  it("mill_turn machine enables both milling and turning", () => {
    expect(millTurns.length).toBeGreaterThan(0);
    const xml = buildMachineXml(millTurns[0]);
    expect(xml).toContain('milling="yes"');
    expect(xml).toContain('turning="yes"');
  });

  it("coolant options + tool capacity + spindle reflect the config", () => {
    const m = vmcs[0];
    const xml = buildMachineXml(m);
    expect(xml).toContain(`numberOfTools="${m.toolCapacity}"`);
    expect(xml).toMatch(/<coolant options="[A-Z]/); // non-empty uppercase coolant enum
    expect(xml).toContain(`maximumSpeed="${m.spindle.maxRpm}rpm"`);
  });

  it("Z-axis range is negative (tool-down convention) when a Z travel exists", () => {
    const m = vmcs.find((x) => x.workEnvelope?.zTravel && x.axes.linear.includes("Z")) ?? vmcs[0];
    const xml = buildMachineXml(m);
    if (m.workEnvelope?.zTravel) {
      expect(xml).toMatch(/coordinate="Z"[^>]*range="-\d/);
    }
    // X travel must render as a positive range
    if (m.workEnvelope?.xTravel) {
      expect(xml).toMatch(/coordinate="X"[^>]*range="0mm \d/);
    }
  });
});
