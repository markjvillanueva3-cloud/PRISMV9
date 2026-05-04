/**
 * OkumaGosigerTranscriptMinerEngine (E103)
 * =========================================
 *
 * Mines SRT transcript files from Okuma/Gosiger training videos to extract
 * tribal knowledge tips, process planning guidance, and controller-specific
 * programming wisdom.
 *
 * Input: data/video-learned/transcripts/*.srt
 * Output: TribalTip entries for lathe-tribal-tips-okuma.ts
 *
 * @module engines/OkumaGosigerTranscriptMinerEngine
 * @version 1.0.0
 * @milestone MS7 (U-LAT50)
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { log } from "../utils/Logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Types ──────────────────────────────────────────────────────────────────

/** Parsed SRT segment */
export interface SrtSegment {
  index: number;
  startTime: number;  // seconds
  endTime: number;    // seconds
  text: string;
}

/** Extracted tribal tip from transcript */
export interface TranscriptTribalTip {
  id: string;
  category: TranscriptTipCategory;
  controller: string;
  title: string;
  tip: string;
  severity: "critical" | "high" | "medium" | "low";
  confidence: number;
  source: string;
  timestamp?: number;  // seconds into video
  videoId?: string;
}

/** Categories for extracted tips */
export type TranscriptTipCategory =
  | "g_code"
  | "m_code"
  | "tool_setup"
  | "process_planning"
  | "safety"
  | "speed_feed"
  | "work_holding"
  | "work_zero"
  | "nose_radius_comp"
  | "canned_cycle"
  | "c_axis"
  | "aot_igf"
  | "cas_collision"
  | "threading"
  | "grooving"
  | "broaching"
  | "general";

/** Video metadata from okuma-gosiger-training-knowledge.json */
export interface VideoMetadata {
  id: string;
  title: string;
  duration: string;
  presenter: string;
  machine: string;
  control: string;
}

/** Mining result for a single transcript */
export interface TranscriptMiningResult {
  videoId: string;
  videoTitle: string;
  segmentCount: number;
  cleanTextLength: number;
  tipsExtracted: number;
  tips: TranscriptTribalTip[];
}

/** Full mining run result */
export interface MiningRunResult {
  transcriptsProcessed: number;
  totalSegments: number;
  totalCleanChars: number;
  totalTipsExtracted: number;
  tipsByCategory: Record<string, number>;
  tips: TranscriptTribalTip[];
  errors: string[];
}

// ── Pattern Definitions ────────────────────────────────────────────────────

/**
 * Knowledge extraction patterns - phrases that indicate tribal wisdom
 */
const KNOWLEDGE_PATTERNS: {
  pattern: RegExp;
  category: TranscriptTipCategory;
  severity: "critical" | "high" | "medium" | "low";
  titlePrefix: string;
}[] = [
  // Safety-critical patterns
  { pattern: /never\s+(?:use|do|put|leave|forget)/i, category: "safety", severity: "critical", titlePrefix: "Avoid" },
  { pattern: /always\s+(?:check|verify|make sure|ensure)/i, category: "safety", severity: "high", titlePrefix: "Always" },
  { pattern: /critical(?:ly)?\s+(?:important|that)/i, category: "safety", severity: "critical", titlePrefix: "Critical" },
  { pattern: /will\s+(?:crash|break|damage|destroy)/i, category: "safety", severity: "critical", titlePrefix: "Warning" },

  // G-code patterns
  { pattern: /g\s*(?:0?0|0?1|0?2|0?3|28|40|41|42|50|85|96|97)\b/i, category: "g_code", severity: "medium", titlePrefix: "G-code" },
  { pattern: /constant\s+surface\s+(?:speed|feet)/i, category: "g_code", severity: "high", titlePrefix: "CSS" },
  { pattern: /constant\s+rpm/i, category: "g_code", severity: "medium", titlePrefix: "RPM mode" },

  // M-code patterns
  { pattern: /m\s*(?:0?3|0?4|0?5|19|30|84|77)\b/i, category: "m_code", severity: "medium", titlePrefix: "M-code" },
  { pattern: /spindle\s+(?:on|off|stop|orient)/i, category: "m_code", severity: "medium", titlePrefix: "Spindle" },

  // Tool setup patterns
  { pattern: /tool\s+(?:offset|comp|nose\s+radius)/i, category: "tool_setup", severity: "high", titlePrefix: "Tool offset" },
  { pattern: /turret\s+(?:station|position|layout)/i, category: "tool_setup", severity: "medium", titlePrefix: "Turret" },
  { pattern: /insert\s+(?:grade|geometry|type)/i, category: "tool_setup", severity: "medium", titlePrefix: "Insert" },

  // Work holding patterns
  { pattern: /(?:chuck|collet|jaw|clamp)/i, category: "work_holding", severity: "medium", titlePrefix: "Workholding" },
  { pattern: /(?:3|4|6)\s*-?\s*jaw/i, category: "work_holding", severity: "medium", titlePrefix: "Chuck" },

  // Work zero patterns
  { pattern: /(?:work\s+zero|z\s*-?\s*zero|datum|calibrat)/i, category: "work_zero", severity: "high", titlePrefix: "Work zero" },
  { pattern: /touch\s*-?\s*off/i, category: "work_zero", severity: "high", titlePrefix: "Touch-off" },

  // Nose radius compensation
  { pattern: /nose\s+radius\s+comp/i, category: "nose_radius_comp", severity: "high", titlePrefix: "TNRC" },
  { pattern: /[pg]\s*-?\s*(?:value|number)\s+(?:0|2|3|9)/i, category: "nose_radius_comp", severity: "medium", titlePrefix: "P-value" },

  // Canned cycles
  { pattern: /canned\s+cycle/i, category: "canned_cycle", severity: "medium", titlePrefix: "Canned cycle" },
  { pattern: /roughing\s+cycle/i, category: "canned_cycle", severity: "medium", titlePrefix: "Roughing" },

  // C-axis
  { pattern: /c\s*-?\s*axis/i, category: "c_axis", severity: "medium", titlePrefix: "C-axis" },
  { pattern: /live\s+tool/i, category: "c_axis", severity: "medium", titlePrefix: "Live tooling" },

  // AOT/IGF
  { pattern: /(?:aot|advanced\s+one\s+touch|igf)/i, category: "aot_igf", severity: "medium", titlePrefix: "AOT" },
  { pattern: /conversational\s+program/i, category: "aot_igf", severity: "medium", titlePrefix: "Conversational" },

  // CAS collision avoidance
  { pattern: /(?:cas|collision\s+avoidance)/i, category: "cas_collision", severity: "high", titlePrefix: "CAS" },

  // Threading
  { pattern: /thread(?:ing|ed)?\s+(?:tool|pass|cut)/i, category: "threading", severity: "medium", titlePrefix: "Threading" },
  { pattern: /(?:spring\s+pass|deburr)/i, category: "threading", severity: "medium", titlePrefix: "Thread finish" },

  // Grooving
  { pattern: /groov(?:e|ing)/i, category: "grooving", severity: "medium", titlePrefix: "Grooving" },

  // Broaching
  { pattern: /broach/i, category: "broaching", severity: "medium", titlePrefix: "Broaching" },

  // Process planning
  { pattern: /(?:process|operation)\s+(?:plan|order|sequence)/i, category: "process_planning", severity: "high", titlePrefix: "Process" },
  { pattern: /(?:rough|finish)\s+(?:first|before|after)/i, category: "process_planning", severity: "medium", titlePrefix: "Sequence" },

  // Speed/feed
  { pattern: /(?:surface\s+feet|sfm|rpm|feed\s*rate|ipr|ipm)/i, category: "speed_feed", severity: "medium", titlePrefix: "Speed/feed" },
  { pattern: /smax|maximum\s+(?:spindle|rpm)/i, category: "speed_feed", severity: "high", titlePrefix: "SMAX" },
];

// ── Engine Implementation ──────────────────────────────────────────────────

class OkumaGosigerTranscriptMinerEngineImpl {
  private dataDir: string;
  private transcriptsDir: string;
  private knowledgeFile: string;
  private videoMetadata: Map<string, VideoMetadata> = new Map();

  constructor() {
    this.dataDir = path.resolve(__dirname, "../../data/video-learned");
    this.transcriptsDir = path.join(this.dataDir, "transcripts");
    this.knowledgeFile = path.join(this.transcriptsDir, "okuma-gosiger-training-knowledge.json");
  }

  /**
   * Parse SRT timestamp to seconds
   * Format: HH:MM:SS,mmm or HH:MM:SS.mmm
   */
  private parseTimestamp(ts: string): number {
    const match = ts.match(/(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/);
    if (!match) return 0;
    const [, hours, minutes, seconds, ms] = match;
    return parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds) + parseInt(ms) / 1000;
  }

  /**
   * Parse an SRT file into segments
   */
  parseSrt(content: string): SrtSegment[] {
    const segments: SrtSegment[] = [];
    const blocks = content.trim().split(/\n\s*\n/);

    for (const block of blocks) {
      const lines = block.trim().split("\n");
      if (lines.length < 2) continue;

      // First line: index number
      const index = parseInt(lines[0]);
      if (isNaN(index)) continue;

      // Second line: timestamps
      const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2}[,.]\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2}[,.]\d{3})/);
      if (!timeMatch) continue;

      const startTime = this.parseTimestamp(timeMatch[1]);
      const endTime = this.parseTimestamp(timeMatch[2]);

      // Remaining lines: text
      const text = lines.slice(2).join(" ").trim();
      if (!text) continue;

      segments.push({ index, startTime, endTime, text });
    }

    return segments;
  }

  /**
   * Merge consecutive segments to get clean, deduplicated text.
   * YouTube auto-captions often repeat/overlap text.
   */
  mergeSegments(segments: SrtSegment[]): { text: string; segments: SrtSegment[] } {
    const merged: SrtSegment[] = [];
    let currentText = "";
    let lastEndTime = 0;

    for (const seg of segments) {
      // Skip segments that are pure duplicates of the last one
      if (seg.text === currentText) continue;

      // Check if this segment's text starts with part of the previous
      // (common in auto-captions where text scrolls)
      const overlap = this.findOverlap(currentText, seg.text);
      if (overlap > 0 && overlap < seg.text.length) {
        // Append only the new part
        currentText += " " + seg.text.slice(overlap).trim();
      } else if (overlap === seg.text.length) {
        // Complete duplicate, skip
        continue;
      } else {
        // No overlap, start fresh
        if (currentText) {
          merged.push({
            index: merged.length + 1,
            startTime: merged.length > 0 ? merged[merged.length - 1].endTime : 0,
            endTime: seg.startTime,
            text: currentText.trim(),
          });
        }
        currentText = seg.text;
      }
      lastEndTime = seg.endTime;
    }

    // Don't forget the last segment
    if (currentText) {
      merged.push({
        index: merged.length + 1,
        startTime: merged.length > 0 ? merged[merged.length - 1].endTime : 0,
        endTime: lastEndTime,
        text: currentText.trim(),
      });
    }

    const fullText = merged.map((s) => s.text).join(" ");
    return { text: fullText, segments: merged };
  }

  /**
   * Find overlap between end of str1 and beginning of str2
   */
  private findOverlap(str1: string, str2: string): number {
    const words1 = str1.toLowerCase().split(/\s+/);
    const words2 = str2.toLowerCase().split(/\s+/);

    // Check how many words at the end of str1 match the beginning of str2
    for (let i = Math.min(words1.length, words2.length); i > 0; i--) {
      const end1 = words1.slice(-i).join(" ");
      const start2 = words2.slice(0, i).join(" ");
      if (end1 === start2) {
        return words2.slice(0, i).join(" ").length;
      }
    }
    return 0;
  }

  /**
   * Extract tribal tips from merged transcript text
   */
  extractTips(
    text: string,
    videoId: string,
    videoTitle: string,
    presenter: string,
    segments: SrtSegment[]
  ): TranscriptTribalTip[] {
    const tips: TranscriptTribalTip[] = [];
    const sentences = this.splitIntoSentences(text);
    const seenTips = new Set<string>();

    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i];
      const context = this.getContext(sentences, i, 2);

      for (const patternDef of KNOWLEDGE_PATTERNS) {
        if (patternDef.pattern.test(sentence)) {
          // Build the tip from sentence + context
          const tipText = this.buildTipText(sentence, context, patternDef.category);

          // Deduplicate
          const tipHash = `${patternDef.category}:${tipText.slice(0, 50)}`;
          if (seenTips.has(tipHash)) continue;
          seenTips.add(tipHash);

          // Find approximate timestamp
          const timestamp = this.findTimestamp(sentence, segments);

          // Calculate confidence based on pattern strength and context
          const confidence = this.calculateConfidence(sentence, context, patternDef);

          // Skip low-confidence extractions
          if (confidence < 0.5) continue;

          const tip: TranscriptTribalTip = {
            id: `gosiger_${videoId}_${tips.length + 1}`.slice(0, 40),
            category: patternDef.category,
            controller: "Okuma OSP",
            title: this.generateTitle(tipText, patternDef.titlePrefix),
            tip: tipText,
            severity: patternDef.severity,
            confidence: Math.round(confidence * 100) / 100,
            source: `Gosiger Training — ${presenter} — ${videoTitle}`,
            timestamp,
            videoId,
          };

          tips.push(tip);
          break; // One tip per sentence
        }
      }
    }

    return tips;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Handle common abbreviations that shouldn't split
    const normalized = text
      .replace(/\b(mr|mrs|ms|dr|vs|etc|i\.e|e\.g)\./gi, "$1<DOT>")
      .replace(/\b(\d+)\./g, "$1<DOT>");

    const sentences = normalized
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.replace(/<DOT>/g, ".").trim())
      .filter((s) => s.length > 10);

    return sentences;
  }

  /**
   * Get surrounding context sentences
   */
  private getContext(sentences: string[], index: number, range: number): string {
    const start = Math.max(0, index - range);
    const end = Math.min(sentences.length, index + range + 1);
    return sentences.slice(start, end).join(" ");
  }

  /**
   * Build a clean tip text from sentence and context
   */
  private buildTipText(sentence: string, context: string, category: TranscriptTipCategory): string {
    // For critical tips, include more context
    if (category === "safety" || category === "process_planning") {
      return context.length < 300 ? context : sentence;
    }
    return sentence.length < 200 ? sentence : sentence.slice(0, 200) + "...";
  }

  /**
   * Find approximate timestamp for a sentence
   */
  private findTimestamp(sentence: string, segments: SrtSegment[]): number | undefined {
    const words = sentence.toLowerCase().split(/\s+/).slice(0, 5).join(" ");
    for (const seg of segments) {
      if (seg.text.toLowerCase().includes(words)) {
        return Math.round(seg.startTime);
      }
    }
    return undefined;
  }

  /**
   * Calculate confidence score for an extraction
   */
  private calculateConfidence(
    sentence: string,
    context: string,
    patternDef: { pattern: RegExp; category: TranscriptTipCategory; severity: string }
  ): number {
    let confidence = 0.6; // Base confidence

    // Higher confidence for imperative statements
    if (/^(always|never|make sure|you should|you must|remember|be sure)/i.test(sentence)) {
      confidence += 0.15;
    }

    // Higher confidence for specific G/M codes
    if (/[gm]\s*\d{1,3}\b/i.test(sentence)) {
      confidence += 0.1;
    }

    // Higher confidence for Okuma-specific terms
    if (/okuma|osp|p300|vlmon|vgrlf|vpwtp|tlid|smax/i.test(context)) {
      confidence += 0.15;
    }

    // Higher confidence for longer, more specific sentences
    if (sentence.length > 80) confidence += 0.05;
    if (sentence.length > 150) confidence += 0.05;

    // Lower confidence for questions
    if (sentence.includes("?")) confidence -= 0.2;

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Generate a concise title from tip text
   */
  private generateTitle(tipText: string, prefix: string): string {
    // Extract key phrase (first clause or up to 50 chars)
    const match = tipText.match(/^([^,.!?]+)/);
    const keyPhrase = match ? match[1].trim() : tipText.slice(0, 50);

    // Clean and truncate
    const cleaned = keyPhrase
      .replace(/^(so|well|now|okay|alright|and|but|or)\s+/i, "")
      .replace(/^(you should|you must|always|never)\s+/i, "")
      .slice(0, 60);

    return `${prefix}: ${cleaned}`;
  }

  /**
   * Load video metadata from okuma-gosiger-training-knowledge.json
   */
  loadVideoMetadata(): void {
    if (this.videoMetadata.size > 0) return;

    try {
      if (fs.existsSync(this.knowledgeFile)) {
        const data = JSON.parse(fs.readFileSync(this.knowledgeFile, "utf8"));
        for (const video of data.videos || []) {
          this.videoMetadata.set(video.id, video);
        }
        log.info(`Loaded ${this.videoMetadata.size} video metadata entries`);
      }
    } catch (err) {
      log.warn(`Failed to load video metadata: ${err}`);
    }
  }

  /**
   * Get list of available transcript files
   */
  getAvailableTranscripts(): string[] {
    try {
      if (!fs.existsSync(this.transcriptsDir)) return [];
      return fs.readdirSync(this.transcriptsDir)
        .filter((f) => f.endsWith(".srt"))
        .map((f) => path.join(this.transcriptsDir, f));
    } catch (err) {
      log.error(`Failed to list transcripts: ${err}`);
      return [];
    }
  }

  /**
   * Mine a single transcript file
   */
  mineTranscript(transcriptPath: string): TranscriptMiningResult {
    const videoId = path.basename(transcriptPath).replace(/\.en\.srt$/, "").replace(/\.srt$/, "");
    const metadata = this.videoMetadata.get(videoId);

    const videoTitle = metadata?.title || `Video ${videoId}`;
    const presenter = metadata?.presenter || "Gosiger/Okuma Training";

    try {
      const content = fs.readFileSync(transcriptPath, "utf8");
      const rawSegments = this.parseSrt(content);
      const { text, segments } = this.mergeSegments(rawSegments);

      const tips = this.extractTips(text, videoId, videoTitle, presenter, segments);

      return {
        videoId,
        videoTitle,
        segmentCount: rawSegments.length,
        cleanTextLength: text.length,
        tipsExtracted: tips.length,
        tips,
      };
    } catch (err) {
      log.error(`Failed to mine transcript ${transcriptPath}: ${err}`);
      return {
        videoId,
        videoTitle,
        segmentCount: 0,
        cleanTextLength: 0,
        tipsExtracted: 0,
        tips: [],
      };
    }
  }

  /**
   * Run mining on all Okuma/Gosiger transcripts
   */
  mineAllTranscripts(options: { videoIds?: string[] } = {}): MiningRunResult {
    this.loadVideoMetadata();

    const transcripts = this.getAvailableTranscripts();
    const errors: string[] = [];
    const allTips: TranscriptTribalTip[] = [];
    const tipsByCategory: Record<string, number> = {};
    let totalSegments = 0;
    let totalCleanChars = 0;
    let processed = 0;

    // If specific videoIds requested, filter
    const targetTranscripts = options.videoIds
      ? transcripts.filter((t) => {
          const vid = path.basename(t).replace(/\.en\.srt$/, "").replace(/\.srt$/, "");
          return options.videoIds!.includes(vid);
        })
      : transcripts;

    // Only process transcripts that have metadata (known Okuma/Gosiger videos)
    const okumaTranscripts = targetTranscripts.filter((t) => {
      const vid = path.basename(t).replace(/\.en\.srt$/, "").replace(/\.srt$/, "");
      return this.videoMetadata.has(vid);
    });

    for (const transcriptPath of okumaTranscripts) {
      try {
        const result = this.mineTranscript(transcriptPath);
        processed++;
        totalSegments += result.segmentCount;
        totalCleanChars += result.cleanTextLength;

        for (const tip of result.tips) {
          allTips.push(tip);
          tipsByCategory[tip.category] = (tipsByCategory[tip.category] || 0) + 1;
        }
      } catch (err) {
        errors.push(`${transcriptPath}: ${err}`);
      }
    }

    log.info(`Transcript mining complete: ${processed} transcripts, ${allTips.length} tips extracted`);

    return {
      transcriptsProcessed: processed,
      totalSegments,
      totalCleanChars,
      totalTipsExtracted: allTips.length,
      tipsByCategory,
      tips: allTips,
      errors,
    };
  }

  /**
   * Export tips in the format used by lathe-tribal-tips-okuma.ts
   */
  formatTipsForExport(tips: TranscriptTribalTip[]): string {
    const lines = tips.map((tip) => {
      return `  {
    id: "${tip.id}",
    category: "${tip.category}",
    controller: "${tip.controller}",
    title: "${tip.title.replace(/"/g, '\\"')}",
    tip: "${tip.tip.replace(/"/g, '\\"').replace(/\n/g, " ")}",
    severity: "${tip.severity}",
    confidence: ${tip.confidence},
    source: "${tip.source.replace(/"/g, '\\"')}",
  },`;
    });

    return `/**
 * Tribal tips extracted from Gosiger/Okuma training video transcripts.
 * Auto-generated by OkumaGosigerTranscriptMinerEngine.
 * Generated: ${new Date().toISOString()}
 */

import type { TribalTip } from "./tribal-knowledge-tips.js";

export const GOSIGER_VIDEO_TRIBAL_TIPS: TribalTip[] = [
${lines.join("\n")}
];
`;
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const okumaGosigerTranscriptMinerEngine = new OkumaGosigerTranscriptMinerEngineImpl();
export type { OkumaGosigerTranscriptMinerEngineImpl };
