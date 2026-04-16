import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import fs from "node:fs/promises";
import { PATHS } from "../constants.js";
import { atomicWrite } from "../utils/atomicWrite.js";
import type {
  CalculatorCadCamLibraryFinding,
  CalculatorCadCamSoftwareFamily,
  CalculatorToolCribImportRecord,
  CalculatorToolCribSourceType,
  CalculatorToolCribSuggestion,
  CalculatorToolCribSuggestionKind,
  CalculatorToolCribWorkspace,
  IngestCalculatorToolCribDocumentInput,
  RunCalculatorToolCribLocalScanInput,
} from "../contracts/calculatorToolCrib.js";

interface CalculatorToolCribStore {
  version: number;
  workspaces: Record<string, CalculatorToolCribWorkspace>;
}

interface ScanScriptEnvelope {
  findings?: Array<{
    softwareFamily?: CalculatorCadCamSoftwareFamily;
    softwareLabel?: string;
    path?: string;
    confidence?: number;
    matchedBy?: string[];
  }>;
}

interface RedactionOutcome {
  text: string;
  sourceLabel: string;
  filename: string;
  redactedFields: string[];
  replacementCount: number;
  applied: boolean;
  note: string;
}

const STORE_VERSION = 1;
const DEFAULT_WORKSPACE_ID = "calculator";
const MAX_IMPORTS = 12;
const MAX_SUGGESTIONS_PER_IMPORT = 16;
const MAX_LIBRARIES = 24;
const PRINT_LIKE_EXTENSIONS = new Set([
  ".pdf",
  ".dxf",
  ".dwg",
  ".step",
  ".stp",
  ".iges",
  ".igs",
  ".png",
  ".jpg",
  ".jpeg",
  ".tif",
  ".tiff",
]);

const TOOLING_KEYWORDS = [
  "tool",
  "insert",
  "holder",
  "collet",
  "end mill",
  "drill",
  "tap",
  "reamer",
  "facemill",
  "face mill",
  "boring bar",
  "shell mill",
  "arbor",
  "shrink fit",
  "hydraulic chuck",
  "capto",
  "cat40",
  "cat 40",
  "bt40",
  "bt 40",
  "hsk",
];

const FIXTURE_KEYWORDS = [
  "fixture",
  "vise",
  "vice",
  "clamp",
  "jaws",
  "tombstone",
  "pallet",
  "workholding",
];

const TOOLING_VENDORS = [
  "Sandvik",
  "Kennametal",
  "Seco",
  "Walter",
  "Iscar",
  "Mitsubishi",
  "Tungaloy",
  "Dormer",
  "YG-1",
  "Guhring",
  "Harvey",
  "Helical",
  "Ceratizit",
  "Schunk",
  "BIG DAISHOWA",
  "Haimer",
  "Rego-Fix",
  "Techniks",
  "Parlec",
  "OSG",
  "Emuge",
  "Allied",
  "Sumitomo",
];

const GENERIC_PART_TOKENS = new Set([
  "tool",
  "tools",
  "holder",
  "holders",
  "insert",
  "inserts",
  "face",
  "mill",
  "drill",
  "tap",
  "reamer",
  "supplier",
  "customer",
  "part",
  "number",
  "qty",
  "quantity",
  "each",
  "pack",
  "box",
]);

const TOOLING_VENDOR_TOKEN_SET = new Set(TOOLING_VENDORS.map((vendor) => vendor.toLowerCase()));

const REDACTION_NOTE =
  "Customer contact and title-block details were auto-redacted before this intake was stored.";

function resolveStorePath(): string {
  return process.env.PRISM_CALCULATOR_TOOL_CRIB_STORE_PATH
    || path.join(
      PATHS.STATE_DIR,
      "operating-system",
      "calculator-tool-crib",
      "workspace.json",
    );
}

function buildWorkspaceKey(userId: string, workspaceId?: string): string {
  return `${userId.trim()}::${workspaceId?.trim() || DEFAULT_WORKSPACE_ID}`;
}

function buildEmptyWorkspace(userId: string, workspaceId?: string): CalculatorToolCribWorkspace {
  return {
    userId: userId.trim(),
    workspaceId: workspaceId?.trim() || DEFAULT_WORKSPACE_ID,
    summary: "No shop tooling intake imported yet. Upload a PO, invoice, RFQ, or email, or run a consented local CAD/CAM scan.",
    lastUpdatedAt: null,
    imports: [],
    partNumbers: [],
    toolingPartNumbers: [],
    discoveredLibraries: [],
  };
}

function uniqueStrings(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const value of values) {
    const normalized = value?.trim();
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    result.push(normalized);
  }
  return result;
}

function clampConfidence(value: number): number {
  if (!Number.isFinite(value)) {
    return 0.45;
  }
  return Math.min(0.99, Math.max(0.2, Number(value.toFixed(2))));
}

function normalizeBinaryText(buffer: Buffer): string {
  return buffer
    .toString("latin1")
    .replace(/[^\x20-\x7E\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeDocumentText(input: IngestCalculatorToolCribDocumentInput): string {
  if (typeof input.contentText === "string" && input.contentText.trim().length > 0) {
    return input.contentText.replace(/\r\n/g, "\n");
  }

  if (typeof input.contentBase64 === "string" && input.contentBase64.trim().length > 0) {
    try {
      const buffer = Buffer.from(input.contentBase64, "base64");
      return normalizeBinaryText(buffer);
    } catch {
      return "";
    }
  }

  return "";
}

function replaceAndCount(
  input: string,
  pattern: RegExp,
  replacement: string | ((...args: any[]) => string),
): { value: string; count: number } {
  let count = 0;
  const value = input.replace(pattern, (...args) => {
    count += 1;
    return typeof replacement === "function"
      ? replacement(...args)
      : replacement;
  });
  return { value, count };
}

function isPrintLikeFilename(filename: string): boolean {
  return PRINT_LIKE_EXTENSIONS.has(path.extname(filename).toLowerCase());
}

function inferRedactedSourceLabel(input: IngestCalculatorToolCribDocumentInput): string {
  const sourceLabel = input.sourceType.replace(/_/g, " ");
  if (isPrintLikeFilename(input.filename)) {
    return `${sourceLabel} print intake`;
  }
  return `${sourceLabel} intake`;
}

function redactStoredFilename(filename: string, sourceType: CalculatorToolCribSourceType): string {
  const extension = path.extname(filename);
  if (isPrintLikeFilename(filename)) {
    return `redacted-print${extension}`;
  }
  const stem = `redacted-${sourceType.replace(/_/g, "-")}`;
  return extension ? `${stem}${extension}` : stem;
}

function redactSensitiveDocumentText(
  input: IngestCalculatorToolCribDocumentInput,
  rawText: string,
): RedactionOutcome {
  const redactedFields: string[] = [];
  let replacementCount = 0;
  let text = rawText;
  let sourceLabel = (input.title?.trim() || input.filename).trim();
  let filename = input.filename.trim();

  const recordField = (field: string, count: number) => {
    if (count <= 0) {
      return;
    }
    replacementCount += count;
    if (!redactedFields.includes(field)) {
      redactedFields.push(field);
    }
  };

  const labeledRedactions: Array<{
    field: string;
    pattern: RegExp;
    replacement: (...args: any[]) => string;
  }> = [
    {
      field: "email headers",
      pattern: /(^|\n)\s*(from|to|cc|bcc|reply-to)\s*:\s*([^\n]+)/gim,
      replacement: (_match, prefix: string, label: string) => `${prefix}${label}: [redacted ${label.toLowerCase()}]`,
    },
    {
      field: "customer contacts",
      pattern: /(^|\n)\s*(customer(?!\s+(?:part|drawing|rfq|quote|item|p\/n|pn))(?:\s+name|\s+company)?|company|contact|buyer|attn|attention|ship to|bill to|sold to|remit to|address|location)\s*[:=-]\s*([^\n]+)/gim,
      replacement: (_match, prefix: string, label: string) => `${prefix}${label}: [redacted ${label.toLowerCase()}]`,
    },
    {
      field: "customer channels",
      pattern: /(^|\n)\s*(email|e-mail|phone|tel|telephone|fax|website|web(?:site)?|url)\s*[:=-]\s*([^\n]+)/gim,
      replacement: (_match, prefix: string, label: string) => `${prefix}${label}: [redacted ${label.toLowerCase()}]`,
    },
  ];

  for (const rule of labeledRedactions) {
    const result = replaceAndCount(text, rule.pattern, rule.replacement);
    text = result.value;
    recordField(rule.field, result.count);
  }

  const tokenRedactions: Array<{
    field: string;
    pattern: RegExp;
    replacement: string;
  }> = [
    {
      field: "email addresses",
      pattern: /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi,
      replacement: "[redacted email]",
    },
    {
      field: "phone numbers",
      pattern: /\b(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}(?:\s*(?:x|ext\.?)\s*\d+)?\b/gi,
      replacement: "[redacted phone]",
    },
    {
      field: "web domains",
      pattern: /\b(?:https?:\/\/|www\.)\S+\b/gi,
      replacement: "[redacted site]",
    },
    {
      field: "domain references",
      pattern: /\b[A-Z0-9.-]+\.(?:com|net|org|io|biz|co|us|mx|br|de|fr|jp|kr|ru)\b/gi,
      replacement: "[redacted domain]",
    },
  ];

  for (const rule of tokenRedactions) {
    const result = replaceAndCount(text, rule.pattern, rule.replacement);
    text = result.value;
    recordField(rule.field, result.count);
  }

  const likelySensitiveTitle = [sourceLabel, filename].some((value) =>
    /\b(?:attn|attention|customer|ship to|bill to|reply-to)\b/i.test(value)
    || /@/.test(value)
    || /\b(?:https?:\/\/|www\.)/i.test(value),
  );

  const containsNonVendorCompanyHint = [sourceLabel, filename].some((value) => {
    const normalized = value.toLowerCase();
    if ([...TOOLING_VENDOR_TOKEN_SET].some((vendor) => normalized.includes(vendor))) {
      return false;
    }
    return /\b(?:inc|inc\.|llc|ltd|ltd\.|corp|corp\.|corporation|company|co\.|gmbh|s\.a\.)\b/i.test(value);
  });

  if ((likelySensitiveTitle || containsNonVendorCompanyHint) && !(sourceLabel === input.sourceType)) {
    sourceLabel = inferRedactedSourceLabel(input);
    filename = redactStoredFilename(input.filename, input.sourceType);
    recordField("document labels", 1);
  }

  const applied = replacementCount > 0;

  return {
    text,
    sourceLabel,
    filename,
    redactedFields,
    replacementCount,
    applied,
    note: applied ? REDACTION_NOTE : "",
  };
}

function vendorFromText(text: string): string | undefined {
  const haystack = text.toLowerCase();
  return TOOLING_VENDORS.find((vendor) => haystack.includes(vendor.toLowerCase()));
}

function buildPartNumberCandidates(text: string, filename: string): string[] {
  const matches: string[] = [];
  const labeledPattern =
    /\b(?:customer\s+)?(?:part|drawing|rfq|quote|item|p\/n|pn)(?:\s*(?:number|no\.?|#))?\s*[:=-]?\s*([A-Z0-9][A-Z0-9._/-]{2,})/gi;

  for (const match of text.matchAll(labeledPattern)) {
    matches.push(match[1]);
  }

  const filenameTokens = filename.match(/[A-Z0-9][A-Z0-9._/-]{3,}/g) ?? [];
  matches.push(...filenameTokens);

  return uniqueStrings(matches)
    .filter((value) => /[A-Z]/.test(value))
    .slice(0, 8);
}

function classifySuggestionKind(context: string): CalculatorToolCribSuggestionKind {
  const haystack = context.toLowerCase();
  if (FIXTURE_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return "fixture_part";
  }
  if (haystack.includes("holder") || haystack.includes("collet") || haystack.includes("chuck") || haystack.includes("arbor")) {
    return "holder_part";
  }
  if (haystack.includes("part number") || haystack.includes("drawing") || haystack.includes("customer part")) {
    return "part_number";
  }
  return "tooling_part";
}

function scoreToolingPartCandidate(candidate: string, manufacturer?: string): number {
  const normalized = candidate.trim();
  const lower = normalized.toLowerCase();

  if (!normalized || lower.includes("@")) {
    return Number.NEGATIVE_INFINITY;
  }

  let score = 0;
  const hasLetters = /[a-z]/i.test(normalized);
  const hasDigits = /\d/.test(normalized);

  if (hasLetters && hasDigits) {
    score += 6;
  } else if (hasLetters) {
    score += 1;
  } else if (hasDigits) {
    score -= 3;
  }

  if (/[-_/]/.test(normalized)) {
    score += 2;
  }
  if (normalized.length >= 8) {
    score += 2;
  } else if (normalized.length >= 5) {
    score += 1;
  }
  if (/^\d+(?:\.\d+)?$/.test(normalized)) {
    score -= 5;
  }
  if (GENERIC_PART_TOKENS.has(lower)) {
    score -= 6;
  }
  if (manufacturer && lower === manufacturer.toLowerCase()) {
    score -= 4;
  }
  if (!/[A-Z]/.test(normalized)) {
    score -= 1;
  }

  return score;
}

function buildToolingSuggestions(
  text: string,
  sourceType: CalculatorToolCribSourceType,
): CalculatorToolCribSuggestion[] {
  const suggestions: CalculatorToolCribSuggestion[] = [];
  const sourceLines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, 80);

  for (const line of sourceLines) {
    const lower = line.toLowerCase();
    const looksRelevant =
      TOOLING_KEYWORDS.some((keyword) => lower.includes(keyword))
      || FIXTURE_KEYWORDS.some((keyword) => lower.includes(keyword))
      || TOOLING_VENDORS.some((vendor) => lower.includes(vendor.toLowerCase()));

    if (!looksRelevant) {
      continue;
    }

    const partMatches = line.match(/[A-Z0-9][A-Z0-9._/-]{3,}/g) ?? [];
    if (partMatches.length === 0) {
      continue;
    }

    const manufacturer = vendorFromText(line);
    const partNumber = partMatches
      .map((candidate) => ({
        candidate,
        score: scoreToolingPartCandidate(candidate, manufacturer),
      }))
      .sort((left, right) => right.score - left.score)
      .find((entry) => entry.score > 0)?.candidate;
    if (!partNumber) {
      continue;
    }

    const quantityMatch = line.match(/\b(?:qty|quantity|ea|each)\s*[:=-]?\s*(\d+)/i)
      || line.match(/\b(\d+)\s*(?:pcs|pieces|pack|box)\b/i);
    const kind = classifySuggestionKind(line);
    const labelPrefix =
      kind === "holder_part"
        ? "Holder"
        : kind === "fixture_part"
          ? "Fixture"
          : kind === "part_number"
            ? "Part"
            : "Tooling";

    suggestions.push({
      id: `${kind}-${partNumber.toLowerCase()}`,
      kind,
      label: manufacturer ? `${labelPrefix}: ${manufacturer} ${partNumber}` : `${labelPrefix}: ${partNumber}`,
      manufacturer,
      partNumber,
      quantityHint: quantityMatch?.[1],
      confidence: clampConfidence(
        0.54
        + (manufacturer ? 0.14 : 0)
        + (quantityMatch ? 0.08 : 0)
        + (kind !== "tooling_part" ? 0.05 : 0),
      ),
      evidence: line.slice(0, 180),
      action:
        kind === "part_number"
          ? "Attach to the active part and quote context."
          : "Stage into My Shop / tool crib review before promoting to crib stock.",
      sourceType,
    });
  }

  return Object.values(
    suggestions.reduce<Record<string, CalculatorToolCribSuggestion>>((acc, suggestion) => {
      const existing = acc[suggestion.id];
      if (!existing || suggestion.confidence > existing.confidence) {
        acc[suggestion.id] = suggestion;
      }
      return acc;
    }, {}),
  ).slice(0, MAX_SUGGESTIONS_PER_IMPORT);
}

function buildDocumentSummary(
  sourceType: CalculatorToolCribSourceType,
  displayLabel: string,
  suggestions: CalculatorToolCribSuggestion[],
  partNumbers: string[],
  redaction?: RedactionOutcome,
): string {
  const toolingCount = suggestions.filter((suggestion) => suggestion.kind !== "part_number").length;
  const partCount = partNumbers.length;
  const sourceTypeLabel = sourceType.replace(/_/g, " ");
  if (toolingCount === 0 && partCount === 0) {
    const base = `Registered ${displayLabel} (${sourceTypeLabel}) for review. No high-confidence tooling or part numbers were extracted yet.`;
    return redaction?.applied ? `${base} ${redaction.note}` : base;
  }
  const base = `Imported ${displayLabel} (${sourceTypeLabel}) with ${toolingCount} tooling clue${toolingCount === 1 ? "" : "s"} and ${partCount} part number${partCount === 1 ? "" : "s"} for My Shop review.`;
  return redaction?.applied ? `${base} ${redaction.note}` : base;
}

function buildDocumentImportRecord(input: IngestCalculatorToolCribDocumentInput): CalculatorToolCribImportRecord {
  const normalizedText = decodeDocumentText(input);
  const redaction = redactSensitiveDocumentText(input, normalizedText);
  const partNumbers = buildPartNumberCandidates(redaction.text, input.filename);
  const toolingSuggestions = buildToolingSuggestions(redaction.text, input.sourceType);
  const partSuggestions: CalculatorToolCribSuggestion[] = partNumbers
    .filter((partNumber) => !toolingSuggestions.some((suggestion) => suggestion.partNumber === partNumber))
    .map((partNumber) => ({
      id: `part-${partNumber.toLowerCase()}`,
      kind: "part_number",
      label: `Part: ${partNumber}`,
      partNumber,
      confidence: 0.62,
      evidence: `Detected from ${redaction.sourceLabel}`,
      action: "Attach to the active part, quote, or routing context.",
      sourceType: input.sourceType,
    }));

  const suggestions = [...toolingSuggestions, ...partSuggestions].slice(0, MAX_SUGGESTIONS_PER_IMPORT);

  return {
    id: randomUUID(),
    userId: input.userId.trim(),
    workspaceId: input.workspaceId?.trim() || DEFAULT_WORKSPACE_ID,
    sourceType: input.sourceType,
    sourceLabel: redaction.sourceLabel,
    filename: redaction.filename,
    importedAt: new Date().toISOString(),
    status: suggestions.length > 0 ? "ready" : "needs_review",
    summary: buildDocumentSummary(input.sourceType, redaction.sourceLabel, suggestions, partNumbers, redaction),
    suggestions,
    redaction: redaction.applied
      ? {
        applied: true,
        replacementCount: redaction.replacementCount,
        redactedFields: redaction.redactedFields,
        note: redaction.note,
      }
      : undefined,
  };
}

function buildEmptyStore(): CalculatorToolCribStore {
  return {
    version: STORE_VERSION,
    workspaces: {},
  };
}

async function readJsonStore(): Promise<CalculatorToolCribStore> {
  try {
    const raw = await fs.readFile(resolveStorePath(), "utf-8");
    const parsed = JSON.parse(raw) as Partial<CalculatorToolCribStore>;
    return {
      version: STORE_VERSION,
      workspaces: parsed.workspaces ?? {},
    };
  } catch {
    return buildEmptyStore();
  }
}

async function writeJsonStore(store: CalculatorToolCribStore): Promise<void> {
  const target = resolveStorePath();
  await fs.mkdir(path.dirname(target), { recursive: true });
  await atomicWrite(target, JSON.stringify(store, null, 2));
}

function mergeLibraryFindings(
  current: CalculatorCadCamLibraryFinding[],
  incoming: CalculatorCadCamLibraryFinding[],
): CalculatorCadCamLibraryFinding[] {
  const merged = new Map<string, CalculatorCadCamLibraryFinding>();
  for (const finding of [...incoming, ...current]) {
    const key = finding.path.toLowerCase();
    const existing = merged.get(key);
    if (!existing || finding.confidence >= existing.confidence) {
      merged.set(key, finding);
    }
  }
  return [...merged.values()]
    .sort((left, right) => right.confidence - left.confidence || left.softwareLabel.localeCompare(right.softwareLabel))
    .slice(0, MAX_LIBRARIES);
}

function buildWorkspaceSummary(workspace: CalculatorToolCribWorkspace): string {
  const importCount = workspace.imports.length;
  const libraryCount = workspace.discoveredLibraries.length;
  const toolingCount = workspace.toolingPartNumbers.length;
  const partCount = workspace.partNumbers.length;
  return `${importCount} import${importCount === 1 ? "" : "s"} staged, ${toolingCount} tooling part number${toolingCount === 1 ? "" : "s"}, ${partCount} job/part number${partCount === 1 ? "" : "s"}, ${libraryCount} discovered CAD/CAM librar${libraryCount === 1 ? "y" : "ies"}.`;
}

async function runLocalScanScript(input: RunCalculatorToolCribLocalScanInput): Promise<CalculatorCadCamLibraryFinding[]> {
  const scriptPath = path.join(PATHS.MCP_SERVER, "scripts", "scan-local-tooling-databases.mjs");
  const payload = JSON.stringify({
    roots: input.roots,
    maxResults: input.maxResults,
  });

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      cwd: PATHS.PRISM_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `Local tooling scan failed with exit code ${code}`));
        return;
      }

      try {
        const parsed = JSON.parse(stdout) as ScanScriptEnvelope;
        const findings = Array.isArray(parsed.findings) ? parsed.findings : [];
        resolve(
          findings.flatMap((finding) => {
            if (!finding.path || !finding.softwareFamily || !finding.softwareLabel) {
              return [];
            }
            return [
              {
                id: `library-${Buffer.from(finding.path).toString("base64url").slice(0, 24)}`,
                softwareFamily: finding.softwareFamily,
                softwareLabel: finding.softwareLabel,
                path: finding.path,
                confidence: clampConfidence(finding.confidence ?? 0.45),
                matchedBy: Array.isArray(finding.matchedBy) ? finding.matchedBy.slice(0, 4) : [],
              } satisfies CalculatorCadCamLibraryFinding,
            ];
          }),
        );
      } catch (error) {
        reject(error instanceof Error ? error : new Error("Local tooling scan returned invalid JSON."));
      }
    });

    child.stdin.write(payload);
    child.stdin.end();
  });
}

export class CalculatorToolCribWorkspaceService {
  async getWorkspace(userId: string, workspaceId?: string): Promise<CalculatorToolCribWorkspace> {
    const store = await readJsonStore();
    return store.workspaces[buildWorkspaceKey(userId, workspaceId)] ?? buildEmptyWorkspace(userId, workspaceId);
  }

  async ingestDocument(input: IngestCalculatorToolCribDocumentInput): Promise<CalculatorToolCribWorkspace> {
    const store = await readJsonStore();
    const key = buildWorkspaceKey(input.userId, input.workspaceId);
    const workspace = store.workspaces[key] ?? buildEmptyWorkspace(input.userId, input.workspaceId);
    const importRecord = buildDocumentImportRecord(input);
    const nextImports = [importRecord, ...workspace.imports].slice(0, MAX_IMPORTS);
    const nextPartNumbers = uniqueStrings([
      ...workspace.partNumbers,
      ...importRecord.suggestions
        .filter((suggestion) => suggestion.kind === "part_number")
        .map((suggestion) => suggestion.partNumber),
    ]);
    const nextToolingPartNumbers = uniqueStrings([
      ...workspace.toolingPartNumbers,
      ...importRecord.suggestions
        .filter((suggestion) => suggestion.kind !== "part_number" && suggestion.partNumber)
        .map((suggestion) => suggestion.partNumber),
    ]);

    const nextWorkspace: CalculatorToolCribWorkspace = {
      ...workspace,
      imports: nextImports,
      partNumbers: nextPartNumbers,
      toolingPartNumbers: nextToolingPartNumbers,
      lastUpdatedAt: importRecord.importedAt,
      summary: "",
    };
    nextWorkspace.summary = buildWorkspaceSummary(nextWorkspace);
    store.workspaces[key] = nextWorkspace;
    await writeJsonStore(store);
    return nextWorkspace;
  }

  async runLocalCadCamScan(input: RunCalculatorToolCribLocalScanInput): Promise<CalculatorToolCribWorkspace> {
    if (!input.approvedByUser) {
      throw new Error("Explicit user approval is required before scanning local CAD/CAM tooling sources.");
    }

    const findings = await runLocalScanScript(input);
    const store = await readJsonStore();
    const key = buildWorkspaceKey(input.userId, input.workspaceId);
    const workspace = store.workspaces[key] ?? buildEmptyWorkspace(input.userId, input.workspaceId);
    const importedAt = new Date().toISOString();

    const nextLibraries = mergeLibraryFindings(workspace.discoveredLibraries, findings);
    const importRecord: CalculatorToolCribImportRecord = {
      id: randomUUID(),
      userId: input.userId.trim(),
      workspaceId: input.workspaceId?.trim() || DEFAULT_WORKSPACE_ID,
      sourceType: "cadcam_scan",
      sourceLabel: "Local CAD/CAM tooling scan",
      importedAt,
      status: findings.length > 0 ? "ready" : "needs_review",
      summary:
        findings.length > 0
          ? `Scanned known CAD/CAM paths and found ${findings.length} likely tooling librar${findings.length === 1 ? "y" : "ies"} for review.`
          : "Scanned known CAD/CAM paths but did not find any high-confidence tooling libraries yet.",
      suggestions: findings.map((finding) => ({
        id: `library-suggestion-${finding.id}`,
        kind: "library",
        label: `${finding.softwareLabel} library`,
        confidence: finding.confidence,
        evidence: finding.path,
        action: "Review this library path and decide whether to map it into My Shop / tool crib.",
        sourceType: "cadcam_scan",
      })),
      discoveredLibraries: findings,
    };

    const nextWorkspace: CalculatorToolCribWorkspace = {
      ...workspace,
      imports: [importRecord, ...workspace.imports].slice(0, MAX_IMPORTS),
      discoveredLibraries: nextLibraries,
      lastUpdatedAt: importedAt,
      summary: "",
    };
    nextWorkspace.summary = buildWorkspaceSummary(nextWorkspace);

    store.workspaces[key] = nextWorkspace;
    await writeJsonStore(store);
    return nextWorkspace;
  }
}

export const calculatorToolCribWorkspaceService = new CalculatorToolCribWorkspaceService();
