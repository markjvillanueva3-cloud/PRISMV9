import { COURSE_0A_MODULES } from '../../../src/data/academy/course-0a-shop-math.ts';
import { COURSE_0B_MODULES } from '../../../src/data/academy/course-0b-hand-tools.ts';
import { COURSE_0C_MODULES } from '../../../src/data/academy/course-0c-blueprint-reading.ts';
import { COURSE_1_MODULES } from '../../../src/data/academy/course-1-manufacturing-fundamentals.ts';
import { COURSE_2_MODULES } from '../../../src/data/academy/course-2-speed-feed-mastery.ts';
import { COURSE_3_MODULES } from '../../../src/data/academy/course-3-gcode-programming.ts';
import { COURSE_4_MODULES } from '../../../src/data/academy/course-4-milling-operations.ts';
import { COURSE_5_MODULES } from '../../../src/data/academy/course-5-turning-operations.ts';
import {
  COURSE_6_MODULES,
  COURSE_7_MODULES,
  COURSE_8_MODULES,
  COURSE_9_MODULES,
  COURSE_10_MODULES,
  COURSE_11_MODULES,
  COURSE_12_MODULES,
} from '../../../src/data/academy/course-6-to-12-advanced.ts';

export type CourseLevel = 'L0' | 'L1' | 'L2' | 'L3';
export type CourseDomain = 'Foundations' | 'Programming' | 'Machining' | 'Optimization' | 'Business';
export type ProgramId = 'foundations' | 'operator-core' | 'programming-master' | 'leadership';
export type SpecializationTrackId =
  | 'milling-3axis'
  | 'turning-lathe'
  | 'five-axis-programmer'
  | 'mill-turn-swiss'
  | 'process-engineer';
export type LessonSectionType = 'text' | 'calculator';
export type LessonVisualKey =
  | 'shop-math'
  | 'tool-anatomy'
  | 'inspection'
  | 'workholding'
  | 'gcode-motion'
  | 'chip-load'
  | 'milling-strategy'
  | 'turning-geometry'
  | 'material-behavior'
  | 'multiaxis'
  | 'process-control'
  | 'cam-systems'
  | 'economics'
  | 'safety';

interface SourceCalculatorConfig {
  engine?: string;
  inputFields?: string[];
  outputFields?: string[];
  defaults?: Record<string, number>;
}

interface SourceContentBlock {
  type: string;
  body?: string;
  title?: string;
  calculatorConfig?: SourceCalculatorConfig;
}

interface SourceLesson {
  id: string;
  title: string;
  content: SourceContentBlock[];
  keyFormulas?: string[];
  prismEngines?: string[];
}

interface SourceQuestionOption {
  id?: string;
  text?: string;
  isCorrect?: boolean;
  explanation?: string;
}

interface SourceQuestion {
  id?: string;
  text?: string;
  options?: SourceQuestionOption[];
  correctAnswer?: string | number;
  explanation?: string;
  tags?: string[];
}

interface SourceModule {
  id: string;
  title: string;
  description: string;
  lessons: SourceLesson[];
  estimatedMinutes: number;
  quiz?: {
    questions?: SourceQuestion[];
    passingScore?: number;
  };
}


export interface LessonSection {
  id: string;
  type: LessonSectionType;
  title: string;
  body?: string;
  engine?: string;
  inputFields?: string[];
  outputFields?: string[];
}

export interface CourseQuestionOption {
  id: string;
  text: string;
}

export interface CourseQuestion {
  id: string;
  prompt: string;
  options: CourseQuestionOption[];
  correctOptionId: string;
  explanation: string;
  focus: string;
}

export interface LessonReferenceAsset {
  title: string;
  source: string;
}

export interface LessonMediaCard {
  title: string;
  kind: string;
  caption: string;
}

export interface LessonLabBrief {
  title: string;
  objective: string;
  steps: string[];
  deliverable: string;
  machine_focus: string[];
  cam_focus: string[];
}

export interface CourseLesson {
  id: string;
  title: string;
  duration_min: number;
  summary: string;
  sections: LessonSection[];
  key_formulas: string[];
  engine_links: string[];
  checkpoint_questions: CourseQuestion[];
  final_test: CourseQuestion[];
  passing_score: number;
  visual_key: LessonVisualKey;
  reference_assets: LessonReferenceAsset[];
  media_cards: LessonMediaCard[];
  lab_brief: LessonLabBrief;
  quiz_questions: number;
}

export interface Course {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  level: CourseLevel;
  domain: CourseDomain;
  programId: ProgramId;
  duration_min: number;
  prerequisites: string[];
  lessons: CourseLesson[];
  badge_id?: string;
  icon: string;
  role_outcome: string;
  mastery_outcomes: string[];
  capstone: string;
  machine_focus: string[];
}

export interface AcademyProgram {
  id: ProgramId;
  title: string;
  kicker: string;
  description: string;
  target_role: string;
  completion_outcome: string;
  courseIds: string[];
  color: string;
}

export interface SpecializationTrack {
  id: SpecializationTrackId;
  title: string;
  kicker: string;
  description: string;
  target_role: string;
  completion_outcome: string;
  courseIds: string[];
  electiveCourseIds: string[];
  machine_focus: string[];
  cam_focus: string[];
  controller_focus: string[];
  color: string;
}

export const LEVEL_LABELS: Record<CourseLevel, string> = {
  L0: 'Absolute Beginner',
  L1: 'Operator Core',
  L2: 'Programmer',
  L3: 'Mastery',
};

export const LEVEL_COLORS: Record<CourseLevel, string> = {
  L0: 'bg-slate-600',
  L1: 'bg-emerald-600',
  L2: 'bg-blue-600',
  L3: 'bg-amber-600',
};

export const DOMAIN_LABELS: Record<CourseDomain, string> = {
  Foundations: 'Foundations',
  Programming: 'Programming & CAM',
  Machining: 'Machining Practice',
  Optimization: 'Optimization & Troubleshooting',
  Business: 'Leadership & Economics',
};

const PROGRAM_META: Omit<AcademyProgram, 'courseIds'>[] = [
  {
    id: 'foundations',
    title: 'Foundation Bootcamp',
    kicker: 'Zero to capable shop learner',
    description: 'Mathematics, hand tools, print reading, and manufacturing fundamentals for learners with no prior shop experience.',
    target_role: 'Apprentice / entry-level trainee',
    completion_outcome: 'Can read prints, understand machines, follow safe setup logic, and communicate with operators and programmers.',
    color: 'from-slate-900 via-slate-800 to-slate-700',
  },
  {
    id: 'operator-core',
    title: 'Operator to Programmer Core',
    kicker: 'From setup confidence to real code literacy',
    description: 'Build parameter intuition, G-code fluency, milling and turning process understanding, material behavior, and production troubleshooting.',
    target_role: 'Setup operator / junior CNC programmer',
    completion_outcome: 'Can set up jobs, calculate speed/feed, debug code, run mills and lathes safely, and recover from common process failures.',
    color: 'from-emerald-900 via-emerald-800 to-teal-700',
  },
  {
    id: 'programming-master',
    title: 'Advanced CAM & Multi-Axis Mastery',
    kicker: 'Toward 5-axis and mill-turn leadership',
    description: 'Deep CAM platform coverage, 5-axis strategy, optimization, controller behavior, and process engineering for advanced programmers.',
    target_role: 'Senior CAM programmer / process engineer',
    completion_outcome: 'Can plan and optimize complex 3-axis, 3+2, simultaneous 5-axis, and mill-turn workflows with stronger post and process awareness.',
    color: 'from-blue-900 via-indigo-800 to-violet-700',
  },
  {
    id: 'leadership',
    title: 'Shop Leadership & Career Growth',
    kicker: 'Translate technical skill into shop impact',
    description: 'Cost, quoting, ROI, and professional growth so advanced learners can lead teams, justify decisions, and build a career path.',
    target_role: 'Lead programmer / manufacturing leader',
    completion_outcome: 'Can connect programming decisions to quoting, profitability, customer delivery, and long-term career development.',
    color: 'from-amber-900 via-orange-800 to-rose-700',
  },
];

export const SPECIALIZATION_TRACKS: SpecializationTrack[] = [
  {
    id: 'milling-3axis',
    title: '3-Axis Milling Programmer',
    kicker: 'Prismatic parts, fixtures, and production milling',
    description: 'For learners who need to move from setup and code basics into strong 3-axis process planning, roughing, finishing, troubleshooting, and cost-aware programming.',
    target_role: '3-axis CNC programmer / lead mill setup tech',
    completion_outcome: 'Can plan, program, verify, and optimize a production 3-axis milling workflow with stronger setup, toolpath, and process judgment.',
    courseIds: ['course-0a', 'course-0b', 'course-0c', 'course-1', 'course-7', 'course-2', 'course-3', 'course-4', 'course-10', 'course-9', 'course-11'],
    electiveCourseIds: ['course-6', 'course-12'],
    machine_focus: ['VMC', '3-axis mills', 'fixture-based production'],
    cam_focus: ['Mastercam', 'Fusion', 'hyperMILL'],
    controller_focus: ['Haas', 'Fanuc'],
    color: 'from-emerald-900 via-teal-800 to-cyan-700',
  },
  {
    id: 'turning-lathe',
    title: 'Turning & Lathe Programmer',
    kicker: 'OD, ID, grooves, threads, and production lathe work',
    description: 'Built for machinists who need to become dangerous in the good way on lathes: safer sequencing, better insert choices, stronger threading, and cleaner recovery from failures.',
    target_role: 'Lathe / turning programmer',
    completion_outcome: 'Can plan and defend a reliable turning process from setup through threading, boring, and cutoff, including troubleshooting and quoting awareness.',
    courseIds: ['course-0a', 'course-0b', 'course-0c', 'course-1', 'course-7', 'course-2', 'course-3', 'course-5', 'course-10', 'course-11'],
    electiveCourseIds: ['course-6', 'course-12'],
    machine_focus: ['2-axis lathe', 'live-tool lathe', 'bar work'],
    cam_focus: ['ESPRIT', 'Mastercam', 'InventorCAM'],
    controller_focus: ['Fanuc', 'Okuma', 'Haas'],
    color: 'from-slate-900 via-slate-700 to-amber-700',
  },
  {
    id: 'five-axis-programmer',
    title: '5-Axis Programmer',
    kicker: 'Indexed and simultaneous multi-axis strategy',
    description: 'This is the heavy path for advanced programmers who need multi-axis process design, RTCP/TCPC awareness, collision strategy, multi-axis CAM fluency, and evidence-backed optimization.',
    target_role: '5-axis CAM programmer / process engineer',
    completion_outcome: 'Can design, verify, and optimize 3+2 and simultaneous 5-axis jobs with stronger post, kinematics, and machine-behavior awareness.',
    courseIds: ['course-0a', 'course-0b', 'course-0c', 'course-1', 'course-7', 'course-2', 'course-3', 'course-4', 'course-6', 'course-8', 'course-9', 'course-10', 'course-11'],
    electiveCourseIds: ['course-5', 'course-12'],
    machine_focus: ['3+2 machines', 'simultaneous 5-axis', 'port and blade work'],
    cam_focus: ['hyperMILL', 'NX', 'PowerMill', 'Mastercam'],
    controller_focus: ['Heidenhain', 'Siemens', 'Fanuc'],
    color: 'from-blue-950 via-indigo-800 to-violet-700',
  },
  {
    id: 'mill-turn-swiss',
    title: 'Mill-Turn & Swiss Specialist',
    kicker: 'Multi-channel, live tooling, and complex part flow',
    description: 'A specialization for programmers who need to bridge turning, milling, CAM-system differences, and the sequencing logic of mill-turn and Swiss-style work.',
    target_role: 'Mill-turn / Swiss CAM specialist',
    completion_outcome: 'Can plan compound processes across channels, live tooling, and mixed geometry while keeping setup, code, and risk under control.',
    courseIds: ['course-0a', 'course-0b', 'course-0c', 'course-1', 'course-7', 'course-2', 'course-3', 'course-5', 'course-6', 'course-8', 'course-10', 'course-11'],
    electiveCourseIds: ['course-4', 'course-9', 'course-12'],
    machine_focus: ['mill-turn centers', 'Swiss-type machines', 'live tooling'],
    cam_focus: ['ESPRIT', 'Edgecam', 'Mastercam', 'TopSolid'],
    controller_focus: ['Fanuc', 'Mitsubishi', 'Okuma'],
    color: 'from-rose-950 via-orange-800 to-amber-700',
  },
  {
    id: 'process-engineer',
    title: 'Process Engineer & Quoting Lead',
    kicker: 'Technical judgment tied to capacity, cost, and delivery',
    description: 'For the learner who wants to connect machining depth with optimization, troubleshooting, quoting, and leadership instead of stopping at code generation.',
    target_role: 'Manufacturing engineer / quoting lead / shop leader',
    completion_outcome: 'Can connect setup and programming decisions to cost, throughput, capability, risk, and long-term shop performance.',
    courseIds: ['course-0a', 'course-0b', 'course-0c', 'course-1', 'course-7', 'course-2', 'course-3', 'course-4', 'course-5', 'course-6', 'course-8', 'course-9', 'course-10', 'course-11', 'course-12'],
    electiveCourseIds: [],
    machine_focus: ['mixed shop environment', 'capacity planning', 'cross-cell process ownership'],
    cam_focus: ['Cross-platform CAM leadership', 'post strategy', 'template governance'],
    controller_focus: ['Fanuc', 'Haas', 'Siemens', 'Heidenhain'],
    color: 'from-amber-950 via-orange-800 to-rose-700',
  },
];

interface CourseBlueprint {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  level: CourseLevel;
  domain: CourseDomain;
  programId: ProgramId;
  prerequisites: string[];
  icon: string;
  role_outcome: string;
  mastery_outcomes: string[];
  capstone: string;
  machine_focus: string[];
  sourceModules: SourceModule[];
  expansionMode?: 'standard' | 'deep';
}

function stripMarkdown(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\$\$[\s\S]*?\$\$/g, ' formula ')
    .replace(/\$(.*?)\$/g, '$1')
    .replace(/\|/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function summarize(text: string, fallback: string): string {
  const clean = stripMarkdown(text);
  if (!clean) return fallback;
  const match = clean.match(/.+?[.!?](\s|$)/);
  return (match?.[0] ?? clean).trim();
}

function sectionTitle(block: SourceContentBlock, fallback: string): string {
  if (block.title) return block.title;
  const heading = block.body?.match(/^#\s+(.+)$/m)?.[1];
  return heading?.trim() || fallback;
}

function rotate<T>(items: T[], seed: string): T[] {
  if (items.length < 2) return items;
  const offset = seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % items.length;
  return [...items.slice(offset), ...items.slice(0, offset)];
}

function buildQuestion(
  seed: string,
  prompt: string,
  correctText: string,
  distractors: string[],
  explanation: string,
  focus: string,
): CourseQuestion {
  const baseOptions: Array<CourseQuestionOption & { correct?: boolean }> = [
    { id: `${seed}-correct`, text: correctText, correct: true },
    ...distractors.slice(0, 3).map((text, index) => ({
      id: `${seed}-distractor-${index + 1}`,
      text,
      correct: false,
    })),
  ];
  const rotated = rotate(baseOptions, seed);
  const correctOptionId = rotated.find(option => option.correct)?.id ?? `${seed}-correct`;
  return {
    id: seed,
    prompt,
    options: rotated.map(({ id, text }) => ({ id, text })),
    correctOptionId,
    explanation,
    focus,
  };
}

function normalizeSourceQuestions(module: SourceModule): CourseQuestion[] {
  return (module.quiz?.questions ?? [])
    .map((question, questionIndex) => {
      const options = (question.options ?? [])
        .filter(option => option.text?.trim())
        .map((option, optionIndex) => ({
          id: option.id || `${module.id}-authored-option-${questionIndex + 1}-${optionIndex + 1}`,
          text: option.text!.trim(),
          isCorrect: option.isCorrect,
          explanation: option.explanation,
        }));

      if (!question.text?.trim() || options.length < 2) {
        return null;
      }

      const answerKey = String(question.correctAnswer ?? '').trim().toLowerCase();
      const matchedCorrect =
        options.find(option => option.isCorrect) ||
        options.find(option =>
          option.id.toLowerCase() === answerKey ||
          option.text.toLowerCase() === answerKey
        );

      if (!matchedCorrect) {
        return null;
      }

      return {
        id: question.id || `${module.id}-authored-${questionIndex + 1}`,
        prompt: question.text.trim(),
        options: options.map(option => ({ id: option.id, text: option.text })),
        correctOptionId: matchedCorrect.id,
        explanation: question.explanation?.trim() || matchedCorrect.explanation?.trim() || module.description,
        focus: question.tags?.[0] || module.title,
      };
    })
    .filter((question): question is CourseQuestion => question !== null);
}

function deriveVisualKey(module: SourceModule, formulas: string[], engines: string[]): LessonVisualKey {
  const fingerprint = `${module.title} ${module.description} ${formulas.join(' ')} ${engines.join(' ')}`.toLowerCase();

  if (/(math|triangle|trig|decimal|fraction|tap drill|bolt circle)/.test(fingerprint)) return 'shop-math';
  if (/(blueprint|gdt|datum|surface finish|tolerance|inspection|drawing|print)/.test(fingerprint)) return 'inspection';
  if (/(workholding|fixture|vise|chuck|3-2-1|clamp)/.test(fingerprint)) return 'workholding';
  if (/(hand tool|measurement|caliper|micrometer|insert|coating|flute|helix|tool setter)/.test(fingerprint)) return 'tool-anatomy';
  if (/(g-code|offset|compensation|canned cycle|subprogram|modal|post)/.test(fingerprint)) return 'gcode-motion';
  if (/(chip load|feed|speed|kienzle|taylor|tool life|stability lobe|chatter)/.test(fingerprint)) return 'chip-load';
  if (/(pocket|adaptive|roughing|finishing|milling|stepover|step over|ramp|entry|trochoidal|face milling)/.test(fingerprint)) return 'milling-strategy';
  if (/(turning|lathe|thread|boring|groove|parting|od|id|live-tool|mill-turn|swiss)/.test(fingerprint)) return 'turning-geometry';
  if (/(material|steel|aluminum|stainless|titanium|inconel|alloy|composite)/.test(fingerprint)) return 'material-behavior';
  if (/(5-axis|5 axis|3\+2|simultaneous|rtcp|tcpc|lead|lag|tilt|singularity|collision|impeller|port machining)/.test(fingerprint)) return 'multiaxis';
  if (/(monte carlo|taguchi|cpk|spc|wear|thermal|vibration|energy|optimization|troubleshooting)/.test(fingerprint)) return 'process-control';
  if (/(mastercam|hypermill|fusion|powermill|esprit|cam system|tribal knowledge)/.test(fingerprint)) return 'cam-systems';
  if (/(quote|roi|scrap|economics|cost|margin|career|leadership|portfolio)/.test(fingerprint)) return 'economics';
  return 'safety';
}

const REFERENCE_PACKS: Record<LessonVisualKey, LessonReferenceAsset[]> = {
  'shop-math': [
    { title: 'Fundamentals of CNC Machining', source: 'Archive study pack' },
    { title: 'CNC Basics Easy Learning Guide', source: 'Archive study pack' },
    { title: 'MIT 18.03 Differential Equations', source: 'College course archive' },
  ],
  'tool-anatomy': [
    { title: 'Ultimate Guide to Milling Tool Holders', source: 'Archive handbook' },
    { title: 'GC 2023-2024 US Milling', source: 'Manufacturer catalog' },
    { title: 'Tool Setter Easy Guide', source: 'Archive study pack' },
  ],
  inspection: [
    { title: 'Fundamentals of CNC Machining', source: 'Archive study pack' },
    { title: 'Blueprint Reading and GD&T resources', source: 'PRISM curriculum corpus' },
    { title: 'MIT manufacturing and measurement notes', source: 'College course archive' },
  ],
  workholding: [
    { title: 'Total Guide to CNC Jigs, Fixtures, and Workholding', source: 'Archive handbook' },
    { title: 'Virtual Machining Center fixtures', source: 'Archive simulation resources' },
    { title: 'Tool holder CAD and setup references', source: 'Archive CAD resources' },
  ],
  'gcode-motion': [
    { title: 'Fundamentals of CNC Machining', source: 'Archive study pack' },
    { title: 'AI Enhanced Post Processors templates', source: 'Archive post resources' },
    { title: 'CNC Machining Complete Engineering Guide', source: 'Archive handbook' },
  ],
  'chip-load': [
    { title: 'Dynamic Milling', source: 'Archive study pack' },
    { title: 'GC 2023-2024 US Milling', source: 'Manufacturer catalog' },
    { title: 'MIT machining physics references', source: 'College course archive' },
  ],
  'milling-strategy': [
    { title: 'Basic 3D Machining', source: 'Archive study pack' },
    { title: 'Dynamic Milling', source: 'Archive study pack' },
    { title: 'GC 2023-2024 US Milling', source: 'Manufacturer catalog' },
  ],
  'turning-geometry': [
    { title: 'InventorCAM 2024 Turning & Mill-Turn Training Course', source: 'Archive study pack' },
    { title: 'GC 2023-2024 US Turning-Grooving', source: 'Manufacturer catalog' },
    { title: 'CNC Machining Complete Engineering Guide', source: 'Archive handbook' },
  ],
  'material-behavior': [
    { title: 'GC 2023-2024 US Milling', source: 'Manufacturer catalog' },
    { title: 'GC 2023-2024 US Drilling', source: 'Manufacturer catalog' },
    { title: 'PRISM material database + college materials courses', source: 'Internal + archive sources' },
  ],
  multiaxis: [
    { title: 'Introduction to Multiaxis Toolpaths', source: 'Archive study pack' },
    { title: 'InventorCAM 2024 Multiaxis Machining User Guide', source: 'Archive study pack' },
    { title: 'Basic 3D Machining', source: 'Archive study pack' },
  ],
  'process-control': [
    { title: 'Dynamic Milling', source: 'Archive study pack' },
    { title: 'MIT probability, controls, and optimization courses', source: 'College course archive' },
    { title: 'PRISM process and chatter engines', source: 'Internal manufacturing stack' },
  ],
  'cam-systems': [
    { title: 'AI Enhanced Post Processors templates', source: 'Archive post resources' },
    { title: 'CAM platform tribal knowledge corpus', source: 'PRISM knowledge base' },
    { title: 'Multiaxis and turning training guides', source: 'Archive study pack' },
  ],
  economics: [
    { title: 'Shop economics and estimating course content', source: 'PRISM academy corpus' },
    { title: 'MIT operations and strategy courses', source: 'College course archive' },
    { title: 'Quoting and ERP reference packs', source: 'PRISM manufacturing knowledge base' },
  ],
  safety: [
    { title: 'Fundamentals of CNC Machining', source: 'Archive study pack' },
    { title: 'CNC Basics Easy Learning Guide', source: 'Archive study pack' },
    { title: 'Virtual machine simulation resources', source: 'Archive simulation resources' },
  ],
};

function buildMediaCards(
  module: SourceModule,
  visualKey: LessonVisualKey,
  references: LessonReferenceAsset[],
): LessonMediaCard[] {
  const moduleFingerprint = module.title.toLowerCase();
  const defaults = references.map(reference => ({
    title: reference.title,
    kind: reference.source,
    caption: `Use this source to deepen ${module.title.toLowerCase()} with a more shop-real reference trail.`,
  }));

  if (visualKey === 'multiaxis') {
    return [
      { title: 'Introduction to Multiaxis Toolpaths', kind: 'Archive study pack', caption: 'Use it to build the mental model for 3+2, simultaneous motion, and tool-axis planning.' },
      { title: 'InventorCAM 2024 5-Axis Basic Training', kind: 'Archive machine-CAM guide', caption: 'Translate the lesson into actual 5-axis workflow steps, setup logic, and collision planning.' },
      { title: 'InventorCAM 2024 Sim 5X Milling User Guide', kind: 'Archive simulation guide', caption: 'Pair it with the lesson visual to understand simulation, verification, and machine behavior before posting.' },
    ];
  }

  if (visualKey === 'turning-geometry') {
    return [
      { title: 'CNC Lathe Programming for Turning', kind: 'Archive study pack', caption: 'Use it for sequence structure, canned-cycle expectations, and lathe-first code thinking.' },
      { title: 'InventorCAM 2024 Turning & Mill-Turn Training Course', kind: 'Archive CAM guide', caption: 'Bridge the lesson into modern turning and mill-turn workflow practice.' },
      { title: 'G76 Threading Cycle for CNC Lathes', kind: 'Archive controller guide', caption: 'Use it when the lesson hits threading, spring passes, or controller-specific cycle behavior.' },
    ];
  }

  if (visualKey === 'gcode-motion') {
    return [
      { title: 'G-Code Basics: Program Format and Structure', kind: 'Archive study pack', caption: 'Strengthen the lesson with a fuller view of block structure, modal states, and safe review habits.' },
      { title: 'Programming Haas CNC Control G-Codes and M-Codes', kind: 'Archive machine manual', caption: 'Connect the lesson to real controller behavior and shop-floor execution.' },
      { title: 'Quick G-Code Arc Tutorial', kind: 'Archive motion guide', caption: 'Use this when the lesson touches arc centers, plane assumptions, or common interpolation mistakes.' },
    ];
  }

  if (visualKey === 'cam-systems') {
    if (moduleFingerprint.includes('mastercam')) {
      return [
        { title: 'Getting Started with Mastercam Solids', kind: 'Archive CAM guide', caption: 'Use this to deepen how geometry prep and feature strategy flow into Mastercam work.' },
        { title: 'bro-cam-strategies-en', kind: 'Archive strategy guide', caption: 'Pair the vendor workflow with a broader toolpath strategy lens.' },
        { title: 'AI Enhanced Post Processors templates', kind: 'Archive post resource', caption: 'Extend the lesson into post and automation thinking instead of stopping at toolpath generation.' },
      ];
    }
    if (moduleFingerprint.includes('hypermill')) {
      return [
        { title: 'hyperMILL Manual', kind: 'Archive CAM manual', caption: 'Use it to connect the lesson to hyperMILL workflows, terms, and higher-order strategies.' },
        { title: 'hyperMILL 2D/3D', kind: 'Archive CAM guide', caption: 'Bridge the lesson into real 2D/3D strategy choices and system-specific behavior.' },
        { title: 'AI Enhanced Post Processors templates', kind: 'Archive post resource', caption: 'Tie the CAM-system lesson back to post and control behavior.' },
      ];
    }
    return [
      { title: 'AI Enhanced Post Processors templates', kind: 'Archive post resource', caption: 'Use this to connect CAM strategy to the reality of controller output.' },
      { title: 'bro-cam-strategies-en', kind: 'Archive strategy guide', caption: 'Compare how different CAM systems express the same manufacturing intent.' },
      { title: `${module.title} vendor workflow study`, kind: 'PRISM CAM track', caption: 'Translate this specific platform into templates, posts, and cross-system vocabulary.' },
    ];
  }

  if (visualKey === 'milling-strategy' || visualKey === 'chip-load') {
    return [
      { title: 'Dynamic Milling', kind: 'Archive study pack', caption: 'Use it to deepen load management, adaptive behavior, and why high-engagement roughing works.' },
      { title: 'InventorCAM 2024 2.5D Milling Training Course', kind: 'Archive CAM guide', caption: 'Turn the lesson into practical milling workflow and toolpath decisions.' },
      { title: 'Face Mill Speeds and Feeds', kind: 'Archive calculator guide', caption: 'Use it to compare textbook feeds/speeds with real cutter geometry and approach choice.' },
    ];
  }

  if (visualKey === 'workholding' || visualKey === 'tool-anatomy') {
    return [
      { title: 'Total Guide to CNC Jigs, Fixtures, and Workholding', kind: 'Archive handbook', caption: 'Deepen setup logic, restraint planning, and repeatability.' },
      { title: 'Ultimate Guide to Milling Tool Holders', kind: 'Archive handbook', caption: 'Use this to connect holder style to rigidity, access, and process window.' },
      { title: 'BIG DAISHOWA tool holders', kind: 'Archive manufacturer pack', caption: 'Pair theory with real holder families and application examples.' },
    ];
  }

  return defaults.slice(0, 3);
}

function buildCamFocus(module: SourceModule, visualKey: LessonVisualKey): string[] {
  const title = module.title.toLowerCase();
  if (visualKey === 'cam-systems') {
    return [module.title];
  }
  if (visualKey === 'multiaxis') {
    return ['hyperMILL', 'Mastercam', 'Fusion', 'NX'];
  }
  if (visualKey === 'turning-geometry') {
    return ['ESPRIT', 'InventorCAM', 'Mastercam'];
  }
  if (visualKey === 'milling-strategy' || visualKey === 'chip-load') {
    return ['Mastercam', 'hyperMILL', 'Fusion'];
  }
  if (title.includes('post')) {
    return ['Post processors', 'Controller dialects'];
  }
  return [];
}

function buildLabBrief(
  module: SourceModule,
  visualKey: LessonVisualKey,
  blueprint: CourseBlueprint,
  engines: string[],
): LessonLabBrief {
  const objectives: Record<LessonVisualKey, string> = {
    'shop-math': 'Prove the geometry before any setup or code is trusted.',
    'tool-anatomy': 'Match tool, holder, and reach to the process instead of guessing.',
    inspection: 'Translate part intent into real measurement and setup decisions.',
    workholding: 'Build a repeatable restraint plan that still gives the tool access.',
    'gcode-motion': 'Read the code as machine behavior and catch failure before motion starts.',
    'chip-load': 'Tune parameters from cutting physics, not superstition.',
    'milling-strategy': 'Choose the path style that fits the cut, stock, and finish goal.',
    'turning-geometry': 'Sequence the part so the lathe stays stable from first cut to cutoff.',
    'material-behavior': 'Adapt tooling and process to the alloy family and heat flow.',
    multiaxis: 'Plan multi-axis motion around machine kinematics, access, and verification.',
    'process-control': 'Use data and variation to guide process improvement.',
    'cam-systems': 'Carry strategy across software, posts, and machines without losing intent.',
    economics: 'Connect machining choices to quote, risk, and margin.',
    safety: 'Turn verification into a routine, not a last-minute hope.',
  };

  return {
    title: `${module.title} shop lab`,
    objective: objectives[visualKey],
    steps: [
      `Read the lesson visual and summarize ${module.title.toLowerCase()} in plain shop language.`,
      'Use the reference/media cards to identify one machine-specific or CAM-specific workflow choice.',
      `Write the setup, tooling, or verification plan you would use before running a first part on ${blueprint.machine_focus[0] || 'the target machine'}.`,
      engines.length > 0
        ? `Use ${engines[0]} to pressure-test the decision, then compare the engine output to your manual reasoning.`
        : 'Pressure-test the plan against machine limits, fixturing, and likely failure modes.',
    ],
    deliverable: `A shop-ready training artifact: setup checklist, process note, code-review note, or troubleshooting flow tied to ${module.title.toLowerCase()}.`,
    machine_focus: blueprint.machine_focus,
    cam_focus: buildCamFocus(module, visualKey),
  };
}

function buildGeneratedQuestions(
  module: SourceModule,
  visualKey: LessonVisualKey,
  summary: string,
  formulas: string[],
  engines: string[],
): CourseQuestion[] {
  const topic = module.title;

  const genericQuestions = [
    buildQuestion(
      `${module.id}-generic-1`,
      `What is the best shop-floor goal for the lesson "${topic}"?`,
      summary,
      [
        'Run the machine faster without checking the setup or machine limits.',
        'Copy a default template and avoid understanding what it does.',
        'Skip verification because the first posted path is usually good enough.',
      ],
      `This lesson is meant to build real judgment around ${topic.toLowerCase()}, not button-pushing or blind defaults.`,
      topic,
    ),
    buildQuestion(
      `${module.id}-generic-2`,
      'Which behavior best matches PRISM’s training philosophy for this topic?',
      `Use the lesson content, calculators, and process checks to make deliberate decisions about ${topic.toLowerCase()}.`,
      [
        'Rely on tribal shortcuts without understanding why they work.',
        'Treat material, machine, and tooling limits as secondary details.',
        'Ignore setup, verification, and process feedback once the code posts.',
      ],
      'The curriculum is aiming for reliable process reasoning, not memorized habits.',
      topic,
    ),
  ];

  const bank: Record<LessonVisualKey, CourseQuestion[]> = {
    'shop-math': [
      buildQuestion(
        `${module.id}-visual-1`,
        'Why does shop math matter before any toolpath is programmed?',
        'Because stack-ups, bolt circles, trig, and unit conversions drive safe dimensions and hole locations.',
        [
          'Because machine alarms only clear after manual arithmetic is entered.',
          'Because calculators are not allowed on the shop floor.',
          'Because work offsets replace the need for dimensional thinking.',
        ],
        'Good machining decisions still rest on geometry, units, and dimensional reasoning.',
        'Shop math',
      ),
      buildQuestion(
        `${module.id}-visual-2`,
        'When checking a print or setup, what should happen first?',
        'Confirm the geometry and units make sense before trusting any numbers or coordinates.',
        [
          'Skip to posting code and adjust offsets at the machine later.',
          'Assume the title block is right and only check critical dimensions after cutting.',
          'Ignore trig if CAM generated the model.',
        ],
        'Math is the sanity layer that keeps the rest of the workflow honest.',
        'Shop math',
      ),
    ],
    'tool-anatomy': [
      buildQuestion(
        `${module.id}-visual-1`,
        'What is the real reason tool geometry and holder choice matter?',
        'They change rigidity, chip evacuation, heat, reach, and therefore the safe process window.',
        [
          'They matter mostly for labeling tools in the magazine.',
          'They only affect spindle warm-up time.',
          'They are interchangeable as long as the diameter matches.',
        ],
        'Tool anatomy is not cosmetic; it directly shapes performance and risk.',
        'Tooling',
      ),
      buildQuestion(
        `${module.id}-visual-2`,
        'A shorter, more rigid setup usually helps because it:',
        'reduces deflection and vibration while improving tool control.',
        [
          'increases the need for maximum RPM no matter the material.',
          'eliminates the need for coolant or chip evacuation.',
          'makes insert geometry irrelevant.',
        ],
        'Rigidity is a core lever for finish, tool life, and safe cycle planning.',
        'Rigidity',
      ),
    ],
    inspection: [
      buildQuestion(
        `${module.id}-visual-1`,
        'What should a machinist look for first on a drawing or inspection plan?',
        'Datums, tolerance intent, and what surfaces actually control function.',
        [
          'Only cosmetic notes because dimensions can be dialed in later.',
          'The title block color and revision font style.',
          'Tool numbers before checking feature relationships.',
        ],
        'Inspection starts by understanding functional intent, not just reading numbers.',
        'Inspection',
      ),
      buildQuestion(
        `${module.id}-visual-2`,
        'Why do datum structure and tolerance relationships matter?',
        'Because they define how the part should be located, measured, and defended in process.',
        [
          'Because they only matter to QC after machining is complete.',
          'Because they replace the need for fixture planning.',
          'Because they let you ignore stack-up and surface requirements.',
        ],
        'Good programmers and setup people read tolerance intent before they decide how to hold or cut the part.',
        'Inspection',
      ),
    ],
    workholding: [
      buildQuestion(
        `${module.id}-visual-1`,
        'What is the purpose of thoughtful workholding?',
        'Constrain the part repeatably without distorting it or blocking critical cuts.',
        [
          'Use the highest clamp force possible on every setup.',
          'Maximize jaw marks so the operator can see where it was held.',
          'Avoid datums because CAM defines the coordinates anyway.',
        ],
        'Workholding is about repeatability, access, and stability together.',
        'Workholding',
      ),
      buildQuestion(
        `${module.id}-visual-2`,
        'Why does the 3-2-1 principle show up so often in fixturing?',
        'It is a practical way to remove degrees of freedom predictably.',
        [
          'It is the default vise jaw count for all 5-axis machines.',
          'It is only relevant for grinding fixtures.',
          'It replaces the need for datums and work offsets.',
        ],
        'The principle helps machinists think clearly about constraint and repeatability.',
        'Fixturing',
      ),
    ],
    'gcode-motion': [
      buildQuestion(
        `${module.id}-visual-1`,
        'What makes modal CNC code dangerous for beginners?',
        'Commands stay active, so one missed mode or offset can affect later motion blocks.',
        [
          'Each line resets automatically, so only syntax matters.',
          'Modal codes are harmless if the feedrate is low enough.',
          'Offsets only matter during tool changes, not during cutting.',
        ],
        'Understanding what stays active is the difference between safe code review and guesswork.',
        'G-code',
      ),
      buildQuestion(
        `${module.id}-visual-2`,
        'Why should a programmer care about offsets and compensation logic?',
        'Because the code only works safely when the machine state matches the assumptions behind the path.',
        [
          'Because CAM posts automatically eliminate all offset mistakes.',
          'Because compensation only affects surface finish, not location.',
          'Because tool length and work offset choices are operator-only concerns.',
        ],
        'Machine state and posted motion have to agree for the path to be trustworthy.',
        'Offsets',
      ),
    ],
    'chip-load': [
      buildQuestion(
        `${module.id}-visual-1`,
        'What usually happens when chip load is too low?',
        'The tool rubs, heat builds up, and tool life often gets worse instead of better.',
        [
          'The tool always lasts longer because the cut is gentler.',
          'Surface finish always improves with no downside.',
          'Spindle power drops to zero, so the cut becomes safer.',
        ],
        'Too light can be just as destructive as too heavy because the edge stops cutting cleanly.',
        'Chip load',
      ),
      buildQuestion(
        `${module.id}-visual-2`,
        'What does a speed/feed lesson really train you to do?',
        'Choose parameters that respect machine limits, tool geometry, material behavior, and process goals together.',
        [
          'Memorize one RPM table and reuse it for every machine.',
          'Always prioritize the highest MRR regardless of finish or tool life.',
          'Ignore holder, spindle, and rigidity if the tool manufacturer publishes a range.',
        ],
        'Good parameter selection is contextual, not just table lookup.',
        'Speed and feed',
      ),
    ],
    'milling-strategy': [
      buildQuestion(
        `${module.id}-visual-1`,
        'Why separate roughing and finishing strategy mentally?',
        'They solve different problems: stock removal versus geometry and finish control.',
        [
          'Because finish passes should always use the same engagement as roughing.',
          'Because roughing is only for cast iron and finishing is only for aluminum.',
          'Because adaptive paths replace the need for finishing.',
        ],
        'Toolpath choice should match the job each cut is supposed to do.',
        'Milling strategy',
      ),
      buildQuestion(
        `${module.id}-visual-2`,
        'When is an adaptive or high-engagement path often useful?',
        'When you want more consistent cutter engagement and a safer roughing load.',
        [
          'Only when the surface finish tolerance is cosmetic.',
          'Only on drill cycles with no lateral motion.',
          'When the shortest code file matters more than the process.',
        ],
        'Adaptive paths are mainly about load management and predictable roughing.',
        'Adaptive milling',
      ),
    ],
    'turning-geometry': [
      buildQuestion(
        `${module.id}-visual-1`,
        'Why do turning lessons spend so much time on geometry and sequence?',
        'Because OD, ID, grooves, threads, and cutoff can trap the process if they are sequenced carelessly.',
        [
          'Because lathes do not use work offsets or compensation.',
          'Because surface speed has no effect on insert life in turning.',
          'Because threading removes the need for finishing passes.',
        ],
        'Lathe work rewards thinking ahead about access, support, and the final cutoff condition.',
        'Turning strategy',
      ),
      buildQuestion(
        `${module.id}-visual-2`,
        'What is a common danger in parting, threading, or deep boring?',
        'Poor rigidity, chip control, or geometry can quickly turn into tool failure or scrap.',
        [
          'These operations are low-risk because feedrates are modest.',
          'The insert nose radius is the only variable that matters.',
          'Coolant choice rarely matters once the spindle is running.',
        ],
        'These operations often sit on the edge of stability and need deliberate setup choices.',
        'Turning risk',
      ),
    ],
    'material-behavior': [
      buildQuestion(
        `${module.id}-visual-1`,
        'Why should the same cutter behave differently in aluminum, stainless, and titanium?',
        'Each material changes heat flow, cutting force, work hardening, and chip behavior.',
        [
          'Only hardness matters, so the rest of the material behavior is secondary.',
          'Coating color matters more than the alloy family.',
          'Material choice mostly changes the coolant color, not the process.',
        ],
        'Material behavior changes the whole process window, not just spindle speed.',
        'Material behavior',
      ),
      buildQuestion(
        `${module.id}-visual-2`,
        'What is the best habit when changing material families?',
        'Re-evaluate tool geometry, speed/feed, heat management, and chip evacuation together.',
        [
          'Keep the same program and only lower feed by 5%.',
          'Assume stainless and aluminum respond the same if tool diameter matches.',
          'Ignore work hardening if the first pass sounds stable.',
        ],
        'Material changes should trigger a process review, not a minor tweak.',
        'Material strategy',
      ),
    ],
    multiaxis: [
      buildQuestion(
        `${module.id}-visual-1`,
        'What is the practical difference between 3+2 and simultaneous 5-axis?',
        '3+2 indexes and cuts from a fixed orientation, while simultaneous motion manages tool orientation during the cut.',
        [
          '3+2 is for turning only and simultaneous is for milling only.',
          'There is no difference if the post supports A and C axes.',
          'Simultaneous 5-axis only changes the work offset, not tool attitude.',
        ],
        'The two modes solve different access and finish problems and should be chosen deliberately.',
        '5-axis strategy',
      ),
      buildQuestion(
        `${module.id}-visual-2`,
        'Why do RTCP/TCPC and singularity zones matter?',
        'Because tool-center control and axis kinematics determine whether the posted path is actually safe and achievable.',
        [
          'Because 5-axis machines automatically avoid every collision once the tool is tilted.',
          'Because singularities only affect simulation graphics, not motion.',
          'Because RTCP is just a naming preference with no machine effect.',
        ],
        'Machine kinematics are part of the process, not just post-processor trivia.',
        '5-axis machine behavior',
      ),
    ],
    'process-control': [
      buildQuestion(
        `${module.id}-visual-1`,
        'What is the main mindset behind process optimization lessons?',
        'Use evidence, variation, and measurable risk to guide changes instead of guessing.',
        [
          'Change three variables at once until the machine sounds better.',
          'Prioritize the fastest possible feedrate regardless of spread or scrap.',
          'Assume one successful part proves the process is stable.',
        ],
        'Optimization is about controlled change and evidence, not random tuning.',
        'Process control',
      ),
      buildQuestion(
        `${module.id}-visual-2`,
        'Why are topics like SPC, thermal drift, wear, and vibration grouped together?',
        'They all explain why a process that looked fine once can still wander over time.',
        [
          'They only matter on machines larger than 40 taper.',
          'They are mostly accounting topics for quoting teams.',
          'They become irrelevant when CAM templates are standardized.',
        ],
        'Stable machining requires understanding how variation enters the process.',
        'Variation',
      ),
    ],
    'cam-systems': [
      buildQuestion(
        `${module.id}-visual-1`,
        'What is the most valuable skill in a CAM-system mastery lesson?',
        'Translate strategy and intent across platforms instead of memorizing one vendor’s buttons.',
        [
          'Use identical menu paths in every CAM package.',
          'Treat posts as fixed black boxes with no strategic impact.',
          'Avoid comparing platforms because each one is completely isolated.',
        ],
        'The goal is flexible process thinking, not vendor tunnel vision.',
        'CAM systems',
      ),
      buildQuestion(
        `${module.id}-visual-2`,
        'Why does cross-platform understanding matter in a shop?',
        'Because strategy, automation, and post behavior often need to survive machine, customer, and software changes.',
        [
          'Because every platform outputs identical code for the same part.',
          'Because once a shop chooses a CAM package, no programmer ever changes jobs or customers.',
          'Because controller limits disappear when the CAM software changes.',
        ],
        'Strong programmers carry process intent across tools and environments.',
        'CAM transfer',
      ),
    ],
    economics: [
      buildQuestion(
        `${module.id}-visual-1`,
        'Why do economics and quoting belong in a machining academy?',
        'Because process decisions only matter fully when you can connect them to time, tooling, scrap, and margin.',
        [
          'Because technical decisions and business outcomes never interact.',
          'Because quoting can be done accurately without understanding setups or cycle time.',
          'Because ROI only matters to finance after the job ships.',
        ],
        'A strong manufacturing professional can explain both the process and the money behind it.',
        'Economics',
      ),
      buildQuestion(
        `${module.id}-visual-2`,
        'What makes a process improvement truly valuable?',
        'It improves throughput, quality, risk, or cost in a way the shop can actually defend.',
        [
          'It sounds advanced, even if setup complexity rises and quality suffers.',
          'It uses more expensive tooling whether or not the cycle changes.',
          'It produces the shortest NC file regardless of the machine behavior.',
        ],
        'Real value is measurable and defensible, not just novel.',
        'Value',
      ),
    ],
    safety: [
      buildQuestion(
        `${module.id}-visual-1`,
        'What should always happen before trusting a new setup or path?',
        'Review the workholding, machine state, tool data, and intended motion deliberately.',
        [
          'Trust the first output if CAM reported no syntax issues.',
          'Start the spindle and listen for problems to reveal themselves.',
          'Skip setup review if the operator ran a similar part last week.',
        ],
        'Safe machining comes from layered checks, not confidence alone.',
        'Safety',
      ),
      buildQuestion(
        `${module.id}-visual-2`,
        'Why is honest process feedback so important in training?',
        'Because machinists learn faster when the system shows uncertainty, risk, and verification steps clearly.',
        [
          'Because vague confidence is better for morale than accurate warnings.',
          'Because training systems should always hide complexity from new users.',
          'Because machine limits are mostly theoretical in modern CAM.',
        ],
        'Truthful feedback is what turns training into reliable shop behavior.',
        'Verification',
      ),
    ],
  };

  const formulaQuestion = formulas.length > 0
    ? [
        buildQuestion(
          `${module.id}-formula-1`,
          `How should you use formulas and engines in "${topic}"?`,
          'Use them to explain and defend the process, then verify against the real machine, tool, and setup context.',
          [
            'Use formulas only to make the lesson look advanced, then ignore them on real jobs.',
            'Treat a single calculator output as proof that no verification is needed.',
            'Avoid formulas completely because experienced machinists should rely only on feel.',
          ],
          `The strongest learners can connect the math and the machine behavior for ${topic.toLowerCase()}.`,
          formulas[0],
        ),
      ]
    : [];

  const engineQuestion = engines.length > 0
    ? [
        buildQuestion(
          `${module.id}-engine-1`,
          'What is the right way to use a PRISM engine inside this lesson?',
          `Use it as an interactive reasoning aid for ${engines[0]}, then compare the result to setup reality and process goals.`,
          [
            'Use it once and assume all future jobs can reuse the same answer unchanged.',
            'Treat engine output as a replacement for understanding the process.',
            'Avoid engine output because only manual calculation is credible.',
          ],
          'Engines are most valuable when they reinforce understanding and verification together.',
          engines[0],
        ),
      ]
    : [];

  return [
    ...(bank[visualKey] ?? []),
    ...formulaQuestion,
    ...engineQuestion,
    ...genericQuestions,
  ];
}

function buildReferenceTrail(references: LessonReferenceAsset[]): string {
  return references
    .map(reference => `- ${reference.title} (${reference.source})`)
    .join('\n');
}

function buildWorkflowBody(visualKey: LessonVisualKey, engines: string[], machineFocus: string[]): string {
  const focusMap: Record<LessonVisualKey, string> = {
    'shop-math': 'Start with a sketch, annotate the known dimensions, then solve the unknowns before you touch CAM or offsets. Turn the result into a quick setup card the operator can use at the machine.',
    'tool-anatomy': 'Walk the setup from spindle taper to cutting edge. Confirm reach, gauge length, holder style, stickout, and how chip evacuation changes with flute geometry and coating.',
    inspection: 'Translate the print into datums, checkpoints, and in-process measurements. Decide what gets checked at setup, what gets checked mid-cycle, and what requires final verification.',
    workholding: 'Lay out the part restraint plan before programming. Decide the locating faces, clamping direction, jaw/fixture style, and what surfaces need to stay free for tool access.',
    'gcode-motion': 'Read the path as machine behavior, not as text. Check modal states, work offsets, tool length calls, approach moves, and where the code becomes dangerous if the machine state is wrong.',
    'chip-load': 'Treat the parameter stack as a linked system: chip load, radial engagement, spindle power, holder rigidity, coolant, and tool life all need to agree before the cut is trusted.',
    'milling-strategy': 'Break the work into stock removal, semi-finishing, finishing, entry, and exit logic. Match each cut to the machine, tool reach, workholding, and tolerance requirement.',
    'turning-geometry': 'Sequence the lathe work by support condition. Plan how facing, roughing, grooving, threading, boring, and cutoff affect rigidity and access at each stage.',
    'material-behavior': 'Rebuild the setup around the alloy: chip shape, heat flow, work hardening, and coating choice should all change the way the cut is approached.',
    multiaxis: 'Map the part, tool axis, and machine kinematics together. Decide where indexed motion works, where simultaneous motion earns its keep, and how RTCP or singularity risk changes the plan.',
    'process-control': 'Define what you will watch during the job: force, wear, vibration, thermal drift, quality spread, and cost. Then decide what action should happen when the signal moves.',
    'cam-systems': 'Translate the same manufacturing intent across tool libraries, stock models, templates, simulation, and post settings so the platform does not erase the strategy.',
    economics: 'Follow the job from setup to shipment. Convert technical choices into cycle time, tooling cost, scrap risk, and margin so the process can be defended to the shop.',
    safety: 'Run the setup like a risk review: part restraint, offset sanity, spindle/tool state, rapid clearance, and machine-specific hazards all get checked before motion becomes real.',
  };

  const engineLine = engines.length > 0
    ? `\n\nUse the PRISM engine stack here as a lab assistant: ${engines.join(', ')}.`
    : '';
  const machineLine = machineFocus.length > 0
    ? `\n\nMachine focus for this drill: ${machineFocus.join(', ')}.`
    : '';

  return `# Machine-Room Workflow\n\n${focusMap[visualKey]}${engineLine}${machineLine}\n\n## Practical sequence\n1. Define the process goal.\n2. Identify the setup constraints.\n3. Pick the toolpath, tooling, and machine behaviors that actually fit.\n4. Document what must be verified before the first part is trusted.\n\n## Shop drill\nTurn this topic into a setup review you could hand to an operator or programmer on a real job.`;
}

function buildValidationBody(visualKey: LessonVisualKey, references: LessonReferenceAsset[], capstone: string): string {
  const watchoutsMap: Record<LessonVisualKey, string[]> = {
    'shop-math': ['Unit mix-ups', 'Wrong trigonometric assumption', 'Blindly trusting coordinates without sanity checks'],
    'tool-anatomy': ['Excessive stickout', 'Wrong holder for the cut', 'Ignoring chip evacuation or coating mismatch'],
    inspection: ['Measuring from the wrong datum', 'Checking the wrong feature first', 'Missing tolerance intent'],
    workholding: ['Over-clamping thin walls', 'Blocking tool access', 'Failing to constrain all needed degrees of freedom'],
    'gcode-motion': ['Modal state drift', 'Unsafe rapids', 'Offsets or compensation not matching machine state'],
    'chip-load': ['Rubbing from going too light', 'Overload from ignoring engagement', 'Copying a table without machine context'],
    'milling-strategy': ['Wrong entry/exit logic', 'Using one path style for every cut', 'Ignoring remaining stock and finish needs'],
    'turning-geometry': ['Sequencing into a trapped condition', 'Poor support near cutoff', 'Unsafe boring/threading assumptions'],
    'material-behavior': ['Treating alloys like generic metal', 'Ignoring heat flow', 'Missing work hardening or BUE risk'],
    multiaxis: ['Ignoring kinematic limits', 'Assuming RTCP fixes everything', 'Failing to plan for singularities or collisions'],
    'process-control': ['Changing too many variables at once', 'Reading one good part as process proof', 'Ignoring variation over time'],
    'cam-systems': ['Confusing software workflow with process truth', 'Assuming posts are equivalent', 'Losing manufacturing intent between platforms'],
    economics: ['Quoting from bad technical assumptions', 'Ignoring setup/scrap realities', 'Counting cycle time without risk'],
    safety: ['Trusting the first output too early', 'Skipping setup checks', 'Treating warnings as optional'],
  };

  return `# Failure Modes & Verification\n\n## What usually goes wrong\n${watchoutsMap[visualKey].map(item => `- ${item}`).join('\n')}\n\n## Review trail\n${buildReferenceTrail(references)}\n\n## Capstone transfer\nUse this lesson to strengthen the course capstone:\n- ${capstone}\n\n## Final coaching prompt\nBefore marking this topic mastered, explain how you would verify it on a real job and what evidence would convince you the process is safe and repeatable.`;
}

function buildQuestionBundle(questionPool: CourseQuestion[], seed: string, authoredCount: number) {
  const rotated = rotate(questionPool, seed);
  return {
    checkpoint_questions: rotated.slice(0, 2),
    final_test: rotated.slice(0, Math.max(4, authoredCount > 0 ? 5 : 4)),
  };
}

function createLesson(
  seed: string,
  title: string,
  duration_min: number,
  summary: string,
  sections: LessonSection[],
  formulas: string[],
  engines: string[],
  questionPool: CourseQuestion[],
  authoredCount: number,
  passing_score: number,
  visual_key: LessonVisualKey,
  references: LessonReferenceAsset[],
  media_cards: LessonMediaCard[],
  lab_brief: LessonLabBrief,
): CourseLesson {
  const bundle = buildQuestionBundle(questionPool, seed, authoredCount);
  return {
    id: seed,
    title,
    duration_min,
    summary,
    sections,
    key_formulas: formulas,
    engine_links: engines,
    checkpoint_questions: bundle.checkpoint_questions,
    final_test: bundle.final_test,
    passing_score,
    visual_key,
    reference_assets: references,
    media_cards,
    lab_brief,
    quiz_questions: bundle.checkpoint_questions.length + bundle.final_test.length,
  };
}

function moduleToLessons(module: SourceModule, blueprint: CourseBlueprint): CourseLesson[] {
  const sections: LessonSection[] = [];
  const formulaSet = new Set<string>();
  const engineSet = new Set<string>();

  module.lessons.forEach((lesson, lessonIndex) => {
    (lesson.keyFormulas ?? []).forEach(formula => formulaSet.add(formula));
    (lesson.prismEngines ?? []).forEach(engine => engineSet.add(engine));

    lesson.content.forEach((block, blockIndex) => {
      if (block.type === 'calculator') {
        const engine = block.calculatorConfig?.engine;
        if (engine) engineSet.add(engine);
        sections.push({
          id: `${lesson.id}-calc-${blockIndex}`,
          type: 'calculator',
          title: sectionTitle(block, 'Interactive Practice'),
          engine,
          inputFields: block.calculatorConfig?.inputFields ?? [],
          outputFields: block.calculatorConfig?.outputFields ?? [],
        });
        return;
      }

      if (block.type === 'text' && block.body) {
        sections.push({
          id: `${lesson.id}-text-${blockIndex}`,
          type: 'text',
          title: sectionTitle(block, lessonIndex === 0 && blockIndex === 0 ? 'Lesson Brief' : 'Deep Dive'),
          body: block.body.trim(),
        });
      }
    });
  });

  const firstBody = sections.find(section => section.type === 'text')?.body ?? '';
  const formulas = Array.from(formulaSet);
  const engines = Array.from(engineSet);
  const visual_key = deriveVisualKey(module, formulas, engines);
  const authoredQuestions = normalizeSourceQuestions(module);
  const generatedQuestions = buildGeneratedQuestions(
    module,
    visual_key,
    module.description || summarize(firstBody, module.title),
    formulas,
    engines,
  );
  const questionPool = [...authoredQuestions, ...generatedQuestions];
  const passing_score = Math.max(module.quiz?.passingScore ?? 75, 70);
  const references = REFERENCE_PACKS[visual_key];
  const media_cards = buildMediaCards(module, visual_key, references);
  const lab_brief = buildLabBrief(module, visual_key, blueprint, engines);
  const summary = module.description || summarize(firstBody, module.title);

  if (blueprint.expansionMode !== 'deep') {
    return [
      createLesson(
        module.id,
        module.title,
        module.estimatedMinutes,
        summary,
        sections,
        formulas,
        engines,
        questionPool,
        authoredQuestions.length,
        passing_score,
        visual_key,
        references,
        media_cards,
        lab_brief,
      ),
    ];
  }

  const conceptSections = [
    ...sections,
    {
      id: `${module.id}-concept-bridge`,
      type: 'text' as const,
      title: 'Why This Matters In Real Shops',
      body: `This topic belongs in the ${blueprint.title} track because it changes how a real shop plans work, protects machine time, and defends the process when tolerances, tooling, or delivery pressure get tighter.\n\nTie the concept back to ${blueprint.capstone.toLowerCase()}`,
    },
  ];

  const workflowSections: LessonSection[] = [
    {
      id: `${module.id}-workflow-1`,
      type: 'text',
      title: 'Machine-Room Workflow',
      body: buildWorkflowBody(visual_key, engines, blueprint.machine_focus),
    },
    {
      id: `${module.id}-workflow-2`,
      type: 'text',
      title: 'Lab Prompt',
      body: `Use this lesson like a supervised practice lab.\n\n- Explain the setup in your own words.\n- Decide what the machine, tooling, and process need.\n- Write down what you would verify before cutting a first part.\n- Compare your reasoning against the lesson visual and the PRISM engine links.`,
    },
  ];

  const validationSections: LessonSection[] = [
    {
      id: `${module.id}-validation-1`,
      type: 'text',
      title: 'Failure Modes & Recovery',
      body: buildValidationBody(visual_key, references, blueprint.capstone),
    },
    {
      id: `${module.id}-validation-2`,
      type: 'text',
      title: 'Certification Review',
      body: `For mastery on this topic, the learner should be able to teach it back, defend it on a setup sheet, and explain how they would keep the job safe, repeatable, and profitable under production pressure.`,
    },
  ];

  return [
    createLesson(
      `${module.id}-foundations`,
      `${module.title} Foundations`,
      Math.max(20, Math.round(module.estimatedMinutes * 0.7)),
      `${summary} Start with the mental model, core vocabulary, and the big process purpose.`,
      conceptSections,
      formulas,
      engines,
      questionPool,
      authoredQuestions.length,
      passing_score,
      visual_key,
      references,
      media_cards,
      lab_brief,
    ),
    createLesson(
      `${module.id}-workflow`,
      `${module.title} Workflow Lab`,
      Math.max(18, Math.round(module.estimatedMinutes * 0.6)),
      `Turn ${module.title.toLowerCase()} into a repeatable machine-room workflow instead of a theory-only topic.`,
      workflowSections,
      formulas,
      engines,
      questionPool,
      authoredQuestions.length,
      passing_score,
      visual_key,
      references,
      media_cards,
      lab_brief,
    ),
    createLesson(
      `${module.id}-verification`,
      `${module.title} Verification & Failure Review`,
      Math.max(16, Math.round(module.estimatedMinutes * 0.55)),
      `Pressure-test ${module.title.toLowerCase()} against real failure patterns, verification rules, and capstone-level expectations.`,
      validationSections,
      formulas,
      engines,
      questionPool,
      authoredQuestions.length,
      passing_score,
      visual_key,
      references,
      media_cards,
      lab_brief,
    ),
  ];
}

const COURSE_BLUEPRINTS: CourseBlueprint[] = [
  {
    id: 'course-0a',
    title: 'Shop Math for Machinists',
    subtitle: 'Math that actually gets used at the machine',
    description: 'Decimals, fractions, geometry, trig, and shop calculations for people starting from zero.',
    level: 'L0',
    domain: 'Foundations',
    programId: 'foundations',
    prerequisites: [],
    icon: '🧮',
    role_outcome: 'Can calculate coordinates, dimensions, feeds, speeds, and setup values without guessing.',
    mastery_outcomes: ['Read formulas without panic', 'Use trig for angles and bolt circles', 'Handle tolerance math on the floor'],
    capstone: 'Calculate a complete bolt-circle and offset plan for a first milling setup.',
    machine_focus: ['Mill', 'Lathe', 'Inspection'],
    sourceModules: COURSE_0A_MODULES as SourceModule[],
  },
  {
    id: 'course-0b',
    title: 'Hand Tools, Metrology & Inspection',
    subtitle: 'Learn how the shop measures reality',
    description: 'Hand tools, precision measurement, tool care, and inspection habits that keep setups honest.',
    level: 'L0',
    domain: 'Foundations',
    programId: 'foundations',
    prerequisites: [],
    icon: '📏',
    role_outcome: 'Can select, use, and care for the basic inspection and setup tools found in a modern machine shop.',
    mastery_outcomes: ['Measure parts correctly', 'Choose the right gauge for the job', 'Document results in a repeatable way'],
    capstone: 'Inspect a simple machined part and produce a clean first-article measurement record.',
    machine_focus: ['Inspection', 'Setup benches', 'General shop'],
    sourceModules: COURSE_0B_MODULES as SourceModule[],
  },
  {
    id: 'course-0c',
    title: 'Blueprint Reading & GD&T Foundations',
    subtitle: 'From drawings to manufacturable intent',
    description: 'Interpret engineering drawings, dimensions, datums, tolerances, and the intent behind the print.',
    level: 'L0',
    domain: 'Foundations',
    programId: 'foundations',
    prerequisites: ['course-0a'],
    icon: '📐',
    role_outcome: 'Can translate part drawings into setup decisions, inspection strategy, and process order.',
    mastery_outcomes: ['Read title blocks and notes', 'Understand datums and tolerance stacks', 'Spot critical-to-function features early'],
    capstone: 'Create a datum and inspection plan for a multi-operation bracket from its print package.',
    machine_focus: ['Milling', 'Turning', 'Inspection'],
    sourceModules: COURSE_0C_MODULES as SourceModule[],
  },
  {
    id: 'course-1',
    title: 'Manufacturing Fundamentals',
    subtitle: 'The novice-to-operator launch course',
    description: 'Machine types, coordinates, tooling, materials, workholding, coolant, finish, tolerance, and shop safety.',
    level: 'L0',
    domain: 'Foundations',
    programId: 'foundations',
    prerequisites: ['course-0a', 'course-0b', 'course-0c'],
    icon: '🏭',
    role_outcome: 'Can walk onto a shop floor and understand what the machines, tools, materials, and process documents are telling them.',
    mastery_outcomes: ['Know the major machine families', 'Understand tool anatomy and material groups', 'Follow safer shop habits from day one'],
    capstone: 'Plan the full first setup for a beginner-friendly CNC part, including material, tool, and fixture choices.',
    machine_focus: ['VMC', 'Lathe', '5-axis overview', 'EDM'],
    sourceModules: COURSE_1_MODULES as SourceModule[],
  },
  {
    id: 'course-7',
    title: 'Material Science for Machinists',
    subtitle: 'Make process decisions from material behavior',
    description: 'Steel, aluminum, stainless, titanium, superalloys, composites, and the physics that change cutting strategy.',
    level: 'L1',
    domain: 'Machining',
    programId: 'operator-core',
    prerequisites: ['course-1'],
    icon: '🧱',
    role_outcome: 'Can recognize how material family changes tool selection, coolant, speeds/feeds, chip behavior, and risk.',
    mastery_outcomes: ['Match material to ISO group', 'Predict chip control and heat problems', 'Choose safer starting conditions for difficult alloys'],
    capstone: 'Build a material-based machining strategy matrix for steel, aluminum, stainless, titanium, and Inconel.',
    machine_focus: ['Mill', 'Lathe', 'General process planning'],
    sourceModules: COURSE_7_MODULES as SourceModule[],
    expansionMode: 'deep',
  },
  {
    id: 'course-2',
    title: 'Speed & Feed Mastery',
    subtitle: 'Physics-first parameter building',
    description: 'Chip load, Kienzle force, Taylor tool life, chip thinning, deflection, stability, and full parameter walkthroughs.',
    level: 'L1',
    domain: 'Programming',
    programId: 'operator-core',
    prerequisites: ['course-1', 'course-7'],
    icon: '⚡',
    role_outcome: 'Can calculate and defend cutting parameters instead of copying tables blindly.',
    mastery_outcomes: ['Build feeds/speeds from formulas', 'Explain force and tool-life tradeoffs', 'Adjust for chip thinning, deflection, and chatter risk'],
    capstone: 'Parameterize a roughing and finishing plan for steel, aluminum, and stainless on different spindle limits.',
    machine_focus: ['Mill', 'Lathe', 'Speed/feed calculators'],
    sourceModules: COURSE_2_MODULES as SourceModule[],
    expansionMode: 'deep',
  },
  {
    id: 'course-3',
    title: 'G-Code Programming',
    subtitle: 'Read, write, and debug real programs',
    description: 'Program structure, motion commands, canned cycles, offsets, tool changes, compensation, subprograms, and code review.',
    level: 'L1',
    domain: 'Programming',
    programId: 'operator-core',
    prerequisites: ['course-1'],
    icon: '💻',
    role_outcome: 'Can read and write practical CNC code, catch dangerous mistakes, and understand what CAM posts are emitting.',
    mastery_outcomes: ['Understand the meaning of every major block', 'Program safer tool changes and drilling cycles', 'Debug common offset and compensation failures'],
    capstone: 'Write and validate a complete milling program for a simple prismatic part with drilling, pocketing, and contouring.',
    machine_focus: ['Fanuc-style mills', 'Lathe code basics', 'Post output review'],
    sourceModules: COURSE_3_MODULES as SourceModule[],
    expansionMode: 'deep',
  },
  {
    id: 'course-4',
    title: 'Milling Operations',
    subtitle: 'From face milling to advanced finishing strategy',
    description: 'Core 2D and 2.5D milling operations, toolpath strategy, entry methods, finishing logic, and higher-speed milling concepts.',
    level: 'L1',
    domain: 'Machining',
    programId: 'operator-core',
    prerequisites: ['course-2', 'course-3', 'course-7'],
    icon: '🌀',
    role_outcome: 'Can choose and sequence milling operations with better awareness of rigidity, finish, tool engagement, and toolpath style.',
    mastery_outcomes: ['Rough and finish pockets intentionally', 'Choose the right entry and exit strategy', 'Recognize when HSM or adaptive paths beat conventional cuts'],
    capstone: 'Develop a complete milling process plan for a 3-op bracket including roughing, finishing, drilling, and deburring.',
    machine_focus: ['3-axis mill', '2.5D toolpaths', 'HSM concepts'],
    sourceModules: COURSE_4_MODULES as SourceModule[],
    expansionMode: 'deep',
  },
  {
    id: 'course-5',
    title: 'Turning Operations',
    subtitle: 'Lathe thinking from first cuts to production sequencing',
    description: 'Roughing, finishing, facing, grooving, parting, threading, boring, drilling, and lathe process planning.',
    level: 'L1',
    domain: 'Machining',
    programId: 'operator-core',
    prerequisites: ['course-2', 'course-3', 'course-7'],
    icon: '🛞',
    role_outcome: 'Can program and troubleshoot core lathe work with better understanding of geometry, tool nose comp, and safe sequencing.',
    mastery_outcomes: ['Choose turning inserts and cycles appropriately', 'Sequence turning work without painting into a corner', 'Protect parting, threading, and boring operations from common failures'],
    capstone: 'Create a production-ready turning sequence for a shaft with OD, ID, groove, thread, and cutoff operations.',
    machine_focus: ['2-axis lathe', 'Live-tool overview', 'Boring and threading'],
    sourceModules: COURSE_5_MODULES as SourceModule[],
    expansionMode: 'deep',
  },
  {
    id: 'course-10',
    title: 'Troubleshooting Playbook',
    subtitle: 'Diagnose failure instead of guessing',
    description: 'Chatter, finish issues, tool breakage, dimensional drift, chip evacuation, coolant failures, crashes, alarms, and post issues.',
    level: 'L2',
    domain: 'Optimization',
    programId: 'operator-core',
    prerequisites: ['course-4', 'course-5'],
    icon: '🩺',
    role_outcome: 'Can diagnose recurring machining failures systematically and recover faster without random parameter thrashing.',
    mastery_outcomes: ['Separate chatter from other vibration', 'Trace poor finish to the real cause', 'Turn production problems into repeatable fixes'],
    capstone: 'Run a root-cause review on a bad part family and propose corrective actions across tooling, setup, code, and machine state.',
    machine_focus: ['Mill', 'Lathe', 'Shop-floor recovery'],
    sourceModules: COURSE_10_MODULES as SourceModule[],
    expansionMode: 'deep',
  },
  {
    id: 'course-6',
    title: 'CAM System Mastery',
    subtitle: 'Cross-platform CAM fluency instead of tool-specific tunnel vision',
    description: 'Mastercam, hyperMILL, Fusion, NX, PowerMill, ESPRIT, and other CAM ecosystems with their strengths and traps.',
    level: 'L2',
    domain: 'Programming',
    programId: 'programming-master',
    prerequisites: ['course-3', 'course-4', 'course-5'],
    icon: '🖥️',
    role_outcome: 'Can translate intent between CAM systems and understand how platform differences affect strategy, automation, and post behavior.',
    mastery_outcomes: ['Compare CAM systems intelligently', 'Carry strategy across vendors instead of memorizing menus', 'Spot where a given platform is strongest for mills, lathes, Swiss, or 5-axis'],
    capstone: 'Map one part family across at least three CAM systems and document how you would standardize templates and posts.',
    machine_focus: ['3-axis', 'Mill-turn', 'Swiss', '5-axis CAM suites'],
    sourceModules: COURSE_6_MODULES as SourceModule[],
    expansionMode: 'deep',
  },
  {
    id: 'course-8',
    title: '5-Axis Machining Mastery',
    subtitle: 'Indexed to simultaneous motion with real strategy depth',
    description: '3+2 versus simultaneous, lead/lag/tilt, TCPC/RTCP, singularities, collision avoidance, port work, impellers, and 5-axis posts.',
    level: 'L3',
    domain: 'Machining',
    programId: 'programming-master',
    prerequisites: ['course-4', 'course-5', 'course-6'],
    icon: '🔮',
    role_outcome: 'Can reason through 5-axis process design, tool orientation, post behavior, and machine constraints with far more depth than a generic CAM user.',
    mastery_outcomes: ['Choose 3+2 versus simultaneous intentionally', 'Understand RTCP/TCPC and singularity risk', 'Plan collision-safe multi-axis strategies for ports, blades, and complex geometry'],
    capstone: 'Develop a full 5-axis process plan for a turbine-style component including orientation, collision checks, and post requirements.',
    machine_focus: ['3+2', 'Simultaneous 5-axis', 'Port machining', 'Impellers'],
    sourceModules: COURSE_8_MODULES as SourceModule[],
    expansionMode: 'deep',
  },
  {
    id: 'course-9',
    title: 'Process Optimization & Analytics',
    subtitle: 'Make the process measurable, not mystical',
    description: 'Monte Carlo force analysis, DOE, capability, wear prediction, thermal error, vibration, energy, and cost optimization.',
    level: 'L3',
    domain: 'Optimization',
    programId: 'programming-master',
    prerequisites: ['course-2', 'course-4', 'course-5', 'course-8'],
    icon: '📈',
    role_outcome: 'Can optimize a process with evidence, quantify risk, and balance quality, time, cost, and machine limits.',
    mastery_outcomes: ['Use statistics and simulations instead of gut feel', 'Model variability and capacity risk', 'Optimize for more than just spindle load or cycle time'],
    capstone: 'Run an optimization review for a complex family of parts and propose changes with measurable ROI and risk bounds.',
    machine_focus: ['Mill', 'Lathe', '5-axis', 'Production analytics'],
    sourceModules: COURSE_9_MODULES as SourceModule[],
    expansionMode: 'deep',
  },
  {
    id: 'course-11',
    title: 'Shop Economics & Quoting',
    subtitle: 'Connect process choices to money',
    description: 'Cost per part, quoting, make-vs-buy, ROI on tooling, scrap economics, and batch strategy.',
    level: 'L2',
    domain: 'Business',
    programId: 'leadership',
    prerequisites: ['course-4', 'course-5'],
    icon: '💰',
    role_outcome: 'Can explain why a process plan is profitable or not, and communicate the tradeoffs to owners and customers.',
    mastery_outcomes: ['Break down cost honestly', 'Quote from better technical assumptions', 'Evaluate upgrades and process changes with ROI logic'],
    capstone: 'Quote a small family of machined parts with setup, tooling, scrap, and machine-rate assumptions defended in writing.',
    machine_focus: ['Quoting', 'ERP handoff', 'Capacity planning'],
    sourceModules: COURSE_11_MODULES as SourceModule[],
    expansionMode: 'deep',
  },
  {
    id: 'course-12',
    title: 'Career & Leadership Growth',
    subtitle: 'Turn technical mastery into a long-term role',
    description: 'Career paths, portfolio building, interviewing, and continuous learning for machinists and programmers.',
    level: 'L2',
    domain: 'Business',
    programId: 'leadership',
    prerequisites: ['course-6', 'course-8', 'course-11'],
    icon: '🧭',
    role_outcome: 'Can document experience, show value, and keep growing from operator toward programmer, engineer, or shop leadership.',
    mastery_outcomes: ['Frame achievements in business terms', 'Build a credible programming portfolio', 'Plan a continuing education path instead of plateauing'],
    capstone: 'Assemble a personal development plan that links your technical strengths to the role you want next.',
    machine_focus: ['Career development', 'Leadership', 'Continuous learning'],
    sourceModules: COURSE_12_MODULES as SourceModule[],
    expansionMode: 'deep',
  },
];

function buildCourse(blueprint: CourseBlueprint): Course {
  const lessons = blueprint.sourceModules.flatMap(module => moduleToLessons(module, blueprint));
  const duration_min = lessons.reduce((sum, lesson) => sum + lesson.duration_min, 0);
  return {
    ...blueprint,
    duration_min,
    lessons,
  };
}

export const ALL_COURSES: Course[] = COURSE_BLUEPRINTS.map(buildCourse);

export const ACADEMY_PROGRAMS: AcademyProgram[] = PROGRAM_META.map(program => ({
  ...program,
  courseIds: ALL_COURSES
    .filter(course => course.programId === program.id)
    .map(course => course.id),
}));

export const COURSES_BY_LEVEL: Record<CourseLevel, Course[]> = {
  L0: ALL_COURSES.filter(course => course.level === 'L0'),
  L1: ALL_COURSES.filter(course => course.level === 'L1'),
  L2: ALL_COURSES.filter(course => course.level === 'L2'),
  L3: ALL_COURSES.filter(course => course.level === 'L3'),
};

export function getCoursesByDomain(domain: CourseDomain): Course[] {
  return ALL_COURSES.filter(course => course.domain === domain);
}

export function getProgramById(id: ProgramId): AcademyProgram | undefined {
  return ACADEMY_PROGRAMS.find(program => program.id === id);
}

export function getTrackById(id: SpecializationTrackId): SpecializationTrack | undefined {
  return SPECIALIZATION_TRACKS.find(track => track.id === id);
}

export function getTracksForCourse(courseId: string): SpecializationTrack[] {
  return SPECIALIZATION_TRACKS.filter(track => track.courseIds.includes(courseId) || track.electiveCourseIds.includes(courseId));
}

export function getCourseById(id: string): Course | undefined {
  return ALL_COURSES.find(course => course.id === id);
}

export function getLessonById(lessonId: string): CourseLesson | undefined {
  for (const course of ALL_COURSES) {
    const found = course.lessons.find(lesson => lesson.id === lessonId);
    if (found) return found;
  }
  return undefined;
}

export function getCourseForLesson(lessonId: string): Course | undefined {
  return ALL_COURSES.find(course => course.lessons.some(lesson => lesson.id === lessonId));
}

export function arePrerequisitesMet(courseId: string, completedIds: Set<string>): boolean {
  const course = getCourseById(courseId);
  if (!course) return false;
  return course.prerequisites.every(prerequisite => completedIds.has(prerequisite));
}

export function getAvailableCourses(completedIds: Set<string>): Course[] {
  return ALL_COURSES.filter(course =>
    !completedIds.has(course.id) && arePrerequisitesMet(course.id, completedIds)
  );
}

export const TOTAL_LESSONS = ALL_COURSES.reduce((sum, course) => sum + course.lessons.length, 0);
export const TOTAL_DURATION_MIN = ALL_COURSES.reduce((sum, course) => sum + course.duration_min, 0);
