/**
 * Curated YouTube Picks — Visual Learning for Each Domain
 *
 * Per /goal 2026-05-27 (lima): "can you link youtube vids for visual learners?".
 *
 * Sourced from mcp-server/data/tribal/youtube-toolpath-tribal.jsonl (2,520 entries,
 * 360 unique videos, peer-extracted by other PRISM chats). Selection criteria:
 *   1. Chunk count (proxy for how much transcript content the video contributed)
 *   2. Channel authority (Sandvik/Iscar/Haas/TITANS/NYC CNC/Autodesk Fusion preferred)
 *   3. Average confidence score of the video's chunks
 *
 * Every entry cites: channel · video title · videoId · domain · why included.
 * This is the canonical author reference — courses cite these by `videoId` rather
 * than memorizing URLs.
 *
 * To embed a video in a course module's `<video>` content section:
 *   {
 *     type: "video" as ContentType,
 *     title: "Climb vs Conventional Milling — Visual",
 *     body: `https://www.youtube.com/watch?v=${YOUTUBE_PICKS['intro-trochoidal'].videoId}\n\nNarrative caption here.`,
 *   }
 *
 * LessonView.tsx auto-detects the YouTube URL on the first line of body and embeds it.
 */

export interface YouTubePick {
  videoId: string;
  title: string;
  channel: string;
  domain: 'cad' | 'cam' | 'mill' | 'lathe' | 'wedm' | 'general';
  duration_s?: number;
  why: string;
  url: string;
}

function pick(p: Omit<YouTubePick, 'url'>): YouTubePick {
  return { ...p, url: `https://www.youtube.com/watch?v=${p.videoId}` };
}

// ─── CAM (CAD/CAM software tutorials) ─────────────────────────────────────
export const CAM_PICKS = {
  'fusion-titans-1m-op1': pick({
    videoId: 'hTxaDxr5-Ik',
    title: 'Fusion 360 Tutorial — Program the Titan-1M OP1 ACAD',
    channel: 'TITANS of CNC MACHINING',
    domain: 'cam',
    why: 'TITANS-quality production walkthrough of a complete Fusion CAM job.',
  }),
  'hypermill-ep1-interface': pick({
    videoId: 'XIbd8qPQDoQ',
    title: "Let's learn hyperMILL EP1 INTERFACE",
    channel: 'Michael Jacobs',
    domain: 'cam',
    why: 'Single best free hyperMILL onboarding — directly relevant to your shop.',
  }),
  'inventor-cam-smarter': pick({
    videoId: 'T-YE8SmmnSE',
    title: 'Autodesk Inventor CAM — Work Smarter Not Harder',
    channel: 'Hagerman & Company',
    domain: 'cam',
    why: 'Hagerman is an authorized Autodesk reseller — workflow-grade content.',
  }),
  'mastercam-mill-3d-2022': pick({
    videoId: 'cD33l7oxl5I',
    title: 'Mill and Mill 3D Mastercam 2022',
    channel: 'OptiPro Systems',
    domain: 'cam',
    why: 'Modern Mastercam 2022 workflow from a working precision shop.',
  }),
  'mastercam-mill-mlc': pick({
    videoId: 'voIA0VyLW9E',
    title: 'Getting Started with Mastercam Mill — Skills Event',
    channel: 'MLC CAD Systems',
    domain: 'cam',
    why: "Skills-event style — paced for beginner-to-intermediate operators.",
  }),
  'nx-cam-crash-course': pick({
    videoId: 'XiSCDtbowXo',
    title: 'Master NX CAM with this Crash Course',
    channel: 'CAM Learning Partner',
    domain: 'cam',
    why: 'NX CAM end-to-end — useful when JM picks up NX-programmed jobs.',
  }),
} as const;

// ─── CAD (sketching, modeling, drawings) ──────────────────────────────────
export const CAD_PICKS = {
  'solidworks-k-factor': pick({
    videoId: '-4uN9eRihQQ',
    title: 'SOLIDWORKS Sheet Metal — What is K-Factor',
    channel: 'Too Tall Toby',
    domain: 'cad',
    why: 'The single best free explanation of K-factor → flat-pattern math.',
  }),
  'catia-surface-design': pick({
    videoId: '1fd9IMhhCfU',
    title: 'CATIA V5 Beginner Tutorial — Surface Design GSD',
    channel: 'CAD Masterclass',
    domain: 'cad',
    why: 'CATIA V5 Generative Shape Design — aerospace customers (ITW, Alcoa).',
  }),
  'fusion-electrical-routes': pick({
    videoId: 'O4QkUUxbOb4',
    title: '360 LIVE Electrical Wire Routes',
    channel: 'Autodesk Fusion',
    domain: 'cad',
    why: 'Official Autodesk live — best practices straight from the vendor.',
  }),
  'catia-adaptive-sweep': pick({
    videoId: 'qFAjBPcHc6E',
    title: 'CATIA V5 Adaptive Sweep — Advanced Surface',
    channel: 'Enginuity Lab',
    domain: 'cad',
    why: 'Advanced CATIA surface modeling — needed for complex mold cavities.',
  }),
  'reverse-engineering-3d-scan': pick({
    videoId: 'kt8SPX33tWE',
    title: '3D Scanning to CAD for Free — Beginners Guide to Reverse Engineering',
    channel: 'Payo',
    domain: 'cad',
    why: 'Reverse-engineering basics — useful when a customer sends only the part.',
  }),
} as const;

// ─── MILL (machining mill operations) ─────────────────────────────────────
export const MILL_PICKS = {
  'shapeoko-feeds-speeds': pick({
    videoId: 'b8CndwnfoCM',
    title: 'Shapeoko Feeds & Speeds and Machining Tips',
    channel: 'NYC CNC',
    domain: 'mill',
    why: 'NYC CNC explains feeds & speeds the way a shop floor needs to hear it.',
  }),
  'titans-break-spindles': pick({
    videoId: '2TJOSeurQ_8',
    title: 'I was Willing to BREAK SPINDLES to make Crazy Money',
    channel: 'TITANS of CNC MACHINING',
    domain: 'mill',
    why: 'TITANS production-rate philosophy — when to push, when not to.',
  }),
  'titans-gm-codes-manual': pick({
    videoId: '5XihF05K4yM',
    title: 'G & M Code — Titan Teaches Manual Programming',
    channel: 'TITANS of CNC MACHINING',
    domain: 'mill',
    why: 'Titan walks G & M codes manually — foundational for shop-floor edits.',
  }),
  'trochoidal-milling': pick({
    videoId: '28tRDf22www',
    title: 'Trochoidal Milling',
    channel: 'Buildbotics LLC',
    domain: 'mill',
    why: 'Trochoidal toolpath strategy — Chris will use this on Hurco/Okuma jobs.',
  }),
  'sequence-of-machining': pick({
    videoId: 'np9ltr0py54',
    title: 'Sequence of Machining Operations Part 1 — Planning',
    channel: 'THATLAZYMACHINIST',
    domain: 'mill',
    why: 'Operation-order discipline — Justin needs this before touching Roku-Roku.',
  }),
  'advanced-machining-tips': pick({
    videoId: 'capA_mYYGpY',
    title: 'Advanced Machining — Tips and Tricks Part 1',
    channel: 'Threadexpress',
    domain: 'mill',
    why: 'Threadexpress is shop-floor authoritative — depth Chris will appreciate.',
  }),
} as const;

// ─── LATHE (turning operations) ───────────────────────────────────────────
export const LATHE_PICKS = {
  'mazak-mazatrol-programming': pick({
    videoId: 'EPkvGVNoV98',
    title: 'Mazak CNC Lathe Mazatrol Programming Tutorial',
    channel: 'CNC CADCAM',
    domain: 'lathe',
    why: 'Mazatrol conversational programming — adjacent to your Okuma OSP.',
  }),
  'okuma-multi-function': pick({
    videoId: 'wzJrocvyIBs',
    title: 'Training Class — Okuma Lathe Multi-Function Programming',
    channel: 'Hartwig',
    domain: 'lathe',
    why: 'Hartwig is an Okuma authorized distributor — DIRECTLY relevant to your LTH-01..07.',
  }),
  'fanuc-6t-setup-g50': pick({
    videoId: 'aX-I548Gy2E',
    title: 'Fanuc 6T setup G50 tutorial — Ikegai AX20 CNC lathe',
    channel: 'Carl Crawford',
    domain: 'lathe',
    why: 'G50 work-offset workflow — applies to any older Fanuc-controlled lathe.',
  }),
  'jit-passes-tab': pick({
    videoId: 'r88wX51bg38',
    title: 'Turning Tuesday — Mastering the Passes Tab in Autodesk',
    channel: 'JIT CAD CAM',
    domain: 'lathe',
    why: 'Fusion turning passes — Chris uses Fusion for some lathe ops.',
  }),
  'nyc-cnc-22lr-barrel': pick({
    videoId: '2F2tJrhOp4g',
    title: 'SBR an SW MP 22LR — Making Barrel, tool, turning, threading',
    channel: 'NYC CNC',
    domain: 'lathe',
    why: 'End-to-end lathe job (barrel) — full operation chain shown.',
  }),
} as const;

// ─── WEDM (wire EDM) ──────────────────────────────────────────────────────
export const WEDM_PICKS = {
  'sodick-iq-4axis': pick({
    videoId: 'eIljdNiDadA',
    title: 'Sodick IntelliQvic IQ Solid to 4-Axis Wire EDM',
    channel: 'GreentweenVideo',
    domain: 'wedm',
    why: '4-axis wire EDM workflow — adjacent to your Mitsubishi sinker setup.',
  }),
  'sodick-esprit-mac': pick({
    videoId: 'KZZO7y7srhc',
    title: 'Sodick Wire Programming with ESPRIT and Model Associativity',
    channel: 'MidwestCAM',
    domain: 'wedm',
    why: 'ESPRIT WEDM programming — useful reference if EA12S workflow expands.',
  }),
  'nx-cam-wedm-afr': pick({
    videoId: 'S9_CIfArkq8',
    title: 'Automated Feature Recognition in NX CAM Wire EDM',
    channel: 'Siemens Software',
    domain: 'wedm',
    why: 'AFR + WEDM — official Siemens content showing the modern programmer workflow.',
  }),
} as const;

// ─── GENERAL (shop fundamentals, measurement, troubleshooting) ────────────
export const GENERAL_PICKS = {
  'surface-finish-measurement': pick({
    videoId: 'A0Gx8C113e8',
    title: 'Lesson 7 — Measuring Surface Finish',
    channel: 'Screw Machine Information',
    domain: 'general',
    why: 'Surface-finish measurement basics — Justin needs this for QC.',
  }),
  'reverse-engineering': pick({
    videoId: 'rHhcNLa4foo',
    title: 'Reverse Engineering with Autodesk Manufacturing',
    channel: 'KETIV Technologies',
    domain: 'general',
    why: 'Reverse-engineering an existing part — common in repair work.',
  }),
  'haas-tip-of-the-day-day-one': pick({
    videoId: 'm0ukd8vT9bw',
    title: 'Make This Part On Day One — Haas Automation Tip of the Day',
    channel: 'Haas Automation, Inc.',
    domain: 'general',
    why: 'Official Haas channel — directly relevant to your Haas VF-2 + OM2.',
  }),
  'heidenhain-programming': pick({
    videoId: 'TWnvcUb-hOM',
    title: "Let's look at Heidenhain programming in detail",
    channel: 'MTDCNC',
    domain: 'general',
    why: 'Heidenhain control — adjacent reference (some hyperMILL jobs target Heidenhain).',
  }),
  'goengineer-weldments': pick({
    videoId: 'h_PSPuO7-fg',
    title: 'A Beginners Guide to Weldments',
    channel: 'CATI / GoEngineer',
    domain: 'general',
    why: 'Weldment basics — useful when fabricated tooling crosses your shop.',
  }),
} as const;

// ─── Unified registry ─────────────────────────────────────────────────────

export const YOUTUBE_PICKS: Record<string, YouTubePick> = {
  ...CAM_PICKS,
  ...CAD_PICKS,
  ...MILL_PICKS,
  ...LATHE_PICKS,
  ...WEDM_PICKS,
  ...GENERAL_PICKS,
};

/**
 * Convenience helper for course authors: builds the `body` string that
 * LessonView.tsx's <video> handler auto-embeds. Caption is the human-readable
 * line under the player.
 */
export function videoBody(pickId: keyof typeof YOUTUBE_PICKS, caption: string): string {
  const pick = YOUTUBE_PICKS[pickId];
  if (!pick) throw new Error(`Unknown YouTube pick: ${pickId}`);
  return `${pick.url}\n\n${caption}`;
}

/**
 * Filter picks by domain — useful for a course module that wants to surface
 * "watch these 3 videos for visual learners in this section".
 */
export function picksForDomain(domain: YouTubePick['domain']): YouTubePick[] {
  return Object.values(YOUTUBE_PICKS).filter((p) => p.domain === domain);
}
