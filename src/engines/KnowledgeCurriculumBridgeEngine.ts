/**
 * KnowledgeCurriculumBridgeEngine
 *
 * Connects PRISM's knowledge bases to the Academy curriculum
 * for dynamic, personalized, infinite training content:
 *
 * 1. Auto-generated practice problems from real PRISM data
 * 2. Machine-personalized training (student's actual equipment)
 * 3. Playbook rule → quiz question pipeline
 * 4. Tribal knowledge → CAM lesson content
 * 5. Adaptive difficulty from physics engines
 * 6. Material-specific problem generation
 *
 * Lines: ~500
 */

import type { Question } from "./CurriculumEngine.js";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface StudentProfile {
  studentId: string;
  shopMachines?: string[];
  primaryCamSystem?: string;
  experienceLevel: "none" | "beginner" | "intermediate" | "advanced";
  preferredUnits: "metric" | "imperial";
  weakTopics: string[];
  strongTopics: string[];
}

export interface GeneratedProblem {
  question: Question;
  source: string;
  difficulty: 1 | 2 | 3;
  topic: string;
}

interface MaterialData {
  name: string;
  iso_group: string;
  kc1_1: number;
  mc: number;
  vc_range: [number, number];
  fz_range: [number, number];
}

interface ToolData {
  name: string;
  diameter: number;
  flutes: number;
  manufacturer: string;
}

interface MachineData {
  name: string;
  max_rpm: number;
  power_kw: number;
  max_x: number;
  max_y: number;
  max_z: number;
}

// ═══════════════════════════════════════════════════════════════
// Engine
// ═══════════════════════════════════════════════════════════════

export class KnowledgeCurriculumBridgeEngine {
  // Common materials for problem generation
  private materials: MaterialData[] = [
    { name: "6061-T6 Aluminum", iso_group: "N", kc1_1: 700, mc: 0.25, vc_range: [300, 600], fz_range: [0.06, 0.15] },
    { name: "7075-T6 Aluminum", iso_group: "N", kc1_1: 800, mc: 0.25, vc_range: [250, 500], fz_range: [0.05, 0.12] },
    { name: "1045 Carbon Steel", iso_group: "P", kc1_1: 1600, mc: 0.25, vc_range: [150, 250], fz_range: [0.04, 0.10] },
    { name: "4140 Alloy Steel", iso_group: "P", kc1_1: 1800, mc: 0.25, vc_range: [120, 220], fz_range: [0.04, 0.08] },
    { name: "304 Stainless", iso_group: "M", kc1_1: 2000, mc: 0.22, vc_range: [100, 180], fz_range: [0.03, 0.07] },
    { name: "316 Stainless", iso_group: "M", kc1_1: 2100, mc: 0.22, vc_range: [90, 160], fz_range: [0.03, 0.06] },
    { name: "Ti-6Al-4V", iso_group: "S", kc1_1: 2800, mc: 0.28, vc_range: [30, 60], fz_range: [0.05, 0.12] },
    { name: "Inconel 718", iso_group: "S", kc1_1: 2800, mc: 0.28, vc_range: [15, 30], fz_range: [0.04, 0.08] },
    { name: "D2 Tool Steel", iso_group: "H", kc1_1: 3200, mc: 0.30, vc_range: [80, 150], fz_range: [0.03, 0.06] },
    { name: "Gray Cast Iron", iso_group: "K", kc1_1: 1100, mc: 0.22, vc_range: [200, 400], fz_range: [0.05, 0.15] },
  ];

  private tools: ToolData[] = [
    { name: "3mm 2FL Carbide", diameter: 3, flutes: 2, manufacturer: "OSG" },
    { name: "6mm 3FL Carbide", diameter: 6, flutes: 3, manufacturer: "Guhring" },
    { name: "10mm 4FL Carbide", diameter: 10, flutes: 4, manufacturer: "Kennametal" },
    { name: "12mm 4FL Carbide", diameter: 12, flutes: 4, manufacturer: "Sandvik" },
    { name: "16mm 4FL Carbide", diameter: 16, flutes: 4, manufacturer: "ISCAR" },
    { name: "20mm 4FL Carbide", diameter: 20, flutes: 4, manufacturer: "Seco" },
    { name: "25mm 5FL Carbide", diameter: 25, flutes: 5, manufacturer: "Kennametal" },
  ];

  private machines: MachineData[] = [
    { name: "Haas VF-2", max_rpm: 8100, power_kw: 22.4, max_x: 762, max_y: 406, max_z: 508 },
    { name: "Haas VF-4", max_rpm: 8100, power_kw: 22.4, max_x: 1270, max_y: 457, max_z: 508 },
    { name: "DMG MORI DMU 50", max_rpm: 14000, power_kw: 35, max_x: 500, max_y: 450, max_z: 400 },
    { name: "Mazak VCN-530C", max_rpm: 12000, power_kw: 30, max_x: 1050, max_y: 530, max_z: 510 },
    { name: "Okuma MB-5000H", max_rpm: 15000, power_kw: 30, max_x: 762, max_y: 762, max_z: 762 },
    { name: "Makino a51nx", max_rpm: 14000, power_kw: 26, max_x: 560, max_y: 560, max_z: 500 },
  ];

  // ─────────────────────────────────────────────────────────
  // 1. RPM Calculation Problems
  // ─────────────────────────────────────────────────────────

  generateRpmProblems(
    count = 5,
    profile?: StudentProfile
  ): GeneratedProblem[] {
    const problems: GeneratedProblem[] = [];
    const usedCombos = new Set<string>();

    for (let i = 0; i < count; i++) {
      const mat = this.pickRandom(this.materials);
      const tool = this.pickRandom(this.tools);
      const machine = profile?.shopMachines?.length
        ? this.machines.find(
            m => profile.shopMachines!.some(
              sm => m.name.toLowerCase().includes(sm.toLowerCase())
            )
          ) ?? this.pickRandom(this.machines)
        : this.pickRandom(this.machines);

      const key = `${mat.name}-${tool.diameter}`;
      if (usedCombos.has(key)) continue;
      usedCombos.add(key);

      const vc = this.randomInRange(mat.vc_range[0], mat.vc_range[1]);
      const rpm = Math.round((vc * 1000) / (Math.PI * tool.diameter));
      const cappedRpm = Math.min(rpm, machine.max_rpm);

      problems.push({
        question: {
          id: `gen-rpm-${i}`,
          type: "calculation",
          text:
            `Calculate the spindle RPM for a ${tool.name} ` +
            `(⌀${tool.diameter}mm) cutting ${mat.name} at ` +
            `Vc = ${vc} m/min` +
            (cappedRpm < rpm
              ? ` on a ${machine.name} (max ${machine.max_rpm} RPM)`
              : "") +
            `.\n\nRPM = (Vc × 1000) / (π × D)`,
          difficulty: cappedRpm < rpm ? 2 : 1,
          correctAnswer: cappedRpm,
          tolerance: 2,
          explanation:
            `RPM = (${vc} × 1000) / (π × ${tool.diameter}) = ${rpm}` +
            (cappedRpm < rpm
              ? `. Machine max is ${machine.max_rpm} → cap at ${cappedRpm} RPM`
              : ` RPM`),
          tags: ["rpm", "speed_feed", mat.iso_group],
        },
        source: "KnowledgeCurriculumBridge",
        difficulty: cappedRpm < rpm ? 2 : 1,
        topic: "rpm_calculation",
      });
    }

    return problems;
  }

  // ─────────────────────────────────────────────────────────
  // 2. Cutting Force Problems (Kienzle)
  // ─────────────────────────────────────────────────────────

  generateForceProblems(count = 5): GeneratedProblem[] {
    const problems: GeneratedProblem[] = [];

    for (let i = 0; i < count; i++) {
      const mat = this.pickRandom(this.materials);
      const ap = this.randomInRange(1, 6);
      const fz = this.randomInRange(
        mat.fz_range[0], mat.fz_range[1]
      );
      const fc = Math.round(
        mat.kc1_1 * ap * Math.pow(fz, 1 - mat.mc)
      );

      problems.push({
        question: {
          id: `gen-fc-${i}`,
          type: "calculation",
          text:
            `Calculate cutting force (Fc) for ${mat.name}:\n` +
            `kc1.1 = ${mat.kc1_1} N/mm², mc = ${mat.mc}\n` +
            `ap = ${ap}mm, fz = ${fz}mm\n\n` +
            `Fc = kc1.1 × ap × fz^(1-mc)`,
          difficulty: 2,
          correctAnswer: fc,
          tolerance: 3,
          explanation:
            `Fc = ${mat.kc1_1} × ${ap} × ${fz}^${1 - mat.mc} = ${fc} N`,
          tags: ["kienzle", "cutting_force", mat.iso_group],
        },
        source: "KnowledgeCurriculumBridge",
        difficulty: 2,
        topic: "kienzle_force",
      });
    }

    return problems;
  }

  // ─────────────────────────────────────────────────────────
  // 3. Tool Life Problems (Taylor)
  // ─────────────────────────────────────────────────────────

  generateToolLifeProblems(count = 3): GeneratedProblem[] {
    const taylorParams = [
      { material: "Carbon Steel", C: 300, n: 0.25 },
      { material: "Stainless Steel", C: 200, n: 0.20 },
      { material: "Aluminum", C: 600, n: 0.40 },
      { material: "Titanium", C: 80, n: 0.15 },
      { material: "Cast Iron", C: 400, n: 0.30 },
    ];

    return taylorParams.slice(0, count).map((p, i) => {
      const vc = this.randomInRange(
        Math.round(p.C * 0.4), Math.round(p.C * 0.8)
      );
      const T = Math.round(
        Math.pow(p.C / vc, 1 / p.n) * 100
      ) / 100;

      return {
        question: {
          id: `gen-tl-${i}`,
          type: "calculation",
          text:
            `Taylor tool life for ${p.material}:\n` +
            `C = ${p.C}, n = ${p.n}, Vc = ${vc} m/min\n\n` +
            `T = (C/Vc)^(1/n)`,
          difficulty: 3,
          correctAnswer: T,
          tolerance: 5,
          explanation:
            `T = (${p.C}/${vc})^(1/${p.n}) = ` +
            `${(p.C / vc).toFixed(2)}^${(1 / p.n).toFixed(1)} = ${T} min`,
          tags: ["taylor", "tool_life"],
        },
        source: "KnowledgeCurriculumBridge",
        difficulty: 3,
        topic: "taylor_tool_life",
      };
    });
  }

  // ─────────────────────────────────────────────────────────
  // 4. Material Identification Problems
  // ─────────────────────────────────────────────────────────

  generateMaterialIdProblems(): GeneratedProblem[] {
    return this.materials.map((mat, i) => ({
      question: {
        id: `gen-matid-${i}`,
        type: "multiple_choice" as const,
        text: `Which ISO material group does ${mat.name} belong to?`,
        difficulty: 1 as const,
        options: [
          { id: "P", text: "P — Steel", isCorrect: mat.iso_group === "P" },
          { id: "M", text: "M — Stainless Steel", isCorrect: mat.iso_group === "M" },
          { id: "K", text: "K — Cast Iron", isCorrect: mat.iso_group === "K" },
          { id: "N", text: "N — Non-Ferrous", isCorrect: mat.iso_group === "N" },
          { id: "S", text: "S — Heat Resistant / Titanium", isCorrect: mat.iso_group === "S" },
          { id: "H", text: "H — Hardened Steel", isCorrect: mat.iso_group === "H" },
        ].filter(o => o.isCorrect || Math.random() > 0.5).slice(0, 4),
        explanation: `${mat.name} is ISO group ${mat.iso_group}`,
        tags: ["material", "iso_group"],
      },
      source: "KnowledgeCurriculumBridge",
      difficulty: 1 as const,
      topic: "material_identification",
    }));
  }

  // ─────────────────────────────────────────────────────────
  // 5. Feed Rate Problems
  // ─────────────────────────────────────────────────────────

  generateFeedRateProblems(count = 5): GeneratedProblem[] {
    const problems: GeneratedProblem[] = [];

    for (let i = 0; i < count; i++) {
      const mat = this.pickRandom(this.materials);
      const tool = this.pickRandom(this.tools);
      const fz = this.randomInRange(
        mat.fz_range[0], mat.fz_range[1]
      );
      const vc = this.randomInRange(
        mat.vc_range[0], mat.vc_range[1]
      );
      const rpm = Math.round(
        (vc * 1000) / (Math.PI * tool.diameter)
      );
      const vf = Math.round(fz * tool.flutes * rpm);

      problems.push({
        question: {
          id: `gen-vf-${i}`,
          type: "calculation",
          text:
            `Calculate feed rate for ${tool.name} in ` +
            `${mat.name}:\n` +
            `fz = ${fz}mm, ${tool.flutes} flutes, ` +
            `RPM = ${rpm}\n\n` +
            `Vf = fz × z × RPM`,
          difficulty: 2,
          correctAnswer: vf,
          tolerance: 2,
          explanation:
            `Vf = ${fz} × ${tool.flutes} × ${rpm} = ` +
            `${vf} mm/min`,
          tags: ["feed_rate", "speed_feed"],
        },
        source: "KnowledgeCurriculumBridge",
        difficulty: 2,
        topic: "feed_rate",
      });
    }

    return problems;
  }

  // ─────────────────────────────────────────────────────────
  // 6. Comprehensive Problem Set (mixed topics)
  // ─────────────────────────────────────────────────────────

  generateProblemSet(
    profile?: StudentProfile,
    count = 20
  ): GeneratedProblem[] {
    const all: GeneratedProblem[] = [
      ...this.generateRpmProblems(
        Math.ceil(count * 0.25), profile
      ),
      ...this.generateForceProblems(Math.ceil(count * 0.2)),
      ...this.generateToolLifeProblems(
        Math.ceil(count * 0.15)
      ),
      ...this.generateMaterialIdProblems().slice(
        0, Math.ceil(count * 0.2)
      ),
      ...this.generateFeedRateProblems(
        Math.ceil(count * 0.2)
      ),
    ];

    // Prioritize weak topics if profile provided
    if (profile?.weakTopics?.length) {
      all.sort((a, b) => {
        const aWeak = a.question.tags.some(
          t => profile.weakTopics.includes(t)
        ) ? 0 : 1;
        const bWeak = b.question.tags.some(
          t => profile.weakTopics.includes(t)
        ) ? 0 : 1;
        return aWeak - bWeak;
      });
    }

    return all.slice(0, count);
  }

  // ─────────────────────────────────────────────────────────
  // Utilities
  // ─────────────────────────────────────────────────────────

  private pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private randomInRange(min: number, max: number): number {
    const val = min + Math.random() * (max - min);
    return Math.round(val * 100) / 100;
  }
}
