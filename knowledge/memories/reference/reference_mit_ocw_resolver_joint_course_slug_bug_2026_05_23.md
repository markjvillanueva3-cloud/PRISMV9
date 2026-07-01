---
name: mit-ocw-resolver-joint-course-slug-bug-2026-05-23
description: MitOcwResourceResolverEngine v1 missed joint-course slug pattern (J-suffix courses include cross-listing slug fragment). Found via live extraction of MIT 2.830J. Fixed same session with crossListing field + 3 new tests.
aliases: reference_mit_ocw_resolver_joint_course_slug_bug_2026_05_23
type: reference
source: prism-memory
synced: 2026-06-27T20:30:46.661Z
---


# MitOcwResourceResolverEngine — joint-course slug bug + fix (2026-05-23)

## What broke

`MitOcwResourceResolverEngine.resolve()` v1 (commit `b99cd0c42f`) assumed the canonical OCW URL grammar was:
```
<courseIdSlug>-<titleSlug>-<termSlug>
```

For MIT 2.830 Spring 2008 it predicted:
```
https://ocw.mit.edu/courses/2-830-control-of-manufacturing-processes-spring-2008/
```

The real URL is:
```
https://ocw.mit.edu/courses/2-830j-control-of-manufacturing-processes-sma-6303-spring-2008/
```

Two missing pieces:
1. **`J` suffix on courseId** — present in catalog (`2.830J`) but case-preserved + lowercased correctly. WORKED IF caller passed `2.830J` instead of `2.830`.
2. **Cross-listing slug fragment** — `sma-6303` for the Singapore-MIT Alliance joint cross-listing — sits BETWEEN title and term in the URL. Completely missing from the v1 grammar. Caused 404 + WebFetch redirect-loop when caller resolved with the bare course-id.

## How surfaced

Live extraction (slot:india U-MIT-LIVE-EXTRACT, this session) — first end-to-end run of the pipeline:
1. Caller passed `{courseId: "2.830", title: "Control of Manufacturing Processes", term: "spring-2008"}`
2. Resolver predicted `https://ocw.mit.edu/courses/2-830-control-of-manufacturing-processes-spring-2008/pages/syllabus/`
3. WebFetch → "Too many redirects" (10+)
4. WebFetch on root URL → 404
5. WebSearch found the real URL: `2-830j-control-of-manufacturing-processes-sma-6303-spring-2008`
6. Bug pattern: joint courses cross-listed with SMA / Edgerton / WGS / other umbrella programs carry their cross-listing as an extra slug fragment

## Fix shipped (same session)

Added `crossListing?: string` to `ResolveInput`. When present, slugified + inserted between title and term:
```
[courseIdSlug, titleSlug, crossSlug, termSlug].filter(p => p.length > 0).join("-")
```

Behavior:
- ✅ `{courseId:"2.830J", title:"Control of Manufacturing Processes", crossListing:"sma-6303", term:"spring-2008"}` → `2-830j-control-of-manufacturing-processes-sma-6303-spring-2008` (matches real OCW URL)
- ⚠️ Warns (doesn't throw) when `crossListing` passed for a non-joint course (no J suffix) — defensive
- ✅ Backward-compatible: existing callers without `crossListing` get the v1 slug pattern unchanged

Added 3 new test cases to `MitOcwResourceResolverEngine.test.ts`:
- joint-course with crossListing produces real OCW slug
- crossListing on non-joint course warns but emits sane slug
- crossListing omitted on non-joint course produces canonical slug

Suite now 26/26 PASS (was 23/23).

## Bug class lesson

URL resolvers based on canonical-pattern assumptions miss real-world exceptions until live runs surface them. The fix is to **build the resolver against real test cases mined from the actual catalog**, not against the abstract pattern.

Lima follow-up: walk all 92 catalog courses, identify which are joint (J-suffix) + their cross-listings, populate per-course wiki frontmatter with `cross_listing: "sma-6303"` etc., re-run the resolver-driven extraction pipeline.

Catalog has these joint courses to verify (from `PRISM_COURSE_CATALOG.json`):
- 16.852j-fall-2005 (likely ESD cross-listing)
- 2.003j-fall-2007 (likely 1.053J cross-listing)
- 6.046j-spring-2015 (likely 18.410J cross-listing)
- 2.158j-spring-2003 (likely 6.661J cross-listing)
- 2.830j-spring-2008 ✅ verified (SMA 6303)
- 2.993j-spring-2005 (likely 1.041J cross-listing)
- 15.066j-summer-2003
- 15.082j-fall-2010 (likely 1.022J or 6.855J)
- 15.092j-* 15.768j-* 15.792j-* 15.783j-* 15.980j-*
- 10.675j-fall-2004
- 6.251j-fall-2009 (likely 15.081J cross-listing)
- esd.342, esd.33, esd.60 (ESD courses, may have cross-listings)
- 11.127j-spring-2015, 11.204-fall-2004 (Urban Planning + cross-listings)

Per-course cross-listing lookup is a lima follow-up — needs either a WebSearch per joint course OR a one-off scrape of the MIT-OCW joint-course index.

## Apply

- When using `MitOcwResourceResolverEngine` for joint courses (J-suffix on courseId), ALWAYS pass `crossListing` — the resolver will warn if you skip it for an ambiguous URL.
- The bug class generalizes: any URL-template resolver should be validated against a real sample of the source catalog before being declared canonical.
- A future hardening unit could auto-derive `crossListing` from a lookup table built from MIT-OCW's joint-course index (one-time scrape).

Related: [[ewma-run-to-run-controller-2026-05-23]] · [[reference_mit_2_830_ewma_formula_engine_triplet_2026_05_23]] · [[mit-2-830-control-of-manufacturing-processes]] · [[feedback_verify_actual_contract_not_proxy]]
