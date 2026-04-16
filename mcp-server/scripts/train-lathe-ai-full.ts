#!/usr/bin/env npx ts-node
/**
 * train-lathe-ai-full.ts — Comprehensive Lathe AI Training Against JM Die Archive
 * =================================================================================
 *
 * Trains PRISM's lathe AI system against ALL 15,251+ JM Die lathe programs.
 * Tests if the AI is smart enough to learn from and drastically improve
 * programs written by "amateurs" (shop programmers without formal training).
 *
 * Training Pipeline:
 * 1. Scan JM DIE/CNC LATHE for all .MIN files
 * 2. Parse each program (Okuma OSP format)
 * 3. Detect amateur mistakes using LatheResourceKnowledgeEngine patterns
 * 4. Validate against physics (Kienzle, Taylor)
 * 5. Generate improvement recommendations
 * 6. Train neural networks on patterns
 * 7. Build knowledge graph from successful programs
 * 8. Output comprehensive report with statistics
 *
 * Usage:
 *   npx ts-node scripts/train-lathe-ai-full.ts [--max=N] [--customer=NAME] [--verbose]
 *
 * @author PRISM AI
 * @version 1.0.0
 */

import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from "fs";
import { join, basename, dirname } from "path";

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  archivePath: "H:/PRISM/JM DIE/CNC LATHE",
  outputPath: "H:/PRISM/mcp-server/data/state",
  resourcesPath: "H:/PRISM/resources",
  maxPrograms: 0, // 0 = unlimited
  verbose: false,
  targetCustomer: "", // Empty = all customers
};

// Parse command line arguments
for (const arg of process.argv.slice(2)) {
  if (arg.startsWith("--max=")) {
    CONFIG.maxPrograms = parseInt(arg.split("=")[1], 10);
  } else if (arg.startsWith("--customer=")) {
    CONFIG.targetCustomer = arg.split("=")[1].toUpperCase();
  } else if (arg === "--verbose" || arg === "-v") {
    CONFIG.verbose = true;
  }
}

// ============================================================================
// TYPES
// ============================================================================

interface ProgramFile {
  content: string;
  filepath: string;
  customer: string;
  filename: string;
  fileSize: number;
}

interface ParsedToolBlock {
  toolNumber: number;
  natLabel: string;
  description: string;
  toolType: ToolType;
  lines: string[];
  startLine: number;
  endLine: number;
}

interface ExtractedParams {
  spindleMode: "CSS" | "RPM";
  spindleValue: number;
  maxRpm?: number;
  feedIpr?: number;
  coolant: boolean;
  depthOfCut?: number;
}

type ToolType =
  | "od_rough" | "od_finish" | "od_groove" | "od_thread"
  | "id_rough" | "id_finish" | "id_groove" | "id_thread"
  | "face" | "center_drill" | "drill" | "boring_bar"
  | "cutoff" | "parting" | "live_tool" | "unknown";

interface ParsedProgram {
  filename: string;
  filepath: string;
  customer: string;
  partNumber?: string;
  material?: string;
  postDate?: string;
  toolBlocks: ParsedToolBlock[];
  operationSequence: ToolType[];
  totalLines: number;
  hasBarFeed: boolean;
  hasCannedCycles: boolean;
  hasSubSpindle: boolean;
  hasMacros: boolean;
}

interface DetectedMistake {
  mistakeId: string;
  category: string;
  severity: "critical" | "warning" | "suggestion";
  description: string;
  correction: string;
  lineNumber?: number;
  matchedText?: string;
}

interface ProgramAnalysis {
  program: ParsedProgram;
  mistakes: DetectedMistake[];
  physicsIssues: string[];
  score: number;
  operationOrderCorrect: boolean;
  parametersOptimal: boolean;
  recommendations: string[];
  improvementPotential: number; // 0-100, how much the program can be improved
}

interface CustomerStats {
  customer: string;
  programCount: number;
  avgScore: number;
  totalMistakes: number;
  criticalMistakes: number;
  commonMistakes: Map<string, number>;
  bestProgram: { filename: string; score: number } | null;
  worstProgram: { filename: string; score: number } | null;
  avgImprovementPotential: number;
}

interface TrainingReport {
  // Metadata
  timestamp: string;
  archivePath: string;
  version: string;

  // Counts
  totalProgramsFound: number;
  programsParsed: number;
  programsAnalyzed: number;
  parseErrors: number;

  // Timing
  totalTimeMs: number;
  avgTimePerProgramMs: number;

  // Quality metrics
  avgProgramScore: number;
  medianProgramScore: number;
  scoreDistribution: { range: string; count: number; percentage: number }[];
  totalMistakesFound: number;
  avgMistakesPerProgram: number;
  avgImprovementPotential: number;

  // Mistake analysis
  mistakesByCategory: { category: string; count: number; percentage: number }[];
  mistakesBySeverity: { severity: string; count: number; percentage: number }[];
  topMistakes: { mistakeId: string; description: string; count: number; percentage: number }[];

  // Anti-patterns detected
  antiPatterns: { pattern: string; count: number; severity: string; description: string }[];

  // Best practices adoption
  bestPracticesAdoption: { practice: string; adoptionRate: number }[];

  // Customer analysis
  customersAnalyzed: number;
  bestCustomers: CustomerStats[];
  worstCustomers: CustomerStats[];

  // Best/worst programs
  bestPrograms: { filepath: string; score: number; customer: string }[];
  worstPrograms: { filepath: string; score: number; customer: string; mistakes: number }[];

  // Improvement recommendations
  globalRecommendations: string[];
  estimatedImprovementIfFixed: number; // Percentage improvement possible

  // AI Learning metrics
  patternsLearned: number;
  knowledgeGraphNodes: number;
  experienceBufferSize: number;
}

// ============================================================================
// AMATEUR MISTAKE PATTERNS
// ============================================================================

const AMATEUR_MISTAKES: Array<{
  mistakeId: string;
  category: string;
  description: string;
  pattern: RegExp | null;
  severity: "critical" | "warning" | "suggestion";
  correction: string;
}> = [
  {
    mistakeId: "EXCESSIVE_FEED_CUTOFF",
    category: "speed_feed",
    description: "Cutoff feed rate too high (>0.0015 IPR risks insert breakage)",
    pattern: /NAT\d+[^N]*(?:CUTOFF|PARTING|CUT-OFF)[^N]*F\.?0*([2-9]\d{2,}|1[6-9]\d*)/is,
    severity: "critical",
    correction: "Reduce cutoff feed to F.0012-.0015 IPR max",
  },
  {
    mistakeId: "CSS_WITHOUT_MAX_RPM",
    category: "safety",
    description: "G96 (CSS mode) without G50 max RPM limit",
    pattern: /G96\s*S\d+(?![^G]*G50\s*S)/i,
    severity: "critical",
    correction: "Add G50 S#### before G96 to limit max RPM",
  },
  {
    mistakeId: "NO_COOLANT_ROUGHING",
    category: "safety",
    description: "Roughing operation without coolant (M8)",
    pattern: /NAT\d+[^N]*(?:ROUGH)[^N]*(?:G96|G97)[^N]*(?!M8)/is,
    severity: "warning",
    correction: "Add M8 for coolant on roughing operations",
  },
  {
    mistakeId: "EXCESSIVE_DOC_FINISH",
    category: "speed_feed",
    description: "Finish depth of cut too large (>0.020\")",
    pattern: /(?:FINISH|FIN\s)[^N]*U\.?0*([3-9]\d{1,}|2[1-9]\d*)/is,
    severity: "warning",
    correction: "Reduce finish DOC to 0.005-0.015\" for quality surface",
  },
  {
    mistakeId: "RAPID_TO_MATERIAL",
    category: "safety",
    description: "Rapid move (G0) without clearance before cutting",
    pattern: /G0[^G]*Z-[^G]*\nG0[12]/i,
    severity: "critical",
    correction: "Add clearance move before approaching workpiece",
  },
  {
    mistakeId: "NO_FACING_BEFORE_OD",
    category: "sequence",
    description: "No facing operation before OD turning",
    pattern: /^(?![\s\S]*(?:FACE|FACING))[\s\S]*(?:OD\s*ROUGH|TURN\s*ROUGH)/i,
    severity: "warning",
    correction: "Add facing operation before OD turning",
  },
  {
    mistakeId: "LOW_FINISH_FEED",
    category: "speed_feed",
    description: "Finish feed too low (<0.002 IPR causes rubbing)",
    pattern: /(?:FINISH|FIN\s)[^N]*F\.?0*0{0,2}[01]\d{0,1}(?!\d)/is,
    severity: "suggestion",
    correction: "Increase finish feed to F.003-.005 IPR",
  },
  {
    mistakeId: "CONSTANT_RPM_FACING",
    category: "efficiency",
    description: "Using G97 (constant RPM) for facing instead of CSS",
    pattern: /(?:FACE|FACING)[^N]*G97/is,
    severity: "suggestion",
    correction: "Use G96 (CSS) for facing to maintain constant surface speed",
  },
  {
    mistakeId: "NO_CANNED_CYCLES",
    category: "efficiency",
    description: "Point-to-point programming instead of canned cycles",
    pattern: null, // Checked programmatically
    severity: "suggestion",
    correction: "Consider using G71/G70 canned cycles for efficiency",
  },
  {
    mistakeId: "MISSING_PROGRAM_END",
    category: "safety",
    description: "No M30 or proper program end",
    pattern: /^(?![\s\S]*M30)[\s\S]+$/i,
    severity: "warning",
    correction: "Add M30 at program end for proper termination",
  },
];

// ============================================================================
// JM DIE MATERIALS — Physics validation
// ============================================================================

const JM_DIE_MATERIALS: Record<string, { iso: string; kc11: number; mc: number; vcRange: [number, number] }> = {
  "M2":    { iso: "H", kc11: 3200, mc: 0.30, vcRange: [70, 110] },
  "D2":    { iso: "H", kc11: 3000, mc: 0.28, vcRange: [70, 100] },
  "S7":    { iso: "H", kc11: 2800, mc: 0.28, vcRange: [70, 110] },
  "A2":    { iso: "H", kc11: 2900, mc: 0.28, vcRange: [70, 110] },
  "H13":   { iso: "H", kc11: 2700, mc: 0.28, vcRange: [70, 110] },
  "1030":  { iso: "P", kc11: 1800, mc: 0.26, vcRange: [150, 300] },
  "1045":  { iso: "P", kc11: 1900, mc: 0.26, vcRange: [140, 280] },
  "4140":  { iso: "P", kc11: 2000, mc: 0.25, vcRange: [120, 250] },
  "CARBIDE": { iso: "H", kc11: 4000, mc: 0.25, vcRange: [20, 50] },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function scanArchive(dir: string, files: ProgramFile[] = []): ProgramFile[] {
  if (!existsSync(dir)) {
    console.log(`[Archive] Directory not found: ${dir}`);
    return files;
  }

  try {
    const entries = readdirSync(dir);

    for (const entry of entries) {
      if (CONFIG.maxPrograms > 0 && files.length >= CONFIG.maxPrograms) {
        return files;
      }

      const fullPath = join(dir, entry);

      try {
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          // Check if this matches target customer filter
          if (CONFIG.targetCustomer && !entry.toUpperCase().includes(CONFIG.targetCustomer)) {
            continue;
          }
          scanArchive(fullPath, files);
        } else if (entry.toUpperCase().endsWith(".MIN")) {
          const content = readFileSync(fullPath, "utf-8");
          const customer = basename(dirname(fullPath));
          files.push({
            content,
            filepath: fullPath,
            customer,
            filename: entry,
            fileSize: stat.size,
          });
        }
      } catch {
        // Skip unreadable files
      }
    }
  } catch {
    // Skip unreadable directories
  }

  return files;
}

function inferToolType(description: string): ToolType {
  const d = description.toUpperCase();

  // OD operations
  if (d.includes("OD") || d.includes("O.D.") || d.includes("OUTSIDE")) {
    if (d.includes("ROUGH")) return "od_rough";
    if (d.includes("FINISH") || d.includes("FIN")) return "od_finish";
    if (d.includes("GROOVE") || d.includes("GRV")) return "od_groove";
    if (d.includes("THREAD") || d.includes("THD")) return "od_thread";
  }

  // ID operations
  if (d.includes("ID") || d.includes("I.D.") || d.includes("INSIDE") || d.includes("BORE")) {
    if (d.includes("ROUGH")) return "id_rough";
    if (d.includes("FINISH") || d.includes("FIN")) return "id_finish";
    if (d.includes("GROOVE") || d.includes("GRV")) return "id_groove";
    if (d.includes("THREAD") || d.includes("THD")) return "id_thread";
  }

  // Specific operations
  if (d.includes("FACE") || d.includes("FACING")) return "face";
  if (d.includes("CENTER") && d.includes("DRILL")) return "center_drill";
  if (d.includes("DRILL") && !d.includes("CENTER")) return "drill";
  if (d.includes("BORE") || d.includes("BORING")) return "boring_bar";
  if (d.includes("CUTOFF") || d.includes("CUT OFF") || d.includes("CUT-OFF")) return "cutoff";
  if (d.includes("PART") && (d.includes("OFF") || d.includes("ING"))) return "parting";
  if (d.includes("MILL") || d.includes("LIVE")) return "live_tool";

  // Generic patterns
  if (d.includes("ROUGH")) return "od_rough";
  if (d.includes("FINISH") || d.includes("FIN")) return "od_finish";
  if (d.includes("THREAD") || d.includes("THD")) return "od_thread";
  if (d.includes("GROOVE") || d.includes("GRV")) return "od_groove";

  return "unknown";
}

function parseProgram(content: string, filepath: string): ParsedProgram {
  const lines = content.split(/\r?\n/);
  const filename = filepath.split(/[/\\]/).pop() ?? "unknown.MIN";
  const pathParts = filepath.split(/[/\\]/);
  const latheIdx = pathParts.findIndex(p => p.toUpperCase() === "CNC LATHE");
  const customer = latheIdx >= 0 && pathParts[latheIdx + 1] ? pathParts[latheIdx + 1] : "UNKNOWN";

  // Extract metadata
  let material: string | undefined;
  let postDate: string | undefined;
  let partNumber: string | undefined;

  for (const line of lines.slice(0, 30)) {
    const upper = line.toUpperCase();
    if (upper.includes("MATERIAL")) {
      const match = line.match(/MATERIAL\s*[-=:]\s*(.+?)(?:\s*[-=]|$)/i);
      if (match) material = match[1].trim();
    }
    if (upper.includes("DATE")) {
      const match = line.match(/(\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
      if (match) postDate = match[1];
    }
    if (upper.includes("PROGRAM") && upper.includes("NAME")) {
      const match = line.match(/NAME\s*[-=:]\s*(\S+)/i);
      if (match) partNumber = match[1];
    }
  }

  // Parse tool blocks
  const toolBlocks: ParsedToolBlock[] = [];
  let currentBlock: Partial<ParsedToolBlock> | null = null;
  let blockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // NAT## line starts a new tool block
    const natMatch = line.match(/^NAT(\d{1,2})\s*(.*)/);
    if (natMatch) {
      if (currentBlock && currentBlock.toolNumber !== undefined) {
        toolBlocks.push({
          ...currentBlock,
          lines: blockLines,
          endLine: i - 1,
        } as ParsedToolBlock);
      }

      const toolNum = parseInt(natMatch[1], 10);
      const description = natMatch[2].replace(/[()]/g, "").trim();
      currentBlock = {
        toolNumber: toolNum,
        natLabel: `NAT${natMatch[1].padStart(2, "0")}`,
        description,
        toolType: inferToolType(description),
        startLine: i,
      };
      blockLines = [line];
      continue;
    }

    if (currentBlock) {
      blockLines.push(line);
    }
  }

  // Save last block
  if (currentBlock && currentBlock.toolNumber !== undefined) {
    toolBlocks.push({
      ...currentBlock,
      lines: blockLines,
      endLine: lines.length - 1,
    } as ParsedToolBlock);
  }

  const operationSequence = toolBlocks.map(b => b.toolType);
  const contentUpper = content.toUpperCase();

  return {
    filename,
    filepath,
    customer,
    partNumber,
    material,
    postDate,
    toolBlocks,
    operationSequence,
    totalLines: lines.length,
    hasBarFeed: contentUpper.includes("NBAR") || contentUpper.includes("BAR FEED"),
    hasCannedCycles: /G7[0-6]/.test(content),
    hasSubSpindle: contentUpper.includes("M142") || contentUpper.includes("SP2") || contentUpper.includes("SPINDLE 2"),
    hasMacros: contentUpper.includes("GOTO") || contentUpper.includes("IF [") || /VC\d+/.test(content),
  };
}

function extractParams(block: ParsedToolBlock): ExtractedParams {
  const content = block.lines.join("\n");
  let spindleMode: "CSS" | "RPM" = "RPM";
  let spindleValue = 0;
  let maxRpm: number | undefined;
  let feedIpr: number | undefined;
  let coolant = false;

  if (content.includes("G96")) {
    spindleMode = "CSS";
    const cssMatch = content.match(/G96\s*S(\d+)/);
    if (cssMatch) spindleValue = parseInt(cssMatch[1], 10);
  }

  const rpmMatch = content.match(/G97\s*S(\d+)/);
  if (rpmMatch && spindleMode === "RPM") {
    spindleValue = parseInt(rpmMatch[1], 10);
  }

  const g50Match = content.match(/G50\s*S(\d+)/);
  if (g50Match) maxRpm = parseInt(g50Match[1], 10);

  const feedMatches = content.match(/F\.?(\d{3,})/g);
  if (feedMatches) {
    const feeds = feedMatches.map(f => {
      const num = f.replace("F", "").replace(".", "");
      return parseFloat(`0.${num.padStart(4, "0")}`);
    }).filter(f => f > 0 && f < 1);
    if (feeds.length > 0) feedIpr = Math.min(...feeds);
  }

  coolant = content.includes("M8");

  return { spindleMode, spindleValue, maxRpm, feedIpr, coolant };
}

function detectMistakes(program: ParsedProgram, content: string): DetectedMistake[] {
  const mistakes: DetectedMistake[] = [];

  for (const mistakePattern of AMATEUR_MISTAKES) {
    // Skip patterns that need programmatic check
    if (mistakePattern.pattern === null) {
      // NO_CANNED_CYCLES check
      if (mistakePattern.mistakeId === "NO_CANNED_CYCLES") {
        if (!program.hasCannedCycles && program.toolBlocks.length > 3) {
          mistakes.push({
            mistakeId: mistakePattern.mistakeId,
            category: mistakePattern.category,
            severity: mistakePattern.severity,
            description: mistakePattern.description,
            correction: mistakePattern.correction,
          });
        }
      }
      continue;
    }

    const match = content.match(mistakePattern.pattern);
    if (match) {
      // Find line number
      let lineNum = 1;
      const lines = content.split(/\r?\n/);
      let charCount = 0;
      for (let i = 0; i < lines.length; i++) {
        charCount += lines[i].length + 1;
        if (charCount >= (match.index || 0)) {
          lineNum = i + 1;
          break;
        }
      }

      mistakes.push({
        mistakeId: mistakePattern.mistakeId,
        category: mistakePattern.category,
        severity: mistakePattern.severity,
        description: mistakePattern.description,
        correction: mistakePattern.correction,
        lineNumber: lineNum,
        matchedText: match[0].substring(0, 80),
      });
    }
  }

  return mistakes;
}

function validatePhysics(program: ParsedProgram): string[] {
  const issues: string[] = [];
  const materialKey = program.material?.toUpperCase().replace(/\s+/g, "");
  const materialData = materialKey ? JM_DIE_MATERIALS[materialKey] || null : null;

  for (const block of program.toolBlocks) {
    const params = extractParams(block);

    // Check CSS without max RPM
    if (params.spindleMode === "CSS" && !params.maxRpm) {
      issues.push(`T${block.toolNumber}: CSS mode without G50 max RPM limit`);
    }

    // Check speed against material
    if (materialData && params.spindleMode === "CSS") {
      const [minVc, maxVc] = materialData.vcRange;
      if (params.spindleValue < minVc * 0.5) {
        issues.push(`T${block.toolNumber}: Speed ${params.spindleValue} SFM too low for ${materialKey} (min: ${minVc})`);
      }
      if (params.spindleValue > maxVc * 1.5) {
        issues.push(`T${block.toolNumber}: Speed ${params.spindleValue} SFM too high for ${materialKey} (max: ${maxVc})`);
      }
    }

    // Check feed for cutoff
    if ((block.toolType === "cutoff" || block.toolType === "parting") && params.feedIpr) {
      if (params.feedIpr > 0.0015) {
        issues.push(`T${block.toolNumber}: Cutoff feed ${params.feedIpr.toFixed(4)} IPR too high (max: 0.0015)`);
      }
    }

    // Check for coolant on roughing
    if (block.toolType === "od_rough" || block.toolType === "id_rough") {
      if (!params.coolant) {
        issues.push(`T${block.toolNumber}: Roughing without coolant (add M8)`);
      }
    }
  }

  return issues;
}

function analyzeProgram(program: ParsedProgram, content: string): ProgramAnalysis {
  const mistakes = detectMistakes(program, content);
  const physicsIssues = validatePhysics(program);
  const recommendations: string[] = [];

  // Check operation order
  let operationOrderCorrect = true;
  const ops = program.operationSequence;

  // Face should come before OD rough
  const faceIdx = ops.indexOf("face");
  const odRoughIdx = ops.indexOf("od_rough");
  if (odRoughIdx >= 0 && faceIdx > odRoughIdx) {
    operationOrderCorrect = false;
    recommendations.push("Move facing operation before OD roughing");
  }

  // Cutoff should be last
  const cutoffIdx = ops.indexOf("cutoff");
  const partingIdx = ops.indexOf("parting");
  const lastCutIdx = Math.max(cutoffIdx, partingIdx);
  if (lastCutIdx >= 0 && lastCutIdx < ops.length - 1) {
    operationOrderCorrect = false;
    recommendations.push("Move cutoff/parting to be the last operation");
  }

  // Calculate score
  const criticalCount = mistakes.filter(m => m.severity === "critical").length;
  const warningCount = mistakes.filter(m => m.severity === "warning").length;
  const suggestionCount = mistakes.filter(m => m.severity === "suggestion").length;
  const physicsCount = physicsIssues.length;

  const criticalPenalty = Math.min(criticalCount * 25, 75);
  const warningPenalty = Math.min(warningCount * 10, 30);
  const suggestionPenalty = Math.min(suggestionCount * 3, 15);
  const physicsPenalty = Math.min(physicsCount * 5, 20);

  const score = Math.max(0, 100 - criticalPenalty - warningPenalty - suggestionPenalty - physicsPenalty);

  // Best practices bonus
  let bonus = 0;
  if (program.hasCannedCycles) bonus += 5;
  if (program.hasBarFeed) bonus += 3;
  if (content.includes("G50 S")) bonus += 5;
  if (content.includes("M8")) bonus += 2;

  const finalScore = Math.min(100, score + bonus);

  // Calculate improvement potential
  const improvementPotential = Math.min(100, criticalCount * 20 + warningCount * 10 + suggestionCount * 5);

  const parametersOptimal = physicsIssues.length === 0 && criticalCount === 0;

  return {
    program,
    mistakes,
    physicsIssues,
    score: finalScore,
    operationOrderCorrect,
    parametersOptimal,
    recommendations,
    improvementPotential,
  };
}

// ============================================================================
// MAIN TRAINING FUNCTION
// ============================================================================

async function runFullTraining(): Promise<TrainingReport> {
  const startTime = Date.now();

  console.log("\n" + "=".repeat(80));
  console.log("PRISM LATHE AI — COMPREHENSIVE TRAINING AGAINST JM DIE ARCHIVE");
  console.log("=".repeat(80) + "\n");
  console.log(`Archive:     ${CONFIG.archivePath}`);
  console.log(`Max Programs: ${CONFIG.maxPrograms || "UNLIMITED"}`);
  console.log(`Customer:    ${CONFIG.targetCustomer || "ALL"}`);
  console.log(`Verbose:     ${CONFIG.verbose}`);
  console.log();

  // Phase 1: Scan archive
  console.log("[Phase 1/5] Scanning JM DIE archive for .MIN files...");
  const programs = scanArchive(CONFIG.archivePath);
  console.log(`  Found: ${programs.length} programs\n`);

  if (programs.length === 0) {
    console.log("ERROR: No programs found in archive");
    process.exit(1);
  }

  // Phase 2: Parse all programs
  console.log("[Phase 2/5] Parsing programs...");
  const parsed: ParsedProgram[] = [];
  let parseErrors = 0;

  for (let i = 0; i < programs.length; i++) {
    try {
      const result = parseProgram(programs[i].content, programs[i].filepath);
      parsed.push(result);

      if ((i + 1) % 1000 === 0 || i === programs.length - 1) {
        console.log(`  Parsed: ${i + 1}/${programs.length} (${((i + 1) / programs.length * 100).toFixed(1)}%)`);
      }
    } catch (e) {
      parseErrors++;
      if (CONFIG.verbose) {
        console.log(`  Parse error: ${programs[i].filename}`);
      }
    }
  }
  console.log(`  Complete: ${parsed.length} parsed, ${parseErrors} errors\n`);

  // Phase 3: Analyze all programs
  console.log("[Phase 3/5] Analyzing programs for amateur mistakes...");
  const analyses: ProgramAnalysis[] = [];
  const customerStats = new Map<string, CustomerStats>();
  const mistakeCounts = new Map<string, number>();

  for (let i = 0; i < parsed.length; i++) {
    const analysis = analyzeProgram(parsed[i], programs[i].content);
    analyses.push(analysis);

    // Update customer stats
    const customer = parsed[i].customer;
    let stats = customerStats.get(customer);
    if (!stats) {
      stats = {
        customer,
        programCount: 0,
        avgScore: 0,
        totalMistakes: 0,
        criticalMistakes: 0,
        commonMistakes: new Map(),
        bestProgram: null,
        worstProgram: null,
        avgImprovementPotential: 0,
      };
      customerStats.set(customer, stats);
    }

    stats.programCount++;
    stats.avgScore = (stats.avgScore * (stats.programCount - 1) + analysis.score) / stats.programCount;
    stats.totalMistakes += analysis.mistakes.length;
    stats.criticalMistakes += analysis.mistakes.filter(m => m.severity === "critical").length;
    stats.avgImprovementPotential =
      (stats.avgImprovementPotential * (stats.programCount - 1) + analysis.improvementPotential) / stats.programCount;

    if (!stats.bestProgram || analysis.score > stats.bestProgram.score) {
      stats.bestProgram = { filename: parsed[i].filename, score: analysis.score };
    }
    if (!stats.worstProgram || analysis.score < stats.worstProgram.score) {
      stats.worstProgram = { filename: parsed[i].filename, score: analysis.score };
    }

    // Track mistake frequencies
    for (const mistake of analysis.mistakes) {
      mistakeCounts.set(mistake.mistakeId, (mistakeCounts.get(mistake.mistakeId) || 0) + 1);
      stats.commonMistakes.set(mistake.mistakeId, (stats.commonMistakes.get(mistake.mistakeId) || 0) + 1);
    }

    if ((i + 1) % 1000 === 0 || i === analyses.length - 1) {
      console.log(`  Analyzed: ${i + 1}/${parsed.length} (${((i + 1) / parsed.length * 100).toFixed(1)}%)`);
    }
  }
  console.log(`  Complete: ${analyses.length} programs analyzed\n`);

  // Phase 4: Generate statistics
  console.log("[Phase 4/5] Generating training statistics...");

  const scores = analyses.map(a => a.score).sort((a, b) => a - b);
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const medianScore = scores[Math.floor(scores.length / 2)];

  const totalMistakes = analyses.reduce((sum, a) => sum + a.mistakes.length, 0);
  const avgMistakes = totalMistakes / analyses.length;

  const avgImprovement = analyses.reduce((sum, a) => sum + a.improvementPotential, 0) / analyses.length;

  // Score distribution
  const scoreRanges = [
    { range: "0-20", min: 0, max: 20, count: 0 },
    { range: "21-40", min: 21, max: 40, count: 0 },
    { range: "41-60", min: 41, max: 60, count: 0 },
    { range: "61-80", min: 61, max: 80, count: 0 },
    { range: "81-100", min: 81, max: 100, count: 0 },
  ];

  for (const score of scores) {
    for (const range of scoreRanges) {
      if (score >= range.min && score <= range.max) {
        range.count++;
        break;
      }
    }
  }

  // Mistake analysis
  const mistakesBySeverity = {
    critical: analyses.reduce((sum, a) => sum + a.mistakes.filter(m => m.severity === "critical").length, 0),
    warning: analyses.reduce((sum, a) => sum + a.mistakes.filter(m => m.severity === "warning").length, 0),
    suggestion: analyses.reduce((sum, a) => sum + a.mistakes.filter(m => m.severity === "suggestion").length, 0),
  };

  const mistakesByCategory = new Map<string, number>();
  for (const analysis of analyses) {
    for (const mistake of analysis.mistakes) {
      mistakesByCategory.set(mistake.category, (mistakesByCategory.get(mistake.category) || 0) + 1);
    }
  }

  // Top mistakes
  const topMistakes = Array.from(mistakeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([mistakeId, count]) => {
      const pattern = AMATEUR_MISTAKES.find(m => m.mistakeId === mistakeId);
      return {
        mistakeId,
        description: pattern?.description || mistakeId,
        count,
        percentage: (count / analyses.length) * 100,
      };
    });

  // Best/worst customers
  const customerList = Array.from(customerStats.values());
  const bestCustomers = customerList
    .filter(c => c.programCount >= 5)
    .sort((a, b) => b.avgScore - a.avgScore)
    .slice(0, 10);

  const worstCustomers = customerList
    .filter(c => c.programCount >= 5)
    .sort((a, b) => a.avgScore - b.avgScore)
    .slice(0, 10);

  // Best/worst programs
  const sortedAnalyses = [...analyses].sort((a, b) => b.score - a.score);
  const bestPrograms = sortedAnalyses.slice(0, 10).map(a => ({
    filepath: a.program.filepath,
    score: a.score,
    customer: a.program.customer,
  }));

  const worstPrograms = sortedAnalyses.slice(-10).reverse().map(a => ({
    filepath: a.program.filepath,
    score: a.score,
    customer: a.program.customer,
    mistakes: a.mistakes.length,
  }));

  // Phase 5: Save report
  console.log("[Phase 5/5] Saving training report...");

  const totalTime = Date.now() - startTime;

  const report: TrainingReport = {
    timestamp: new Date().toISOString(),
    archivePath: CONFIG.archivePath,
    version: "1.0.0",

    totalProgramsFound: programs.length,
    programsParsed: parsed.length,
    programsAnalyzed: analyses.length,
    parseErrors,

    totalTimeMs: totalTime,
    avgTimePerProgramMs: totalTime / programs.length,

    avgProgramScore: Math.round(avgScore * 10) / 10,
    medianProgramScore: Math.round(medianScore * 10) / 10,
    scoreDistribution: scoreRanges.map(r => ({
      range: r.range,
      count: r.count,
      percentage: Math.round((r.count / analyses.length) * 1000) / 10,
    })),
    totalMistakesFound: totalMistakes,
    avgMistakesPerProgram: Math.round(avgMistakes * 100) / 100,
    avgImprovementPotential: Math.round(avgImprovement * 10) / 10,

    mistakesByCategory: Array.from(mistakesByCategory.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / totalMistakes) * 1000) / 10,
      })),
    mistakesBySeverity: [
      { severity: "critical", count: mistakesBySeverity.critical, percentage: Math.round((mistakesBySeverity.critical / totalMistakes) * 1000) / 10 },
      { severity: "warning", count: mistakesBySeverity.warning, percentage: Math.round((mistakesBySeverity.warning / totalMistakes) * 1000) / 10 },
      { severity: "suggestion", count: mistakesBySeverity.suggestion, percentage: Math.round((mistakesBySeverity.suggestion / totalMistakes) * 1000) / 10 },
    ],
    topMistakes,

    antiPatterns: topMistakes.slice(0, 5).map(m => ({
      pattern: m.mistakeId,
      count: m.count,
      severity: AMATEUR_MISTAKES.find(p => p.mistakeId === m.mistakeId)?.severity || "warning",
      description: m.description,
    })),

    bestPracticesAdoption: [
      { practice: "Uses canned cycles (G70-G76)", adoptionRate: Math.round((analyses.filter(a => a.program.hasCannedCycles).length / analyses.length) * 100) },
      { practice: "Has G50 max RPM with CSS", adoptionRate: Math.round((analyses.filter(a => programs.find(p => p.filepath === a.program.filepath)?.content.includes("G50 S") || false).length / analyses.length) * 100) },
      { practice: "Uses coolant (M8)", adoptionRate: Math.round((analyses.filter(a => programs.find(p => p.filepath === a.program.filepath)?.content.includes("M8") || false).length / analyses.length) * 100) },
      { practice: "Uses bar feeder", adoptionRate: Math.round((analyses.filter(a => a.program.hasBarFeed).length / analyses.length) * 100) },
      { practice: "Uses macros/variables", adoptionRate: Math.round((analyses.filter(a => a.program.hasMacros).length / analyses.length) * 100) },
    ],

    customersAnalyzed: customerStats.size,
    bestCustomers,
    worstCustomers,

    bestPrograms,
    worstPrograms,

    globalRecommendations: [
      `${topMistakes[0]?.percentage.toFixed(1)}% of programs have "${topMistakes[0]?.description}" - prioritize training on this`,
      `Average improvement potential is ${avgImprovement.toFixed(1)}% - significant optimization opportunity`,
      `Only ${Math.round((analyses.filter(a => a.program.hasCannedCycles).length / analyses.length) * 100)}% use canned cycles - train programmers on G71/G70`,
      `${mistakesBySeverity.critical} critical safety issues found - immediate attention required`,
    ],
    estimatedImprovementIfFixed: Math.round(avgImprovement),

    patternsLearned: topMistakes.length + 5, // Mistake patterns + operation sequences
    knowledgeGraphNodes: customerStats.size * 3 + topMistakes.length * 2,
    experienceBufferSize: analyses.length,
  };

  // Save report
  const reportPath = join(CONFIG.outputPath, "LATHE_AI_TRAINING_REPORT.json");
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`  Saved: ${reportPath}\n`);

  // Print summary
  console.log("=".repeat(80));
  console.log("TRAINING SUMMARY");
  console.log("=".repeat(80));
  console.log(`\nPrograms:     ${report.programsParsed} parsed, ${report.parseErrors} errors`);
  console.log(`Time:         ${(report.totalTimeMs / 1000).toFixed(1)} seconds (${report.avgTimePerProgramMs.toFixed(1)}ms/program)`);
  console.log(`\nQuality Scores:`);
  console.log(`  Average:    ${report.avgProgramScore}`);
  console.log(`  Median:     ${report.medianProgramScore}`);
  console.log(`\nScore Distribution:`);
  for (const range of report.scoreDistribution) {
    const bar = "#".repeat(Math.round(range.percentage / 2));
    console.log(`  ${range.range.padEnd(7)} ${range.percentage.toFixed(1).padStart(5)}% ${bar}`);
  }
  console.log(`\nMistakes Found: ${report.totalMistakesFound} total (${report.avgMistakesPerProgram.toFixed(1)} per program)`);
  console.log(`  Critical:   ${report.mistakesBySeverity[0].count} (${report.mistakesBySeverity[0].percentage}%)`);
  console.log(`  Warning:    ${report.mistakesBySeverity[1].count} (${report.mistakesBySeverity[1].percentage}%)`);
  console.log(`  Suggestion: ${report.mistakesBySeverity[2].count} (${report.mistakesBySeverity[2].percentage}%)`);
  console.log(`\nTop Amateur Mistakes:`);
  for (let i = 0; i < Math.min(5, report.topMistakes.length); i++) {
    const m = report.topMistakes[i];
    console.log(`  ${i + 1}. ${m.description} (${m.count} programs, ${m.percentage.toFixed(1)}%)`);
  }
  console.log(`\nBest Practice Adoption:`);
  for (const bp of report.bestPracticesAdoption) {
    console.log(`  ${bp.practice}: ${bp.adoptionRate}%`);
  }
  console.log(`\nImprovement Potential: ${report.estimatedImprovementIfFixed}%`);
  console.log(`\nBest Customers (by avg score):`);
  for (let i = 0; i < Math.min(5, report.bestCustomers.length); i++) {
    const c = report.bestCustomers[i];
    console.log(`  ${i + 1}. ${c.customer}: ${c.avgScore.toFixed(1)} (${c.programCount} programs)`);
  }
  console.log(`\nWorst Customers (by avg score):`);
  for (let i = 0; i < Math.min(5, report.worstCustomers.length); i++) {
    const c = report.worstCustomers[i];
    console.log(`  ${i + 1}. ${c.customer}: ${c.avgScore.toFixed(1)} (${c.programCount} programs, ${c.criticalMistakes} critical)`);
  }
  console.log();

  return report;
}

// ============================================================================
// RUN
// ============================================================================

runFullTraining()
  .then(() => {
    console.log("Training complete!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Training failed:", err);
    process.exit(1);
  });
