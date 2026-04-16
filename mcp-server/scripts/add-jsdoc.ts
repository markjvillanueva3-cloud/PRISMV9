/**
 * Auto-JSDoc Generator — Adds JSDoc to all undocumented exports.
 *
 * Parses TypeScript files using the compiler API to find exported functions,
 * classes, interfaces, and types that lack JSDoc comments, then generates
 * and inserts documentation based on the declaration signature.
 *
 * Usage: npx tsx scripts/add-jsdoc.ts [directory]
 * Example: npx tsx scripts/add-jsdoc.ts src/algorithms
 */
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);

const targetDir = process.argv[2] || "src/algorithms";
const rootDir = path.resolve(__dirname2, "..");
const fullDir = path.resolve(rootDir, targetDir);

/** Convert camelCase/PascalCase to readable words. */
function nameToWords(name: string): string {
  return name
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/** Generate a human-readable description from a function/class name. */
function describeExport(
  name: string,
  kind: string,
  params: string[],
  returnType: string
): string {
  const words = nameToWords(name);

  if (kind === "function") {
    // Common naming patterns
    if (name.startsWith("calculate")) return `Calculates ${words.replace("Calculate ", "").toLowerCase()}.`;
    if (name.startsWith("compute")) return `Computes ${words.replace("Compute ", "").toLowerCase()}.`;
    if (name.startsWith("get")) return `Gets ${words.replace("Get ", "").toLowerCase()}.`;
    if (name.startsWith("set")) return `Sets ${words.replace("Set ", "").toLowerCase()}.`;
    if (name.startsWith("is") || name.startsWith("has") || name.startsWith("can"))
      return `Checks whether ${words.toLowerCase()}.`;
    if (name.startsWith("create")) return `Creates ${words.replace("Create ", "").toLowerCase()}.`;
    if (name.startsWith("build")) return `Builds ${words.replace("Build ", "").toLowerCase()}.`;
    if (name.startsWith("validate")) return `Validates ${words.replace("Validate ", "").toLowerCase()}.`;
    if (name.startsWith("parse")) return `Parses ${words.replace("Parse ", "").toLowerCase()}.`;
    if (name.startsWith("format")) return `Formats ${words.replace("Format ", "").toLowerCase()}.`;
    if (name.startsWith("convert")) return `Converts ${words.replace("Convert ", "").toLowerCase()}.`;
    if (name.startsWith("find")) return `Finds ${words.replace("Find ", "").toLowerCase()}.`;
    if (name.startsWith("resolve")) return `Resolves ${words.replace("Resolve ", "").toLowerCase()}.`;
    if (name.startsWith("normalize")) return `Normalizes ${words.replace("Normalize ", "").toLowerCase()}.`;
    if (name.startsWith("apply")) return `Applies ${words.replace("Apply ", "").toLowerCase()}.`;
    if (name.startsWith("register")) return `Registers ${words.replace("Register ", "").toLowerCase()}.`;
    if (name.startsWith("init")) return `Initializes ${words.replace("Init ", "").toLowerCase()}.`;
    if (name.startsWith("load")) return `Loads ${words.replace("Load ", "").toLowerCase()}.`;
    if (name.startsWith("save")) return `Saves ${words.replace("Save ", "").toLowerCase()}.`;
    if (name.startsWith("update")) return `Updates ${words.replace("Update ", "").toLowerCase()}.`;
    if (name.startsWith("delete") || name.startsWith("remove"))
      return `Removes ${words.replace(/^(Delete|Remove) /, "").toLowerCase()}.`;
    if (name.startsWith("process")) return `Processes ${words.replace("Process ", "").toLowerCase()}.`;
    if (name.startsWith("handle")) return `Handles ${words.replace("Handle ", "").toLowerCase()}.`;
    if (name.startsWith("select")) return `Selects ${words.replace("Select ", "").toLowerCase()}.`;
    if (name.startsWith("predict")) return `Predicts ${words.replace("Predict ", "").toLowerCase()}.`;
    if (name.startsWith("estimate")) return `Estimates ${words.replace("Estimate ", "").toLowerCase()}.`;
    if (name.startsWith("optimize")) return `Optimizes ${words.replace("Optimize ", "").toLowerCase()}.`;
    if (name.startsWith("evaluate")) return `Evaluates ${words.replace("Evaluate ", "").toLowerCase()}.`;
    if (name.startsWith("analyze") || name.startsWith("analyse"))
      return `Analyzes ${words.replace(/^Analy[sz]e /, "").toLowerCase()}.`;
    if (name.startsWith("check")) return `Checks ${words.replace("Check ", "").toLowerCase()}.`;
    if (name.startsWith("run")) return `Runs ${words.replace("Run ", "").toLowerCase()}.`;
    if (name.startsWith("execute")) return `Executes ${words.replace("Execute ", "").toLowerCase()}.`;
    if (name.startsWith("generate")) return `Generates ${words.replace("Generate ", "").toLowerCase()}.`;
    if (name.startsWith("render")) return `Renders ${words.replace("Render ", "").toLowerCase()}.`;
    if (name.startsWith("map")) return `Maps ${words.replace("Map ", "").toLowerCase()}.`;
    if (name.startsWith("merge")) return `Merges ${words.replace("Merge ", "").toLowerCase()}.`;
    if (name.startsWith("filter")) return `Filters ${words.replace("Filter ", "").toLowerCase()}.`;
    if (name.startsWith("sort")) return `Sorts ${words.replace("Sort ", "").toLowerCase()}.`;
    if (name.startsWith("transform")) return `Transforms ${words.replace("Transform ", "").toLowerCase()}.`;
    if (name.startsWith("extract")) return `Extracts ${words.replace("Extract ", "").toLowerCase()}.`;
    if (name.startsWith("detect")) return `Detects ${words.replace("Detect ", "").toLowerCase()}.`;
    if (name.startsWith("classify")) return `Classifies ${words.replace("Classify ", "").toLowerCase()}.`;
    if (name.startsWith("aggregate")) return `Aggregates ${words.replace("Aggregate ", "").toLowerCase()}.`;
    if (name.startsWith("interpolate")) return `Interpolates ${words.replace("Interpolate ", "").toLowerCase()}.`;
    if (name.startsWith("lookup")) return `Looks up ${words.replace("Lookup ", "").toLowerCase()}.`;
    if (name.startsWith("determine")) return `Determines ${words.replace("Determine ", "").toLowerCase()}.`;
    if (name.startsWith("recommend")) return `Recommends ${words.replace("Recommend ", "").toLowerCase()}.`;
    if (name.startsWith("assess")) return `Assesses ${words.replace("Assess ", "").toLowerCase()}.`;
    return `${words}.`;
  }

  if (kind === "class") return `${words} engine/manager.`;
  if (kind === "interface") return `${words} configuration/data structure.`;
  if (kind === "type") return `${words} type definition.`;
  if (kind === "enum") return `${words} enumeration.`;
  if (kind === "const") return `${words} constant.`;

  return `${words}.`;
}

/** Generate @param description from parameter name. */
function describeParam(name: string, type: string): string {
  const words = nameToWords(name).toLowerCase();
  // Common parameter patterns
  if (name === "params" || name === "args" || name === "options" || name === "config" || name === "opts")
    return `${words} for the operation`;
  if (name === "input" || name === "data") return `input ${words}`;
  if (name === "ctx" || name === "context") return "execution context";
  if (name === "server") return "MCP server instance";
  if (name === "material" || name === "materialId") return "material identifier or specification";
  if (name === "tool" || name === "toolId") return "tool identifier or specification";
  if (name === "machine" || name === "machineId") return "machine identifier or specification";
  if (name.endsWith("Id") || name.endsWith("ID")) return `${words.replace(/ id$/i, "")} identifier`;
  if (name.endsWith("Path") || name.endsWith("File")) return `file path`;
  if (name.endsWith("Name")) return `${words.replace(/ name$/i, "")} name`;
  if (name.endsWith("Type")) return `${words.replace(/ type$/i, "")} type`;
  if (name.endsWith("Count") || name.endsWith("Num")) return `number of ${words.replace(/ (count|num)$/i, "")}`;
  if (name.endsWith("Flag") || name.startsWith("is") || name.startsWith("enable"))
    return `whether to ${words.toLowerCase()}`;
  if (type === "number") return `${words} value`;
  if (type === "string") return `${words} string`;
  if (type === "boolean") return `whether ${words}`;
  return words;
}

/** Check if a node already has JSDoc. */
function hasJSDoc(node: ts.Node, sourceFile: ts.SourceFile): boolean {
  const text = sourceFile.getFullText();
  const start = node.getFullStart();
  const leadingText = text.substring(Math.max(0, start - 5), node.getStart(sourceFile));
  // Also check further back for JSDoc
  const fullLeading = text.substring(Math.max(0, start), node.getStart(sourceFile));
  return fullLeading.includes("/**") || leadingText.includes("*/");
}

interface ExportInfo {
  name: string;
  kind: string;
  params: Array<{ name: string; type: string }>;
  returnType: string;
  line: number;
  hasDoc: boolean;
}

/** Extract export info from a source file. */
function analyzeFile(filePath: string): ExportInfo[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true
  );

  const exports: ExportInfo[] = [];

  function visit(node: ts.Node) {
    const isExported =
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ??
      false;

    if (!isExported) {
      ts.forEachChild(node, visit);
      return;
    }

    const pos = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const line = pos.line + 1;
    const hasDoc = hasJSDoc(node, sourceFile);

    if (ts.isFunctionDeclaration(node) && node.name) {
      const params = node.parameters.map((p) => ({
        name: p.name.getText(sourceFile),
        type: p.type ? p.type.getText(sourceFile) : "unknown",
      }));
      const returnType = node.type ? node.type.getText(sourceFile) : "void";
      exports.push({
        name: node.name.text,
        kind: "function",
        params,
        returnType,
        line,
        hasDoc,
      });
    } else if (ts.isClassDeclaration(node) && node.name) {
      exports.push({
        name: node.name.text,
        kind: "class",
        params: [],
        returnType: "",
        line,
        hasDoc,
      });
    } else if (ts.isInterfaceDeclaration(node)) {
      exports.push({
        name: node.name.text,
        kind: "interface",
        params: [],
        returnType: "",
        line,
        hasDoc,
      });
    } else if (ts.isTypeAliasDeclaration(node)) {
      exports.push({
        name: node.name.text,
        kind: "type",
        params: [],
        returnType: "",
        line,
        hasDoc,
      });
    } else if (ts.isEnumDeclaration(node)) {
      exports.push({
        name: node.name.text,
        kind: "enum",
        params: [],
        returnType: "",
        line,
        hasDoc,
      });
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          const init = decl.initializer;
          if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
            const params = init.parameters.map((p) => ({
              name: p.name.getText(sourceFile),
              type: p.type ? p.type.getText(sourceFile) : "unknown",
            }));
            const returnType = init.type ? init.type.getText(sourceFile) : "unknown";
            exports.push({
              name: decl.name.text,
              kind: "function",
              params,
              returnType,
              line,
              hasDoc,
            });
          } else {
            exports.push({
              name: decl.name.text,
              kind: "const",
              params: [],
              returnType: "",
              line,
              hasDoc,
            });
          }
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return exports;
}

/** Generate JSDoc string for an export. */
function generateJSDoc(exp: ExportInfo): string {
  const desc = describeExport(exp.name, exp.kind, exp.params.map((p) => p.name), exp.returnType);
  const lines: string[] = [`/** ${desc}`];

  if (exp.params.length > 0) {
    for (const p of exp.params) {
      const paramDesc = describeParam(p.name, p.type);
      lines.push(` * @param ${p.name} - ${paramDesc}`);
    }
  }

  if (exp.kind === "function" && exp.returnType && exp.returnType !== "void") {
    const retWords = nameToWords(exp.returnType).toLowerCase();
    lines.push(` * @returns ${retWords}`);
  }

  lines.push(` */`);
  return lines.join("\n");
}

/** Process a single file — add JSDoc to undocumented exports. */
function processFile(filePath: string): { added: number; skipped: number } {
  const exports = analyzeFile(filePath);
  const undocumented = exports.filter((e) => !e.hasDoc);

  if (undocumented.length === 0) {
    return { added: 0, skipped: exports.length };
  }

  let content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Process in reverse order to not shift line numbers
  const sorted = [...undocumented].sort((a, b) => b.line - a.line);

  for (const exp of sorted) {
    const jsdoc = generateJSDoc(exp);
    const lineIdx = exp.line - 1;
    // Get the indentation of the export line
    const indent = lines[lineIdx].match(/^(\s*)/)?.[1] || "";
    const indentedJsdoc = jsdoc
      .split("\n")
      .map((l) => indent + l)
      .join("\n");
    lines.splice(lineIdx, 0, indentedJsdoc);
  }

  fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
  return { added: undocumented.length, skipped: exports.length - undocumented.length };
}

// Main
function main() {
  const dirs = targetDir.split(",").map((d) => path.resolve(rootDir, d.trim()));
  let totalAdded = 0;
  let totalSkipped = 0;
  let totalFiles = 0;

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      console.error(`Directory not found: ${dir}`);
      continue;
    }

    const files = fs.readdirSync(dir).filter(
      (f) =>
        f.endsWith(".ts") &&
        !f.endsWith(".test.ts") &&
        !f.endsWith(".spec.ts") &&
        f !== "index.ts"
    );

    for (const file of files) {
      const filePath = path.join(dir, file);
      try {
        const { added, skipped } = processFile(filePath);
        if (added > 0) {
          console.log(`  ${file}: +${added} JSDoc (${skipped} already documented)`);
        }
        totalAdded += added;
        totalSkipped += skipped;
        totalFiles++;
      } catch (err: any) {
        console.error(`  ERROR ${file}: ${err.message}`);
      }
    }
  }

  console.log(`\nDONE: ${totalAdded} JSDoc added, ${totalSkipped} already documented, ${totalFiles} files processed`);
}

main();
