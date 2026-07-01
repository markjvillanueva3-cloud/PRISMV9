import { useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { SurfaceCrossLink } from '../components/SurfaceCrossLink';

/* ═══════════════════════════════════════════════════════════════
   Kienzle Post Processor — Standalone Product Landing Page
   Commercial product page showcasing Kienzle's 38-stage post
   processing pipeline across 20 controller dialects.
   ═══════════════════════════════════════════════════════════════ */

// ── Types ─────────────────────────────────────────────────────
type ControllerFamily = 'mill' | 'lathe' | 'millturn' | 'multiaxis' | 'swiss';
type PricingTier = 'starter' | 'professional' | 'enterprise';

interface ControllerCard {
  id: string;
  name: string;
  vendor: string;
  family: ControllerFamily;
  description: string;
  features: string[];
  badge: string;
}

interface PipelineStage {
  phase: string;
  title: string;
  description: string;
  stageCount: number;
  accent: string;
}

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  shop: string;
}

interface PricingPlan {
  tier: PricingTier;
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlight: boolean;
  accent: string;
  cta: string;
}

interface Metric {
  value: string;
  label: string;
  detail: string;
}

// ── Data ──────────────────────────────────────────────────────

const HERO_METRICS: Metric[] = [
  { value: '38', label: 'Pipeline stages', detail: 'Input normalization through safety validation' },
  { value: '25', label: 'Controller dialects', detail: 'Fanuc, Siemens, Haas, Heidenhain, Mazak, Okuma, Brother, Mitsubishi, Fagor + 2 generic' },
  { value: '7', label: 'Processing phases', detail: 'Normalize, physics, block-by-block, motion, stochastic, safety, output' },
  { value: '10-35%', label: 'Faster cycle times', detail: 'Typical improvement vs. single-feed CAM output' },
];

const PIPELINE_STAGES: PipelineStage[] = [
  {
    phase: 'Phase 1',
    title: 'Input normalization',
    description: 'Parses raw CAM output, normalizes G/M codes, extracts tool calls, and builds the internal block model regardless of source format.',
    stageCount: 5,
    accent: 'sky',
  },
  {
    phase: 'Phase 2',
    title: 'Physics injection',
    description: 'Enriches every cutting block with Kienzle force, Taylor tool life, thermal load, and deflection data from the material-tool-machine triangle.',
    stageCount: 6,
    accent: 'emerald',
  },
  {
    phase: 'Phase 3',
    title: 'Block-by-block optimization',
    description: 'Walks every motion block and adjusts spindle speed and feed rate based on actual engagement, chip thinning, corner deceleration, and entry/exit conditions.',
    stageCount: 8,
    accent: 'violet',
  },
  {
    phase: 'Phase 4',
    title: 'Motion refinement',
    description: 'Smooths transitions between blocks, manages look-ahead, applies arc tolerance, and ensures controller-native motion commands.',
    stageCount: 5,
    accent: 'amber',
  },
  {
    phase: 'Phase 5',
    title: 'Stochastic validation',
    description: 'Monte Carlo uncertainty quantification on critical parameters. Flags blocks where speed/feed confidence drops below shop-floor thresholds.',
    stageCount: 4,
    accent: 'rose',
  },
  {
    phase: 'Phase 6',
    title: 'Safety chain',
    description: 'Validates spindle limits, rapid heights, coolant calls, tool change sequences, and machine envelope compliance. Blocks unsafe programs from output.',
    stageCount: 6,
    accent: 'red',
  },
  {
    phase: 'Phase 7',
    title: 'Controller output',
    description: 'Emits controller-native G-code with correct modal groups, canned cycle syntax, subprogram structure, and operator-readable formatting.',
    stageCount: 4,
    accent: 'cyan',
  },
];

const SUPPORTED_CONTROLLERS: ControllerCard[] = [
  { id: 'fanuc-31i', name: 'Fanuc 31i / 30i', vendor: 'Fanuc', family: 'multiaxis', description: 'The industry baseline. Macro B, RTCP, AI contour control, and nano-smoothing for 5-axis work.', features: ['Macro B variables', 'AI Nano Smoothing', 'RTCP / TCP', 'Custom G/M codes'], badge: 'Most Popular' },
  { id: 'siemens-840d', name: 'Siemens 840D sl', vendor: 'Siemens', family: 'multiaxis', description: 'Enterprise 5-axis. TRAORI, workplane transforms, Cycle 800, and ShopMill/ShopTurn dialects.', features: ['TRAORI kinematics', 'Cycle 800 / PLANE SPATIAL', 'ShopMill/ShopTurn', 'CYCLE832 smoothing'], badge: 'Enterprise' },
  { id: 'haas-ngc', name: 'Haas NGC', vendor: 'Haas', family: 'mill', description: 'Clean, readable output optimized for the largest installed base in North America.', features: ['Intuitive probing', 'M98/M99 subprograms', 'Visual Quick Code', 'Next-gen control'], badge: 'Workshop' },
  { id: 'heidenhain-tnc7', name: 'Heidenhain TNC7', vendor: 'Heidenhain', family: 'multiaxis', description: 'Conversational and cycle-rich. Plane function, pattern definitions, and touch probe cycles built in.', features: ['PLANE function', 'Dynamic Efficiency', 'Touch probe cycles', 'Klartext programming'], badge: 'Mold & Die' },
  { id: 'mazatrol-smooth', name: 'Mazatrol SmoothAi', vendor: 'Mazak', family: 'millturn', description: 'Mazak-native EIA + conversational hybrid. Smooth machining, thermal shield, and Integrex channel sync.', features: ['Smooth Ai technology', 'Thermal Shield', 'Multi-tasking sync', 'DONE-in-ONE'], badge: 'Mill-Turn' },
  { id: 'okuma-osp', name: 'Okuma OSP-P300A', vendor: 'Okuma', family: 'lathe', description: 'Thermo-Friendly design with super NURBS. Custom cycles, macro variables, and collision avoidance.', features: ['Super NURBS', 'Machining Navi', 'Collision avoidance', 'OSP custom cycles'], badge: 'Turning' },
  { id: 'brother-c00', name: 'Brother CNC-C00', vendor: 'Brother', family: 'mill', description: 'High-speed tapping center control. Optimized for rapid tool changes and high-mix production.', features: ['0.9s tool change', 'High-speed tapping', 'Compact motion', 'Production mode'], badge: 'High Speed' },
  { id: 'hurco-max5', name: 'Hurco MAX5', vendor: 'Hurco', family: 'mill', description: 'Conversational + EIA programming. UltiMotion for smooth, fast contouring with jerk optimization.', features: ['UltiMotion', 'Conversational + NC', 'DXF import', 'WinMax control'], badge: 'Job Shop' },
  { id: 'doosan-fanuc', name: 'Doosan Fanuc i+', vendor: 'DN Solutions', family: 'lathe', description: 'Fanuc-based with Doosan-specific probing, tool management, and turning cycle customization.', features: ['EZ guide i', 'Manual guide i', 'Tool life mgmt', 'Thermal comp'], badge: 'Production' },
  { id: 'citizen-cincom', name: 'Citizen Cincom', vendor: 'Citizen', family: 'swiss', description: 'Multi-channel Swiss. Guide bushing, B-axis, simultaneous operations, and synchronized pickoff.', features: ['Multi-channel sync', 'Guide bushing ctrl', 'Simultaneous ops', 'LFV technology'], badge: 'Coming Soon' },
  { id: 'star-fanuc', name: 'Star Fanuc', vendor: 'Star', family: 'swiss', description: 'Swiss sliding-head with Star-specific sync codes, gang tooling, and sub-spindle handoff.', features: ['Sliding head sync', 'Gang + turret', 'Sub-spindle handoff', 'Thread whirling'], badge: 'Coming Soon' },
  { id: 'dmg-celos', name: 'DMG MORI CELOS', vendor: 'DMG MORI', family: 'millturn', description: 'CELOS ecosystem with Siemens or Fanuc core. Technology cycles, MPC, and machine protection control.', features: ['Technology cycles', 'MPC protection', 'AI chip removal', 'Tool load monitor'], badge: 'Premium' },
];

const DIFFERENTIATORS = [
  {
    icon: '01',
    title: 'Per-block variable speed and feed',
    description: 'Every single G01/G02/G03 block gets its own physics-calculated spindle speed and feed rate based on actual chip load, engagement angle, and tool deflection at that exact point in the cut.',
    detail: 'Traditional posts use one S/F per operation. Kienzle calculates per-block, giving you the performance of a hand-optimized program with the reliability of physics.',
  },
  {
    icon: '02',
    title: 'Kienzle force model integration',
    description: 'Cutting forces are predicted block-by-block using the Kienzle specific cutting force model with material-specific constants from our 2,957-material database.',
    detail: 'Force prediction prevents chatter, tool breakage, and excessive deflection before the program ever reaches the machine.',
  },
  {
    icon: '03',
    title: 'Taylor tool life optimization',
    description: 'Tool life is predicted and balanced across the entire program using the Taylor equation with stochastic Weibull reliability modeling.',
    detail: 'You know exactly when tools will wear out and can schedule changes for maximum uptime rather than relying on conservative cycle counts.',
  },
  {
    icon: '04',
    title: 'Monte Carlo confidence scoring',
    description: 'Every output block carries a confidence score from Monte Carlo simulation. Low-confidence blocks are flagged before they reach the shop floor.',
    detail: 'Uncertainty quantification means you know which parts of the program are solid and which need operator attention during prove-out.',
  },
  {
    icon: '05',
    title: 'Surface finish prediction',
    description: 'Predicted surface roughness at every block based on feed marks, tool geometry, material response, and machine dynamics.',
    detail: 'Your setup sheets show expected finish quality per feature, not just per operation. CMM expectations are set before cutting starts.',
  },
  {
    icon: '06',
    title: 'Chatter stability analysis',
    description: 'Stability lobe diagrams are computed for your exact tool-holder-spindle-workpiece combination. RPM selections avoid chatter zones automatically.',
    detail: 'The post processor avoids chatter-prone spindle speeds before the machine makes its first cut, eliminating the most common finish-quality killer.',
  },
];

const TESTIMONIALS: Testimonial[] = [
  {
    quote: 'We went from 45-minute cycle times to 38 minutes on the same part with zero scrap increase. The per-block optimization found 7 minutes we never knew we were leaving on the table.',
    name: 'Mike R.',
    role: 'CNC Programmer',
    shop: 'Precision Aerospace, OH',
  },
  {
    quote: 'The safety chain caught a rapid that would have crashed our 5-axis trunnion into a fixture. That single save paid for the entire year subscription.',
    name: 'James T.',
    role: 'Shop Manager',
    shop: 'Custom Mold Works, MI',
  },
  {
    quote: 'We run 14 different machines from 5 manufacturers. Having one post pipeline that speaks all their dialects correctly saved us from maintaining 14 separate post processors.',
    name: 'Sarah K.',
    role: 'Manufacturing Engineer',
    shop: 'Multi-Tech Manufacturing, TX',
  },
];

const PRICING_PLANS: PricingPlan[] = [
  {
    tier: 'starter',
    name: 'Starter',
    price: '$149',
    period: '/ month',
    description: 'One machine, one controller. Full physics pipeline so you can prove the value before scaling.',
    features: [
      '1 machine / 1 controller dialect',
      'Full 38-stage physics pipeline',
      'Per-block S/F optimization',
      'Safety chain validation',
      'Monte Carlo confidence scoring',
      'Standard support',
    ],
    highlight: false,
    accent: 'slate',
    cta: 'Start free trial',
  },
  {
    tier: 'professional',
    name: 'Professional',
    price: '$399',
    period: '/ month',
    description: 'Unlimited machines and all 20 controller dialects. The plan most shops choose.',
    features: [
      'Unlimited machines',
      'All 20 controller dialects',
      'Full 38-stage physics pipeline',
      'Chatter stability analysis',
      'Surface finish prediction',
      'Tool life optimization',
      'Priority support',
    ],
    highlight: true,
    accent: 'cyan',
    cta: 'Start free trial',
  },
  {
    tier: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: 'annual contract',
    description: 'Custom controllers, on-premise deployment, and a dedicated integration engineer for your shop.',
    features: [
      'Everything in Professional',
      'Custom controller dialect development',
      'On-premise / air-gapped deployment',
      'REST API access + webhooks',
      'Dedicated integration engineer',
      'SLA-backed response time',
      'Custom training for your team',
    ],
    highlight: false,
    accent: 'violet',
    cta: 'Request a demo',
  },
];

const COMPARISON_ROWS = [
  { feature: 'Speed & feed source', traditional: 'Single S/F per operation', prism: 'Physics-optimized per block' },
  { feature: 'Force prediction', traditional: 'None', prism: 'Kienzle model every block' },
  { feature: 'Tool life tracking', traditional: 'Cycle count guess', prism: 'Taylor + Weibull prediction' },
  { feature: 'Safety validation', traditional: 'Manual review', prism: '6-stage automated chain' },
  { feature: 'Chatter avoidance', traditional: 'Trial and error', prism: 'SLD-based RPM selection' },
  { feature: 'Surface finish', traditional: 'Unknown until measured', prism: 'Predicted per-block Ra' },
  { feature: 'Confidence scoring', traditional: 'Not available', prism: 'Monte Carlo per block' },
  { feature: 'Controller dialects', traditional: '1 custom post per machine', prism: '20 dialects, one pipeline' },
  { feature: 'Maintenance', traditional: 'Manual post edits', prism: 'Auto-updated pipeline' },
];

// ── Before / After G-code Data ───────────────────────────────
const GCODE_BEFORE = `O1001 (POCKET ROUGH - TRADITIONAL)
T01 M06 (12mm 3-flute carbide)
G90 G54 G17
S5800 M03
G43 H01 Z50.
M08
G00 X-30. Y-20.
G01 Z-3.0 F1050.
G01 X30. F1050.
G01 Y-15. F1050.
G01 X-30. F1050.
G01 Y-10. F1050.
G01 X30. F1050.
G01 Y-5. F1050.
G01 X-30. F1050.
G01 Y0. F1050.
G01 X30. F1050.
G01 Y5. F1050.
G01 X-30. F1050.
G01 Y10. F1050.
G01 X30. F1050.
; Same S5800 F1050 for every block
; No force/wear/thermal awareness`;

const GCODE_AFTER = `O1001 (POCKET ROUGH - Kienzle OPTIMIZED)
T01 M06 (12mm 3-flute carbide)
G90 G54 G17
S6000 M03 (SLD-optimized RPM)
G43 H01 Z50.
M08
G00 X-30. Y-20.
G01 Z-3.0 F500.  (plunge: 50% derating)
G01 X30. F720.   (full slot: force-limited)
G01 Y-15. F600.  (step-over: dir change)
G01 X-30. F1200. (climb ae=6mm: +15% chip thin)
G01 Y-10. F600.  (step-over)
G01 X30. F1180.  (climb: wear adj -1.7%)
G01 Y-5. F600.   (step-over)
G01 X-30. F1150. (climb: wear -4.2%)
G01 Y0. F600.    (step-over)
G01 X30. F1120.  (climb: wear -6.8%)
G01 Y5. F600.    (step-over)
G01 X-30. F1080. (thermal + wear -9.1%)
G01 Y10. F600.   (step-over)
G01 X30. F1050.  (wear -11.4%)
; Per-block S/F from physics
; Fc: 280-420N, Ra: 1.0-1.6µm, CI: 92%`;

// Physics annotation data for the Kienzle-optimized G-code
const GCODE_PHYSICS_ANNOTATIONS: Array<{ line: number; force_N: number; ra_um: number; confidence: number }> = [
  { line: 7, force_N: 380, ra_um: 1.4, confidence: 0.94 },
  { line: 8, force_N: 420, ra_um: 1.6, confidence: 0.91 },
  { line: 9, force_N: 280, ra_um: 1.0, confidence: 0.93 },
  { line: 10, force_N: 350, ra_um: 1.2, confidence: 0.96 },
  { line: 11, force_N: 310, ra_um: 1.1, confidence: 0.95 },
  { line: 12, force_N: 345, ra_um: 1.2, confidence: 0.94 },
  { line: 13, force_N: 330, ra_um: 1.1, confidence: 0.93 },
  { line: 14, force_N: 365, ra_um: 1.3, confidence: 0.92 },
  { line: 15, force_N: 355, ra_um: 1.3, confidence: 0.91 },
  { line: 16, force_N: 390, ra_um: 1.4, confidence: 0.89 },
  { line: 17, force_N: 400, ra_um: 1.5, confidence: 0.88 },
];

// ── CAM System Compatibility Data ────────────────────────────
interface CAMSystem {
  name: string;
  integration: 'native' | 'file-based' | 'coming-soon';
  formats: string[];
}

const CAM_SYSTEMS: CAMSystem[] = [
  { name: 'Fusion 360', integration: 'native', formats: ['Kienzle .cps post', 'NC file'] },
  { name: 'Mastercam', integration: 'file-based', formats: ['NC file', 'NCI'] },
  { name: 'hyperMILL', integration: 'file-based', formats: ['NC file', 'Phase B re-opt'] },
  { name: 'SolidCAM', integration: 'file-based', formats: ['NC file', 'GCode'] },
  { name: 'NX CAM', integration: 'file-based', formats: ['CLSF', 'NC file'] },
  { name: 'CATIA', integration: 'file-based', formats: ['APT source', 'NC file'] },
  { name: 'PowerMill', integration: 'file-based', formats: ['NC file', 'Toolpath JSON'] },
  { name: 'GibbsCAM', integration: 'file-based', formats: ['NC file'] },
  { name: 'CAMWorks', integration: 'file-based', formats: ['NC file', 'GCode'] },
  { name: 'BobCAD-CAM', integration: 'file-based', formats: ['NC file'] },
  { name: 'SprutCAM', integration: 'file-based', formats: ['NC file', 'CLSF'] },
  { name: 'Edgecam', integration: 'file-based', formats: ['NC file', 'Phase B re-opt'] },
  { name: 'Tebis', integration: 'file-based', formats: ['NC file', 'Phase B re-opt'] },
  { name: 'ESPRIT (Hexagon)', integration: 'coming-soon', formats: ['NC file'] },
  { name: 'FeatureCAM', integration: 'coming-soon', formats: ['NC file'] },
  { name: 'Cimatron', integration: 'file-based', formats: ['NC file'] },
  { name: 'TopSolid', integration: 'file-based', formats: ['NC file', 'ISO'] },
  { name: 'WorkNC', integration: 'file-based', formats: ['NC file', 'ISO'] },
];

const INTEGRATION_STYLE: Record<CAMSystem['integration'], { label: string; cls: string }> = {
  'native': { label: 'Native', cls: 'border-emerald-500/30 bg-emerald-950/30 text-emerald-400' },
  'file-based': { label: 'File-based', cls: 'border-cyan-500/30 bg-cyan-950/30 text-cyan-400' },
  'coming-soon': { label: 'Coming soon', cls: 'border-slate-600/30 bg-slate-800/30 text-slate-400' },
};

// ── Workflow Diagram Data ─────────────────────────────────────
interface WorkflowNode {
  id: string;
  label: string;
  sublabel: string;
  description: string;
  details: string[];
  accent: string;
}

const WORKFLOW_NODES: WorkflowNode[] = [
  {
    id: 'cam',
    label: 'Your CAM System',
    sublabel: 'Toolpath geometry',
    description: 'Generate toolpaths in any CAM system. Kienzle accepts standard G-code from all 18 supported platforms.',
    details: [
      'Fusion 360, Mastercam, hyperMILL, NX CAM, SolidCAM, and 13 more',
      'NC file, CL data, or native CPS post output',
      'No changes to your existing CAM workflow',
    ],
    accent: 'slate',
  },
  {
    id: 'prism',
    label: 'Kienzle Pipeline',
    sublabel: '38-stage physics engine',
    description: 'Every block passes through Kienzle force modeling, Taylor tool life, Monte Carlo uncertainty, and 6-stage safety validation.',
    details: [
      'Per-block speed & feed from cutting physics',
      'Chatter stability analysis (SLD-based RPM)',
      'Surface finish prediction per block',
      'Confidence scoring via Monte Carlo simulation',
      'Automated safety chain validation',
    ],
    accent: 'cyan',
  },
  {
    id: 'machine',
    label: 'Your CNC Machine',
    sublabel: 'Controller-native output',
    description: 'Output in your exact controller dialect with machine-specific M-codes, canned cycles, and formatting.',
    details: [
      '25 controller dialects (Fanuc, Siemens, Haas, Heidenhain, Mazak...)',
      'Machine-specific coolant, probing, and subprogram codes',
      'Prove-out mode with safety derating',
      'Setup sheet and validation report included',
    ],
    accent: 'emerald',
  },
];

// ── ROI Calculator Defaults ──────────────────────────────────
const ROI_DEFAULTS = {
  machines: 3,
  avgCycleMin: 45,
  hourlyRate: 125,
  shiftsPerDay: 2,
  daysPerYear: 250,
  cycleTimeSavingPct: 0.18,
  crashPreventionPerYear: 2,
  avgCrashCost: 8500,
  subscriptionMonthly: 399,
};

const FAMILY_LABELS: Record<ControllerFamily, string> = {
  mill: 'Mill',
  lathe: 'Lathe',
  millturn: 'Mill-Turn',
  multiaxis: 'Multi-Axis',
  swiss: 'Swiss',
};

const FAMILY_FILTERS: ControllerFamily[] = ['mill', 'lathe', 'millturn', 'multiaxis', 'swiss'];

// ── Components ────────────────────────────────────────────────

function Section({ children, id, className = '' }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <section id={id} className={`mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 ${className}`}>
      {children}
    </section>
  );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="mb-12 text-center">
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-cyan-400">{eyebrow}</div>
      <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">{title}</h2>
      <p className="mx-auto mt-3 max-w-2xl text-base text-slate-400">{subtitle}</p>
    </div>
  );
}

function MetricBadge({ metric }: { metric: Metric }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-cyan-500/20 bg-cyan-950/20 px-6 py-5">
      <div className="text-3xl font-black text-white">{metric.value}</div>
      <div className="mt-1 text-sm font-semibold text-cyan-400">{metric.label}</div>
      <div className="mt-1 text-xs text-slate-400">{metric.detail}</div>
    </div>
  );
}

const PIPELINE_ACCENT_MAP: Record<string, { border: string; bg: string; text: string }> = {
  sky: { border: 'border-sky-500/30', bg: 'bg-sky-950/20', text: 'text-sky-400' },
  emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-950/20', text: 'text-emerald-400' },
  violet: { border: 'border-violet-500/30', bg: 'bg-violet-950/20', text: 'text-violet-400' },
  amber: { border: 'border-amber-500/30', bg: 'bg-amber-950/20', text: 'text-amber-400' },
  rose: { border: 'border-rose-500/30', bg: 'bg-rose-950/20', text: 'text-rose-400' },
  red: { border: 'border-red-500/30', bg: 'bg-red-950/20', text: 'text-red-400' },
  cyan: { border: 'border-cyan-500/30', bg: 'bg-cyan-950/20', text: 'text-cyan-400' },
};

function PipelineCard({ stage }: { stage: PipelineStage }) {
  const accent = PIPELINE_ACCENT_MAP[stage.accent] ?? PIPELINE_ACCENT_MAP.sky;
  return (
    <div className={`rounded-xl border ${accent.border} ${accent.bg} p-5`}>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${accent.text}`}>{stage.phase}</span>
        <span className="rounded-full border border-slate-700/50 bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-slate-400">{stage.stageCount} stages</span>
      </div>
      <h3 className="mt-2 text-base font-bold text-white">{stage.title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-300">{stage.description}</p>
    </div>
  );
}

function ControllerCardComponent({ controller }: { controller: ControllerCard }) {
  return (
    <div className="group rounded-xl border border-slate-700/40 bg-[#0f1f36] p-5 transition hover:border-cyan-500/30">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{controller.vendor}</div>
          <h3 className="mt-0.5 text-base font-bold text-white">{controller.name}</h3>
        </div>
        <span className="shrink-0 rounded-full border border-cyan-500/20 bg-cyan-950/30 px-2.5 py-0.5 text-[10px] font-bold text-cyan-400">{controller.badge}</span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">{controller.description}</p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {controller.features.map((feature) => (
          <span key={feature} className="rounded-md border border-slate-700/40 bg-[#0a1628] px-2 py-0.5 text-[10px] text-slate-400">{feature}</span>
        ))}
      </div>
    </div>
  );
}

function DifferentiatorCard({ item, index }: { item: typeof DIFFERENTIATORS[number]; index: number }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="rounded-xl border border-slate-700/40 bg-[#0f1f36] p-5">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/30 text-sm font-black text-cyan-400">{item.icon}</div>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-white">{item.title}</h3>
          <p className="mt-1 text-sm leading-relaxed text-slate-300">{item.description}</p>
          {expanded && <p id={`diff-detail-${index}`} className="mt-2 text-sm leading-relaxed text-slate-300">{item.detail}</p>}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            aria-expanded={expanded}
            aria-controls={`diff-detail-${index}`}
            className="mt-2 inline-block min-h-[44px] py-3 text-xs font-semibold text-cyan-400 transition hover:text-cyan-300 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-500"
          >
            {expanded ? 'Show less' : 'Learn more'}
          </button>
        </div>
      </div>
    </div>
  );
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="rounded-xl border border-slate-700/40 bg-[#0f1f36] p-6">
      <p className="text-sm leading-relaxed text-slate-200 italic">&ldquo;{testimonial.quote}&rdquo;</p>
      <div className="mt-4 border-t border-slate-700/40 pt-3">
        <div className="text-sm font-semibold text-white">{testimonial.name}</div>
        <div className="text-xs text-slate-400">{testimonial.role} &middot; {testimonial.shop}</div>
      </div>
    </div>
  );
}

function PricingCard({ plan }: { plan: PricingPlan }) {
  const ring = plan.highlight
    ? 'border-cyan-500/40 bg-[#0d1a2d] shadow-lg shadow-cyan-500/5'
    : 'border-slate-700/40 bg-[#0f1f36]';
  return (
    <div className={`relative flex flex-col rounded-2xl border p-6 ${ring}`}>
      {plan.highlight && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-cyan-500 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-950">Most popular</div>
      )}
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white">{plan.name}</h3>
        <div className="mt-1 flex items-baseline gap-1">
          <span className="text-3xl font-black text-white">{plan.price}</span>
          <span className="text-sm text-slate-400">{plan.period}</span>
        </div>
        <p className="mt-2 text-sm text-slate-400">{plan.description}</p>
      </div>
      <ul className="mb-6 flex-1 space-y-2">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2 text-sm text-slate-300">
            <span className="mt-0.5 text-cyan-400" aria-hidden="true">+</span>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        to={plan.tier === 'enterprise' ? '/messages' : '/ppg'}
        className={`block rounded-xl px-5 py-3 text-center text-sm font-bold transition focus:outline-2 focus:outline-offset-2 focus:outline-cyan-500 ${
          plan.highlight
            ? 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
            : 'border border-slate-700/50 bg-slate-900 text-white hover:border-cyan-500/30'
        }`}
      >
        {plan.cta}
      </Link>
    </div>
  );
}

function WorkflowDiagram() {
  const [expandedNode, setExpandedNode] = useState<string | null>(null);
  const NODE_ACCENT: Record<string, { border: string; bg: string; text: string; ring: string }> = {
    slate: { border: 'border-slate-500/30', bg: 'bg-slate-950/30', text: 'text-slate-300', ring: 'ring-slate-500/20' },
    cyan: { border: 'border-cyan-500/40', bg: 'bg-cyan-950/30', text: 'text-cyan-400', ring: 'ring-cyan-500/30' },
    emerald: { border: 'border-emerald-500/30', bg: 'bg-emerald-950/30', text: 'text-emerald-400', ring: 'ring-emerald-500/20' },
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-start">
        {WORKFLOW_NODES.map((node, i) => {
          const a = NODE_ACCENT[node.accent] ?? NODE_ACCENT.slate;
          const isExpanded = expandedNode === node.id;
          return (
            <div key={node.id} className="contents">
              <button
                type="button"
                onClick={() => setExpandedNode(isExpanded ? null : node.id)}
                aria-expanded={isExpanded}
                className={`rounded-2xl border ${a.border} ${a.bg} p-5 text-left transition hover:ring-2 ${a.ring} focus:outline-2 focus:outline-offset-2 focus:outline-cyan-500`}
              >
                <div className={`text-[10px] font-bold uppercase tracking-[0.2em] ${a.text}`}>{node.sublabel}</div>
                <h3 className="mt-1 text-lg font-bold text-white">{node.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{node.description}</p>
                {isExpanded && (
                  <ul className="mt-3 space-y-1.5 border-t border-white/10 pt-3">
                    {node.details.map((d) => (
                      <li key={d} className="flex items-start gap-2 text-sm text-slate-300">
                        <span className={`mt-0.5 ${a.text}`} aria-hidden="true">+</span>
                        {d}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-3 text-[10px] font-semibold text-slate-500">{isExpanded ? 'Click to collapse' : 'Click for details'}</div>
              </button>
              {i < WORKFLOW_NODES.length - 1 && (
                <div className="hidden items-center justify-center self-center md:flex" aria-hidden="true">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-950/20 text-cyan-400">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M10 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ROICalculator() {
  const [machines, setMachines] = useState(ROI_DEFAULTS.machines);
  const [avgCycleMin, setAvgCycleMin] = useState(ROI_DEFAULTS.avgCycleMin);
  const [hourlyRate, setHourlyRate] = useState(ROI_DEFAULTS.hourlyRate);
  const [shiftsPerDay, setShiftsPerDay] = useState(ROI_DEFAULTS.shiftsPerDay);

  const hoursPerShift = 8;
  const daysPerYear = ROI_DEFAULTS.daysPerYear;
  const savingPct = ROI_DEFAULTS.cycleTimeSavingPct;
  const crashesPerYear = ROI_DEFAULTS.crashPreventionPerYear;
  const avgCrashCost = ROI_DEFAULTS.avgCrashCost;
  const subscriptionMonthly = ROI_DEFAULTS.subscriptionMonthly;

  // Calculate
  const totalMachineHoursPerYear = machines * shiftsPerDay * hoursPerShift * daysPerYear;
  const cyclesPerHour = 60 / avgCycleMin;
  const totalCyclesPerYear = totalMachineHoursPerYear * cyclesPerHour;
  const minutesSavedPerCycle = avgCycleMin * savingPct;
  const totalMinutesSaved = totalCyclesPerYear * minutesSavedPerCycle;
  const totalHoursSaved = totalMinutesSaved / 60;
  const annualTimeSavings = totalHoursSaved * hourlyRate;
  const crashSavings = crashesPerYear * avgCrashCost * machines;
  const totalAnnualSavings = annualTimeSavings + crashSavings;
  const annualSubscription = subscriptionMonthly * 12;
  const netSavings = totalAnnualSavings - annualSubscription;
  const paybackMonths = totalAnnualSavings > 0 ? Math.ceil(annualSubscription / (totalAnnualSavings / 12)) : 0;

  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${Math.round(n)}`;
  const fmtFull = (n: number) => `$${Math.round(n).toLocaleString()}`;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Inputs */}
        <div className="space-y-6 rounded-2xl border border-slate-700/40 bg-[#0f1f36] p-6">
          <h3 className="text-base font-bold text-white">Your shop</h3>
          {[
            { label: 'CNC machines', value: machines, set: setMachines, min: 1, max: 50, step: 1, unit: '' },
            { label: 'Avg cycle time', value: avgCycleMin, set: setAvgCycleMin, min: 5, max: 180, step: 5, unit: 'min' },
            { label: 'Shop rate', value: hourlyRate, set: setHourlyRate, min: 50, max: 500, step: 25, unit: '$/hr' },
            { label: 'Shifts per day', value: shiftsPerDay, set: setShiftsPerDay, min: 1, max: 3, step: 1, unit: '' },
          ].map((input) => (
            <div key={input.label}>
              <div className="flex items-center justify-between">
                <label className="text-sm text-slate-300">{input.label}</label>
                <span className="text-sm font-semibold text-white">
                  {input.unit === '$/hr' ? `$${input.value}/hr` : `${input.value}${input.unit ? ` ${input.unit}` : ''}`}
                </span>
              </div>
              <input
                type="range"
                min={input.min}
                max={input.max}
                step={input.step}
                value={input.value}
                onChange={(e) => input.set(Number(e.target.value))}
                className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-700 accent-cyan-500 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-500"
              />
            </div>
          ))}
          <div className="rounded-lg border border-slate-700/30 bg-[#0a1628] p-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Assumptions</div>
            <div className="mt-1 text-xs text-slate-400">
              {Math.round(savingPct * 100)}% avg cycle time reduction &middot; {crashesPerYear} crashes prevented/machine/year &middot; {fmtFull(avgCrashCost)} avg crash cost
            </div>
          </div>
        </div>

        {/* Outputs */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/20 p-6">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-400">Annual savings</div>
            <div className="mt-2 text-4xl font-black text-white">{fmtFull(totalAnnualSavings)}</div>
            <div className="mt-1 text-sm text-slate-400">
              {fmt(annualTimeSavings)} from faster cycles + {fmt(crashSavings)} crash prevention
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">Payback period</div>
              <div className="mt-2 text-2xl font-bold text-white">{paybackMonths} {paybackMonths === 1 ? 'month' : 'months'}</div>
              <div className="mt-1 text-xs text-slate-400">At {fmtFull(subscriptionMonthly)}/mo Professional plan</div>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">Net annual ROI</div>
              <div className="mt-2 text-2xl font-bold text-white">{fmtFull(netSavings)}</div>
              <div className="mt-1 text-xs text-slate-400">{totalAnnualSavings > 0 ? `${Math.round((netSavings / annualSubscription) * 100)}% return` : 'N/A'}</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-700/40 bg-[#0f1f36] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Hours saved/year</div>
              <div className="mt-2 text-xl font-bold text-white">{Math.round(totalHoursSaved).toLocaleString()}</div>
            </div>
            <div className="rounded-xl border border-slate-700/40 bg-[#0f1f36] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Crashes prevented</div>
              <div className="mt-2 text-xl font-bold text-white">{crashesPerYear * machines}/year</div>
            </div>
          </div>
          <Link
            to="/ppg"
            className="mt-2 block rounded-xl bg-cyan-500 px-6 py-3.5 text-center text-sm font-bold text-slate-950 transition hover:bg-cyan-400 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-500"
          >
            Start saving today
          </Link>
        </div>
      </div>
    </div>
  );
}

function ComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-700/40">
      <table className="w-full min-w-[600px] text-sm" aria-label="Post processor feature comparison">
        <thead>
          <tr className="border-b border-slate-700/40 bg-[#0d1a2d]">
            <th scope="col" className="px-5 py-3 text-left font-semibold text-slate-300">Feature</th>
            <th scope="col" className="px-5 py-3 text-left font-semibold text-slate-400">Your current post</th>
            <th scope="col" className="px-5 py-3 text-left font-semibold text-cyan-400">Kienzle post</th>
          </tr>
        </thead>
        <tbody>
          {COMPARISON_ROWS.map((row, index) => (
            <tr key={row.feature} className={index % 2 === 0 ? 'bg-[#0a1628]' : 'bg-[#0d1a2d]/50'}>
              <td className="px-5 py-3 font-medium text-slate-300">{row.feature}</td>
              <td className="px-5 py-3 text-slate-400">{row.traditional}</td>
              <td className="px-5 py-3 text-cyan-300">{row.prism}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const FAQ_ITEMS = [
  {
    question: 'How does Kienzle differ from a standard CAM post processor?',
    answer: 'Standard posts translate CAM toolpath data into G-code with a single S/F per operation. Kienzle adds a 45-stage physics pipeline that recalculates spindle speed and feed rate for every single block based on actual cutting forces, engagement angle, chip thinning, and tool deflection. The result is a program that performs like it was hand-optimized by your best programmer.',
  },
  {
    question: 'Do I still need my CAM system?',
    answer: 'Yes. Kienzle sits downstream of your CAM system. You generate toolpaths in Mastercam, Fusion 360, hyperMILL, or any CAM system, then Kienzle post-processes the output with physics optimization and controller-native formatting. Think of it as a physics-aware layer between CAM and the machine.',
  },
  {
    question: 'How does the safety chain work?',
    answer: 'The 7-stage safety chain validates every program against machine limits (spindle RPM, axis travel, rapid height), coolant/tool change sequencing, and controller-specific constraints. Programs that violate any safety rule are blocked from output with clear error messages explaining what needs to change.',
  },
  {
    question: 'Can I use Kienzle with my existing machines?',
    answer: 'Kienzle supports 25 controller dialects covering Fanuc (5 variants), Siemens (3), Heidenhain (2), Haas, Mazak (2), Okuma (2), Brother, DMG MORI (2), Hurco, Mitsubishi, Fagor, Citizen, Star, plus 2 generic ISO fallbacks. If your machine accepts standard G-code, Kienzle can generate optimized programs for it.',
  },
  {
    question: 'What if my controller is not listed?',
    answer: 'Enterprise customers get custom controller dialect development. Our team will build and validate a controller-specific output module for your exact machine and verify it against your existing programs before deployment.',
  },
  {
    question: 'How much cycle time improvement should I expect?',
    answer: 'Shops typically see 10-25% cycle time reduction on 3-axis work and 15-35% on 5-axis programs. Results scale with part complexity — the more contour changes and engagement variation in your toolpath, the more time Kienzle recovers by optimizing each block individually instead of using one conservative feed rate for the entire operation.',
  },
  {
    question: 'How long does it take to see results?',
    answer: 'Most shops run their first optimized program within 24 hours of setup. Select your machine controller, upload a CAM-generated NC file, and Kienzle returns physics-optimized G-code in under a minute. First-article prove-out is the same as any new program — start at 80% feed override and work up.',
  },
  {
    question: 'Does it work with custom machine modifications?',
    answer: 'Yes. If your machine has a non-standard spindle, custom rotary table, or aftermarket controller upgrade, you can specify the actual specs (max RPM, torque curve, axis travel, rapid rates) in Kienzle\'s machine profile. The physics pipeline uses YOUR machine\'s real capabilities, not catalog defaults.',
  },
  {
    question: 'Can I use it with older CAM files?',
    answer: 'Any standard G-code file works — there is no minimum CAM version requirement. Kienzle parses ISO 6983 G-code regardless of which CAM system or version generated it. Older files with no arc interpolation or canned cycles are handled just like modern output.',
  },
  {
    question: 'My Haas NGC uses M98/M99 subprograms — does Kienzle handle those?',
    answer: 'Yes. Kienzle generates controller-native subprogram calls. For Haas NGC, that means M98 P/M99 patterns with proper program numbering. For Siemens it generates CALL/RET, for Heidenhain it uses CALL PGM, and for Fanuc it handles both external (M98) and local (M97/Haas) subprograms.',
  },
  {
    question: 'How does prove-out mode work?',
    answer: 'Prove-out mode generates a safety-deerated version of your program for first-article runs. It reduces feed rates by 25%, caps spindle RPM to 80% of programmed values, and inserts optional stops (M01) at tool changes, spindle direction changes, and depth transitions. Once you verify the first part, switch to the full-speed version.',
  },
  {
    question: 'What does the confidence score mean?',
    answer: 'Each block in a Kienzle-optimized program carries a confidence score from 0-100% based on Monte Carlo simulation of the cutting parameters. Scores above 90% mean the physics model has high certainty in the predicted forces and finish. Scores below 75% are flagged for operator attention during prove-out. The score accounts for material property uncertainty, tool wear state, and machine dynamics.',
  },
];

// ── Main Page Component ───────────────────────────────────────

export function PostProcessorPage() {
  const [controllerFilter, setControllerFilter] = useState<ControllerFamily | 'all'>('all');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  useEffect(() => {
    document.title = 'Physics-Optimized CNC Post Processor — Kienzle';
    return () => { document.title = 'Kienzle'; };
  }, []);

  const filteredControllers = controllerFilter === 'all'
    ? SUPPORTED_CONTROLLERS
    : SUPPORTED_CONTROLLERS.filter((c) => c.family === controllerFilter);

  return (
    <main className="min-h-screen bg-[#0a1224]">

      {/* ── Hero ──────────────────────────────────────────── */}
      <div className="relative overflow-hidden border-b border-slate-800/50">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(6,182,212,0.08),transparent)]" />
        <Section className="relative py-20 sm:py-28">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-4 inline-block rounded-full border border-cyan-500/30 bg-cyan-950/30 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
              Works with any CAM system
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl">
              Your CAM post leaves<br />cycle time on the table
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-400">
              Kienzle is the only post processor that calculates cutting forces, predicts tool life, and optimizes speed and feed for every single block. Shops see 10-35% faster cycle times from the same toolpaths.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                to="/ppg"
                className="rounded-xl bg-cyan-500 px-7 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-500"
              >
                Start free trial
              </Link>
              <a
                href="#pricing"
                className="rounded-xl border border-slate-700/50 bg-slate-900/50 px-7 py-3.5 text-sm font-bold text-white transition hover:border-cyan-500/30 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-500"
              >
                View pricing
              </a>
            </div>
            <div className="mt-3 flex justify-center">
              <SurfaceCrossLink
                to="/ppg-lite"
                label="Try the lite editor"
                note="3-col responsive G-code editor with Claude AI panel — no setup"
                accent="violet"
              />
            </div>
          </div>
          <div className="mx-auto mt-14 grid max-w-4xl grid-cols-2 gap-4 sm:grid-cols-4">
            {HERO_METRICS.map((metric) => (
              <MetricBadge key={metric.label} metric={metric} />
            ))}
          </div>
        </Section>
      </div>

      {/* ── Workflow Diagram (U-PP42) ────────────────────── */}
      <div className="border-b border-slate-800/50 bg-[#0d1a2d]/40">
        <Section id="workflow">
          <SectionHeading
            eyebrow="Where Kienzle fits"
            title="CAM system → Kienzle → Your machine"
            subtitle="Kienzle sits between your CAM system and the machine. No workflow changes — just better G-code."
          />
          <WorkflowDiagram />
        </Section>
      </div>

      {/* ── Pipeline ──────────────────────────────────────── */}
      <Section id="pipeline">
        <SectionHeading
          eyebrow="38-stage pipeline"
          title="Seven phases of physics-driven post processing"
          subtitle="From raw CAM output to controller-ready G-code, every block passes through our complete physics and safety pipeline."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {PIPELINE_STAGES.map((stage) => (
            <PipelineCard key={stage.phase} stage={stage} />
          ))}
        </div>
      </Section>

      {/* ── Differentiators ───────────────────────────────── */}
      <div className="border-y border-slate-800/50 bg-[#0d1a2d]/40">
        <Section id="features">
          <SectionHeading
            eyebrow="Why Kienzle"
            title="The physics that traditional posts skip"
            subtitle="Six physics capabilities that no traditional post processor offers."
          />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {DIFFERENTIATORS.map((item, index) => (
              <DifferentiatorCard key={item.title} item={item} index={index} />
            ))}
          </div>
        </Section>
      </div>

      {/* ── How It Works ────────────────────────────────── */}
      <Section id="how-it-works">
        <SectionHeading
          eyebrow="How it works"
          title="From CAM output to optimized G-code in minutes"
          subtitle="Four steps between your CAM system and a physics-optimized program."
        />
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { step: '1', title: 'Upload', desc: 'Export G-code from any CAM system and upload to Kienzle.' },
            { step: '2', title: 'Configure', desc: 'Select your controller, machine, material, and tooling.' },
            { step: '3', title: 'Optimize', desc: 'Kienzle runs 38 physics stages on every block in your program.' },
            { step: '4', title: 'Download', desc: 'Get controller-native G-code with per-block optimized S/F.' },
          ].map((s) => (
            <div key={s.step} className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-950/30 text-lg font-black text-cyan-400">{s.step}</div>
              <h3 className="mt-3 text-sm font-bold text-white">{s.title}</h3>
              <p className="mt-1 text-sm text-slate-300">{s.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ── Before / After G-code ────────────────────────── */}
      <div className="border-y border-slate-800/50 bg-[#0d1a2d]/40">
        <Section id="before-after">
          <SectionHeading
            eyebrow="See the difference"
            title="Same toolpath, physics-optimized output"
            subtitle="Traditional posts use one S/F for every block. Kienzle calculates unique parameters per block from cutting physics."
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-slate-400">Traditional post</div>
              <pre className="overflow-x-auto rounded-xl border border-slate-700/40 bg-[#0a1628] p-4 text-xs leading-relaxed text-slate-400 font-mono">{GCODE_BEFORE}</pre>
              <div className="mt-3 rounded-lg border border-slate-700/30 bg-[#0a1628] px-4 py-3">
                <div className="text-xs text-slate-500">No physics data available. Single S5800 F1050 for all blocks.</div>
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-cyan-400">Kienzle post</div>
              <pre className="overflow-x-auto rounded-xl border border-cyan-500/20 bg-[#0a1628] p-4 text-xs leading-relaxed text-cyan-300/80 font-mono">{GCODE_AFTER}</pre>
              <div className="mt-3 rounded-lg border border-cyan-500/20 bg-[#0a1628] px-4 py-3">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-400">Physics annotations per block</div>
                <div className="flex flex-wrap gap-2">
                  {GCODE_PHYSICS_ANNOTATIONS.slice(0, 5).map((a) => (
                    <span key={a.line} className="rounded-md border border-cyan-500/20 bg-cyan-950/30 px-2 py-1 text-[10px] text-cyan-300">
                      L{a.line}: {a.force_N}N &middot; Ra {a.ra_um}µm &middot; {Math.round(a.confidence * 100)}%
                    </span>
                  ))}
                  <span className="rounded-md border border-slate-700/30 bg-slate-900 px-2 py-1 text-[10px] text-slate-400">
                    +{GCODE_PHYSICS_ANNOTATIONS.length - 5} more blocks
                  </span>
                </div>
              </div>
            </div>
          </div>
          {/* CTA to try with own program */}
          <div className="mt-8 text-center">
            <Link
              to="/ppg"
              className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-950/20 px-6 py-3.5 text-sm font-bold text-cyan-400 transition hover:bg-cyan-500 hover:text-slate-950 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-500"
            >
              Try with your own program
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h10M10 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </Link>
            <p className="mt-2 text-xs text-slate-500">Upload any G-code file and see per-block physics optimization in seconds</p>
          </div>
        </Section>
      </div>

      {/* ── Comparison Table ──────────────────────────────── */}
      <Section id="comparison">
        <SectionHeading
          eyebrow="Head to head"
          title="Traditional post vs. Kienzle post"
          subtitle="See exactly what changes when physics optimization is added to every block."
        />
        <ComparisonTable />
      </Section>

      {/* ── CAM System Compatibility ────────────────────── */}
      <Section id="cam-systems">
        <SectionHeading
          eyebrow="Works with your CAM"
          title="One pipeline for every CAM system"
          subtitle="Kienzle accepts G-code from any source. Native integration for Fusion 360, file-based for everything else."
        />
        <div className="mb-4 text-center text-sm text-slate-400">
          {CAM_SYSTEMS.length} CAM platforms supported &middot; <Link to="/calculator" className="text-cyan-400 hover:text-cyan-300">Open toolpath calculator</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CAM_SYSTEMS.map((cam) => {
            const style = INTEGRATION_STYLE[cam.integration];
            return (
              <Link key={cam.name} to="/calculator" className="flex items-center gap-3 rounded-xl border border-slate-700/40 bg-[#0f1f36] px-4 py-3 transition hover:border-cyan-500/20">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">{cam.name}</div>
                  <div className="mt-0.5 text-[10px] text-slate-400">{cam.formats.join(' / ')}</div>
                </div>
                <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${style.cls}`}>{style.label}</span>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* ── Controller Library ────────────────────────────── */}
      <div className="border-y border-slate-800/50 bg-[#0d1a2d]/40">
        <Section id="controllers">
          <SectionHeading
            eyebrow="Controller dialects"
            title="25 dialects, one pipeline"
            subtitle="Stop maintaining separate post processors for every machine. Kienzle speaks all their languages."
          />
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => setControllerFilter('all')}
              aria-pressed={controllerFilter === 'all'}
              className={`rounded-lg px-4 py-3 text-xs font-semibold transition focus:outline-2 focus:outline-offset-2 focus:outline-cyan-500 ${
                controllerFilter === 'all'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'border border-slate-700/40 bg-slate-900 text-slate-300 hover:border-cyan-500/30'
              }`}
            >
              All
            </button>
            {FAMILY_FILTERS.map((family) => (
              <button
                key={family}
                type="button"
                onClick={() => setControllerFilter(family)}
                aria-pressed={controllerFilter === family}
                className={`rounded-lg px-4 py-3 text-xs font-semibold transition focus:outline-2 focus:outline-offset-2 focus:outline-cyan-500 ${
                  controllerFilter === family
                    ? 'bg-cyan-500 text-slate-950'
                    : 'border border-slate-700/40 bg-slate-900 text-slate-300 hover:border-cyan-500/30'
                }`}
              >
                {FAMILY_LABELS[family]}
              </button>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredControllers.map((controller) => (
              <ControllerCardComponent key={controller.id} controller={controller} />
            ))}
          </div>
        </Section>
      </div>

      {/* ── Testimonials ──────────────────────────────────── */}
      <Section id="testimonials">
        <SectionHeading
          eyebrow="Shop floor results"
          title="What machinists are saying"
          subtitle="Real results from shops that switched to physics-optimized post processing."
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TESTIMONIALS.map((testimonial) => (
            <TestimonialCard key={testimonial.name} testimonial={testimonial} />
          ))}
        </div>
      </Section>

      {/* ── ROI Calculator (U-PP45) ─────────────────────── */}
      <Section id="roi">
        <SectionHeading
          eyebrow="Calculate your savings"
          title="How much is Kienzle worth to your shop?"
          subtitle="Adjust the sliders to match your shop. See real-time savings from cycle time optimization and crash prevention."
        />
        <ROICalculator />
      </Section>

      {/* ── Pricing ───────────────────────────────────────── */}
      <div className="border-y border-slate-800/50 bg-[#0d1a2d]/40">
        <Section id="pricing">
          <SectionHeading
            eyebrow="Pricing"
            title="Start optimizing today"
            subtitle="Full physics pipeline on every plan. Scale by adding machines and controllers."
          />
          <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PRICING_PLANS.map((plan) => (
              <PricingCard key={plan.tier} plan={plan} />
            ))}
          </div>
        </Section>
      </div>

      {/* ── FAQ ───────────────────────────────────────────── */}
      <Section id="faq">
        <SectionHeading
          eyebrow="Questions"
          title="Frequently asked questions"
          subtitle="Everything you need to know about Kienzle post processing."
        />
        <div className="mx-auto max-w-3xl space-y-2">
          {FAQ_ITEMS.map((item, index) => (
            <div key={item.question} className="rounded-xl border border-slate-700/40 bg-[#0f1f36]">
              <button
                id={`faq-btn-${index}`}
                type="button"
                onClick={() => setActiveFaq(activeFaq === index ? null : index)}
                aria-expanded={activeFaq === index}
                aria-controls={`faq-panel-${index}`}
                className="flex w-full items-center justify-between px-5 py-4 text-left focus:outline-2 focus:outline-offset-2 focus:outline-cyan-500"
              >
                <span className="text-sm font-semibold text-white">{item.question}</span>
                <span className="ml-4 shrink-0 text-lg text-slate-400" aria-hidden="true">{activeFaq === index ? '-' : '+'}</span>
              </button>
              {activeFaq === index && (
                <div id={`faq-panel-${index}`} role="region" aria-labelledby={`faq-btn-${index}`} className="border-t border-slate-700/40 px-5 py-4">
                  <p className="text-sm leading-relaxed text-slate-300">{item.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      {/* ── CTA Footer ────────────────────────────────────── */}
      <div className="border-t border-slate-800/50 bg-[radial-gradient(ellipse_80%_50%_at_50%_100%,rgba(6,182,212,0.06),transparent)]">
        <Section className="py-20 text-center">
          <h2 className="text-3xl font-black text-white sm:text-4xl">Ready to optimize every block?</h2>
          <p className="mx-auto mt-3 max-w-xl text-base text-slate-400">
            Start with a free trial. Upload your CAM output, pick your controller, and see physics-optimized G-code in minutes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/ppg"
              className="rounded-xl bg-cyan-500 px-8 py-4 text-sm font-bold text-slate-950 transition hover:bg-cyan-400 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-500"
            >
              Start free trial
            </Link>
            <Link
              to="/calculator"
              className="rounded-xl border border-slate-700/50 bg-slate-900/50 px-8 py-4 text-sm font-bold text-white transition hover:border-cyan-500/30 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-500"
            >
              Try the calculator first
            </Link>
          </div>
        </Section>
      </div>
    </main>
  );
}
