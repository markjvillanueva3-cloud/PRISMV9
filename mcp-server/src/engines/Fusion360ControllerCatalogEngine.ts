/**
 * Fusion360ControllerCatalogEngine — CNC Controller Family Reference for Fusion 360
 *
 * Encodes 16 major controller families covered by Fusion 360's post-processor
 * library. Fusion 360's post library is JavaScript-based (the post-processor
 * generator runs each post .cps file as a JS module), so the variants table
 * here lists the canonical post file names shipped with Fusion 360.
 *
 * Sources:
 *   - Fusion 360 Manufacturing Post Library (cam.autodesk.com/posts)
 *   - HSMWorks legacy post catalog
 *   - JM Die shop floor experience
 *
 * Sister engine: MastercamControllerCatalogEngine (same shape, different vendor).
 *
 * @engine Fusion360ControllerCatalogEngine
 * @dispatcher camDispatcher
 * @actions cam_fusion360_controller_list, cam_fusion360_controller_lookup,
 *          cam_fusion360_controller_search, cam_fusion360_controller_dialect,
 *          cam_fusion360_controller_stats, cam_fusion360_controller_audit
 * @milestone CAM-EXHAUST-MS0 U-CAM-FUSION-CTRL-01
 */

import { z } from "zod";

// ── Schemas ──────────────────────────────────────────────────────────────────

export const ControllerVariantSchema = z.object({
  postFile: z.string().min(1),
  description: z.string().min(1),
  axisCount: z.number().int().min(2).max(9),
  capabilities: z.array(z.string().min(1)),
  compatibleMachines: z.array(z.string().min(1)),
});
export type ControllerVariant = z.infer<typeof ControllerVariantSchema>;

export const ControllerFamilySchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9_]+$/, "id must be snake_case"),
  name: z.string().min(1),
  manufacturer: z.string().min(1),
  variants: z.array(ControllerVariantSchema).min(1),
  cycleSupport: z.array(z.string().min(1)).min(1),
  gCodeDialect: z.string().min(1),
  tribalTips: z.array(z.string().min(1)).min(1),
});
export type ControllerFamily = z.infer<typeof ControllerFamilySchema>;

// ── Catalog ──────────────────────────────────────────────────────────────────

const CATALOG_RAW: ControllerFamily[] = [
  {
    id: "fanuc",
    name: "Fanuc",
    manufacturer: "FANUC Corporation",
    variants: [
      { postFile: "fanuc.cps", description: "Generic FANUC 3-axis mill", axisCount: 3, capabilities: ["G81-G89", "rigid_tap", "G68_rotation"], compatibleMachines: ["VMC", "HMC"] },
      { postFile: "fanuc 5axis.cps", description: "FANUC 5-axis (TCP / G43.4)", axisCount: 5, capabilities: ["TCP_G43.4", "RTCP", "5axis_indexed", "5axis_simultaneous"], compatibleMachines: ["DMG", "Mazak", "Okuma"] },
      { postFile: "fanuc turning.cps", description: "FANUC lathe / mill-turn", axisCount: 4, capabilities: ["G71_G72", "G76_thread", "live_tooling"], compatibleMachines: ["Mazak Integrex", "Doosan Puma"] },
      { postFile: "fanuc - hurco.cps", description: "FANUC dialect tuned for Hurco", axisCount: 4, capabilities: ["G81-G89", "hurco_subroutines"], compatibleMachines: ["Hurco V-series"] },
    ],
    cycleSupport: ["G73", "G74", "G76", "G80-G89"],
    gCodeDialect: "fanuc",
    tribalTips: [
      "G43.4 (TCP) requires AICC II or HPCC option on FANUC 30i+",
      "Always test rigid tap on a sample piece — feed/spindle sync is controller-tuned",
      "For multi-pallet machines pair fanuc.cps with macro variables #500-#599 for pallet tracking",
    ],
  },
  {
    id: "haas",
    name: "Haas NGC / Classic",
    manufacturer: "Haas Automation",
    variants: [
      { postFile: "haas.cps", description: "Haas NGC (next-gen control)", axisCount: 3, capabilities: ["G81-G89", "rigid_tap", "macro_b"], compatibleMachines: ["VF series", "UMC-750"] },
      { postFile: "haas 4-axis.cps", description: "Haas 4-axis with rotary", axisCount: 4, capabilities: ["G54.1-G54.99", "rotary_indexing"], compatibleMachines: ["VF + TR-160", "VF + TRT"] },
      { postFile: "haas 5-axis.cps", description: "Haas UMC 5-axis", axisCount: 5, capabilities: ["DWO", "5axis_indexed", "5axis_simultaneous"], compatibleMachines: ["UMC-750", "UMC-1000"] },
      { postFile: "haas turning.cps", description: "Haas ST / DS lathe", axisCount: 2, capabilities: ["G71-G76", "live_tooling_DT"], compatibleMachines: ["ST series", "DS-30Y"] },
    ],
    cycleSupport: ["G73", "G74", "G76", "G81-G89"],
    gCodeDialect: "fanuc_haas",
    tribalTips: [
      "DWO (Dynamic Work Offsets) requires correct kinematic config in Settings 30",
      "Haas tapping head on classic controls cannot rigid-tap above 1000 rpm reliably",
      "TRT-160 4th+5th rotary needs Setting 30 = 22 for proper TWP positioning",
    ],
  },
  {
    id: "siemens",
    name: "Siemens Sinumerik",
    manufacturer: "Siemens AG",
    variants: [
      { postFile: "siemens.cps", description: "Sinumerik 840D / 828D mill", axisCount: 3, capabilities: ["CYCLE81-89", "TRAORI", "advanced_surface"], compatibleMachines: ["DMG MORI", "Hermle"] },
      { postFile: "siemens 5axis.cps", description: "Sinumerik 840D 5-axis (TRAORI)", axisCount: 5, capabilities: ["TRAORI", "TRAFOOF", "5axis_simultaneous", "advanced_surface"], compatibleMachines: ["DMG MORI DMU", "Hermle C-series"] },
      { postFile: "siemens turning.cps", description: "Sinumerik 840D lathe", axisCount: 4, capabilities: ["CYCLE95", "thread_cycle", "live_tooling"], compatibleMachines: ["Index G-series", "DMG NLX"] },
    ],
    cycleSupport: ["CYCLE81", "CYCLE82", "CYCLE83", "CYCLE84", "CYCLE85", "CYCLE86", "CYCLE87", "CYCLE88", "CYCLE89", "CYCLE95"],
    gCodeDialect: "siemens",
    tribalTips: [
      "TRAORI must be activated BEFORE first 5-axis move — failure mode is sudden axis whip",
      "Sinumerik prefers CYCLE83 over G83 for deep-hole peck — better chip evacuation patterns",
      "ShopMill conversational programs are NOT compatible with G-code-only posts",
    ],
  },
  {
    id: "heidenhain",
    name: "Heidenhain TNC",
    manufacturer: "Dr. Johannes Heidenhain GmbH",
    variants: [
      { postFile: "heidenhain.cps", description: "Heidenhain iTNC 530 / TNC 640 conversational", axisCount: 3, capabilities: ["CYCL_DEF_200-261", "TCPM", "PLANE_SPATIAL"], compatibleMachines: ["DMG MORI", "Hurco"] },
      { postFile: "heidenhain 5axis.cps", description: "Heidenhain TNC 640 5-axis (TCPM)", axisCount: 5, capabilities: ["TCPM_M128", "PLANE_SPATIAL", "5axis_simultaneous"], compatibleMachines: ["DMG DMU", "Hermle C42U"] },
      { postFile: "heidenhain klartext.cps", description: "Klartext (conversational) output", axisCount: 5, capabilities: ["KlartextDialog", "TCPM"], compatibleMachines: ["Heidenhain-controlled machines"] },
    ],
    cycleSupport: ["CYCL_DEF_200", "CYCL_DEF_201", "CYCL_DEF_202", "CYCL_DEF_203", "CYCL_DEF_205", "CYCL_DEF_206-209", "CYCL_DEF_220-262"],
    gCodeDialect: "heidenhain",
    tribalTips: [
      "PLANE SPATIAL is the modern way to set tilt — replaces older CYCL DEF 19",
      "M128/TCPM only works with TNC 640 + correct kinematic file (.kinematics) installed",
      "Klartext .h files must use ISO line-ending — the iTNC 530 chokes on CRLF",
    ],
  },
  {
    id: "mazak_mazatrol",
    name: "Mazak Mazatrol",
    manufacturer: "Yamazaki Mazak",
    variants: [
      { postFile: "mazak.cps", description: "Mazak EIA mode (G-code)", axisCount: 3, capabilities: ["G83_peck", "G76_thread", "G68_rotation"], compatibleMachines: ["VCN", "VCC"] },
      { postFile: "mazak 5axis.cps", description: "Mazak Integrex 5-axis EIA", axisCount: 5, capabilities: ["G43.4_TCP", "5axis_simultaneous"], compatibleMachines: ["Integrex i-series", "Integrex e-series"] },
      { postFile: "mazak turning.cps", description: "Mazak lathe / Integrex turn", axisCount: 4, capabilities: ["MAZATROL_T", "EIA_T"], compatibleMachines: ["QT-Smart", "QT-Compact"] },
    ],
    cycleSupport: ["G73", "G74", "G76", "G81-G89", "MZK_HOLE"],
    gCodeDialect: "fanuc_mazak",
    tribalTips: [
      "Mazatrol Smart programs are NOT G-code; use the EIA mode post for Fusion-generated files",
      "Integrex requires explicit C-axis switching (G110/G111) before live tooling",
    ],
  },
  {
    id: "okuma",
    name: "Okuma OSP",
    manufacturer: "Okuma Corporation",
    variants: [
      { postFile: "okuma.cps", description: "Okuma OSP-P300 / P500 mill", axisCount: 3, capabilities: ["G81-G89", "G145_TCP", "advanced_surface"], compatibleMachines: ["MA / MB series", "MU 5-axis"] },
      { postFile: "okuma 5axis.cps", description: "Okuma MU 5-axis (G145)", axisCount: 5, capabilities: ["G145_TCP", "5axis_simultaneous"], compatibleMachines: ["MU-S600", "MU-8000H"] },
      { postFile: "okuma turning.cps", description: "Okuma OSP lathe", axisCount: 4, capabilities: ["G71-G76", "C-axis", "live_tooling"], compatibleMachines: ["LB-series", "MULTUS"] },
    ],
    cycleSupport: ["G81-G89", "G73", "G74", "G76", "G145"],
    gCodeDialect: "fanuc_okuma",
    tribalTips: [
      "OSP G145 is Okuma's TCP equivalent — different param scheme than FANUC G43.4",
      "OSP-P300 has stricter tool-life management — set $L tool offsets explicitly",
    ],
  },
  {
    id: "mitsubishi",
    name: "Mitsubishi M-series",
    manufacturer: "Mitsubishi Electric",
    variants: [
      { postFile: "mitsubishi.cps", description: "Mitsubishi M70/M80 mill", axisCount: 3, capabilities: ["G81-G89", "rigid_tap"], compatibleMachines: ["Kira", "Kitamura", "Kiwa"] },
      { postFile: "mitsubishi 5axis.cps", description: "Mitsubishi M80 5-axis (G43.4)", axisCount: 5, capabilities: ["G43.4_TCP", "5axis_simultaneous"], compatibleMachines: ["Kitamura HX-series", "Kiwa KH"] },
    ],
    cycleSupport: ["G81-G89", "G73", "G74", "G76"],
    gCodeDialect: "fanuc_mitsubishi",
    tribalTips: [
      "M80 G43.4 needs the option key — confirm with controller vendor before posting",
    ],
  },
  {
    id: "brother",
    name: "Brother CNC-B / CNC-C00",
    manufacturer: "Brother Industries",
    variants: [
      { postFile: "brother.cps", description: "Brother Speedio (M200B+) tap centers", axisCount: 3, capabilities: ["fast_tool_change", "rigid_tap_high_rpm", "G81-G89"], compatibleMachines: ["Speedio S700X1", "Speedio R650X2"] },
      { postFile: "brother 5axis.cps", description: "Brother Speedio U500X 5-axis", axisCount: 5, capabilities: ["TCP_G43.4", "rapid_5axis_index"], compatibleMachines: ["Speedio U500X1", "Speedio U500Xd1"] },
    ],
    cycleSupport: ["G81-G89", "G73", "G74"],
    gCodeDialect: "fanuc_brother",
    tribalTips: [
      "Brother tap centers shine on small parts under 600×500×300 — not for big-envelope work",
      "Tool change time is 1.0–1.4 sec — schedule tools to exploit the speed",
    ],
  },
  {
    id: "tormach_pathpilot",
    name: "Tormach PathPilot",
    manufacturer: "Tormach",
    variants: [
      { postFile: "tormach.cps", description: "Tormach PathPilot 1100/770 series", axisCount: 3, capabilities: ["G81-G89", "M19_orient_spindle"], compatibleMachines: ["PCNC 1100", "PCNC 770", "Tormach 1500"] },
    ],
    cycleSupport: ["G81-G89", "G73"],
    gCodeDialect: "linuxcnc",
    tribalTips: [
      "PathPilot is LinuxCNC under the hood — supports most LinuxCNC g-code variants",
      "ATC tool change uses M6 with a tool-change subroutine — verify it's installed",
    ],
  },
  {
    id: "centroid",
    name: "Centroid M400 / M39",
    manufacturer: "Centroid CNC",
    variants: [
      { postFile: "centroid.cps", description: "Centroid M400 mill controller", axisCount: 3, capabilities: ["G81-G89", "macro_subprograms"], compatibleMachines: ["Centroid retrofits", "Acorn-based machines"] },
    ],
    cycleSupport: ["G81-G89", "G73", "G74"],
    gCodeDialect: "centroid",
    tribalTips: [
      "Centroid M400/M39 are common retrofits on Bridgeport-style knee mills",
      "Macro variables use #100+ range (not FANUC's #500+)",
    ],
  },
  {
    id: "dmg_celos",
    name: "DMG MORI CELOS",
    manufacturer: "DMG MORI",
    variants: [
      { postFile: "dmg mori.cps", description: "CELOS interface (Siemens or Heidenhain backend)", axisCount: 5, capabilities: ["CELOS_apps", "5axis_simultaneous", "production_planning"], compatibleMachines: ["DMU", "DMC", "NLX"] },
    ],
    cycleSupport: ["depends_on_backend"],
    gCodeDialect: "siemens_or_heidenhain",
    tribalTips: [
      "CELOS itself is the HMI — actual G-code dialect depends on which controller hardware (Siemens 840D or Heidenhain TNC 640)",
      "Use the appropriate Siemens or Heidenhain Fusion post; CELOS is just the front-end",
    ],
  },
  {
    id: "hurco",
    name: "Hurco WinMax / NCT",
    manufacturer: "Hurco Companies",
    variants: [
      { postFile: "hurco.cps", description: "Hurco WinMax / V-series", axisCount: 3, capabilities: ["G81-G89", "winmax_subroutines"], compatibleMachines: ["VM-series", "VMX-series"] },
      { postFile: "hurco 5axis.cps", description: "Hurco V5 5-axis", axisCount: 5, capabilities: ["TCP", "5axis_simultaneous"], compatibleMachines: ["VMX24SR", "VMX42SR"] },
    ],
    cycleSupport: ["G81-G89", "G73"],
    gCodeDialect: "fanuc_hurco",
    tribalTips: [
      "Hurco WinMax conversational programs differ from G-code — use the FANUC-Hurco post for Fusion-generated G-code",
      "Setup sheet output (M28/M29) integrates with Hurco's UltiMax screen prompts",
    ],
  },
  {
    id: "doosan",
    name: "Doosan / DN Solutions",
    manufacturer: "DN Solutions (formerly Doosan Machine Tools)",
    variants: [
      { postFile: "doosan.cps", description: "Doosan FANUC-based mill", axisCount: 3, capabilities: ["G81-G89", "rigid_tap"], compatibleMachines: ["DNM-series", "Mynx"] },
      { postFile: "doosan turning.cps", description: "Doosan Puma lathe", axisCount: 4, capabilities: ["G71-G76", "live_tooling"], compatibleMachines: ["Puma 2100", "Puma SMX"] },
    ],
    cycleSupport: ["G81-G89", "G73", "G74", "G76"],
    gCodeDialect: "fanuc",
    tribalTips: [
      "Doosan ships with FANUC controls — the generic FANUC post usually works as-is",
      "Puma SMX live tooling needs explicit M-codes for sub-spindle synchronization",
    ],
  },
  {
    id: "hardinge",
    name: "Hardinge Conquest",
    manufacturer: "Hardinge Inc.",
    variants: [
      { postFile: "hardinge.cps", description: "Hardinge Conquest (FANUC base)", axisCount: 4, capabilities: ["G81-G89", "G71-G76"], compatibleMachines: ["Conquest GT", "Quest"] },
    ],
    cycleSupport: ["G81-G89", "G71-G76"],
    gCodeDialect: "fanuc",
    tribalTips: [
      "Hardinge precision lathes need rigid bar feeders for parts < 25 mm dia",
    ],
  },
  {
    id: "trak_prototrak",
    name: "ProtoTrak (Trak / Southwestern)",
    manufacturer: "Southwestern Industries",
    variants: [
      { postFile: "prototrak.cps", description: "ProtoTrak DPM / RX 3-axis", axisCount: 3, capabilities: ["G81-G89", "conversational_subprograms"], compatibleMachines: ["DPM3", "RX5", "TRAK 1845"] },
    ],
    cycleSupport: ["G81-G89", "G73"],
    gCodeDialect: "prototrak",
    tribalTips: [
      "ProtoTrak DPM is conversational-first — G-code mode bypasses many built-in helpers",
    ],
  },
  {
    id: "linuxcnc",
    name: "LinuxCNC (generic)",
    manufacturer: "LinuxCNC project",
    variants: [
      { postFile: "linuxcnc.cps", description: "Generic LinuxCNC / EMC2 post", axisCount: 3, capabilities: ["G81-G89", "subroutines", "M-codes"], compatibleMachines: ["DIY conversions", "Hobbyist mills"] },
    ],
    cycleSupport: ["G81-G89", "G73"],
    gCodeDialect: "linuxcnc",
    tribalTips: [
      "LinuxCNC supports multiple kinematics — confirm machine [KINS] section before posting",
    ],
  },
];

// ── Frozen catalog construction ──────────────────────────────────────────────

function buildCatalog(): { byId: Map<string, ControllerFamily>; ordered: readonly ControllerFamily[] } {
  const byId = new Map<string, ControllerFamily>();
  const ordered: ControllerFamily[] = [];
  for (const raw of CATALOG_RAW) {
    const parsed = ControllerFamilySchema.parse(raw);
    if (byId.has(parsed.id)) throw new Error(`Fusion360ControllerCatalog: duplicate family id "${parsed.id}"`);
    for (const v of parsed.variants) Object.freeze(v);
    Object.freeze(parsed.variants);
    Object.freeze(parsed.cycleSupport);
    Object.freeze(parsed.tribalTips);
    Object.freeze(parsed);
    byId.set(parsed.id, parsed);
    ordered.push(parsed);
  }
  Object.freeze(ordered);
  return { byId, ordered };
}

const { byId: CATALOG_BY_ID, ordered: CATALOG_ORDERED } = buildCatalog();

// ── Engine ───────────────────────────────────────────────────────────────────

export class Fusion360ControllerCatalogEngine {
  static readonly EXPECTED_TOTAL = 16;

  static list(): ControllerFamily[] {
    return CATALOG_ORDERED.map(c => c);
  }

  static lookup(id: string): ControllerFamily | null {
    return CATALOG_BY_ID.get(id) ?? null;
  }

  static mustLookup(id: string): ControllerFamily {
    const c = CATALOG_BY_ID.get(id);
    if (!c) throw new Error(`Fusion360ControllerCatalog: unknown family id "${id}"`);
    return c;
  }

  static search(query: string): ControllerFamily[] {
    const q = query.toLowerCase().trim();
    if (q.length === 0) return [];
    return CATALOG_ORDERED.filter(f =>
      f.id.toLowerCase().includes(q) ||
      f.name.toLowerCase().includes(q) ||
      f.manufacturer.toLowerCase().includes(q) ||
      f.variants.some(v => v.postFile.toLowerCase().includes(q))
    );
  }

  static listByDialect(dialect: string): ControllerFamily[] {
    const d = dialect.toLowerCase().trim();
    if (d.length === 0) return [];
    return CATALOG_ORDERED.filter(f => f.gCodeDialect.toLowerCase() === d);
  }

  /** Variants supporting a given axis count (3-axis, 5-axis, etc.). */
  static listVariantsByAxisCount(axisCount: number): { family: ControllerFamily; variant: ControllerVariant }[] {
    const out: { family: ControllerFamily; variant: ControllerVariant }[] = [];
    for (const f of CATALOG_ORDERED) {
      for (const v of f.variants) {
        if (v.axisCount === axisCount) out.push({ family: f, variant: v });
      }
    }
    return out;
  }

  static count(): number {
    return CATALOG_ORDERED.length;
  }

  static stats(): { total_families: number; total_variants: number; by_dialect: Record<string, number>; axis_count_distribution: Record<number, number> } {
    const total_variants = CATALOG_ORDERED.reduce((acc, f) => acc + f.variants.length, 0);
    const by_dialect: Record<string, number> = {};
    const axis_count_distribution: Record<number, number> = {};
    for (const f of CATALOG_ORDERED) {
      by_dialect[f.gCodeDialect] = (by_dialect[f.gCodeDialect] ?? 0) + 1;
      for (const v of f.variants) {
        axis_count_distribution[v.axisCount] = (axis_count_distribution[v.axisCount] ?? 0) + 1;
      }
    }
    return { total_families: CATALOG_ORDERED.length, total_variants, by_dialect, axis_count_distribution };
  }

  static auditCatalog(): { ok: boolean; errors: string[] } {
    const errors: string[] = [];
    if (CATALOG_ORDERED.length !== Fusion360ControllerCatalogEngine.EXPECTED_TOTAL) {
      errors.push(`expected ${Fusion360ControllerCatalogEngine.EXPECTED_TOTAL} families, got ${CATALOG_ORDERED.length}`);
    }
    const ids = new Set<string>();
    for (const f of CATALOG_ORDERED) {
      if (ids.has(f.id)) errors.push(`duplicate family id "${f.id}"`);
      ids.add(f.id);
      const postFiles = new Set<string>();
      for (const v of f.variants) {
        if (postFiles.has(v.postFile)) errors.push(`family ${f.id}: duplicate postFile "${v.postFile}"`);
        postFiles.add(v.postFile);
      }
    }
    return { ok: errors.length === 0, errors };
  }
}

export const fusion360ControllerCatalogEngine = Fusion360ControllerCatalogEngine;
