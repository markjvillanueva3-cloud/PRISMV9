#!/usr/bin/env npx ts-node
/**
 * extract-mental-model.ts — U-CTX03 Mental Model Extractor
 *
 * Reads recent tool calls, reasoning ledger, and open todos to produce a
 * compact ~2K summary of what was being solved and what was tried.
 *
 * Usage:
 *   npx ts-node scripts/extract-mental-model.ts
 *   npx ts-node scripts/extract-mental-model.ts --json
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface MentalModel {
  currentObjective: string;
  approachTaken: string;
  keyDecisions: string[];
  openQuestions: string[];
  blockers: string[];
  nextSteps: string[];
  lessonsLearned: string[];
  tokenEstimate: number;
}

interface ReasoningEntry {
  id: string;
  at: string;
  dispatcher: string;
  action: string;
  keywords: string[];
  inputs_summary?: string;
  outputs_summary?: string;
  reasoning_steps?: Array<{
    question: string;
    conclusion: string;
  }>;
}

interface TodoEntry {
  id: string;
  text: string;
  status: string;
}

const STATE_DIR = path.resolve(__dirname, "../data/state");
const REASONING_LEDGER = path.join(STATE_DIR, "REASONING_TRACE_LEDGER.jsonl");
const MILLING_LEDGER = path.join(STATE_DIR, "MILLING_REASONING_TRACE_LEDGER.jsonl");
const TODOS_FILE = path.join(STATE_DIR, "OPEN_TODOS.json");
const ACTIVE_WORK_FILE = "H:/prism/state/shared/ACTIVE_WORK_REGISTRY.json";
const SESSION_MEMORY = "H:/prism/state/SESSION_MEMORY.json";

function readJSONL(filePath: string, limit = 50): unknown[] {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.trim().split("\n").filter(Boolean);
    return lines.slice(-limit).map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    }).filter(Boolean);
  } catch {
    return [];
  }
}

function readJSON<T>(filePath: string): T | null {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function extractObjectiveFromReasoning(entries: ReasoningEntry[]): string {
  if (entries.length === 0) return "No recent work detected";

  // Find most common dispatcher/action combination
  const actionCounts = new Map<string, number>();
  for (const e of entries) {
    const key = `${e.dispatcher}:${e.action}`;
    actionCounts.set(key, (actionCounts.get(key) || 0) + 1);
  }

  const sorted = Array.from(actionCounts.entries()).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return "Working on PRISM development tasks";

  const [topAction, count] = sorted[0];
  const recent = entries[entries.length - 1];

  // Infer objective from action patterns
  if (topAction.includes("roadmap") || topAction.includes("orchestrate")) {
    return `Executing roadmap milestone: ${recent.keywords?.join(", ") || "in progress"}`;
  }
  if (topAction.includes("cutting") || topAction.includes("force")) {
    return `Optimizing cutting parameters for machining operation`;
  }
  if (topAction.includes("wedm") || topAction.includes("edm")) {
    return `Wire EDM programming and optimization`;
  }
  if (topAction.includes("lathe") || topAction.includes("turning")) {
    return `Lathe/turning operation development`;
  }

  return `Working on ${topAction} (${count} recent operations)`;
}

function extractApproach(entries: ReasoningEntry[]): string {
  if (entries.length === 0) return "No approach taken yet";

  const recent = entries.slice(-5);
  const actions = recent.map((e) => e.action).filter(Boolean);
  const uniqueActions = [...new Set(actions)];

  if (uniqueActions.length <= 2) {
    return `Focused approach: ${uniqueActions.join(", ")}`;
  }

  return `Multi-step approach: ${uniqueActions.slice(0, 4).join(" → ")}`;
}

function extractKeyDecisions(entries: ReasoningEntry[]): string[] {
  const decisions: string[] = [];

  for (const e of entries.slice(-10)) {
    if (e.reasoning_steps) {
      for (const step of e.reasoning_steps.slice(-2)) {
        if (step.conclusion && step.conclusion.length < 100) {
          decisions.push(step.conclusion);
        }
      }
    }
    if (e.outputs_summary && e.outputs_summary.length < 80) {
      decisions.push(`${e.action}: ${e.outputs_summary}`);
    }
  }

  return decisions.slice(-5);
}

function extractBlockers(entries: ReasoningEntry[], todos: TodoEntry[]): string[] {
  const blockers: string[] = [];

  // Check for error entries
  for (const e of entries.slice(-20)) {
    if ((e as { error?: string }).error) {
      blockers.push((e as { error: string }).error.slice(0, 80));
    }
  }

  // Check for blocked todos
  for (const todo of todos) {
    if (todo.status === "blocked") {
      blockers.push(`TODO blocked: ${todo.text.slice(0, 60)}`);
    }
  }

  return blockers.slice(-3);
}

function extractNextSteps(todos: TodoEntry[], reasoning: ReasoningEntry[]): string[] {
  const steps: string[] = [];

  // Pending todos are next steps
  for (const todo of todos.filter((t) => t.status === "pending").slice(0, 3)) {
    steps.push(todo.text.slice(0, 80));
  }

  // If no todos, infer from last reasoning
  if (steps.length === 0 && reasoning.length > 0) {
    const last = reasoning[reasoning.length - 1];
    steps.push(`Continue ${last.action} in ${last.dispatcher}`);
  }

  return steps;
}

interface ActiveWorkEntry {
  track?: string;
  milestone?: string;
  status?: string;
}

function extractOpenQuestions(activeWork: ActiveWorkEntry[]): string[] {
  const questions: string[] = [];

  for (const work of activeWork) {
    if (work.status === "in_progress") {
      questions.push(`How to complete ${work.milestone || work.track}?`);
    }
  }

  if (questions.length === 0) {
    questions.push("What milestone to work on next?");
  }

  return questions.slice(0, 3);
}

function main(): void {
  const args = process.argv.slice(2);
  const jsonOutput = args.includes("--json");

  // Load data sources
  const globalReasoning = readJSONL(REASONING_LEDGER, 30) as ReasoningEntry[];
  const millingReasoning = readJSONL(MILLING_LEDGER, 20) as ReasoningEntry[];
  const allReasoning = [...globalReasoning, ...millingReasoning]
    .sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
    .slice(-50);

  const todosData = readJSON<{ todos?: TodoEntry[] }>(TODOS_FILE);
  const todos = todosData?.todos || [];

  const activeWorkData = readJSON<{ active?: ActiveWorkEntry[] }>(ACTIVE_WORK_FILE);
  const activeWork = activeWorkData?.active || [];

  // Extract mental model components
  const model: MentalModel = {
    currentObjective: extractObjectiveFromReasoning(allReasoning),
    approachTaken: extractApproach(allReasoning),
    keyDecisions: extractKeyDecisions(allReasoning),
    openQuestions: extractOpenQuestions(activeWork),
    blockers: extractBlockers(allReasoning, todos),
    nextSteps: extractNextSteps(todos, allReasoning),
    lessonsLearned: [],
    tokenEstimate: 0,
  };

  // Estimate tokens
  model.tokenEstimate = Math.ceil(JSON.stringify(model).length / 3.5);

  if (jsonOutput) {
    console.log(JSON.stringify(model, null, 2));
    return;
  }

  // Human-readable output
  console.log("=== Mental Model Summary ===");
  console.log(`Token Estimate: ~${model.tokenEstimate}`);
  console.log("");
  console.log("## Current Objective");
  console.log(`  ${model.currentObjective}`);
  console.log("");
  console.log("## Approach Taken");
  console.log(`  ${model.approachTaken}`);
  console.log("");
  if (model.keyDecisions.length > 0) {
    console.log("## Key Decisions");
    for (const d of model.keyDecisions) {
      console.log(`  - ${d}`);
    }
    console.log("");
  }
  if (model.blockers.length > 0) {
    console.log("## Blockers");
    for (const b of model.blockers) {
      console.log(`  - ${b}`);
    }
    console.log("");
  }
  console.log("## Next Steps");
  for (const s of model.nextSteps) {
    console.log(`  - ${s}`);
  }
}

main();
