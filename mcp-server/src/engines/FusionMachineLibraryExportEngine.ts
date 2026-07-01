/**
 * FusionMachineLibraryExportEngine -- Export PRISM machine catalog as Fusion 360 .machine library
 *
 * Converts machines from `EXTENDED_MACHINE_CATALOG` (machine-profiles-catalog, 1082
 * machines as of 2026-06-09 across Haas/DMG MORI/Mazak/Okuma/Makino/Hermle/Doosan + many more)
 * into Fusion 360 / HSMWorks `.machine` files -- the XML format Fusion's CAM "Machine"
 * dialog and post kernel consume to model kinematics, spindle, tool-changer and axis
 * limits for a setup.
 *
 * IMPORTANT -- the `.machine` format is XML (namespace
 * `http://www.hsmworks.com/xml/2009/machine`), NOT JSON. The emitter is built directly
 * against the real Autodesk-shipped golden samples in
 * `resources/FUSION360/hsm-posts/res/Machines/` (Milling/Additive/Fabrication), and
 * `parseMachineXml()` round-trips both emitted output AND those real golden files so the
 * schema is verified against Autodesk's own definitions, never fabricated from memory.
 *
 * Sibling exporters (DISTINCT artifacts, do NOT conflate):
 *   - Fusion360ToolExportEngine / FusionToolExportEngine -> Fusion `.tools` JSON (TOOL geometry)
 *   - This engine                                        -> Fusion `.machine` XML (MACHINE config)
 * The duplication guard fuzzy-matches them on "fusion"+"export"; they share no source,
 * format, or consumer. See `mcp-server/src/data/machine-profiles-catalog.ts` for source.
 *
 * UNITS: the source catalog is metric throughout (travel_mm, rapid_m_min, max_rpm). The
 * `.machine` format carries units as suffixed strings (`800mm`, `8100rpm`, `4.2s`,
 * `25400mm/min`). No 25.4x conversion occurs -- both sides are metric -- but every numeric
 * is emitted WITH its unit suffix so an importer never reads a bare scalar (the 25.4x
 * scale-error class the units-guard exists to prevent). rapid_m_min -> mm/min is x1000.
 *
 * @module engines/FusionMachineLibraryExportEngine
 * @milestone CATALOG-APP-WIRING-MS0 U-WIRE-FUSION-MACHINE-LIB (slot:romeo)
 */

import type { ExtendedMachineProfile } from "../data/machine-profiles-catalog.js";
import { EXTENDED_MACHINE_CATALOG } from "../data/machine-profiles-catalog.js";

/** One exported machine: the Fusion file name + its `.machine` XML body. */
export interface FusionMachineFile {
  /** Sanitized file stem (no extension), e.g. "Haas VF-2". */
  name: string;
  /** File name WITH extension, e.g. "Haas VF-2.machine". */
  fileName: string;
  /** The full `.machine` XML document. */
  xml: string;
  /** Non-fatal data-quality notes for this machine (empty when clean). */
  warnings: string[];
}

/** Result of a bulk library export. */
export interface FusionMachineLibrary {
  machines: FusionMachineFile[];
  /** Number of `.machine` files emitted (== machines.length). */
  count: number;
  /** Aggregate of every per-machine warning, prefixed with the machine name. */
  warnings: string[];
}

/** Structured view of a parsed `.machine` file -- used for round-trip verification. */
export interface ParsedMachine {
  vendor: string;
  model: string;
  description: string;
  control: string;
  milling: boolean;
  turning: boolean;
  axes: Array<{ coordinate: string; actuator: string; range: string; rapidFeed: string }>;
  spindleMaxRpm: number;
  spindleMinRpm: number;
  numberOfTools: number;
  toolChangeTimeSec: number;
}

const MACHINE_NS = "http://www.hsmworks.com/xml/2009/machine";

export class FusionMachineLibraryExportEngine {
  // -- unit-suffix helpers (never emit a bare scalar) --
  private _mm(n: number): string {
    return `${this._num(n)}mm`;
  }
  private _mmMin(n: number): string {
    return `${this._num(n)}mm/min`;
  }
  private _rpm(n: number): string {
    return `${this._num(n)}rpm`;
  }
  private _kg(n: number): string {
    return `${this._num(n)}kg`;
  }
  private _secs(n: number): string {
    return `${this._num(n)}s`;
  }
  private _deg(n: number): string {
    return `${this._num(n)}deg`;
  }
  /** Finite guard -- NaN/Infinity from corrupt catalog rows collapse to 0, never "NaNmm". */
  private _num(n: number): number {
    return Number.isFinite(n) ? n : 0;
  }

  private _xmlEscape(s: string): string {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  private _xmlUnescape(s: string): string {
    return String(s)
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&amp;/g, "&"); // amp LAST so "&amp;lt;" -> "&lt;" not "<"
  }

  /** Map catalog machine type -> Fusion machining capability flags. */
  private _machining(type: ExtendedMachineProfile["type"]): { milling: boolean; turning: boolean } {
    const turning = type === "lathe" || type === "mill_turn" || type === "swiss" || type === "vtl";
    const milling = type !== "lathe" && type !== "swiss" && type !== "vtl"; // mill_turn does both
    return { milling, turning };
  }

  /** Build a Fusion-safe file stem from brand + model (keeps spaces, like Autodesk's own files). */
  private _fileStem(profile: ExtendedMachineProfile): string {
    const raw = `${profile.brand ?? ""} ${profile.model ?? ""}`.trim() || "machine";
    // Strip characters illegal in Windows/macOS file names; collapse whitespace.
    return raw.replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, " ").trim();
  }

  /**
   * Emit one machine as a `.machine` XML document.
   * @returns the XML, the file name, and any data-quality warnings.
   */
  export(profile: ExtendedMachineProfile): FusionMachineFile {
    const warnings: string[] = [];
    const stem = this._fileStem(profile);

    const { milling, turning } = this._machining(profile.type);

    const linear = Array.isArray(profile.linear_axes) ? profile.linear_axes : [];
    if (linear.length === 0) {
      warnings.push("no linear axes in source profile -- emitted machine has no <axis> elements");
    }
    const rotary = Array.isArray(profile.rotary_axes) ? profile.rotary_axes : [];

    const sp = profile.spindle;
    if (!sp || !Number.isFinite(sp.max_rpm)) {
      warnings.push("spindle.max_rpm missing/non-finite -- emitted maximumSpeed=0rpm");
    }
    const maxRpm = sp && Number.isFinite(sp.max_rpm) ? sp.max_rpm : 0;
    const minRpm = sp && Number.isFinite(sp.base_rpm as number) ? (sp.base_rpm as number) : 0;

    const tc = profile.tool_changer;
    if (!tc || !Number.isFinite(tc.capacity)) {
      warnings.push("tool_changer.capacity missing/non-finite -- emitted numberOfTools=0");
    }
    const capacity = tc && Number.isFinite(tc.capacity) ? tc.capacity : 0;
    const changeTime = tc && Number.isFinite(tc.change_time_sec) ? tc.change_time_sec : 0;
    const maxToolDia = tc && Number.isFinite(tc.max_tool_diameter_mm as number) ? (tc.max_tool_diameter_mm as number) : 0;
    const maxToolLen = tc && Number.isFinite(tc.max_tool_length_mm as number) ? (tc.max_tool_length_mm as number) : 0;
    const maxToolWt = tc && Number.isFinite(tc.max_tool_weight_kg as number) ? (tc.max_tool_weight_kg as number) : 0;

    const linearXml = linear
      .map((a) => {
        const rapidMmMin = this._num((a.rapid_m_min ?? 0) * 1000);
        const travel = this._num(a.travel_mm ?? 0);
        // Express total travel as a non-negative range [0, travel]; Fusion accepts any
        // min<max. Coordinate id is the axis name (X/Y/Z).
        return (
          `  <axis actuator="linear" coordinate="${this._xmlEscape(a.name)}" homePosition="0mm" ` +
          `id="${this._xmlEscape(a.name)}" link="table" maximumFeed="${this._mmMin(rapidMmMin)}" name="" ` +
          `offset="0mm 0mm 0mm" range="${this._mm(0)} ${this._mm(travel)}" ` +
          `rapidFeed="${this._mmMin(rapidMmMin)}" resolution="0mm"/>`
        );
      })
      .join("\n");

    const rotaryXml = rotary
      .map((r) => {
        const rapidRpm = this._num(r.rapid_rpm ?? 0);
        return (
          `  <axis actuator="rotational" coordinate="${this._xmlEscape(r.name)}" homePosition="0deg" ` +
          `id="${this._xmlEscape(r.name)}" link="table" maximumFeed="${this._num(rapidRpm)}rpm" name="" ` +
          `offset="0mm 0mm 0mm" range="${this._deg(r.min_deg ?? 0)} ${this._deg(r.max_deg ?? 0)}" ` +
          `rapidFeed="${this._num(rapidRpm)}rpm" resolution="0deg"/>`
        );
      })
      .join("\n");

    const axesXml = [linearXml, rotaryXml].filter((s) => s.length > 0).join("\n");

    const description = `${profile.type ?? "machine"} -- ${profile.controller ?? ""}`.trim();

    const xml = `<?xml version="1.0" encoding="UTF-8" standalone="no" ?>
<machine xmlns="${MACHINE_NS}">
  <vendor>${this._xmlEscape(profile.brand ?? "")}</vendor>
  <model>${this._xmlEscape(profile.model ?? "")}</model>
  <description>${this._xmlEscape(description)}</description>
  <control>${this._xmlEscape(profile.controller ?? "")}</control>
  <machining additive="no" inspection="no" jet="no" milling="${milling ? "yes" : "no"}" turning="${turning ? "yes" : "no"}"/>
  <dimensions depth="0mm" height="0mm" weight="${this._kg(this._num(profile.weight_kg ?? 0))}" width="0mm"/>
  <capacities depth="0mm" height="0mm" weight="0kg" width="0mm"/>
  <coolant options="FLOOD"/>
  <tooling maximumToolDiameter="${this._mm(maxToolDia)}" maximumToolLength="${this._mm(maxToolLen)}" maximumToolWeight="${this._kg(maxToolWt)}" numberOfTools="${this._num(capacity)}" toolChanger="${capacity > 0 ? "yes" : "no"}" toolPreload="yes"/>
  <machiningTime ratio="1" toolChangeTime="${this._secs(changeTime)}"/>
  <capabilities maximumBlockProcessingSpeed="0" maximumFeedrate="0mm/min" workOffsets="100"/>
  <post>
    <postProcessor>system://machinesimulation.cps</postProcessor>
    <postProperties>
      <Parameters/>
    </postProperties>
  </post>
${axesXml ? axesXml + "\n" : ""}  <spindle axis="0 0 1" maximumSpeed="${this._rpm(maxRpm)}" minimumSpeed="${this._rpm(minRpm)}">
    <description></description>
  </spindle>
</machine>
`;

    return { name: stem, fileName: `${stem}.machine`, xml, warnings };
  }

  /**
   * Export the full machine catalog (default) or a supplied subset.
   * @param profiles optional subset; defaults to the entire EXTENDED_MACHINE_CATALOG.
   */
  exportLibrary(profiles?: ExtendedMachineProfile[]): FusionMachineLibrary {
    const src = Array.isArray(profiles) ? profiles : EXTENDED_MACHINE_CATALOG;
    const machines: FusionMachineFile[] = [];
    const warnings: string[] = [];
    // De-dupe identical file stems (brand+model collisions) by suffixing (2), (3)...
    const seen = new Map<string, number>();
    for (const p of src) {
      const file = this.export(p);
      const n = (seen.get(file.name) ?? 0) + 1;
      seen.set(file.name, n);
      if (n > 1) {
        file.name = `${file.name} (${n})`;
        file.fileName = `${file.name}.machine`;
      }
      machines.push(file);
      for (const w of file.warnings) warnings.push(`${file.name}: ${w}`);
    }
    return { machines, count: machines.length, warnings };
  }

  /**
   * Parse a `.machine` XML document into a structured view. Works on BOTH this engine's
   * output and real Autodesk golden files -- the round-trip verifier. Uses String.match /
   * matchAll (no RegExp.exec) deliberately.
   */
  parseMachineXml(xml: string): ParsedMachine {
    const tag = (name: string): string => {
      const m = xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
      return m ? this._xmlUnescape(m[1].trim()) : "";
    };
    const attr = (el: string, a: string): string => {
      const block = xml.match(new RegExp(`<${el}\\b[^>]*>`));
      if (!block) return "";
      const m = block[0].match(new RegExp(`${a}="([^"]*)"`));
      return m ? this._xmlUnescape(m[1]) : "";
    };
    const pickAttr = (chunk: string, k: string): string => {
      const m = chunk.match(new RegExp(`${k}="([^"]*)"`));
      return m ? this._xmlUnescape(m[1]) : "";
    };

    const axes: ParsedMachine["axes"] = [];
    for (const am of xml.matchAll(/<axis\b([^>]*)\/>/g)) {
      const a = am[1];
      axes.push({
        coordinate: pickAttr(a, "coordinate"),
        actuator: pickAttr(a, "actuator"),
        range: pickAttr(a, "range"),
        rapidFeed: pickAttr(a, "rapidFeed"),
      });
    }

    const numFromUnit = (s: string): number => {
      const m = s.match(/-?\d+(?:\.\d+)?/);
      return m ? parseFloat(m[0]) : 0;
    };

    return {
      vendor: tag("vendor"),
      model: tag("model"),
      description: tag("description"),
      control: tag("control"),
      milling: attr("machining", "milling") === "yes",
      turning: attr("machining", "turning") === "yes",
      axes,
      spindleMaxRpm: numFromUnit(attr("spindle", "maximumSpeed")),
      spindleMinRpm: numFromUnit(attr("spindle", "minimumSpeed")),
      numberOfTools: numFromUnit(attr("tooling", "numberOfTools")),
      toolChangeTimeSec: numFromUnit(attr("machiningTime", "toolChangeTime")),
    };
  }
}

export const fusionMachineLibraryExportEngine = new FusionMachineLibraryExportEngine();
