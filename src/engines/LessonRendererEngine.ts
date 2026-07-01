/**
 * LessonRendererEngine — PRISM Academy Content Renderer
 *
 * Transforms lesson definitions into rich, interactive content
 * for the machinist training platform. Visual-first pedagogy:
 *
 * 1. SHOW IT — diagrams, animations, 3D visualizations
 * 2. EXPLAIN IT — plain English with manufacturing analogies
 * 3. CALCULATE IT — live PRISM calculator with visible formulas
 * 4. TRY IT — interactive exercise using real engines
 * 5. TEST IT — scenario-based assessment
 *
 * Content types rendered:
 * - text:       Markdown with formula rendering (KaTeX-ready)
 * - diagram:    Annotated SVG with hover tooltips
 * - animation:  CSS/JS keyframe definitions for toolpath/chip/force
 * - calculator: Live PRISM engine with input sliders + output display
 * - sandbox:    Interactive exercise with validation
 * - video:      Embedded video with timestamp annotations
 * - 3d_viewer:  Three.js scene config for toolpath/workpiece
 *
 * Lines: ~750
 */

import type {
  Lesson,
  LessonContent,
  ContentType,
} from "./CurriculumEngine.js";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface RenderedLesson {
  lessonId: string;
  title: string;
  sections: RenderedSection[];
  estimatedMinutes: number;
  keyFormulas: FormulaCard[];
  interactiveElements: number;
}

export interface RenderedSection {
  type: ContentType;
  html: string;
  interactiveConfig?: InteractiveConfig;
  animations?: AnimationDef[];
}

export interface InteractiveConfig {
  engineName: string;
  inputs: InputField[];
  outputs: OutputField[];
  defaults: Record<string, number>;
  liveUpdate: boolean;
}

export interface InputField {
  name: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  default: number;
  description: string;
  colorZones?: Array<{
    min: number;
    max: number;
    color: "green" | "yellow" | "red";
    label: string;
  }>;
}

export interface OutputField {
  name: string;
  label: string;
  unit: string;
  format: "number" | "percent" | "time" | "force";
  precision: number;
  colorThresholds?: {
    green: number;
    yellow: number;
    red: number;
  };
}

export interface AnimationDef {
  id: string;
  type: "toolpath" | "chip_formation" | "force_arrow"
    | "rotation" | "thermal" | "vibration";
  keyframes: Array<{
    time: number;   // 0-1 normalized
    props: Record<string, number>;
  }>;
  duration_ms: number;
  loop: boolean;
}

export interface FormulaCard {
  id: string;
  name: string;
  latex: string;
  variables: Array<{
    symbol: string;
    name: string;
    unit: string;
  }>;
  example?: {
    inputs: Record<string, number>;
    result: number;
    unit: string;
  };
}

export interface ThreeJsSceneConfig {
  type: "toolpath" | "workpiece" | "tool_assembly"
    | "machine_workspace";
  geometries: ThreeJsGeometry[];
  camera: { x: number; y: number; z: number; fov: number };
  lights: Array<{
    type: "ambient" | "directional" | "point";
    color: string;
    intensity: number;
  }>;
  controls: "orbit" | "trackball";
  annotations?: Array<{
    position: [number, number, number];
    text: string;
  }>;
}

export interface ThreeJsGeometry {
  type: "cylinder" | "box" | "sphere" | "line" | "path";
  params: Record<string, number>;
  position: [number, number, number];
  rotation?: [number, number, number];
  color: string;
  opacity?: number;
  label?: string;
}

// ═══════════════════════════════════════════════════════════════
// Engine
// ═══════════════════════════════════════════════════════════════

export class LessonRendererEngine {

  // ─────────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────────

  renderLesson(lesson: Lesson): RenderedLesson {
    const sections = lesson.content.map(c =>
      this.renderContent(c)
    );

    const keyFormulas = (lesson.keyFormulas ?? []).map(
      fId => this.getFormulaCard(fId)
    ).filter((f): f is FormulaCard => f !== null);

    const interactiveElements = sections.filter(
      s => s.interactiveConfig
    ).length;

    return {
      lessonId: lesson.id,
      title: lesson.title,
      sections,
      estimatedMinutes: Math.max(
        5,
        sections.length * 3 + interactiveElements * 5
      ),
      keyFormulas,
      interactiveElements,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Content type renderers
  // ─────────────────────────────────────────────────────────

  private renderContent(content: LessonContent): RenderedSection {
    switch (content.type) {
      case "text":
        return this.renderText(content);
      case "diagram":
        return this.renderDiagram(content);
      case "calculator":
        return this.renderCalculator(content);
      case "sandbox":
        return this.renderSandbox(content);
      case "video":
        return this.renderVideo(content);
      case "3d_viewer":
        return this.render3DViewer(content);
      case "animation":
        return this.renderAnimation(content);
      default:
        return {
          type: content.type,
          html: `<div class="lesson-block">${
            content.body ?? ""
          }</div>`,
        };
    }
  }

  private renderText(content: LessonContent): RenderedSection {
    const body = content.body ?? "";
    // Convert markdown-style formulas to KaTeX spans
    const html = body
      .replace(
        /\$\$([^$]+)\$\$/g,
        '<div class="formula-block" data-katex="$1">$1</div>'
      )
      .replace(
        /\$([^$]+)\$/g,
        '<span class="formula-inline" data-katex="$1">$1</span>'
      )
      .replace(
        /^# (.+)$/gm,
        '<h2 class="lesson-heading">$1</h2>'
      )
      .replace(
        /^## (.+)$/gm,
        '<h3 class="lesson-subheading">$1</h3>'
      )
      .replace(
        /\*\*([^*]+)\*\*/g,
        '<strong>$1</strong>'
      )
      .replace(
        /^- (.+)$/gm,
        '<li>$1</li>'
      )
      .replace(
        /\n\n/g,
        '</p><p>'
      );

    return {
      type: "text",
      html: `<div class="lesson-text"><p>${html}</p></div>`,
    };
  }

  private renderDiagram(
    content: LessonContent
  ): RenderedSection {
    const svg = content.diagramSvg ?? "";
    const annotations = content.annotations ?? [];

    const annotationHtml = annotations.map(a =>
      `<div class="diagram-annotation" ` +
      `style="left:${a.x}%;top:${a.y}%" ` +
      `data-label="${escapeHtml(a.label)}" ` +
      `title="${escapeHtml(a.description)}">` +
      `<span class="annotation-dot"></span>` +
      `<span class="annotation-label">${
        escapeHtml(a.label)
      }</span></div>`
    ).join("\n");

    return {
      type: "diagram",
      html: `<div class="lesson-diagram">` +
        `<div class="diagram-container">${svg}</div>` +
        `<div class="diagram-annotations">${
          annotationHtml
        }</div></div>`,
    };
  }

  private renderCalculator(
    content: LessonContent
  ): RenderedSection {
    const config = content.calculatorConfig;
    if (!config) {
      return {
        type: "calculator",
        html: '<div class="calculator-placeholder">' +
          'Calculator configuration missing</div>',
      };
    }

    const interactive = this.buildCalculatorConfig(config);

    return {
      type: "calculator",
      html: `<div class="lesson-calculator" ` +
        `data-engine="${escapeHtml(config.engine)}">` +
        `<h4>${content.title ?? "Calculator"}</h4>` +
        `<div class="calc-inputs"></div>` +
        `<div class="calc-outputs"></div>` +
        `<button class="calc-btn">Calculate</button>` +
        `</div>`,
      interactiveConfig: interactive,
    };
  }

  private renderSandbox(
    content: LessonContent
  ): RenderedSection {
    const config = content.sandboxConfig;
    return {
      type: "sandbox",
      html: `<div class="lesson-sandbox">` +
        `<h4>Try It Yourself</h4>` +
        `<p class="sandbox-task">${
          escapeHtml(config?.task ?? "")
        }</p>` +
        `<div class="sandbox-workspace"></div>` +
        `<button class="sandbox-check">Check Answer` +
        `</button></div>`,
      interactiveConfig: config ? {
        engineName: config.engine,
        inputs: [],
        outputs: [],
        defaults: {},
        liveUpdate: false,
      } : undefined,
    };
  }

  private renderVideo(
    content: LessonContent
  ): RenderedSection {
    return {
      type: "video",
      html: `<div class="lesson-video">` +
        `<video controls src="${
          escapeHtml(content.videoUrl ?? "")
        }"></video></div>`,
    };
  }

  private render3DViewer(
    content: LessonContent
  ): RenderedSection {
    return {
      type: "3d_viewer",
      html: `<div class="lesson-3d" ` +
        `data-scene="${
          escapeHtml(JSON.stringify(content.body ?? "{}"))
        }">` +
        `<canvas class="viewer-canvas"></canvas>` +
        `<div class="viewer-controls">` +
        `<span>Drag to rotate | Scroll to zoom</span>` +
        `</div></div>`,
    };
  }

  private renderAnimation(
    content: LessonContent
  ): RenderedSection {
    return {
      type: "animation",
      html: `<div class="lesson-animation">` +
        `<div class="animation-stage"></div>` +
        `<div class="animation-controls">` +
        `<button class="anim-play">Play</button>` +
        `<button class="anim-pause">Pause</button>` +
        `<input type="range" class="anim-scrub" ` +
        `min="0" max="100" value="0">` +
        `</div></div>`,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Calculator configuration builders
  // ─────────────────────────────────────────────────────────

  private buildCalculatorConfig(config: {
    engine: string;
    inputFields: string[];
    outputFields: string[];
    defaults?: Record<string, number>;
  }): InteractiveConfig {
    const inputs = config.inputFields.map(
      f => CALCULATOR_FIELDS[f] ?? {
        name: f,
        label: f,
        unit: "",
        min: 0,
        max: 100,
        step: 1,
        default: 0,
        description: f,
      }
    );

    const outputs = config.outputFields.map(
      f => OUTPUT_FIELDS[f] ?? {
        name: f,
        label: f,
        unit: "",
        format: "number" as const,
        precision: 2,
      }
    );

    return {
      engineName: config.engine,
      inputs,
      outputs,
      defaults: config.defaults ?? {},
      liveUpdate: true,
    };
  }

  // ─────────────────────────────────────────────────────────
  // Formula cards
  // ─────────────────────────────────────────────────────────

  getFormulaCard(formulaId: string): FormulaCard | null {
    return FORMULA_CARDS[formulaId] ?? null;
  }

  getAllFormulaCards(): FormulaCard[] {
    return Object.values(FORMULA_CARDS);
  }

  // ─────────────────────────────────────────────────────────
  // 3D scene builders
  // ─────────────────────────────────────────────────────────

  buildToolScene(
    diameter: number,
    length: number,
    flutes: number
  ): ThreeJsSceneConfig {
    return {
      type: "tool_assembly",
      geometries: [
        {
          type: "cylinder",
          params: {
            radius: diameter / 2,
            height: length,
            segments: 32,
          },
          position: [0, length / 2, 0],
          color: "#8B8B8B",
          label: `${diameter}mm × ${flutes}F End Mill`,
        },
        {
          type: "cylinder",
          params: {
            radius: diameter * 0.7,
            height: length * 0.6,
            segments: 32,
          },
          position: [0, length + length * 0.3, 0],
          color: "#4A4A4A",
          label: "Holder",
        },
      ],
      camera: {
        x: diameter * 3,
        y: length * 0.8,
        z: diameter * 3,
        fov: 45,
      },
      lights: [
        {
          type: "ambient",
          color: "#ffffff",
          intensity: 0.6,
        },
        {
          type: "directional",
          color: "#ffffff",
          intensity: 0.8,
        },
      ],
      controls: "orbit",
      annotations: [
        {
          position: [diameter / 2 + 2, length / 2, 0],
          text: `D = ${diameter}mm`,
        },
        {
          position: [0, length + 2, 0],
          text: `L = ${length}mm`,
        },
      ],
    };
  }

  buildToolpathScene(
    points: Array<[number, number, number]>,
    workpieceSize: [number, number, number]
  ): ThreeJsSceneConfig {
    return {
      type: "toolpath",
      geometries: [
        {
          type: "box",
          params: {
            width: workpieceSize[0],
            height: workpieceSize[1],
            depth: workpieceSize[2],
          },
          position: [0, -workpieceSize[1] / 2, 0],
          color: "#A0A0A0",
          opacity: 0.3,
          label: "Workpiece",
        },
        {
          type: "path",
          params: {
            pointCount: points.length,
          },
          position: [0, 0, 0],
          color: "#00AA00",
          label: "Toolpath",
        },
      ],
      camera: {
        x: workpieceSize[0] * 1.5,
        y: workpieceSize[1] * 1.5,
        z: workpieceSize[2] * 1.5,
        fov: 50,
      },
      lights: [
        { type: "ambient", color: "#ffffff", intensity: 0.5 },
        {
          type: "directional",
          color: "#ffffff",
          intensity: 0.7,
        },
      ],
      controls: "orbit",
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// Calculator field definitions
// ═══════════════════════════════════════════════════════════════

const CALCULATOR_FIELDS: Record<string, InputField> = {
  tool_diameter: {
    name: "tool_diameter",
    label: "Tool Diameter",
    unit: "mm",
    min: 0.5,
    max: 100,
    step: 0.5,
    default: 12,
    description: "Cutting tool diameter",
    colorZones: [
      { min: 0.5, max: 6, color: "yellow", label: "Small" },
      { min: 6, max: 25, color: "green", label: "Standard" },
      { min: 25, max: 100, color: "yellow", label: "Large" },
    ],
  },
  depth_of_cut: {
    name: "depth_of_cut",
    label: "Depth of Cut (ap)",
    unit: "mm",
    min: 0.1,
    max: 50,
    step: 0.1,
    default: 3,
    description: "Axial depth of cut",
  },
  feed_per_tooth: {
    name: "feed_per_tooth",
    label: "Feed per Tooth (fz)",
    unit: "mm/tooth",
    min: 0.01,
    max: 0.5,
    step: 0.01,
    default: 0.1,
    description: "Chip load per cutting edge",
  },
  cutting_speed: {
    name: "cutting_speed",
    label: "Cutting Speed (Vc)",
    unit: "m/min",
    min: 10,
    max: 1000,
    step: 5,
    default: 200,
    description: "Surface speed at tool periphery",
  },
  flute_count: {
    name: "flute_count",
    label: "Number of Flutes",
    unit: "",
    min: 1,
    max: 12,
    step: 1,
    default: 4,
    description: "Cutting edges on the tool",
  },
  spindle_speed: {
    name: "spindle_speed",
    label: "Spindle Speed",
    unit: "RPM",
    min: 100,
    max: 40000,
    step: 100,
    default: 5000,
    description: "Spindle rotational speed",
  },
  width_of_cut: {
    name: "width_of_cut",
    label: "Width of Cut (ae)",
    unit: "mm",
    min: 0.1,
    max: 100,
    step: 0.1,
    default: 6,
    description: "Radial engagement",
  },
  kc1_1: {
    name: "kc1_1",
    label: "Kienzle kc1.1",
    unit: "N/mm²",
    min: 400,
    max: 5000,
    step: 50,
    default: 1500,
    description: "Specific cutting force at 1mm² cross-section",
  },
  mc: {
    name: "mc",
    label: "Kienzle exponent (mc)",
    unit: "",
    min: 0.1,
    max: 0.5,
    step: 0.01,
    default: 0.25,
    description: "Material-dependent Kienzle exponent",
  },
};

const OUTPUT_FIELDS: Record<string, OutputField> = {
  rpm: {
    name: "rpm",
    label: "Spindle Speed",
    unit: "RPM",
    format: "number",
    precision: 0,
  },
  feed_rate: {
    name: "feed_rate",
    label: "Feed Rate",
    unit: "mm/min",
    format: "number",
    precision: 0,
  },
  cutting_force: {
    name: "cutting_force",
    label: "Cutting Force (Fc)",
    unit: "N",
    format: "force",
    precision: 0,
    colorThresholds: {
      green: 500,
      yellow: 1500,
      red: 3000,
    },
  },
  tool_life: {
    name: "tool_life",
    label: "Tool Life",
    unit: "min",
    format: "time",
    precision: 1,
  },
  mrr: {
    name: "mrr",
    label: "Material Removal Rate",
    unit: "cm³/min",
    format: "number",
    precision: 1,
  },
  power: {
    name: "power",
    label: "Cutting Power",
    unit: "kW",
    format: "number",
    precision: 2,
  },
  surface_finish: {
    name: "surface_finish",
    label: "Surface Finish (Ra)",
    unit: "µm",
    format: "number",
    precision: 2,
  },
  deflection: {
    name: "deflection",
    label: "Tool Deflection",
    unit: "mm",
    format: "number",
    precision: 4,
  },
};

// ═══════════════════════════════════════════════════════════════
// Formula card library
// ═══════════════════════════════════════════════════════════════

const FORMULA_CARDS: Record<string, FormulaCard> = {
  kienzle: {
    id: "kienzle",
    name: "Kienzle Cutting Force",
    latex: "F_c = k_{c1.1} \\cdot a_p \\cdot f_z^{(1-m_c)}",
    variables: [
      { symbol: "F_c", name: "Cutting Force", unit: "N" },
      { symbol: "k_{c1.1}", name: "Specific Cutting Force", unit: "N/mm²" },
      { symbol: "a_p", name: "Depth of Cut", unit: "mm" },
      { symbol: "f_z", name: "Feed per Tooth", unit: "mm" },
      { symbol: "m_c", name: "Kienzle Exponent", unit: "—" },
    ],
    example: {
      inputs: { kc1_1: 1500, ap: 3, fz: 0.1, mc: 0.25 },
      result: 800,
      unit: "N",
    },
  },
  taylor: {
    id: "taylor",
    name: "Taylor Tool Life",
    latex: "T = \\left(\\frac{C}{V_c}\\right)^{\\frac{1}{n}}",
    variables: [
      { symbol: "T", name: "Tool Life", unit: "min" },
      { symbol: "C", name: "Taylor Constant", unit: "m/min" },
      { symbol: "V_c", name: "Cutting Speed", unit: "m/min" },
      { symbol: "n", name: "Taylor Exponent", unit: "—" },
    ],
    example: {
      inputs: { C: 350, Vc: 200, n: 0.25 },
      result: 9.4,
      unit: "min",
    },
  },
  rpm_from_vc: {
    id: "rpm_from_vc",
    name: "RPM from Surface Speed",
    latex: "n = \\frac{V_c \\times 1000}{\\pi \\times D}",
    variables: [
      { symbol: "n", name: "Spindle Speed", unit: "RPM" },
      { symbol: "V_c", name: "Cutting Speed", unit: "m/min" },
      { symbol: "D", name: "Tool Diameter", unit: "mm" },
    ],
    example: {
      inputs: { Vc: 200, D: 12 },
      result: 5305,
      unit: "RPM",
    },
  },
  feed_rate: {
    id: "feed_rate",
    name: "Table Feed Rate",
    latex: "V_f = f_z \\times z \\times n",
    variables: [
      { symbol: "V_f", name: "Feed Rate", unit: "mm/min" },
      { symbol: "f_z", name: "Feed per Tooth", unit: "mm" },
      { symbol: "z", name: "Number of Flutes", unit: "—" },
      { symbol: "n", name: "Spindle Speed", unit: "RPM" },
    ],
    example: {
      inputs: { fz: 0.08, z: 4, n: 8000 },
      result: 2560,
      unit: "mm/min",
    },
  },
  deflection: {
    id: "deflection",
    name: "Tool Deflection (Cantilever)",
    latex: "\\delta = \\frac{F \\cdot L^3}{3 \\cdot E \\cdot I}",
    variables: [
      { symbol: "\\delta", name: "Deflection", unit: "mm" },
      { symbol: "F", name: "Cutting Force", unit: "N" },
      { symbol: "L", name: "Stick-out Length", unit: "mm" },
      { symbol: "E", name: "Young's Modulus", unit: "N/mm²" },
      { symbol: "I", name: "Moment of Inertia", unit: "mm⁴" },
    ],
  },
  mrr: {
    id: "mrr",
    name: "Material Removal Rate",
    latex: "MRR = a_p \\times a_e \\times V_f",
    variables: [
      { symbol: "MRR", name: "Removal Rate", unit: "mm³/min" },
      { symbol: "a_p", name: "Depth of Cut", unit: "mm" },
      { symbol: "a_e", name: "Width of Cut", unit: "mm" },
      { symbol: "V_f", name: "Feed Rate", unit: "mm/min" },
    ],
    example: {
      inputs: { ap: 3, ae: 6, Vf: 2560 },
      result: 46080,
      unit: "mm³/min",
    },
  },
  power: {
    id: "power",
    name: "Cutting Power",
    latex: "P_c = \\frac{F_c \\times V_c}{60000}",
    variables: [
      { symbol: "P_c", name: "Cutting Power", unit: "kW" },
      { symbol: "F_c", name: "Cutting Force", unit: "N" },
      { symbol: "V_c", name: "Cutting Speed", unit: "m/min" },
    ],
    example: {
      inputs: { Fc: 800, Vc: 200 },
      result: 2.67,
      unit: "kW",
    },
  },
  surface_finish: {
    id: "surface_finish",
    name: "Theoretical Surface Finish",
    latex: "R_a \\approx \\frac{f^2}{32 \\times r_\\epsilon}",
    variables: [
      { symbol: "R_a", name: "Surface Roughness", unit: "µm" },
      { symbol: "f", name: "Feed per Rev", unit: "mm/rev" },
      { symbol: "r_\\epsilon", name: "Nose Radius", unit: "mm" },
    ],
    example: {
      inputs: { f: 0.15, r_eps: 0.8 },
      result: 0.88,
      unit: "µm",
    },
  },
};

// ═══════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
