---
title: "ISO 286 Tolerance System | IT Grades, Limits & Fits Explained with Examples"
domain: general
source: youtube
videoId: q4NOYAM-tEc
url: https://www.youtube.com/watch?v=q4NOYAM-tEc
channel: "Simplegyan"
duration_s: 307
tribal_entries: 5
chunks_scanned: 10
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# ISO 286 Tolerance System | IT Grades, Limits & Fits Explained with Examples

**Channel:** [Simplegyan](https://www.youtube.com/watch?v=q4NOYAM-tEc)
**Duration:** 5m 7s
**Domain:** `general` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 5 of 10 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `general`.

### Tip 1 — confidence 0.47

> For example, a 50 mm shaft made in India must fit seamlessly into a 50 mm hole made in Japan without any separate tolera

For example, a 50 mm shaft made in India must fit seamlessly into a 50 mm hole made in Japan without any separate tolerance discussions thanks to ISO 286. Let's start with basic terminology. Nominal size is the theoretical or ideal dimension specified on the drawing like a 50 mm shaft. Deviation is the difference between the actual size and this nominal size categorized as upper deviation and lower deviation. Tolerance is the total permissible variation calculated as the upper deviation minus the lower deviation such as plus 0.03 to minus 0.01 equaling 0.04 mm.

_Signals: params:4_

### Tip 2 — confidence 0.47

> ISO 286 defines IT grades from the finest IT01, IT0, IT1 up to the coarsest IT16

ISO 286 defines IT grades from the finest IT01, IT0, IT1 up to the coarsest IT16. Generally IT5 to IT7 are for precision machining, IT8 to IT10 for general machining and IT11 to IT13 for casting or forging processes. For a 50 mm size, an IT6 tolerance is approximately 0.016 mm, meaning a 50 mm IT6 shaft can vary only by about plus or minus 0.008 mm, which is extremely precise. ISO 286 defines both whole basis and shaft basis systems with the whole basis system being most common due to easier manufacturing when the holes EI equals zero. There are three main types of fits.

_Signals: params:4_

### Tip 3 — confidence 0.53

> First clearance fit where the shaft is always smaller than the hole allowing free movement

First clearance fit where the shaft is always smaller than the hole allowing free movement. Examples like H7/G6 H7/G6 H7/G6 and H8/F7 and H8/F7 and H8/F7 for bearings. Next, transition fit, which can sometimes be clearance and sometimes interference for controlled sometimes interference for controlled sometimes interference for controlled tightness. Ideal for gear hubs and couplings like H7/K6 couplings like H7/K6 couplings like H7/K6 and H8/JS7. and H8/JS7. and H8/JS7.

_Signals: gcode:3 · safety:4_

### Tip 4 — confidence 0.58

> Finally, interference fit where the shaft is always larger than the hole for permanent tight fits used for pressfitit be

Finally, interference fit where the shaft is always larger than the hole for permanent tight fits used for pressfitit bearings and railway wheels on axles such as H7/P6. such as H7/P6. such as H7/P6. Let's look at practical examples. For a bearing fit like H7/G6, bearing fit like H7/G6, bearing fit like H7/G6, the holes H7 tolerance starts at nominal with EI equals zero, and the G6 shaft is slightly smaller. This results in a perfect running clearance for smooth operation, commonly used in ball bearings and machine tools.

_Signals: gcode:4 · safety:2_

### Tip 5 — confidence 0.43

> For a gear hub fit, such as H7/K6, a standard H7 hole with a slightly oversized K6 shaft creates light interference, pre

For a gear hub fit, such as H7/K6, a standard H7 hole with a slightly oversized K6 shaft creates light interference, preventing slip under interference, preventing slip under interference, preventing slip under torque. A press fit like H7/P6 involves a much larger P6 shaft requiring pressing or heating for assembly seen in motor rotor shafts and railway wheels. ISO 286 ensures engineers can design assemblies with predictable performance, zero guesswork predictable performance, zero guesswork predictable performance, zero guesswork on fits and international compatibility across suppliers.

_Signals: safety:3_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-q4NOYAM-tEc-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `general`
- Source artifact: `state/shared/youtube-extraction/q4NOYAM-tEc.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].