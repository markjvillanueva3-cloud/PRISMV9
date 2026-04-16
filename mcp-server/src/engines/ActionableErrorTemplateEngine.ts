/**
 * ActionableErrorTemplateEngine — Turn blocking errors into actionable ones
 *
 * Phase 0.25.6 U-UX2 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Every blocking
 * hook error must tell the user what to do next instead of only what went
 * wrong. This engine registers templates keyed by error code and produces a
 * "Try instead:" suggestion, optionally a slash-command hint, and a docs
 * link when one exists.
 *
 * No I/O. Template expansion uses a deterministic `{var}` placeholder syntax.
 * Unknown codes fall back to a generic "no-template" result.
 *
 * @module engines/ActionableErrorTemplateEngine
 * @milestone PP-0.25.6-U-UX2
 */

export interface ErrorTemplate {
  code: string;
  headline: string; // short sentence describing the problem
  tryInstead: string; // concrete next action
  suggestedCommand?: string;
  docsUrl?: string;
}

export interface ActionableError {
  code: string;
  headline: string;
  tryInstead: string;
  suggestedCommand?: string;
  docsUrl?: string;
  message: string; // fully rendered text suitable for hook block
  hasTemplate: boolean;
  variablesUsed: string[];
}

export class ActionableErrorTemplateEngine {
  private readonly templates = new Map<string, ErrorTemplate>();

  register(template: ErrorTemplate): ErrorTemplate {
    this.validateTemplate(template);
    this.templates.set(template.code, { ...template });
    return template;
  }

  registerAll(templates: readonly ErrorTemplate[]): void {
    for (const t of templates) this.register(t);
  }

  has(code: string): boolean {
    return this.templates.has(code);
  }

  get(code: string): ErrorTemplate | null {
    return this.templates.get(code) ?? null;
  }

  /**
   * Render an actionable error. `variables` are substituted into {var} tokens
   * anywhere inside headline / tryInstead / suggestedCommand.
   */
  render(code: string, variables: Record<string, string | number> = {}): ActionableError {
    const template = this.templates.get(code);
    if (!template) {
      return {
        code,
        headline: `Error: ${code}`,
        tryInstead: "Contact maintainer — no template registered for this code.",
        message: `[${code}] no template registered.`,
        hasTemplate: false,
        variablesUsed: [],
      };
    }
    const usedVars = new Set<string>();
    const substitute = (text: string) => this.expand(text, variables, usedVars);
    const headline = substitute(template.headline);
    const tryInstead = substitute(template.tryInstead);
    const suggestedCommand = template.suggestedCommand ? substitute(template.suggestedCommand) : undefined;
    const docsUrl = template.docsUrl;

    const lines: string[] = [`[${code}] ${headline}`, `Try instead: ${tryInstead}`];
    if (suggestedCommand) lines.push(`Suggested command: ${suggestedCommand}`);
    if (docsUrl) lines.push(`Docs: ${docsUrl}`);

    return {
      code,
      headline,
      tryInstead,
      suggestedCommand,
      docsUrl,
      message: lines.join("\n"),
      hasTemplate: true,
      variablesUsed: [...usedVars],
    };
  }

  listCodes(): string[] {
    return [...this.templates.keys()].sort();
  }

  size(): number {
    return this.templates.size;
  }

  clear(): void {
    this.templates.clear();
  }

  // --- internals ---------------------------------------------------------

  private expand(text: string, vars: Record<string, string | number>, used: Set<string>): string {
    return text.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
      if (Object.prototype.hasOwnProperty.call(vars, key)) {
        used.add(key);
        return String(vars[key]);
      }
      return match; // leave placeholder unexpanded so callers can see missing vars
    });
  }

  private validateTemplate(t: ErrorTemplate): void {
    if (!t.code || t.code.trim() === "") throw new Error("code required");
    if (!t.headline || t.headline.trim() === "") throw new Error("headline required");
    if (!t.tryInstead || t.tryInstead.trim() === "") throw new Error("tryInstead required");
  }
}

export const actionableErrorTemplateEngine = new ActionableErrorTemplateEngine();
