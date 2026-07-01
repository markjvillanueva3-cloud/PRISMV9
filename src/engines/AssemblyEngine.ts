/**
 * AssemblyEngine — Multi-Body Assembly with Constraints & CadQuery Codegen
 *
 * Manages assemblies of parts with mate constraints (fixed, coincident, axis,
 * angle, distance). Generates CadQuery Assembly Python code for STEP export.
 *
 * Source: Fusion360 Skill Roadmap Phase A + CadQuery Assembly API
 */

let _idCounter = 0;
function nextId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${(++_idCounter).toString(36)}`;
}

// ============================================================================
// TYPES
// ============================================================================

export interface AssemblyComponent {
  id: string;
  name: string;
  part_type: string;
  /** CadQuery variable name in generated code */
  cq_var: string;
  /** CadQuery code to build this part (standalone) */
  cadquery_build_code: string;
  /** Position in assembly (translation) */
  position: { x: number; y: number; z: number };
  /** Rotation in degrees (Euler XYZ) */
  rotation: { rx: number; ry: number; rz: number };
  /** Quantity (for BOM) */
  quantity: number;
  material?: string;
  color?: string;
}

export type MateType =
  | "fixed"       // locked in place
  | "coincident"  // faces touching
  | "axis"        // axes aligned
  | "angle"       // angular offset between faces
  | "distance"    // offset distance between faces
  | "tangent"     // surfaces tangent
  | "rigid_group"; // group moves as one

export interface Mate {
  id: string;
  type: MateType;
  component_a: string;  // component id
  component_b: string;  // component id
  /** Face/edge/point selector on A (CadQuery selector string) */
  selector_a?: string;
  /** Face/edge/point selector on B */
  selector_b?: string;
  /** Value for distance/angle mates */
  value?: number;
  /** Flip direction */
  flip?: boolean;
}

export interface BOMEntry {
  part_number: number;
  name: string;
  part_type: string;
  quantity: number;
  material?: string;
}

export interface Assembly {
  id: string;
  name: string;
  description?: string;
  components: AssemblyComponent[];
  mates: Mate[];
  created_at: string;
}

// ============================================================================
// ENGINE
// ============================================================================

class AssemblyEngine {

  createAssembly(name: string, description?: string): Assembly {
    return {
      id: nextId("asm"),
      name,
      description,
      components: [],
      mates: [],
      created_at: new Date().toISOString(),
    };
  }

  addComponent(
    assembly: Assembly,
    name: string,
    part_type: string,
    cadquery_build_code: string,
    options?: {
      position?: { x: number; y: number; z: number };
      rotation?: { rx: number; ry: number; rz: number };
      quantity?: number;
      material?: string;
      color?: string;
    },
  ): AssemblyComponent {
    const idx = assembly.components.length;
    const cq_var = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || `part_${idx}`;

    const comp: AssemblyComponent = {
      id: nextId("comp"),
      name,
      part_type,
      cq_var: `${cq_var}_${idx}`,
      cadquery_build_code,
      position: options?.position ?? { x: 0, y: 0, z: 0 },
      rotation: options?.rotation ?? { rx: 0, ry: 0, rz: 0 },
      quantity: options?.quantity ?? 1,
      material: options?.material,
      color: options?.color,
    };

    assembly.components.push(comp);
    return comp;
  }

  addMate(
    assembly: Assembly,
    type: MateType,
    component_a_id: string,
    component_b_id: string,
    options?: {
      selector_a?: string;
      selector_b?: string;
      value?: number;
      flip?: boolean;
    },
  ): Mate {
    const a = assembly.components.find(c => c.id === component_a_id);
    const b = assembly.components.find(c => c.id === component_b_id);
    if (!a) throw new Error(`Component not found: ${component_a_id}`);
    if (!b) throw new Error(`Component not found: ${component_b_id}`);

    const mate: Mate = {
      id: nextId("mate"),
      type,
      component_a: component_a_id,
      component_b: component_b_id,
      selector_a: options?.selector_a,
      selector_b: options?.selector_b,
      value: options?.value,
      flip: options?.flip,
    };

    assembly.mates.push(mate);
    return mate;
  }

  /** Move component to absolute position */
  positionComponent(
    assembly: Assembly,
    component_id: string,
    position: { x: number; y: number; z: number },
    rotation?: { rx: number; ry: number; rz: number },
  ): void {
    const comp = assembly.components.find(c => c.id === component_id);
    if (!comp) throw new Error(`Component not found: ${component_id}`);
    comp.position = position;
    if (rotation) comp.rotation = rotation;
  }

  /** Generate Bill of Materials */
  generateBOM(assembly: Assembly): BOMEntry[] {
    const bomMap = new Map<string, BOMEntry>();
    for (const comp of assembly.components) {
      const key = `${comp.part_type}:${comp.name}`;
      const existing = bomMap.get(key);
      if (existing) {
        existing.quantity += comp.quantity;
      } else {
        bomMap.set(key, {
          part_number: bomMap.size + 1,
          name: comp.name,
          part_type: comp.part_type,
          quantity: comp.quantity,
          material: comp.material,
        });
      }
    }
    return Array.from(bomMap.values());
  }

  /** Generate CadQuery Assembly Python code */
  toCadQueryPython(assembly: Assembly): string {
    const lines: string[] = [
      "import cadquery as cq",
      "from cadquery import Assembly as CQAssembly",
      "",
      `# Assembly: ${assembly.name}`,
    ];
    if (assembly.description) {
      lines.push(`# ${assembly.description}`);
    }
    lines.push("");

    // Build each component
    for (const comp of assembly.components) {
      lines.push(`# --- ${comp.name} (${comp.part_type}) ---`);
      // Indent the build code and assign to variable
      const buildLines = comp.cadquery_build_code
        .split("\n")
        .filter(l => !l.startsWith("import ") && !l.startsWith("from "))
        .filter(l => !l.includes("cq.exporters.export"))
        .map(l => l.replace(/^result\b/, comp.cq_var));
      lines.push(...buildLines);
      lines.push("");
    }

    // Create assembly
    lines.push("# --- Assembly ---");
    lines.push("assy = CQAssembly()");
    lines.push("");

    for (const comp of assembly.components) {
      const p = comp.position;
      const r = comp.rotation;
      const hasPos = p.x !== 0 || p.y !== 0 || p.z !== 0;
      const hasRot = r.rx !== 0 || r.ry !== 0 || r.rz !== 0;

      let locStr = "";
      if (hasPos || hasRot) {
        locStr = `, loc=cq.Location(`;
        locStr += `cq.Vector(${p.x}, ${p.y}, ${p.z})`;
        if (hasRot) {
          locStr += `, cq.Vector(${r.rx}, ${r.ry}, ${r.rz})`;
        }
        locStr += `)`;
      }

      const colorStr = comp.color
        ? `, color=cq.Color("${comp.color}")`
        : "";

      lines.push(
        `assy.add(${comp.cq_var}, name="${comp.name}"${locStr}${colorStr})`,
      );
    }

    // Mates (CadQuery constraint API)
    if (assembly.mates.length > 0) {
      lines.push("");
      lines.push("# --- Constraints ---");
      for (const mate of assembly.mates) {
        const a = assembly.components.find(c => c.id === mate.component_a);
        const b = assembly.components.find(c => c.id === mate.component_b);
        if (!a || !b) continue;

        const selA = mate.selector_a ? `@${mate.selector_a}` : "";
        const selB = mate.selector_b ? `@${mate.selector_b}` : "";
        const mateKind = this.mapMateType(mate.type);
        let paramStr = "";
        if (mate.value != null) paramStr = `, param=${mate.value}`;

        lines.push(
          `assy.constrain("${a.name}${selA}", `
          + `"${b.name}${selB}", "${mateKind}"${paramStr})`,
        );
      }
      lines.push("");
      lines.push("assy.solve()");
    }

    lines.push("");
    const filename = assembly.name
      .toLowerCase().replace(/[^a-z0-9]+/g, "_");
    lines.push(`cq.exporters.export(assy.toCompound(), "${filename}.step")`);
    lines.push(
      `print(f"Assembly '${assembly.name}' exported to ${filename}.step")`,
    );
    lines.push("");

    return lines.join("\n");
  }

  /** Generate BOM as markdown table */
  toBOMMarkdown(assembly: Assembly): string {
    const bom = this.generateBOM(assembly);
    const lines = [
      `# Bill of Materials: ${assembly.name}`,
      "",
      "| # | Part Name | Type | Qty | Material |",
      "|---|-----------|------|-----|----------|",
    ];
    for (const entry of bom) {
      lines.push(
        `| ${entry.part_number} | ${entry.name} | ${entry.part_type}`
        + ` | ${entry.quantity} | ${entry.material ?? "-"} |`,
      );
    }
    lines.push("");
    lines.push(`**Total unique parts:** ${bom.length}`);
    const totalQty = bom.reduce((s, e) => s + e.quantity, 0);
    lines.push(`**Total component count:** ${totalQty}`);
    return lines.join("\n");
  }

  /** Map our mate types to CadQuery constraint kinds */
  private mapMateType(type: MateType): string {
    switch (type) {
      case "fixed": return "Fixed";
      case "coincident": return "Plane";
      case "axis": return "Axis";
      case "angle": return "Angle";
      case "distance": return "PointInPlane";
      case "tangent": return "Plane";
      case "rigid_group": return "Fixed";
      default: return "Fixed";
    }
  }
}

export const assemblyEngine = new AssemblyEngine();
