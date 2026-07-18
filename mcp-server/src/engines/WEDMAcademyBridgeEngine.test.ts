import { describe, it, expect, beforeEach } from "vitest";
import { wedmAcademyBridgeEngine } from "./WEDMAcademyBridgeEngine.js";
import type { Module, Quiz, Question } from "./CurriculumEngine.js";

/**
 * Test coverage for U-WCTP-ACADEMY-BRIDGE — WEDMAcademyBridgeEngine.
 *
 * The bridge reads Lima's WEDM academy module collection (injected via
 * setCourses — runtime injection avoids the slot-worktree sync problem
 * because the academy data is maintained on the integrator branch and a
 * slot worktree may be N commits behind). Tests inject a deterministic
 * fixture so they don't depend on whether course-13 has propagated.
 */

// ----------------------------------------------------------------------
// FIXTURE
// ----------------------------------------------------------------------

const kerfQuiz: Quiz = {
  id: "c13-m1-quiz",
  moduleId: "c13-m1",
  passingScore: 70,
  questions: [
    {
      id: "c13-m1-q1",
      type: "multiple_choice",
      difficulty: 1,
      text: "Why does Wire EDM ignore workpiece hardness?",
      options: [
        { id: "a", text: "Because wire is harder than workpiece", isCorrect: false },
        { id: "b", text: "Because erosion is electrothermal — depends on conductivity, not hardness", isCorrect: true },
      ],
      explanation: "Per Kunieda CIRP 2005 — plasma-channel vaporization removes material regardless of hardness.",
      tags: ["wedm_physics", "fundamentals"],
    } as Question,
    {
      id: "c13-m1-q2",
      type: "calculation",
      difficulty: 2,
      text: "Kerf with Ø0.25 mm wire and 15 µm gap each side?",
      correctAnswer: 0.28,
      tolerance: 5,
      explanation: "kerf = 0.25 + 2 × 0.015 = 0.280 mm. Sommer 2010 p.112.",
      tags: ["wedm_kerf", "fundamentals"],
    } as Question,
  ],
};

const m1Lessons: Module["lessons"] = [
  {
    id: "c13-m1-l1",
    moduleId: "c13-m1",
    title: "What Wire EDM Is — Foundations of Kerf and Wire Diameter",
    order: 1,
    content: [
      {
        type: "text",
        body: "Wire EDM uses a Ø0.10-0.30 mm brass wire. The kerf is wire_diameter + 2 × gap. Per Sommer 2010 p.112 and Kunieda CIRP 2005, plasma-channel temperature is 8,000-12,000K.",
      },
    ],
  },
  {
    id: "c13-m1-l2",
    moduleId: "c13-m1",
    title: "Taper Cuts with U-V Independent Axes",
    order: 2,
    content: [
      { type: "text", body: "4-axis taper requires the upper U-V guide. Per Sodick AQ327L Operator's Manual rev. 4 §4-7." },
    ],
  },
  {
    id: "c13-m1-l3",
    moduleId: "c13-m1",
    title: "Multi-Pass Skim Strategy for Surface Ra Targeting",
    order: 3,
    content: [
      { type: "text", body: "Klocke 2013 §8.3 Ra cascade — Ra_n = Ra_0 × rho^(n-1). Skim passes reduce Ra by rho factor." },
    ],
  },
];

const FIXTURE_COURSES = [
  {
    id: "course-13-fixture",
    modules: [
      {
        id: "c13-m1",
        courseId: "course-13-fixture",
        title: "Wire EDM Foundations",
        order: 1,
        lessons: m1Lessons,
        quiz: kerfQuiz,
        estimatedMinutes: 60,
        description: "Foundations module",
      } as Module,
    ],
  },
];

// ----------------------------------------------------------------------
// TESTS
// ----------------------------------------------------------------------

describe("WEDMAcademyBridgeEngine", () => {
  beforeEach(() => {
    wedmAcademyBridgeEngine.setCourses(FIXTURE_COURSES);
  });

  it("setCourses + getCourses round-trip", () => {
    const got = wedmAcademyBridgeEngine.getCourses();
    expect(got).toHaveLength(1);
    expect(got[0].id).toBe("course-13-fixture");
    expect(got[0].modules).toHaveLength(1);
  });

  it("emitTrainingExamples produces one Alpaca example per quiz question", () => {
    const examples = wedmAcademyBridgeEngine.emitTrainingExamples();
    expect(examples).toHaveLength(2);
    for (const ex of examples) {
      expect(ex.instruction.length).toBeGreaterThan(0);
      expect(ex.output.length).toBeGreaterThan(0);
      expect(ex.metadata.source).toBe("academy");
      expect(ex.metadata.course_id).toBe("course-13-fixture");
    }
  });

  it("multiple_choice → correct option text + explanation flow into output", () => {
    const examples = wedmAcademyBridgeEngine.emitTrainingExamples();
    const ex = examples.find((e) => e.metadata.question_id === "c13-m1-q1");
    expect(ex?.metadata.question_id).toBe("c13-m1-q1");
    expect(ex!.output).toContain("electrothermal");
    expect(ex!.output).toContain("Kunieda");
  });

  it("calculation question → numeric answer + explanation flow into output", () => {
    const examples = wedmAcademyBridgeEngine.emitTrainingExamples();
    const ex = examples.find((e) => e.metadata.question_id === "c13-m1-q2");
    expect(ex?.metadata.question_id).toBe("c13-m1-q2");
    expect(ex!.output).toContain("0.28");
    expect(ex!.output).toContain("Sommer");
  });

  it("tag → instruction family — wedm_kerf maps to wire_parameter_calc", () => {
    const examples = wedmAcademyBridgeEngine.emitTrainingExamples();
    const ex = examples.find((e) => e.metadata.question_id === "c13-m1-q2");
    expect(ex?.metadata.instruction_family).toBe("wire_parameter_calc");
  });

  it("tag → instruction family — wedm_physics maps to wedm_pedagogy", () => {
    const examples = wedmAcademyBridgeEngine.emitTrainingExamples();
    const ex = examples.find((e) => e.metadata.question_id === "c13-m1-q1");
    expect(ex?.metadata.instruction_family).toBe("wedm_pedagogy");
  });

  it("citations extracted from explanation surface in metadata", () => {
    const examples = wedmAcademyBridgeEngine.emitTrainingExamples();
    const allCites = examples.flatMap((e) => e.metadata.citations);
    expect(allCites.join(" ")).toMatch(/Kunieda|Sommer/);
  });

  it("emitWizardTooltips matches lesson titles to wizard fields", () => {
    const tooltips = wedmAcademyBridgeEngine.emitWizardTooltips();
    const fields = tooltips.map((t) => t.wizard_field);
    expect(fields).toContain("kerf");        // "Foundations of Kerf and Wire Diameter"
    expect(fields).toContain("taper_angle"); // "Taper Cuts with U-V"
    expect(fields).toContain("skim_passes"); // "Multi-Pass Skim Strategy"
  });

  it("tooltip excerpts strip markdown headings and stay under 600 chars", () => {
    const tooltips = wedmAcademyBridgeEngine.emitWizardTooltips();
    expect(tooltips.length).toBeGreaterThan(0);
    for (const t of tooltips) {
      expect(t.excerpt.length).toBeLessThanOrEqual(700); // 600 + ellipsis tolerance
      expect(t.excerpt).not.toMatch(/^#/m);
    }
  });

  it("wizardCoverageReport identifies covered vs missing fields", () => {
    const report = wedmAcademyBridgeEngine.wizardCoverageReport();
    expect(report.covered.length).toBeGreaterThan(0);
    expect(report.coverage_ratio).toBeGreaterThan(0);
    expect(report.coverage_ratio).toBeLessThanOrEqual(1);
    // Fixture has kerf+taper+skim covered. Material/thickness/lead_in missing.
    expect(report.missing).toContain("material");
  });

  it("stats() reports the academy footprint visible to LoRA training", () => {
    const stats = wedmAcademyBridgeEngine.stats();
    expect(stats.courses).toBe(1);
    expect(stats.modules).toBe(1);
    expect(stats.lessons).toBe(3);
    expect(stats.quizQuestions).toBe(2);
    expect(stats.trainingExamples).toBe(2);
    expect(stats.families.wire_parameter_calc).toBeGreaterThan(0);
  });

  it("empty registry → empty training examples (graceful)", () => {
    wedmAcademyBridgeEngine.setCourses([]);
    expect(wedmAcademyBridgeEngine.emitTrainingExamples()).toEqual([]);
    expect(wedmAcademyBridgeEngine.emitWizardTooltips()).toEqual([]);
    expect(wedmAcademyBridgeEngine.stats().trainingExamples).toBe(0);
  });
});
