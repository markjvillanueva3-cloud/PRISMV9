---
title: "SolidCAM iMachining Tutorial Series - Video 1"
domain: cam
source: youtube
videoId: siDRp3yZ7eM
url: https://www.youtube.com/watch?v=siDRp3yZ7eM
channel: "SolidCAMProfessor"
duration_s: 402
tribal_entries: 9
chunks_scanned: 10
extracted_at: 2026-05-27
extraction_method: youtube-free-extract+regex-notability
---

# SolidCAM iMachining Tutorial Series - Video 1

**Channel:** [SolidCAMProfessor](https://www.youtube.com/watch?v=siDRp3yZ7eM)
**Duration:** 6m 42s
**Domain:** `cam` (auto-classified from title/channel keywords)
**Tribal entries surfaced:** 9 of 10 scanned chunks (notability ≥ 0.4)

## Toolpath tribal tips

These chunks scored above the notability floor for toolpath/CAM relevance. Each is searchable via [[tribal-by-domain-inject]] when a chat slot's `domain_filter` includes `cam`.

### Tip 1 — confidence 0.51

> In this I machining tutorial series video 1, we will create a milling cam part and I machining part and I machining part

In this I machining tutorial series video 1, we will create a milling cam part and I machining part and I machining part and I machining operation. This video will cover saving and retrieving the example part file, adjusting default CAM settings and creating a new CAM part definition. Finally, we will cover the basics of creating a new I machining operation. We will create a new machine database. Select a material database. Select a simple closed pocket geometry. Define a tool. Select the levels and simulate the tool path. First, we'll need to open our example Solid Works part.

_Signals: toolpath:2 · howto:6_

### Tip 2 — confidence 0.41

> Please note that this part file does not come with the installation of Solid Cam

Please note that this part file does not come with the installation of Solid Cam. The example file will be included with this video tutorial. I place this file in a training folder that I created on my C drive. I recommend you do the same. Now, let's open up Solid Works. Go to file and select select select open. When the dialogue opens, let's look in the C drive under computer. Select the training folder from the list and then choose the SC Aerospace Part One and open it. Before we begin, let's change the default CNC controller. Go to the solid cam drop-down menu.

_Signals: howto:6_

### Tip 3 — confidence 0.43

> We need to create a new cam part using the solid cam drop- down menu

We need to create a new cam part using the solid cam drop- down menu. Solid cam new milling. Let's click okay to accept the file name and location for the solid cam part. Next, we will need to define the coordinate system, also known as the part zero for this this this job. There is already a coordinate system created using Solid Works. To use that, we will click select coordinate system, then select the already created coordinate system from the list below, and then click okay to accept. Now we click okay to accept the default Z Z Z levels.

_Signals: howto:9_

### Tip 4 — confidence 0.49

> Next we will define the stock material for this job

Next we will define the stock material for this job. We will define the stock by a 3D model since there is already a solid body created representing the stock representing the stock representing the stock material. Click on any portion of the stock body and then accept the selection. Defining the target is similar. Click define 3D model. Then we can select the target can select the target can select the target geometry. Click okay to geometry. Click okay to geometry. Click okay to accept. Now we can click the green check mark to complete the cam part definition.

_Signals: camOps:2 · howto:13_

### Tip 5 — confidence 0.42

> To make a new I machining operation

To make a new I machining operation. Click the I machining icon on the solid CAM operation the solid CAM operation the solid CAM operation ribbon. Next we will need to define the machine database. As you could see here, a SS is included with the installation of Solid Cam for other walkthrough exercises. For this exercise, let's create a new machine create a new machine create a new machine database. Under the machine list, click the new icon. A dialogue will prompt us to enter a name for the new machine database. Let's name it HA SS new.

_Signals: howto:7_

### Tip 6 — confidence 0.41

> Clicking save verifies the database has been successfully been successfully been successfully created

Clicking save verifies the database has been successfully been successfully been successfully created. There are three important values needed in the machine database. They are represented here by the yellow fields. We will need to enter the maximum RPM of the spindle, the maximum feed rate G1, and the maximum power of the the the spindle. Clicking next will bring us to selecting a material selecting a material selecting a material database. These are provided. All we need to do is select the desired material.

_Signals: gcode:1 · howto:1_

### Tip 7 — confidence 0.65

> If there is no database matching the material we are cutting, selecting a similar material will be fine

If there is no database matching the material we are cutting, selecting a similar material will be fine. Clicking finish will bring up the I machining operation I machining operation I machining operation manager. For this example, we will select a simple closed select a simple closed select a simple closed pocket. We will click define and then select one of the edges of a closed pocket. pocket. pocket. Clicking auto constant Z will close the geometry. Now we can click accept and bring back up the operation manager. Moving down the tree.

_Signals: toolpath:4 · camOps:1 · howto:7_

### Tip 8 — confidence 0.46

> Next we need to create a new create a new create a new tool

Next we need to create a new create a new create a new tool. Clicking select will bring up the tool table. Click on the add milling tool icon. This will be a flat endmill with a/2 in or 12 mm diameter and four flutes. flutes. flutes. Clicking select will close the tool table and bring back up the operation manager. Next on the tree are levels. Here we'll need to pick the top of the stock as the upper level. Then we'll also pick the pocket depth as shown here. Now we can click save and calculate.

_Signals: toolpath:1 · params:1 · howto:8_

### Tip 9 — confidence 0.6

> After the calculation, we can view the tool path using the simulation button on the bottom of the dialogue

After the calculation, we can view the tool path using the simulation button on the bottom of the dialogue. First we can play the tool path in HostCAD that shows the wireframe tool path on the 3D path on the 3D path on the 3D model. Now we can use solid verify to view the tool moving through the solid stock material. Finally, let's exit the simulation to bring back up the operation manager. And this concludes video one of the Imachining tutorial series where we've created a milling cam part and I machining operation. Thanks for watching.

_Signals: toolpath:3 · camOps:3 · howto:1_

---
## Wiring

- Tribal entries are embedded in `state/shared/tribal-embed-index.json` (id prefix `tribal-jsonl:youtube-toolpath-tribal#youtube-toolpath-siDRp3yZ7eM-c*`)
- Surfaced via `.claude/hooks/tribal-by-domain-inject.mjs` (UserPromptSubmit) on prompts matching domain `cam`
- Source artifact: `state/shared/youtube-extraction/siDRp3yZ7eM.json`

Acquired via [[reference_youtube_free_extraction_pipeline_2026_05_26]] (victor's $0 yt-dlp + auto-captions pipeline) — see also [[reference_youtube_toolpath_tribal_extraction_2026_05_26]].