/**
 * MITCourseExpansionEngine — Additional MIT Courses for U-AWR33
 *
 * Expands MIT course coverage from 29 to 50+ courses with manufacturing focus.
 * Integrates with FormulaOrchestrator for formula registration.
 *
 * U-AWR33: MIT Deep Integration (9→50+ courses)
 *
 * @module engines/MITCourseExpansionEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface ExpandedCourse {
  courseId: string;
  title: string;
  department: string;
  topics: string[];
  algorithms: string[];
  formulas: FormulaEntry[];
  tribalTips: string[];
  prismRelevance: "high" | "medium" | "low";
}

export interface FormulaEntry {
  name: string;
  equation: string;
  variables: Record<string, string>;
  domain: "machining" | "materials" | "controls" | "optimization" | "general";
  sourceUnit: string;
}

export interface CourseExpansionResult {
  originalCount: number;
  expandedCount: number;
  newCourses: ExpandedCourse[];
  totalFormulas: number;
  totalTribalTips: number;
}

// ============================================================================
// EXPANDED COURSE DATA (21 new courses to reach 50+)
// ============================================================================

const EXPANDED_COURSES: ExpandedCourse[] = [
  // Manufacturing Deep Dive
  {
    courseId: "2.813",
    title: "Manufacturing Systems Analysis and Control",
    department: "Mechanical Engineering",
    topics: ["transfer lines", "assembly systems", "variability", "bottleneck analysis", "kanban", "pull systems"],
    algorithms: ["Exponential Machine Model", "Two-Machine Line Analysis", "Buzacott Decomposition"],
    formulas: [
      { name: "Two-Machine Line Efficiency", equation: "E = 1 / (1 + p1/μ2 + p2/μ1)", variables: { p1: "failure rate 1", p2: "failure rate 2", μ1: "repair rate 1", μ2: "repair rate 2" }, domain: "machining", sourceUnit: "MIT 2.813" },
    ],
    tribalTips: ["Buffer sizing between machines should match the slowest repair time", "Starving is worse than blocking for quality-critical operations"],
    prismRelevance: "high",
  },
  {
    courseId: "2.822",
    title: "Fundamentals of Manufacturing Processes",
    department: "Mechanical Engineering",
    topics: ["forming", "casting", "joining", "powder metallurgy", "polymer processing", "coating"],
    algorithms: ["Merchant Circle Model", "Upper Bound Method", "Slab Analysis"],
    formulas: [
      { name: "Merchant Shear Angle", equation: "φ = 45° + α/2 - β/2", variables: { α: "rake angle", β: "friction angle" }, domain: "machining", sourceUnit: "MIT 2.822" },
      { name: "Forming Force", equation: "F = σ_f * A * (1 + μ*L/h)", variables: { σ_f: "flow stress", A: "area", μ: "friction", L: "length", h: "height" }, domain: "machining", sourceUnit: "MIT 2.822" },
    ],
    tribalTips: ["Merchant model underestimates forces for built-up edge conditions", "Powder metal parts need 2x the holding force during secondary machining"],
    prismRelevance: "high",
  },
  {
    courseId: "2.71",
    title: "Optics",
    department: "Mechanical Engineering",
    topics: ["interferometry", "diffraction", "laser", "optical metrology", "surface measurement"],
    algorithms: ["Fringe Analysis", "Phase Shifting Interferometry", "Confocal Microscopy"],
    formulas: [
      { name: "Rayleigh Criterion", equation: "δ = 1.22 * λ / NA", variables: { λ: "wavelength", NA: "numerical aperture" }, domain: "general", sourceUnit: "MIT 2.71" },
    ],
    tribalTips: ["Laser measuring needs 10-minute warmup for stability", "Surface finish under Ra 0.4 requires interferometric measurement"],
    prismRelevance: "medium",
  },
  {
    courseId: "2.75",
    title: "Precision Machine Design",
    department: "Mechanical Engineering",
    topics: ["kinematic design", "compliance", "thermal management", "metrology", "error budgets", "Abbe principle"],
    algorithms: ["Error Budget RSS", "Kinematic Constraint Analysis", "Thermal Error Compensation"],
    formulas: [
      { name: "Abbe Error", equation: "ε_Abbe = θ * L", variables: { θ: "angular error", L: "Abbe offset" }, domain: "machining", sourceUnit: "MIT 2.75" },
      { name: "Thermal Expansion", equation: "ΔL = α * L * ΔT", variables: { α: "CTE", L: "length", ΔT: "temp change" }, domain: "machining", sourceUnit: "MIT 2.75" },
    ],
    tribalTips: ["Minimize Abbe offset by placing scale axis coincident with probe axis", "Granite surface plates need 4 hours to stabilize after temperature change"],
    prismRelevance: "high",
  },
  {
    courseId: "2.72",
    title: "Elements of Mechanical Design",
    department: "Mechanical Engineering",
    topics: ["bearings", "gears", "shafts", "springs", "fasteners", "seals", "fatigue design"],
    algorithms: ["Bearing Life L10", "Gear Lewis Formula", "Goodman Diagram"],
    formulas: [
      { name: "Bearing L10 Life", equation: "L10 = (C/P)^p * 10^6", variables: { C: "dynamic capacity", P: "equiv load", p: "exponent (3 ball, 10/3 roller)" }, domain: "machining", sourceUnit: "MIT 2.72" },
      { name: "Gear Lewis Stress", equation: "σ = Wt * Pd / (F * Y)", variables: { Wt: "tangential force", Pd: "diametral pitch", F: "face width", Y: "Lewis form factor" }, domain: "machining", sourceUnit: "MIT 2.72" },
    ],
    tribalTips: ["Spindle bearings last longer when preloaded at factory spec", "Gear cutting requires climb milling for involute accuracy"],
    prismRelevance: "high",
  },

  // Materials Deep Dive
  {
    courseId: "3.14",
    title: "Physical Metallurgy",
    department: "Materials Science",
    topics: ["phase transformations", "precipitation", "recrystallization", "heat treatment", "TTT diagrams", "hardenability"],
    algorithms: ["JMAK Kinetics", "Avrami Equation", "Scheil Equation"],
    formulas: [
      { name: "JMAK Transformation", equation: "X = 1 - exp(-k*t^n)", variables: { X: "fraction transformed", k: "rate constant", t: "time", n: "Avrami exponent" }, domain: "materials", sourceUnit: "MIT 3.14" },
    ],
    tribalTips: ["D2 tool steel needs soak time at austenitizing temp or core won't harden", "Water quench creates more distortion than oil on thin sections"],
    prismRelevance: "high",
  },
  {
    courseId: "3.22",
    title: "Mechanical Properties of Solids",
    department: "Materials Science",
    topics: ["dislocation mechanics", "strengthening mechanisms", "fracture mechanics", "creep", "high temperature behavior"],
    algorithms: ["Hall-Petch Relation", "Orowan Strengthening", "J-Integral"],
    formulas: [
      { name: "Hall-Petch", equation: "σ_y = σ_0 + k / √d", variables: { σ_y: "yield strength", σ_0: "friction stress", k: "HP constant", d: "grain size" }, domain: "materials", sourceUnit: "MIT 3.22" },
      { name: "Griffith Criterion", equation: "σ_f = √(2Eγ / πa)", variables: { E: "modulus", γ: "surface energy", a: "crack length" }, domain: "materials", sourceUnit: "MIT 3.22" },
    ],
    tribalTips: ["Carbide tools fail by fracture not wear when cutting hardened steel", "Fine-grained steels machine better but are harder to heat treat uniformly"],
    prismRelevance: "high",
  },
  {
    courseId: "3.051",
    title: "Materials for Biomedical Applications",
    department: "Materials Science",
    topics: ["titanium alloys", "stainless steels", "cobalt chrome", "surface modification", "corrosion", "biocompatibility"],
    algorithms: ["Corrosion Rate", "Passivation Kinetics"],
    formulas: [
      { name: "Corrosion Rate", equation: "CR = K * i_corr * EW / ρ", variables: { K: "constant", i_corr: "current density", EW: "equiv weight", ρ: "density" }, domain: "materials", sourceUnit: "MIT 3.051" },
    ],
    tribalTips: ["Ti-6Al-4V requires rigid setup - vibration causes galling", "Medical-grade 316L needs passivation within 24 hours of machining"],
    prismRelevance: "high",
  },

  // Controls & Dynamics
  {
    courseId: "2.004",
    title: "Dynamics and Control II",
    department: "Mechanical Engineering",
    topics: ["state space", "controllability", "observability", "full state feedback", "estimators", "discrete time"],
    algorithms: ["Ackermann Formula", "Luenberger Observer", "Kalman Filter"],
    formulas: [
      { name: "State Feedback", equation: "u = -Kx + r", variables: { u: "control input", K: "gain matrix", x: "state vector", r: "reference" }, domain: "controls", sourceUnit: "MIT 2.004" },
    ],
    tribalTips: ["Servo loop gains should be tuned in order: position, velocity, current", "Backlash compensation needs model-based prediction, not just deadband"],
    prismRelevance: "high",
  },
  {
    courseId: "2.12",
    title: "Introduction to Robotics",
    department: "Mechanical Engineering",
    topics: ["kinematics", "dynamics", "trajectory planning", "force control", "RTCP", "calibration"],
    algorithms: ["Denavit-Hartenberg", "Inverse Kinematics", "Resolved Rate Control"],
    formulas: [
      { name: "DH Transform", equation: "T = Rot(z,θ) * Trans(z,d) * Trans(x,a) * Rot(x,α)", variables: { θ: "joint angle", d: "link offset", a: "link length", α: "link twist" }, domain: "controls", sourceUnit: "MIT 2.12" },
    ],
    tribalTips: ["5-axis RTCP accuracy depends on calibrated pivot point, not just joint angles", "Robot cell programming should use relative coordinates to simplify fixture changes"],
    prismRelevance: "high",
  },
  {
    courseId: "16.30",
    title: "Feedback Control Systems",
    department: "Aeronautics",
    topics: ["robust control", "H-infinity", "loop shaping", "mu synthesis", "uncertainty modeling"],
    algorithms: ["H-infinity Controller", "Loop Transfer Recovery", "Mu Synthesis"],
    formulas: [
      { name: "Sensitivity Function", equation: "S = 1 / (1 + L)", variables: { L: "loop transfer function" }, domain: "controls", sourceUnit: "MIT 16.30" },
    ],
    tribalTips: ["High loop gain reduces disturbance but amplifies sensor noise", "Notch filters for chatter require accurate frequency identification first"],
    prismRelevance: "medium",
  },

  // Numerical Methods
  {
    courseId: "18.06",
    title: "Linear Algebra",
    department: "Mathematics",
    topics: ["matrix operations", "eigenvalues", "SVD", "least squares", "projections", "orthogonality"],
    algorithms: ["Gaussian Elimination", "QR Decomposition", "SVD", "Eigenvalue Decomposition"],
    formulas: [
      { name: "Least Squares", equation: "x = (A^T A)^(-1) A^T b", variables: { A: "design matrix", b: "observations", x: "solution" }, domain: "optimization", sourceUnit: "MIT 18.06" },
    ],
    tribalTips: ["Condition number > 1000 means calibration data is nearly singular", "Use SVD not inverse for machine calibration - more numerically stable"],
    prismRelevance: "high",
  },
  {
    courseId: "18.330",
    title: "Introduction to Numerical Analysis",
    department: "Mathematics",
    topics: ["root finding", "interpolation", "numerical integration", "ODE solvers", "error analysis"],
    algorithms: ["Newton-Raphson", "Runge-Kutta", "Gaussian Quadrature", "Cubic Spline"],
    formulas: [
      { name: "Newton Iteration", equation: "x_{n+1} = x_n - f(x_n)/f'(x_n)", variables: { x: "estimate", f: "function", "f'": "derivative" }, domain: "optimization", sourceUnit: "MIT 18.330" },
      { name: "RK4 Step", equation: "y_{n+1} = y_n + h/6*(k1+2k2+2k3+k4)", variables: { h: "step size", k: "slopes" }, domain: "optimization", sourceUnit: "MIT 18.330" },
    ],
    tribalTips: ["Spline interpolation is smoother than linear for toolpath blending", "RK4 is accurate enough for tool life integration, no need for adaptive step"],
    prismRelevance: "medium",
  },
  {
    courseId: "6.S191",
    title: "Introduction to Deep Learning",
    department: "EECS",
    topics: ["neural networks", "CNN", "RNN", "attention", "generative models", "reinforcement learning"],
    algorithms: ["Backpropagation", "Batch Normalization", "Dropout", "Self-Attention"],
    formulas: [
      { name: "Cross-Entropy Loss", equation: "L = -Σ y_i * log(p_i)", variables: { y: "true label", p: "predicted prob" }, domain: "optimization", sourceUnit: "MIT 6.S191" },
    ],
    tribalTips: ["Tool wear prediction needs at least 1000 labeled samples per material", "CNN for surface defect detection should use augmentation for rotation invariance"],
    prismRelevance: "high",
  },

  // Thermodynamics & Heat Transfer
  {
    courseId: "2.51",
    title: "Heat Transfer",
    department: "Mechanical Engineering",
    topics: ["conduction", "convection", "radiation", "heat exchangers", "transient analysis", "fins"],
    algorithms: ["Finite Difference Method", "Lumped Capacitance", "Effectiveness-NTU"],
    formulas: [
      { name: "Fourier's Law", equation: "q = -k * dT/dx", variables: { q: "heat flux", k: "thermal conductivity", T: "temperature", x: "distance" }, domain: "machining", sourceUnit: "MIT 2.51" },
      { name: "Convection", equation: "q = h * A * ΔT", variables: { h: "heat transfer coef", A: "area", ΔT: "temp diff" }, domain: "machining", sourceUnit: "MIT 2.51" },
    ],
    tribalTips: ["Coolant flow rate affects temperature more than pressure", "Dry cutting carbide has 10x lower thermal conductivity than HSS - more heat stays in workpiece"],
    prismRelevance: "high",
  },
  {
    courseId: "2.06",
    title: "Thermal-Fluids Engineering I",
    department: "Mechanical Engineering",
    topics: ["thermodynamics", "entropy", "cycles", "fluid properties", "compressible flow"],
    algorithms: ["Carnot Efficiency", "Isentropic Relations", "Rankine Cycle"],
    formulas: [
      { name: "Carnot Efficiency", equation: "η = 1 - T_cold / T_hot", variables: { T: "absolute temperature" }, domain: "general", sourceUnit: "MIT 2.06" },
    ],
    tribalTips: ["Compressed air systems lose 25% to leaks - check fittings monthly", "MQL mist needs precise temperature control or oil viscosity varies"],
    prismRelevance: "medium",
  },

  // Signal Processing
  {
    courseId: "6.003",
    title: "Signals and Systems",
    department: "EECS",
    topics: ["Fourier transform", "filtering", "sampling", "convolution", "frequency domain", "Z-transform"],
    algorithms: ["FFT", "Digital Filtering", "Windowing", "Correlation"],
    formulas: [
      { name: "Nyquist Rate", equation: "f_s >= 2 * f_max", variables: { f_s: "sampling freq", f_max: "max signal freq" }, domain: "controls", sourceUnit: "MIT 6.003" },
      { name: "DFT", equation: "X[k] = Σ x[n] * e^(-j2πkn/N)", variables: { X: "freq domain", x: "time domain", N: "samples" }, domain: "controls", sourceUnit: "MIT 6.003" },
    ],
    tribalTips: ["Chatter detection needs 5+ kHz sampling to catch harmonics", "Spindle vibration spectrum shows bearing wear before audible noise"],
    prismRelevance: "high",
  },

  // Statistics & Quality
  {
    courseId: "6.041",
    title: "Probabilistic Systems Analysis",
    department: "EECS",
    topics: ["probability", "random variables", "estimation", "hypothesis testing", "Bayesian inference"],
    algorithms: ["Maximum Likelihood", "Bayesian Estimation", "Confidence Intervals"],
    formulas: [
      { name: "Bayes Rule", equation: "P(A|B) = P(B|A) * P(A) / P(B)", variables: { P: "probability" }, domain: "optimization", sourceUnit: "MIT 6.041" },
    ],
    tribalTips: ["Tool life follows Weibull, not normal - don't use 3-sigma for replacement", "Bayesian tool change decisions outperform fixed-interval by 30%"],
    prismRelevance: "high",
  },
  {
    courseId: "15.075",
    title: "Statistical Thinking and Data Analysis",
    department: "Sloan",
    topics: ["regression", "ANOVA", "design of experiments", "hypothesis testing", "confidence intervals"],
    algorithms: ["Linear Regression", "ANOVA", "Factorial Design"],
    formulas: [
      { name: "R-squared", equation: "R² = 1 - SS_res / SS_tot", variables: { SS_res: "residual sum squares", SS_tot: "total sum squares" }, domain: "optimization", sourceUnit: "MIT 15.075" },
    ],
    tribalTips: ["DOE for speed/feed optimization needs center points to detect curvature", "Replicate runs detect measurement noise vs. true process variation"],
    prismRelevance: "high",
  },

  // Finite Element
  {
    courseId: "2.094",
    title: "Finite Element Analysis of Solids and Fluids I",
    department: "Mechanical Engineering",
    topics: ["FEA", "meshing", "element types", "boundary conditions", "stress analysis", "modal analysis"],
    algorithms: ["Galerkin Method", "Isoparametric Elements", "Direct Stiffness Method"],
    formulas: [
      { name: "FEA Equilibrium", equation: "Ku = F", variables: { K: "stiffness matrix", u: "displacement", F: "force vector" }, domain: "machining", sourceUnit: "MIT 2.094" },
    ],
    tribalTips: ["Fixture FEA needs contact elements at clamp points, not fixed nodes", "Mesh refinement at tool-workpiece contact zone catches stress concentrations"],
    prismRelevance: "high",
  },

  // Tribology
  {
    courseId: "2.800",
    title: "Tribology",
    department: "Mechanical Engineering",
    topics: ["friction", "wear", "lubrication", "surface roughness", "contact mechanics", "coatings"],
    algorithms: ["Archard Wear Model", "Stribeck Curve", "Hertzian Contact"],
    formulas: [
      { name: "Archard Wear", equation: "V = K * W * s / H", variables: { V: "wear volume", K: "wear coef", W: "load", s: "sliding distance", H: "hardness" }, domain: "machining", sourceUnit: "MIT 2.800" },
      { name: "Hertz Contact", equation: "a = (3WR/4E*)^(1/3)", variables: { a: "contact radius", W: "load", R: "radius", "E*": "reduced modulus" }, domain: "machining", sourceUnit: "MIT 2.800" },
    ],
    tribalTips: ["Flank wear rate triples when crossing from boundary to dry friction regime", "Insert coatings fail by delamination before bulk wear in interrupted cuts"],
    prismRelevance: "high",
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class MITCourseExpansionEngine {
  private static expandedCourses = EXPANDED_COURSES;

  /**
   * Gets all expanded courses.
   */
  static getExpandedCourses(): ExpandedCourse[] {
    return [...this.expandedCourses];
  }

  /**
   * Gets expansion statistics.
   */
  static getExpansionStats(): CourseExpansionResult {
    const formulas = this.expandedCourses.reduce(
      (sum, c) => sum + c.formulas.length,
      0
    );
    const tips = this.expandedCourses.reduce(
      (sum, c) => sum + c.tribalTips.length,
      0
    );

    return {
      originalCount: 29,
      expandedCount: 29 + this.expandedCourses.length,
      newCourses: this.expandedCourses,
      totalFormulas: formulas,
      totalTribalTips: tips,
    };
  }

  /**
   * Gets formulas suitable for FormulaOrchestrator registration.
   */
  static getFormulasForRegistration(): Array<{
    name: string;
    equation: string;
    domain: string;
    source: string;
    courseId: string;
  }> {
    const formulas: Array<{
      name: string;
      equation: string;
      domain: string;
      source: string;
      courseId: string;
    }> = [];

    for (const course of this.expandedCourses) {
      for (const formula of course.formulas) {
        formulas.push({
          name: formula.name,
          equation: formula.equation,
          domain: formula.domain,
          source: `MIT ${course.courseId}`,
          courseId: course.courseId,
        });
      }
    }

    return formulas;
  }

  /**
   * Gets tribal tips for TribalKnowledgeEngine integration.
   */
  static getTribalTips(): Array<{
    tip: string;
    category: string;
    source: string;
    courseId: string;
  }> {
    const tips: Array<{
      tip: string;
      category: string;
      source: string;
      courseId: string;
    }> = [];

    for (const course of this.expandedCourses) {
      for (const tip of course.tribalTips) {
        tips.push({
          tip,
          category: course.topics[0] || "general",
          source: `MIT ${course.courseId}: ${course.title}`,
          courseId: course.courseId,
        });
      }
    }

    return tips;
  }

  /**
   * Gets courses by relevance level.
   */
  static getCoursesByRelevance(
    relevance: "high" | "medium" | "low"
  ): ExpandedCourse[] {
    return this.expandedCourses.filter((c) => c.prismRelevance === relevance);
  }

  /**
   * Gets high-relevance course count (for U-AWR33 validation).
   */
  static getHighRelevanceCount(): number {
    return this.expandedCourses.filter((c) => c.prismRelevance === "high").length;
  }

  /**
   * Search courses by topic.
   */
  static searchByTopic(topic: string): ExpandedCourse[] {
    const lower = topic.toLowerCase();
    return this.expandedCourses.filter((c) =>
      c.topics.some((t) => t.toLowerCase().includes(lower))
    );
  }

  /**
   * Search courses by algorithm.
   */
  static searchByAlgorithm(algorithm: string): ExpandedCourse[] {
    const lower = algorithm.toLowerCase();
    return this.expandedCourses.filter((c) =>
      c.algorithms.some((a) => a.toLowerCase().includes(lower))
    );
  }
}

log.info(
  `[MITCourseExpansionEngine] Loaded ${EXPANDED_COURSES.length} additional MIT courses`
);

export const mitCourseExpansionEngine = MITCourseExpansionEngine;
export default MITCourseExpansionEngine;
