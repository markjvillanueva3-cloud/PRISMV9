/**
 * PRISM MCP Server — Post Download Engine (PP-MS4 U-PP21)
 *
 * Packages generated G-code for controller-native download.
 * Supports: .nc (standard/Haas), .tap (Fanuc), .mpf (Siemens),
 *           .h (Heidenhain), .eia (generic ISO).
 *
 * Features:
 *   - Controller-specific header/footer framing
 *   - Inline physics comment injection (force, confidence, Ra per block)
 *   - Metadata header: machine, controller, CAM, PRISM version, generation date
 *   - Setup sheet text generation
 *   - Multi-file manifest (G-code + setup sheet + validation report)
 *
 * Distinct from PostLibraryConfiguratorEngine.export_post which handles
 * configuration-based export with tier/aggressiveness settings. This engine
 * focuses on packaging already-generated G-code with physics annotations
 * for end-user download from the PPG UI.
 *
 * References:
 *   - ISO 6983 (G-code standard)
 *   - Siemens SINUMERIK programming guide (MPF format)
 *   - Heidenhain TNC 640 programming manual (.h format, ; comments)
 */

// ─── Types ──────────────────────────────────────────────────────────

type ControllerFormat = 'nc' | 'tap' | 'mpf' | 'h' | 'eia';

interface PhysicsBlock {
  /** 0-based line index in the G-code. */
  line: number;
  force_N?: number;
  power_kW?: number;
  confidence?: number;
  predicted_Ra_um?: number;
  note?: string;
}

interface DownloadInput {
  action: 'format_download' | 'setup_sheet' | 'manifest';
  gcode: string;
  format?: ControllerFormat;
  controller: string;
  machine_brand?: string;
  machine_model?: string;
  cam_system?: string;
  program_name?: string;
  physics_blocks?: PhysicsBlock[];
  include_physics_comments?: boolean;
  validation_summary?: string;
}

interface DownloadResult {
  content: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  format: string;
  warnings: string[];
}

interface ManifestResult {
  files: Array<{ filename: string; content: string; mime_type: string; size_bytes: number; warnings?: string[] }>;
  total_size_bytes: number;
  warnings: string[];
}

type EngineAction = 'format_download' | 'setup_sheet' | 'manifest';

// ─── Format Configuration ───────────────────────────────────────────

const FORMAT_CONFIG: Record<ControllerFormat, {
  extension: string;
  mime: string;
  commentStart: string;
  commentEnd: string;
  programStart: (name: string) => string;
  programEnd: string;
}> = {
  nc: {
    extension: '.nc',
    mime: 'application/x-gcode',
    commentStart: '(',
    commentEnd: ')',
    programStart: (name) => `%\nO${deriveProgramNumber(name)} (${name})`,
    programEnd: 'M30\n%',
  },
  tap: {
    extension: '.tap',
    mime: 'application/x-gcode',
    commentStart: '(',
    commentEnd: ')',
    programStart: (name) => `%\nO${deriveProgramNumber(name)} (${name})`,
    programEnd: 'M30\n%',
  },
  mpf: {
    extension: '.mpf',
    mime: 'application/x-sinumerik',
    commentStart: '; ',
    commentEnd: '',
    programStart: (name) => `%_N_${sanitizeFilename(name)}_MPF`,
    programEnd: 'M30\n%_N_END',
  },
  h: {
    extension: '.h',
    mime: 'application/x-heidenhain',
    commentStart: '; ',
    commentEnd: '',
    programStart: (name) => `BEGIN PGM ${sanitizeFilename(name)} MM`,
    programEnd: 'M30\nEND PGM',
  },
  eia: {
    extension: '.eia',
    mime: 'application/x-gcode',
    commentStart: '(',
    commentEnd: ')',
    programStart: (name) => `%\n(${name})`,
    programEnd: 'M30\n%',
  },
};

// ─── Controller → Format Mapping ────────────────────────────────────

/** Maps controller_family values to their native file format. */
const CONTROLLER_FORMAT_MAP: Record<string, ControllerFormat> = {
  haas_ngc: 'nc',
  fanuc_31i: 'tap',
  fanuc_0i: 'tap',
  generic_fanuc: 'tap',
  doosan_fanuc: 'tap',
  brother_speedio: 'nc',
  siemens_840d: 'mpf',
  dmg_celos_siemens: 'mpf',
  heidenhain_tnc640: 'h',
  heidenhain_tnc7: 'h',
  mazak_smooth_ai: 'eia',
  okuma_osp_p300: 'nc',
  hurco_max5: 'nc',
  citizen_cincom: 'nc',
  star_fanuc: 'tap',
  dmg_celos_fanuc: 'nc',
  mitsubishi_m80: 'nc',
  fagor_8065: 'nc',
  generic_iso: 'eia',
};

// ─── Helpers ────────────────────────────────────────────────────────

function sanitizeFilename(name: string): string {
  return name.replace(/[^A-Za-z0-9_]/g, '_').toUpperCase();
}

/**
 * Derives a 4-digit program number (0001–9999) from a program name using
 * a simple hash. Avoids 0000 so controllers that treat O0000 as special
 * (Fanuc "search all" on some models) won't collide.
 */
function deriveProgramNumber(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = ((hash << 5) - hash + name.charCodeAt(i)) | 0;
  }
  const num = (Math.abs(hash) % 9999) + 1; // 1–9999, never 0000
  return String(num).padStart(4, '0');
}

/**
 * Checks whether a G-code body contains ISO-style motion commands (G0/G1
 * with X/Y/Z coordinates). Used to warn when ISO code is wrapped in a
 * Heidenhain conversational program header.
 */
function containsIsoMotion(gcode: string): boolean {
  // Match lines like G0 X... , G1 Y... , G00 Z... , G01 X... etc.
  return /\bG0?[01]\b.*[XYZ]/im.test(gcode);
}

function makeComment(text: string, format: ControllerFormat): string {
  const cfg = FORMAT_CONFIG[format];
  return `${cfg.commentStart}${text}${cfg.commentEnd}`;
}

function buildHeader(
  input: DownloadInput,
  format: ControllerFormat,
): string {
  const lines: string[] = [];
  const c = (txt: string) => makeComment(txt, format);

  lines.push(c('PRISM Physics-Optimized G-code'));
  lines.push(c(`Generated: ${new Date().toISOString().split('T')[0]}`));
  if (input.machine_brand || input.machine_model) {
    lines.push(c(`Machine: ${input.machine_brand ?? ''} ${input.machine_model ?? ''}`.trim()));
  }
  lines.push(c(`Controller: ${input.controller}`));
  if (input.cam_system) lines.push(c(`CAM: ${input.cam_system}`));
  lines.push(c(`Format: ${format.toUpperCase()} (${FORMAT_CONFIG[format].extension})`));
  lines.push(c('PRISM MCP Server v8.2'));
  lines.push('');
  return lines.join('\n');
}

function injectPhysicsComments(
  gcodeLines: string[],
  physicsBlocks: PhysicsBlock[],
  format: ControllerFormat,
): string[] {
  if (physicsBlocks.length === 0) return gcodeLines;

  const blockMap = new Map<number, PhysicsBlock>();
  for (const b of physicsBlocks) blockMap.set(b.line, b);

  return gcodeLines.map((line, i) => {
    const b = blockMap.get(i);
    if (!b) return line;

    const parts: string[] = [];
    if (b.force_N !== undefined) parts.push(`Fc=${b.force_N.toFixed(0)}N`);
    if (b.power_kW !== undefined) parts.push(`P=${b.power_kW.toFixed(2)}kW`);
    if (b.predicted_Ra_um !== undefined) parts.push(`Ra=${b.predicted_Ra_um.toFixed(2)}um`);
    if (b.confidence !== undefined) parts.push(`conf=${Math.round(b.confidence * 100)}%`);
    if (b.note) parts.push(b.note);
    if (parts.length === 0) return line;

    const annotation = makeComment(`PRISM: ${parts.join(' ')}`, format);
    return `${line}  ${annotation}`;
  });
}

// ─── Actions ────────────────────────────────────────────────────────

function validateInput(input: DownloadInput): string[] {
  const warnings: string[] = [];
  if (!input.gcode || input.gcode.trim().length === 0) {
    warnings.push('Empty G-code input — output will contain only header/footer.');
  }
  if (!input.controller) {
    warnings.push('No controller specified — defaulting to generic NC format.');
  }
  if (input.controller && !CONTROLLER_FORMAT_MAP[input.controller] && !input.format) {
    warnings.push(`Unknown controller "${input.controller}" — defaulting to .nc format.`);
  }
  if (input.gcode && input.gcode.split('\n').length > 50000) {
    warnings.push('Program exceeds 50,000 lines — download may be slow.');
  }
  if (input.physics_blocks?.some((b) => b.line < 0)) {
    warnings.push('Physics block references negative line index — annotation skipped.');
  }
  if (input.physics_blocks?.some((b) => b.force_N !== undefined && b.force_N < 0)) {
    warnings.push('Negative cutting force detected in physics block — verify input data.');
  }
  return warnings;
}

function formatDownload(input: DownloadInput): DownloadResult {
  const warnings = validateInput(input);
  const format: ControllerFormat =
    input.format ?? CONTROLLER_FORMAT_MAP[input.controller] ?? 'nc';
  const cfg = FORMAT_CONFIG[format];
  const programName = input.program_name ?? 'PRISM_PROGRAM';

  // Heidenhain TNC controllers expect conversational syntax, not ISO G-code.
  // Warn the operator if we are wrapping ISO-style moves in a .h program.
  if (format === 'h' && input.gcode && containsIsoMotion(input.gcode)) {
    warnings.push(
      'Warning: G-code body is ISO format, not Heidenhain conversational. ' +
      'TNC controllers may reject this program.',
    );
  }

  const gcodeLines = input.gcode.split('\n');
  const annotated =
    input.include_physics_comments !== false && input.physics_blocks?.length
      ? injectPhysicsComments(gcodeLines, input.physics_blocks, format)
      : gcodeLines;

  const header = buildHeader(input, format);
  const programStart = cfg.programStart(programName);
  const body = annotated.join('\n');

  const content = [programStart, header, body, '', cfg.programEnd, ''].join('\n');
  const slug = sanitizeFilename(
    `${input.machine_brand ?? 'PRISM'}_${input.machine_model ?? programName}`,
  );
  const filename = `${slug}${cfg.extension}`;
  const size_bytes = new TextEncoder().encode(content).length;

  return {
    content,
    filename,
    mime_type: cfg.mime,
    size_bytes,
    format,
    warnings,
  };
}

function setupSheet(input: DownloadInput): DownloadResult {
  const lines: string[] = [
    '# PRISM Post Setup Sheet',
    '',
    `**Program:** ${input.program_name ?? 'PRISM_PROGRAM'}`,
    `**Machine:** ${input.machine_brand ?? '\u2014'} ${input.machine_model ?? '\u2014'}`,
    `**Controller:** ${input.controller}`,
    `**CAM System:** ${input.cam_system ?? '\u2014'}`,
    `**Generated:** ${new Date().toISOString().split('T')[0]}`,
    '',
    '## Pre-Run Checklist',
    '- [ ] Verify work offset (G54/G55) matches setup',
    '- [ ] Confirm tool lengths measured and entered',
    '- [ ] Check coolant level and nozzle alignment',
    '- [ ] Verify material stock dimensions match program assumptions',
    '- [ ] Run at reduced feed override (50%) for first article',
    '',
  ];

  if (input.physics_blocks?.length) {
    lines.push('## Physics Summary');
    const forces = input.physics_blocks
      .filter((b) => b.force_N !== undefined)
      .map((b) => b.force_N!);
    const confidences = input.physics_blocks
      .filter((b) => b.confidence !== undefined)
      .map((b) => b.confidence!);

    if (forces.length > 0) {
      lines.push(`- **Max cutting force:** ${Math.max(...forces).toFixed(0)} N`);
      lines.push(
        `- **Avg cutting force:** ${(forces.reduce((a, b) => a + b, 0) / forces.length).toFixed(0)} N`,
      );
    }
    if (confidences.length > 0) {
      const avg = confidences.reduce((a, b) => a + b, 0) / confidences.length;
      lines.push(`- **Avg physics confidence:** ${Math.round(avg * 100)}%`);
    }
    lines.push('');
  }

  lines.push(
    '## Operator Notes',
    '- Physics-optimized per-block S/F values. Do NOT override with single blanket feed.',
    '- If chatter occurs, reduce spindle speed 5-10% \u2014 do not increase feed.',
    '- Report any unexpected behavior to programming for model update.',
    '',
  );

  const content = lines.join('\n');
  const slug = sanitizeFilename(input.program_name ?? 'PRISM_PROGRAM');
  const warnings: string[] = [];
  if (!input.physics_blocks?.length) warnings.push('No physics data — setup sheet omits force/confidence summary.');
  return {
    content,
    filename: `${slug}_SETUP.md`,
    mime_type: 'text/markdown',
    size_bytes: new TextEncoder().encode(content).length,
    format: 'setup_sheet',
    warnings,
  };
}

function buildManifest(input: DownloadInput): ManifestResult {
  const gcodeFile = formatDownload(input);
  const setupFile = setupSheet(input);

  const files = [gcodeFile, setupFile];

  if (input.validation_summary) {
    const valContent = input.validation_summary;
    const slug = sanitizeFilename(input.program_name ?? 'PRISM_PROGRAM');
    files.push({
      content: valContent,
      filename: `${slug}_VALIDATION.txt`,
      mime_type: 'text/plain',
      size_bytes: new TextEncoder().encode(valContent).length,
      format: 'validation',
      warnings: [],
    });
  }

  const warnings = files.flatMap((f) => f.warnings ?? []);
  if (!input.validation_summary) warnings.push('No validation report included in manifest.');
  return {
    files,
    total_size_bytes: files.reduce((sum, f) => sum + f.size_bytes, 0),
    warnings,
  };
}

// ─── Engine ─────────────────────────────────────────────────────────

/**
 * PostDownloadEngine — packages physics-optimized G-code for controller-native download.
 *
 * @action format_download — Format G-code with controller-native header/footer and physics annotations
 * @action setup_sheet — Generate operator setup sheet with pre-run checklist and physics summary
 * @action manifest — Generate multi-file package (G-code + setup sheet + validation report)
 */
class PostDownloadEngineImpl {
  readonly name = 'PostDownloadEngine';
  readonly version = '1.0.0';
  readonly actions: EngineAction[] = ['format_download', 'setup_sheet', 'manifest'];

  execute(input: DownloadInput): DownloadResult | ManifestResult {
    switch (input.action) {
      case 'format_download':
        return formatDownload(input);
      case 'setup_sheet':
        return setupSheet(input);
      case 'manifest':
        return buildManifest(input);
      default:
        throw new Error(
          `PostDownloadEngine: unknown action "${input.action}". Valid: ${this.actions.join(', ')}`,
        );
    }
  }
}

export const postDownloadEngine = new PostDownloadEngineImpl();
export { formatDownload, setupSheet, buildManifest };
export type {
  ControllerFormat,
  PhysicsBlock,
  DownloadInput,
  DownloadResult,
  ManifestResult,
};
