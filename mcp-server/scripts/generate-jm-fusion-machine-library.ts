/**
 * generate-jm-fusion-machine-library.ts
 * [JM-FUSION-TOOLS-MS0]/U-JFT-MACHINE-DB (slot:romeo)
 *
 * Emits Fusion 360 `.machine` definitions (hsmworks XML, namespace
 * http://www.hsmworks.com/xml/2009/machine) for JM Die's milling fleet from the
 * authoritative `JmDieMachineConfigEngine` specs. The same normalized kinematic
 * model (linear travels, rotary-axis vectors, spindle, tool changer, coolant,
 * post) maps 1:1 to hyperMILL Virtual Machine (.mdef) and Mastercam Machine
 * Definition (.mcam-mmd) for the downstream conversions the goal calls for.
 *
 * 3-axis VMCs are fully specified. 5-axis machines emit correct linear axes +
 * rotary-axis unit vectors, but the rotary RANGE and pivot OFFSET are
 * datasheet-unverified placeholders — loudly flagged in <description> + README
 * (R12). Set them from the OEM datasheet before trusting 5-axis simulation.
 *
 * Run: cd mcp-server && npx tsx scripts/generate-jm-fusion-machine-library.ts
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { jmDieMachineConfigEngine, type MachineConfig } from "../src/engines/JmDieMachineConfigEngine.js";

const OUT_DIR = "H:/prism/state/shared/jm-fusion-machines";
const NS = "http://www.hsmworks.com/xml/2009/machine";
// Fusion milling-capable machine types we emit (lathe/EDM/saw/grinder excluded).
const MILLING_TYPES = new Set(["vmc", "5axis", "mill_turn"]);
// Rotary-axis letter → unit rotation vector (A about X, B about Y, C about Z).
const ROTARY_VEC: Record<string, string> = { A: "1 0 0", B: "0 1 0", C: "0 0 1" };
const COOLANT_MAP: Record<string, string> = {
  flood: "FLOOD", mist: "MIST", "through tool": "THROUGH_TOOL",
  through_tool: "THROUGH_TOOL", air: "AIR", air_blast: "AIR", dry: "DISABLED",
};

function xmlEsc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Build the Fusion `.machine` XML for one machine config. Exported for testing.
 * @param m a JmDieMachineConfigEngine MachineConfig
 * @returns hsmworks-namespace .machine XML string
 */
export function buildMachineXml(m: MachineConfig): string {
  const turning = m.type === "mill_turn" || m.type === "lathe" ? "yes" : "no";
  const is5 = (m.axes.rotary?.length || 0) > 0;
  const coolant = (m.coolantModes || [])
    .map((c) => COOLANT_MAP[c] ?? c.toUpperCase().replace(/\s+/g, "_")).join(" ") || "DISABLED";
  const rpm = m.spindle?.maxRpm ?? 0;

  // Linear axes from work-envelope travels. X/Y: 0..travel; Z: -travel..0 (tool down).
  const env = (m.workEnvelope || {}) as { xTravel?: number | null; yTravel?: number | null; zTravel?: number | null };
  const travel: Record<string, number | null | undefined> = { X: env.xTravel, Y: env.yTravel, Z: env.zTravel };
  const linAxis = (c: string): string => {
    const t = travel[c];
    const range = t == null ? "0mm 0mm" : c === "Z" ? `-${t}mm 0mm` : `0mm ${t}mm`;
    return `  <axis actuator="linear" coordinate="${c}" homePosition="0mm" id="${c}" link="head" maximumFeed="0mm/min" name="" offset="0mm 0mm 0mm" range="${range}" rapidFeed="0mm/min" resolution="0mm"/>`;
  };
  const linAxes = (m.axes.linear || []).filter((c) => ["X", "Y", "Z"].includes(c)).map(linAxis).join("\n\n");

  // Rotary axes (5-axis): correct vector; range/pivot are datasheet-unverified (flagged).
  const rotAxes = (m.axes.rotary || []).map((c) => {
    const vec = ROTARY_VEC[c] ?? "0 0 1";
    return `  <axis actuator="rotational" axis="${vec}" control="driven" coordinate="${c}" cyclic="${c === "C" ? "yes" : "no"}" homePosition="0deg" id="${c}" link="table" maximumFeed="0deg/min" name="" offset="0mm 0mm 0mm" preference="dont care" range="-120deg 120deg" reset="previous" tcp="yes"/>`;
  }).join("\n\n");

  const desc = `${xmlEsc(m.name)} (${m.axes.totalAxes}-axis, ${xmlEsc(m.controller)})` +
    (is5 ? " -- WARNING: 5-axis rotary range/pivot OFFSET are datasheet-unverified placeholders; set from the OEM datasheet before 5-axis simulation/collision." : "");
  const post = m.postProcessor ? `system://${xmlEsc(m.postProcessor)}` : "";
  const spindleDesc = m.spindle?.powerKw ? xmlEsc(`${m.spindle.powerKw} kW${m.spindle.taper ? ", " + m.spindle.taper : ""}`) : "";

  return `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<machine xmlns="${NS}">
  <vendor>${xmlEsc(m.oem)}</vendor>
  <model>${xmlEsc(m.model)}</model>
  <description>${desc}</description>
  <control>${xmlEsc(m.controller)}</control>
  <machining additive="no" inspection="${m.probing ? "yes" : "no"}" jet="no" milling="yes" turning="${turning}"/>
  <dimensions depth="0mm" height="0mm" weight="0kg" width="0mm"/>
  <capacities depth="0mm" height="0mm" weight="0kg" width="0mm"/>
  <coolant options="${coolant}"/>
  <multiAxis adjust="yes" angle="10deg" feedrateMethod="fpm" linearizationTolerance="0.04mm" maximumFeedrate="9999" method="${is5 ? "multiaxis" : "off"}" reconfigure="no" safePlungeFeedrate="250mm/min" safeRetractDistance="25mm" safeRetractFeedrate="500mm/min" tolerance="0.04mm" virtualToolTip="no"/>
  <tooling maximumToolDiameter="0mm" maximumToolLength="0mm" maximumToolWeight="0kg" numberOfTools="${m.toolCapacity ?? 0}" toolChanger="yes" toolPreload="yes"/>
  <machiningTime ratio="1" toolChangeTime="15s"/>
  <capabilities maximumBlockProcessingSpeed="0" maximumFeedrate="0mm/min" workOffsets="100"/>
  <simulation tableAttachPoint="0mm 0mm 0mm" toolAttachPoint="0mm 0mm 0mm" wcs="0mm 0mm 0mm">
    <machineAssembly></machineAssembly>
  </simulation>
  <post>
    <postProcessor>${post}</postProcessor>
    <postProperties><Parameters/></postProperties>
  </post>

${linAxes}

  <spindle axis="0 0 1" maximumSpeed="${rpm}rpm" minimumSpeed="0rpm"><description>${spindleDesc}</description></spindle>${rotAxes ? "\n\n" + rotAxes : ""}
</machine>
`;
}

function writeReadme(mills: readonly MachineConfig[]): void {
  const out: string[] = [];
  out.push("# JM Die — Fusion 360 Machine Library (.machine)\n");
  out.push(`Generated ${mills.length} Fusion \`.machine\` definitions from JmDieMachineConfigEngine.\n`);
  out.push("## Import into Fusion 360");
  out.push("Manufacture → Manage → Machine Library → Import → select a `.machine` file.\n");
  out.push("## Convertibility (the goal's hyperMILL/Mastercam targets)");
  out.push("These carry the normalized kinematic model (axes/travels/spindle/changer/post) that");
  out.push("maps 1:1 to hyperMILL Virtual Machine (.mdef) and Mastercam Machine Definition (.mcam-mmd).\n");
  out.push("| Machine | Type | Axes | Max RPM | Tool cap | Post |");
  out.push("|---------|------|------|--------:|---------:|------|");
  for (const m of mills) {
    out.push(`| ${m.name} | ${m.type} | ${m.axes.totalAxes} | ${m.spindle?.maxRpm ?? "?"} | ${m.toolCapacity ?? "?"} | ${m.postProcessor ?? "—"} |`);
  }
  out.push("\n## Known gaps (R12 — surfaced, not hidden)");
  out.push("- **VMC-02 Okuma M460V-5AX** (in `jm-die-profile.ts` controller map) is NOT in");
  out.push("  `JmDieMachineConfigEngine` — no physical specs → no `.machine` emitted. Add its");
  out.push("  specs (trunnion AC 5-axis: travels, RPM, power, taper) to the config engine to generate it.");
  out.push("- **5-axis rotary range + pivot OFFSET** are datasheet-unverified placeholders");
  out.push("  (`range=-120deg 120deg`, `offset=0 0 0`). Set from the OEM datasheet before 5-axis sim.");
  out.push("\n_Generated by `scripts/generate-jm-fusion-machine-library.ts` — U-JFT-MACHINE-DB (slot:romeo)._");
  writeFileSync(join(OUT_DIR, "README.md"), out.join("\n") + "\n", "utf-8");
}

function main(): void {
  mkdirSync(OUT_DIR, { recursive: true });
  const all = jmDieMachineConfigEngine.getAllConfigs();
  const mills = all.filter((m) => MILLING_TYPES.has(m.type));
  for (const m of mills) {
    writeFileSync(join(OUT_DIR, `${m.id}.machine`), buildMachineXml(m), "utf-8");
  }
  writeReadme(mills);
  console.log(`GENERATED ${mills.length} Fusion .machine definitions:`);
  for (const m of mills) {
    console.log(`  ${m.id}.machine  [${m.type}, ${m.axes.totalAxes}ax, ${m.spindle?.maxRpm ?? "?"}rpm, ${m.axes.rotary?.length ? "rotary " + m.axes.rotary.join("/") : "3-axis"}]`);
  }
  console.log(`Output: ${OUT_DIR}`);
}

// Run only when executed directly (not when imported by the test).
if (process.argv[1] && process.argv[1].replace(/\\/g, "/").includes("generate-jm-fusion-machine-library")) main();
