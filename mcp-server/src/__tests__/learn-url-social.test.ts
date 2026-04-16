/**
 * LEARN-MS1-S2: URL Content Extraction + Social Media Parsing Tests
 *
 * Tests URLContentExtractorEngine (URL detection, HTML extraction, YouTube parsing)
 * and SocialMediaParserEngine (CNC relevance scoring, tip extraction, batch parsing).
 */

import { describe, it, expect } from "vitest";
import { urlContentExtractorEngine } from "../engines/URLContentExtractorEngine.js";
import { socialMediaParserEngine } from "../engines/SocialMediaParserEngine.js";
import type { SocialMediaPost } from "../engines/SocialMediaParserEngine.js";

// ═══ URLContentExtractorEngine ═══

describe("LEARN-MS1-S2: URLContentExtractorEngine", () => {

  describe("detect()", () => {

    it("detects YouTube watch URL", () => {
      const result = urlContentExtractorEngine.detect("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      expect(result.content_type).toBe("video");
      expect(result.platform).toBe("YouTube");
      expect(result.video_id).toBe("dQw4w9WgXcQ");
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("detects YouTube short URL", () => {
      const result = urlContentExtractorEngine.detect("https://youtu.be/abc123def45");
      expect(result.content_type).toBe("video");
      expect(result.platform).toBe("YouTube");
      expect(result.video_id).toBe("abc123def45");
    });

    it("detects YouTube shorts URL", () => {
      const result = urlContentExtractorEngine.detect("https://youtube.com/shorts/abc123def45");
      expect(result.content_type).toBe("video");
      expect(result.video_id).toBe("abc123def45");
    });

    it("detects Facebook URL as social", () => {
      const result = urlContentExtractorEngine.detect("https://www.facebook.com/mr.cnc2/posts/12345");
      expect(result.content_type).toBe("social");
      expect(result.platform).toBe("Facebook");
    });

    it("detects Instagram post URL", () => {
      const result = urlContentExtractorEngine.detect("https://www.instagram.com/p/ABC123/");
      expect(result.content_type).toBe("social");
      expect(result.platform).toBe("Instagram");
    });

    it("detects Reddit post URL as forum", () => {
      const result = urlContentExtractorEngine.detect("https://www.reddit.com/r/Machinists/comments/abc123/how_to_mill_titanium/");
      expect(result.content_type).toBe("forum");
      expect(result.platform).toBe("Reddit");
    });

    it("detects Practical Machinist as forum", () => {
      const result = urlContentExtractorEngine.detect("https://www.practicalmachinist.com/forum/threads/chip-thinning.12345/");
      expect(result.content_type).toBe("forum");
      expect(result.platform).toBe("Practical Machinist");
    });

    it("detects PDF URL as document", () => {
      const result = urlContentExtractorEngine.detect("https://example.com/manuals/haas-programming.pdf");
      expect(result.content_type).toBe("document");
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("detects video file extension", () => {
      const result = urlContentExtractorEngine.detect("https://cdn.example.com/tutorial.mp4");
      expect(result.content_type).toBe("video");
    });

    it("defaults unknown URLs to article", () => {
      const result = urlContentExtractorEngine.detect("https://example.com/cnc-tips");
      expect(result.content_type).toBe("article");
    });

    it("detects blog/article path patterns", () => {
      const result = urlContentExtractorEngine.detect("https://example.com/blog/how-to-mill-aluminum");
      expect(result.content_type).toBe("article");
      expect(result.signals).toContain("article_path_pattern");
    });
  });

  describe("parseYouTubeURL()", () => {

    it("parses standard watch URL with playlist and timestamp", () => {
      const result = urlContentExtractorEngine.parseYouTubeURL("https://www.youtube.com/watch?v=abc123def45&list=PLxyz&t=120");
      expect(result).not.toBeNull();
      expect(result!.video_id).toBe("abc123def45");
      expect(result!.playlist_id).toBe("PLxyz");
      expect(result!.timestamp).toBe(120);
    });

    it("parses short URL", () => {
      const result = urlContentExtractorEngine.parseYouTubeURL("https://youtu.be/abc123def45?t=60");
      expect(result).not.toBeNull();
      expect(result!.video_id).toBe("abc123def45");
      expect(result!.timestamp).toBe(60);
    });

    it("parses embed URL", () => {
      const result = urlContentExtractorEngine.parseYouTubeURL("https://www.youtube.com/embed/abc123def45");
      expect(result).not.toBeNull();
      expect(result!.video_id).toBe("abc123def45");
    });

    it("returns null for non-YouTube URL", () => {
      const result = urlContentExtractorEngine.parseYouTubeURL("https://example.com/video");
      expect(result).toBeNull();
    });
  });

  describe("extractFromHTML()", () => {

    const sampleHTML = `
      <html><head>
        <title>CNC Milling Tips for Aluminum</title>
        <meta property="og:title" content="CNC Milling Tips" />
        <meta name="description" content="Best practices for aluminum milling" />
        <meta name="author" content="CNC Expert" />
      </head><body>
        <nav><a href="/">Home</a></nav>
        <article>
          <h1>CNC Milling Tips for Aluminum</h1>
          <p>When machining 7075-T6 aluminum, use a 3-flute endmill at 10000 RPM with 0.1mm chipload.</p>
          <p>Climb milling produces better surface finish than conventional milling in aluminum.</p>
          <img src="https://example.com/images/milling-setup.jpg" />
        </article>
        <footer>Copyright 2024</footer>
      </body></html>
    `;

    it("extracts title from og:title", () => {
      const result = urlContentExtractorEngine.extractFromHTML("https://example.com/tips", sampleHTML);
      expect(result.title).toBe("CNC Milling Tips");
    });

    it("extracts main article content", () => {
      const result = urlContentExtractorEngine.extractFromHTML("https://example.com/tips", sampleHTML);
      expect(result.text_content).toContain("7075-T6");
      expect(result.text_content).toContain("10000 RPM");
      expect(result.word_count).toBeGreaterThan(10);
    });

    it("strips navigation and footer", () => {
      const result = urlContentExtractorEngine.extractFromHTML("https://example.com/tips", sampleHTML);
      expect(result.text_content).not.toContain("Copyright");
    });

    it("extracts images", () => {
      const result = urlContentExtractorEngine.extractFromHTML("https://example.com/tips", sampleHTML);
      expect(result.images.length).toBeGreaterThanOrEqual(1);
      expect(result.images[0]).toContain("milling-setup.jpg");
    });

    it("extracts metadata", () => {
      const result = urlContentExtractorEngine.extractFromHTML("https://example.com/tips", sampleHTML);
      expect(result.metadata["description"]).toContain("aluminum milling");
    });

    it("builds source attribution from hostname", () => {
      const result = urlContentExtractorEngine.extractFromHTML("https://example.com/tips", sampleHTML);
      expect(result.source_attribution).toContain("example.com");
    });
  });

  describe("extractFromURL()", () => {

    it("returns detection-only result without HTML", () => {
      const result = urlContentExtractorEngine.extractFromURL("https://www.youtube.com/watch?v=abc123def45");
      expect(result.content_type).toBe("video");
      expect(result.platform).toBe("YouTube");
      expect(result.extraction_method).toBe("url_detection_only");
      expect(result.text_content).toBe("");
    });
  });
});

// ═══ SocialMediaParserEngine ═══

describe("LEARN-MS1-S2: SocialMediaParserEngine", () => {

  describe("parse()", () => {

    it("identifies CNC-relevant Facebook post", () => {
      const result = socialMediaParserEngine.parse({
        platform: "facebook",
        author: "mr.cnc2",
        text: "When roughing Inconel 718 on the Haas VF-2, I use 150 SFM with carbide inserts and flood coolant. Chipload at 0.003 IPT.",
      });

      expect(result.is_cnc_relevant).toBe(true);
      expect(result.confidence).toBeGreaterThan(30);
      expect(result.source_attribution).toBe("Facebook/mr.cnc2");
      expect(result.tags.length).toBeGreaterThan(0);
    });

    it("rejects non-CNC content", () => {
      const result = socialMediaParserEngine.parse({
        platform: "facebook",
        author: "foodie",
        text: "Just made the most amazing pasta recipe with fresh basil and homemade sauce. Cooking is my passion!",
      });

      expect(result.is_cnc_relevant).toBe(false);
      expect(result.confidence).toBeLessThan(30);
    });

    it("extracts tips from numbered list post", () => {
      const result = socialMediaParserEngine.parse({
        platform: "instagram",
        author: "cncmachinist",
        text: "Top 3 aluminum milling tips:\n1. Use 3-flute carbide endmills for better chip evacuation\n2. Climb mill for superior surface finish at high speed\n3. Keep chipload above 0.002 inch per tooth to avoid rubbing",
      });

      expect(result.is_cnc_relevant).toBe(true);
      expect(result.tips_extracted.length).toBe(3);
      expect(result.tips_extracted[0].body).toContain("3-flute");
    });

    it("extracts tips from bullet points", () => {
      const result = socialMediaParserEngine.parse({
        platform: "reddit",
        author: "machinist123",
        text: "Stainless steel tips:\n- Always use flood coolant when machining 316L\n- Reduce cutting speed by 30% compared to mild steel\n- Peck drill to clear chips in deep holes",
      });

      expect(result.tips_extracted.length).toBe(3);
    });

    it("builds correct source attribution", () => {
      const result = socialMediaParserEngine.parse({
        platform: "facebook",
        author: "@mr.cnc2",
        text: "CNC tip: use climb milling for aluminum",
      });
      expect(result.source_attribution).toBe("Facebook/mr.cnc2");
    });

    it("auto-tags materials and operations", () => {
      const result = socialMediaParserEngine.parse({
        platform: "x_twitter",
        author: "cnc_tips",
        text: "Milling 4140 steel at S3000 F500 with a 10mm carbide endmill on our DMG Mori",
      });

      expect(result.tags.some(t => t.includes("material:"))).toBe(true);
      expect(result.tags.some(t => t.includes("operation:") || t.includes("machine:"))).toBe(true);
    });

    it("counts images", () => {
      const result = socialMediaParserEngine.parse({
        platform: "instagram",
        author: "cncshop",
        text: "Check out this surface finish on 7075 aluminum",
        images: ["img1.jpg", "img2.jpg"],
      });
      expect(result.image_count).toBe(2);
    });

    it("handles G-code word detection", () => {
      const result = socialMediaParserEngine.parse({
        platform: "forum",
        author: "machinist",
        text: "CNC milling tip: Set S8000 F1200 for finishing pass with G41 cutter comp on aluminum endmill",
      });
      expect(result.is_cnc_relevant).toBe(true);
      expect(result.relevance_signals).toContain("has_gcode_words");
    });
  });

  describe("parseBatch()", () => {

    it("processes multiple posts and counts CNC-relevant ones", () => {
      const posts: SocialMediaPost[] = [
        { platform: "facebook", author: "mr.cnc2", text: "Use climb milling with carbide endmill at 10000 RPM for aluminum" },
        { platform: "facebook", author: "foodie", text: "Great recipe for pasta with fresh tomatoes" },
        { platform: "reddit", author: "machinist", text: "Haas VF-2 chatter problem at 4500 RPM with stainless steel boring bar" },
      ];

      const result = socialMediaParserEngine.parseBatch(posts);
      expect(result.total_processed).toBe(3);
      expect(result.cnc_relevant).toBe(2);
      expect(result.tips_extracted).toBeGreaterThanOrEqual(2);
      expect(result.source_summary["Facebook"]).toBe(2);
    });

    it("provides per-source summary", () => {
      const posts: SocialMediaPost[] = [
        { platform: "facebook", author: "a", text: "CNC milling aluminum at high RPM" },
        { platform: "reddit", author: "b", text: "Lathe turning 4140 steel with carbide insert" },
        { platform: "facebook", author: "c", text: "Haas VF-2 setup with 10mm endmill" },
      ];

      const result = socialMediaParserEngine.parseBatch(posts);
      expect(result.source_summary["Facebook"]).toBe(2);
      expect(result.source_summary["Reddit"]).toBe(1);
    });
  });

  describe("detectPlatform()", () => {

    it("detects Facebook", () => {
      expect(socialMediaParserEngine.detectPlatform("https://facebook.com/mr.cnc2")).toBe("facebook");
    });

    it("detects Reddit", () => {
      expect(socialMediaParserEngine.detectPlatform("https://reddit.com/r/Machinists")).toBe("reddit");
    });

    it("detects Practical Machinist forum", () => {
      expect(socialMediaParserEngine.detectPlatform("https://practicalmachinist.com/forum/thread/123")).toBe("forum");
    });

    it("returns unknown for unrecognized domains", () => {
      expect(socialMediaParserEngine.detectPlatform("https://random-site.com")).toBe("unknown");
    });
  });

  describe("scoreRelevance()", () => {

    it("scores CNC text highly", () => {
      const score = socialMediaParserEngine.scoreRelevance(
        "Machining 7075 aluminum at 10000 RPM with carbide endmill, climb milling for surface finish"
      );
      expect(score).toBeGreaterThan(50);
    });

    it("scores non-CNC text low", () => {
      const score = socialMediaParserEngine.scoreRelevance(
        "Just had the best coffee at this new café downtown"
      );
      expect(score).toBeLessThan(30);
    });
  });
});

// ═══ Dispatcher Wiring Verification ═══

describe("LEARN-MS1-S2: Dispatcher wiring verification", () => {

  it("schema map has all 4 new URL + Social actions", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");

    const newActions = ["learn_url_extract", "learn_url_detect", "learn_social_parse", "learn_social_batch"];
    for (const action of newActions) {
      expect(ACTION_KNOWLEDGE_SCHEMAS[action]).toBeTruthy();
    }
  });

  it("learn_social_parse schema validates platform enum", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const schema = ACTION_KNOWLEDGE_SCHEMAS["learn_social_parse"];

    const valid = schema.safeParse({ text: "CNC tip", platform: "facebook" });
    expect(valid.success).toBe(true);

    const invalidPlatform = schema.safeParse({ text: "CNC tip", platform: "myspace" });
    expect(invalidPlatform.success).toBe(false);
  });

  it("total knowledge schema count >= 34 (anti-regression)", async () => {
    const { ACTION_KNOWLEDGE_SCHEMAS } = await import("../schemas/knowledgeActionSchemas.js");
    const count = Object.keys(ACTION_KNOWLEDGE_SCHEMAS).length;
    expect(count).toBeGreaterThanOrEqual(34);
  });
});
