---
title: "Understanding GD&T"
domain: general
source: youtube
videoId: G7wnGeR_69k
url: https://www.youtube.com/watch?v=G7wnGeR_69k
channel: "The Efficient Engineer"
duration_s: 1771
tribal_entries: 5
chunks_scanned: 41
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Understanding GD&T

**Channel:** [The Efficient Engineer](https://www.youtube.com/watch?v=G7wnGeR_69k)
**Duration:** 29m 31s
**Domain:** `general` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 5 of 41 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `general`.

### Tip 1 — confidence 0.4

> hole or a feature defined by two opposed parallel surfaces surfaces surfaces this is because in the gdnt world geometric

hole or a feature defined by two opposed parallel surfaces surfaces surfaces this is because in the gdnt world geometric tolerances can mean very different things if they're applied to surface features or to features of size geometric tolerances are assigned to Features using feature control frames these little grids contain all of the information needed to fully control a particular geometric characteristic they can be applied to Features using leader lines leader lines leader lines extension lines extension lines extension lines or for features of size they can be attached directly to

_Signals: toolpath:1_

### Tip 2 — confidence 0.5

> call out looks like this when the callout is applied to a surface it defines a tolerance zone between two parallel plane

call out looks like this when the callout is applied to a surface it defines a tolerance zone between two parallel planes that are separated by the distance shown in the feature control frame control frame control frame all manufactured parts are imperfect for a part to meet this tolerance all points on the surface must be located within the tolerance Zone the two planes defining the tolerance zone are parallel to each other but they don't have to be parallel to any other surfaces flatness tolerances are often specified on surfaces that mate with other parts and need to have even contact like

_Signals: toolpath:3_

### Tip 3 — confidence 0.4

> tolerant Zone defined by two parallel lines for inspection the probe is swept along multiple straight lines instead of b

tolerant Zone defined by two parallel lines for inspection the probe is swept along multiple straight lines instead of being swept across the entire surface is applied to a feature of size instead of a surface the tolerant zone is cylindrical and it applies to the axis of the feature you might apply a straightness tolerance to the axis of a pin for example to make sure it will engage properly with a hole the circularity tolerance is used to control how round a surface is the tolerance zone is defined by two concentric circles the radial distance between the two circles being equal to the

_Signals: toolpath:1_

### Tip 4 — confidence 0.48

> tolerances next they're used to control the angles between features between features between features parallelism contro

tolerances next they're used to control the angles between features between features between features parallelism controls how close a feature is to being parallel to a datum the tolerance zone is defined by two planes that are parallel to the specified datum specified datum specified datum [Music] perpendicularity works in the same way but the tolerance zone is at 90 degrees to the datum and angularity is a more General orientation tolerance that controls the angle between a feature and a datum when applied to features of size the orientation tolerances apply to the center plane or axis of

_Signals: toolpath:2 · params:1_

### Tip 5 — confidence 0.4

> an email from nebula with instructions on how to set up your free account account account that's less than fifteen dolla

an email from nebula with instructions on how to set up your free account account account that's less than fifteen dollars to get access to both sites for a full year it really is a great deal so to get the bundle deal head over to curiositystream.com curiositystream.com curiositystream.com efficient engineer or click the on-screen link and use the code efficient engineer efficient engineer efficient engineer every single person who signs up using this link will be directly supporting this channel helping me continue to create engineering videos create engineering videos create engineering

_Signals: howto:5_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-G7wnGeR_69k-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `general`
- Source artifact: `state/shared/youtube-extraction/G7wnGeR_69k.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].