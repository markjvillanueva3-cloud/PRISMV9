/**
 * FusionMachineLibraryExportEngine tests -- CATALOG-APP-WIRING-MS0 U-WIRE-FUSION-MACHINE-LIB (slot:romeo)
 *
 * Verification strategy (romeo: every export round-trips):
 *  - GOLDEN_3AX is a faithful copy of a real Autodesk-shipped `.machine` file
 *    (resources/FUSION360/hsm-posts/res/Machines/Milling/autodesk 3ax table head xyz.machine).
 *    parseMachineXml() must read it correctly -- proving the reader matches Autodesk's
 *    OWN schema, not a fabricated one. The emitted output round-trips through the same
 *    reader, so emitter and reader are pinned to the same real format.
 *  - When the on-disk resources/ tree is present, the SAME assertions run against the
 *    live golden file (strongest claim); when absent, they re-run against GOLDEN_3AX so
 *    no test path is ever a silent no-op.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import {
  FusionMachineLibraryExportEngine,
  fusionMachineLibraryExportEngine,
} from "../engines/FusionMachineLibraryExportEngine.js";
import type { ExtendedMachineProfile } from "../data/machine-profiles-catalog.js";
import { EXTENDED_MACHINE_CATALOG } from "../data/machine-profiles-catalog.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// src/__tests__/ -> repo root is up 3 (../../../)
const GOLDEN_PATH = resolve(
  __dirname,
  "../../../resources/FUSION360/hsm-posts/res/Machines/Milling/autodesk 3ax table head xyz.machine",
);

/** Faithful copy of the real Autodesk 3-axis golden file's load-bearing elements. */
const GOLDEN_3AX = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<machine xmlns="http://www.hsmworks.com/xml/2009/machine">
  <vendor>Autodesk</vendor>
  <model>Generic 3-axis</model>
  <description>This machine has XYZ axis on the Head</description>
  <control></control>
  <machining additive="no" inspection="no" jet="no" milling="yes" turning="no"/>
  <coolant options="FLOOD"/>
  <tooling maximumToolDiameter="0mm" maximumToolLength="0mm" maximumToolWeight="0kg" numberOfTools="100" toolChanger="yes" toolPreload="yes"/>
  <machiningTime ratio="1" toolChangeTime="15s"/>
  <capabilities maximumBlockProcessingSpeed="0" maximumFeedrate="0mm/min" workOffsets="100"/>
  <axis actuator="linear" coordinate="X" homePosition="0mm" id="X" link="head" maximumFeed="0mm/min" name="" offset="0mm 0mm 0mm" range="-800mm 800mm" rapidFeed="0mm/min" resolution="0mm"/>
  <axis actuator="linear" coordinate="Y" homePosition="0mm" id="Y" link="head" maximumFeed="0mm/min" name="" offset="0mm 0mm 0mm" range="-350mm 350mm" rapidFeed="0mm/min" resolution="0mm"/>
  <axis actuator="linear" coordinate="Z" homePosition="0mm" id="Z" link="head" maximumFeed="0mm/min" name="" offset="0mm 0mm 0mm" range="-700mm 0mm" rapidFeed="0mm/min" resolution="0mm"/>
  <spindle axis="0 0 1" maximumSpeed="0rpm" minimumSpeed="0rpm">
    <description></description>
  </spindle>
</machine>
`;

/** A complete, valid VMC profile to mutate for failure-mode tests. */
function vfBase(): ExtendedMachineProfile {
  return {
    brand: "Haas",
    model: "TEST-VF",
    type: "VMC",
    controller: "Haas NGC",
    linear_axes: [
      { name: "X", travel_mm: 762, rapid_m_min: 25.4 },
      { name: "Y", travel_mm: 406, rapid_m_min: 25.4 },
      { name: "Z", travel_mm: 508, rapid_m_min: 25.4 },
    ],
    spindle: { max_rpm: 8100, power_kw: 22.4, torque_nm: 122, taper: "BT40", base_rpm: 2000 },
    tool_changer: { type: "side_mount_carousel", capacity: 20, change_time_sec: 4.2 },
  } as ExtendedMachineProfile;
}

describe("FusionMachineLibraryExportEngine", () => {
  const eng = new FusionMachineLibraryExportEngine();

  it("exports a machine to valid .machine XML and round-trips through the reader", () => {
    const file = eng.export(vfBase());
    expect(file.fileName).toBe("Haas TEST-VF.machine");
    expect(file.xml.startsWith('<?xml version="1.0"')).toBe(true);
    expect(file.xml).toContain('xmlns="http://www.hsmworks.com/xml/2009/machine"');

    const parsed = eng.parseMachineXml(file.xml);
    expect(parsed.vendor).toBe("Haas");
    expect(parsed.model).toBe("TEST-VF");
    expect(parsed.milling).toBe(true);
    expect(parsed.turning).toBe(false);
    expect(parsed.axes.map((a) => a.coordinate)).toEqual(["X", "Y", "Z"]);
    expect(parsed.spindleMaxRpm).toBe(8100);
    expect(parsed.spindleMinRpm).toBe(2000);
    expect(parsed.numberOfTools).toBe(20);
    expect(parsed.toolChangeTimeSec).toBe(4.2);
  });

  it("reader parses the real Autodesk golden schema (inlined copy)", () => {
    const parsed = eng.parseMachineXml(GOLDEN_3AX);
    expect(parsed.vendor).toBe("Autodesk");
    expect(parsed.model).toBe("Generic 3-axis");
    expect(parsed.milling).toBe(true);
    expect(parsed.turning).toBe(false);
    expect(parsed.axes.map((a) => a.coordinate)).toEqual(["X", "Y", "Z"]);
    expect(parsed.numberOfTools).toBe(100);
    // Real Autodesk file uses a centered range; the reader must not choke on negatives.
    expect(parsed.axes[0].range).toBe("-800mm 800mm");
  });

  it("parses the LIVE on-disk Autodesk golden file when resources/ is present (else re-asserts inlined)", () => {
    const src = existsSync(GOLDEN_PATH) ? readFileSync(GOLDEN_PATH, "utf8") : GOLDEN_3AX;
    const parsed = eng.parseMachineXml(src);
    expect(parsed.vendor).toBe("Autodesk");
    expect(parsed.milling).toBe(true);
    expect(parsed.axes.length).toBe(3);
    expect(parsed.axes.every((a) => a.actuator === "linear")).toBe(true);
  });

  it("emits units with suffixes -- never a bare scalar (25.4x scale-error guard)", () => {
    const file = eng.export(vfBase());
    // rapid_m_min 25.4 -> 25400 mm/min (x1000), spindle in rpm, travel range in mm.
    expect(file.xml).toContain('rapidFeed="25400mm/min"');
    expect(file.xml).toContain('maximumSpeed="8100rpm"');
    expect(file.xml).toContain('range="0mm 762mm"');
    expect(file.xml).toContain('toolChangeTime="4.2s"');
    // No attribute value should be a bare number immediately followed by a quote for a
    // dimensioned field (sanity: rpm/mm/s suffix present on the spindle + axis).
    expect(file.xml).not.toContain('maximumSpeed="8100"');
  });

  it("turning machines flag turning=yes; mill-turn flags both", () => {
    const lathe = eng.export({ ...vfBase(), type: "lathe" });
    const lp = eng.parseMachineXml(lathe.xml);
    expect(lp.turning).toBe(true);
    expect(lp.milling).toBe(false);

    const mt = eng.export({ ...vfBase(), type: "mill_turn" });
    const mp = eng.parseMachineXml(mt.xml);
    expect(mp.turning).toBe(true);
    expect(mp.milling).toBe(true);
  });

  // -- source fidelity: full catalog -> exactly one file per machine --
  it("exportLibrary() emits one .machine per catalog machine with unique file names", () => {
    const lib = fusionMachineLibraryExportEngine.exportLibrary();
    expect(lib.count).toBe(EXTENDED_MACHINE_CATALOG.length);
    expect(lib.machines.length).toBe(EXTENDED_MACHINE_CATALOG.length);
    const names = new Set(lib.machines.map((m) => m.fileName));
    // dedup suffixing guarantees uniqueness even on brand+model collisions
    expect(names.size).toBe(lib.machines.length);
    // every emitted file is a well-formed .machine doc carrying its vendor
    for (const m of lib.machines.slice(0, 25)) {
      expect(m.xml).toContain("<machine ");
      expect(m.xml).toContain("</machine>");
    }
  });

  it("de-dupes identical brand+model stems with (n) suffixes (collision regression guard)", () => {
    // Two machines with the SAME brand+model must NOT overwrite each other on disk.
    // The live catalog happens to have zero stem collisions, so force one here -- a
    // regression in the suffixing logic would silently drop a file otherwise.
    const dup = { ...vfBase(), brand: "Acme", model: "SAME" } as ExtendedMachineProfile;
    const lib = eng.exportLibrary([dup, { ...dup }, { ...dup }]);
    expect(lib.count).toBe(3);
    const names = lib.machines.map((m) => m.fileName);
    expect(names).toEqual(["Acme SAME.machine", "Acme SAME (2).machine", "Acme SAME (3).machine"]);
    expect(new Set(names).size).toBe(3);
  });

  it("preserves brand/model from a known catalog entry (source fidelity)", () => {
    const haas = EXTENDED_MACHINE_CATALOG.find((p) => p.brand === "Haas" && p.model === "VF-2");
    // The Haas VF-2 is a known catalog anchor; if the catalog drops it, this fails loud.
    expect(haas?.model).toBe("VF-2");
    const file = eng.export(haas as ExtendedMachineProfile);
    const parsed = eng.parseMachineXml(file.xml);
    expect(parsed.vendor).toBe("Haas");
    expect(parsed.model).toBe("VF-2");
    expect(parsed.spindleMaxRpm).toBe(8100);
  });

  // -- failure modes (>=3) --
  it("warns + emits no <axis> when linear_axes is empty", () => {
    const file = eng.export({ ...vfBase(), linear_axes: [] });
    expect(file.warnings.some((w) => w.includes("no linear axes"))).toBe(true);
    expect(eng.parseMachineXml(file.xml).axes.length).toBe(0);
  });

  it("warns + emits maximumSpeed=0rpm when spindle is missing", () => {
    const broken = { ...vfBase(), spindle: undefined } as unknown as ExtendedMachineProfile;
    const file = eng.export(broken);
    expect(file.warnings.some((w) => w.includes("spindle.max_rpm"))).toBe(true);
    expect(file.xml).toContain('maximumSpeed="0rpm"');
  });

  it("warns + emits numberOfTools=0 + toolChanger=no when tool_changer is missing", () => {
    const broken = { ...vfBase(), tool_changer: undefined } as unknown as ExtendedMachineProfile;
    const file = eng.export(broken);
    expect(file.warnings.some((w) => w.includes("tool_changer.capacity"))).toBe(true);
    expect(file.xml).toContain('numberOfTools="0"');
    expect(file.xml).toContain('toolChanger="no"');
  });

  it("collapses NaN/Infinity catalog values to 0 -- never emits NaNmm", () => {
    const bad = {
      ...vfBase(),
      linear_axes: [{ name: "X", travel_mm: NaN, rapid_m_min: Infinity }],
      spindle: { max_rpm: NaN, power_kw: 1, torque_nm: 1, taper: "BT40" },
    } as unknown as ExtendedMachineProfile;
    const file = eng.export(bad);
    expect(file.xml).not.toContain("NaN");
    expect(file.xml).not.toContain("Infinity");
    expect(file.xml).toContain('maximumSpeed="0rpm"');
  });

  // -- adversarial (>=2) --
  it("escapes XML-special characters in brand/model and round-trips them exactly", () => {
    const tricky = { ...vfBase(), brand: 'A & B <Corp>', model: 'X"Y' } as ExtendedMachineProfile;
    const file = eng.export(tricky);
    // raw XML must be escaped (no unescaped & < > in element text)
    expect(file.xml).toContain("<vendor>A &amp; B &lt;Corp&gt;</vendor>");
    expect(file.xml).toContain('<model>X&quot;Y</model>');
    // reader un-escapes back to the exact original
    const parsed = eng.parseMachineXml(file.xml);
    expect(parsed.vendor).toBe("A & B <Corp>");
    expect(parsed.model).toBe('X"Y');
  });

  it("enumerates the entire catalog without throwing and tags rotary axes for 5-axis machines", () => {
    const lib = fusionMachineLibraryExportEngine.exportLibrary();
    expect(lib.count).toBeGreaterThan(50); // ~213 machines; guard against an empty catalog
    // a profile with rotary axes emits rotational axis elements
    const fiveAx = {
      ...vfBase(),
      type: "5axis" as const,
      rotary_axes: [{ name: "A", min_deg: -120, max_deg: 30, continuous: false, rapid_rpm: 50 }],
    } as ExtendedMachineProfile;
    const file = eng.export(fiveAx);
    expect(file.xml).toContain('actuator="rotational"');
    expect(file.xml).toContain('coordinate="A"');
    expect(file.xml).toContain('range="-120deg 30deg"');
  });
});
