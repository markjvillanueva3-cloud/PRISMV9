/**
 * RepetitionDetectorEngine — Detects repeated content in tool outputs
 *
 * Identifies duplicate lines, repeated patterns, and redundant content
 * that wastes tokens. Used by hooks to compress repetitive output.
 *
 * Token savings: 20-60% on repetitive outputs (test suites, log files,
 * directory listings with similar entries).
 *
 * @version 1.0.0
 */

export interface RepetitionReport {
  totalLines: number;
  uniqueLines: number;
  duplicateCount: number;
  duplicatePercent: number;
  topRepeats: Array<{ line: string; count: number }>;
  compressible: boolean;
  estimatedSavings: number; // tokens
}

export class RepetitionDetectorEngine {

  /**
   * Analyze text for repeated lines.
   */
  analyze(text: string, maxTopRepeats = 5): RepetitionReport {
    const lines = text.split("\n");
    const counts = new Map<string, number>();

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length === 0) continue;
      counts.set(trimmed, (counts.get(trimmed) || 0) + 1);
    }

    const nonEmpty = lines.filter(l => l.trim().length > 0).length;
    const unique = counts.size;
    const duplicateCount = nonEmpty - unique;

    // Sort by frequency
    const sorted = [...counts.entries()]
      .filter(([, c]) => c > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, maxTopRepeats);

    // Estimate token savings from dedup
    let wastedChars = 0;
    for (const [line, count] of counts) {
      if (count > 1) {
        wastedChars += line.length * (count - 1);
      }
    }

    return {
      totalLines: nonEmpty,
      uniqueLines: unique,
      duplicateCount,
      duplicatePercent: nonEmpty > 0 ? Math.round((duplicateCount / nonEmpty) * 100) : 0,
      topRepeats: sorted.map(([line, count]) => ({
        line: line.length > 80 ? line.substring(0, 77) + "..." : line,
        count,
      })),
      compressible: duplicateCount > 5 || (nonEmpty > 0 && duplicateCount / nonEmpty > 0.3),
      estimatedSavings: Math.ceil(wastedChars / 4),
    };
  }

  /**
   * Compress by deduplicating repeated lines.
   * Keeps first occurrence, replaces subsequent with count markers.
   */
  compress(text: string, minRepeats = 3): string {
    const lines = text.split("\n");
    const seen = new Map<string, { index: number; count: number }>();
    const result: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length === 0) {
        result.push(line);
        continue;
      }

      const entry = seen.get(trimmed);
      if (!entry) {
        seen.set(trimmed, { index: result.length, count: 1 });
        result.push(line);
      } else {
        entry.count++;
      }
    }

    // Add repeat markers for lines that appeared multiple times
    const output: string[] = [];
    for (const line of result) {
      const trimmed = line.trim();
      const entry = seen.get(trimmed);
      if (entry && entry.count >= minRepeats) {
        output.push(`${line}  [×${entry.count}]`);
      } else {
        output.push(line);
      }
    }

    return output.join("\n");
  }

  /**
   * Detect consecutive repeated blocks (not just lines).
   */
  detectBlocks(text: string, blockSize = 3): Array<{ block: string; count: number; startLine: number }> {
    const lines = text.split("\n");
    const blocks: Array<{ block: string; count: number; startLine: number }> = [];

    if (lines.length < blockSize * 2) return blocks;

    const blockCounts = new Map<string, { count: number; firstLine: number }>();

    for (let i = 0; i <= lines.length - blockSize; i++) {
      const block = lines.slice(i, i + blockSize).join("\n");
      const existing = blockCounts.get(block);
      if (!existing) {
        blockCounts.set(block, { count: 1, firstLine: i });
      } else {
        existing.count++;
      }
    }

    for (const [block, { count, firstLine }] of blockCounts) {
      if (count >= 2) {
        blocks.push({
          block: block.length > 120 ? block.substring(0, 117) + "..." : block,
          count,
          startLine: firstLine,
        });
      }
    }

    return blocks.sort((a, b) => b.count - a.count).slice(0, 5);
  }

  /**
   * One-liner summary.
   */
  oneLiner(text: string): string {
    const r = this.analyze(text);
    if (!r.compressible) return `${r.totalLines} lines, ${r.duplicatePercent}% dup — not worth compressing`;
    return `${r.totalLines} lines, ${r.duplicatePercent}% dup (~${r.estimatedSavings} tokens saveable)`;
  }
}

export const repetitionDetectorEngine = new RepetitionDetectorEngine();
