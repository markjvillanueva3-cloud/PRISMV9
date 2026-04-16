import { describe, it, expect } from "vitest";
import { assemblyEngine } from "../engines/AssemblyEngine.js";

describe("AssemblyEngine", () => {
  // ── Assembly Creation ──

  describe("createAssembly", () => {
    it("creates empty assembly", () => {
      const a = assemblyEngine.createAssembly("Test Assembly");
      expect(a.id).toBeTruthy();
      expect(a.name).toBe("Test Assembly");
      expect(a.components).toHaveLength(0);
      expect(a.mates).toHaveLength(0);
    });
  });

  // ── Component Management ──

  describe("addComponent", () => {
    it("adds component with defaults", () => {
      const a = assemblyEngine.createAssembly("Test");
      const comp = assemblyEngine.addComponent(
        a, "Base Plate", "plate",
        'cq.Workplane("XY").rect(100, 100).extrude(10)',
      );
      expect(a.components).toHaveLength(1);
      expect(comp.name).toBe("Base Plate");
      expect(comp.position).toEqual({ x: 0, y: 0, z: 0 });
      expect(comp.quantity).toBe(1);
    });

    it("adds component with position and rotation", () => {
      const a = assemblyEngine.createAssembly("Test");
      const comp = assemblyEngine.addComponent(
        a, "Bolt", "hex_bolt",
        'cq.Workplane("XY").circle(4).extrude(30)',
        {
          position: { x: 20, y: 20, z: 10 },
          rotation: { rx: 0, ry: 0, rz: 45 },
          quantity: 4,
          material: "steel",
          color: "gray",
        },
      );
      expect(comp.position.x).toBe(20);
      expect(comp.rotation.rz).toBe(45);
      expect(comp.quantity).toBe(4);
      expect(comp.color).toBe("gray");
    });

    it("generates unique cq_var names", () => {
      const a = assemblyEngine.createAssembly("Test");
      const c1 = assemblyEngine.addComponent(a, "Part A", "box", "...");
      const c2 = assemblyEngine.addComponent(a, "Part B", "box", "...");
      expect(c1.cq_var).not.toBe(c2.cq_var);
    });
  });

  // ── Mate Constraints ──

  describe("addMate", () => {
    it("adds coincident mate", () => {
      const a = assemblyEngine.createAssembly("Test");
      const c1 = assemblyEngine.addComponent(a, "Base", "plate", "...");
      const c2 = assemblyEngine.addComponent(a, "Block", "box", "...");
      const mate = assemblyEngine.addMate(
        a, "coincident", c1.id, c2.id,
        { selector_a: ">Z", selector_b: "<Z" },
      );
      expect(mate.type).toBe("coincident");
      expect(mate.selector_a).toBe(">Z");
      expect(a.mates).toHaveLength(1);
    });

    it("throws on invalid component id", () => {
      const a = assemblyEngine.createAssembly("Test");
      assemblyEngine.addComponent(a, "Base", "plate", "...");
      expect(() => assemblyEngine.addMate(
        a, "fixed", "bad-id", "also-bad",
      )).toThrow("Component not found");
    });

    it("adds distance mate with value", () => {
      const a = assemblyEngine.createAssembly("Test");
      const c1 = assemblyEngine.addComponent(a, "A", "box", "...");
      const c2 = assemblyEngine.addComponent(a, "B", "box", "...");
      const mate = assemblyEngine.addMate(
        a, "distance", c1.id, c2.id, { value: 15 },
      );
      expect(mate.value).toBe(15);
    });
  });

  // ── Position ──

  describe("positionComponent", () => {
    it("moves component", () => {
      const a = assemblyEngine.createAssembly("Test");
      const c = assemblyEngine.addComponent(a, "Part", "box", "...");
      assemblyEngine.positionComponent(a, c.id, { x: 50, y: 0, z: 100 });
      expect(c.position).toEqual({ x: 50, y: 0, z: 100 });
    });

    it("throws on unknown component", () => {
      const a = assemblyEngine.createAssembly("Test");
      expect(() => assemblyEngine.positionComponent(
        a, "bad", { x: 0, y: 0, z: 0 },
      )).toThrow("Component not found");
    });
  });

  // ── BOM ──

  describe("generateBOM", () => {
    it("generates correct BOM with quantities", () => {
      const a = assemblyEngine.createAssembly("Test");
      assemblyEngine.addComponent(a, "M8 Bolt", "hex_bolt", "...", {
        quantity: 4, material: "steel",
      });
      assemblyEngine.addComponent(a, "M8 Bolt", "hex_bolt", "...", {
        quantity: 2, material: "steel",
      });
      assemblyEngine.addComponent(a, "Base Plate", "plate", "...", {
        material: "aluminum",
      });

      const bom = assemblyEngine.generateBOM(a);
      expect(bom).toHaveLength(2);  // 2 unique parts
      const bolts = bom.find(b => b.name === "M8 Bolt");
      expect(bolts?.quantity).toBe(6);
    });
  });

  describe("toBOMMarkdown", () => {
    it("generates markdown table", () => {
      const a = assemblyEngine.createAssembly("Widget");
      assemblyEngine.addComponent(a, "Body", "enclosure", "...");
      assemblyEngine.addComponent(a, "Screw", "hex_bolt", "...", {
        quantity: 4,
      });
      const md = assemblyEngine.toBOMMarkdown(a);
      expect(md).toContain("Bill of Materials: Widget");
      expect(md).toContain("| 1 |");
      expect(md).toContain("Total unique parts:** 2");
      expect(md).toContain("Total component count:** 5");
    });
  });

  // ── CadQuery Code Generation ──

  describe("toCadQueryPython", () => {
    it("generates valid assembly code", () => {
      const a = assemblyEngine.createAssembly("Simple Assembly");
      assemblyEngine.addComponent(
        a, "Base", "plate",
        'result = cq.Workplane("XY").rect(100, 100).extrude(10)',
      );
      assemblyEngine.addComponent(
        a, "Column", "cylinder",
        'result = cq.Workplane("XY").circle(10).extrude(50)',
        { position: { x: 0, y: 0, z: 10 } },
      );

      const code = assemblyEngine.toCadQueryPython(a);
      expect(code).toContain("import cadquery as cq");
      expect(code).toContain("CQAssembly");
      expect(code).toContain("assy.add(");
      expect(code).toContain('name="Base"');
      expect(code).toContain('name="Column"');
      expect(code).toContain("cq.Location(");
      expect(code).toContain("simple_assembly.step");
    });

    it("includes constraints when mates exist", () => {
      const a = assemblyEngine.createAssembly("Constrained");
      const c1 = assemblyEngine.addComponent(a, "A", "box", "result = ...");
      const c2 = assemblyEngine.addComponent(a, "B", "box", "result = ...");
      assemblyEngine.addMate(a, "coincident", c1.id, c2.id, {
        selector_a: ">Z", selector_b: "<Z",
      });

      const code = assemblyEngine.toCadQueryPython(a);
      expect(code).toContain("assy.constrain(");
      expect(code).toContain("assy.solve()");
      expect(code).toContain('"Plane"');
    });

    it("strips import lines from component build code", () => {
      const a = assemblyEngine.createAssembly("Test");
      assemblyEngine.addComponent(
        a, "Part", "box",
        'import cadquery as cq\nresult = cq.Workplane("XY").box(10, 10, 10)\ncq.exporters.export(result, "out.step")',
      );
      const code = assemblyEngine.toCadQueryPython(a);
      // Should have exactly one import cadquery line (the assembly-level one)
      const imports = code.split("\n").filter(l => l === "import cadquery as cq");
      expect(imports).toHaveLength(1);
      // Should not contain individual export lines
      expect(code).not.toContain('export(result, "out.step")');
    });

    it("includes color when specified", () => {
      const a = assemblyEngine.createAssembly("Colored");
      assemblyEngine.addComponent(a, "Red Part", "box", "result = ...", {
        color: "red",
      });
      const code = assemblyEngine.toCadQueryPython(a);
      expect(code).toContain('color=cq.Color("red")');
    });
  });
});
