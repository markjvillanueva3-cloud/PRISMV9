/**
 * URLContentExtractorEngine — URL Content Type Detection & Extraction
 *
 * Accepts a URL, detects its content type (article, video page, forum post,
 * social media), extracts the main textual content, and returns a structured
 * result ready for the ContentIngestionPipelineEngine.
 *
 * LEARN-MS1-S2 U-LEARN10
 */
import { log } from "../utils/Logger.js";

// ── Types ──────────────────────────────────────────────────────────

export type URLContentType = "article" | "video" | "forum" | "social" | "document" | "unknown";

export interface URLDetectionResult {
  url: string;
  content_type: URLContentType;
  platform?: string;
  video_id?: string;
  confidence: number;
  signals: string[];
}

export interface URLExtractionResult {
  url: string;
  content_type: URLContentType;
  platform?: string;
  title: string;
  text_content: string;
  video_id?: string;
  images: string[];
  metadata: Record<string, string>;
  word_count: number;
  extraction_method: string;
  source_attribution: string;
}

// ── URL Pattern Database ───────────────────────────────────────────

interface PlatformPattern {
  pattern: RegExp;
  platform: string;
  content_type: URLContentType;
  video_id_extractor?: (url: string) => string | undefined;
}

const PLATFORM_PATTERNS: PlatformPattern[] = [
  // Video platforms
  {
    pattern: /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)/i,
    platform: "YouTube",
    content_type: "video",
    video_id_extractor: (url) => {
      const m = url.match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{11})/);
      return m?.[1];
    },
  },
  {
    pattern: /vimeo\.com\/\d+/i,
    platform: "Vimeo",
    content_type: "video",
    video_id_extractor: (url) => url.match(/vimeo\.com\/(\d+)/)?.[1],
  },
  {
    pattern: /dailymotion\.com\/video\//i,
    platform: "Dailymotion",
    content_type: "video",
  },
  // Social media
  {
    pattern: /facebook\.com|fb\.com|fb\.watch/i,
    platform: "Facebook",
    content_type: "social",
  },
  {
    pattern: /instagram\.com\/(?:p|reel|tv)\//i,
    platform: "Instagram",
    content_type: "social",
  },
  {
    pattern: /(?:twitter\.com|x\.com)\/\w+\/status\//i,
    platform: "X/Twitter",
    content_type: "social",
  },
  {
    pattern: /linkedin\.com\/(?:posts|pulse|feed)\//i,
    platform: "LinkedIn",
    content_type: "social",
  },
  {
    pattern: /tiktok\.com\/@[\w.]+\/video\//i,
    platform: "TikTok",
    content_type: "video",
  },
  // Forums & communities
  {
    pattern: /reddit\.com\/r\/\w+\/comments\//i,
    platform: "Reddit",
    content_type: "forum",
  },
  {
    pattern: /practicalmachinist\.com/i,
    platform: "Practical Machinist",
    content_type: "forum",
  },
  {
    pattern: /cnczone\.com/i,
    platform: "CNCZone",
    content_type: "forum",
  },
  {
    pattern: /hobby-machinist\.com/i,
    platform: "Hobby Machinist",
    content_type: "forum",
  },
  // Document links
  {
    pattern: /\.pdf$/i,
    platform: "PDF",
    content_type: "document",
  },
];

// ── HTML Cleanup ───────────────────────────────────────────────────

/**
 * Strip HTML tags and extract readable text content.
 * Preserves paragraph breaks and list structure.
 */
function stripHTML(html: string): string {
  let text = html;

  // Remove script, style, nav, header, footer, sidebar blocks
  text = text.replace(/<(script|style|nav|header|footer|aside|iframe|noscript)[^>]*>[\s\S]*?<\/\1>/gi, "");

  // Convert common block elements to newlines
  text = text.replace(/<\/(p|div|li|h[1-6]|tr|br\s*\/?)>/gi, "\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<li[^>]*>/gi, "- ");

  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode common HTML entities
  text = text.replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code)));

  // Collapse whitespace, preserve paragraph breaks
  text = text.replace(/[ \t]+/g, " ");
  text = text.replace(/\n\s*\n/g, "\n\n");
  text = text.trim();

  return text;
}

/**
 * Extract title from HTML.
 */
function extractTitle(html: string): string {
  // Try og:title first
  const ogMatch = html.match(/<meta\s+(?:property|name)=["']og:title["']\s+content=["']([^"']+)["']/i);
  if (ogMatch) return ogMatch[1].trim();

  // Try <title> tag
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch) return titleMatch[1].trim();

  // Try first h1
  const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (h1Match) return h1Match[1].trim();

  return "";
}

/**
 * Extract image URLs from HTML.
 */
function extractImages(html: string): string[] {
  const images: string[] = [];
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const src = match[1];
    // Skip tracking pixels, icons, avatars
    if (src.includes("pixel") || src.includes("tracking") || src.includes("icon")) continue;
    if (src.includes("avatar") || src.includes("profile")) continue;
    // Skip tiny images (likely UI elements)
    const widthMatch = html.substring(Math.max(0, match.index - 200), match.index + match[0].length + 200)
      .match(/width=["']?(\d+)/);
    if (widthMatch && parseInt(widthMatch[1]) < 50) continue;
    images.push(src);
  }
  return images.slice(0, 20); // Cap at 20 images
}

/**
 * Extract metadata from HTML meta tags.
 */
function extractMetadata(html: string): Record<string, string> {
  const meta: Record<string, string> = {};
  const metaRegex = /<meta\s+(?:property|name)=["']([^"']+)["']\s+content=["']([^"']+)["']/gi;
  let match;
  while ((match = metaRegex.exec(html)) !== null) {
    const key = match[1].toLowerCase();
    if (key.startsWith("og:") || key === "description" || key === "author" || key === "keywords") {
      meta[key] = match[2].trim();
    }
  }
  return meta;
}

/**
 * Extract main content area from HTML using common content selectors.
 * Falls back to full body if no main content area found.
 */
function extractMainContent(html: string): string {
  // Try to find article/main content containers
  const contentPatterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<div[^>]*class=["'][^"']*(?:post-content|entry-content|article-body|story-body|thread-content|message-body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id=["'](?:content|main-content|post-body)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const pattern of contentPatterns) {
    const match = html.match(pattern);
    if (match) {
      const content = stripHTML(match[1] || match[0]);
      if (content.length > 100) return content;
    }
  }

  // Fallback: strip the whole body
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return stripHTML(bodyMatch?.[1] ?? html);
}

// ── Engine ──────────────────────────────────────────────────────────

class URLContentExtractorEngineImpl {

  /**
   * Detect the content type of a URL without fetching it.
   * Uses URL patterns, domain matching, and path analysis.
   */
  detect(url: string): URLDetectionResult {
    const signals: string[] = [];
    let content_type: URLContentType = "unknown";
    let platform: string | undefined;
    let video_id: string | undefined;
    let confidence = 0.3;

    // Normalize URL
    const normalizedUrl = url.trim();

    // Check against known platform patterns
    for (const pp of PLATFORM_PATTERNS) {
      if (pp.pattern.test(normalizedUrl)) {
        content_type = pp.content_type;
        platform = pp.platform;
        confidence = 0.9;
        signals.push(`matched_platform:${pp.platform}`);

        if (pp.video_id_extractor) {
          video_id = pp.video_id_extractor(normalizedUrl);
          if (video_id) signals.push(`video_id:${video_id}`);
        }
        break;
      }
    }

    // URL path heuristics if no platform match
    if (content_type === "unknown") {
      const urlLower = normalizedUrl.toLowerCase();

      // Video file extensions
      if (/\.(mp4|mkv|mov|avi|webm)(\?|$)/i.test(urlLower)) {
        content_type = "video";
        confidence = 0.95;
        signals.push("video_file_extension");
      }
      // Document extensions
      else if (/\.(pdf|doc|docx|txt|md)(\?|$)/i.test(urlLower)) {
        content_type = "document";
        confidence = 0.95;
        signals.push("document_file_extension");
      }
      // Forum-like paths
      else if (/\/(thread|topic|discussion|forum|post|comment)/i.test(urlLower)) {
        content_type = "forum";
        confidence = 0.6;
        signals.push("forum_path_pattern");
      }
      // Blog/article patterns
      else if (/\/(blog|article|news|guide|tutorial|how-to)/i.test(urlLower)) {
        content_type = "article";
        confidence = 0.6;
        signals.push("article_path_pattern");
      }
      // Default: assume article for regular web pages
      else {
        content_type = "article";
        confidence = 0.3;
        signals.push("default_article_assumption");
      }
    }

    return {
      url: normalizedUrl,
      content_type,
      platform,
      video_id,
      confidence,
      signals,
    };
  }

  /**
   * Extract content from raw HTML.
   * Use this when you already have the HTML (e.g., from a fetch).
   */
  extractFromHTML(url: string, html: string): URLExtractionResult {
    const detection = this.detect(url);
    const title = extractTitle(html);
    const mainContent = extractMainContent(html);
    const images = extractImages(html);
    const metadata = extractMetadata(html);

    // Build source attribution
    let source_attribution = detection.platform
      ? `${detection.platform}/${new URL(url).hostname}`
      : new URL(url).hostname;

    // For social media, try to extract author
    if (detection.content_type === "social" || detection.content_type === "forum") {
      const authorMatch = html.match(
        /<a[^>]*class=["'][^"']*(?:author|user|profile)[^"']*["'][^>]*>([^<]+)<\/a>/i
      );
      if (authorMatch) {
        source_attribution = `${detection.platform ?? "web"}/${authorMatch[1].trim()}`;
      }
    }

    return {
      url,
      content_type: detection.content_type,
      platform: detection.platform,
      title,
      text_content: mainContent,
      video_id: detection.video_id,
      images,
      metadata,
      word_count: mainContent.split(/\s+/).filter(w => w.length > 0).length,
      extraction_method: detection.platform ? "platform_parser" : "generic_html",
      source_attribution,
    };
  }

  /**
   * Extract content from a URL string directly (for cases where HTML is not pre-fetched).
   * Returns a stub result with detection info — actual fetching happens at the dispatcher level.
   */
  extractFromURL(url: string): URLExtractionResult {
    const detection = this.detect(url);

    let hostname: string;
    try {
      hostname = new URL(url).hostname;
    } catch {
      hostname = url.replace(/https?:\/\//, "").split("/")[0];
    }

    return {
      url,
      content_type: detection.content_type,
      platform: detection.platform,
      title: "",
      text_content: "",
      video_id: detection.video_id,
      images: [],
      metadata: {},
      word_count: 0,
      extraction_method: "url_detection_only",
      source_attribution: detection.platform
        ? `${detection.platform}/${hostname}`
        : hostname,
    };
  }

  /**
   * Parse YouTube-specific URL variants to extract video ID.
   */
  parseYouTubeURL(url: string): { video_id: string; playlist_id?: string; timestamp?: number } | null {
    // Standard watch URL
    let match = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (match) {
      const playlist = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      const time = url.match(/[?&]t=(\d+)/);
      return {
        video_id: match[1],
        playlist_id: playlist?.[1],
        timestamp: time ? parseInt(time[1]) : undefined,
      };
    }

    // Short URL
    match = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (match) {
      const time = url.match(/[?&]t=(\d+)/);
      return { video_id: match[1], timestamp: time ? parseInt(time[1]) : undefined };
    }

    // Shorts
    match = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (match) return { video_id: match[1] };

    // Embed
    match = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (match) return { video_id: match[1] };

    return null;
  }
}

export const urlContentExtractorEngine = new URLContentExtractorEngineImpl();
