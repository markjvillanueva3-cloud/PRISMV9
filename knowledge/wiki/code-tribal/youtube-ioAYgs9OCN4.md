---
title: "SOLIDWORKS Tutorial - SOLIDWORKS and Scan Data"
domain: cad
source: youtube
videoId: ioAYgs9OCN4
url: https://www.youtube.com/watch?v=ioAYgs9OCN4
channel: "GoEngineer"
duration_s: 1845
tribal_entries: 7
chunks_scanned: 37
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# SOLIDWORKS Tutorial - SOLIDWORKS and Scan Data

**Channel:** [GoEngineer](https://www.youtube.com/watch?v=ioAYgs9OCN4)
**Duration:** 30m 45s
**Domain:** `cad` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 7 of 37 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cad`.

### Tip 1 — confidence 0.4

> hello this is Tony Riggs go engineer recently we've been getting all kinds of questions about SolidWorks functionality q

hello this is Tony Riggs go engineer recently we've been getting all kinds of questions about SolidWorks functionality questions about SolidWorks functionality questions about SolidWorks functionality when it comes to dealing with STL files for reverse engineering so we've got a bunch of new tools in solver 2018 2019 and 2020 that we're going to take a look at so the first thing we're going to look at are some options and I'm going to come down to the import area and right now I've got enable 3d interconnect turned off but also for the STL options I've got a set to come in as a graphics body

_Signals: camOps:1 · howto:2_

### Tip 2 — confidence 0.41

> then we need to pay attention to the units as well make sure it comes in the right size when it comes to opening up the 

then we need to pay attention to the units as well make sure it comes in the right size when it comes to opening up the STL file we've got some options if I come down here and look I've got some scan to 3d mesh files and point cloud files those are gonna be for the scan of 3d add-in that we've had for a while we're actually gonna come up and use the mesh file options for STL's and open up this machined part let's see how it comes into our system so it's gonna come in as a graphics body we've got some options when dealing with STL files one of the new options is the decimate mesh body so we've

_Signals: camOps:2_

### Tip 3 — confidence 0.47

> going to be useful later on to create sketches and do some other things with and we'll create a similar surface on the o

going to be useful later on to create sketches and do some other things with and we'll create a similar surface on the other side of the part with the tangent option so I'll say okay to this and then we're going to go over and rotate to the other side and do the same thing again this a few more seconds to finish up and we should be good there we go so do a surface for mesh planar surface as well this time we'll use the tangent select facets and I'm gonna pick that area right there now 15 degrees let's just wrap round a little bit more than we probably want I'm gonna go with maybe a 2 degree

_Signals: camOps:1 · params:2 · howto:3_

### Tip 4 — confidence 0.42

> face and maybe the the front plane that we've got maybe use the evaluate tool measure that so the angle there is 0

face and maybe the the front plane that we've got maybe use the evaluate tool measure that so the angle there is 0.1 3 degrees and then if we go from the front plane over to this surface where it went 1-4 degrees so we're not quite square with the world so let's see what we can do if we can kind of ignore the front plane we can actually use some tools to create a brand new plane and we'll use that face and that face and the option that this is going to give us is this mid plane option and we'll use that plane from here on out to do any mirroring and to get started on a few things on this face

_Signals: params:2 · howto:1_

### Tip 5 — confidence 0.44

> is fairly similar to some of the tools in the skanda 3d option but these are just a regular SolidWorks but I do want to 

is fairly similar to some of the tools in the skanda 3d option but these are just a regular SolidWorks but I do want to come in and want to hide the solid-body I don't actually want to slice it and I really only need two slices and I'm gonna come in with an offset distance I've got some places here where I've got some data this not not so good but I'm really just kind of trying to generate that those lines there so I look at about 0.1 3 there's some some good data there now I do have the option to turn on the preview slices it does take a little bit longer I'm going to come in and turn off

_Signals: camOps:3_

### Tip 6 — confidence 0.4

> diameter and the location and it should be fairly easily similar to what we've done with many of the other cutouts that 

diameter and the location and it should be fairly easily similar to what we've done with many of the other cutouts that we've done already you know here in our pocket it kind of depends on the data that we've got here let's see how this works we'll come in and use the surface for mesh go back over to a planar surface and we've got the ability to either paint a selected facets here maybe we bump up the diameter size a little bit so we can paint a little bit faster so this kind of all depends on the data that we've got so let's see how this works now with this surface we can either start a

_Signals: toolpath:1_

### Tip 7 — confidence 0.41

> our mid plane and we can mirror that to the other side we've been working in shaded and moved so far shaded with edges y

our mid plane and we can mirror that to the other side we've been working in shaded and moved so far shaded with edges you know gets us a little better look at the part we've got maybe another surface there we can hide and clean up we're getting fairly close to matching up with our graphics body there's all the different facets that are there looks like we've got one small little chamfer kind of a all around the part that we could add to help match that up and we're adding some small little details to finish things up so I hope this explanation of some of the tools that we can use with our

_Signals: camOps:2_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-ioAYgs9OCN4-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cad`
- Source artifact: `state/shared/youtube-extraction/ioAYgs9OCN4.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].