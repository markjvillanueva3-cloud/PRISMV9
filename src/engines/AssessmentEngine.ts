/**
 * AssessmentEngine — PRISM Academy Quiz & Test System
 *
 * Handles all assessment for the machinist training platform:
 * - 4 question types (MC, calculation, visual ID, troubleshooting tree)
 * - Adaptive difficulty (wrong answers trigger remedial content)
 * - Auto-generation of questions from PRISM's physics engines
 * - Timed certification exams
 * - Score tracking and analytics
 *
 * Lines: ~650
 */

import type {
  Question,
  QuestionType,
  QuestionOption,
  DecisionNode,
} from "./CurriculumEngine.js";

// ═══════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════

export interface AssessmentSession {
  sessionId: string;
  quizId: string;
  studentId: string;
  questions: AssessmentQuestion[];
  startedAt: number;
  timeLimitMs?: number;
  currentIndex: number;
  answers: AnswerRecord[];
  completed: boolean;
  score?: number;
}

export interface AssessmentQuestion extends Question {
  /** Shuffled option order for this session */
  shuffledOptions?: QuestionOption[];
}

export interface AnswerRecord {
  questionId: string;
  answer: string | number;
  correct: boolean;
  timeMs: number;
  difficulty: number;
}

export interface AssessmentResult {
  sessionId: string;
  quizId: string;
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  timeMinutes: number;
  byDifficulty: {
    easy: { total: number; correct: number };
    medium: { total: number; correct: number };
    hard: { total: number; correct: number };
  };
  weakTags: string[];
  strongTags: string[];
}

export interface GeneratedQuestion {
  question: Question;
  source: string;
}

// ═══════════════════════════════════════════════════════════════
// Engine
// ═══════════════════════════════════════════════════════════════

export class AssessmentEngine {
  private sessions = new Map<string, AssessmentSession>();

  // ─────────────────────────────────────────────────────────
  // Session Management
  // ─────────────────────────────────────────────────────────

  startSession(
    studentId: string,
    quizId: string,
    questions: Question[],
    timeLimitMinutes?: number
  ): AssessmentSession {
    const sessionId = `assess-${Date.now()}-${
      Math.random().toString(36).substring(2, 8)
    }`;

    const session: AssessmentSession = {
      sessionId,
      quizId,
      studentId,
      questions: questions.map(q => ({
        ...q,
        shuffledOptions: q.options
          ? shuffleArray([...q.options])
          : undefined,
      })),
      startedAt: Date.now(),
      timeLimitMs: timeLimitMinutes
        ? timeLimitMinutes * 60 * 1000
        : undefined,
      currentIndex: 0,
      answers: [],
      completed: false,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  getCurrentQuestion(
    sessionId: string
  ): AssessmentQuestion | null {
    const session = this.sessions.get(sessionId);
    if (!session || session.completed) return null;

    if (session.timeLimitMs) {
      const elapsed = Date.now() - session.startedAt;
      if (elapsed > session.timeLimitMs) {
        this.completeSession(sessionId);
        return null;
      }
    }

    return session.questions[session.currentIndex] ?? null;
  }

  // ─────────────────────────────────────────────────────────
  // Answer Checking
  // ─────────────────────────────────────────────────────────

  submitAnswer(
    sessionId: string,
    answer: string | number
  ): {
    correct: boolean;
    explanation: string;
    correctAnswer?: string | number;
    nextQuestion: boolean;
    remedialLessonId?: string;
  } {
    const session = this.sessions.get(sessionId);
    if (!session || session.completed) {
      return {
        correct: false,
        explanation: "Session not found or already completed",
        nextQuestion: false,
      };
    }

    const question = session.questions[session.currentIndex];
    if (!question) {
      return {
        correct: false,
        explanation: "No more questions",
        nextQuestion: false,
      };
    }

    const startTime = session.answers.length > 0
      ? session.answers[session.answers.length - 1].timeMs
      : session.startedAt;
    const timeMs = Date.now() - startTime;

    const correct = this.checkAnswer(question, answer);

    session.answers.push({
      questionId: question.id,
      answer,
      correct,
      timeMs,
      difficulty: question.difficulty,
    });

    session.currentIndex++;
    const hasNext =
      session.currentIndex < session.questions.length;

    if (!hasNext) {
      this.completeSession(sessionId);
    }

    return {
      correct,
      explanation: question.explanation,
      correctAnswer: correct
        ? undefined
        : question.correctAnswer,
      nextQuestion: hasNext,
      remedialLessonId: correct
        ? undefined
        : question.remedialLessonId,
    };
  }

  private checkAnswer(
    question: Question,
    answer: string | number
  ): boolean {
    switch (question.type) {
      case "multiple_choice": {
        const correctOpt = question.options?.find(
          o => o.isCorrect
        );
        return correctOpt?.id === String(answer);
      }

      case "calculation": {
        const expected = Number(question.correctAnswer);
        const actual = Number(answer);
        if (isNaN(expected) || isNaN(actual)) return false;
        const tolerance = question.tolerance ?? 5;
        const pctDiff =
          Math.abs((actual - expected) / expected) * 100;
        return pctDiff <= tolerance;
      }

      case "visual_id": {
        return (
          String(answer).toLowerCase() ===
          String(question.correctAnswer).toLowerCase()
        );
      }

      case "troubleshooting_tree": {
        // Check if student's path reaches a correct node
        const path = String(answer).split(",");
        const tree = question.decisionTree ?? [];
        const lastNodeId = path[path.length - 1];
        const lastNode = tree.find(n => n.id === lastNodeId);
        return lastNode?.isCorrectPath ?? false;
      }

      default:
        return false;
    }
  }

  // ─────────────────────────────────────────────────────────
  // Session Completion
  // ─────────────────────────────────────────────────────────

  private completeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.completed = true;
    const correct = session.answers.filter(a => a.correct).length;
    session.score =
      session.answers.length > 0
        ? Math.round((correct / session.answers.length) * 100)
        : 0;
  }

  getResult(sessionId: string): AssessmentResult | null {
    const session = this.sessions.get(sessionId);
    if (!session || !session.completed) return null;

    const correct = session.answers.filter(a => a.correct);
    const wrong = session.answers.filter(a => !a.correct);

    const byDifficulty = {
      easy: { total: 0, correct: 0 },
      medium: { total: 0, correct: 0 },
      hard: { total: 0, correct: 0 },
    };

    for (const ans of session.answers) {
      const key =
        ans.difficulty === 1
          ? "easy"
          : ans.difficulty === 2
            ? "medium"
            : "hard";
      byDifficulty[key].total++;
      if (ans.correct) byDifficulty[key].correct++;
    }

    // Collect tags from wrong answers for weak topic detection
    const wrongTags = new Set<string>();
    const correctTags = new Set<string>();
    for (const ans of wrong) {
      const q = session.questions.find(
        q => q.id === ans.questionId
      );
      q?.tags.forEach(t => wrongTags.add(t));
    }
    for (const ans of correct) {
      const q = session.questions.find(
        q => q.id === ans.questionId
      );
      q?.tags.forEach(t => {
        if (!wrongTags.has(t)) correctTags.add(t);
      });
    }

    const totalTimeMs = session.answers.reduce(
      (sum, a) => sum + a.timeMs, 0
    );

    return {
      sessionId,
      quizId: session.quizId,
      score: session.score ?? 0,
      passed: (session.score ?? 0) >= 70,
      totalQuestions: session.answers.length,
      correctAnswers: correct.length,
      timeMinutes: Math.round(totalTimeMs / 60000 * 10) / 10,
      byDifficulty,
      weakTags: Array.from(wrongTags),
      strongTags: Array.from(correctTags),
    };
  }

  // ─────────────────────────────────────────────────────────
  // Question Generation from PRISM Physics
  // ─────────────────────────────────────────────────────────

  generateSpeedFeedQuestions(
    difficulty: 1 | 2 | 3 = 2
  ): Question[] {
    const questions: Question[] = [];

    // MC: Kienzle formula identification
    questions.push({
      id: "gen-sf-1",
      type: "multiple_choice",
      text: "Which formula correctly represents the Kienzle " +
        "specific cutting force model?",
      difficulty: 1,
      options: [
        {
          id: "a",
          text: "Fc = kc1.1 × ap × fz^(1-mc)",
          isCorrect: true,
          explanation: "Kienzle model: kc1.1 is the unit " +
            "specific cutting force, mc is the Kienzle exponent",
        },
        {
          id: "b",
          text: "Fc = kc × ap × fz",
          isCorrect: false,
          explanation: "Missing the (1-mc) exponent on fz",
        },
        {
          id: "c",
          text: "Fc = σ × A",
          isCorrect: false,
          explanation: "This is a generic stress × area " +
            "formula, not Kienzle",
        },
        {
          id: "d",
          text: "Fc = P / Vc",
          isCorrect: false,
          explanation: "This derives force from power, " +
            "not Kienzle model",
        },
      ],
      explanation: "The Kienzle model uses Fc = kc1.1 × " +
        "ap × fz^(1-mc) where kc1.1 is the specific " +
        "cutting force at 1mm² chip cross-section.",
      tags: ["kienzle", "cutting_force", "speed_feed"],
    });

    // Calculation: RPM from SFM
    if (difficulty >= 2) {
      questions.push({
        id: "gen-sf-2",
        type: "calculation",
        text: "Calculate the spindle RPM for a 12mm end mill " +
          "at a surface speed of 200 m/min.\n\n" +
          "Formula: RPM = (Vc × 1000) / (π × D)\n" +
          "Use π = 3.14159",
        difficulty: 2,
        correctAnswer: 5305,
        tolerance: 2,
        explanation: "RPM = (200 × 1000) / (π × 12) = " +
          "200000 / 37.7 ≈ 5305 RPM",
        tags: ["rpm", "sfm", "speed_feed"],
      });
    }

    // Calculation: Feed rate
    if (difficulty >= 2) {
      questions.push({
        id: "gen-sf-3",
        type: "calculation",
        text: "Calculate the table feed rate (mm/min) for:\n" +
          "- 4-flute end mill\n" +
          "- Chip load (fz) = 0.08 mm/tooth\n" +
          "- Spindle speed = 8000 RPM\n\n" +
          "Formula: Vf = fz × z × n",
        difficulty: 2,
        correctAnswer: 2560,
        tolerance: 1,
        explanation: "Vf = 0.08 × 4 × 8000 = 2560 mm/min",
        tags: ["feed_rate", "chip_load", "speed_feed"],
      });
    }

    // Hard: Taylor tool life
    if (difficulty >= 3) {
      questions.push({
        id: "gen-sf-4",
        type: "calculation",
        text: "Using Taylor's tool life equation " +
          "T = (C/Vc)^(1/n), calculate tool life in " +
          "minutes for:\n" +
          "- C = 350, n = 0.25\n" +
          "- Cutting speed Vc = 200 m/min",
        difficulty: 3,
        correctAnswer: 9.38,
        tolerance: 5,
        explanation: "T = (350/200)^(1/0.25) = 1.75^4 = " +
          "9.38 minutes",
        tags: ["taylor", "tool_life", "speed_feed"],
      });
    }

    return questions;
  }

  generateMaterialQuestions(): Question[] {
    return [
      {
        id: "gen-mat-1",
        type: "multiple_choice",
        text: "Which ISO material group does Ti-6Al-4V " +
          "belong to?",
        difficulty: 2,
        options: [
          {
            id: "a", text: "P (Steel)",
            isCorrect: false,
            explanation: "P is for steels",
          },
          {
            id: "b", text: "M (Stainless Steel)",
            isCorrect: false,
            explanation: "M is for stainless steels",
          },
          {
            id: "c", text: "S (Heat Resistant / Titanium)",
            isCorrect: true,
            explanation: "S covers titanium and " +
              "heat-resistant superalloys",
          },
          {
            id: "d", text: "N (Non-Ferrous)",
            isCorrect: false,
            explanation: "N is for aluminum, copper, etc.",
          },
        ],
        explanation: "Ti-6Al-4V is ISO group S — heat " +
          "resistant alloys and titanium.",
        tags: ["material", "iso_group", "titanium"],
      },
      {
        id: "gen-mat-2",
        type: "multiple_choice",
        text: "Why does Inconel 718 generate more cutting " +
          "heat than aluminum 6061?",
        difficulty: 2,
        options: [
          {
            id: "a",
            text: "Higher thermal conductivity",
            isCorrect: false,
            explanation: "Inconel has LOWER thermal " +
              "conductivity, which is part of the problem",
          },
          {
            id: "b",
            text: "Lower thermal conductivity traps " +
              "heat in the cutting zone",
            isCorrect: true,
            explanation: "Inconel's low thermal " +
              "conductivity (11 W/mK vs 167 for aluminum) " +
              "prevents heat dissipation",
          },
          {
            id: "c",
            text: "It melts at a lower temperature",
            isCorrect: false,
            explanation: "Inconel melts at ~1300°C, much " +
              "higher than aluminum's 660°C",
          },
          {
            id: "d",
            text: "It has a lower hardness",
            isCorrect: false,
            explanation: "Inconel 718 is ~36 HRC, harder " +
              "than most aluminum alloys",
          },
        ],
        explanation: "Superalloys like Inconel have very " +
          "low thermal conductivity, concentrating heat " +
          "at the tool tip instead of conducting it " +
          "into the chip or workpiece.",
        tags: [
          "material", "superalloy", "thermal",
          "inconel",
        ],
      },
    ];
  }

  generateTroubleshootingQuestion(): Question {
    return {
      id: "gen-trouble-1",
      type: "troubleshooting_tree",
      text: "Your CNC mill is producing chatter marks on " +
        "the workpiece during finishing. Follow the " +
        "decision tree to identify the root cause.",
      difficulty: 3,
      decisionTree: [
        {
          id: "start",
          text: "Is the chatter constant or intermittent?",
          children: [
            { label: "Constant", nextNodeId: "constant" },
            { label: "Intermittent", nextNodeId: "intermittent" },
          ],
        },
        {
          id: "constant",
          text: "Does it change with spindle speed?",
          children: [
            { label: "Yes — changes frequency", nextNodeId: "forced" },
            { label: "No — same at all speeds", nextNodeId: "regen" },
          ],
        },
        {
          id: "intermittent",
          text: "Does it happen at specific locations?",
          children: [
            { label: "Yes — at corners/thin walls", nextNodeId: "workpiece" },
            { label: "No — random", nextNodeId: "tool_wear" },
          ],
        },
        {
          id: "forced",
          text: "Root cause: Forced vibration from unbalanced " +
            "spindle or loose toolholder",
          children: [],
          isCorrectPath: true,
        },
        {
          id: "regen",
          text: "Root cause: Regenerative chatter — RPM is " +
            "in an unstable lobe. Change RPM to a stable zone.",
          children: [],
          isCorrectPath: true,
        },
        {
          id: "workpiece",
          text: "Root cause: Workpiece flexibility — thin " +
            "walls vibrate. Reduce DOC, add support, or " +
            "use climb milling.",
          children: [],
          isCorrectPath: true,
        },
        {
          id: "tool_wear",
          text: "Root cause: Tool wear — worn cutting edge " +
            "increases forces unpredictably. Replace tool.",
          children: [],
          isCorrectPath: true,
        },
      ],
      correctAnswer: "forced,regen,workpiece,tool_wear",
      explanation: "Chatter diagnosis follows a systematic " +
        "tree: constant vs intermittent, then speed-dependent " +
        "vs speed-independent, then location-specific vs random.",
      tags: ["chatter", "vibration", "troubleshooting"],
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════

function shuffleArray<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}
