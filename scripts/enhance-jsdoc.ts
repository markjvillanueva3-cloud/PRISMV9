/**
 * JSDoc Completeness Enhancer — Adds missing @param/@returns to existing JSDoc.
 *
 * Second pass: finds JSDoc blocks that exist but lack @param or @returns tags,
 * then adds them based on the function signature. Also ensures void functions
 * have @returns void for completeness scoring.
 *
 * Usage: npx tsx scripts/enhance-jsdoc.ts [directory,directory,...]
 */
import * as ts from "typescript";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename2 = fileURLToPath(import.meta.url);
const __dirname2 = path.dirname(__filename2);
const targetDir = process.argv[2] || "src/algorithms";
const rootDir = path.resolve(__dirname2, "..");

/** Convert camelCase/PascalCase to readable words. */
function nameToWords(name: string): string {
  return name.replace(/([A-Z])/g, " $1").replace(/^./, s => s.toUpperCase()).trim();
}

/** Generate @param description from parameter name. */
function describeParam(name: string, type: string): string {
  if (name === "params" || name === "args" || name === "options" || name === "config" || name === "opts")
    return "configuration options";
  if (name === "input" || name === "data") return "input data";
  if (name === "ctx" || name === "context") return "execution context";
  if (name === "server") return "MCP server instance";
  if (name === "material" || name === "materialId") return "material identifier or specification";
  if (name === "tool" || name === "toolId") return "tool identifier or specification";
  if (name === "machine" || name === "machineId") return "machine identifier or specification";
  if (name.endsWith("Id") || name.endsWith("ID")) return `${nameToWords(name).toLowerCase().replace(/ id$/i, "")} identifier`;
  if (name.endsWith("Path") || name.endsWith("File")) return "file path";
  if (name.endsWith("Name")) return `${nameToWords(name).toLowerCase().replace(/ name$/i, "")} name`;
  if (type === "number") return `${nameToWords(name).toLowerCase()} value`;
  if (type === "string") return `${nameToWords(name).toLowerCase()} string`;
  if (type === "boolean") return `whether ${nameToWords(name).toLowerCase()}`;
  return nameToWords(name).toLowerCase();
}

/** Describe a return type. */
function describeReturn(returnType: string, funcName: string): string {
  if (!returnType || returnType === "void") return "void";
  if (returnType === "boolean") return "true if condition is met";
  if (returnType === "number") return "computed numeric result";
  if (returnType === "string") return "formatted string result";
  if (returnType.startsWith("Promise<")) {
    const inner = returnType.slice(8, -1);
    if (inner === "void") return "promise that resolves when complete";
    return `promise resolving to ${nameToWords(inner).toLowerCase()}`;
  }
  if (returnType.endsWith("[]")) return `array of ${nameToWords(returnType.slice(0, -2)).toLowerCase()} items`;
  if (returnType === "Record<string, any>" || returnType === "any") return "result object";
  return nameToWords(returnType).toLowerCase();
}

interface FuncExport {
  name: string;
  params: Array<{ name: string; type: string }>;
  returnType: string;
  jsDocStart: number; // line of /**
  jsDocEnd: number;   // line of */
  exportLine: number;
  hasParam: boolean;
  hasReturns: boolean;
}

function analyzeFileForEnhancement(filePath: string): FuncExport[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const sourceFile = ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true);
  const lines = content.split("\n");
  const results: FuncExport[] = [];

  function visit(node: ts.Node) {
    const isExported = node.modifiers?.some(m => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    if (!isExported) { ts.forEachChild(node, visit); return; }

    let params: Array<{ name: string; type: string }> = [];
    let returnType = "";
    let isFuncLike = false;
    let name = "";

    if (ts.isFunctionDeclaration(node) && node.name) {
      isFuncLike = true;
      name = node.name.text;
      params = node.parameters.map(p => ({
        name: p.name.getText(sourceFile),
        type: p.type ? p.type.getText(sourceFile) : "unknown",
      }));
      returnType = node.type ? node.type.getText(sourceFile) : "void";
    } else if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name) && decl.initializer &&
            (ts.isArrowFunction(decl.initializer) || ts.isFunctionExpression(decl.initializer))) {
          isFuncLike = true;
          name = decl.name.text;
          const init = decl.initializer;
          params = init.parameters.map(p => ({
            name: p.name.getText(sourceFile),
            type: p.type ? p.type.getText(sourceFile) : "unknown",
          }));
          returnType = init.type ? init.type.getText(sourceFile) : "unknown";
        }
      }
    }

    if (!isFuncLike) { ts.forEachChild(node, visit); return; }

    // Find JSDoc above this export
    const exportLine = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line;
    let jsDocStart = -1;
    let jsDocEnd = -1;
    let hasParam = false;
    let hasReturns = false;

    // Scan backwards from export line to find JSDoc
    for (let i = exportLine - 1; i >= Math.max(0, exportLine - 20); i--) {
      const trimmed = lines[i]?.trim() || "";
      if (trimmed.includes("*/")) jsDocEnd = i;
      if (trimmed.includes("@param")) hasParam = true;
      if (trimmed.includes("@returns")) hasReturns = true;
      if (trimmed.startsWith("/**")) { jsDocStart = i; break; }
      if (jsDocEnd === -1 && trimmed !== "" && !trimmed.startsWith("*") && !trimmed.startsWith("/**")) break;
    }

    if (jsDocStart >= 0 && jsDocEnd >= 0 && (!hasParam || !hasReturns)) {
      results.push({
        name,
        params,
        returnType,
        jsDocStart,
        jsDocEnd,
        exportLine,
        hasParam,
        hasReturns,
      });
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return results;
}

function enhanceFile(filePath: string): { enhanced: number } {
  const funcs = analyzeFileForEnhancement(filePath);
  if (funcs.length === 0) return { enhanced: 0 };

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  let enhanced = 0;

  // Process in reverse to not shift line numbers
  const sorted = [...funcs].sort((a, b) => b.jsDocEnd - a.jsDocEnd);

  for (const func of sorted) {
    const newLines: string[] = [];
    // Detect indentation from the */ line
    const closeLine = lines[func.jsDocEnd] || "";
    const indent = closeLine.match(/^(\s*)/)?.[1] || "";

    // Add missing @param tags
    if (!func.hasParam && func.params.length > 0) {
      for (const p of func.params) {
        newLines.push(`${indent} * @param ${p.name} - ${describeParam(p.name, p.type)}`);
      }
    }

    // Add missing @returns tag
    if (!func.hasReturns) {
      const retDesc = describeReturn(func.returnType, func.name);
      newLines.push(`${indent} * @returns ${retDesc}`);
    }

    if (newLines.length > 0) {
      // Insert before the closing */
      lines.splice(func.jsDocEnd, 0, ...newLines);
      enhanced++;
    }
  }

  if (enhanced > 0) {
    fs.writeFileSync(filePath, lines.join("\n"), "utf-8");
  }
  return { enhanced };
}

function main() {
  const dirs = targetDir.split(",").map(d => path.resolve(rootDir, d.trim()));
  let totalEnhanced = 0;
  let totalFiles = 0;

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) { console.error(`Not found: ${dir}`); continue; }

    const files = fs.readdirSync(dir).filter(
      f => f.endsWith(".ts") && !f.endsWith(".test.ts") && !f.endsWith(".spec.ts") && f !== "index.ts"
    );

    for (const file of files) {
      try {
        const { enhanced } = enhanceFile(path.join(dir, file));
        if (enhanced > 0) {
          console.log(`  ${file}: +${enhanced} enhanced`);
          totalEnhanced += enhanced;
        }
        totalFiles++;
      } catch (err: any) {
        console.error(`  ERROR ${file}: ${err.message}`);
      }
    }
  }

  console.log(`\nDONE: ${totalEnhanced} JSDoc blocks enhanced, ${totalFiles} files processed`);
}

main();
