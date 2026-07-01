---
title: "Building a Complete Custom Feature (FeatureScript)"
domain: cad
source: youtube
videoId: yi06ZVDoevs
url: https://www.youtube.com/watch?v=yi06ZVDoevs
channel: "Onshape"
duration_s: 2217
tribal_entries: 11
chunks_scanned: 43
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# Building a Complete Custom Feature (FeatureScript)

**Channel:** [Onshape](https://www.youtube.com/watch?v=yi06ZVDoevs)
**Duration:** 36m 57s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 11 of 43 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.41

> filter selector declares what keywords would cause your feature to be retained in the feature list filter the feature na

filter selector declares what keywords would cause your feature to be retained in the feature list filter the feature name template allows allows you to change the default naming convention used for new features in the feature list UI hint provides additional UI options the option no preview provided ensures that the preview slider is removed from the feature dialogue this means as the user is entering inputs the feature always shows the final result without the option to adjust the preview most UI hints are reserved for specific parameters within the precondition or for on shapes internal

_Signals: safety:1 · howto:2_

### Tip 2 — confidence 0.4

> when the value is a real number within the bounds specified set the bounds to positive real bounds a full list of differ

when the value is a real number within the bounds specified set the bounds to positive real bounds a full list of different types of bounds is in the standard Library documentation create a similar documentation create a similar documentation create a similar annotation for the end magnitude parameter groups allow you to group inputs into collapsible groups this helps simplify large dialogues with several inputs add parameter groups for start and end move the appropriate parameters inside each statement make sure the group name is set to a logical name this is what will show in the group

_Signals: howto:5_

### Tip 3 — confidence 0.41

> depth to turn a Boolean into an opposite direction toggle you must use a UI hin add a UI hint to the Boolean parameter s

depth to turn a Boolean into an opposite direction toggle you must use a UI hin add a UI hint to the Boolean parameter so the user can reverse the direction of the Dome if needed enter opposite direction as the value in the part Studio test the feature dialogue first create a cylindrical boss to test on the query selection only allows a flat face face face selection each of the group boxes are labeled correctly and show the correct options underneath the start and end magnitude parameters hide when position is is is chosen the depth is a length parameter that has an opposite direction toggle

_Signals: camOps:1 · howto:3_

### Tip 4 — confidence 0.41

> normal multiplying the depth by the Face's normal Vector offsets the center point in the outward Direction relative to t

normal multiplying the depth by the Face's normal Vector offsets the center point in the outward Direction relative to the face this accommodates face selections that could be at any angle with respect to the primary axes create a new constant named Point ID set it equal to id+ point this is not entirely necessary but is best practice since we will reference the ID in more than one place use the opo command to create a point at Point point at Point point at Point location set the point parameter to Peak location set the ID of the function to point ID instead of the default create the Loft

_Signals: howto:6_

### Tip 5 — confidence 0.41

> body as its arguments a subtraction Boolean also requires another parameter for the Target create a new constant named s

body as its arguments a subtraction Boolean also requires another parameter for the Target create a new constant named selected selected selected part set selected part equal to the result of a q owner body function Q owner body returns a query containing the bodies that any of the given entities belong to set selected face as the argument in the subtraction Boolean set the tools to Loft part create a new parameter named targets and set it to selected part if opposite direction ction has not been toggled the op Boolean should execute a execute a execute a union The Loft part and selected part

_Signals: howto:6_

### Tip 6 — confidence 0.45

> face to ensure the result only contains faces create a constant named start condition map it needs three map it needs th

face to ensure the result only contains faces create a constant named start condition map it needs three map it needs three parameters profile index is always zero for the start condition set magnitude to the start magnitude adjacent faces are the faces that connect to the profile set adjacent faces to the adjacent faces constant add the map to the D info array set D info equal to the result of an append function append takes in two arguments an existing array and the new value set D info and start condition map as the as the as the arguments now create the appropriate functions for the end

_Signals: safety:1 · howto:6_

### Tip 7 — confidence 0.43

> the catch use the report feature warning function to give a popup notification to the user notification to the user noti

the catch use the report feature warning function to give a popup notification to the user notification to the user notification to the user report feature warning takes in three arguments the context feature ID and the message you want to deliver enter a custom warning feature now when the Dome is inverted and the error is triggered a warning appears at the top use add debug entities to highlight The Loft part if the Boolean is successful nothing is highlighted if the Boolean fails the lofted part highlights in red warnings provide a pop-up notification but they do not prevent successful

_Signals: safety:4_

### Tip 8 — confidence 0.43

> parts of the script from script from script from executing the parts list shows two parts instead of one this is because

parts of the script from script from script from executing the parts list shows two parts instead of one this is because the loft is successful but not the Boolean usually when a custom feature errors you do not want it to generate anything in all comment out the warning and debug lines enter throw followed by the regen error function there are many different inputs allowed for the regen error function for this feature we will add an error string faulty parameter and entities enter the warning depth and Loft part for the three arguments the depth must be entered as an array the regen error

_Signals: safety:2_

### Tip 9 — confidence 0.4

> onto the plane if the query contains a mate connector it places the origin on the make connector new sketch on plane tak

onto the plane if the query contains a mate connector it places the origin on the make connector new sketch on plane takes in a plane parameter this means you can define an arbitrary plane in feature script that is not yet a part of the context to create the sketch it also gives you more control over the origin which is important for defining sketch entities create a constant named sketch ID for the sketch's ID because it is used in more than one place create a constant named sketch one and set it equal to the result of a new sketch on plane function we need to reference the sketch object

_Signals: howto:5_

### Tip 10 — confidence 0.41

> with each sketch action so it is necessary to assign it to a constant change the ID to sketch ID and enter mid plane for

with each sketch action so it is necessary to assign it to a constant change the ID to sketch ID and enter mid plane for the sketch plane parameter this sketch only requires a circle use the SK Circle function to create a circle SK Circle takes in two arguments for the center point and radius leave the default value for the center parameter to place it at the sketch's origin enter Notch radius for the radius parameter finish the sketch with the SK function test the feature in a part Studio the sketch is positioned perpendicular to the edge at its midpoint to create a cut you need to combine

_Signals: camOps:1 · howto:3_

### Tip 11 — confidence 0.43

> the rectangle On the Origin use two SK Arc functions for the arcs the n end points need to match with the corners of the

the rectangle On the Origin use two SK Arc functions for the arcs the n end points need to match with the corners of the rectangle for the first Arc the mint parameter is a vector with the value of negative fillet Peak for the X and 0 in for the Y change the ID of the second Arc to be unique for the second Arc the mid parameter uses the positive value of Phil it Peak there is an SK constraint function to relate entities but it is usually unnecessary for programmatically created unnecessary for programmatically created unnecessary for programmatically created profiles because they are never

_Signals: camOps:1 · safety:1 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-yi06ZVDoevs-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/yi06ZVDoevs.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].