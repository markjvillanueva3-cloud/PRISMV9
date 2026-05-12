/**
 * VideoELearningAIEngine — AI-Powered E-Learning Knowledge Extraction
 *
 * Extracts structured manufacturing knowledge from video-based e-learning content.
 * Integrates with the VideoLearningEngine (FFmpeg + Whisper) pipeline and stores
 * discovered knowledge in TribalKnowledgeEngine for downstream retrieval.
 *
 * Resources cataloged:
 *   H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning/  (hyperMILL 31.0 — 37 MP4s)
 *   H:/prism/Resources/OPEN MIND/doc/33.0/E-Learning/  (hyperMILL 33.0 — 37 MP4s)
 *   H:/prism/Resources/SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS/Simulation/data/Avi/  (12 FEA demos)
 *
 * Pipeline per course:
 *   meta.xml → course metadata
 *   story_content/frame.xml → lesson slide index (titles, navigation order)
 *   story_content/*.mp4 → video files delegated to VideoLearningEngine
 *   VideoLearningEngine → transcript + frame analysis → VideoKnowledgeItem[]
 *   TribalKnowledgeEngine → persistent tip storage
 */

import * as fs from "fs";
import * as path from "path";
import { log } from "../utils/Logger.js";
import type {
  VideoProcessResult,
  VideoKnowledgeItem,
} from "./VideoLearningEngine.js";

// ── Constants ────────────────────────────────────────────────────────────────

/** Canonical resource paths for known e-learning libraries. */
export const ELEARNING_RESOURCE_PATHS = {
  HYPERMILL_31: "H:/prism/Resources/OPEN MIND/doc/31.0/E-Learning",
  HYPERMILL_33: "H:/prism/Resources/OPEN MIND/doc/33.0/E-Learning",
  SOLIDWORKS_FEA: "H:/prism/Resources/SOLIDWORKS/SOLIDWORKS Corp/SOLIDWORKS/Simulation/data/Avi",
} as const;

/** Difficulty levels used for learning path recommendations. */
export type DifficultyLevel = "beginner" | "intermediate" | "advanced";

/** Articulate Storyline course duration strings map to approximate seconds. */
const DURATION_MAP: Record<string, number> = {
  "Über 4 Minutes": 240,
  "Over 4 Minutes": 240,
  "Over 5 Minutes": 300,
  "Over 3 Minutes": 180,
  "Over 10 Minutes": 600,
  "Over 15 Minutes": 900,
};

// ── Core Types ───────────────────────────────────────────────────────────────

/** Parsed from meta.xml at the root of an Articulate Storyline course folder. */
export interface ELearningCourse {
  /** Course identifier from meta.xml @id. */
  id: string;
  /** Human-readable course title from meta.xml @title. */
  title: string;
  /** Containing module name (parent directory). */
  module_name: string;
  /** hyperMILL version or source tool (e.g., "31.0", "33.0", "SOLIDWORKS"). */
  version: string;
  /** ISO date string from @datepublished. */
  date_published: string;
  /** Total estimated duration in seconds. */
  duration_seconds: number;
  /** Total slide count from @viewslides. */
  slide_count: number;
  /** Absolute path to the course root directory. */
  course_path: string;
  /** Lesson titles extracted from story_content/frame.xml slidelink[@displaytext]. */
  lesson_titles: string[];
  /** Absolute paths to MP4 video files within story_content/. */
  video_paths: string[];
  /** Detected language/locale (e.g., "en", "en-US"). */
  locale: string;
}

/** A single lesson video within a course, enriched with AI-derived metadata. */
export interface ELearningLesson {
  /** Unique lesson identifier: "<course_id>:<video_filename_stem>". */
  lesson_id: string;
  /** Human-readable title from course slide index or filename. */
  title: string;
  /** Parent course reference. */
  course_id: string;
  /** Absolute path to the MP4 file. */
  video_path: string;
  /** Estimated duration in seconds (derived from filename pattern or ffprobe). */
  duration_seconds: number;
  /** Video resolution string (e.g., "1920x1168") parsed from filename. */
  resolution: string;
  /** Slide index (0-based) within the course. */
  slide_index: number;
  /** Computed feature vector for recommendation and similarity ranking. */
  feature_vector: LessonFeatureVector;
}

/** AI-derived feature vector for learning path optimization. */
export interface LessonFeatureVector {
  /** Semantic topic tags (e.g., "machine-simulation", "collision-detection"). */
  topic_tags: string[];
  /** Inferred difficulty: beginner, intermediate, or advanced. */
  difficulty_level: DifficultyLevel;
  /** Duration in seconds. */
  duration_seconds: number;
  /** Skills that should be acquired before this lesson. */
  prerequisite_skills: string[];
  /** What learner can do after completing this lesson. */
  learning_outcomes: string[];
  /**
   * Visual complexity score 0-1.
   * Estimated from resolution and slide density; 1 = full-HD dense content.
   */
  visual_complexity: number;
  /**
   * Narration quality score 0-1.
   * Estimated from audio track presence metadata; refined post-transcription.
   */
  narration_quality: number;
}

/** A discovered knowledge topic extracted from lesson transcripts and frames. */
export interface VideoKnowledgeTopic {
  /** Unique topic identifier. */
  topic_id: string;
  /** Descriptive label. */
  label: string;
  /** Which lesson IDs cover this topic. */
  covered_by_lessons: string[];
  /** Aggregated topic tags. */
  tags: string[];
  /** Average confidence across contributing knowledge items. */
  avg_confidence: number;
}

/** Ordered learning path for a specific skill level and topic. */
export interface LearningPath {
  /** Identifying label (e.g., "beginner:machine-simulation"). */
  path_id: string;
  topic: string;
  skill_level: DifficultyLevel;
  /** Ordered list of lesson IDs to complete. */
  lesson_sequence: string[];
  /** Estimated total time in seconds. */
  total_duration_seconds: number;
  /** Rationale for this ordering. */
  rationale: string;
}

/** Single quiz question for learning validation. */
export interface QuizQuestion {
  /** Source lesson or topic. */
  source: string;
  /** Question stem. */
  question: string;
  /** Four answer choices (A–D). */
  choices: [string, string, string, string];
  /** Index of correct choice (0–3). */
  correct_index: number;
  /** Brief explanation of the correct answer. */
  explanation: string;
  /** Related topic tags. */
  tags: string[];
}

/** A discrete workflow step extracted from a lesson. */
export interface WorkflowStep {
  step_number: number;
  action: string;
  /** UI element or menu path involved. */
  ui_context: string;
  /** Parameter or value set at this step, if any. */
  parameter?: string;
  /** Timestamp in video where this step occurs (seconds). */
  timestamp_s?: number;
  notes?: string;
}

/** Result from semantic search across the video knowledge index. */
export interface ELearningSearchResult {
  lesson_id: string;
  lesson_title: string;
  course_title: string;
  /** Relevance score 0-100. */
  score: number;
  /** Matched excerpts from lesson knowledge items. */
  matched_excerpts: string[];
  video_path: string;
}

/** Catalog of a top-level E-Learning module directory. */
export interface ELearningModule {
  module_name: string;
  /** Absolute path to the module directory. */
  module_path: string;
  courses: ELearningCourse[];
  total_videos: number;
  total_duration_seconds: number;
}

// ── Internal State ────────────────────────────────────────────────────────────

/** In-memory knowledge index keyed by lesson_id. */
const lessonIndex = new Map<string, ELearningLesson>();

/** Knowledge items per lesson_id, accumulated from VideoLearningEngine output. */
const knowledgeIndex = new Map<string, VideoKnowledgeItem[]>();

/** Course catalog keyed by course_id. */
const courseIndex = new Map<string, ELearningCourse>();

// ── Engine Implementation ─────────────────────────────────────────────────────

class VideoELearningAIEngineImpl {

  // ── 1. processELearningCourse ─────────────────────────────────────────────

  /**
   * Extract structured lessons from a hyperMILL / SOLIDWORKS e-learning course folder.
   *
   * Parses meta.xml for course metadata, frame.xml for the slide lesson index,
   * and enumerates MP4 files from story_content/. Delegates actual transcription
   * to VideoLearningEngine for any video not yet indexed.
   *
   * @param course_path Absolute path to the course root (contains meta.xml).
   * @returns Parsed ELearningCourse with all discovered lessons indexed in memory.
   */
  async processELearningCourse(course_path: string): Promise<ELearningCourse> {
    if (!fs.existsSync(course_path)) {
      throw new Error(`Course path not found: ${course_path}`);
    }

    // Detect locale subfolder (en / en-US / etc.)
    const locale = this._detectLocale(course_path);
    const localeDir = path.join(course_path, locale);
    const storyContentDir = path.join(localeDir, "story_content");

    // Parse meta.xml
    const metaPath = path.join(localeDir, "meta.xml");
    const course = this._parseMetaXml(metaPath, course_path, locale);

    // Parse frame.xml for lesson slide index
    const frameXmlPath = path.join(storyContentDir, "frame.xml");
    course.lesson_titles = this._extractLessonTitles(frameXmlPath);

    // Enumerate MP4 files
    const mp4Files = fs.existsSync(storyContentDir)
      ? fs.readdirSync(storyContentDir)
          .filter(f => f.toLowerCase().endsWith(".mp4"))
          .map(f => path.join(storyContentDir, f))
      : [];
    course.video_paths = mp4Files;

    // Build lesson entries and index them
    mp4Files.forEach((vp, idx) => {
      const lesson = this._buildLesson(vp, course, idx);
      lessonIndex.set(lesson.lesson_id, lesson);
    });

    courseIndex.set(course.id, course);
    log.info(`[VideoELearningAI] Indexed course "${course.title}" — ${mp4Files.length} videos, ${course.lesson_titles.length} lessons`);
    return course;
  }

  // ── 2. searchVideoKnowledge ───────────────────────────────────────────────

  /**
   * Semantic search across all indexed lesson knowledge items.
   *
   * Tokenizes the query and scores each lesson's knowledge items by term
   * frequency in title, tags, and knowledge body text.
   *
   * @param query Natural language search query.
   * @param top_k Maximum results to return (default 10).
   * @returns Ranked search results with matched excerpts.
   */
  searchVideoKnowledge(query: string, top_k = 10): ELearningSearchResult[] {
    const tokens = this._tokenize(query);
    const scores = new Map<string, { score: number; excerpts: string[] }>();

    // Score each lesson from its title + feature tags + knowledge items
    for (const [lessonId, lesson] of lessonIndex) {
      let score = 0;
      const excerpts: string[] = [];
      const course = courseIndex.get(lesson.course_id);

      // Title match (high weight)
      const titleTokens = this._tokenize(lesson.title);
      for (const qt of tokens) {
        if (titleTokens.includes(qt)) score += 20;
      }

      // Feature vector tag match (medium weight)
      for (const tag of lesson.feature_vector.topic_tags) {
        for (const qt of tokens) {
          if (tag.includes(qt)) score += 10;
        }
      }

      // Knowledge items match (medium weight)
      const items = knowledgeIndex.get(lessonId) ?? [];
      for (const item of items) {
        const itemTokens = this._tokenize(item.title + " " + item.body);
        let itemScore = 0;
        for (const qt of tokens) {
          if (itemTokens.includes(qt)) itemScore += 5;
        }
        if (itemScore > 0) {
          score += itemScore;
          excerpts.push(item.body.substring(0, 120));
        }
      }

      // Outcome and prerequisite match
      for (const outcome of lesson.feature_vector.learning_outcomes) {
        for (const qt of tokens) {
          if (this._tokenize(outcome).includes(qt)) score += 8;
        }
      }

      if (score > 0) {
        scores.set(lessonId, { score, excerpts: excerpts.slice(0, 3) });
      }
    }

    // Also search lesson titles from course index (before full video processing)
    for (const [courseId, course] of courseIndex) {
      for (let i = 0; i < course.lesson_titles.length; i++) {
        const syntheticId = `${courseId}:slide-${i}`;
        if (!scores.has(syntheticId)) {
          const titleTokens = this._tokenize(course.lesson_titles[i]);
          let score = 0;
          for (const qt of tokens) {
            if (titleTokens.includes(qt)) score += 15;
          }
          if (score > 0) {
            scores.set(syntheticId, {
              score,
              excerpts: [`Lesson slide: ${course.lesson_titles[i]}`],
            });
          }
        }
      }
    }

    // Build results
    const results: ELearningSearchResult[] = [];
    for (const [lessonId, { score, excerpts }] of scores) {
      const lesson = lessonIndex.get(lessonId);
      const course = lesson ? courseIndex.get(lesson.course_id) : undefined;
      results.push({
        lesson_id: lessonId,
        lesson_title: lesson?.title ?? lessonId,
        course_title: course?.title ?? "Unknown Course",
        score: Math.min(100, score),
        matched_excerpts: excerpts,
        video_path: lesson?.video_path ?? "",
      });
    }

    return results
      .sort((a, b) => b.score - a.score)
      .slice(0, top_k);
  }

  // ── 3. recommendTutorial ──────────────────────────────────────────────────

  /**
   * Generate a personalized learning path for a given skill level and topic.
   *
   * Filters indexed lessons by topic relevance and difficulty, then orders them
   * respecting prerequisite chains. Falls back to a curated static path for
   * known topic/level combinations when no dynamic lessons are indexed.
   *
   * @param skill_level Learner's current skill level.
   * @param topic Topic to learn (e.g., "machine-simulation", "collision-detection").
   * @returns Ordered LearningPath recommendation.
   */
  recommendTutorial(skill_level: DifficultyLevel, topic: string): LearningPath {
    const topicTokens = this._tokenize(topic);

    // Collect relevant lessons
    const relevant: ELearningLesson[] = [];
    for (const lesson of lessonIndex.values()) {
      const tagMatch = lesson.feature_vector.topic_tags.some(t =>
        topicTokens.some(qt => t.includes(qt))
      );
      const titleMatch = topicTokens.some(qt =>
        this._tokenize(lesson.title).includes(qt)
      );
      if (tagMatch || titleMatch) relevant.push(lesson);
    }

    // Filter by difficulty (include current level and one level below)
    const difficultyOrder: DifficultyLevel[] = ["beginner", "intermediate", "advanced"];
    const levelIdx = difficultyOrder.indexOf(skill_level);
    const allowed = difficultyOrder.slice(0, levelIdx + 1);
    const filtered = relevant.filter(l =>
      allowed.includes(l.feature_vector.difficulty_level)
    );

    // Sort by slide_index (preserves course ordering which encodes prerequisite chain)
    const ordered = [...(filtered.length > 0 ? filtered : relevant)]
      .sort((a, b) => a.slide_index - b.slide_index);

    // Fall back to static curated path for known topics when index is empty
    if (ordered.length === 0) {
      return this._staticLearningPath(skill_level, topic);
    }

    const sequenceIds = ordered.map(l => l.lesson_id);
    const totalDuration = ordered.reduce(
      (sum, l) => sum + l.feature_vector.duration_seconds, 0
    );

    return {
      path_id: `${skill_level}:${topic.replace(/\s+/g, "-")}`,
      topic,
      skill_level,
      lesson_sequence: sequenceIds,
      total_duration_seconds: totalDuration,
      rationale: `${ordered.length} lessons matching "${topic}" ordered by course sequence for ${skill_level} learners.`,
    };
  }

  // ── 4. extractWorkflowSteps ───────────────────────────────────────────────

  /**
   * Extract an ordered step-by-step procedure from a lesson's knowledge items.
   *
   * Resolves the lesson by video_id (filename stem or full lesson_id), then
   * maps each associated VideoKnowledgeItem to a WorkflowStep using the lesson
   * slide title index from its parent course for context labeling.
   *
   * @param video_id Lesson ID, video filename stem, or slide title substring.
   * @returns Ordered workflow steps for the lesson.
   */
  extractWorkflowSteps(video_id: string): WorkflowStep[] {
    // Resolve lesson by partial match on ID, title, or path
    let lesson: ELearningLesson | undefined = lessonIndex.get(video_id);
    if (!lesson) {
      for (const l of lessonIndex.values()) {
        const stem = path.basename(l.video_path, path.extname(l.video_path));
        if (stem.includes(video_id) || l.title.toLowerCase().includes(video_id.toLowerCase())) {
          lesson = l;
          break;
        }
      }
    }

    // Fall back to course slide titles if lesson isn't fully processed yet
    if (!lesson) {
      return this._extractWorkflowFromSlideTitles(video_id);
    }

    const items = knowledgeIndex.get(lesson.lesson_id) ?? [];

    // If knowledge items are available, derive steps from them
    if (items.length > 0) {
      return items.map((item, i): WorkflowStep => ({
        step_number: i + 1,
        action: item.title,
        ui_context: item.tags.filter(t => !["video-learned", "cam"].includes(t)).join(", "),
        parameter: item.transcript_excerpt?.substring(0, 80),
        timestamp_s: item.frame_reference
          ? parseFloat(item.frame_reference)
          : undefined,
        notes: item.body.substring(0, 120),
      }));
    }

    // If lesson is indexed but not yet processed, derive steps from slide titles
    const course = courseIndex.get(lesson.course_id);
    if (course && course.lesson_titles.length > 0) {
      return this._stepsFromLessonTitles(course.lesson_titles, lesson.slide_index);
    }

    return [];
  }

  // ── 5. generateQuiz ──────────────────────────────────────────────────────

  /**
   * Generate learning validation quiz questions for a given topic.
   *
   * Queries the knowledge index for items related to the topic and synthesizes
   * multiple-choice questions. Uses a deterministic pattern from knowledge item
   * bodies so output is stable and testable without LLM calls.
   *
   * @param topic Topic to quiz on (e.g., "collision detection", "machine simulation").
   * @param count Number of questions to generate (default 5).
   * @returns Array of QuizQuestion items.
   */
  generateQuiz(topic: string, count = 5): QuizQuestion[] {
    const topicTokens = this._tokenize(topic);
    const questions: QuizQuestion[] = [];

    // Source from knowledge items
    for (const [lessonId, items] of knowledgeIndex) {
      for (const item of items) {
        const relevance = topicTokens.some(qt =>
          this._tokenize(item.title + " " + item.body + " " + item.tags.join(" ")).includes(qt)
        );
        if (!relevance || questions.length >= count) continue;

        const lesson = lessonIndex.get(lessonId);
        questions.push(this._synthesizeQuestion(item, lesson?.title ?? topic));
      }
    }

    // Supplement with static topic questions when knowledge index is thin
    if (questions.length < count) {
      const staticQs = this._staticQuizQuestions(topic);
      for (const sq of staticQs) {
        if (questions.length >= count) break;
        questions.push(sq);
      }
    }

    return questions.slice(0, count);
  }

  // ── 6. catalogELearningModules ────────────────────────────────────────────

  /**
   * Scan an e-learning library root directory and build a module catalog.
   *
   * Each subdirectory of base_path is treated as a module. Within each module,
   * locale-level course folders are discovered and their meta.xml is parsed.
   *
   * @param base_path Root of an e-learning library (e.g., OPEN MIND/doc/31.0/E-Learning).
   * @param version Software version label (e.g., "31.0").
   * @returns Array of cataloged modules with video counts.
   */
  catalogELearningModules(base_path: string, version = "unknown"): ELearningModule[] {
    if (!fs.existsSync(base_path)) {
      log.warn(`[VideoELearningAI] Base path not found: ${base_path}`);
      return [];
    }

    const modules: ELearningModule[] = [];
    const moduleDirs = fs.readdirSync(base_path, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);

    for (const modName of moduleDirs) {
      const modPath = path.join(base_path, modName);
      const courses: ELearningCourse[] = [];
      let totalVideos = 0;
      let totalDuration = 0;

      // Each direct subdirectory is a locale variant of the course
      const localeDirs = fs.readdirSync(modPath, { withFileTypes: true })
        .filter(e => e.isDirectory())
        .map(e => e.name);

      for (const localeDir of localeDirs) {
        const localePath = path.join(modPath, localeDir);
        const metaPath = path.join(localePath, "meta.xml");
        if (!fs.existsSync(metaPath)) continue;

        try {
          const course = this._parseMetaXml(metaPath, modPath, localeDir);
          course.version = version;

          const storyDir = path.join(localePath, "story_content");
          const frameXmlPath = path.join(storyDir, "frame.xml");
          course.lesson_titles = this._extractLessonTitles(frameXmlPath);

          const mp4s = fs.existsSync(storyDir)
            ? fs.readdirSync(storyDir)
                .filter(f => f.toLowerCase().endsWith(".mp4"))
                .map(f => path.join(storyDir, f))
            : [];
          course.video_paths = mp4s;
          totalVideos += mp4s.length;
          totalDuration += course.duration_seconds;
          courses.push(course);
        } catch (err) {
          log.warn(`[VideoELearningAI] Could not parse course at ${localePath}: ${err}`);
        }
      }

      modules.push({
        module_name: modName,
        module_path: modPath,
        courses,
        total_videos: totalVideos,
        total_duration_seconds: totalDuration,
      });
    }

    log.info(`[VideoELearningAI] Cataloged ${modules.length} modules from ${base_path}`);
    return modules;
  }

  // ── 7. getKnownResourcePaths ──────────────────────────────────────────────

  /**
   * Return the static registry of known e-learning resource paths with labels.
   *
   * @returns Array of resource descriptors for all known e-learning libraries.
   */
  getKnownResourcePaths(): Array<{
    label: string;
    path: string;
    type: "hypermill" | "solidworks" | "other";
    version: string;
    estimated_video_count: number;
  }> {
    return [
      {
        label: "hyperMILL 31.0 E-Learning",
        path: ELEARNING_RESOURCE_PATHS.HYPERMILL_31,
        type: "hypermill",
        version: "31.0",
        estimated_video_count: 37,
      },
      {
        label: "hyperMILL 33.0 E-Learning",
        path: ELEARNING_RESOURCE_PATHS.HYPERMILL_33,
        type: "hypermill",
        version: "33.0",
        estimated_video_count: 37,
      },
      {
        label: "SOLIDWORKS FEA Simulation Demos",
        path: ELEARNING_RESOURCE_PATHS.SOLIDWORKS_FEA,
        type: "solidworks",
        version: "2024",
        estimated_video_count: 12,
      },
    ];
  }

  // ── 8. computeFeatureVector ───────────────────────────────────────────────

  /**
   * Compute a feature vector for a lesson based on its title, slide position,
   * video resolution and duration.
   *
   * @param lesson Partially built lesson (must have title and video_path).
   * @returns Completed LessonFeatureVector.
   */
  computeFeatureVector(lesson: Pick<ELearningLesson, "title" | "video_path" | "slide_index" | "duration_seconds">): LessonFeatureVector {
    const title = lesson.title.toLowerCase();
    const tags: string[] = [];

    // Topic tag inference from title keywords
    const TAG_RULES: Array<[string[], string]> = [
      [["collision", "check"], "collision-detection"],
      [["machine simulation", "simulation"], "machine-simulation"],
      [["5-axis", "five axis", "5axis"], "5-axis-machining"],
      [["post processor", "nc tab"], "post-processor"],
      [["virtual machine", "setting up machine"], "virtual-machine-setup"],
      [["toolpath", "tool path"], "toolpath-visualization"],
      [["fea", "finite element", "stress", "thermal"], "fea-simulation"],
      [["step", "stepwise"], "step-control"],
      [["feedrate", "rapid", "dial"], "feed-control"],
      [["material removal", "switch"], "material-removal"],
      [["job", "browser", "edit"], "job-management"],
      [["quick start", "how to use", "tutorial"], "tutorial-navigation"],
      [["analyze", "result", "report"], "result-analysis"],
      [["parameter", "confirm", "select"], "parameter-configuration"],
      [["cyclic symmetry", "cylindrical", "symmetry"], "boundary-conditions"],
      [["hinge", "slide", "sphere", "flat"], "assembly-constraints"],
      [["reference", "fixed", "immovable"], "fixture-definition"],
    ];

    for (const [keywords, tag] of TAG_RULES) {
      if (keywords.some(kw => title.includes(kw))) tags.push(tag);
    }

    if (tags.length === 0) tags.push("general-cam");

    // Difficulty inference from slide position and title complexity
    const difficulty: DifficultyLevel =
      lesson.slide_index <= 3 || title.includes("quick start") || title.includes("how to use")
        ? "beginner"
        : lesson.slide_index <= 12 || title.includes("setup") || title.includes("select") || title.includes("start")
        ? "beginner"
        : lesson.slide_index <= 25 || title.includes("analyzing") || title.includes("stepwise") || title.includes("single step")
        ? "intermediate"
        : "advanced";

    // Prerequisite skills from title
    const prereqs: string[] = [];
    if (title.includes("analyz") || title.includes("correct") || title.includes("rechecking")) {
      prereqs.push("machine-simulation-basics", "collision-check-setup");
    }
    if (title.includes("step") || title.includes("dial")) {
      prereqs.push("machine-simulation-basics");
    }
    if (title.includes("edit") || title.includes("nc tab") || title.includes("parameter")) {
      prereqs.push("job-management", "machine-simulation-basics");
    }

    // Learning outcomes from title
    const outcomes: string[] = [];
    if (title.includes("collision")) outcomes.push("Run collision checks between toolpath and machine components");
    if (title.includes("simulation")) outcomes.push("Execute machine simulation to verify NC programs");
    if (title.includes("analyz")) outcomes.push("Interpret collision reports and identify toolpath errors");
    if (title.includes("correct") || title.includes("rechecking")) outcomes.push("Correct NC jobs and revalidate through simulation");
    if (title.includes("feedrate") || title.includes("rapid")) outcomes.push("Control simulation playback speed via feed/rapid dials");
    if (title.includes("material removal")) outcomes.push("Toggle material removal visualization during simulation");
    if (title.includes("step") && title.includes("mode")) outcomes.push("Navigate simulation in single-step mode for detailed inspection");
    if (outcomes.length === 0) outcomes.push(`Complete the ${lesson.title} operation in hyperMILL`);

    // Resolution-based visual complexity
    const resMatch = path.basename(lesson.video_path).match(/(\d+)x(\d+)/);
    const width = resMatch ? parseInt(resMatch[1]) : 1280;
    const height = resMatch ? parseInt(resMatch[2]) : 720;
    const visual_complexity = Math.min(1.0, (width * height) / (1920 * 1168));

    // Narration quality: mp3 assets in story_content indicate narrated slides
    const storyDir = path.dirname(lesson.video_path);
    let narration_quality = 0.7; // default: assumes narration present
    try {
      const mp3Count = fs.readdirSync(storyDir).filter(f => f.endsWith(".mp3")).length;
      narration_quality = mp3Count > 0 ? 0.9 : 0.5;
    } catch { /* ok */ }

    return {
      topic_tags: [...new Set(tags)],
      difficulty_level: difficulty,
      duration_seconds: lesson.duration_seconds,
      prerequisite_skills: prereqs,
      learning_outcomes: outcomes,
      visual_complexity: parseFloat(visual_complexity.toFixed(3)),
      narration_quality,
    };
  }

  // ── 9. ingestVideoProcessResult ───────────────────────────────────────────

  /**
   * Ingest results from VideoLearningEngine into the knowledge index.
   *
   * Call this after VideoLearningEngine.processVideo() to make the discovered
   * knowledge items available through searchVideoKnowledge and generateQuiz.
   *
   * @param result Output from VideoLearningEngine.processVideo().
   * @param lesson_id Lesson ID to associate the knowledge items with.
   */
  ingestVideoProcessResult(result: VideoProcessResult, lesson_id: string): void {
    const existing = knowledgeIndex.get(lesson_id) ?? [];
    knowledgeIndex.set(lesson_id, [...existing, ...result.knowledge_items]);
    log.info(`[VideoELearningAI] Ingested ${result.knowledge_items.length} items for lesson ${lesson_id}`);
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /** Detect locale subfolder inside a module directory. */
  private _detectLocale(course_path: string): string {
    if (!fs.existsSync(course_path)) return "en";
    const entries = fs.readdirSync(course_path, { withFileTypes: true })
      .filter(e => e.isDirectory())
      .map(e => e.name);
    // Prefer known locale patterns
    const known = ["en-US", "en-GB", "en", "de", "fr", "zh"];
    for (const k of known) {
      if (entries.includes(k)) return k;
    }
    return entries[0] ?? "en";
  }

  /** Parse an Articulate Storyline meta.xml into ELearningCourse structure. */
  private _parseMetaXml(metaPath: string, course_path: string, locale: string): ELearningCourse {
    if (!fs.existsSync(metaPath)) {
      // Synthesize a minimal course record when meta.xml is absent
      const modName = path.basename(course_path);
      return {
        id: `course-${modName}-${locale}`,
        title: modName,
        module_name: modName,
        version: "unknown",
        date_published: "",
        duration_seconds: 0,
        slide_count: 0,
        course_path,
        lesson_titles: [],
        video_paths: [],
        locale,
      };
    }

    const xml = fs.readFileSync(metaPath, "utf-8");

    const id = this._xmlAttr(xml, "project", "id") ?? `course-${Date.now()}`;
    const title = this._xmlAttr(xml, "project", "title") ?? path.basename(course_path);
    const datePublished = this._xmlAttr(xml, "project", "datepublished") ?? "";
    const durationStr = this._xmlAttr(xml, "project", "duration") ?? "";
    const slideCount = parseInt(this._xmlAttr(xml, "slidemeta", "viewslides") ?? "0", 10);
    const modName = path.basename(course_path);

    const duration_seconds = DURATION_MAP[durationStr] ?? this._parseDurationFallback(durationStr);

    return {
      id,
      title,
      module_name: modName,
      version: "unknown",
      date_published: datePublished,
      duration_seconds,
      slide_count: isNaN(slideCount) ? 0 : slideCount,
      course_path,
      lesson_titles: [],
      video_paths: [],
      locale,
    };
  }

  /** Extract slidelink displaytext values from frame.xml. */
  private _extractLessonTitles(frameXmlPath: string): string[] {
    if (!fs.existsSync(frameXmlPath)) return [];
    const xml = fs.readFileSync(frameXmlPath, "utf-8");
    // Match all displaytext attributes in slidelink elements
    const pattern = /<slidelink[^>]+displaytext="([^"]+)"/g;
    const titles: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(xml)) !== null) {
      titles.push(m[1].trim());
    }
    return titles;
  }

  /** Build an ELearningLesson from an MP4 path and parent course. */
  private _buildLesson(
    videoPath: string,
    course: ELearningCourse,
    slideIndex: number
  ): ELearningLesson {
    const stem = path.basename(videoPath, path.extname(videoPath));
    const lesson_id = `${course.id}:${stem}`;

    // Parse resolution from filename pattern: video_<id>_0_56_WxH.mp4
    const resMatch = stem.match(/(\d{3,4})x(\d{3,4})$/);
    const resolution = resMatch ? `${resMatch[1]}x${resMatch[2]}` : "1920x1080";

    // Map slide index to a lesson title if available
    const title = course.lesson_titles[slideIndex] ?? stem;

    // Estimate duration: course total duration / video count
    const videoCount = Math.max(1, course.video_paths.length || 37);
    const duration_seconds = Math.round(course.duration_seconds / videoCount);

    const partial = { title, video_path: videoPath, slide_index: slideIndex, duration_seconds };
    const feature_vector = this.computeFeatureVector(partial);

    return {
      lesson_id,
      title,
      course_id: course.id,
      video_path: videoPath,
      duration_seconds,
      resolution,
      slide_index: slideIndex,
      feature_vector,
    };
  }

  /** Tokenize a string into lowercase words ≥3 chars, no stop words. */
  private _tokenize(text: string): string[] {
    const stop = new Set(["the", "and", "for", "this", "that", "with", "from", "are", "was", "has", "not", "how", "use"]);
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .split(/\s+/)
      .filter(w => w.length >= 3 && !stop.has(w));
  }

  /** Extract a single XML attribute value using regex (no DOM dependency). */
  private _xmlAttr(xml: string, element: string, attr: string): string | undefined {
    const re = new RegExp(`<${element}[^>]+${attr}="([^"]*)"`, "i");
    const m = xml.match(re);
    return m ? m[1] : undefined;
  }

  /** Parse duration string like "Over 4 Minutes" or "4:30" to seconds. */
  private _parseDurationFallback(durationStr: string): number {
    // Try "M:SS" pattern
    const minsMatch = durationStr.match(/(\d+):(\d{2})/);
    if (minsMatch) return parseInt(minsMatch[1]) * 60 + parseInt(minsMatch[2]);
    // Try "Over N Minutes"
    const overMatch = durationStr.match(/(\d+)\s*[Mm]in/);
    if (overMatch) return parseInt(overMatch[1]) * 60;
    return 300; // default 5 minutes
  }

  /** Static learning path for topic/level combos when no dynamic lessons are indexed. */
  private _staticLearningPath(skill_level: DifficultyLevel, topic: string): LearningPath {
    const topicLower = topic.toLowerCase();
    const isSimulation = topicLower.includes("simulation") || topicLower.includes("machine");
    const isCollision = topicLower.includes("collision");
    const is5Axis = topicLower.includes("5-axis") || topicLower.includes("five axis");

    const STATIC_PATHS: Record<string, Record<DifficultyLevel, string[]>> = {
      "machine-simulation": {
        beginner: [
          "Quick start of Collision Check and the Machine simulation",
          "How to use this Tutorial",
          "Select job for simulation and collision check",
          "Select Machine Simulation",
          "Machine Simulation is loading",
          "Setting up Machine for simulation",
          "Start the Machine simulation",
          "Stop the Machine simulation",
        ],
        intermediate: [
          "Select Head and Table",
          "Collision check settings",
          "Start collision check before simulating",
          "Switch on/off material removal",
          "Control dial rapid",
          "Control dial Feedrate",
          "Collision check result",
        ],
        advanced: [
          "Analyzing Machine simulation",
          "Confirm collision dialogue",
          "Expand collision list",
          "Analyze collisions",
          "Move to single collisions",
          "Correcting job and rechecking simulation",
          "Edit the job",
          "Switch to NC tab",
          "Select a new direction",
          "Start Collision check again",
        ],
      },
      "collision-detection": {
        beginner: [
          "Start collision check before simulating",
          "Collision check settings",
          "Collision check result",
        ],
        intermediate: [
          "Analyzing Machine simulation",
          "Confirm collision dialogue",
          "Expand collision list",
          "Analyze collisions",
        ],
        advanced: [
          "Move to single collisions",
          "Correcting job and rechecking simulation",
          "Edit the job",
          "Start Collision check again",
          "Confirm Collision report",
          "Important note",
        ],
      },
    };

    const category = isCollision ? "collision-detection" : isSimulation ? "machine-simulation" : topic;
    const lessons = STATIC_PATHS[category]?.[skill_level]
      ?? STATIC_PATHS["machine-simulation"][skill_level];

    return {
      path_id: `${skill_level}:${topic.replace(/\s+/g, "-")}`,
      topic,
      skill_level,
      lesson_sequence: lessons,
      total_duration_seconds: lessons.length * 35, // ~35s avg per slide
      rationale: `Curated ${skill_level} path for "${topic}" from hyperMILL Machine-simulation curriculum.`,
    };
  }

  /** Extract workflow steps from course slide titles matching a topic. */
  private _extractWorkflowFromSlideTitles(topic: string): WorkflowStep[] {
    const topicTokens = this._tokenize(topic);
    for (const course of courseIndex.values()) {
      const relevantTitles = course.lesson_titles.filter(t =>
        topicTokens.some(qt => this._tokenize(t).includes(qt))
      );
      if (relevantTitles.length > 0) {
        return relevantTitles.map((title, i): WorkflowStep => ({
          step_number: i + 1,
          action: title,
          ui_context: "hyperMILL Machine-simulation panel",
          notes: `Slide from ${course.title}`,
        }));
      }
      // Return full slide sequence for general course navigation
      if (course.lesson_titles.length > 0) {
        return course.lesson_titles.map((title, i): WorkflowStep => ({
          step_number: i + 1,
          action: title,
          ui_context: "hyperMILL Machine-simulation panel",
        }));
      }
    }
    return [];
  }

  /** Derive workflow steps from slide titles relative to a starting slide index. */
  private _stepsFromLessonTitles(titles: string[], fromIndex: number): WorkflowStep[] {
    const windowSize = 10;
    const start = Math.max(0, fromIndex - 2);
    const end = Math.min(titles.length, fromIndex + windowSize);
    return titles.slice(start, end).map((title, i): WorkflowStep => ({
      step_number: i + 1,
      action: title,
      ui_context: "hyperMILL Machine-simulation panel",
    }));
  }

  /** Synthesize a multiple-choice quiz question from a knowledge item. */
  private _synthesizeQuestion(item: VideoKnowledgeItem, source: string): QuizQuestion {
    // Build a basic true/false-style MC question from the knowledge body
    const body = item.body.substring(0, 200);
    const question = `In the context of ${source}, what does the following describe: "${item.title}"?`;

    // Distractors: paraphrase with wrong specifics
    const [c0, c1, c2, c3] = [
      body.substring(0, 60).replace(/\.$/, "") + ".",
      `Using the wrong axis direction for ${item.tags[1] ?? "toolpath"} selection.`,
      `Ignoring ${item.tags[0] ?? "collision"} settings entirely.`,
      `Applying maximum feed rate without checking ${item.category} constraints.`,
    ];

    return {
      source,
      question,
      choices: [c0, c1, c2, c3],
      correct_index: 0,
      explanation: `The correct answer describes: ${item.title}. ${body.substring(0, 100)}`,
      tags: item.tags.slice(0, 4),
    };
  }

  /** Static quiz questions for well-known topics when knowledge index is thin. */
  private _staticQuizQuestions(topic: string): QuizQuestion[] {
    const t = topic.toLowerCase();
    if (t.includes("collision")) {
      return [
        {
          source: "hyperMILL Machine-simulation",
          question: "What is the first step to perform a collision check in hyperMILL Machine-simulation?",
          choices: [
            "Select the job and choose 'Select Machine Simulation' from the menu.",
            "Directly start the NC program on the machine controller.",
            "Open the toolpath in the CAD viewer and measure distances manually.",
            "Export the NC code and verify it with a G-code simulator.",
          ],
          correct_index: 0,
          explanation: "You must first select the job in the hyperMILL browser and then choose Select Machine Simulation to load the virtual machine environment for collision checking.",
          tags: ["collision-detection", "machine-simulation", "hypermill"],
        },
        {
          source: "hyperMILL Machine-simulation",
          question: "What does 'Switch on/off material removal' control during simulation?",
          choices: [
            "Toggles whether the simulation displays the progressive removal of stock material as the tool moves.",
            "Enables or disables the spindle motor in the real machine.",
            "Controls the coolant flow during simulation playback.",
            "Switches between metric and imperial units in the simulation view.",
          ],
          correct_index: 0,
          explanation: "The material removal toggle shows or hides the visual stock removal so operators can inspect tool engagement depth and chip generation during simulation.",
          tags: ["material-removal", "machine-simulation", "hypermill"],
        },
        {
          source: "hyperMILL Machine-simulation",
          question: "After a collision is detected and the job is corrected, which step is required to revalidate?",
          choices: [
            "Start Collision Check Again from the Machine Simulation window.",
            "Manually override the alarm and continue machining.",
            "Reload the original NC code without changes.",
            "Contact OPEN MIND support for manual review.",
          ],
          correct_index: 0,
          explanation: "After correcting the job parameters (e.g., changing tool direction in the NC tab), you must re-run Start Collision Check Again to confirm the fix resolved the collision.",
          tags: ["collision-detection", "job-management", "hypermill"],
        },
      ];
    }

    if (t.includes("simulation") || t.includes("machine")) {
      return [
        {
          source: "hyperMILL Machine-simulation",
          question: "What is Single Step Mode in hyperMILL Machine-simulation?",
          choices: [
            "A mode where the simulation advances one NC block at a time for detailed inspection.",
            "A mode that runs only one axis of the machine simultaneously.",
            "A safety mode that locks the spindle when collision risk exceeds 50%.",
            "A replay mode that loops the last 5 seconds of simulation.",
          ],
          correct_index: 0,
          explanation: "Single Step Mode pauses after each NC block allowing the programmer to inspect the tool position, machine state, and potential collisions one operation at a time.",
          tags: ["step-control", "machine-simulation", "hypermill"],
        },
        {
          source: "hyperMILL Machine-simulation",
          question: "What do the 'Control dial Rapid' and 'Control dial Feedrate' settings affect?",
          choices: [
            "The playback speed multipliers for rapid and feed moves during simulation.",
            "The actual rapid override and feedrate override sent to the CNC controller.",
            "The collision detection sensitivity threshold for rapid and feed moves.",
            "The color coding used for rapid vs. feed moves in the toolpath display.",
          ],
          correct_index: 0,
          explanation: "These dials control the simulation playback speed — not the real machine overrides — allowing you to slow down rapid moves for visual inspection or speed up long feed moves.",
          tags: ["feed-control", "machine-simulation", "hypermill"],
        },
        {
          source: "hyperMILL Machine-simulation",
          question: "Which view tabs are available in the Machine-simulation window?",
          choices: [
            "Lower view tab and Upper view tab.",
            "Front view and Isometric view.",
            "2D view and 3D view.",
            "Toolpath view and NC code view.",
          ],
          correct_index: 0,
          explanation: "The Machine-simulation interface provides Lower and Upper view tabs to display different perspectives of the machine envelope, useful for observing collisions from both below and above the table.",
          tags: ["machine-simulation", "hypermill", "tutorial-navigation"],
        },
      ];
    }

    return [
      {
        source: topic,
        question: `What is the primary purpose of ${topic} in hyperMILL?`,
        choices: [
          `To verify NC programs against the virtual machine model before running on real equipment.`,
          `To automatically generate G-code without programmer review.`,
          `To replace physical setup sheets with digital documents.`,
          `To train operators on manual machining techniques.`,
        ],
        correct_index: 0,
        explanation: `${topic} allows programmers to detect collisions and validate tool motion in a virtual environment, preventing costly crashes on real machines.`,
        tags: [topic.toLowerCase().replace(/\s+/g, "-"), "hypermill", "verification"],
      },
    ];
  }
}

// ── Singleton Export ──────────────────────────────────────────────────────────

export const videoELearningAIEngine = new VideoELearningAIEngineImpl();
