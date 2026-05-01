import type { LessonReferenceAsset, LessonVisualKey } from '../../data/academy';

interface LessonVisualProps {
  visualKey: LessonVisualKey;
  title: string;
  references: LessonReferenceAsset[];
}

const VISUAL_META: Record<
  LessonVisualKey,
  { label: string; subtitle: string; lookFors: string[] }
> = {
  'shop-math': {
    label: 'Shop Math Visual',
    subtitle: 'Geometry, units, and bolt-circle thinking before code.',
    lookFors: ['Reference dimensions first', 'Watch how trig closes the triangle', 'Use the bolt circle to sanity-check coordinates'],
  },
  'tool-anatomy': {
    label: 'Tooling Anatomy',
    subtitle: 'See how geometry, reach, and holder stiffness shape the cut.',
    lookFors: ['Shorter gauge length usually buys rigidity', 'Flute geometry changes chip flow', 'Holder choice changes process margin'],
  },
  inspection: {
    label: 'Print + Inspection View',
    subtitle: 'Read datums, tolerance intent, and critical surfaces visually.',
    lookFors: ['Locate primary datum first', 'Connect dimensions to function', 'Notice which callouts drive setup decisions'],
  },
  workholding: {
    label: 'Workholding Layout',
    subtitle: 'Constraint, access, and repeatability in one picture.',
    lookFors: ['See where the 3-2-1 contacts live', 'Protect finished faces', 'Clamp for stiffness without distortion'],
  },
  'gcode-motion': {
    label: 'Motion + Modal State',
    subtitle: 'Program flow, safe rapids, and cutting motion on the part.',
    lookFors: ['Separate rapid motion from feed motion', 'Watch where state carries forward', 'Keep machine state aligned with the path'],
  },
  'chip-load': {
    label: 'Chip Formation',
    subtitle: 'Tool rotation, feed, and chip thickness in motion.',
    lookFors: ['Each flute takes a bite', 'Too light turns into rubbing', 'Stable engagement keeps heat in the chip'],
  },
  'milling-strategy': {
    label: 'Milling Strategy Map',
    subtitle: 'Compare roughing engagement and finishing intent.',
    lookFors: ['Roughing manages load', 'Finishing protects geometry', 'Entry strategy matters before the main path'],
  },
  'turning-geometry': {
    label: 'Turning Section View',
    subtitle: 'OD, ID, grooves, threads, and cutoff sequence in profile.',
    lookFors: ['Think about support before cutoff', 'Watch insert approach and clearance', 'Sequence to avoid trapping the job'],
  },
  'material-behavior': {
    label: 'Material Response',
    subtitle: 'Heat, chip shape, and force move differently by alloy family.',
    lookFors: ['Heat does not leave the same way in every material', 'Chip control changes by alloy', 'Material choice changes the process window'],
  },
  multiaxis: {
    label: 'Multi-Axis Kinematics',
    subtitle: 'Indexed vs simultaneous motion, tool tilt, and RTCP thinking.',
    lookFors: ['See the table rotate under the tool', 'Lead/lag changes contact', 'Kinematics matter as much as CAM'],
  },
  'process-control': {
    label: 'Process Feedback Loop',
    subtitle: 'Variation, wear, and thermal drift over time.',
    lookFors: ['A stable process stays inside the band', 'One good part is not proof', 'Feedback should change decisions, not just charts'],
  },
  'cam-systems': {
    label: 'CAM Translation',
    subtitle: 'Carry strategy across CAD, CAM, post, and machine.',
    lookFors: ['Workflow blocks represent intent transfer', 'Posts are part of the process', 'Platform differences should not erase strategy'],
  },
  economics: {
    label: 'Cost-to-Process View',
    subtitle: 'Tie cycle time, tooling, scrap, and margin together.',
    lookFors: ['Every process change moves cost somewhere', 'Time saved is only useful if risk stays controlled', 'Quote logic starts with technical truth'],
  },
  safety: {
    label: 'Safety and Verification',
    subtitle: 'Layered checks before motion gets real.',
    lookFors: ['Setup, tooling, and offset checks stack together', 'Verification is part of machining, not separate from it', 'Truthful warnings protect people and machines'],
  },
};

export function LessonVisual({ visualKey, title, references }: LessonVisualProps) {
  const meta = VISUAL_META[visualKey];

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <div className="bg-[radial-gradient(circle_at_top_left,_rgba(15,118,110,0.18),_transparent_40%),linear-gradient(135deg,_#0f172a_0%,_#0f766e_52%,_#0f172a_100%)] p-5 text-white">
          <div className="mb-3 flex items-center justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-100">{meta.label}</div>
              <h2 className="mt-2 text-xl font-semibold">{title}</h2>
            </div>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-white/90">
              Visual coach
            </span>
          </div>
          <p className="max-w-2xl text-sm leading-6 text-slate-100">{meta.subtitle}</p>
          <div className="mt-5 rounded-[28px] border border-white/10 bg-slate-950/30 p-4 shadow-inner">
            <VisualScene visualKey={visualKey} />
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">What to watch</div>
            <div className="mt-3 space-y-3">
              {meta.lookFors.map(item => (
                <div key={item} className="rounded-2xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Reference pack</div>
            <div className="mt-3 space-y-2">
              {references.map(reference => (
                <div key={`${reference.source}-${reference.title}`} className="rounded-2xl border border-slate-200 px-4 py-3">
                  <div className="text-sm font-medium text-slate-900">{reference.title}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">{reference.source}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function VisualScene({ visualKey }: { visualKey: LessonVisualKey }) {
  switch (visualKey) {
    case 'shop-math':
      return <ShopMathScene />;
    case 'tool-anatomy':
      return <ToolAnatomyScene />;
    case 'inspection':
      return <InspectionScene />;
    case 'workholding':
      return <WorkholdingScene />;
    case 'gcode-motion':
      return <GcodeScene />;
    case 'chip-load':
      return <ChipLoadScene />;
    case 'milling-strategy':
      return <MillingScene />;
    case 'turning-geometry':
      return <TurningScene />;
    case 'material-behavior':
      return <MaterialScene />;
    case 'multiaxis':
      return <MultiAxisScene />;
    case 'process-control':
      return <ProcessControlScene />;
    case 'cam-systems':
      return <CamSystemsScene />;
    case 'economics':
      return <EconomicsScene />;
    case 'safety':
    default:
      return <SafetyScene />;
  }
}

function SceneFrame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 520 260" className="h-full w-full" role="img" aria-label="Animated lesson diagram">
      <defs>
        <linearGradient id="tealStroke" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#5eead4" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="520" height="260" rx="26" fill="rgba(15,23,42,0.32)" />
      <g>{children}</g>
    </svg>
  );
}

function ShopMathScene() {
  return (
    <SceneFrame>
      <circle cx="120" cy="130" r="48" stroke="url(#tealStroke)" strokeWidth="4" fill="none" />
      <circle cx="120" cy="130" r="6" fill="#5eead4" />
      {[0, 60, 120, 180, 240, 300].map(angle => (
        <circle
          key={angle}
          cx={120 + Math.cos((angle * Math.PI) / 180) * 48}
          cy={130 + Math.sin((angle * Math.PI) / 180) * 48}
          r="7"
          fill="#f8fafc"
        />
      ))}
      <path d="M260 192 L348 68 L420 192" fill="none" stroke="#f8fafc" strokeWidth="4" strokeLinecap="round" />
      <path d="M260 192 L348 192 L348 68" fill="none" stroke="#5eead4" strokeWidth="4" strokeLinecap="round" strokeDasharray="9 8" />
      <text x="285" y="205" fill="#cbd5e1" fontSize="14">X</text>
      <text x="355" y="134" fill="#cbd5e1" fontSize="14">Y</text>
      <text x="357" y="214" fill="#5eead4" fontSize="14">Trig closes the setup</text>
    </SceneFrame>
  );
}

function ToolAnatomyScene() {
  return (
    <SceneFrame>
      <rect x="108" y="44" width="86" height="34" rx="10" fill="#94a3b8" />
      <rect x="122" y="78" width="58" height="116" rx="18" fill="#e2e8f0" />
      <path d="M122 112 L180 112" stroke="#0f172a" strokeWidth="3" />
      <path d="M122 144 L180 144" stroke="#0f172a" strokeWidth="3" />
      <path d="M122 176 L180 176" stroke="#0f172a" strokeWidth="3" />
      <path d="M194 62 L270 62" stroke="#5eead4" strokeWidth="3" strokeDasharray="8 8" />
      <path d="M180 108 L278 108" stroke="#38bdf8" strokeWidth="3" strokeDasharray="8 8" />
      <path d="M180 182 L280 182" stroke="#f8fafc" strokeWidth="3" strokeDasharray="8 8" />
      <text x="284" y="66" fill="#5eead4" fontSize="14">Holder + gauge length</text>
      <text x="284" y="112" fill="#38bdf8" fontSize="14">Flute / helix zone</text>
      <text x="284" y="186" fill="#f8fafc" fontSize="14">Rigidity lives here</text>
    </SceneFrame>
  );
}

function InspectionScene() {
  return (
    <SceneFrame>
      <rect x="76" y="42" width="170" height="170" rx="18" fill="#f8fafc" />
      <rect x="104" y="72" width="112" height="72" rx="12" fill="none" stroke="#0f766e" strokeWidth="4" />
      <path d="M112 174 H216" stroke="#94a3b8" strokeWidth="3" strokeDasharray="8 8" />
      <path d="M256 106 L376 74" stroke="#38bdf8" strokeWidth="3" />
      <path d="M240 164 L392 182" stroke="#5eead4" strokeWidth="3" />
      <circle cx="380" cy="74" r="28" fill="#0f766e" />
      <text x="368" y="79" fill="#f8fafc" fontSize="16">A</text>
      <circle cx="396" cy="184" r="28" fill="#0f172a" />
      <text x="384" y="189" fill="#f8fafc" fontSize="16">B</text>
      <text x="270" y="104" fill="#bae6fd" fontSize="14">Primary datum</text>
      <text x="264" y="176" fill="#99f6e4" fontSize="14">Tolerance intent</text>
    </SceneFrame>
  );
}

function WorkholdingScene() {
  return (
    <SceneFrame>
      <rect x="78" y="176" width="364" height="18" rx="9" fill="#475569" />
      <rect x="108" y="118" width="58" height="58" rx="12" fill="#64748b" />
      <rect x="354" y="118" width="58" height="58" rx="12" fill="#64748b" />
      <rect x="170" y="94" width="180" height="82" rx="12" fill="#f8fafc" />
      <circle cx="188" cy="166" r="7" fill="#5eead4" />
      <circle cx="218" cy="166" r="7" fill="#5eead4" />
      <circle cx="248" cy="166" r="7" fill="#5eead4" />
      <circle cx="334" cy="106" r="7" fill="#38bdf8" />
      <circle cx="334" cy="136" r="7" fill="#38bdf8" />
      <circle cx="334" cy="166" r="7" fill="#f8fafc" />
      <text x="168" y="74" fill="#f8fafc" fontSize="14">3-2-1 constraint: locate, support, clamp</text>
    </SceneFrame>
  );
}

function GcodeScene() {
  return (
    <SceneFrame>
      <rect x="74" y="58" width="372" height="146" rx="18" fill="rgba(15,23,42,0.42)" stroke="#334155" />
      <path d="M116 160 L116 108 L220 108 L220 132 L308 132 L308 92 L400 92" fill="none" stroke="#5eead4" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="116" cy="160" r="9" fill="#f8fafc">
        <animateMotion dur="5s" repeatCount="indefinite" path="M0 0 L0 -52 L104 0 L0 24 L88 0 L0 -40 L92 0" />
      </circle>
      <text x="92" y="84" fill="#38bdf8" fontSize="14">G0 safe move</text>
      <text x="232" y="154" fill="#5eead4" fontSize="14">G1 cutting move</text>
    </SceneFrame>
  );
}

function ChipLoadScene() {
  return (
    <SceneFrame>
      <circle cx="146" cy="130" r="58" fill="none" stroke="#e2e8f0" strokeWidth="4" />
      <g>
        <path d="M146 72 L156 130 L146 188 L136 130 Z" fill="#5eead4">
          <animateTransform attributeName="transform" type="rotate" from="0 146 130" to="360 146 130" dur="2.5s" repeatCount="indefinite" />
        </path>
        <path d="M88 130 L146 120 L204 130 L146 140 Z" fill="#38bdf8">
          <animateTransform attributeName="transform" type="rotate" from="0 146 130" to="360 146 130" dur="2.5s" repeatCount="indefinite" />
        </path>
      </g>
      <path d="M250 130 H430" stroke="#f8fafc" strokeWidth="5" strokeDasharray="12 10" />
      <polygon points="430,130 408,118 408,142" fill="#f8fafc" />
      <path d="M264 102 C286 116 298 116 320 102" stroke="#fb7185" strokeWidth="4" fill="none">
        <animate attributeName="d" dur="2s" repeatCount="indefinite" values="M264 102 C286 116 298 116 320 102; M264 96 C286 126 298 126 320 96; M264 102 C286 116 298 116 320 102" />
      </path>
      <text x="252" y="86" fill="#5eead4" fontSize="14">Each flute takes a bite</text>
      <text x="256" y="162" fill="#f8fafc" fontSize="14">Feed direction controls chip thickness</text>
    </SceneFrame>
  );
}

function MillingScene() {
  return (
    <SceneFrame>
      <rect x="110" y="58" width="300" height="146" rx="20" fill="#0f172a" stroke="#475569" strokeWidth="4" />
      <rect x="168" y="94" width="184" height="74" rx="12" fill="none" stroke="#38bdf8" strokeWidth="4" />
      <path d="M142 182 C180 128 210 112 254 112 S334 154 378 82" fill="none" stroke="#5eead4" strokeWidth="5" strokeLinecap="round">
        <animate attributeName="stroke-dasharray" dur="2.5s" repeatCount="indefinite" values="0 520;180 340;0 520" />
      </path>
      <circle cx="142" cy="182" r="8" fill="#f8fafc">
        <animateMotion dur="4s" repeatCount="indefinite" path="M0 0 C38 -54 68 -70 112 -70 S192 -28 236 -100" />
      </circle>
      <text x="124" y="42" fill="#5eead4" fontSize="14">Adaptive roughing load</text>
      <text x="196" y="88" fill="#bae6fd" fontSize="14">Finish boundary</text>
    </SceneFrame>
  );
}

function TurningScene() {
  return (
    <SceneFrame>
      <rect x="88" y="118" width="260" height="44" rx="22" fill="#cbd5e1" />
      <path d="M348 118 H392 V162 H348" fill="#94a3b8" />
      <path d="M328 74 L392 96 L332 118" fill="#fb7185">
        <animateTransform attributeName="transform" type="translate" values="0 0; 10 0; 0 0" dur="2s" repeatCount="indefinite" />
      </path>
      <path d="M98 140 H316" stroke="#0f172a" strokeWidth="4" strokeDasharray="10 8" />
      <text x="88" y="98" fill="#f8fafc" fontSize="14">Support the shaft before cutoff</text>
      <text x="318" y="62" fill="#fb7185" fontSize="14">Tool approach + clearance</text>
    </SceneFrame>
  );
}

function MaterialScene() {
  return (
    <SceneFrame>
      <rect x="86" y="72" width="92" height="124" rx="18" fill="#38bdf8" opacity="0.7" />
      <rect x="214" y="72" width="92" height="124" rx="18" fill="#f8fafc" opacity="0.7" />
      <rect x="342" y="72" width="92" height="124" rx="18" fill="#fb7185" opacity="0.72" />
      <rect x="104" y="96" width="56" height="82" rx="16" fill="#0f172a" opacity="0.38" />
      <rect x="232" y="84" width="56" height="94" rx="16" fill="#0f172a" opacity="0.38" />
      <rect x="360" y="106" width="56" height="72" rx="16" fill="#0f172a" opacity="0.38" />
      <text x="92" y="52" fill="#bae6fd" fontSize="14">Aluminum: fast heat escape</text>
      <text x="212" y="52" fill="#f8fafc" fontSize="14">Stainless: work hardening risk</text>
      <text x="344" y="52" fill="#fecdd3" fontSize="14">Titanium: heat stays in cut zone</text>
    </SceneFrame>
  );
}

function MultiAxisScene() {
  return (
    <SceneFrame>
      <rect x="70" y="180" width="380" height="18" rx="9" fill="#475569" />
      <rect x="154" y="126" width="118" height="30" rx="12" fill="#cbd5e1">
        <animateTransform attributeName="transform" type="rotate" values="-18 213 141;18 213 141;-18 213 141" dur="5s" repeatCount="indefinite" />
      </rect>
      <rect x="196" y="74" width="34" height="80" rx="12" fill="#5eead4">
        <animateTransform attributeName="transform" type="rotate" values="0 213 141;24 213 141;0 213 141" dur="5s" repeatCount="indefinite" />
      </rect>
      <circle cx="382" cy="98" r="28" fill="none" stroke="#38bdf8" strokeWidth="4" />
      <path d="M382 70 V126" stroke="#38bdf8" strokeWidth="4" />
      <path d="M354 98 H410" stroke="#38bdf8" strokeWidth="4" />
      <text x="78" y="52" fill="#f8fafc" fontSize="14">Indexed + simultaneous motion changes the contact patch</text>
      <text x="332" y="150" fill="#bae6fd" fontSize="14">RTCP / axis kinematics</text>
    </SceneFrame>
  );
}

function ProcessControlScene() {
  return (
    <SceneFrame>
      <path d="M92 186 H432" stroke="#475569" strokeWidth="3" />
      <path d="M92 78 H432" stroke="#475569" strokeWidth="3" />
      <path d="M108 132 C146 124 170 108 206 118 S274 164 318 142 S384 102 418 114" fill="none" stroke="#5eead4" strokeWidth="5" />
      <path d="M92 108 H432" stroke="#38bdf8" strokeWidth="3" strokeDasharray="10 8" />
      <path d="M92 156 H432" stroke="#38bdf8" strokeWidth="3" strokeDasharray="10 8" />
      <text x="98" y="98" fill="#bae6fd" fontSize="14">Upper control band</text>
      <text x="98" y="174" fill="#bae6fd" fontSize="14">Lower control band</text>
      <text x="274" y="54" fill="#f8fafc" fontSize="14">Stable process = points stay in the band</text>
    </SceneFrame>
  );
}

function CamSystemsScene() {
  return (
    <SceneFrame>
      {[
        { x: 72, label: 'CAD' },
        { x: 188, label: 'CAM' },
        { x: 304, label: 'POST' },
        { x: 420, label: 'CNC' },
      ].map(item => (
        <g key={item.label}>
          <rect x={item.x - 42} y="102" width="84" height="56" rx="16" fill="#0f172a" stroke="#5eead4" strokeWidth="3" />
          <text x={item.x - 19} y="136" fill="#f8fafc" fontSize="16">{item.label}</text>
        </g>
      ))}
      <path d="M114 130 H150 M230 130 H266 M346 130 H382" stroke="#38bdf8" strokeWidth="4" strokeDasharray="12 8">
        <animate attributeName="stroke-dashoffset" values="0;-40" dur="1.5s" repeatCount="indefinite" />
      </path>
      <text x="86" y="78" fill="#f8fafc" fontSize="14">Strategy should survive the handoff</text>
    </SceneFrame>
  );
}

function EconomicsScene() {
  return (
    <SceneFrame>
      <rect x="116" y="96" width="48" height="92" rx="12" fill="#38bdf8" />
      <rect x="196" y="72" width="48" height="116" rx="12" fill="#5eead4" />
      <rect x="276" y="118" width="48" height="70" rx="12" fill="#f59e0b" />
      <rect x="356" y="88" width="48" height="100" rx="12" fill="#fb7185" />
      <path d="M94 188 H432" stroke="#475569" strokeWidth="3" />
      <text x="100" y="214" fill="#cbd5e1" fontSize="14">Cycle</text>
      <text x="186" y="214" fill="#cbd5e1" fontSize="14">Tooling</text>
      <text x="266" y="214" fill="#cbd5e1" fontSize="14">Scrap</text>
      <text x="350" y="214" fill="#cbd5e1" fontSize="14">Margin</text>
      <text x="116" y="50" fill="#f8fafc" fontSize="14">Every process change moves the stack somewhere</text>
    </SceneFrame>
  );
}

function SafetyScene() {
  return (
    <SceneFrame>
      <path d="M260 54 L372 96 V148 C372 186 330 214 260 228 C190 214 148 186 148 148 V96 Z" fill="#0f172a" stroke="#5eead4" strokeWidth="4" />
      <path d="M220 138 L248 166 L304 108" fill="none" stroke="#f8fafc" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="stroke-dasharray" values="0 140;140 0;140 0" dur="2.8s" repeatCount="indefinite" />
      </path>
      <text x="166" y="42" fill="#f8fafc" fontSize="14">Verify setup, tool data, and motion before trust</text>
    </SceneFrame>
  );
}
