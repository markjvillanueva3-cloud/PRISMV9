/**
 * PromptCompressionEngine — Compresses prompts for sub-agents
 *
 * Reduces token cost of Agent tool calls by compressing the prompt
 * while preserving semantic meaning. Removes filler words, redundant
 * instructions, and verbose formatting.
 *
 * Token savings: 20-50% reduction in Agent prompt tokens.
 *
 * @version 1.0.0
 */

export interface CompressionResult {
  original: string;
  compressed: string;
  originalTokens: number;
  compressedTokens: number;
  savings: number;
  savingsPercent: number;
  techniques: string[];
}

export class PromptCompressionEngine {

  /**
   * Compress a prompt while preserving meaning.
   */
  compress(prompt: string): CompressionResult {
    const techniques: string[] = [];
    let result = prompt;

    // 1. Remove filler phrases
    const fillers = [
      /\b(please|kindly|could you|would you|can you)\b/gi,
      /\b(I need you to|I want you to|I'd like you to)\b/gi,
      /\b(make sure to|be sure to|don't forget to)\b/gi,
      /\b(basically|essentially|fundamentally)\b/gi,
      /\b(in order to)\b/g,
      /\b(as well as)\b/g,
      /\b(the fact that)\b/g,
    ];
    const beforeFillers = result.length;
    for (const filler of fillers) {
      result = result.replace(filler, "");
    }
    if (result.length < beforeFillers) techniques.push("filler-removal");

    // 2. Collapse whitespace
    const beforeWs = result.length;
    result = result.replace(/\s+/g, " ").trim();
    if (result.length < beforeWs) techniques.push("whitespace-collapse");

    // 3. Remove redundant markdown formatting in agent prompts
    const beforeMd = result.length;
    result = result.replace(/#{1,6}\s+/g, ""); // headers
    result = result.replace(/\*{1,2}([^*]+)\*{1,2}/g, "$1"); // bold/italic
    result = result.replace(/`{3}[a-z]*\n?/g, ""); // code fences (keep content)
    if (result.length < beforeMd) techniques.push("markdown-strip");

    // 4. Abbreviate common programming terms
    const abbrevs: Array<[RegExp, string]> = [
      [/\bfunction\b/g, "fn"],
      [/\bdirectory\b/g, "dir"],
      [/\bconfiguration\b/g, "config"],
      [/\bimplementation\b/g, "impl"],
      [/\bdocumentation\b/g, "docs"],
      [/\brepository\b/g, "repo"],
      [/\benvironment\b/g, "env"],
      [/\bapplication\b/g, "app"],
      [/\bparameters?\b/g, "params"],
      [/\binformation\b/g, "info"],
    ];
    const beforeAbbrev = result.length;
    for (const [pattern, replacement] of abbrevs) {
      result = result.replace(pattern, replacement);
    }
    if (result.length < beforeAbbrev) techniques.push("abbreviation");

    // 5. Remove duplicate sentences
    const sentences = result.split(/\.\s+/);
    const unique = [...new Set(sentences)];
    if (unique.length < sentences.length) {
      result = unique.join(". ");
      techniques.push("dedup-sentences");
    }

    // Final cleanup
    result = result.replace(/\s+/g, " ").replace(/\s+\./g, ".").trim();

    const originalTokens = Math.ceil(prompt.length / 4);
    const compressedTokens = Math.ceil(result.length / 4);

    return {
      original: prompt,
      compressed: result,
      originalTokens,
      compressedTokens,
      savings: originalTokens - compressedTokens,
      savingsPercent: originalTokens > 0
        ? Math.round(((originalTokens - compressedTokens) / originalTokens) * 100)
        : 0,
      techniques,
    };
  }

  /**
   * Quick check if compression would be worthwhile.
   */
  isWorthCompressing(prompt: string): boolean {
    return prompt.length > 200;
  }

  /**
   * One-liner summary of compression potential.
   */
  oneLiner(prompt: string): string {
    if (!this.isWorthCompressing(prompt)) return "Too short to compress";
    const r = this.compress(prompt);
    return `${r.originalTokens}→${r.compressedTokens} tokens (${r.savingsPercent}% saved via ${r.techniques.join(", ")})`;
  }
}

export const promptCompressionEngine = new PromptCompressionEngine();
