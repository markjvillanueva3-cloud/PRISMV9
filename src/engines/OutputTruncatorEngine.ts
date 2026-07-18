/**
 * OutputTruncatorEngine — Smart output truncation
 *
 * Truncates tool output while preserving structural integrity.
 * Unlike simple string slicing, it respects JSON boundaries,
 * preserves headers, and adds continuation markers.
 *
 * Token savings: Reduces verbose output by 50-90% while keeping
 * the most relevant information.
 *
 * @version 1.0.0
 */

export interface TruncateOptions {
  maxChars: number;
  preserveHead: number;  // lines to keep from start
  preserveTail: number;  // lines to keep from end
  addMarker: boolean;    // add "[truncated]" marker
}

const DEFAULT_OPTIONS: TruncateOptions = {
  maxChars: 4000,
  preserveHead: 10,
  preserveTail: 5,
  addMarker: true,
};

export class OutputTruncatorEngine {

  /**
   * Smart truncate — preserves head and tail, trims middle.
   */
  truncate(text: string, opts: Partial<TruncateOptions> = {}): string {
    const o = { ...DEFAULT_OPTIONS, ...opts };
    if (text.length <= o.maxChars) return text;

    const lines = text.split("\n");
    if (lines.length <= o.preserveHead + o.preserveTail + 1) {
      return text.substring(0, o.maxChars) + (o.addMarker ? "\n[truncated]" : "");
    }

    const head = lines.slice(0, o.preserveHead);
    const tail = lines.slice(-o.preserveTail);
    const omitted = lines.length - o.preserveHead - o.preserveTail;
    const marker = o.addMarker ? `\n... [${omitted} lines omitted] ...\n` : "\n...\n";

    const result = [...head, marker, ...tail].join("\n");
    if (result.length > o.maxChars) {
      return result.substring(0, o.maxChars) + (o.addMarker ? "\n[truncated]" : "");
    }
    return result;
  }

  /**
   * Truncate JSON output while preserving structure.
   */
  truncateJson(data: unknown, maxChars = 4000): string {
    const json = JSON.stringify(data, null, 2);
    if (json.length <= maxChars) return json;

    // For arrays, reduce items
    if (Array.isArray(data)) {
      const itemStr = JSON.stringify(data[0], null, 2);
      const itemSize = itemStr.length + 2; // +2 for comma+newline
      const maxItems = Math.max(1, Math.floor(maxChars / itemSize));
      const truncated = data.slice(0, maxItems);
      const result = JSON.stringify(truncated, null, 2);
      return result + `\n// ... ${data.length - maxItems} more items (${data.length} total)`;
    }

    // For objects, remove least important fields
    if (data && typeof data === "object") {
      const obj = data as Record<string, unknown>;
      const entries = Object.entries(obj);
      let result = "{\n";
      let currentSize = 2; // braces

      for (const [key, value] of entries) {
        const line = `  "${key}": ${JSON.stringify(value)}`;
        if (currentSize + line.length + 2 > maxChars) {
          const remaining = entries.length - result.split("\n").length + 1;
          result += `  // ... ${remaining} more fields\n`;
          break;
        }
        result += line + ",\n";
        currentSize += line.length + 2;
      }
      return result + "}";
    }

    return json.substring(0, maxChars) + "\n[truncated]";
  }

  /**
   * Truncate file list output.
   */
  truncateFileList(files: string[], maxItems = 20): string {
    if (files.length <= maxItems) return files.join("\n");
    const shown = files.slice(0, maxItems);
    return shown.join("\n") + `\n... and ${files.length - maxItems} more files (${files.length} total)`;
  }

  /**
   * Truncate grep/search results.
   */
  truncateSearchResults(results: string, maxMatches = 10): string {
    const lines = results.split("\n");
    if (lines.length <= maxMatches) return results;
    const shown = lines.slice(0, maxMatches);
    return shown.join("\n") + `\n... ${lines.length - maxMatches} more matches`;
  }

  /**
   * Estimate token savings from truncation.
   */
  savings(original: string, maxChars = 4000): { original: number; truncated: number; saved: number; percent: number } {
    const truncated = this.truncate(original, { maxChars });
    const origTokens = Math.ceil(original.length / 4);
    const truncTokens = Math.ceil(truncated.length / 4);
    return {
      original: origTokens,
      truncated: truncTokens,
      saved: origTokens - truncTokens,
      percent: origTokens > 0 ? Math.round(((origTokens - truncTokens) / origTokens) * 100) : 0,
    };
  }

  /**
   * Auto-truncate based on content type detection.
   */
  auto(content: string, maxChars = 4000): string {
    if (content.length <= maxChars) return content;

    // Detect JSON
    const trimmed = content.trim();
    if ((trimmed.startsWith("{") || trimmed.startsWith("[")) && (trimmed.endsWith("}") || trimmed.endsWith("]"))) {
      try {
        const parsed = JSON.parse(trimmed);
        return this.truncateJson(parsed, maxChars);
      } catch {
        // Not valid JSON, fall through
      }
    }

    // Detect file list (one path per line)
    const lines = content.split("\n");
    if (lines.length > 5 && lines.every(l => l.trim().length > 0 && !l.includes("  "))) {
      return this.truncateFileList(lines, Math.floor(maxChars / 80));
    }

    // Default smart truncate
    return this.truncate(content, { maxChars });
  }
}

export const outputTruncatorEngine = new OutputTruncatorEngine();
