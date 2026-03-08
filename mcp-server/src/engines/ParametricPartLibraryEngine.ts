/**
 * ParametricPartLibraryEngine — Common Mechanical Parts with CadQuery Codegen
 *
 * Generates parametric definitions and CadQuery Python code for standard
 * mechanical components: gears, bearings, fasteners, brackets, enclosures,
 * shafts, pulleys, couplings, housings, plates, and standoffs.
 *
 * Each part type accepts dimension parameters and returns:
 *   - A PartDefinition (compatible with SketchEngine)
 *   - CadQuery Python code for STEP/STL export
 *   - Estimated volume and mass (with material density)
 *
 * Source: Fusion360 Skill Roadmap Phase A + Machinery's Handbook standards
 */

let _idCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${(++_idCounter).toString(36)}`;
}

// ============================================================================
// TYPES
// ============================================================================

export interface PartSpec {
  id: string;
  type: string;
  name: string;
  params: Record<string, number | string | boolean | undefined | null | Record<string, number>>;
  material?: string;
  estimated_volume_mm3: number;
  estimated_mass_g?: number;
  cadquery_code: string;
  description: string;
}

interface MaterialDensity {
  name: string;
  density_g_cm3: number;
}

// ============================================================================
// MATERIAL DATABASE (common densities)
// ============================================================================

const MATERIAL_DENSITIES: Record<string, number> = {
  steel: 7.85,
  stainless_steel: 8.0,
  aluminum: 2.7,
  brass: 8.5,
  bronze: 8.8,
  copper: 8.96,
  titanium: 4.51,
  cast_iron: 7.2,
  nylon: 1.14,
  abs: 1.05,
  pla: 1.24,
  delrin: 1.41,
  ptfe: 2.2,
};

function estimateMass(volume_mm3: number, material?: string): number | undefined {
  if (!material) return undefined;
  const density = MATERIAL_DENSITIES[material.toLowerCase().replace(/[\s-]/g, "_")];
  if (!density) return undefined;
  return (volume_mm3 / 1000) * density; // mm3 → cm3 × g/cm3
}

// ============================================================================
// ENGINE
// ============================================================================

class ParametricPartLibraryEngine {

  // ── Spur Gear ──

  createSpurGear(params: {
    module: number;       // gear module (mm)
    teeth: number;        // number of teeth
    width: number;        // face width (mm)
    bore?: number;        // bore diameter (mm)
    pressure_angle?: number; // default 20 degrees
    material?: string;
  }): PartSpec {
    const m = params.module;
    const z = params.teeth;
    const w = params.width;
    const bore = params.bore ?? 0;
    const pa = params.pressure_angle ?? 20;

    const pitch_d = m * z;
    const outer_d = m * (z + 2);
    const root_d = m * (z - 2.5);
    const volume = Math.PI * ((outer_d / 2) ** 2) * w
      - (bore > 0 ? Math.PI * ((bore / 2) ** 2) * w : 0);
    // Approximate: actual tooth volume is ~75% of annular ring
    const adj_volume = volume * 0.85;

    const code = `import cadquery as cq
import math

# Spur Gear: Module=${m}, Teeth=${z}, Width=${w}mm
m = ${m}  # module
z = ${z}  # teeth
pa = math.radians(${pa})  # pressure angle
w = ${w}  # face width
bore = ${bore}

pitch_r = m * z / 2
outer_r = m * (z + 2) / 2
root_r = m * (z - 2.5) / 2
base_r = pitch_r * math.cos(pa)

# Involute tooth profile approximation
def involute_point(base_r, angle):
    x = base_r * (math.cos(angle) + angle * math.sin(angle))
    y = base_r * (math.sin(angle) - angle * math.cos(angle))
    return (x, y)

# Generate gear blank then cut teeth
result = (
    cq.Workplane("XY")
    .circle(outer_r)
    .extrude(w)
)

# Cut each tooth gap
tooth_angle = 360 / z
for i in range(z):
    angle = math.radians(i * tooth_angle)
    gap_width = m * math.pi * 0.45  # tooth gap ~45% of pitch
    x1 = (pitch_r - m) * math.cos(angle - gap_width / pitch_r / 2)
    y1 = (pitch_r - m) * math.sin(angle - gap_width / pitch_r / 2)
    x2 = (pitch_r - m) * math.cos(angle + gap_width / pitch_r / 2)
    y2 = (pitch_r - m) * math.sin(angle + gap_width / pitch_r / 2)
    result = (
        result
        .faces(">Z")
        .workplane()
        .moveTo(x1, y1)
        .radiusArc((x2, y2), -root_r)
        .close()
        .cutBlind(-w)
    )

# Bore hole
if bore > 0:
    result = result.faces(">Z").workplane().hole(bore, w)

cq.exporters.export(result, "spur_gear_m${m}_z${z}.step")
`;

    return {
      id: nextId("prt"),
      type: "spur_gear",
      name: params.material ? `${params.material} Spur Gear M${m}×${z}` : `Spur Gear M${m}×${z}`,
      params: { module: m, teeth: z, width: w, bore, pressure_angle: pa, pitch_diameter: pitch_d, outer_diameter: outer_d, root_diameter: root_d },
      material: params.material,
      estimated_volume_mm3: adj_volume,
      estimated_mass_g: estimateMass(adj_volume, params.material),
      cadquery_code: code,
      description: `Spur gear: M${m}, ${z} teeth, ${w}mm wide, PD=${pitch_d.toFixed(1)}mm, OD=${outer_d.toFixed(1)}mm`,
    };
  }

  // ── Shaft ──

  createShaft(params: {
    diameter: number;
    length: number;
    keyway?: { width: number; depth: number; length: number };
    chamfer?: number;
    bore?: number;
    material?: string;
  }): PartSpec {
    const d = params.diameter;
    const l = params.length;
    const r = d / 2;
    let volume = Math.PI * r * r * l;

    if (params.bore) {
      volume -= Math.PI * (params.bore / 2) ** 2 * l;
    }
    if (params.keyway) {
      volume -= params.keyway.width * params.keyway.depth * params.keyway.length;
    }

    let code = `import cadquery as cq

# Shaft: D=${d}mm, L=${l}mm
result = cq.Workplane("XY").circle(${r}).extrude(${l})
`;
    if (params.chamfer) {
      code += `result = result.edges("|Z").chamfer(${params.chamfer})\n`;
    }
    if (params.bore) {
      code += `result = result.faces(">Z").workplane().hole(${params.bore}, ${l})\n`;
    }
    if (params.keyway) {
      const kw = params.keyway;
      code += `
# Keyway
result = (
    result.faces(">Z").workplane()
    .center(0, ${r - kw.depth / 2})
    .rect(${kw.width}, ${kw.depth})
    .cutBlind(-${kw.length})
)
`;
    }
    code += `\ncq.exporters.export(result, "shaft_d${d}_l${l}.step")\n`;

    return {
      id: nextId("prt"),
      type: "shaft",
      name: `Shaft D${d}×L${l}`,
      params: { diameter: d, length: l, keyway: params.keyway, chamfer: params.chamfer, bore: params.bore },
      material: params.material,
      estimated_volume_mm3: volume,
      estimated_mass_g: estimateMass(volume, params.material),
      cadquery_code: code,
      description: `Shaft: ${d}mm dia × ${l}mm long${params.keyway ? ", with keyway" : ""}${params.bore ? `, ${params.bore}mm bore` : ""}`,
    };
  }

  // ── Hex Bolt ──

  createHexBolt(params: {
    size: number;        // nominal diameter (e.g. 8 for M8)
    length: number;      // shank length (mm)
    pitch?: number;      // thread pitch (mm), default ISO coarse
    head_height?: number;
    material?: string;
  }): PartSpec {
    const d = params.size;
    const l = params.length;
    // ISO coarse pitch defaults
    const pitchMap: Record<number, number> = { 3: 0.5, 4: 0.7, 5: 0.8, 6: 1.0, 8: 1.25, 10: 1.5, 12: 1.75, 16: 2.0, 20: 2.5, 24: 3.0 };
    const pitch = params.pitch ?? pitchMap[d] ?? 1.5;
    const headH = params.head_height ?? d * 0.65;
    const headAF = d * 1.5; // across flats
    const headAC = headAF / Math.cos(Math.PI / 6); // across corners

    const shankVol = Math.PI * (d / 2) ** 2 * l;
    const headVol = (3 * Math.sqrt(3) / 2) * (headAF / 2) ** 2 * headH;
    const volume = shankVol + headVol;

    const code = `import cadquery as cq
import math

# Hex Bolt M${d}x${l}, pitch=${pitch}mm
d = ${d}  # nominal diameter
l = ${l}  # shank length
head_h = ${headH.toFixed(1)}  # head height
head_af = ${headAF.toFixed(1)}  # across flats

# Head (hexagonal prism)
head = (
    cq.Workplane("XY")
    .polygon(6, head_af / math.cos(math.pi / 6))
    .extrude(head_h)
    .edges(">Z").chamfer(0.5)
    .edges("<Z").chamfer(0.3)
)

# Shank (cylinder)
shank = (
    cq.Workplane("XY")
    .workplane(offset=-l)
    .circle(d / 2)
    .extrude(l)
)

# Chamfer shank tip
shank = shank.edges("<Z").chamfer(d * 0.1)

result = head.union(shank)
cq.exporters.export(result, "hex_bolt_M${d}x${l}.step")
`;

    return {
      id: nextId("prt"),
      type: "hex_bolt",
      name: `Hex Bolt M${d}×${l}`,
      params: { size: d, length: l, pitch, head_height: headH, head_across_flats: headAF },
      material: params.material ?? "steel",
      estimated_volume_mm3: volume,
      estimated_mass_g: estimateMass(volume, params.material ?? "steel"),
      cadquery_code: code,
      description: `M${d}×${l} hex bolt, pitch ${pitch}mm, head AF=${headAF.toFixed(1)}mm`,
    };
  }

  // ── Hex Nut ──

  createHexNut(params: {
    size: number;
    height?: number;
    material?: string;
  }): PartSpec {
    const d = params.size;
    const h = params.height ?? d * 0.8;
    const af = d * 1.5;
    const hexArea = (3 * Math.sqrt(3) / 2) * (af / 2) ** 2;
    const boreArea = Math.PI * (d / 2) ** 2;
    const volume = (hexArea - boreArea) * h;

    const code = `import cadquery as cq
import math

# Hex Nut M${d}
d = ${d}
h = ${h.toFixed(1)}
af = ${af.toFixed(1)}

result = (
    cq.Workplane("XY")
    .polygon(6, af / math.cos(math.pi / 6))
    .extrude(h)
    .faces(">Z").workplane()
    .hole(d, h)
    .edges(">Z or <Z").chamfer(0.5)
)

cq.exporters.export(result, "hex_nut_M${d}.step")
`;

    return {
      id: nextId("prt"),
      type: "hex_nut",
      name: `Hex Nut M${d}`,
      params: { size: d, height: h, across_flats: af },
      material: params.material ?? "steel",
      estimated_volume_mm3: volume,
      estimated_mass_g: estimateMass(volume, params.material ?? "steel"),
      cadquery_code: code,
      description: `M${d} hex nut, height ${h.toFixed(1)}mm, AF=${af.toFixed(1)}mm`,
    };
  }

  // ── Washer ──

  createWasher(params: {
    bore: number;         // inner diameter
    outer_diameter: number;
    thickness: number;
    material?: string;
  }): PartSpec {
    const id = params.bore;
    const od = params.outer_diameter;
    const t = params.thickness;
    const volume = Math.PI * ((od / 2) ** 2 - (id / 2) ** 2) * t;

    const code = `import cadquery as cq

# Washer: bore=${id}mm, OD=${od}mm, t=${t}mm
result = (
    cq.Workplane("XY")
    .circle(${od / 2})
    .circle(${id / 2})
    .extrude(${t})
)

cq.exporters.export(result, "washer_${id}x${od}x${t}.step")
`;

    return {
      id: nextId("prt"),
      type: "washer",
      name: `Washer ${id}×${od}×${t}`,
      params: { bore: id, outer_diameter: od, thickness: t },
      material: params.material ?? "steel",
      estimated_volume_mm3: volume,
      estimated_mass_g: estimateMass(volume, params.material ?? "steel"),
      cadquery_code: code,
      description: `Washer: ID=${id}mm, OD=${od}mm, thickness=${t}mm`,
    };
  }

  // ── Bearing Housing ──

  createBearingHousing(params: {
    bearing_od: number;     // bearing outer diameter
    bearing_width: number;  // bearing width
    wall_thickness: number; // housing wall thickness
    base_height: number;    // base below center
    bolt_spacing: number;   // bolt hole center-to-center
    bolt_diameter: number;  // bolt hole diameter
    material?: string;
  }): PartSpec {
    const bod = params.bearing_od;
    const bw = params.bearing_width;
    const wt = params.wall_thickness;
    const bh = params.base_height;
    const bs = params.bolt_spacing;
    const bd = params.bolt_diameter;
    const housingOD = bod + 2 * wt;
    const housingR = housingOD / 2;
    const baseW = bs + bd * 3;
    const baseL = bw + 2 * wt;

    // Approximate volume: cylinder + base plate - bore - bolt holes
    const cylVol = Math.PI * housingR ** 2 * baseL - Math.PI * (bod / 2) ** 2 * baseL;
    const baseVol = baseW * baseL * wt;
    const boltVol = 2 * Math.PI * (bd / 2) ** 2 * wt;
    const volume = cylVol + baseVol - boltVol;

    const code = `import cadquery as cq

# Bearing Housing: Bearing OD=${bod}mm, Width=${bw}mm
bearing_od = ${bod}
bearing_w = ${bw}
wall = ${wt}
base_h = ${bh}
bolt_spacing = ${bs}
bolt_d = ${bd}
housing_od = bearing_od + 2 * wall

# Base plate
base_w = bolt_spacing + bolt_d * 3
base_l = bearing_w + 2 * wall

result = (
    cq.Workplane("XY")
    .rect(base_w, base_l)
    .extrude(wall)
)

# Cylindrical housing
result = (
    result.faces(">Z").workplane()
    .circle(housing_od / 2)
    .extrude(housing_od / 2 + base_h - wall)
)

# Bearing bore
result = (
    result.faces(">Z").workplane()
    .hole(bearing_od, bearing_w + 2 * wall)
)

# Bolt holes
result = (
    result.faces("<Z").workplane()
    .pushPoints([(-bolt_spacing / 2, 0), (bolt_spacing / 2, 0)])
    .hole(bolt_d, wall)
)

# Fillets on base-to-housing transition
result = result.edges("|Z").fillet(wall * 0.5)

cq.exporters.export(result, "bearing_housing_${bod}.step")
`;

    return {
      id: nextId("prt"),
      type: "bearing_housing",
      name: `Bearing Housing for OD${bod}`,
      params: { bearing_od: bod, bearing_width: bw, wall_thickness: wt, base_height: bh, bolt_spacing: bs, bolt_diameter: bd, housing_od: housingOD },
      material: params.material ?? "cast_iron",
      estimated_volume_mm3: volume,
      estimated_mass_g: estimateMass(volume, params.material ?? "cast_iron"),
      cadquery_code: code,
      description: `Bearing housing for ${bod}mm bearing, ${bw}mm wide, ${wt}mm walls`,
    };
  }

  // ── Enclosure / Box with Lid ──

  createEnclosure(params: {
    width: number;
    depth: number;
    height: number;
    wall_thickness: number;
    lid_thickness?: number;
    corner_radius?: number;
    screw_diameter?: number;
    screw_boss_diameter?: number;
    material?: string;
  }): PartSpec {
    const w = params.width;
    const d = params.depth;
    const h = params.height;
    const wt = params.wall_thickness;
    const lt = params.lid_thickness ?? wt;
    const cr = params.corner_radius ?? 2;
    const sd = params.screw_diameter ?? 3;
    const sbd = params.screw_boss_diameter ?? sd * 2.5;

    const outerVol = w * d * h;
    const innerVol = (w - 2 * wt) * (d - 2 * wt) * (h - wt);
    const lidVol = w * d * lt;
    const volume = outerVol - innerVol + lidVol;

    const code = `import cadquery as cq

# Enclosure: ${w}x${d}x${h}mm, wall=${wt}mm
w, d, h = ${w}, ${d}, ${h}
wt = ${wt}
lt = ${lt}
cr = ${cr}
sd = ${sd}
sbd = ${sbd}

# Box body (hollow)
box = (
    cq.Workplane("XY")
    .rect(w, d)
    .extrude(h)
    .edges("|Z").fillet(cr)
    .faces(">Z")
    .shell(-wt)
)

# Screw bosses in corners (inside)
inset = wt + sbd / 2
boss_pts = [
    (-w/2 + inset, -d/2 + inset),
    (w/2 - inset, -d/2 + inset),
    (-w/2 + inset, d/2 - inset),
    (w/2 - inset, d/2 - inset),
]
box = (
    box.faces("<Z[1]").workplane()  # inner bottom
    .pushPoints(boss_pts)
    .circle(sbd / 2)
    .extrude(h - wt - lt)
)
# Screw holes in bosses
box = (
    box.faces(">Z").workplane()
    .pushPoints(boss_pts)
    .hole(sd, h - wt)
)

# Lid
lid = (
    cq.Workplane("XY")
    .workplane(offset=h + 2)
    .rect(w, d)
    .extrude(lt)
    .edges("|Z").fillet(cr)
)
# Lid screw holes
lid = (
    lid.faces(">Z").workplane()
    .pushPoints(boss_pts)
    .hole(sd * 1.1, lt)
)

cq.exporters.export(box, "enclosure_box_${w}x${d}x${h}.step")
cq.exporters.export(lid, "enclosure_lid_${w}x${d}x${h}.step")
`;

    return {
      id: nextId("prt"),
      type: "enclosure",
      name: `Enclosure ${w}×${d}×${h}`,
      params: { width: w, depth: d, height: h, wall_thickness: wt, lid_thickness: lt, corner_radius: cr, screw_diameter: sd, screw_boss_diameter: sbd },
      material: params.material ?? "abs",
      estimated_volume_mm3: volume,
      estimated_mass_g: estimateMass(volume, params.material ?? "abs"),
      cadquery_code: code,
      description: `Enclosure: ${w}×${d}×${h}mm, ${wt}mm walls, corner R${cr}, 4 screw bosses`,
    };
  }

  // ── Motor Mount Plate ──

  createMotorMountPlate(params: {
    width: number;
    height: number;
    thickness: number;
    pilot_diameter: number;     // motor spigot/pilot bore
    bolt_circle_diameter: number;
    bolt_count: number;
    bolt_diameter: number;
    shaft_hole_diameter: number;
    corner_radius?: number;
    material?: string;
  }): PartSpec {
    const w = params.width;
    const h = params.height;
    const t = params.thickness;
    const pd = params.pilot_diameter;
    const bcd = params.bolt_circle_diameter;
    const bc = params.bolt_count;
    const bd = params.bolt_diameter;
    const shd = params.shaft_hole_diameter;
    const cr = params.corner_radius ?? 5;

    const plateVol = w * h * t;
    const pilotVol = Math.PI * (pd / 2) ** 2 * (t / 2);  // counterbore for pilot
    const boltVol = bc * Math.PI * (bd / 2) ** 2 * t;
    const shaftVol = Math.PI * (shd / 2) ** 2 * t;
    const volume = plateVol - pilotVol - boltVol - shaftVol;

    const code = `import cadquery as cq
import math

# Motor Mount Plate: ${w}x${h}x${t}mm
w, h, t = ${w}, ${h}, ${t}
pilot_d = ${pd}
bcd = ${bcd}
bolt_n = ${bc}
bolt_d = ${bd}
shaft_d = ${shd}

# Base plate
result = (
    cq.Workplane("XY")
    .rect(w, h)
    .extrude(t)
    .edges("|Z").fillet(${cr})
)

# Shaft clearance hole (center)
result = result.faces(">Z").workplane().hole(shaft_d, t)

# Pilot bore (shallow counterbore for motor spigot)
result = (
    result.faces(">Z").workplane()
    .circle(pilot_d / 2)
    .cutBlind(-${(t / 2).toFixed(1)})
)

# Bolt holes on bolt circle
bolt_pts = []
for i in range(bolt_n):
    angle = 2 * math.pi * i / bolt_n
    bolt_pts.append((bcd / 2 * math.cos(angle), bcd / 2 * math.sin(angle)))

result = (
    result.faces(">Z").workplane()
    .pushPoints(bolt_pts)
    .hole(bolt_d, t)
)

cq.exporters.export(result, "motor_mount_${w}x${h}.step")
`;

    return {
      id: nextId("prt"),
      type: "motor_mount_plate",
      name: `Motor Mount ${w}×${h}`,
      params: { width: w, height: h, thickness: t, pilot_diameter: pd, bolt_circle_diameter: bcd, bolt_count: bc, bolt_diameter: bd, shaft_hole_diameter: shd },
      material: params.material ?? "aluminum",
      estimated_volume_mm3: volume,
      estimated_mass_g: estimateMass(volume, params.material ?? "aluminum"),
      cadquery_code: code,
      description: `Motor mount plate: ${w}×${h}×${t}mm, ${bc} bolts on BCD${bcd}, shaft D${shd}`,
    };
  }

  // ── Standoff / Spacer ──

  createStandoff(params: {
    outer_diameter: number;
    height: number;
    bore: number;
    hex?: boolean;   // hex or round
    material?: string;
  }): PartSpec {
    const od = params.outer_diameter;
    const h = params.height;
    const bore = params.bore;
    const hex = params.hex ?? false;

    let outerArea: number;
    if (hex) {
      outerArea = (3 * Math.sqrt(3) / 2) * (od / 2) ** 2;
    } else {
      outerArea = Math.PI * (od / 2) ** 2;
    }
    const boreArea = Math.PI * (bore / 2) ** 2;
    const volume = (outerArea - boreArea) * h;

    const shape = hex ? "hex" : "round";
    const code = `import cadquery as cq

# ${shape.charAt(0).toUpperCase() + shape.slice(1)} Standoff: OD=${od}mm, H=${h}mm, bore=${bore}mm
result = (
    cq.Workplane("XY")
    .${hex ? `polygon(6, ${(od / Math.cos(Math.PI / 6)).toFixed(2)})` : `circle(${od / 2})`}
    .extrude(${h})
    .faces(">Z").workplane()
    .hole(${bore}, ${h})
)

cq.exporters.export(result, "${shape}_standoff_${od}x${h}.step")
`;

    return {
      id: nextId("prt"),
      type: "standoff",
      name: `${hex ? "Hex" : "Round"} Standoff ${od}×${h}`,
      params: { outer_diameter: od, height: h, bore, hex },
      material: params.material ?? "brass",
      estimated_volume_mm3: volume,
      estimated_mass_g: estimateMass(volume, params.material ?? "brass"),
      cadquery_code: code,
      description: `${hex ? "Hex" : "Round"} standoff: OD=${od}mm, H=${h}mm, bore=${bore}mm`,
    };
  }

  // ── Pulley ──

  createPulley(params: {
    pitch_diameter: number;
    width: number;
    bore: number;
    groove_count?: number;
    groove_depth?: number;
    groove_angle?: number;   // V-belt angle (default 38 degrees)
    hub_diameter?: number;
    hub_length?: number;
    keyway?: { width: number; depth: number };
    material?: string;
  }): PartSpec {
    const pd = params.pitch_diameter;
    const w = params.width;
    const bore = params.bore;
    const gc = params.groove_count ?? 1;
    const gd = params.groove_depth ?? 5;
    const ga = params.groove_angle ?? 38;
    const hd = params.hub_diameter ?? bore * 2.5;
    const hl = params.hub_length ?? w * 0.6;

    const rimVol = Math.PI * ((pd / 2) ** 2 - ((pd / 2 - gd) ** 2)) * w;
    const hubVol = Math.PI * ((hd / 2) ** 2 - (bore / 2) ** 2) * (w + hl);
    const volume = rimVol + hubVol;

    const code = `import cadquery as cq
import math

# Pulley: PD=${pd}mm, ${gc} groove(s), bore=${bore}mm
pd = ${pd}
w = ${w}
bore = ${bore}
groove_count = ${gc}
groove_depth = ${gd}
groove_angle = ${ga}
hub_d = ${hd}
hub_l = ${hl}

outer_r = pd / 2 + groove_depth / 2

# Main pulley body
result = (
    cq.Workplane("XY")
    .circle(outer_r)
    .extrude(w)
)

# V-grooves (cut as V-shaped rings)
groove_spacing = w / (groove_count + 1)
half_angle = math.radians(groove_angle / 2)
for i in range(groove_count):
    z_pos = groove_spacing * (i + 1)
    # Approximate V-groove with a rectangular cut + chamfer
    result = (
        result.faces(">Z").workplane(offset=-z_pos + groove_depth * math.tan(half_angle) / 2)
        .circle(outer_r + 1)
        .circle(pd / 2 - groove_depth)
        .cutBlind(-groove_depth * 2 * math.tan(half_angle))
    )

# Central bore
result = result.faces(">Z").workplane().hole(bore, w)

# Hub extension
hub = (
    cq.Workplane("XY")
    .workplane(offset=-hub_l)
    .circle(hub_d / 2)
    .extrude(hub_l)
)
hub = hub.faces(">Z").workplane().hole(bore, hub_l)
result = result.union(hub)

cq.exporters.export(result, "pulley_pd${pd}_${gc}groove.step")
`;

    return {
      id: nextId("prt"),
      type: "pulley",
      name: `Pulley PD${pd} ${gc}-groove`,
      params: { pitch_diameter: pd, width: w, bore, groove_count: gc, groove_depth: gd, groove_angle: ga, hub_diameter: hd, hub_length: hl },
      material: params.material ?? "aluminum",
      estimated_volume_mm3: volume,
      estimated_mass_g: estimateMass(volume, params.material ?? "aluminum"),
      cadquery_code: code,
      description: `Pulley: PD=${pd}mm, ${gc} V-groove(s), bore=${bore}mm, hub D${hd}×L${hl}`,
    };
  }

  // ── Coupling (Rigid Shaft Coupling) ──

  createCoupling(params: {
    bore1: number;       // first shaft bore
    bore2: number;       // second shaft bore (can equal bore1)
    outer_diameter: number;
    length: number;
    bolt_count?: number;
    bolt_diameter?: number;
    material?: string;
  }): PartSpec {
    const b1 = params.bore1;
    const b2 = params.bore2;
    const od = params.outer_diameter;
    const l = params.length;
    const bc = params.bolt_count ?? 4;
    const bd = params.bolt_diameter ?? Math.max(b1, b2) * 0.3;

    const halfL = l / 2;
    const halfVol = Math.PI * ((od / 2) ** 2) * halfL;
    const bore1Vol = Math.PI * (b1 / 2) ** 2 * halfL;
    const bore2Vol = Math.PI * (b2 / 2) ** 2 * halfL;
    const boltVol = bc * Math.PI * (bd / 2) ** 2 * l;
    const volume = halfVol * 2 - bore1Vol - bore2Vol - boltVol;

    const code = `import cadquery as cq
import math

# Rigid Coupling: bore1=${b1}mm, bore2=${b2}mm, OD=${od}mm
od = ${od}
l = ${l}
bore1 = ${b1}
bore2 = ${b2}
bolt_n = ${bc}
bolt_d = ${bd}
bolt_circle_r = od / 2 * 0.7

# Two halves
half1 = cq.Workplane("XY").circle(od / 2).extrude(l / 2)
half1 = half1.faces(">Z").workplane().hole(bore1, l / 2)

half2 = cq.Workplane("XY").workplane(offset=l / 2).circle(od / 2).extrude(l / 2)
half2 = half2.faces(">Z").workplane().hole(bore2, l / 2)

result = half1.union(half2)

# Bolt holes
bolt_pts = []
for i in range(bolt_n):
    angle = 2 * math.pi * i / bolt_n
    bolt_pts.append((bolt_circle_r * math.cos(angle), bolt_circle_r * math.sin(angle)))

result = (
    result.faces(">Z").workplane()
    .pushPoints(bolt_pts)
    .hole(bolt_d, l)
)

cq.exporters.export(result, "coupling_${b1}_${b2}.step")
`;

    return {
      id: nextId("prt"),
      type: "coupling",
      name: `Coupling ${b1}/${b2}mm`,
      params: { bore1: b1, bore2: b2, outer_diameter: od, length: l, bolt_count: bc, bolt_diameter: bd },
      material: params.material ?? "steel",
      estimated_volume_mm3: volume,
      estimated_mass_g: estimateMass(volume, params.material ?? "steel"),
      cadquery_code: code,
      description: `Rigid coupling: ${b1}mm/${b2}mm bores, OD=${od}mm, ${bc} bolts`,
    };
  }

  // ── Utility: List available part types ──

  listPartTypes(): { type: string; description: string; required_params: string[] }[] {
    return [
      { type: "spur_gear", description: "Involute spur gear with optional bore", required_params: ["module", "teeth", "width"] },
      { type: "shaft", description: "Cylindrical shaft with optional keyway, chamfer, bore", required_params: ["diameter", "length"] },
      { type: "hex_bolt", description: "ISO metric hex bolt", required_params: ["size", "length"] },
      { type: "hex_nut", description: "ISO metric hex nut", required_params: ["size"] },
      { type: "washer", description: "Flat washer (any size)", required_params: ["bore", "outer_diameter", "thickness"] },
      { type: "bearing_housing", description: "Pillow-block style bearing housing", required_params: ["bearing_od", "bearing_width", "wall_thickness", "base_height", "bolt_spacing", "bolt_diameter"] },
      { type: "enclosure", description: "Rectangular enclosure box with screw-on lid", required_params: ["width", "depth", "height", "wall_thickness"] },
      { type: "motor_mount_plate", description: "Motor mounting plate with bolt circle", required_params: ["width", "height", "thickness", "pilot_diameter", "bolt_circle_diameter", "bolt_count", "bolt_diameter", "shaft_hole_diameter"] },
      { type: "standoff", description: "Round or hex standoff/spacer", required_params: ["outer_diameter", "height", "bore"] },
      { type: "pulley", description: "V-belt pulley with hub", required_params: ["pitch_diameter", "width", "bore"] },
      { type: "coupling", description: "Rigid shaft coupling (two-bore)", required_params: ["bore1", "bore2", "outer_diameter", "length"] },
    ];
  }

  // ── Universal create method ──

  createPart(type: string, params: Record<string, unknown>): PartSpec {
    switch (type) {
      case "spur_gear": return this.createSpurGear(params as Parameters<ParametricPartLibraryEngine["createSpurGear"]>[0]);
      case "shaft": return this.createShaft(params as Parameters<ParametricPartLibraryEngine["createShaft"]>[0]);
      case "hex_bolt": return this.createHexBolt(params as Parameters<ParametricPartLibraryEngine["createHexBolt"]>[0]);
      case "hex_nut": return this.createHexNut(params as Parameters<ParametricPartLibraryEngine["createHexNut"]>[0]);
      case "washer": return this.createWasher(params as Parameters<ParametricPartLibraryEngine["createWasher"]>[0]);
      case "bearing_housing": return this.createBearingHousing(params as Parameters<ParametricPartLibraryEngine["createBearingHousing"]>[0]);
      case "enclosure": return this.createEnclosure(params as Parameters<ParametricPartLibraryEngine["createEnclosure"]>[0]);
      case "motor_mount_plate": return this.createMotorMountPlate(params as Parameters<ParametricPartLibraryEngine["createMotorMountPlate"]>[0]);
      case "standoff": return this.createStandoff(params as Parameters<ParametricPartLibraryEngine["createStandoff"]>[0]);
      case "pulley": return this.createPulley(params as Parameters<ParametricPartLibraryEngine["createPulley"]>[0]);
      case "coupling": return this.createCoupling(params as Parameters<ParametricPartLibraryEngine["createCoupling"]>[0]);
      default: throw new Error(`Unknown part type: ${type}. Available: ${this.listPartTypes().map(p => p.type).join(", ")}`);
    }
  }
}

export const parametricPartLibraryEngine = new ParametricPartLibraryEngine();
