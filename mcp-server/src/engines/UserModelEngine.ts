/**
 * UserModelEngine — "What the user knows/wants" slice of the triple model
 *
 * Phase 0.13 U-SAW4 partner of SelfModelEngine and WorldModelEngine. Holds a
 * theory-of-mind snapshot: preferences, observed knowledge, open questions.
 * The hook layer uses this to avoid re-explaining familiar concepts and to
 * surface the right level of detail per turn.
 *
 * Theory of mind is hard. We keep the representation deliberately shallow:
 *   - preferences: key→value pairs the user has volunteered or confirmed
 *   - knownTopics: topics the user has demonstrated familiarity with
 *   - openQuestions: unresolved questions the agent owes the user
 *
 * Confidence per entry is updated by observation count and last-seen recency.
 *
 * @module engines/UserModelEngine
 * @milestone PP-0.13-U-SAW4
 */

export interface PreferenceEntry {
  key: string;
  value: string;
  confirmedAt: string;
  confidence: number; // 0..1
}

export interface KnownTopic {
  topic: string;
  observationCount: number;
  firstObservedAt: string;
  lastObservedAt: string;
  confidence: number; // 0..1
}

export interface OpenQuestion {
  id: string;
  question: string;
  raisedAt: string;
  status: "open" | "answered" | "dropped";
  resolvedAt?: string;
}

export interface UserSnapshot {
  schemaVersion: 1;
  userId: string;
  preferences: PreferenceEntry[];
  knownTopics: KnownTopic[];
  openQuestions: OpenQuestion[];
  updatedAt: string;
}

export class UserModelEngine {
  private readonly userId: string;
  private readonly preferences = new Map<string, PreferenceEntry>();
  private readonly topics = new Map<string, KnownTopic>();
  private questions: OpenQuestion[] = [];
  private updatedAt: string;
  private nextQid = 1;

  constructor(userId: string) {
    if (!userId || userId.trim() === "") {
      throw new Error("UserModelEngine requires a non-empty userId");
    }
    this.userId = userId;
    this.updatedAt = new Date().toISOString();
  }

  getUserId(): string {
    return this.userId;
  }

  setPreference(key: string, value: string, at?: string, confidence = 0.9): PreferenceEntry {
    const k = key.trim();
    if (!k) throw new Error("preference key must be non-empty");
    if (confidence < 0 || confidence > 1) throw new Error("confidence must be in [0, 1]");
    const entry: PreferenceEntry = {
      key: k,
      value,
      confirmedAt: at ?? new Date().toISOString(),
      confidence,
    };
    this.preferences.set(k, entry);
    this.touch();
    return entry;
  }

  getPreference(key: string): PreferenceEntry | null {
    return this.preferences.get(key.trim()) ?? null;
  }

  listPreferences(): PreferenceEntry[] {
    return [...this.preferences.values()];
  }

  observeTopic(topic: string, at?: string): KnownTopic {
    const t = topic.trim();
    if (!t) throw new Error("topic must be non-empty");
    const now = at ?? new Date().toISOString();
    const existing = this.topics.get(t);
    if (existing) {
      existing.observationCount += 1;
      existing.lastObservedAt = now;
      existing.confidence = Math.min(1, Math.round((existing.confidence + 0.05) * 10000) / 10000);
      this.touch();
      return existing;
    }
    const entry: KnownTopic = {
      topic: t,
      observationCount: 1,
      firstObservedAt: now,
      lastObservedAt: now,
      confidence: 0.25,
    };
    this.topics.set(t, entry);
    this.touch();
    return entry;
  }

  knowsTopic(topic: string, minConfidence = 0.5): boolean {
    const e = this.topics.get(topic.trim());
    return !!e && e.confidence >= minConfidence;
  }

  listTopics(): KnownTopic[] {
    return [...this.topics.values()].sort((a, b) => b.confidence - a.confidence);
  }

  raiseQuestion(question: string, at?: string): OpenQuestion {
    const q = question.trim();
    if (!q) throw new Error("question must be non-empty");
    const entry: OpenQuestion = {
      id: `q${this.nextQid++}`,
      question: q,
      raisedAt: at ?? new Date().toISOString(),
      status: "open",
    };
    this.questions.push(entry);
    this.touch();
    return entry;
  }

  resolveQuestion(id: string, outcome: "answered" | "dropped", at?: string): OpenQuestion | null {
    const q = this.questions.find((x) => x.id === id);
    if (!q) return null;
    if (q.status !== "open") return q;
    q.status = outcome;
    q.resolvedAt = at ?? new Date().toISOString();
    this.touch();
    return q;
  }

  listOpenQuestions(): OpenQuestion[] {
    return this.questions.filter((q) => q.status === "open");
  }

  listAllQuestions(): OpenQuestion[] {
    return [...this.questions];
  }

  snapshot(): UserSnapshot {
    return {
      schemaVersion: 1,
      userId: this.userId,
      preferences: this.listPreferences(),
      knownTopics: [...this.topics.values()],
      openQuestions: [...this.questions],
      updatedAt: this.updatedAt,
    };
  }

  toJSON(): UserSnapshot {
    return this.snapshot();
  }

  static fromJSON(data: UserSnapshot): UserModelEngine {
    if (data.schemaVersion !== 1) {
      throw new Error(`UserModelEngine.fromJSON: unsupported schemaVersion ${data.schemaVersion}`);
    }
    const e = new UserModelEngine(data.userId);
    for (const p of data.preferences) e.preferences.set(p.key, { ...p });
    for (const t of data.knownTopics) e.topics.set(t.topic, { ...t });
    e.questions = data.openQuestions.map((q) => ({ ...q }));
    const maxId = e.questions.reduce((m, q) => Math.max(m, parseInt(q.id.slice(1), 10) || 0), 0);
    e.nextQid = maxId + 1;
    e.updatedAt = data.updatedAt;
    return e;
  }

  private touch(): void {
    this.updatedAt = new Date().toISOString();
  }
}
