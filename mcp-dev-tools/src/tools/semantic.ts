/**
 * MCP Dev Tools - Semantic Code Search
 * TIER 1: Find code by meaning, not just keywords
 * NOTE: This is a simplified implementation using TF-IDF-like scoring
 * For production, integrate with embeddings (nomic-embed-text, @xenova/transformers)
 */

import { promises as fs } from 'fs';
import { join, relative, extname } from 'path';
import { config } from '../config.js';

// Simple in-memory index
interface CodeChunk {
  file: string;
  startLine: number;
  endLine: number;
  code: string;
  tokens: Set<string>;
  summary: string;
}

const codeIndex: CodeChunk[] = [];
let indexBuilt = false;

// ============ HELPERS ============

function tokenize(text: string): Set<string> {
  const tokens = new Set<string>();
  // Split on non-alphanumeric, convert to lowercase
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length > 2);
  for (const word of words) tokens.add(word);
  // Also add camelCase splits
  const camelSplits = text.match(/[a-z]+|[A-Z][a-z]*/g) || [];
  for (const s of camelSplits) if (s.length > 2) tokens.add(s.toLowerCase());
  return tokens;
}

function extractChunks(content: string, file: string): CodeChunk[] {
  const chunks: CodeChunk[] = [];
  const lines = content.split('\n');
  
  // Simple chunking by function/class boundaries
  let currentChunk: { start: number; lines: string[] } | null = null;
  const functionRegex = /^(?:export\s+)?(?:async\s+)?(?:function|const|let|class|interface|type)\s+(\w+)/;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(functionRegex);
    
    if (match || (currentChunk && currentChunk.lines.length >= 50)) {
      // Save previous chunk
      if (currentChunk && currentChunk.lines.length > 0) {
        const code = currentChunk.lines.join('\n');
        chunks.push({
          file,
          startLine: currentChunk.start + 1,
          endLine: currentChunk.start + currentChunk.lines.length,
          code,
          tokens: tokenize(code),
          summary: generateSummary(code, currentChunk.lines[0]),
        });
      }
      currentChunk = { start: i, lines: [line] };
    } else if (currentChunk) {
      currentChunk.lines.push(line);
    } else {
      currentChunk = { start: i, lines: [line] };
    }
  }
  
  // Save last chunk
  if (currentChunk && currentChunk.lines.length > 0) {
    const code = currentChunk.lines.join('\n');
    chunks.push({
      file,
      startLine: currentChunk.start + 1,
      endLine: currentChunk.start + currentChunk.lines.length,
      code,
      tokens: tokenize(code),
      summary: generateSummary(code, currentChunk.lines[0]),
    });
  }
  
  return chunks;
}

function generateSummary(code: string, firstLine: string): string {
  // Extract function/class name and brief description
  const match = firstLine.match(/(?:export\s+)?(?:async\s+)?(?:function|const|let|class|interface|type)\s+(\w+)/);
  if (match) {
    const name = match[1];
    const type = firstLine.includes('class') ? 'Class' : 
                 firstLine.includes('interface') ? 'Interface' :
                 firstLine.includes('type') ? 'Type' :
                 firstLine.includes('function') || firstLine.includes('=>') ? 'Function' : 'Constant';
    return `${type} ${name}`;
  }
  return firstLine.slice(0, 50).trim() + (firstLine.length > 50 ? '...' : '');
}

function calculateScore(queryTokens: Set<string>, chunkTokens: Set<string>): number {
  let matches = 0;
  for (const token of queryTokens) {
    if (chunkTokens.has(token)) matches++;
    // Partial matching
    for (const ct of chunkTokens) {
      if (ct.includes(token) || token.includes(ct)) matches += 0.5;
    }
  }
  return matches / Math.max(queryTokens.size, 1);
}

async function getAllSourceFiles(dir: string): Promise<string[]> {
  const extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.py', '.rs', '.go'];
  const files: string[] = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true, recursive: true });
    for (const entry of entries) {
      if (entry.isFile() && extensions.includes(extname(entry.name))) {
        const fullPath = join(entry.parentPath || dir, entry.name);
        const relPath = relative(dir, fullPath);
        if (!relPath.includes('node_modules') && !relPath.includes('.git') && !relPath.includes('dist')) {
          files.push(relPath);
        }
      }
    }
  } catch { /* ignore */ }
  return files;
}

// ============ TOOLS ============

export interface SemanticIndexBuildParams {
  paths?: string[];
  force_rebuild?: boolean;
}

export interface SemanticIndexBuildResult {
  files_indexed: number;
  chunks_created: number;
  duration_ms: number;
  index_size_mb: number;
}

export async function semanticIndexBuild(params: SemanticIndexBuildParams): Promise<SemanticIndexBuildResult> {
  const startTime = Date.now();
  
  if (params.force_rebuild) {
    codeIndex.length = 0;
    indexBuilt = false;
  }
  
  if (indexBuilt && codeIndex.length > 0) {
    return {
      files_indexed: new Set(codeIndex.map(c => c.file)).size,
      chunks_created: codeIndex.length,
      duration_ms: 0,
      index_size_mb: 0,
    };
  }
  
  const basePaths = params.paths || ['.'];
  let filesIndexed = 0;
  
  for (const basePath of basePaths) {
    const fullBase = join(config.workingDir, basePath);
    const files = await getAllSourceFiles(fullBase);
    
    for (const file of files) {
      try {
        const content = await fs.readFile(join(fullBase, file), 'utf-8');
        const chunks = extractChunks(content, join(basePath, file).replace(/\\/g, '/'));
        codeIndex.push(...chunks);
        filesIndexed++;
      } catch { /* ignore */ }
    }
  }
  
  indexBuilt = true;
  
  // Estimate size
  const sizeBytes = codeIndex.reduce((acc, c) => acc + c.code.length, 0);
  
  return {
    files_indexed: filesIndexed,
    chunks_created: codeIndex.length,
    duration_ms: Date.now() - startTime,
    index_size_mb: Number((sizeBytes / 1024 / 1024).toFixed(2)),
  };
}

export interface SemanticSearchParams {
  query: string;
  top_k?: number;
  file_pattern?: string;
  min_score?: number;
}

export interface SemanticSearchResult {
  results: Array<{
    file: string;
    start_line: number;
    end_line: number;
    code: string;
    score: number;
    summary: string;
  }>;
  query_embedding_cached: boolean;
}

export async function semanticSearch(params: SemanticSearchParams): Promise<SemanticSearchResult> {
  // Ensure index is built
  if (!indexBuilt || codeIndex.length === 0) {
    await semanticIndexBuild({});
  }
  
  const queryTokens = tokenize(params.query);
  const topK = params.top_k || 10;
  const minScore = params.min_score || 0.1;
  
  let chunks = codeIndex;
  
  // Filter by file pattern
  if (params.file_pattern) {
    const pattern = params.file_pattern.replace(/\*/g, '.*');
    const regex = new RegExp(pattern, 'i');
    chunks = chunks.filter(c => regex.test(c.file));
  }
  
  // Score and sort
  const scored = chunks.map(chunk => ({
    ...chunk,
    score: calculateScore(queryTokens, chunk.tokens),
  })).filter(c => c.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  
  return {
    results: scored.map(c => ({
      file: c.file,
      start_line: c.startLine,
      end_line: c.endLine,
      code: c.code.slice(0, 500) + (c.code.length > 500 ? '\n...' : ''),
      score: Number(c.score.toFixed(3)),
      summary: c.summary,
    })),
    query_embedding_cached: indexBuilt,
  };
}

export interface SemanticSimilarParams {
  file: string;
  start_line: number;
  end_line: number;
  top_k?: number;
}

export interface SemanticSimilarResult {
  similar: Array<{
    file: string;
    start_line: number;
    end_line: number;
    code: string;
    score: number;
  }>;
}

export async function semanticSimilar(params: SemanticSimilarParams): Promise<SemanticSimilarResult> {
  // Ensure index is built
  if (!indexBuilt || codeIndex.length === 0) {
    await semanticIndexBuild({});
  }
  
  const topK = params.top_k || 5;
  
  // Find the source chunk
  const sourceChunk = codeIndex.find(c => 
    c.file === params.file && 
    c.startLine <= params.start_line && 
    c.endLine >= params.end_line
  );
  
  if (!sourceChunk) {
    // Try to read the file directly
    try {
      const content = await fs.readFile(join(config.workingDir, params.file), 'utf-8');
      const lines = content.split('\n').slice(params.start_line - 1, params.end_line);
      const code = lines.join('\n');
      const tokens = tokenize(code);
      
      const scored = codeIndex
        .filter(c => c.file !== params.file || c.startLine !== params.start_line)
        .map(chunk => ({
          ...chunk,
          score: calculateScore(tokens, chunk.tokens),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
      
      return {
        similar: scored.map(c => ({
          file: c.file,
          start_line: c.startLine,
          end_line: c.endLine,
          code: c.code.slice(0, 500),
          score: Number(c.score.toFixed(3)),
        })),
      };
    } catch {
      return { similar: [] };
    }
  }
  
  // Find similar chunks
  const scored = codeIndex
    .filter(c => c !== sourceChunk)
    .map(chunk => ({
      ...chunk,
      score: calculateScore(sourceChunk.tokens, chunk.tokens),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
  
  return {
    similar: scored.map(c => ({
      file: c.file,
      start_line: c.startLine,
      end_line: c.endLine,
      code: c.code.slice(0, 500),
      score: Number(c.score.toFixed(3)),
    })),
  };
}

// Reset index (for testing or forced rebuild)
export function resetIndex(): void {
  codeIndex.length = 0;
  indexBuilt = false;
}
