/**
 * EditPlannerEngine - Minimizes edit context for token savings
 *
 * Given a file and desired change, finds the minimum unique context
 * needed for old_string to avoid ambiguity. Also batches multiple
 * edits to the same file into optimal sequences.
 *
 * @version 1.0.0
 */

export interface EditOperation {
  filePath: string;
  oldText: string;
  newText: string;
  line?: number;
}

export interface MinimalEdit {
  oldString: string;
  newString: string;
  contextLines: number;
  tokenCost: number;
  unique: boolean;
}

export interface EditBatch {
  filePath: string;
  edits: EditOperation[];
  totalTokenCost: number;
  canCombine: boolean;
  combinedEdit?: { oldString: string; newString: string };
}

export class EditPlannerEngine {
  /**
   * Find the minimum unique context around a target line.
   */
  findMinimalContext(
    fileContent: string,
    targetText: string,
    contextBefore = 0,
    contextAfter = 0,
  ): MinimalEdit {
    const lines = fileContent.split("\n");
    const targetIdx = lines.findIndex((l) => l.includes(targetText));

    if (targetIdx < 0) {
      return {
        oldString: targetText,
        newString: targetText,
        contextLines: 0,
        tokenCost: Math.ceil(targetText.length / 4) * 2,
        unique: false,
      };
    }

    // Check if target is unique as-is
    const occurrences = lines.filter((l) => l.includes(targetText)).length;
    if (occurrences === 1) {
      const line = lines[targetIdx];
      return {
        oldString: line,
        newString: line,
        contextLines: 0,
        tokenCost: Math.ceil(line.length / 4) * 2,
        unique: true,
      };
    }

    // Expand context until unique
    for (let ctx = 1; ctx <= 5; ctx++) {
      const start = Math.max(0, targetIdx - ctx);
      const end = Math.min(lines.length, targetIdx + ctx + 1);
      const chunk = lines.slice(start, end).join("\n");

      const chunkOccurrences = this.countOccurrences(fileContent, chunk);
      if (chunkOccurrences === 1) {
        return {
          oldString: chunk,
          newString: chunk,
          contextLines: ctx,
          tokenCost: Math.ceil(chunk.length / 4) * 2,
          unique: true,
        };
      }
    }

    // Fallback: use 5 lines of context
    const start = Math.max(0, targetIdx - 5);
    const end = Math.min(lines.length, targetIdx + 6);
    const chunk = lines.slice(start, end).join("\n");
    return {
      oldString: chunk,
      newString: chunk,
      contextLines: 5,
      tokenCost: Math.ceil(chunk.length / 4) * 2,
      unique: this.countOccurrences(fileContent, chunk) === 1,
    };
  }

  /**
   * Plan a batch of edits to a single file.
   */
  planBatch(filePath: string, edits: EditOperation[]): EditBatch {
    const totalTokenCost = edits.reduce(
      (sum, e) => sum + Math.ceil((e.oldText.length + e.newText.length) / 4),
      0,
    );

    // Check if edits are adjacent and can be combined
    const canCombine =
      edits.length >= 2 &&
      edits.every((e) => e.line !== undefined) &&
      this.areAdjacent(edits);

    let combinedEdit: { oldString: string; newString: string } | undefined;
    if (canCombine) {
      const sorted = [...edits].sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
      combinedEdit = {
        oldString: sorted.map((e) => e.oldText).join("\n"),
        newString: sorted.map((e) => e.newText).join("\n"),
      };
    }

    return {
      filePath,
      edits,
      totalTokenCost,
      canCombine,
      combinedEdit,
    };
  }

  /**
   * Estimate tokens saved by using minimal context vs full line.
   */
  estimateSavings(fullContext: string, minimalContext: string): number {
    const fullTokens = Math.ceil(fullContext.length / 4) * 2;
    const minTokens = Math.ceil(minimalContext.length / 4) * 2;
    return Math.max(0, fullTokens - minTokens);
  }

  /**
   * Suggest whether to use Edit or Write for a change.
   */
  suggestTool(
    fileSize: number,
    changeSize: number,
  ): { tool: "Edit" | "Write"; reason: string } {
    const changeRatio = changeSize / Math.max(fileSize, 1);
    if (changeRatio > 0.5) {
      return {
        tool: "Write",
        reason: "Change is " + Math.round(changeRatio * 100) + "% of file - Write is cheaper",
      };
    }
    return {
      tool: "Edit",
      reason: "Change is " + Math.round(changeRatio * 100) + "% of file - Edit minimizes context",
    };
  }

  private countOccurrences(text: string, search: string): number {
    let count = 0;
    let pos = 0;
    while ((pos = text.indexOf(search, pos)) !== -1) {
      count++;
      pos += 1;
    }
    return count;
  }

  private areAdjacent(edits: EditOperation[]): boolean {
    if (edits.some((e) => e.line === undefined)) return false;
    const sorted = [...edits].sort((a, b) => (a.line ?? 0) - (b.line ?? 0));
    for (let i = 1; i < sorted.length; i++) {
      if ((sorted[i].line ?? 0) - (sorted[i - 1].line ?? 0) > 3) return false;
    }
    return true;
  }
}

export const editPlannerEngine = new EditPlannerEngine();
