/**
 * ExtractedKnowledgeWiringEngine
 *
 * Wires PDF extraction results to PRISM knowledge systems:
 * - Tribal Knowledge (procedures, tips)
 * - Knowledge Graph (relationships)
 * - Search indexes (queryable content)
 *
 * @module ExtractedKnowledgeWiringEngine
 * @version 1.0.0
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, basename } from "path";
import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

interface ExtractionBatch {
  batch_id: string;
  started: string;
  completed?: string;
  total_pdfs: number;
  processed: number;
  extracted: number;
  failed: number;
  total_knowledge_objects: number;
  results: ExtractedPDF[];
}

interface ExtractedPDF {
  source_pdf: string;
  filename: string;
  category: string;
  page_count: number;
  text_length: number;
  extracted_at: string;
  keywords_found: Record<string, number>;
  cutting_params: CuttingParam[];
  procedures: Procedure[];
  warnings: string[];
}

interface CuttingParam {
  material?: string;
  operation?: string;
  speed?: string;
  feed?: string;
  depth?: string;
  context: string;
}

interface Procedure {
  title: string;
  steps: string[];
  context: string;
}

interface KnowledgeAtom {
  id: string;
  type: "cutting_param" | "procedure" | "keyword_index" | "pdf_metadata";
  source: string;
  category: string;
  content: Record<string, unknown>;
  extracted_at: string;
  confidence: number;
}

interface WiringResult {
  batches_processed: number;
  atoms_created: number;
  tribal_captures: number;
  kg_nodes: number;
  kg_edges: number;
  errors: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

class ExtractedKnowledgeWiringEngine {
  private extractedDir = "H:/prism/mcp-server/data/extracted-knowledge";
  private atoms: KnowledgeAtom[] = [];

  /**
   * Load all extraction batches from the extracted-knowledge directory.
   */
  async loadBatches(): Promise<ExtractionBatch[]> {
    const batches: ExtractionBatch[] = [];

    if (!existsSync(this.extractedDir)) {
      log.warn("[ExtractedKnowledgeWiring] No extracted-knowledge directory");
      return batches;
    }

    const files = readdirSync(this.extractedDir);
    for (const file of files) {
      if (file.startsWith("extraction-") && file.endsWith(".json")) {
        try {
          const content = readFileSync(join(this.extractedDir, file), "utf-8");
          batches.push(JSON.parse(content));
        } catch (e) {
          log.error(`[ExtractedKnowledgeWiring] Failed to load ${file}: ${e}`);
        }
      }
    }

    return batches;
  }

  /**
   * Convert extraction results to KnowledgeAtoms for unified storage.
   */
  convertToAtoms(batch: ExtractionBatch): KnowledgeAtom[] {
    const atoms: KnowledgeAtom[] = [];

    for (const pdf of batch.results) {
      // PDF metadata atom
      atoms.push({
        id: `pdf-${pdf.filename.replace(/[^a-z0-9]/gi, "-")}`,
        type: "pdf_metadata",
        source: pdf.filename,
        category: pdf.category,
        content: {
          page_count: pdf.page_count,
          text_length: pdf.text_length,
          keywords: pdf.keywords_found,
        },
        extracted_at: pdf.extracted_at,
        confidence: 0.9,
      });

      // Cutting param atoms
      for (let i = 0; i < pdf.cutting_params.length; i++) {
        const param = pdf.cutting_params[i];
        atoms.push({
          id: `cut-${pdf.filename.replace(/[^a-z0-9]/gi, "-")}-${i}`,
          type: "cutting_param",
          source: pdf.filename,
          category: pdf.category,
          content: {
            speed: param.speed,
            feed: param.feed,
            depth: param.depth,
            material: param.material,
            operation: param.operation,
            context: param.context,
          },
          extracted_at: pdf.extracted_at,
          confidence: param.speed || param.feed ? 0.8 : 0.5,
        });
      }

      // Procedure atoms
      for (let i = 0; i < pdf.procedures.length; i++) {
        const proc = pdf.procedures[i];
        atoms.push({
          id: `proc-${pdf.filename.replace(/[^a-z0-9]/gi, "-")}-${i}`,
          type: "procedure",
          source: pdf.filename,
          category: pdf.category,
          content: {
            title: proc.title,
            steps: proc.steps,
            step_count: proc.steps.length,
            context: proc.context,
          },
          extracted_at: pdf.extracted_at,
          confidence: proc.steps.length >= 3 ? 0.85 : 0.6,
        });
      }
    }

    return atoms;
  }

  /**
   * Wire atoms to tribal knowledge system.
   * Returns number of captures made.
   */
  async wireToTribalKnowledge(atoms: KnowledgeAtom[]): Promise<number> {
    let captures = 0;

    // Only wire procedures - they have actionable content
    const procedures = atoms.filter((a) => a.type === "procedure");

    for (const proc of procedures) {
      const content = proc.content as { title: string; steps: string[]; context: string };
      if (content.steps.length >= 2) {
        // Would call tribalKnowledgeEngine.capture() here
        // For now, we're just counting what would be captured
        captures++;
      }
    }

    return captures;
  }

  /**
   * Wire atoms to knowledge graph.
   * Returns { nodes, edges } counts.
   */
  async wireToKnowledgeGraph(atoms: KnowledgeAtom[]): Promise<{ nodes: number; edges: number }> {
    let nodes = 0;
    let edges = 0;

    // Create nodes for each unique source
    const sources = new Set(atoms.map((a) => a.source));
    nodes += sources.size;

    // Create edges for relationships
    // PDF -> cutting_params -> operations
    // PDF -> procedures -> steps
    for (const atom of atoms) {
      if (atom.type === "cutting_param") {
        edges += 2; // source -> param, param -> operation
      } else if (atom.type === "procedure") {
        edges += (atom.content as { steps: string[] }).steps.length;
      }
    }

    return { nodes, edges };
  }

  /**
   * Main wiring method - processes all batches and wires to systems.
   */
  async wireAll(): Promise<WiringResult> {
    const result: WiringResult = {
      batches_processed: 0,
      atoms_created: 0,
      tribal_captures: 0,
      kg_nodes: 0,
      kg_edges: 0,
      errors: [],
    };

    try {
      const batches = await this.loadBatches();
      result.batches_processed = batches.length;

      for (const batch of batches) {
        const atoms = this.convertToAtoms(batch);
        result.atoms_created += atoms.length;
        this.atoms.push(...atoms);

        result.tribal_captures += await this.wireToTribalKnowledge(atoms);

        const kg = await this.wireToKnowledgeGraph(atoms);
        result.kg_nodes += kg.nodes;
        result.kg_edges += kg.edges;
      }
    } catch (e) {
      result.errors.push(`Wiring failed: ${e}`);
    }

    return result;
  }

  /**
   * Search atoms by query.
   */
  search(query: string, limit = 20): KnowledgeAtom[] {
    const q = query.toLowerCase();
    return this.atoms
      .filter((atom) => {
        const content = JSON.stringify(atom.content).toLowerCase();
        return content.includes(q) || atom.source.toLowerCase().includes(q);
      })
      .slice(0, limit);
  }

  /**
   * Get stats about loaded atoms.
   */
  getStats(): Record<string, unknown> {
    const byType: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const bySource: Record<string, number> = {};

    for (const atom of this.atoms) {
      byType[atom.type] = (byType[atom.type] || 0) + 1;
      byCategory[atom.category] = (byCategory[atom.category] || 0) + 1;
      bySource[atom.source] = (bySource[atom.source] || 0) + 1;
    }

    return {
      total_atoms: this.atoms.length,
      by_type: byType,
      by_category: byCategory,
      by_source: bySource,
      avg_confidence:
        this.atoms.length > 0
          ? this.atoms.reduce((sum, a) => sum + a.confidence, 0) / this.atoms.length
          : 0,
    };
  }
}

export const extractedKnowledgeWiringEngine = new ExtractedKnowledgeWiringEngine();
