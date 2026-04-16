/**
 * MIT OCW Course Extractor
 *
 * Extracts numerical methods knowledge from MIT course lecture PDFs:
 * - Mathematical formulas and equations
 * - Algorithm descriptions
 * - Problem set patterns
 * - Key concepts and definitions
 */

import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "fs";
import { join, basename } from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { PDFParse } = require("pdf-parse");

// ============================================================================
// TYPES
// ============================================================================

interface ExtractedFormula {
  latex_like: string;
  context: string;
  category: string;
  confidence: number;
}

interface ExtractedAlgorithm {
  name: string;
  steps: string[];
  complexity?: string;
  context: string;
  confidence: number;
}

interface ExtractedConcept {
  term: string;
  definition: string;
  category: string;
  confidence: number;
}

interface LectureExtraction {
  source_pdf: string;
  lecture_number: number;
  title: string;
  extracted_at: string;
  page_count: number;
  text_length: number;
  formulas: ExtractedFormula[];
  algorithms: ExtractedAlgorithm[];
  concepts: ExtractedConcept[];
  topics: string[];
  warnings: string[];
}

// ============================================================================
// PATTERNS
// ============================================================================

// Formula patterns (LaTeX-like notation commonly found in PDFs)
const FORMULA_PATTERNS = [
  // Differential equations
  /d[xy]\/d[tx]\s*=\s*[^,\n]+/gi,
  // Summations
  /(?:sum|Σ|∑)\s*[^\n]{5,50}/gi,
  // Integrals
  /(?:integral|∫)\s*[^\n]{5,50}/gi,
  // Matrix operations
  /[A-Z]\s*[·×]\s*[A-Z]\s*=\s*[^\n]+/g,
  // Common numerical formulas
  /(?:x_\{?n\+1\}?|x\[n\+1\])\s*=\s*[^\n]+/gi,
  // Newton's method pattern
  /x\s*-\s*f\(x\)\s*\/\s*f'\(x\)/gi,
  // Jacobian/gradient
  /(?:Jacobian|gradient|∇|nabla)\s*[^\n]{5,30}/gi,
];

// Algorithm indicators
const ALGORITHM_MARKERS = [
  /algorithm\s*\d*[:\s]+([^\n]+)/gi,
  /(?:step\s*\d+|procedure)[:\s]+/gi,
  /(?:input|output)[:\s]+/gi,
  /(?:while|for|if|repeat|until)\s+/gi,
];

// Concept definition patterns
const CONCEPT_PATTERNS = [
  /(?:definition|theorem|lemma)[:\s]+([^\n]+)/gi,
  /(?:is defined as|we define)\s+([^\n]+)/gi,
  /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:is|are)\s+(?:a|an|the)\s+([^\n.]+)/g,
];

// Topic keywords for numerical methods
const TOPIC_KEYWORDS = [
  "newton", "jacobian", "gradient", "hessian", "optimization",
  "linear system", "eigenvalue", "singular value", "decomposition",
  "interpolation", "quadrature", "integration", "differentiation",
  "ode", "pde", "boundary value", "initial value", "stability",
  "convergence", "error", "tolerance", "iteration", "residual",
  "sparse", "dense", "matrix", "vector", "norm",
  "finite difference", "finite element", "monte carlo", "stochastic"
];

// ============================================================================
// EXTRACTION
// ============================================================================

function extractLectureNumber(filename: string): number {
  const match = filename.match(/Lec(\d+)/i);
  return match ? parseInt(match[1]) : 0;
}

function extractFormulas(text: string): ExtractedFormula[] {
  const formulas: ExtractedFormula[] = [];
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for equation-like patterns
    for (const pattern of FORMULA_PATTERNS) {
      pattern.lastIndex = 0; // Reset regex
      const matches = line.match(pattern);
      if (matches) {
        for (const match of matches) {
          const context = lines.slice(Math.max(0, i - 2), Math.min(lines.length, i + 3)).join(" ");
          formulas.push({
            latex_like: match.trim(),
            context: context.slice(0, 300),
            category: categorizeFormula(match),
            confidence: 0.7,
          });
        }
      }
    }

    // Look for equals signs with variables
    if (line.includes("=") && line.match(/[a-z]\s*=\s*[^\n]+/i)) {
      const eqMatch = line.match(/([a-zA-Z_]\w*)\s*=\s*([^\n]+)/);
      if (eqMatch && eqMatch[2].length > 5 && eqMatch[2].length < 100) {
        const context = lines.slice(Math.max(0, i - 1), Math.min(lines.length, i + 2)).join(" ");
        formulas.push({
          latex_like: `${eqMatch[1]} = ${eqMatch[2].trim()}`,
          context: context.slice(0, 300),
          category: categorizeFormula(eqMatch[0]),
          confidence: 0.6,
        });
      }
    }
  }

  // Deduplicate
  const unique = formulas.filter((f, i, arr) =>
    arr.findIndex(x => x.latex_like === f.latex_like) === i
  );

  return unique.slice(0, 50);
}

function categorizeFormula(formula: string): string {
  const f = formula.toLowerCase();
  if (f.includes("dx") || f.includes("dt") || f.includes("d/d")) return "differential";
  if (f.includes("sum") || f.includes("σ") || f.includes("∑")) return "summation";
  if (f.includes("integral") || f.includes("∫")) return "integration";
  if (f.includes("matrix") || f.match(/[A-Z]\s*×/)) return "linear_algebra";
  if (f.includes("gradient") || f.includes("∇")) return "optimization";
  if (f.includes("error") || f.includes("epsilon") || f.includes("ε")) return "error_analysis";
  return "general";
}

function extractAlgorithms(text: string): ExtractedAlgorithm[] {
  const algorithms: ExtractedAlgorithm[] = [];
  const lines = text.split("\n");

  // Look for algorithm sections
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].toLowerCase();

    if (line.includes("algorithm") || line.includes("procedure")) {
      // Try to extract algorithm name
      const nameMatch = lines[i].match(/(?:algorithm|procedure)[:\s]*([^\n]+)/i);
      const name = nameMatch ? nameMatch[1].trim() : "Unnamed Algorithm";

      // Collect steps
      const steps: string[] = [];
      for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
        const stepLine = lines[j].trim();
        if (stepLine.match(/^\d+[.)]\s+/) || stepLine.match(/^-\s+/)) {
          steps.push(stepLine.replace(/^\d+[.)]\s+/, "").replace(/^-\s+/, ""));
        } else if (stepLine.length === 0 && steps.length > 0) {
          break;
        }
      }

      if (steps.length >= 2) {
        algorithms.push({
          name,
          steps,
          context: lines.slice(i, Math.min(i + 10, lines.length)).join(" ").slice(0, 400),
          confidence: steps.length >= 3 ? 0.8 : 0.6,
        });
      }
    }
  }

  return algorithms.slice(0, 20);
}

function extractConcepts(text: string): ExtractedConcept[] {
  const concepts: ExtractedConcept[] = [];
  const lines = text.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Definition patterns
    const defMatch = line.match(/(?:definition|theorem)[:\s]*([^\n]+)/i);
    if (defMatch) {
      const nextLines = lines.slice(i + 1, i + 4).join(" ");
      concepts.push({
        term: defMatch[1].slice(0, 50),
        definition: nextLines.slice(0, 200),
        category: line.toLowerCase().includes("theorem") ? "theorem" : "definition",
        confidence: 0.75,
      });
    }

    // "X is defined as Y" pattern
    const isDefMatch = line.match(/([A-Za-z\s]+)\s+is\s+defined\s+as\s+([^\n]+)/i);
    if (isDefMatch) {
      concepts.push({
        term: isDefMatch[1].trim(),
        definition: isDefMatch[2].trim(),
        category: "definition",
        confidence: 0.8,
      });
    }
  }

  return concepts.slice(0, 30);
}

function extractTopics(text: string): string[] {
  const topics: string[] = [];
  const lowerText = text.toLowerCase();

  for (const keyword of TOPIC_KEYWORDS) {
    if (lowerText.includes(keyword)) {
      topics.push(keyword);
    }
  }

  return [...new Set(topics)];
}

async function extractLecture(filePath: string): Promise<LectureExtraction> {
  const filename = basename(filePath);
  const warnings: string[] = [];

  console.log(`  Extracting: ${filename}`);

  try {
    const buffer = readFileSync(filePath);
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    await parser.destroy?.();

    const text = typeof result === "string" ? result : (result?.text || "");
    const pageCount = typeof result === "object" ? (result.total || 0) : 0;

    const lectureNum = extractLectureNumber(filename);

    // Try to extract title from first few lines
    const firstLines = text.split("\n").slice(0, 10).join(" ");
    const titleMatch = firstLines.match(/(?:Lecture\s*\d+[:\s]*)?([A-Z][^\n.]+)/);
    const title = titleMatch ? titleMatch[1].trim().slice(0, 100) : `Lecture ${lectureNum}`;

    const formulas = extractFormulas(text);
    const algorithms = extractAlgorithms(text);
    const concepts = extractConcepts(text);
    const topics = extractTopics(text);

    console.log(`    Formulas: ${formulas.length}, Algorithms: ${algorithms.length}, Concepts: ${concepts.length}, Topics: ${topics.length}`);

    return {
      source_pdf: filePath,
      lecture_number: lectureNum,
      title,
      extracted_at: new Date().toISOString(),
      page_count: pageCount,
      text_length: text.length,
      formulas,
      algorithms,
      concepts,
      topics,
      warnings,
    };
  } catch (error) {
    warnings.push(`Extraction failed: ${error}`);
    return {
      source_pdf: filePath,
      lecture_number: extractLectureNumber(filename),
      title: "Extraction Failed",
      extracted_at: new Date().toISOString(),
      page_count: 0,
      text_length: 0,
      formulas: [],
      algorithms: [],
      concepts: [],
      topics: [],
      warnings,
    };
  }
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  console.log("=== MIT OCW Course Extraction ===\n");

  const MIT_DIR = "H:/prism/Resources/MIT COURSES/10.34-fall-2015/static_resources";
  const OUTPUT_DIR = "H:/prism/mcp-server/data/extracted-knowledge/mit-courses";
  mkdirSync(OUTPUT_DIR, { recursive: true });

  if (!existsSync(MIT_DIR)) {
    console.error(`MIT courses directory not found: ${MIT_DIR}`);
    process.exit(1);
  }

  // Find lecture PDFs
  const files = readdirSync(MIT_DIR)
    .filter(f => f.includes("Lec") && f.endsWith(".pdf"))
    .map(f => join(MIT_DIR, f))
    .sort((a, b) => extractLectureNumber(basename(a)) - extractLectureNumber(basename(b)));

  console.log(`Found ${files.length} lecture PDFs\n`);

  const results: LectureExtraction[] = [];
  let totalFormulas = 0;
  let totalAlgorithms = 0;
  let totalConcepts = 0;

  for (const filePath of files) {
    const result = await extractLecture(filePath);
    results.push(result);
    totalFormulas += result.formulas.length;
    totalAlgorithms += result.algorithms.length;
    totalConcepts += result.concepts.length;
  }

  // Aggregate topics across all lectures
  const allTopics = new Set<string>();
  for (const r of results) {
    r.topics.forEach(t => allTopics.add(t));
  }

  // Save results
  const outputPath = join(OUTPUT_DIR, `mit-10.34-extraction-${Date.now()}.json`);
  const summary = {
    course: "MIT 10.34 - Numerical Methods Applied to Chemical Engineering",
    semester: "Fall 2015",
    extracted_at: new Date().toISOString(),
    lectures_processed: results.length,
    total_formulas: totalFormulas,
    total_algorithms: totalAlgorithms,
    total_concepts: totalConcepts,
    all_topics: [...allTopics].sort(),
    by_category: {
      formulas: {} as Record<string, number>,
      concepts: {} as Record<string, number>,
    },
    results,
  };

  // Categorize formulas
  for (const r of results) {
    for (const f of r.formulas) {
      summary.by_category.formulas[f.category] = (summary.by_category.formulas[f.category] || 0) + 1;
    }
    for (const c of r.concepts) {
      summary.by_category.concepts[c.category] = (summary.by_category.concepts[c.category] || 0) + 1;
    }
  }

  writeFileSync(outputPath, JSON.stringify(summary, null, 2));

  console.log("\n=== Extraction Summary ===");
  console.log(`Course: MIT 10.34 - Numerical Methods`);
  console.log(`Lectures: ${results.length}`);
  console.log(`Formulas: ${totalFormulas}`);
  console.log(`Algorithms: ${totalAlgorithms}`);
  console.log(`Concepts: ${totalConcepts}`);
  console.log(`Topics covered: ${allTopics.size}`);
  console.log(`\nFormula categories:`);
  for (const [cat, count] of Object.entries(summary.by_category.formulas).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${cat}: ${count}`);
  }
  console.log(`\nOutput: ${outputPath}`);
}

main().catch(console.error);
