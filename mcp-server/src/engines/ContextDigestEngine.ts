/**
 * ContextDigestEngine - Ultra-compact file/directory digests
 *
 * Produces minimal-token summaries of files, directories, and symbol trees.
 * Used to pre-load understanding without reading full file contents.
 *
 * @version 1.0.0
 */

export interface DigestResult {
  path: string;
  type: string;
  lines: number;
  tokens: number;
  digest: string;
  symbols?: string[];
}

export interface DirectoryDigest {
  path: string;
  fileCount: number;
  totalTokens: number;
  digest: string;
  files: Array<{ name: string; type: string; lines: number }>;
}

export class ContextDigestEngine {
  digestFile(path: string, content: string): DigestResult {
    const lines = content.split("\n");
    const tokens = Math.ceil(content.length / 4);
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    const type = this.classifyExt(ext);

    let digest: string;
    let symbols: string[] | undefined;

    switch (type) {
      case "typescript":
      case "javascript":
        symbols = this.extractTsSymbols(content);
        digest = this.digestTs(path, lines, symbols);
        break;
      case "json":
        digest = this.digestJson(path, content);
        break;
      case "markdown":
        digest = this.digestMarkdown(path, lines);
        break;
      default:
        digest = this.digestGeneric(path, lines);
    }

    return { path, type, lines: lines.length, tokens, digest, symbols };
  }

  digestDirectory(
    dirPath: string,
    files: Array<{ name: string; content: string }>,
  ): DirectoryDigest {
    const fileInfos = files.map((f) => {
      const lines = f.content.split("\n").length;
      const ext = f.name.split(".").pop()?.toLowerCase() ?? "";
      return { name: f.name, type: this.classifyExt(ext), lines };
    });

    const totalTokens = files.reduce(
      (sum, f) => sum + Math.ceil(f.content.length / 4),
      0,
    );
    const byType = new Map<string, number>();
    for (const fi of fileInfos) {
      byType.set(fi.type, (byType.get(fi.type) ?? 0) + 1);
    }

    const typeSummary = Array.from(byType.entries())
      .map(([t, c]) => t + ":" + c)
      .join(" ");

    const digest =
      dirPath +
      " | " +
      files.length +
      " files | ~" +
      totalTokens +
      " tok | " +
      typeSummary;

    return {
      path: dirPath,
      fileCount: files.length,
      totalTokens,
      digest,
      files: fileInfos,
    };
  }

  savings(
    fullTokens: number,
    digestText: string,
  ): { saved: number; percent: number } {
    const digestTokens = Math.ceil(digestText.length / 4);
    const saved = fullTokens - digestTokens;
    const percent =
      fullTokens > 0 ? Math.round((saved / fullTokens) * 100) : 0;
    return { saved: Math.max(0, saved), percent: Math.max(0, percent) };
  }

  oneLiner(result: DigestResult): string {
    const sc = result.symbols?.length ?? 0;
    return (
      result.path +
      " | " +
      result.type +
      " | " +
      result.lines +
      "L ~" +
      result.tokens +
      "tok" +
      (sc > 0 ? " | " + sc + " symbols" : "")
    );
  }

  private classifyExt(ext: string): string {
    if (["ts", "tsx", "mts", "cts"].includes(ext)) return "typescript";
    if (["js", "jsx", "mjs", "cjs"].includes(ext)) return "javascript";
    if (ext === "json") return "json";
    if (["md", "mdx"].includes(ext)) return "markdown";
    if (["yaml", "yml"].includes(ext)) return "yaml";
    if (["sh", "bash"].includes(ext)) return "shell";
    return "text";
  }

  private extractTsSymbols(content: string): string[] {
    const symbols: string[] = [];
    const patterns = [
      /export\s+(?:default\s+)?(?:class|interface|type|enum|function|const|let)\s+(\w+)/g,
      /(?:class|interface|type|enum)\s+(\w+)/g,
    ];
    const seen = new Set<string>();
    for (const pat of patterns) {
      let m: RegExpExecArray | null;
      while ((m = pat.exec(content)) !== null) {
        if (!seen.has(m[1])) {
          seen.add(m[1]);
          symbols.push(m[1]);
        }
      }
    }
    return symbols;
  }

  private digestTs(
    path: string,
    lines: string[],
    symbols: string[],
  ): string {
    const imports = lines.filter((l) => l.trim().startsWith("import ")).length;
    const exports = lines.filter((l) => l.includes("export ")).length;
    const parts = [path, lines.length + "L"];
    if (imports > 0) parts.push(imports + " imports");
    if (exports > 0) parts.push(exports + " exports");
    if (symbols.length > 0)
      parts.push("symbols: " + symbols.slice(0, 10).join(", "));
    return parts.join(" | ");
  }

  private digestJson(path: string, content: string): string {
    try {
      const obj = JSON.parse(content);
      const keys = Object.keys(obj);
      return (
        path +
        " | JSON | " +
        keys.length +
        " top keys: " +
        keys.slice(0, 8).join(", ")
      );
    } catch {
      return path + " | JSON (invalid)";
    }
  }

  private digestMarkdown(path: string, lines: string[]): string {
    const headings = lines.filter((l) => l.startsWith("#"));
    return (
      path +
      " | MD | " +
      lines.length +
      "L | " +
      headings.length +
      " headings" +
      (headings.length > 0
        ? ": " +
          headings
            .slice(0, 5)
            .map((h) => h.replace(/^#+\s*/, ""))
            .join(", ")
        : "")
    );
  }

  private digestGeneric(path: string, lines: string[]): string {
    return (
      path +
      " | " +
      lines.length +
      " lines | ~" +
      Math.ceil(lines.join("\n").length / 4) +
      " tokens"
    );
  }
}

export const contextDigestEngine = new ContextDigestEngine();
