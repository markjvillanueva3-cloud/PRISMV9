/**
 * LearningPathEngine — Manufacturing Intelligence Layer
 *
 * Generates operator training paths based on skill level assessments,
 * role requirements, and available learning resources. Composes ApprenticeEngine.
 *
 * Actions: learning_assess, learning_plan, learning_progress, learning_recommend
 */

// ============================================================================
// TYPES
// ============================================================================

export type SkillLevel = "novice" | "beginner" | "intermediate" | "advanced" | "expert";
export type OperatorRole = "setup" | "operator" | "programmer" | "lead" | "engineer";

export interface SkillAssessment {
  operator_id: string;
  role: OperatorRole;
  skills: Record<string, { level: SkillLevel; score: number }>;
  overall_level: SkillLevel;
  strengths: string[];
  gaps: string[];
}

export interface LearningModule {
  id: string;
  title: string;
  category: string;
  prerequisite_skills: string[];
  target_level: SkillLevel;
  duration_hours: number;
  type: "hands_on" | "classroom" | "self_paced" | "mentorship";
  description: string;
}

export interface LearningPlan {
  operator_id: string;
  target_role: OperatorRole;
  current_level: SkillLevel;
  target_level: SkillLevel;
  modules: LearningModule[];
  total_hours: number;
  estimated_weeks: number;
  milestones: { week: number; skill: string; target: SkillLevel }[];
}

export interface ProgressReport {
  operator_id: string;
  modules_completed: number;
  modules_total: number;
  completion_pct: number;
  skills_improved: string[];
  next_module: LearningModule | null;
}

// ============================================================================
// SKILL TAXONOMY & MODULES
// ============================================================================

const ROLE_SKILL_REQUIREMENTS: Record<OperatorRole, Record<string, SkillLevel>> = {
  setup: {
    machine_operation: "beginner", workholding: "intermediate", tool_setting: "intermediate",
    blueprint_reading: "beginner", safety: "intermediate",
  },
  operator: {
    machine_operation: "intermediate", workholding: "intermediate", tool_setting: "intermediate",
    blueprint_reading: "intermediate", safety: "intermediate", quality_inspection: "beginner",
    g_code_basics: "beginner",
  },
  programmer: {
    machine_operation: "intermediate", cam_programming: "advanced", g_code_basics: "advanced",
    blueprint_reading: "advanced", toolpath_strategy: "advanced", speeds_feeds: "advanced",
    quality_inspection: "intermediate", safety: "intermediate",
  },
  lead: {
    machine_operation: "advanced", workholding: "advanced", cam_programming: "intermediate",
    blueprint_reading: "advanced", speeds_feeds: "advanced", troubleshooting: "advanced",
    quality_inspection: "advanced", safety: "advanced", scheduling: "intermediate",
  },
  engineer: {
    cam_programming: "expert", toolpath_strategy: "expert", speeds_feeds: "expert",
    material_science: "advanced", fixture_design: "advanced", quality_inspection: "advanced",
    process_optimization: "advanced", safety: "advanced",
  },
};

const LEARNING_MODULES: LearningModule[] = [
  { id: "LM-001", title: "Machine Safety Fundamentals", category: "safety", prerequisite_skills: [], target_level: "intermediate", duration_hours: 8, type: "classroom", description: "E-stop, lockout/tagout, chip handling, PPE, emergency procedures" },
  { id: "LM-002", title: "Blueprint Reading Basics", category: "blueprint_reading", prerequisite_skills: [], target_level: "beginner", duration_hours: 16, type: "classroom", description: "Orthographic views, dimensions, tolerances, GD&T basics" },
  { id: "LM-003", title: "Advanced GD&T", category: "blueprint_reading", prerequisite_skills: ["blueprint_reading"], target_level: "advanced", duration_hours: 24, type: "classroom", description: "Datum reference frames, MMC/LMC, composite tolerances, profile" },
  { id: "LM-004", title: "Basic Machine Operation", category: "machine_operation", prerequisite_skills: ["safety"], target_level: "beginner", duration_hours: 40, type: "hands_on", description: "Power on/off, jog, MDI, program loading, tool changes, work offsets" },
  { id: "LM-005", title: "Workholding Techniques", category: "workholding", prerequisite_skills: ["machine_operation"], target_level: "intermediate", duration_hours: 16, type: "hands_on", description: "Vise setup, chuck types, fixture plates, soft jaws, indicating parts" },
  { id: "LM-006", title: "Tool Setting & Measurement", category: "tool_setting", prerequisite_skills: ["machine_operation"], target_level: "intermediate", duration_hours: 12, type: "hands_on", description: "Tool length presetters, touch-off, probing, offset management" },
  { id: "LM-007", title: "G-Code Fundamentals", category: "g_code_basics", prerequisite_skills: ["machine_operation"], target_level: "beginner", duration_hours: 24, type: "self_paced", description: "G00/G01, G02/G03, canned cycles, work coordinates, M-codes" },
  { id: "LM-008", title: "Advanced G-Code & Macros", category: "g_code_basics", prerequisite_skills: ["g_code_basics"], target_level: "advanced", duration_hours: 32, type: "self_paced", description: "Custom macros, variables, probing cycles, parametric programming" },
  { id: "LM-009", title: "Speeds & Feeds Mastery", category: "speeds_feeds", prerequisite_skills: ["machine_operation", "tool_setting"], target_level: "advanced", duration_hours: 20, type: "mentorship", description: "ISO material groups, Taylor tool life, chip thinning, HSM strategies" },
  { id: "LM-010", title: "CAM Programming Basics", category: "cam_programming", prerequisite_skills: ["g_code_basics", "blueprint_reading"], target_level: "beginner", duration_hours: 40, type: "classroom", description: "CAM software workflow, 2D toolpaths, tool libraries, post-processing" },
  { id: "LM-011", title: "Advanced CAM — 3D & 5-Axis", category: "cam_programming", prerequisite_skills: ["cam_programming"], target_level: "advanced", duration_hours: 60, type: "hands_on", description: "3D roughing strategies, rest machining, 5-axis positioning and continuous, simulation" },
  { id: "LM-012", title: "Quality Inspection Basics", category: "quality_inspection", prerequisite_skills: ["blueprint_reading"], target_level: "beginner", duration_hours: 16, type: "hands_on", description: "Micrometers, calipers, bore gauges, surface roughness testers, CMM basics" },
  { id: "LM-013", title: "Troubleshooting & Problem Solving", category: "troubleshooting", prerequisite_skills: ["speeds_feeds", "workholding"], target_level: "advanced", duration_hours: 20, type: "mentorship", description: "Chatter diagnosis, tool failure analysis, dimensional troubleshooting, Ishikawa" },
  { id: "LM-014", title: "Material Science for Machinists", category: "material_science", prerequisite_skills: [], target_level: "intermediate", duration_hours: 12, type: "self_paced", description: "Steel/aluminum/titanium/superalloy properties, heat treatment effects, machinability" },
  { id: "LM-015", title: "Fixture Design Principles", category: "fixture_design", prerequisite_skills: ["workholding", "blueprint_reading"], target_level: "advanced", duration_hours: 24, type: "classroom", description: "3-2-1 locating, clamping force calculation, modular fixtures, hydraulic systems" },
  { id: "LM-016", title: "Process Optimization", category: "process_optimization", prerequisite_skills: ["speeds_feeds", "cam_programming", "quality_inspection"], target_level: "advanced", duration_hours: 30, type: "mentorship", description: "Cycle time reduction, SPC, capability studies, lean manufacturing integration" },
];

const LEVEL_VALUES: Record<SkillLevel, number> = { novice: 0, beginner: 1, intermediate: 2, advanced: 3, expert: 4 };

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class LearningPathEngine {
  assess(operatorId: string, currentSkills: Record<string, SkillLevel>, targetRole: OperatorRole): SkillAssessment {
    const requirements = ROLE_SKILL_REQUIREMENTS[targetRole] || {};
    const strengths: string[] = [];
    const gaps: string[] = [];
    const skills: Record<string, { level: SkillLevel; score: number }> = {};

    for (const [skill, required] of Object.entries(requirements)) {
      const current = currentSkills[skill] || "novice";
      const currentVal = LEVEL_VALUES[current];
      const requiredVal = LEVEL_VALUES[required];
      const score = Math.round((currentVal / Math.max(requiredVal, 1)) * 100);

      skills[skill] = { level: current, score: Math.min(100, score) };

      if (currentVal >= requiredVal) strengths.push(skill);
      else gaps.push(skill);
    }

    const avgScore = Object.values(skills).reduce((s, v) => s + v.score, 0) / Math.max(Object.keys(skills).length, 1);
    const overall: SkillLevel = avgScore >= 90 ? "expert" : avgScore >= 70 ? "advanced" : avgScore >= 50 ? "intermediate" : avgScore >= 25 ? "beginner" : "novice";

    return { operator_id: operatorId, role: targetRole, skills, overall_level: overall, strengths, gaps };
  }

  plan(operatorId: string, assessment: SkillAssessment, targetRole: OperatorRole): LearningPlan {
    const requirements = ROLE_SKILL_REQUIREMENTS[targetRole] || {};
    const modules: LearningModule[] = [];
    const milestones: LearningPlan["milestones"] = [];

    // Find modules that address gaps
    for (const gap of assessment.gaps) {
      const targetLevel = requirements[gap] || "intermediate";
      const relevantModules = LEARNING_MODULES.filter(m =>
        m.category === gap && LEVEL_VALUES[m.target_level] >= LEVEL_VALUES[targetLevel]
      );

      // Check prerequisites and add in order
      for (const mod of relevantModules) {
        const prereqsMet = mod.prerequisite_skills.every(ps =>
          assessment.strengths.includes(ps) || modules.some(m => m.category === ps)
        );
        if (prereqsMet && !modules.find(m => m.id === mod.id)) {
          modules.push(mod);
        }
      }
    }

    // If no specific modules found, add safety as baseline
    if (modules.length === 0) {
      const safetyModule = LEARNING_MODULES.find(m => m.id === "LM-001");
      if (safetyModule) modules.push(safetyModule);
    }

    // Generate milestones
    let cumulativeWeeks = 0;
    for (const mod of modules) {
      cumulativeWeeks += Math.ceil(mod.duration_hours / 10); // ~10 hrs/week training pace
      milestones.push({
        week: cumulativeWeeks,
        skill: mod.category,
        target: mod.target_level,
      });
    }

    const totalHours = modules.reduce((s, m) => s + m.duration_hours, 0);

    return {
      operator_id: operatorId, target_role: targetRole,
      current_level: assessment.overall_level,
      target_level: Object.values(requirements).reduce((max, l) => LEVEL_VALUES[l] > LEVEL_VALUES[max] ? l : max, "novice" as SkillLevel),
      modules, total_hours: totalHours,
      estimated_weeks: Math.ceil(totalHours / 10),
      milestones,
    };
  }

  progress(operatorId: string, plan: LearningPlan, completedModuleIds: string[]): ProgressReport {
    const completed = plan.modules.filter(m => completedModuleIds.includes(m.id));
    const skillsImproved = [...new Set(completed.map(m => m.category))];
    const nextModule = plan.modules.find(m => !completedModuleIds.includes(m.id)) || null;

    return {
      operator_id: operatorId,
      modules_completed: completed.length,
      modules_total: plan.modules.length,
      completion_pct: Math.round((completed.length / Math.max(plan.modules.length, 1)) * 100),
      skills_improved: skillsImproved,
      next_module: nextModule,
    };
  }

  recommend(currentSkills: Record<string, SkillLevel>): LearningModule[] {
    return LEARNING_MODULES.filter(mod => {
      const currentLevel = currentSkills[mod.category] || "novice";
      const targetVal = LEVEL_VALUES[mod.target_level];
      const currentVal = LEVEL_VALUES[currentLevel];
      if (currentVal >= targetVal) return false;

      // Check prerequisites
      return mod.prerequisite_skills.every(ps => LEVEL_VALUES[currentSkills[ps] || "novice"] >= 1);
    }).slice(0, 5);
  }
}

export const learningPathEngine = new LearningPathEngine();
