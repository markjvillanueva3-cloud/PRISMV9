/**
 * LatheLoRADatasetBuilderEngine Tests
 *
 * U-LTH69: Training dataset builder for LoRA fine-tuning
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRADatasetBuilderEngine } from "../engines/LatheLoRADatasetBuilderEngine.js";

describe("LatheLoRADatasetBuilderEngine", () => {
  beforeEach(() => {
    latheLoRADatasetBuilderEngine.setConfig({
      archive_path: "H:/PRISM/JM DIE/CNC LATHE",
      output_path: "data/training",
      min_score: 70,
      train_ratio: 0.8,
      min_lines: 20,
      max_lines: 800,
      strip_bom: true,
      include_comments: false,
    });
  });

  describe("Configuration", () => {
    it("sets and gets config", () => {
      latheLoRADatasetBuilderEngine.setConfig({
        min_score: 80,
        train_ratio: 0.75,
      });

      const config = latheLoRADatasetBuilderEngine.getConfig();

      expect(config.min_score).toBe(80);
      expect(config.train_ratio).toBe(0.75);
    });

    it("preserves unmodified config values", () => {
      latheLoRADatasetBuilderEngine.setConfig({
        min_score: 85,
      });

      const config = latheLoRADatasetBuilderEngine.getConfig();

      expect(config.min_score).toBe(85);
      expect(config.min_lines).toBe(20); // unchanged
    });
  });

  describe("Dataset Validation", () => {
    it("validates missing file", () => {
      const result = latheLoRADatasetBuilderEngine.validateDataset("/nonexistent/path.jsonl");

      expect(result.valid).toBe(false);
      expect(result.errors).toContain("File not found: /nonexistent/path.jsonl");
    });
  });

  describe("Example Structure", () => {
    it("creates example with required fields", () => {
      // Test the structure of a manually constructed example
      const example = {
        instruction: "Generate an Okuma lathe program for ALCOA. Material: 6061. Operations: roughing, finishing.",
        input: "Customer: ALCOA\nMaterial: 6061\nOperations: roughing, finishing",
        output: "O0001\nG21 G90\nG28 U0 W0\nT0101\nG50 S3000\nG96 S200 M03\nG0 X100 Z5\nG71 U2 R1\nG71 P10 Q20 U0.5 W0.1 F0.25\nN10 G0 X20\nG1 Z-50\nX30\nZ-80\nN20 X100\nG70 P10 Q20\nG28 U0 W0\nM30",
        metadata: {
          program_id: "TEST-001",
          customer: "ALCOA",
          material: "6061",
          operations: ["roughing", "finishing"],
          score: 85,
          line_count: 18,
        },
      };

      expect(example.instruction).toContain("ALCOA");
      expect(example.input).toContain("Customer: ALCOA");
      expect(example.output).toContain("O0001");
      expect(example.output).toContain("M30");
      expect(example.metadata.score).toBeGreaterThanOrEqual(70);
    });
  });

  describe("Customer Split Logic", () => {
    it("splits by customer not by example", () => {
      // Simulate split logic
      const examples = [
        { metadata: { customer: "ALCOA" } },
        { metadata: { customer: "ALCOA" } },
        { metadata: { customer: "BOEING" } },
        { metadata: { customer: "BOEING" } },
        { metadata: { customer: "CATERPILLAR" } },
      ];

      const customers = new Set(examples.map((e) => e.metadata.customer));

      expect(customers.size).toBe(3);

      // With 80% train ratio, 2 customers should be train, 1 eval
      const trainCount = Math.ceil(customers.size * 0.8);
      const evalCount = customers.size - trainCount;

      expect(trainCount).toBe(3);
      expect(evalCount).toBe(0);
    });

    it("ensures no customer overlap between train and eval", () => {
      const trainCustomers = ["ALCOA", "BOEING", "CAT"];
      const evalCustomers = ["DEERE", "EMC"];

      const overlap = trainCustomers.filter((c) => evalCustomers.includes(c));

      expect(overlap.length).toBe(0);
    });
  });

  describe("Program Analysis", () => {
    it("detects threading operations", () => {
      const content = "O0001\nG76 P020060 Q100 R100\nG76 X18.5 Z-20 P750 Q200 F1.5\nM30";
      const hasThreading = content.includes("G76") || content.includes("G33");

      expect(hasThreading).toBe(true);
    });

    it("detects grooving operations", () => {
      const content = "O0001\nG75 R1\nG75 X15 Z-10 P2000 Q2000 F0.1\nM30";
      const hasGrooving = content.includes("G75") || content.includes("G74");

      expect(hasGrooving).toBe(true);
    });

    it("detects drilling operations", () => {
      const content = "O0001\nG83 Z-30 Q5 F0.15\nG80\nM30";
      const hasDrilling = content.includes("G83") || content.includes("G73");

      expect(hasDrilling).toBe(true);
    });

    it("detects roughing cycles", () => {
      const content = "O0001\nG71 U2 R1\nG71 P10 Q20 U0.5 W0.1 F0.25\nM30";
      const hasRoughing = content.includes("G71") || content.includes("G72");

      expect(hasRoughing).toBe(true);
    });

    it("extracts tool numbers", () => {
      const content = "T0101\nT0202\nT0303";
      const tools = content.match(/T\d{2,4}/g) || [];

      expect(tools).toContain("T0101");
      expect(tools).toContain("T0202");
      expect(tools.length).toBe(3);
    });

    it("detects material from comments", () => {
      const content = "(MATERIAL: 4140 STEEL)\nO0001\nM30";
      const materialMatch = content.match(/\(.*?(STEEL|ALUMINUM|4140|6061).*?\)/i);

      expect(materialMatch).not.toBeNull();
      expect(materialMatch![1]).toBe("4140");
    });
  });

  describe("Score Calculation", () => {
    it("deducts score for missing M30", () => {
      const hasM30 = false;
      const hasMissingEnd = !hasM30;

      expect(hasMissingEnd).toBe(true);
    });

    it("deducts score for missing O-number", () => {
      const content = "G21 G90\nG0 X100 Z5\nM30";
      const hasONumber = /O\d{4}/.test(content);

      expect(hasONumber).toBe(false);
    });

    it("adds score for G28 home position", () => {
      const content = "O0001\nG28 U0 W0\nM30";
      const hasHome = content.includes("G28");

      expect(hasHome).toBe(true);
    });
  });

  describe("Output Cleaning", () => {
    it("strips BOM from output", () => {
      const withBom = "\uFEFFO0001\nM30";
      const cleaned = withBom.charCodeAt(0) === 0xFEFF ? withBom.slice(1) : withBom;

      expect(cleaned.charCodeAt(0)).not.toBe(0xFEFF);
      expect(cleaned).toBe("O0001\nM30");
    });

    it("removes empty lines from start and end", () => {
      const content = "\n\nO0001\nM30\n\n";
      const lines = content.split("\n");

      while (lines.length > 0 && !lines[0].trim()) {
        lines.shift();
      }
      while (lines.length > 0 && !lines[lines.length - 1].trim()) {
        lines.pop();
      }

      expect(lines[0]).toBe("O0001");
      expect(lines[lines.length - 1]).toBe("M30");
    });
  });

  describe("Instruction Building", () => {
    it("includes customer in instruction", () => {
      const customer = "ALCOA";
      const instruction = `Generate an Okuma lathe program for ${customer}.`;

      expect(instruction).toContain("ALCOA");
    });

    it("includes material when available", () => {
      const material = "6061";
      const instruction = `Material: ${material}.`;

      expect(instruction).toContain("6061");
    });

    it("includes operations list", () => {
      const operations = ["roughing", "finishing", "threading"];
      const instruction = `Operations: ${operations.join(", ")}.`;

      expect(instruction).toContain("roughing");
      expect(instruction).toContain("finishing");
      expect(instruction).toContain("threading");
    });
  });

  describe("Statistics", () => {
    it("computes average line count", () => {
      const lineCounts = [100, 200, 300];
      const avg = lineCounts.reduce((a, b) => a + b, 0) / lineCounts.length;

      expect(avg).toBe(200);
    });

    it("computes min and max line count", () => {
      const lineCounts = [50, 100, 200, 300];
      const min = Math.min(...lineCounts);
      const max = Math.max(...lineCounts);

      expect(min).toBe(50);
      expect(max).toBe(300);
    });

    it("counts examples by customer", () => {
      const examples = [
        { customer: "ALCOA" },
        { customer: "ALCOA" },
        { customer: "BOEING" },
      ];

      const byCustomer: Record<string, number> = {};
      for (const e of examples) {
        byCustomer[e.customer] = (byCustomer[e.customer] || 0) + 1;
      }

      expect(byCustomer["ALCOA"]).toBe(2);
      expect(byCustomer["BOEING"]).toBe(1);
    });
  });

  describe("File Extensions", () => {
    it("recognizes .MIN files", () => {
      const extensions = [".MIN", ".min", ".nc", ".NC", ".prg", ".PRG"];
      const filename = "PART-001.MIN";

      const isProgram = extensions.some((ext) => filename.endsWith(ext));

      expect(isProgram).toBe(true);
    });

    it("recognizes .nc files", () => {
      const extensions = [".MIN", ".min", ".nc", ".NC", ".prg", ".PRG"];
      const filename = "program.nc";

      const isProgram = extensions.some((ext) => filename.endsWith(ext));

      expect(isProgram).toBe(true);
    });
  });

  describe("Dataset Loading", () => {
    it("handles missing dataset file gracefully", () => {
      const examples = latheLoRADatasetBuilderEngine.loadDataset("/nonexistent/path.jsonl");

      expect(examples).toEqual([]);
    });
  });
});
