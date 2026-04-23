/**
 * CourseBuilderEngine — Auto-generate training courses from PRISM knowledge
 *
 * Transforms 3700+ tribal tips and 296+ playbook rules into structured
 * training courses with modules, lessons, and quiz questions.
 * Core of VAL-MS9 Training Marketplace.
 *
 * Actions (calculate pattern):
 *   course_build            — Build course from tribal tips by CAM system
 *   course_build_from_rules — Build course from playbook rule categories
 *   course_catalog          — List available auto-generated courses
 *   course_quiz_generate    — Generate quiz questions from rules
 *   course_pricing          — Get pricing tier info
 *
 * Lines: ~580
 */

// ============================================================================
// TYPES
// ============================================================================

export type CourseLevel = "beginner" | "intermediate" | "advanced";
export type QuizDifficulty = "easy" | "medium" | "hard";

export interface CourseLesson {
  title: string;
  tipId: string;
  content: string;
  playbookRuleId?: string;
  playbookRule?: string;
  quiz: QuizQuestion;
}

export interface CourseModule {
  title: string;
  description: string;
  lessons: CourseLesson[];
}

export interface GeneratedCourse {
  courseId: string;
  title: string;
  camSystem?: string;
  level: CourseLevel;
  modules: CourseModule[];
  tipCount: number;
  quizCount: number;
  estimatedMinutes: number;
}

export interface QuizQuestion {
  text: string;
  choices: string[];
  correct: number;
  explanation: string;
  ruleId?: string;
  tipId?: string;
  difficulty: QuizDifficulty;
}

export interface PricingTier {
  name: string;
  price: string;
  priceNumeric: number;
  interval: string;
  features: string[];
  courseAccess: string;
  maxUsers?: number;
}

export interface CourseCatalogEntry {
  id: string;
  camSystem?: string;
  level: CourseLevel;
  modules: number;
  tips: number;
  quizzes: number;
  estimatedMinutes: number;
  title: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** CAM systems with tribal tips in PRISM. */
const CAM_SYSTEMS = [
  "mastercam", "fusion360", "solidcam", "nx", "hypermill",
  "esprit", "edgecam", "camworks", "topsolid", "worknc",
  "gibbscam", "catia", "surfcam", "bobcad", "powermill",
  "tebis", "cimatron", "sprutcam",
] as const;

/** Tip category → human-readable module name. */
const CATEGORY_LABELS: Record<string, string> = {
  setup: "Machine Setup & Configuration",
  tooling: "Tool Selection & Management",
  speeds_feeds: "Speeds, Feeds & Cutting Parameters",
  fixturing: "Workholding & Fixturing",
  surface_finish: "Surface Finish Techniques",
  thread: "Threading Operations",
  safety: "Safety & Crash Prevention",
  maintenance: "Machine Maintenance",
  material_handling: "Material Handling",
  quality: "Quality & Inspection",
  troubleshooting: "Troubleshooting & Diagnostics",
  programming: "CNC Programming",
  machining: "General Machining",
  design: "Design for Manufacturing",
};

/** Playbook category → human-readable module name. */
const RULE_CATEGORY_LABELS: Record<string, string> = {
  sequencing: "Operation Sequencing",
  setup_strategy: "Setup Strategy",
  tool_selection: "Tool Selection",
  toolpath_strategy: "Toolpath Strategy",
  anti_pattern: "Anti-Patterns to Avoid",
  material_tip: "Material-Specific Tips",
  thin_wall: "Thin Wall Machining",
  hole_making: "Hole Making",
  finishing: "Finishing Strategies",
  roughing: "Roughing Strategies",
  "5axis": "5-Axis Machining",
  workholding: "Workholding",
  thermal: "Thermal Management",
  chip_control: "Chip Control",
  tool_life: "Tool Life Optimization",
  datum: "Datum Strategy",
  deburring: "Deburring",
  safety: "Safety",
  grinding: "Grinding",
  turning: "Turning",
  threading: "Threading",
  edm: "EDM Operations",
  quality_inspection: "Quality & Inspection",
  coolant_strategy: "Coolant Strategy",
  adaptive: "Adaptive Machining",
  deep_hole: "Deep Hole Drilling",
  surface_treatment: "Surface Treatment",
  post_processing: "Post-Processing",
  hard_turning: "Hard Turning",
  hsm: "High-Speed Machining",
  micro_machining: "Micro Machining",
  hybrid_additive: "Hybrid Additive",
  cutting_force: "Cutting Force Physics",
  surface_integrity: "Surface Integrity",
  vibration_dynamics: "Vibration & Chatter",
  dimensional_accuracy: "Dimensional Accuracy",
  economics: "Machining Economics",
  spc: "Statistical Process Control",
  cross_domain: "Cross-Domain Synthesis",
  gdt: "GD&T Application",
  machine_capability: "Machine Capability",
  failure_analysis: "Failure Analysis",
  milling: "Milling Operations",
  drilling: "Drilling Operations",
};

/** Quiz question templates — scenario-based. */
const QUIZ_TEMPLATES = [
  "You are {operation} {material} with a {tool}. {scenario} What should you do?",
  "A machinist reports {symptom} while {operation} {material}. Based on best practices, what is the most likely cause?",
  "When programming {operation} for {material}, which parameter setting is most critical?",
  "Your shop is setting up a {operation} job on {material}. The playbook recommends: \"{rule}\". Why?",
  "Which of the following is an anti-pattern when {operation} {material}?",
];

const MATERIALS = [
  "304 stainless steel", "6061 aluminum", "Ti-6Al-4V titanium",
  "4140 steel", "Inconel 718", "gray cast iron",
  "17-4 PH stainless", "A2 tool steel", "copper C110",
  "D2 tool steel (hardened 60 HRC)", "brass 360",
  "Hastelloy X", "PEEK plastic",
];

const OPERATIONS = [
  "face milling", "pocket milling", "profile milling",
  "drilling", "tapping", "thread milling",
  "roughing", "finishing", "adaptive roughing",
  "5-axis contouring", "turning", "boring",
];

const TOOLS = [
  "3-flute carbide end mill", "4-flute end mill",
  "indexable face mill", "carbide drill",
  "thread mill", "ball nose end mill",
  "ceramic insert", "CBN insert",
  "high-feed mill", "barrel cutter",
];

const PRICING_TIERS: PricingTier[] = [
  {
    name: "Free",
    price: "$0",
    priceNumeric: 0,
    interval: "forever",
    features: [
      "Shop Math (Course 0A)",
      "Hand Tools & Measurement (Course 0B)",
      "Blueprint Reading & GD&T (Course 0C)",
      "Community forum access",
      "5 quiz attempts per day",
    ],
    courseAccess: "Foundational courses (0A, 0B, 0C) only",
  },
  {
    name: "Individual",
    price: "$29/mo",
    priceNumeric: 29,
    interval: "monthly",
    features: [
      "All 15 academy courses",
      "Auto-generated CAM courses (18 systems)",
      "Playbook rule courses (42 categories)",
      "Unlimited quizzes",
      "Spaced repetition scheduler",
      "Certification exams",
      "Formula card library",
      "Progress dashboard",
    ],
    courseAccess: "Full access to all courses and certifications",
  },
  {
    name: "Team",
    price: "$19/seat/mo",
    priceNumeric: 19,
    interval: "monthly per seat",
    features: [
      "Everything in Individual",
      "Instructor dashboard",
      "Class management",
      "Grade tracking & analytics",
      "Custom course builder",
      "Bulk enrollment",
      "Team progress reports",
      "Priority support",
    ],
    courseAccess: "Full access + instructor tools",
    maxUsers: 100,
  },
  {
    name: "Enterprise",
    price: "Custom",
    priceNumeric: -1,
    interval: "annual contract",
    features: [
      "Everything in Team",
      "White-label branding",
      "SSO / LDAP integration",
      "Custom content injection",
      "API access for LMS integration",
      "Dedicated success manager",
      "On-premise deployment option",
      "SLA with uptime guarantee",
    ],
    courseAccess: "Full access + white-label + API + custom content",
  },
];

// ============================================================================
// HELPERS
// ============================================================================

/** Deterministic hash for stable course IDs. */
function simpleHash(str: string): string {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36).slice(0, 8);
}

/** Pick random element from array using index seed. */
function pick<T>(arr: readonly T[], seed: number): T {
  return arr[Math.abs(seed) % arr.length];
}

/** Build a quiz question from a tip. */
function quizFromTip(
  tip: { id: string; title: string; body: string },
  difficulty: QuizDifficulty,
): QuizQuestion {
  const body = tip.body.length > 200
    ? tip.body.slice(0, 197) + "..."
    : tip.body;
  const correct = tip.body.slice(0, 100);
  const distractors = [
    "Increase speed by 50% and use flood coolant",
    "Switch to a larger diameter tool immediately",
    "Reduce feed rate to minimum and add extra passes",
  ];
  return {
    text: `Regarding "${tip.title}": What is the correct approach?`,
    choices: [correct, ...distractors],
    correct: 0,
    explanation: body,
    tipId: tip.id,
    difficulty,
  };
}

/** Build a quiz question from a playbook rule. */
function quizFromRule(
  rule: {
    id: string;
    title: string;
    rule: string;
    reasoning: string;
    category: string;
  },
  difficulty: QuizDifficulty,
): QuizQuestion {
  const seed = rule.id.charCodeAt(rule.id.length - 1) || 0;
  const template = pick(QUIZ_TEMPLATES, seed);
  const material = pick(MATERIALS, seed + 1);
  const operation = pick(OPERATIONS, seed + 2);
  const tool = pick(TOOLS, seed + 3);

  const text = template
    .replace("{operation}", operation)
    .replace("{material}", material)
    .replace("{tool}", tool)
    .replace("{scenario}", rule.title)
    .replace("{symptom}", "unexpected surface marks")
    .replace("{rule}", rule.rule.slice(0, 120));

  const ruleShort = rule.rule.length > 120
    ? rule.rule.slice(0, 117) + "..."
    : rule.rule;
  const distractors = [
    "Ignore the warning and continue with default parameters",
    "Double the feed rate to reduce cycle time",
    "Use conventional milling instead of climb milling",
  ];

  return {
    text,
    choices: [ruleShort, ...distractors],
    correct: 0,
    explanation: rule.reasoning.slice(0, 200),
    ruleId: rule.id,
    difficulty,
  };
}

// ============================================================================
// ENGINE
// ============================================================================

export class CourseBuilderEngine {
  private cache = new Map<string, GeneratedCourse>();

  /**
   * course_build — Auto-generate a course from tribal tips.
   */
  courseBuild(params: {
    camSystem: string;
    level: CourseLevel;
    maxModules?: number;
  }): GeneratedCourse {
    const { camSystem, level, maxModules = 10 } = params;
    const cacheKey = `tips-${camSystem}-${level}-${maxModules}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;

    const tips = this.getTipsForCam(camSystem);
    if (tips.length === 0) {
      return {
        courseId: `cb-${simpleHash(cacheKey)}`,
        title: `${camSystem} — No Tips Available`,
        camSystem,
        level,
        modules: [],
        tipCount: 0,
        quizCount: 0,
        estimatedMinutes: 0,
      };
    }

    // Filter by level: beginner=high confidence, advanced=all
    const minConf = level === "beginner" ? 85
      : level === "intermediate" ? 70 : 0;
    const filtered = tips.filter(t => t.confidence >= minConf);

    // Group by category
    const groups = new Map<string, typeof filtered>();
    for (const tip of filtered) {
      const cat = tip.category || "general";
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(tip);
    }

    // Build modules from groups (up to maxModules)
    const modules: CourseModule[] = [];
    const entries = [...groups.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, maxModules);

    let quizCount = 0;
    for (const [cat, catTips] of entries) {
      const lessons: CourseLesson[] = catTips
        .slice(0, 8)
        .map(tip => {
          const rule = this.findRelatedRule(tip, camSystem);
          quizCount++;
          return {
            title: tip.title,
            tipId: tip.id,
            content: tip.body,
            playbookRuleId: rule?.id,
            playbookRule: rule?.rule,
            quiz: quizFromTip(tip, this.levelToDifficulty(level)),
          };
        });
      modules.push({
        title: CATEGORY_LABELS[cat] || this.titleCase(cat),
        description: `${lessons.length} lessons covering ${cat} ` +
          `topics in ${camSystem}`,
        lessons,
      });
    }

    const tipCount = modules.reduce(
      (s, m) => s + m.lessons.length, 0
    );
    const course: GeneratedCourse = {
      courseId: `cb-${simpleHash(cacheKey)}`,
      title: `${this.titleCase(camSystem)} ${this.titleCase(level)} ` +
        `Training`,
      camSystem,
      level,
      modules,
      tipCount,
      quizCount,
      estimatedMinutes: tipCount * 5,
    };
    this.cache.set(cacheKey, course);
    return course;
  }

  /**
   * course_build_from_rules — Generate course from playbook rules.
   */
  courseBuildFromRules(params: {
    categories: string[];
    level: CourseLevel;
    maxModules?: number;
  }): GeneratedCourse {
    const { categories, level, maxModules = 10 } = params;
    const cacheKey = `rules-${categories.join(",")}-${level}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;

    const rules = this.getRulesForCategories(categories);
    const diff = this.levelToDifficulty(level);

    const groups = new Map<string, typeof rules>();
    for (const rule of rules) {
      const cat = rule.category;
      if (!groups.has(cat)) groups.set(cat, []);
      groups.get(cat)!.push(rule);
    }

    const modules: CourseModule[] = [];
    let quizCount = 0;
    const entries = [...groups.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, maxModules);

    for (const [cat, catRules] of entries) {
      const lessons: CourseLesson[] = catRules
        .slice(0, 8)
        .map(rule => {
          quizCount++;
          return {
            title: rule.title,
            tipId: rule.id,
            content: rule.rule + "\n\nReasoning: " + rule.reasoning,
            playbookRuleId: rule.id,
            playbookRule: rule.rule,
            quiz: quizFromRule(rule, diff),
          };
        });
      modules.push({
        title: RULE_CATEGORY_LABELS[cat] || this.titleCase(cat),
        description: `${lessons.length} scenario-based lessons ` +
          `from ${cat} rules`,
        lessons,
      });
    }

    const tipCount = modules.reduce(
      (s, m) => s + m.lessons.length, 0
    );
    const course: GeneratedCourse = {
      courseId: `cb-${simpleHash(cacheKey)}`,
      title: `Playbook: ${categories.map(c =>
        RULE_CATEGORY_LABELS[c] || this.titleCase(c)
      ).join(", ")} (${this.titleCase(level)})`,
      level,
      modules,
      tipCount,
      quizCount,
      estimatedMinutes: tipCount * 7,
    };
    this.cache.set(cacheKey, course);
    return course;
  }

  /**
   * course_catalog — List available auto-generated courses.
   */
  courseCatalog(): { courses: CourseCatalogEntry[] } {
    const courses: CourseCatalogEntry[] = [];
    const levels: CourseLevel[] = [
      "beginner", "intermediate", "advanced"
    ];

    // CAM-based courses
    for (const cam of CAM_SYSTEMS) {
      const tips = this.getTipsForCam(cam);
      if (tips.length === 0) continue;
      for (const level of levels) {
        const minConf = level === "beginner" ? 85
          : level === "intermediate" ? 70 : 0;
        const count = tips.filter(t => t.confidence >= minConf).length;
        if (count < 3) continue;
        const modCount = Math.min(
          10,
          new Set(tips.map(t => t.category)).size
        );
        courses.push({
          id: `cb-${simpleHash(`tips-${cam}-${level}-10`)}`,
          camSystem: cam,
          level,
          modules: modCount,
          tips: count,
          quizzes: count,
          estimatedMinutes: count * 5,
          title: `${this.titleCase(cam)} ${this.titleCase(level)} ` +
            `Training`,
        });
      }
    }

    // Rule-based courses (top categories)
    const ruleCats = Object.keys(RULE_CATEGORY_LABELS);
    for (const cat of ruleCats) {
      const rules = this.getRulesForCategories([cat]);
      if (rules.length < 3) continue;
      courses.push({
        id: `cb-${simpleHash(`rules-${cat}-intermediate`)}`,
        level: "intermediate",
        modules: 1,
        tips: rules.length,
        quizzes: rules.length,
        estimatedMinutes: rules.length * 7,
        title: `Playbook: ${RULE_CATEGORY_LABELS[cat]}`,
      });
    }

    return { courses };
  }

  /**
   * course_quiz_generate — Generate quiz questions from rules.
   */
  courseQuizGenerate(params: {
    ruleCategories?: string[];
    count?: number;
    difficulty?: QuizDifficulty;
  }): { questions: QuizQuestion[] } {
    const {
      ruleCategories,
      count = 10,
      difficulty = "medium",
    } = params;

    const cats = ruleCategories && ruleCategories.length > 0
      ? ruleCategories
      : Object.keys(RULE_CATEGORY_LABELS);
    const rules = this.getRulesForCategories(cats);

    // Shuffle deterministically and pick count
    const shuffled = rules.sort(
      (a, b) => simpleHash(a.id).localeCompare(simpleHash(b.id))
    );
    const selected = shuffled.slice(0, Math.min(count, rules.length));

    const questions = selected.map(
      rule => quizFromRule(rule, difficulty)
    );

    return { questions };
  }

  /**
   * course_pricing — Get pricing tier info.
   */
  coursePricing(): { tiers: PricingTier[] } {
    return { tiers: PRICING_TIERS };
  }

  /**
   * courseFromSource — Build course from knowledge ingestion pipeline
   * with material/operation filtering via ContentIngestionPipelineEngine.
   */
  courseFromSource(params: {
    material_iso_group?: string;
    operation_type?: string;
    level?: CourseLevel;
    maxModules?: number;
    sources?: Array<"tribal" | "playbook" | "formula" | "graph">;
  }): GeneratedCourse {
    const {
      material_iso_group,
      operation_type,
      level = "intermediate",
      maxModules = 10,
      sources,
    } = params;

    const cacheKey = `source-${material_iso_group ?? "all"}-${operation_type ?? "all"}-${level}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;

    // Use enhancedSearch to pull filtered knowledge
    let items: Array<{
      source_type: string;
      id: string;
      title: string;
      body: string;
      relevance_score: number;
      confidence: number;
      tags: string[];
    }> = [];
    try {
      const { contentIngestionPipelineEngine } = require(
        "./ContentIngestionPipelineEngine.js"
      );
      const query = [material_iso_group, operation_type, "machining"]
        .filter(Boolean)
        .join(" ");
      const searchResult = contentIngestionPipelineEngine.enhancedSearch(
        query,
        {
          sources,
          material_iso_group,
          operation_type,
          limit: 100,
        },
      );
      items = searchResult.results ?? [];
    } catch {
      items = [];
    }

    if (items.length === 0) {
      return {
        courseId: `cb-${simpleHash(cacheKey)}`,
        title: `No matching content for ${material_iso_group ?? "all"} / ${operation_type ?? "all"}`,
        level,
        modules: [],
        tipCount: 0,
        quizCount: 0,
        estimatedMinutes: 0,
      };
    }

    // Group by source_type
    const groups = new Map<string, typeof items>();
    for (const item of items) {
      const key = item.source_type;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }

    const modules: CourseModule[] = [];
    let quizCount = 0;
    const entries = [...groups.entries()]
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, maxModules);

    for (const [sourceType, sourceItems] of entries) {
      const sourceLabel =
        sourceType === "tribal_tip" ? "Tribal Knowledge" :
        sourceType === "playbook_rule" ? "Playbook Rules" :
        sourceType === "formula" ? "Formulas & Calculations" :
        sourceType === "graph_node" ? "Knowledge Graph" : this.titleCase(sourceType);

      const lessons: CourseLesson[] = sourceItems
        .slice(0, 8)
        .map(item => {
          quizCount++;
          return {
            title: item.title,
            tipId: item.id,
            content: item.body,
            quiz: quizFromTip(
              { id: item.id, title: item.title, body: item.body },
              this.levelToDifficulty(level),
            ),
          };
        });
      modules.push({
        title: sourceLabel,
        description: `${lessons.length} lessons from ${sourceLabel.toLowerCase()} ` +
          `${material_iso_group ? `for ISO group ${material_iso_group}` : ""}` +
          `${operation_type ? ` — ${operation_type}` : ""}`,
        lessons,
      });
    }

    const tipCount = modules.reduce((s, m) => s + m.lessons.length, 0);
    const course: GeneratedCourse = {
      courseId: `cb-${simpleHash(cacheKey)}`,
      title: `${material_iso_group ?? "All Materials"} ` +
        `${operation_type ? `— ${this.titleCase(operation_type)} ` : ""}` +
        `(${this.titleCase(level)})`,
      level,
      modules,
      tipCount,
      quizCount,
      estimatedMinutes: tipCount * 6,
    };
    this.cache.set(cacheKey, course);
    return course;
  }

  /**
   * courseExport — Export a course in JSON, markdown, or SCORM-like format.
   */
  courseExport(params: {
    courseId?: string;
    camSystem?: string;
    level?: CourseLevel;
    format?: "json" | "markdown" | "scorm";
  }): { format: string; content: string; courseId: string; metadata: Record<string, any> } {
    const { format = "json", camSystem, level = "intermediate" } = params;

    // Build the course first
    const course = camSystem
      ? this.courseBuild({ camSystem, level })
      : this.courseCatalog().courses.length > 0
        ? this.courseBuild({
            camSystem: this.courseCatalog().courses[0].camSystem ?? "mastercam",
            level,
          })
        : {
            courseId: "empty",
            title: "Empty Course",
            level,
            modules: [],
            tipCount: 0,
            quizCount: 0,
            estimatedMinutes: 0,
          };

    const metadata = {
      title: course.title,
      level: course.level,
      modules: course.modules.length,
      tipCount: course.tipCount,
      quizCount: course.quizCount,
      estimatedMinutes: course.estimatedMinutes,
      exportedAt: new Date().toISOString(),
    };

    let content: string;
    switch (format) {
      case "markdown": {
        const lines: string[] = [`# ${course.title}`, ""];
        lines.push(`**Level:** ${course.level} | **Estimated:** ${course.estimatedMinutes} min`);
        lines.push(`**Modules:** ${course.modules.length} | **Lessons:** ${course.tipCount}`);
        lines.push("");
        for (const mod of course.modules) {
          lines.push(`## ${mod.title}`);
          lines.push(mod.description);
          lines.push("");
          for (const lesson of mod.lessons) {
            lines.push(`### ${lesson.title}`);
            lines.push(lesson.content.slice(0, 300));
            lines.push("");
            lines.push(`**Quiz:** ${lesson.quiz.text}`);
            for (let ci = 0; ci < lesson.quiz.choices.length; ci++) {
              const marker = ci === lesson.quiz.correct ? "(correct)" : "";
              lines.push(`  ${ci + 1}. ${lesson.quiz.choices[ci].slice(0, 100)} ${marker}`);
            }
            lines.push("");
          }
        }
        content = lines.join("\n");
        break;
      }
      case "scorm": {
        // SCORM 2004 manifest-like structure
        const manifest = {
          schema: "ADL SCORM",
          schemaVersion: "2004 4th Edition",
          identifier: course.courseId,
          title: course.title,
          organizations: [{
            identifier: `org-${course.courseId}`,
            title: course.title,
            items: course.modules.map((mod, mi) => ({
              identifier: `mod-${mi}`,
              title: mod.title,
              subItems: mod.lessons.map((les, li) => ({
                identifier: `les-${mi}-${li}`,
                title: les.title,
                objectives: [{
                  id: `obj-${mi}-${li}`,
                  satisfiedByMeasure: true,
                  minNormalizedMeasure: 0.7,
                }],
              })),
            })),
          }],
          resources: course.modules.flatMap((mod, mi) =>
            mod.lessons.map((les, li) => ({
              identifier: `res-${mi}-${li}`,
              type: "webcontent",
              scormType: "sco",
              href: `content/${mi}/${li}/index.html`,
            })),
          ),
        };
        content = JSON.stringify(manifest, null, 2);
        break;
      }
      default: // json
        content = JSON.stringify(course, null, 2);
        break;
    }

    return { format, content, courseId: course.courseId, metadata };
  }

  /**
   * Main calculate dispatcher entry point.
   */
  calculate(
    action: string,
    params: Record<string, any>,
  ): Record<string, any> {
    switch (action) {
      case "course_build":
        return this.courseBuild({
          camSystem: params.camSystem ?? params.cam_system ?? "",
          level: params.level ?? "beginner",
          maxModules: params.maxModules ?? params.max_modules ?? 10,
        });
      case "course_build_from_rules":
        return this.courseBuildFromRules({
          categories: params.categories ?? [],
          level: params.level ?? "intermediate",
          maxModules: params.maxModules ?? params.max_modules ?? 10,
        });
      case "course_catalog":
        return this.courseCatalog();
      case "course_quiz_generate":
        return this.courseQuizGenerate({
          ruleCategories: params.ruleCategories
            ?? params.rule_categories,
          count: params.count ?? 10,
          difficulty: params.difficulty ?? "medium",
        });
      case "course_pricing":
        return this.coursePricing();
      default:
        return {
          error: `Unknown action: ${action}`,
          available: [
            "course_build",
            "course_build_from_rules",
            "course_catalog",
            "course_quiz_generate",
            "course_pricing",
          ],
        };
    }
  }

  // ──────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────

  /** Get tribal tips for a CAM system via lazy import. */
  private getTipsForCam(camSystem: string): Array<{
    id: string;
    title: string;
    body: string;
    category: string;
    confidence: number;
    tags: string[];
    operation_types?: string[];
    material_groups?: string[];
  }> {
    try {
      /* eslint-disable @typescript-eslint/no-require-imports */
      const { tribalKnowledgeEngine } = require(
        "./TribalKnowledgeEngine.js"
      );
      const allTips = tribalKnowledgeEngine.search({
        query: camSystem,
        limit: 500,
      });
      return allTips;
    } catch {
      return [];
    }
  }

  /** Get playbook rules for given categories. */
  private getRulesForCategories(categories: string[]): Array<{
    id: string;
    title: string;
    rule: string;
    reasoning: string;
    category: string;
    severity: string;
    conditions: any[];
  }> {
    try {
      const { machiningPlaybookEngine } = require(
        "./MachiningPlaybookEngine.js"
      );
      const result = machiningPlaybookEngine.advise({
        categories,
      });
      return result.rules || [];
    } catch {
      return [];
    }
  }

  /** Find a related playbook rule for a tip. */
  private findRelatedRule(
    tip: {
      category: string;
      operation_types?: string[];
      material_groups?: string[];
    },
    _camSystem: string,
  ): { id: string; rule: string } | undefined {
    try {
      const { machiningPlaybookEngine } = require(
        "./MachiningPlaybookEngine.js"
      );
      const opType = tip.operation_types?.[0];
      const matIso = tip.material_groups?.[0];
      const result = machiningPlaybookEngine.advise({
        operation_type: opType,
        material_iso: matIso,
      });
      return result.rules?.[0];
    } catch {
      return undefined;
    }
  }

  /** Convert level to quiz difficulty. */
  private levelToDifficulty(level: CourseLevel): QuizDifficulty {
    switch (level) {
      case "beginner": return "easy";
      case "intermediate": return "medium";
      case "advanced": return "hard";
    }
  }

  /** Title-case a string. */
  private titleCase(s: string): string {
    return s.charAt(0).toUpperCase() +
      s.slice(1).replace(/_/g, " ");
  }
}

/** Singleton instance. */
export const courseBuilderEngine = new CourseBuilderEngine();
