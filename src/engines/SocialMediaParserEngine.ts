/**
 * SocialMediaParserEngine — CNC Social Media Post Parsing
 *
 * Parses social media posts from CNC machining pages/groups,
 * extracts machining-relevant content, auto-tags with ContentAutoTaggerEngine,
 * and prepares structured results for knowledge ingestion.
 *
 * LEARN-MS1-S2 U-LEARN11
 */
import { log } from "../utils/Logger.js";
import { contentAutoTaggerEngine } from "./ContentAutoTaggerEngine.js";

// ── Types ──────────────────────────────────────────────────────────

export type SocialPlatform = "facebook" | "instagram" | "x_twitter" | "linkedin" | "reddit" | "youtube" | "tiktok" | "forum" | "unknown";

export interface SocialMediaPost {
  platform: SocialPlatform;
  author: string;
  text: string;
  images?: string[];
  url?: string;
  timestamp?: string;
  engagement?: { likes?: number; comments?: number; shares?: number };
}

export interface ParsedSocialPost {
  platform: SocialPlatform;
  author: string;
  source_attribution: string;
  text_content: string;
  tips_extracted: ExtractedTip[];
  tags: string[];
  category: string;
  confidence: number;
  is_cnc_relevant: boolean;
  relevance_signals: string[];
  image_count: number;
  word_count: number;
}

export interface ExtractedTip {
  title: string;
  body: string;
  category: string;
  tags: string[];
  confidence: number;
  source: string;
}

export interface BatchParseResult {
  total_processed: number;
  cnc_relevant: number;
  tips_extracted: number;
  posts: ParsedSocialPost[];
  source_summary: Record<string, number>;
}

// ── CNC Relevance Detection ────────────────────────────────────────

/** CNC-related keywords for relevance scoring */
const CNC_KEYWORDS = [
  // Machines & controllers
  "cnc", "lathe", "mill", "machining center", "vmc", "hmc", "haas", "mazak",
  "okuma", "dmg", "doosan", "makino", "fanuc", "siemens", "heidenhain",
  // Operations
  "milling", "turning", "drilling", "boring", "tapping", "threading",
  "grinding", "reaming", "broaching", "honing", "edm", "wire edm",
  // Tools
  "endmill", "end mill", "insert", "carbide", "hss", "indexable", "drill bit",
  "face mill", "ball nose", "bull nose", "boring bar", "tap",
  // Parameters
  "rpm", "sfm", "ipm", "ipr", "chipload", "chip load", "feed rate",
  "speed", "depth of cut", "doc", "woc", "stepover", "stepdown",
  // Materials
  "aluminum", "steel", "stainless", "titanium", "inconel", "brass", "copper",
  "cast iron", "hardened", "4140", "6061", "7075", "304", "316",
  // CNC-specific terms
  "g-code", "gcode", "g code", "m-code", "coolant", "tool change",
  "work offset", "fixture", "vise", "chuck", "collet", "spindle",
  "chatter", "vibration", "surface finish", "tolerance", "runout",
  "chip", "burr", "deburr", "setup", "prove out", "first article",
  // CAM
  "cam", "toolpath", "adaptive", "hsm", "high speed", "trochoidal",
  "fusion 360", "mastercam", "hypermill", "solidcam", "nx cam",
];

/** Non-CNC content that should be filtered out */
const NON_CNC_SIGNALS = [
  "cooking", "recipe", "workout", "fitness", "gaming", "music",
  "cryptocurrency", "stock market", "fashion", "beauty",
];

// ── Engine ──────────────────────────────────────────────────────────

class SocialMediaParserEngineImpl {

  /**
   * Parse a single social media post and extract CNC-relevant content.
   */
  parse(post: SocialMediaPost): ParsedSocialPost {
    const text = post.text.trim();
    const textLower = text.toLowerCase();

    // Score CNC relevance
    const relevanceSignals: string[] = [];
    let relevanceScore = 0;

    for (const keyword of CNC_KEYWORDS) {
      if (textLower.includes(keyword)) {
        relevanceScore += keyword.length > 5 ? 2 : 1;
        if (relevanceSignals.length < 10) {
          relevanceSignals.push(keyword);
        }
      }
    }

    // Check for non-CNC signals that should reduce confidence
    for (const signal of NON_CNC_SIGNALS) {
      if (textLower.includes(signal)) {
        relevanceScore -= 3;
        relevanceSignals.push(`anti:${signal}`);
      }
    }

    // Numerical parameter patterns boost relevance
    if (/\d+\s*(?:rpm|sfm|ipm|ipr|mm\/min|m\/min)/i.test(text)) {
      relevanceScore += 3;
      relevanceSignals.push("has_parameters");
    }
    if (/[SGF]\d{2,}/i.test(text)) {
      relevanceScore += 2;
      relevanceSignals.push("has_gcode_words");
    }

    const is_cnc_relevant = relevanceScore >= 3;
    const confidence = Math.min(100, Math.max(0, relevanceScore * 10));

    // Auto-tag with ContentAutoTaggerEngine
    const tagResult = contentAutoTaggerEngine.tag(text);
    const flatTags = contentAutoTaggerEngine.toFlatTags(tagResult);
    const category = contentAutoTaggerEngine.inferCategory(tagResult);

    // Source attribution
    const source_attribution = this.buildSourceAttribution(post);

    // Extract individual tips from post
    const tips_extracted = is_cnc_relevant ? this.extractTips(text, source_attribution, category, flatTags) : [];

    return {
      platform: post.platform,
      author: post.author,
      source_attribution,
      text_content: text,
      tips_extracted,
      tags: flatTags,
      category,
      confidence,
      is_cnc_relevant,
      relevance_signals: relevanceSignals,
      image_count: post.images?.length ?? 0,
      word_count: text.split(/\s+/).filter(w => w.length > 0).length,
    };
  }

  /**
   * Parse a batch of social media posts.
   */
  parseBatch(posts: SocialMediaPost[]): BatchParseResult {
    const results: ParsedSocialPost[] = [];
    const sourceSummary: Record<string, number> = {};
    let totalTips = 0;
    let cncRelevant = 0;

    for (const post of posts) {
      const parsed = this.parse(post);
      results.push(parsed);

      if (parsed.is_cnc_relevant) {
        cncRelevant++;
        totalTips += parsed.tips_extracted.length;
      }

      const key = parsed.source_attribution.split("/")[0] || parsed.platform;
      sourceSummary[key] = (sourceSummary[key] ?? 0) + 1;
    }

    return {
      total_processed: posts.length,
      cnc_relevant: cncRelevant,
      tips_extracted: totalTips,
      posts: results,
      source_summary: sourceSummary,
    };
  }

  /**
   * Detect the social media platform from a URL.
   */
  detectPlatform(url: string): SocialPlatform {
    const urlLower = url.toLowerCase();
    if (urlLower.includes("facebook.com") || urlLower.includes("fb.com")) return "facebook";
    if (urlLower.includes("instagram.com")) return "instagram";
    if (urlLower.includes("twitter.com") || urlLower.includes("x.com")) return "x_twitter";
    if (urlLower.includes("linkedin.com")) return "linkedin";
    if (urlLower.includes("reddit.com")) return "reddit";
    if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) return "youtube";
    if (urlLower.includes("tiktok.com")) return "tiktok";
    if (urlLower.includes("practicalmachinist.com") || urlLower.includes("cnczone.com")
        || urlLower.includes("hobby-machinist.com")) return "forum";
    return "unknown";
  }

  /**
   * Build a source attribution string from post metadata.
   * Format: "Platform/AuthorName" (e.g., "Facebook/mr.cnc2")
   */
  buildSourceAttribution(post: SocialMediaPost): string {
    const platformNames: Record<SocialPlatform, string> = {
      facebook: "Facebook",
      instagram: "Instagram",
      x_twitter: "X",
      linkedin: "LinkedIn",
      reddit: "Reddit",
      youtube: "YouTube",
      tiktok: "TikTok",
      forum: "Forum",
      unknown: "Web",
    };

    const platform = platformNames[post.platform] || "Web";
    const author = post.author.replace(/^@/, "").trim();
    return author ? `${platform}/${author}` : platform;
  }

  /**
   * Extract individual tips from a social media post.
   * Splits on sentence boundaries when the post contains multiple distinct tips.
   */
  extractTips(text: string, source: string, category: string, tags: string[]): ExtractedTip[] {
    const tips: ExtractedTip[] = [];

    // Split by numbered lists: "1. ...", "2. ..."
    const numberedListMatch = text.match(/(?:^|\n)\s*\d+[.)]\s+.+/gm);
    if (numberedListMatch && numberedListMatch.length >= 2) {
      for (const item of numberedListMatch) {
        const body = item.replace(/^\s*\d+[.)]\s+/, "").trim();
        if (body.length < 15) continue;
        tips.push({
          title: body.substring(0, 80),
          body,
          category,
          tags: [...tags],
          confidence: 70,
          source,
        });
      }
      return tips;
    }

    // Split by bullet points: "- ...", "• ..."
    const bulletMatch = text.match(/(?:^|\n)\s*[-•]\s+.+/gm);
    if (bulletMatch && bulletMatch.length >= 2) {
      for (const item of bulletMatch) {
        const body = item.replace(/^\s*[-•]\s+/, "").trim();
        if (body.length < 15) continue;
        tips.push({
          title: body.substring(0, 80),
          body,
          category,
          tags: [...tags],
          confidence: 70,
          source,
        });
      }
      return tips;
    }

    // Split by double newlines (paragraph breaks)
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length >= 30);
    if (paragraphs.length >= 2) {
      for (const para of paragraphs) {
        const body = para.trim();
        tips.push({
          title: body.substring(0, 80),
          body,
          category,
          tags: [...tags],
          confidence: 65,
          source,
        });
      }
      return tips;
    }

    // Single tip from the whole post
    if (text.length >= 20) {
      tips.push({
        title: text.substring(0, 80),
        body: text,
        category,
        tags: [...tags],
        confidence: 75,
        source,
      });
    }

    return tips;
  }

  /**
   * Score how relevant a post is for CNC machining knowledge.
   * Returns 0-100. Posts scoring >= 30 are considered relevant.
   */
  scoreRelevance(text: string): number {
    const result = this.parse({
      platform: "unknown",
      author: "",
      text,
    });
    return result.confidence;
  }
}

export const socialMediaParserEngine = new SocialMediaParserEngineImpl();
