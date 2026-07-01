import path from "node:path";
import fs from "node:fs";

const TEST_FILE_RE = /\.(test|spec)\.[cm]?[jt]sx?$/i;

// ─── Goal / task-intent sources ────────────────────────────────────────────
const GOAL_STACK_PATH = "H:/PRISM/mcp-server/data/state/GOAL_STACK.json";
const CURRENT_POSITION_PATH = "H:/PRISM/state/CURRENT_POSITION.md";

/**
 * LIVE_INTENT_KEYWORDS — when present in the active goal, heavy mocking of the
 * subject-under-test is a hard violation. "Live" means the test must exercise
 * real software / real hardware / real I/O, not a mocked stand-in.
 */
export const LIVE_INTENT_KEYWORDS = [
  "live", "real", "actual", "in-software", "in software",
  "integration", "end-to-end", "e2e",
  "no mock", "no-mock", "non-mock", "unmocked",
  "hardware", "on the machine", "on-machine",
  "wet run", "wet-run",
  "over 9000", "9000 cad", "9000 tests", "production",
  // CAD software names — if goal names actual software, tests must hit it
  "fusion 360", "fusion360", "solidworks", "mastercam", "hypermill",
  "nx cam", "catia", "inventor", "rhino", "freecad",
  "opencascade", "occt", "step file", "step export", "iges",
  "cad software", "cad generation", "cad bridge", "cad plugin",
  // machining software
  "cnc software", "postprocessor", "g-code runner", "controller",
  "haas", "okuma", "fanuc",
];

/** Heavy-mock patterns that disqualify a test from satisfying a live-intent goal. */
const HEAVY_MOCK_PATTERNS = [
  { re: /\bvi\.mock\s*\(/g,                  label: "vi.mock()" },
  { re: /\bjest\.mock\s*\(/g,                label: "jest.mock()" },
  { re: /\bvi\.doMock\s*\(/g,                label: "vi.doMock()" },
  { re: /\bjest\.doMock\s*\(/g,              label: "jest.doMock()" },
  { re: /\bsinon\.stub\s*\(/g,               label: "sinon.stub()" },
  { re: /\bsinon\.replace\s*\(/g,            label: "sinon.replace()" },
  { re: /\bvi\.fn\s*\(\s*\)\.\s*mockReturnValue\s*\(/g, label: "vi.fn().mockReturnValue()" },
  { re: /\bjest\.fn\s*\(\s*\)\.\s*mockReturnValue\s*\(/g, label: "jest.fn().mockReturnValue()" },
  { re: /\bnock\s*\(/g,                      label: "nock()" },
  { re: /\bMockAdapter\s*\(/g,               label: "axios MockAdapter" },
  { re: /\bnew\s+Mock[A-Z]\w+\s*\(/g,        label: "new Mock<Thing>()" },
  { re: /\bnew\s+Fake[A-Z]\w+\s*\(/g,        label: "new Fake<Thing>()" },
  { re: /\bnew\s+Stub[A-Z]\w+\s*\(/g,        label: "new Stub<Thing>()" },
];

/** Markers that a test exercises real external integration. Lowers mismatch severity. */
const REAL_IO_MARKERS = [
  "child_process",        "spawn(",         "spawnSync(",   "exec(",        "execSync(",     "execFile(",
  "fetch(",               "http.request",   "https.request","WebSocket(",   "net.createConnection",
  "fs.writeFileSync",     "fs.readFileSync","fs.promises.writeFile",        "fs.promises.readFile",
  "puppeteer",            "playwright",     "electron",
  "dotnet",               "pwsh",           "powershell",
  "fusion.DocumentManager", "inventor.Application", "SW.OpenDoc",  "mastercam.exe", "hypermill.exe",
  "COMObject",            "CreateObject(", "ActiveX",
  "spawn('python'",       "spawn(\"python\"",
  "runCadBridge(",        "runCadProcess(", "executeCad(", "renderStep(",
];

function safeRead(filePath) {
  try { return fs.readFileSync(filePath, "utf8"); } catch { return ""; }
}

/** Read the top active goal (most recent) + current phase. Fails open to empty string. */
export function readCurrentGoal() {
  let topGoal = "";
  let allGoals = [];
  try {
    const raw = safeRead(GOAL_STACK_PATH);
    if (raw) {
      const parsed = JSON.parse(raw);
      const goals = Array.isArray(parsed?.goals) ? parsed.goals : [];
      allGoals = goals.map((g) => String(g?.goal ?? "")).filter(Boolean);
      topGoal = allGoals[0] ?? "";
    }
  } catch { /* fail-open */ }

  let phase = "";
  try {
    const md = safeRead(CURRENT_POSITION_PATH);
    const m = md.match(/\*\*Phase:\*\*\s*([^\n]+)/i);
    if (m) phase = m[1].trim();
  } catch { /* fail-open */ }

  return { topGoal, allGoals, phase, combined: `${topGoal}\n${phase}`.toLowerCase() };
}

/**
 * Does the current goal text claim "live / real / integration" intent?
 * Returns the matched keywords so the reason message can be specific.
 */
export function classifyGoalIntent(goalText = "") {
  const hay = String(goalText).toLowerCase();
  const hits = LIVE_INTENT_KEYWORDS.filter((kw) => hay.includes(kw));
  return {
    isLive: hits.length > 0,
    keywords: hits,
  };
}

/**
 * Count heavy mocking. Returns totals and the label breakdown so the reason
 * message can point at the specific pattern used.
 */
export function detectHeavyMocking(content = "") {
  const breakdown = [];
  let total = 0;
  for (const { re, label } of HEAVY_MOCK_PATTERNS) {
    const matches = content.match(re);
    const n = matches ? matches.length : 0;
    if (n > 0) {
      breakdown.push({ label, count: n });
      total += n;
    }
  }
  // Real-IO evidence lowers the severity — a test that does BOTH real IO and
  // a little mocking (e.g. mocks a clock/logger) is legitimate.
  const realIoHits = REAL_IO_MARKERS.filter((m) => content.includes(m)).length;
  return { total, breakdown, realIoHits };
}

/**
 * Detect synthetic mass-generation. Flags the "9000 fake tests from a loop"
 * smell: test bodies generated by for/while/Array.from, or it.each with
 * obviously synthetic data arrays.
 */
export function detectSyntheticGeneration(content = "") {
  const findings = [];

  // for (let i = 0; i < 9000; i++) { it(...) }
  const forLoopIt = content.match(/for\s*\(\s*(?:let|var|const)\s+\w+\s*=\s*0\s*;\s*\w+\s*<\s*(\d+)\s*;[^)]*\)\s*\{[^}]*\bit\s*\(/g) || [];
  for (const m of forLoopIt) {
    const num = Number((m.match(/<\s*(\d+)/) || [])[1] ?? 0);
    if (num >= 20) findings.push({ kind: "for-loop-it", count: num, sample: m.slice(0, 80) });
  }

  // Array.from({length: N}).forEach/.map wrapping it(
  const arrFromIt = content.match(/Array\.from\s*\(\s*\{\s*length\s*:\s*(\d+)\s*\}\s*\)\s*\.\s*(?:forEach|map)\s*\(\s*(?:\([^)]*\)|\w+)\s*=>\s*\{?[^}]*\bit\s*\(/g) || [];
  for (const m of arrFromIt) {
    const num = Number((m.match(/length\s*:\s*(\d+)/) || [])[1] ?? 0);
    if (num >= 20) findings.push({ kind: "array-from-it", count: num, sample: m.slice(0, 80) });
  }

  // while (n < 9000) { it(...) }
  const whileIt = content.match(/while\s*\([^)]*<\s*(\d+)[^)]*\)\s*\{[^}]*\bit\s*\(/g) || [];
  for (const m of whileIt) {
    const num = Number((m.match(/<\s*(\d+)/) || [])[1] ?? 0);
    if (num >= 20) findings.push({ kind: "while-loop-it", count: num, sample: m.slice(0, 80) });
  }

  // it.each([ ... ]) / describe.each([ ... ]) with very large inline arrays
  // Crude: find it.each / describe.each whose argument spans > 500 chars
  const eachRe = /(?:it|describe)\.each\s*\(\s*(\[[\s\S]*?\])\s*\)/g;
  let m;
  while ((m = eachRe.exec(content)) !== null) {
    const arrText = m[1] ?? "";
    // count commas as a proxy for array length
    const rowCount = (arrText.match(/\],?\s*\[/g) || []).length + 1;
    if (rowCount >= 50 && arrText.length > 400) {
      findings.push({ kind: "each-synthetic-array", count: rowCount, sample: `${m[0].slice(0, 60)}…` });
    }
  }

  // faker./chance./randomUUID paired with only toBeDefined/toBeTruthy assertions
  const fakerCount = (content.match(/\b(?:faker|chance)\.\w+\s*\(/g) || []).length;
  const randomUuid  = (content.match(/\brandomUUID\s*\(\s*\)/g) || []).length;
  const weakOnly    = (content.match(/\.to(?:BeDefined|BeTruthy|BeUndefined|BeFalsy)\s*\(\s*\)/g) || []).length;
  const strongAssert= (content.match(/\.to(?:Equal|Be|MatchObject|StrictEqual|Contain|Match|HaveLength|BeCloseTo|BeGreaterThan|BeLessThan)\b/g) || []).length;
  if ((fakerCount + randomUuid) >= 20 && weakOnly >= strongAssert) {
    findings.push({ kind: "random-data-weak-assert", count: fakerCount + randomUuid });
  }

  // Large test file (>1500 lines) where average assertion variance is near zero:
  // heuristic — detect repeated identical assertion shape appearing >50x.
  const assertionShapes = content.match(/\.to\w+\s*\([^)]{0,120}\)/g) || [];
  if (assertionShapes.length >= 50) {
    const freq = new Map();
    for (const a of assertionShapes) freq.set(a, (freq.get(a) || 0) + 1);
    let maxRepeat = 0;
    for (const v of freq.values()) if (v > maxRepeat) maxRepeat = v;
    if (maxRepeat >= 50 && maxRepeat / assertionShapes.length >= 0.7) {
      findings.push({ kind: "identical-assertion-copypasta", count: maxRepeat });
    }
  }

  const itCount = (content.match(/\bit\s*\(/g) || []).length;
  return {
    findings,
    itCount,
    suspicious: findings.length > 0,
  };
}

// ─── Critical domains (ALWAYS require real tests, regardless of goal) ─────
//
// These 7 surfaces are PRISM's business-critical output. Mocking the SUT
// here isn't "a shortcut" — it invalidates the whole test, because the point
// of these tests is to verify real physics/business/output correctness.
//
// Classification fires if EITHER the test-file PATH matches OR the test
// content IMPORTS a qualifying module. Either signal flips the file into
// "critical-domain mode" where ≥2 heavy mocks or any mass-generation is a
// hard block regardless of the active goal.

export const CRITICAL_DOMAINS = [
  {
    id: "calculator-cutting-variability",
    label: "cutting-parameter calculator + variability",
    // filename/path signal on the TEST file itself
    pathRe: /(speed[-_]?feed|cuttingforce|cutting[-_]?param|kienzle|taylor|calculator|variability|stochastic|monte[-_]?carlo|uncertainty)/i,
    // import-from signal: SUT engine module name contains any of these
    importRe: /from\s+['"][^'"]*(SpeedFeed|Kienzle|Taylor|CuttingForce|Calculator|Variability|Stochastic|MonteCarlo|Uncertainty|VariabilityEnvelope|VariabilitySource)[^'"]*['"]/,
    // route/dispatcher signal — test hits a known dispatcher action
    dispatcherRe: /dispatchers\/(calc|speedfeed|cuttingForce|variability)Dispatcher|routes\/(speedfeed|calc)\b/i,
  },
  {
    id: "cam-programming",
    label: "CAM programming",
    pathRe: /(?:^|[\/\\])(cam|toolpath|mastercam|hypermill|solidcam|powermill|nx[-_]?cam|catia[-_]?cam|cimatron|topsolid|worknc|camworks|edgecam|esprit|gibbscam|sprutcam|tebis|bobcad)[-_a-z0-9]*\.(?:test|spec)\./i,
    importRe: /from\s+['"][^'"]*(CAM|Toolpath|Mastercam|HyperMill|SolidCam|PowerMill|NXCam|CatiaCam|CAMStrategy|CAMSafety|CAMBridge|CAMAddin|CAMExport)[^'"]*['"]/,
    dispatcherRe: /dispatchers\/cam(?:[A-Z]\w+)?Dispatcher|routes\/cam\b/,
  },
  {
    id: "wedm-programming",
    label: "wire EDM programming",
    pathRe: /(?:^|[\/\\])(wedm|wire[-_]?edm|wireedm|sinker|edm)[-_a-z0-9]*\.(?:test|spec)\./i,
    importRe: /from\s+['"][^'"]*(WEDM|WireEDM|SinkerEDM|EDMProgram|EDMPost|EDMCuttingParam|EDMDrawing|OneClickWEDM)[^'"]*['"]/,
    dispatcherRe: /dispatchers\/(edm|wedm)Dispatcher|routes\/(edm|wedm)\b/i,
  },
  {
    id: "post-processor-generation",
    label: "post-processor generation",
    pathRe: /(?:^|[\/\\])(post[-_]?processor|postgen|post[-_]?generator|masterpost|ppg|post[-_]?output|gcode[-_]?gen|post[-_]?verif)[-_a-z0-9]*\.(?:test|spec)\./i,
    importRe: /from\s+['"][^'"]*(PostProcessor|PostGenerator|MasterPost|PPGenerator|PPEndToEnd|PostProcessorVerification|PostProcessorAnalyzer|PostProcessorAutopilot|RLPostProcessor|LathePostProcessor|MasterPostGen)[^'"]*['"]/,
    dispatcherRe: /dispatchers\/(pp|postprocessor|post)Dispatcher|routes\/(ppg|post)\b/i,
  },
  {
    id: "post-output-validation",
    label: "post-processor G-code output validation",
    // Specifically tests that ASSERT against post-processor OUTPUT (rendered G-code).
    // The filename alone may overlap with "post-processor-generation" — we still
    // classify as critical; content check below is what actually gates.
    pathRe: /(?:^|[\/\\])(post[-_]?output|gcode[-_]?(output|validate|verify)|post[-_]?render|post[-_]?diff|post[-_]?compare)[-_a-z0-9]*\.(?:test|spec)\./i,
    importRe: /from\s+['"][^'"]*(GCodeValidator|GCodeVerifier|PostProcessorVerification|PostProcessorAnalyzer|PostOutputDiff)[^'"]*['"]/,
    dispatcherRe: /routes\/(ppg|post)\b.*validate|routes\/gcode\b/i,
  },
  {
    id: "mill-lathe-wedm-wizards",
    label: "Mill / Lathe / Wire-EDM wizards + studios",
    // Accept `mill` / `milling` / `lathe` / `wedm` / `wireedm` / `wire-edm` +
    // role noun (studio/wizard/upload/results/turn) with any intermediate chars.
    pathRe: /(?:^|[\/\\])(?:mill(?:ing)?|lathe|wedm|wire[-_]?edm)[a-z0-9_-]*(?:studio|wizard|upload|results|turn)[a-z0-9_-]*\.(?:test|spec)\./i,
    importRe: /from\s+['"][^'"]*(MillStudio|MillWizard|LatheStudio|LatheWizard|WireEdm(?:Studio|Wizard)|WedmStudio|WedmWizard|MillTurnPage|Milling(?:Wizard|Upload|Results)Page|Lathe(?:Wizard|Upload|Results)Page|WireEdm(?:Wizard|Upload|Results)Page)[^'"]*['"]/,
    // Also catches test files that target the web studio pages.
    webPageRe: /web\/src\/pages\/(Milling(?:Wizard|Upload|Results)|Lathe(?:Studio|Wizard|Upload|Results)|WireEdm(?:Studio|Wizard|Upload|Results)|MillTurn)Page/i,
  },
  {
    id: "shop-business-erp",
    label: "shop / business management / ERP",
    pathRe: /(?:^|[\/\\])(shop|business|erp|quote|invoice|schedule|inventory|customer|vendor|order|payroll|employee|job[-_]?shop|work[-_]?order|material[-_]?stock|tool[-_]?crib)[-_a-z0-9]*\.(?:test|spec)\./i,
    importRe: /from\s+['"][^'"]*(Shop|Business|ERP|E2Shop|MultiERP|Quote|Invoice|Schedule|Inventory|Customer|Vendor|Order|Payroll|Employee|JobShopScheduling|WorkOrder|MaterialStock|ToolCrib|ShopFloor|ShopConfig|ShopState|ShopRepository)[^'"]*['"]/,
    dispatcherRe: /dispatchers\/(business|erp|shop|operatingSystem|scheduling)Dispatcher|routes\/(erp|shop|business|quote|invoice|schedule)\b/i,
  },
];

/**
 * Classify which critical domain(s) a test file belongs to. A file belongs to
 * a domain if its path matches pathRe OR its content matches importRe OR
 * dispatcherRe OR webPageRe. Returns an array (a file can cover multiple).
 */
export function classifyCriticalDomain(filePath = "", content = "") {
  const norm = String(filePath).replace(/\\/g, "/").toLowerCase();
  const hits = [];
  for (const d of CRITICAL_DOMAINS) {
    const byPath = d.pathRe && d.pathRe.test(norm);
    const byImport = d.importRe && d.importRe.test(content);
    const byDisp = d.dispatcherRe && d.dispatcherRe.test(content);
    const byWeb = d.webPageRe && d.webPageRe.test(content);
    if (byPath || byImport || byDisp || byWeb) {
      hits.push({
        id: d.id,
        label: d.label,
        trigger: byPath ? "path" : byImport ? "import" : byDisp ? "dispatcher" : "webPage",
      });
    }
  }
  return hits;
}

/**
 * Hard-block check for critical domains. Fires independently of goal intent:
 *   - ≥2 heavy mocks AND 0 real-IO markers  → block ("domain mocked SUT")
 *   - any mass-generation pattern            → block ("domain mass-synthetic")
 *
 * Returns { block: boolean, reason: string | null, domains, mocks, synth }.
 */
export function detectCriticalDomainViolation({ filePath = "", content = "" } = {}) {
  const domains = classifyCriticalDomain(filePath, content);
  if (domains.length === 0) {
    return { block: false, reason: null, domains: [] };
  }
  const mocks = detectHeavyMocking(content);
  const synth = detectSyntheticGeneration(content);

  const reasons = [];

  // Threshold: ≥2 heavy mocks with no real-IO is a hard block in critical domains.
  // (A single mock of a clock/logger is tolerated; two+ is synthetic-SUT.)
  if (mocks.total >= 2 && mocks.realIoHits === 0) {
    const top = mocks.breakdown.slice(0, 3).map(b => `${b.label}×${b.count}`).join(", ");
    reasons.push(
      `CRITICAL DOMAIN MOCKED SUT: file covers ${domains.map(d => d.label).join(" + ")}, ` +
      `but has ${mocks.total} mock constructs (${top}) and zero real-I/O markers ` +
      `(spawn/exec/fetch/fs). Domain tests must exercise the real subject-under-test.`
    );
  }

  // Any mass-synthetic generation in a critical domain is a hard block — no
  // index-varied template counts as coverage for calculators/CAM/EDM/post/shop.
  if (synth.suspicious) {
    const kinds = synth.findings.map(f => `${f.kind}(${f.count})`).join(", ");
    reasons.push(
      `CRITICAL DOMAIN MASS-SYNTHETIC: file covers ${domains.map(d => d.label).join(" + ")}, ` +
      `but generates tests via ${kinds}. Domain tests must exercise distinct real inputs, ` +
      `not a templated index loop.`
    );
  }

  if (reasons.length === 0) {
    return { block: false, reason: null, domains, mocks, synth };
  }

  return {
    block: true,
    reason: reasons.join(" "),
    domains,
    mocks,
    synth,
  };
}

/**
 * Task-context mismatch: active goal asserts live / real / integration intent,
 * but the test file is primarily a mock/stub construction.
 *
 * Fails open (returns { mismatch: false }) if we can't read the goal — better
 * to under-block than to break legitimate dev when state files are missing.
 */
export function detectTaskContextMismatch({ content = "", goal = null } = {}) {
  const g = goal ?? readCurrentGoal();
  const intent = classifyGoalIntent(g.combined || "");
  if (!intent.isLive) {
    return { mismatch: false, reason: null, intent, goal: g };
  }

  const mocks = detectHeavyMocking(content);
  const itCount = (content.match(/\bit\s*\(/g) || []).length;

  // Heuristic: "live intent" AND (mocks ≥ 3 OR mocks ≥ itCount*0.5) AND realIoHits == 0 → hard mismatch.
  const mocksPerIt = itCount > 0 ? mocks.total / itCount : mocks.total;
  const heavy = mocks.total >= 3 || mocksPerIt >= 0.5;
  const lacksRealIo = mocks.realIoHits === 0;

  if (heavy && lacksRealIo) {
    const topLabels = mocks.breakdown.slice(0, 3).map(b => `${b.label}×${b.count}`).join(", ");
    return {
      mismatch: true,
      reason: `Goal asserts ${intent.keywords.slice(0, 3).join(", ")} intent but test relies on ${mocks.total} mock constructs (${topLabels}) with zero real-I/O markers (spawn/exec/fetch/fs). A "live" task must exercise the real subject-under-test, not a mocked stand-in.`,
      intent,
      mocks,
      goal: g,
    };
  }

  return { mismatch: false, reason: null, intent, mocks, goal: g };
}

const CODE_FILE_RE = /\.[cm]?[jt]sx?$/i;
const ROUTE_PARSE_MARKERS = ["getSearchParams(", "new URL("];
const ROUTE_PARAM_MARKERS = [
  "originSource",
  "focusJobId",
  "focusPacketId",
  "machineId",
  "machineFamilyId",
  "machineManufacturer",
  "partClassId",
  "toolholderId",
  "toolingPackageId",
  "fixtureId",
  "stockId",
  "cadSourceId",
];
const ROUTE_SOURCE_MARKERS = [
  "buildWorkflowPath(",
  "buildShopFloorPath(",
  "buildCapturePath(",
  "originSource",
  "focusJobId",
  "focusPacketId",
  "/print-to-cnc",
  "Open Print to CNC",
];

function normalizePath(filePath = "") {
  return filePath
    .replace(/\\/g, "/")
    .replace(/^([A-Za-z]):/i, (_, drive) => `/${drive.toLowerCase()}`)
    .replace(/^\/h\/prism\//i, "")
    .replace(/^\/h\/PRISM\//i, "")
    .replace(/^H:\/PRISM\//i, "")
    .replace(/^H:\/prism\//i, "")
    .replace(/^\/+/, "");
}

function unique(values) {
  return [...new Set(values)];
}

function basenameWithoutExtension(filePath) {
  const parsed = path.posix.parse(normalizePath(filePath));
  return parsed.name.replace(/\.(test|spec)$/i, "");
}

function normalizeNameToken(value = "") {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function isTestFile(filePath) {
  return TEST_FILE_RE.test(normalizePath(filePath));
}

function isCodeFile(filePath) {
  const normalized = normalizePath(filePath);
  const insidePrimarySurface =
    normalized.startsWith("mcp-server/")
    || normalized.startsWith("web/")
    || normalized === ".claude/helpers/lib/test-legitimacy-core.mjs";
  return insidePrimarySurface && CODE_FILE_RE.test(normalized) && !TEST_FILE_RE.test(normalized) && !normalized.endsWith(".d.ts");
}

function tokenizeCommand(command = "") {
  const matches = command.match(/"[^"]+"|'[^']+'|[^\s]+/g) ?? [];
  return matches.map((token) => token.replace(/^['"]|['"]$/g, ""));
}

function extractExplicitTestTargets(command = "") {
  return unique(
    tokenizeCommand(command)
      .filter((token) => TEST_FILE_RE.test(token))
      .map(normalizePath),
  );
}

function resolveExplicitTargets(targets, repoFiles) {
  return unique(
    targets.flatMap((target) => {
      const directMatch = repoFiles.find((filePath) => filePath === target);
      if (directMatch) return [directMatch];
      const suffixMatch = repoFiles.find((filePath) => filePath.endsWith(`/${target}`) || filePath.endsWith(target));
      return suffixMatch ? [suffixMatch] : [target];
    }),
  );
}

function countMarkers(content, markers) {
  return markers.filter((marker) => content.includes(marker)).length;
}

export function hasRouteContinuityEvidence(content = "") {
  const parsesRoute = ROUTE_PARSE_MARKERS.some((marker) => content.includes(marker));
  const paramAssertions = countMarkers(content, ROUTE_PARAM_MARKERS);
  return parsesRoute && paramAssertions >= 2;
}

export function appearsRouteSensitive(filePath, content = "") {
  const normalized = normalizePath(filePath);
  if (normalized === ".claude/helpers/lib/test-legitimacy-core.mjs") {
    return false;
  }
  if (normalized.includes("web/src/pages/")) return true;
  if (normalized.includes("web/src/utils/") || normalized.includes("web/src/features/")) {
    return ROUTE_SOURCE_MARKERS.some((marker) => content.includes(marker) || normalized.toLowerCase().includes(marker.toLowerCase()));
  }
  return ROUTE_SOURCE_MARKERS.some((marker) => content.includes(marker));
}

function matchesSourceBasename(testPath, sourcePath) {
  const testBase = normalizeNameToken(basenameWithoutExtension(testPath));
  const sourceBase = normalizeNameToken(basenameWithoutExtension(sourcePath));
  return testBase === sourceBase || testBase.startsWith(sourceBase) || testBase.includes(sourceBase);
}

function collectSourceMatches(sourcePath, candidateTests) {
  return candidateTests.filter((testPath) => matchesSourceBasename(testPath, sourcePath));
}

function summarizeSource(sourcePath) {
  const normalized = normalizePath(sourcePath);
  const base = path.posix.basename(normalized);
  const dir = path.posix.dirname(normalized).split("/").slice(-2).join("/");
  return `${dir}/${base}`;
}

export function analyzeTestLegitimacy({
  command = "",
  changedFiles = [],
  repoFiles = [],
  readFile = () => "",
}) {
  const normalizedChanged = unique(changedFiles.map(normalizePath).filter(Boolean));
  const normalizedRepoFiles = unique(repoFiles.map(normalizePath).filter(Boolean));
  const changedSourceFiles = normalizedChanged.filter(isCodeFile);
  const changedTestFiles = normalizedChanged.filter(isTestFile);

  if (!/(vitest|npm\s+(run\s+)?test)/i.test(command)) {
    return {
      decision: "allow",
      reasons: [],
      summary: "No test command detected.",
    };
  }

  if (changedSourceFiles.length === 0 && changedTestFiles.length === 0) {
    return {
      decision: "allow",
      reasons: [],
      summary: "No changed source or test files detected.",
    };
  }

  const explicitTargets = resolveExplicitTargets(extractExplicitTestTargets(command), normalizedRepoFiles);
  const allKnownTests = unique([...normalizedRepoFiles.filter(isTestFile), ...changedTestFiles]);
  const fallbackTargets =
    explicitTargets.length > 0
      ? unique([...explicitTargets, ...changedTestFiles])
      : unique([...changedTestFiles, ...allKnownTests]);
  const explicitlyMatchedSources =
    explicitTargets.length > 0
      ? changedSourceFiles.filter((sourcePath) => collectSourceMatches(sourcePath, fallbackTargets).length > 0)
      : [];
  const analyzedSourceFiles = explicitlyMatchedSources.length > 0 ? explicitlyMatchedSources : changedSourceFiles;
  const reasons = [];

  for (const sourcePath of analyzedSourceFiles) {
    const sourceContent = readFile(sourcePath) ?? "";
    const routeSensitive = appearsRouteSensitive(sourcePath, sourceContent);
    const directMatches = collectSourceMatches(sourcePath, fallbackTargets);
    const matchingTests =
      directMatches.length > 0
        ? directMatches
        : routeSensitive
          ? fallbackTargets.filter((testPath) => hasRouteContinuityEvidence(readFile(testPath) ?? ""))
          : [];

    if (matchingTests.length === 0) {
      reasons.push(
        `MISSING TEST COVERAGE: ${summarizeSource(sourcePath)} has no matching test in the pending or targeted set.`,
      );
      continue;
    }

    if (routeSensitive) {
      const continuityTests = matchingTests.filter((testPath) => hasRouteContinuityEvidence(readFile(testPath) ?? ""));
      if (continuityTests.length === 0) {
        reasons.push(
          `UPSTREAM/DOWNSTREAM COVERAGE MISSING: ${summarizeSource(sourcePath)} is route-sensitive, but no targeted test parses URLs and asserts concrete continuity params.`,
        );
      }
    }
  }

  for (const testPath of changedTestFiles) {
    const content = readFile(testPath) ?? "";
    if (!content) continue;
    const routeRelated = ROUTE_SOURCE_MARKERS.some((marker) => content.includes(marker));
    if (routeRelated && !hasRouteContinuityEvidence(content)) {
      reasons.push(
        `WEAK ROUTE TEST: ${summarizeSource(testPath)} touches workflow continuity but does not parse the rendered URL and assert concrete params.`,
      );
    }
  }

  if (reasons.length > 0) {
    return {
      decision: "block",
      reasons,
      summary: `${reasons.length} legitimacy issue(s) found.`,
    };
  }

  const routeSensitiveCount = analyzedSourceFiles.filter((filePath) => appearsRouteSensitive(filePath, readFile(filePath) ?? "")).length;
  const summaryParts = [
    `${analyzedSourceFiles.length} changed source file(s)`,
    `${Math.max(fallbackTargets.length, changedTestFiles.length)} candidate test file(s)`,
  ];
  if (routeSensitiveCount > 0) {
    summaryParts.push(`${routeSensitiveCount} route-sensitive surface(s) covered with URL-param assertions`);
  }

  return {
    decision: "allow",
    reasons: [],
    summary: summaryParts.join(", "),
  };
}

// --- Test RIGOR floor -- shallow / happy-path-only critical-domain tests -----
//
// test-legitimacy blocks FAKE tests (placeholder / synthetic / mocked-SUT).
// This is the ORTHOGONAL axis: a test can be 100% real yet SHALLOW -- an "easy
// test just to say you passed" -- exercising only the happy path with no
// failure-mode or adversarial coverage. For PRISM's 7 CRITICAL DOMAINS (whose
// output drives real machines / real money) R15 requires happy + >=3 failure +
// >=2 adversarial. A critical-domain test that probes NEITHER an error path NOR
// an edge input verifies only that the sunny case works -- incomplete by
// doctrine. Scoped to critical domains (not all ~6,000 test files) to keep the
// false-positive rate near-zero; calibrated against the live corpus (see
// scripts/measure-test-rigor-corpus.mjs).

// "Strong assertion" matchers -- a real reference/behavior check (not presence).
// Includes Testing-Library DOM matchers so React page tests are not under-counted
// (toBeInTheDocument/toHaveValue/... are the behavioral assertions for UI tests).
const RIGOR_STRONG_ASSERTION_RE = /\.(?:toEqual|toBe|toStrictEqual|toMatchObject|toMatchSnapshot|toMatchInlineSnapshot|toContain|toContainEqual|toMatch|toHaveLength|toBeCloseTo|toBeGreaterThan(?:OrEqual)?|toBeLessThan(?:OrEqual)?|toHaveProperty|toBeInstanceOf|toBeNull|toBeNaN|toThrow|toThrowError|toHaveBeenCalled(?:With|Times)?|toHaveReturned(?:With)?|toBeInTheDocument|toBeVisible|toHaveValue|toHaveTextContent|toHaveAttribute|toHaveClass|toBeChecked|toBeDisabled|toBeEnabled|toHaveStyle|toHaveFocus)\b/g;

// Logical test cases: it( / test( and it.each / test.each. Non-backtracking --
// counts the case-opening token, never spans the body.
const RIGOR_CASE_RE = /\b(?:it|test)\s*\.\s*each\b|\b(?:it|test)\s*\(/g;

// FAILURE-MODE evidence: the test verifies an error / rejection / NaN path.
const RIGOR_FAILURE_MODE_RE = /\.toThrow(?:Error)?\s*\(|\.rejects\b|\btoBeNaN\s*\(|expect\s*\(\s*(?:\(\s*\)\s*=>|async\b)|\.toBeInstanceOf\s*\(\s*(?:Error|TypeError|RangeError|SyntaxError)\b|instanceof\s+(?:Error|TypeError|RangeError)\b/;

// ADVERSARIAL-input evidence: edge / hostile literals used as inputs.
// Deliberately EXCLUDES the ubiquitous null/undefined/'' -- they appear in
// nearly every test and would make the floor trivially satisfiable (a false
// NEGATIVE that lets shallow tests through).
const RIGOR_ADVERSARIAL_RE = /\b(?:NaN|Infinity|Number\.(?:MAX_SAFE_INTEGER|MAX_VALUE|MIN_VALUE|EPSILON|POSITIVE_INFINITY|NEGATIVE_INFINITY)|overflow|underflow|malformed|out[-_ ]?of[-_ ]?range|out[-_ ]?of[-_ ]?bounds|boundary|adversarial|oversize)\b|[^.\w](?:invalid|negative)\b/i;

/**
 * Score the structural rigor of a test file. Pure -- no IO. Returns the raw
 * signals so callers / calibration can apply their own thresholds.
 */
export function scoreTestRigor(content = "") {
  const text = String(content);
  const caseCount = (text.match(RIGOR_CASE_RE) || []).length;
  const strongAssertions = (text.match(RIGOR_STRONG_ASSERTION_RE) || []).length;
  const hasFailureMode = RIGOR_FAILURE_MODE_RE.test(text);
  const hasAdversarialInput = RIGOR_ADVERSARIAL_RE.test(text);
  return { caseCount, strongAssertions, hasFailureMode, hasAdversarialInput };
}

// ADVISORY thresholds (NOT a hard block). Calibrated against the live corpus
// (scripts/measure-test-rigor-corpus.mjs, 2026-06-24): the broad "no failure-mode
// AND no adversarial" rule trips 42.6% of critical-domain tests -- positive
// reference-value tests (the R9 gold standard) and regression-locks are NOT
// shallow, so it is UNSHIPPABLE as a block. The regex layer cannot separate
// "thin but valuable" (a 2-assert regression lock) from "thin and lazy" without
// false-positives, so this layer ADVISES only; the hard semantic call is the AI
// rigor judge (octopus/ollama). The thin band (cases<=3 AND asserts<=6) narrows
// the advisory to ~25 corpus files so the nudge stays sharp and low-noise.
const RIGOR_MIN_CASES = 1;
const RIGOR_THIN_MAX_CASES = 3;
const RIGOR_THIN_MAX_ASSERTS = 6;

/**
 * Detect a SHALLOW critical-domain test: a real test for one of the 7 critical
 * domains that exercises ONLY the happy path (no failure-mode assertion AND no
 * adversarial input) AND is structurally THIN (few cases, few assertions).
 *
 * ADVISORY ONLY -- `block` is always false. The regex layer cannot tell a thin
 * regression-lock (valuable) from a thin happy-path stub (lazy) without
 * unacceptable false-positives; it nudges, the AI judge decides. Non-critical
 * files never trip, so the ~6,000-file general corpus is untouched.
 *
 * Returns { block:false, advise:boolean, reason, domains, rigor }.
 */
export function detectShallowCriticalTest({ filePath = "", content = "" } = {}) {
  const domains = classifyCriticalDomain(filePath, content);
  if (domains.length === 0) return { block: false, advise: false, reason: null, domains: [] };

  const rigor = scoreTestRigor(content);
  const happyPathOnly = !rigor.hasFailureMode && !rigor.hasAdversarialInput;
  const thin = rigor.caseCount <= RIGOR_THIN_MAX_CASES && rigor.strongAssertions <= RIGOR_THIN_MAX_ASSERTS;

  if (rigor.caseCount >= RIGOR_MIN_CASES && happyPathOnly && thin) {
    return {
      block: false,
      advise: true,
      reason:
        `THIN CRITICAL-DOMAIN TEST (advisory): file covers ${domains.map((d) => d.label).join(" + ")} ` +
        `with only ${rigor.caseCount} case(s) and ${rigor.strongAssertions} assertion(s), exercising ` +
        `the happy path only -- no failure-mode assertion (toThrow/rejects/NaN) and no adversarial ` +
        `input (NaN/Infinity/boundary/overflow/invalid). Critical-domain output drives real ` +
        `machines/money; confirm it probes at least one error path and one edge input ` +
        `(R15 floor: happy + >=3 failure modes + >=2 adversarial). If this is an intentional ` +
        `narrow regression-lock or render-smoke, ignore.`,
      domains,
      rigor,
    };
  }

  return { block: false, advise: false, reason: null, domains, rigor };
}
