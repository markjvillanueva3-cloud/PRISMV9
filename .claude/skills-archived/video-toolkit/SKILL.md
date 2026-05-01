---
name: video-toolkit
description: AI video production toolkit for training videos. Combines FFmpeg (media processing), Remotion (programmatic video), ElevenLabs (TTS narration), and Playwright (screen recording). Use for CAD/CAM training content, product demos, walkthroughs, and explainer videos.
---

# Video Production Toolkit

Combined skills from digitalsamba/claude-code-video-toolkit for manufacturing training video production.

---

## FFmpeg — Media Processing

---
name: ffmpeg
description: Video and audio processing with FFmpeg.
---

# FFmpeg for Video Production

FFmpeg is the essential tool for video/audio processing. This skill covers common operations for Remotion video projects.

## Quick Reference

### GIF to MP4 (Remotion-compatible)

```bash
ffmpeg -i input.gif -movflags faststart -pix_fmt yuv420p \
  -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" output.mp4
```

**Why these flags:**
- `-movflags faststart` - Moves metadata to start for web streaming
- `-pix_fmt yuv420p` - Ensures compatibility with most players
- `scale=trunc(...)` - Forces even dimensions (required by most codecs)

### Resize Video

```bash
# To 1920x1080 (maintain aspect ratio, add black bars)
ffmpeg -i input.mp4 -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" output.mp4

# To 1920x1080 (crop to fill)
ffmpeg -i input.mp4 -vf "scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080" output.mp4

# Scale to width, auto height
ffmpeg -i input.mp4 -vf "scale=1280:-2" output.mp4
```

### Compress Video

```bash
# Good quality, smaller file (CRF 23 is default, lower = better quality)
ffmpeg -i input.mp4 -c:v libx264 -crf 23 -preset medium -c:a aac -b:a 128k output.mp4

# Aggressive compression for web preview
ffmpeg -i input.mp4 -c:v libx264 -crf 28 -preset fast -c:a aac -b:a 96k output.mp4

# Target file size (e.g., ~10MB for 60s video = ~1.3Mbps)
ffmpeg -i input.mp4 -c:v libx264 -b:v 1300k -c:a aac -b:a 128k output.mp4
```

### Extract Audio

```bash
# Extract to MP3
ffmpeg -i input.mp4 -vn -acodec libmp3lame -q:a 2 output.mp3

# Extract to AAC
ffmpeg -i input.mp4 -vn -acodec aac -b:a 192k output.m4a

# Extract to WAV (uncompressed)
ffmpeg -i input.mp4 -vn output.wav
```

### Convert Audio Formats

```bash
# M4A to MP3 (for ElevenLabs voice samples)
ffmpeg -i input.m4a -codec:a libmp3lame -qscale:a 2 output.mp3

# WAV to MP3
ffmpeg -i input.wav -codec:a libmp3lame -b:a 192k output.mp3

# Adjust volume
ffmpeg -i input.mp3 -filter:a "volume=1.5" output.mp3
```

### Trim/Cut Video

```bash
# Cut from timestamp to duration (recommended - reliable)
ffmpeg -i input.mp4 -ss 00:00:30 -t 00:00:15 -c:v libx264 -c:a aac output.mp4

# Cut from timestamp to timestamp
ffmpeg -i input.mp4 -ss 00:00:30 -to 00:00:45 -c:v libx264 -c:a aac output.mp4

# Stream copy (faster but may lose frames at cut points)
# Only use when source has frequent keyframes
ffmpeg -i input.mp4 -ss 00:00:30 -t 00:00:15 -c copy output.mp4
```

**Note:** Re-encoding is recommended for trimming. Stream copy (`-c copy`) can silently drop video if the seek point doesn't align with a keyframe.

### Speed Up / Slow Down

```bash
# 2x speed (video and audio)
ffmpeg -i input.mp4 -filter_complex "[0:v]setpts=0.5*PTS[v];[0:a]atempo=2.0[a]" -map "[v]" -map "[a]" output.mp4

# 0.5x speed (slow motion)
ffmpeg -i input.mp4 -filter_complex "[0:v]setpts=2.0*PTS[v];[0:a]atempo=0.5[a]" -map "[v]" -map "[a]" output.mp4

# Video only (no audio)
ffmpeg -i input.mp4 -filter:v "setpts=0.5*PTS" -an output.mp4
```

### Concatenate Videos

```bash
# Create file list
echo "file 'clip1.mp4'" > list.txt
echo "file 'clip2.mp4'" >> list.txt
echo "file 'clip3.mp4'" >> list.txt

# Concatenate (same codec/resolution)
ffmpeg -f concat -safe 0 -i list.txt -c copy output.mp4

# Concatenate with re-encoding (different sources)
ffmpeg -f concat -safe 0 -i list.txt -c:v libx264 -c:a aac output.mp4
```

### Add Fade In/Out

```bash
# Fade in first 1 second, fade out last 1 second (30fps video)
ffmpeg -i input.mp4 -vf "fade=t=in:st=0:d=1,fade=t=out:st=9:d=1" -c:a copy output.mp4

# Audio fade
ffmpeg -i input.mp4 -af "afade=t=in:st=0:d=1,afade=t=out:st=9:d=1" -c:v copy output.mp4
```

### Get Video Info

```bash
# Duration, resolution, codec info
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 input.mp4

# Full info
ffprobe -v quiet -print_format json -show_format -show_streams input.mp4
```

## Remotion-Specific Patterns

### Video Speed Adjustment for Remotion

**When to use FFmpeg vs Remotion `playbackRate`:**

| Scenario | Use FFmpeg | Use Remotion |
|----------|------------|--------------|
| Constant speed (1.5x, 2x) | Either works | ✅ Simpler |
| Extreme speeds (>4x or <0.25x) | ✅ More reliable | May have issues |
| Variable speed (accelerate over time) | ✅ Pre-process | Complex workaround needed |
| Need perfect audio sync | ✅ Guaranteed | Usually fine |
| Demo needs to fit voiceover timing | ✅ Pre-calculate | Runtime adjustment |

**Remotion limitation:** `playbackRate` must be constant. Dynamic interpolation like `playbackRate={interpolate(frame, [0, 100], [1, 5])}` won't work correctly because Remotion evaluates frames independently.

```bash
# Speed up demo to fit a scene (e.g., 60s demo into 20s = 3x speed)
ffmpeg -i demo-raw.mp4 \
  -filter_complex "[0:v]setpts=0.333*PTS[v];[0:a]atempo=3.0[a]" \
  -map "[v]" -map "[a]" \
  public/demos/demo-fast.mp4

# Slow motion for emphasis (0.5x speed)
ffmpeg -i action.mp4 \
  -filter_complex "[0:v]setpts=2.0*PTS[v];[0:a]atempo=0.5[a]" \
  -map "[v]" -map "[a]" \
  public/demos/action-slow.mp4

# Speed up without audio (common for screen recordings)
ffmpeg -i demo.mp4 -filter:v "setpts=0.5*PTS" -an public/demos/demo-2x.mp4

# Timelapse effect (10x speed, drop audio)
ffmpeg -i long-demo.mp4 -filter:v "setpts=0.1*PTS" -an public/demos/timelapse.mp4
```

**Calculate speed factor:**
- To fit X seconds of video into Y seconds of scene: `speed = X / Y`
- setpts multiplier = `1 / speed` (e.g., 3x speed = setpts=0.333*PTS)
- atempo value = `speed` (e.g., 3x speed = atempo=3.0)

**Extreme speed (>2x audio):** Chain atempo filters (each limited to 0.5-2.0 range):
```bash
# 4x speed audio
-filter_complex "[0:a]atempo=2.0,atempo=2.0[a]"

# 8x speed audio
-filter_complex "[0:a]atempo=2.0,atempo=2.0,atempo=2.0[a]"
```

### Prepare Demo Recording for Remotion

```bash
# Standard 1080p, 30fps, Remotion-ready
ffmpeg -i raw-recording.mp4 \
  -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30" \
  -c:v libx264 -crf 18 -preset slow \
  -c:a aac -b:a 192k \
  -movflags faststart \
  public/demos/demo.mp4
```

### Screen Recording to Remotion Asset

```bash
# From iPhone/iPad recording (usually 60fps, variable resolution)
ffmpeg -i iphone-recording.mov \
  -vf "scale=1920:-2,fps=30" \
  -c:v libx264 -crf 20 \
  -an \
  public/demos/mobile-demo.mp4
```

### Batch Convert GIFs

```bash
for f in assets/*.gif; do
  ffmpeg -i "$f" -movflags faststart -pix_fmt yuv420p \
    -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
    "public/demos/$(basename "$f" .gif).mp4"
done
```

## Common Issues

### "Height not divisible by 2"
Add scale filter: `-vf "scale=trunc(iw/2)*2:trunc(ih/2)*2"`

### Video won't play in browser
Use: `-movflags faststart -pix_fmt yuv420p -c:v libx264`

### Audio out of sync after speed change
Use filter_complex with atempo: `-filter_complex "[0:v]setpts=0.5*PTS[v];[0:a]atempo=2.0[a]"`

### File too large
Increase CRF (23→28) or reduce resolution

## Quality Guidelines

| Use Case | CRF | Preset | Notes |
|----------|-----|--------|-------|
| Archive/Master | 18 | slow | Best quality, large files |
| Production | 20-22 | medium | Good balance |
| Web/Preview | 23-25 | fast | Smaller files |
| Draft/Quick | 28+ | veryfast | Fast encoding |

## Platform-Specific Output Optimization

After Remotion renders your video (typically to `out/video.mp4`), use FFmpeg to optimize for each distribution platform.

### Workflow Integration

```
Remotion render (master)     FFmpeg optimization      Platform upload
       ↓                            ↓                       ↓
   out/video.mp4  ────────→  out/video-youtube.mp4  ───→  YouTube
                  ────────→  out/video-twitter.mp4  ───→  Twitter/X
                  ────────→  out/video-linkedin.mp4 ───→  LinkedIn
                  ────────→  out/video-web.mp4      ───→  Website embed
```

### YouTube (Recommended Settings)

YouTube re-encodes everything, so upload high quality:

```bash
# YouTube optimized (1080p)
ffmpeg -i out/video.mp4 \
  -c:v libx264 -preset slow -crf 18 \
  -profile:v high -level 4.0 \
  -bf 2 -g 30 \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart \
  out/video-youtube.mp4

# YouTube Shorts (vertical 1080x1920)
ffmpeg -i out/video.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2" \
  -c:v libx264 -crf 18 -c:a aac -b:a 192k \
  out/video-shorts.mp4
```

### Twitter/X

Twitter has strict limits: max 140s, 512MB, 1920x1200:

```bash
# Twitter optimized (under 15MB target for fast upload)
ffmpeg -i out/video.mp4 \
  -c:v libx264 -preset medium -crf 24 \
  -profile:v main -level 3.1 \
  -vf "scale='min(1280,iw)':'min(720,ih)':force_original_aspect_ratio=decrease" \
  -c:a aac -b:a 128k -ar 44100 \
  -movflags +faststart \
  -fs 15M \
  out/video-twitter.mp4

# Check file size and duration
ffprobe -v error -show_entries format=duration,size -of csv=p=0 out/video-twitter.mp4
```

### LinkedIn

LinkedIn prefers MP4 with AAC audio, max 10 minutes:

```bash
# LinkedIn optimized
ffmpeg -i out/video.mp4 \
  -c:v libx264 -preset medium -crf 22 \
  -profile:v main \
  -vf "scale='min(1920,iw)':'min(1080,ih)':force_original_aspect_ratio=decrease" \
  -c:a aac -b:a 192k -ar 48000 \
  -movflags +faststart \
  out/video-linkedin.mp4
```

### Website/Embed (Optimized for Fast Loading)

```bash
# Web-optimized MP4 (small file, progressive loading)
ffmpeg -i out/video.mp4 \
  -c:v libx264 -preset medium -crf 26 \
  -profile:v baseline -level 3.0 \
  -vf "scale=1280:720" \
  -c:a aac -b:a 128k \
  -movflags +faststart \
  out/video-web.mp4

# WebM alternative (better compression, wider browser support)
ffmpeg -i out/video.mp4 \
  -c:v libvpx-vp9 -crf 30 -b:v 0 \
  -vf "scale=1280:720" \
  -c:a libopus -b:a 128k \
  -deadline good \
  out/video-web.webm
```

### GIF (for Previews/Thumbnails)

```bash
# High-quality GIF (first 5 seconds)
ffmpeg -i out/video.mp4 -t 5 \
  -vf "fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  out/preview.gif

# Smaller file GIF
ffmpeg -i out/video.mp4 -t 3 \
  -vf "fps=10,scale=320:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" \
  out/preview-small.gif
```

### Platform Requirements Quick Reference

| Platform | Max Resolution | Max Size | Max Duration | Audio |
|----------|---------------|----------|--------------|-------|
| YouTube | 8K | 256GB | 12 hours | AAC 48kHz |
| Twitter/X | 1920x1200 | 512MB | 140s | AAC 44.1kHz |
| LinkedIn | 4096x2304 | 5GB | 10 min | AAC 48kHz |
| Instagram Feed | 1080x1350 | 4GB | 60s | AAC 48kHz |
| Instagram Reels | 1080x1920 | 4GB | 90s | AAC 48kHz |
| TikTok | 1080x1920 | 287MB | 10 min | AAC |

### Batch Export for All Platforms

```bash
#!/bin/bash
# save as: export-all-platforms.sh
INPUT="out/video.mp4"

# YouTube (high quality)
ffmpeg -i "$INPUT" -c:v libx264 -preset slow -crf 18 \
  -c:a aac -b:a 192k -movflags +faststart \
  out/video-youtube.mp4

# Twitter (compressed)
ffmpeg -i "$INPUT" -c:v libx264 -crf 24 \
  -vf "scale='min(1280,iw)':'-2'" \
  -c:a aac -b:a 128k -movflags +faststart \
  out/video-twitter.mp4

# LinkedIn
ffmpeg -i "$INPUT" -c:v libx264 -crf 22 \
  -c:a aac -b:a 192k -movflags +faststart \
  out/video-linkedin.mp4

# Web embed (small)
ffmpeg -i "$INPUT" -c:v libx264 -crf 26 \
  -vf "scale=1280:720" \
  -c:a aac -b:a 128k -movflags +faststart \
  out/video-web.mp4

echo "Exported:"
ls -lh out/video-*.mp4
```

## Error Handling

Common errors and fixes when processing video:

```bash
# Check if FFmpeg succeeded
ffmpeg -i input.mp4 -c:v libx264 output.mp4 && echo "Success" || echo "Failed: check input file"

# Validate output file is playable
ffprobe -v error -select_streams v:0 -show_entries stream=codec_name -of csv=p=0 output.mp4

# Get detailed error info
ffmpeg -v error -i input.mp4 -f null - 2>&1 | head -20
```

### Handling Common Failures

| Error | Cause | Fix |
|-------|-------|-----|
| "No such file" | Input path wrong | Check path, use quotes for spaces |
| "Invalid data" | Corrupted input | Re-download or re-record source |
| "height not divisible by 2" | Odd dimensions | Add scale filter with trunc |
| "encoder not found" | Missing codec | Install FFmpeg with full codecs |
| Output 0 bytes | Silent failure | Check full ffmpeg output for errors |

---

## Feedback & Contributions

If this skill is missing information or could be improved:

- **Missing a command?** Describe what you needed
- **Found an error?** Let me know what's wrong
- **Want to contribute?** I can help you:
  1. Update this skill with improvements
  2. Create a PR to github.com/digitalsamba/claude-code-video-toolkit

Just say "improve this skill" and I'll guide you through updating `.claude/skills/ffmpeg/SKILL.md`.
---
name: remotion
description: Toolkit-specific Remotion patterns — custom transitions, shared components, and project conventions. For core Remotion framework knowledge (hooks, animations, rendering, etc.), see the `remotion-official` skill.
---

# Remotion — Toolkit Extensions

> **Core Remotion knowledge** lives in `.claude/skills/remotion-official/` (synced from the official [remotion-dev/skills](https://github.com/remotion-dev/skills) repo). This file covers **toolkit-specific** patterns only.

## Shared Components

Reusable video components in `lib/components/`. Import in templates via:

```tsx
import { AnimatedBackground, SlideTransition, Label } from '../../../../lib/components';
```

| Component | Purpose |
|-----------|---------|
| `AnimatedBackground` | Floating shapes background (variants: subtle, tech, warm, dark) |
| `SlideTransition` | Scene transitions (fade, zoom, slide-up, blur-fade) |
| `Label` | Floating label badge with optional JIRA reference |
| `Vignette` | Cinematic edge darkening overlay |
| `LogoWatermark` | Corner logo branding |
| `SplitScreen` | Side-by-side video comparison |
| `NarratorPiP` | Picture-in-picture presenter overlay |
| `Envelope` | 3D envelope with opening flap animation |
| `PointingHand` | Animated hand emoji with slide-in and pulse |
| `MazeDecoration` | Animated isometric grid decoration for corners |

## Custom Transitions

The toolkit includes a transitions library at `lib/transitions/` for scene-to-scene effects beyond the official `@remotion/transitions` package.

### Using TransitionSeries

```tsx
import { TransitionSeries, linearTiming } from '@remotion/transitions';
// Import custom transitions from lib (adjust path based on your project location)
import { glitch, lightLeak, clockWipe, checkerboard } from '../../../../lib/transitions';
// Or import from @remotion/transitions for official ones
import { slide, fade } from '@remotion/transitions/slide';

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={90}>
    <TitleSlide />
  </TransitionSeries.Sequence>
  <TransitionSeries.Transition
    presentation={glitch({ intensity: 0.8 })}
    timing={linearTiming({ durationInFrames: 30 })}
  />
  <TransitionSeries.Sequence durationInFrames={120}>
    <ContentSlide />
  </TransitionSeries.Sequence>
</TransitionSeries>
```

### Available Custom Transitions

| Transition | Options | Best For |
|------------|---------|----------|
| `glitch()` | `intensity`, `slices`, `rgbShift` | Tech demos, edgy reveals, cyberpunk |
| `rgbSplit()` | `direction`, `displacement` | Modern tech, energetic transitions |
| `zoomBlur()` | `direction`, `blurAmount` | CTAs, high-energy moments, impact |
| `lightLeak()` | `temperature`, `direction` | Celebrations, film aesthetic, warm moments |
| `clockWipe()` | `startAngle`, `direction`, `segments` | Time-related content, playful reveals |
| `pixelate()` | `maxBlockSize`, `gridSize`, `scanlines`, `glitchArtifacts`, `randomness` | Retro/gaming, digital transformations |
| `checkerboard()` | `gridSize`, `pattern`, `stagger`, `squareAnimation` | Playful reveals, structured transitions |

**Checkerboard patterns:** `sequential`, `random`, `diagonal`, `alternating`, `spiral`, `rows`, `columns`, `center-out`, `corners-in`

### Transition Examples

```tsx
// Tech/cyberpunk feel
glitch({ intensity: 0.8, slices: 8, rgbShift: true })

// Warm celebration
lightLeak({ temperature: 'warm', direction: 'right' })

// High energy zoom
zoomBlur({ direction: 'in', blurAmount: 20 })

// Chromatic aberration
rgbSplit({ direction: 'diagonal', displacement: 30 })

// Clock sweep reveal
clockWipe({ direction: 'clockwise', startAngle: 0 })

// Retro pixelation
pixelate({ maxBlockSize: 50, glitchArtifacts: true })

// Checkerboard patterns
checkerboard({ pattern: 'diagonal', gridSize: 8 })
checkerboard({ pattern: 'spiral', gridSize: 10 })
checkerboard({ pattern: 'center-out', squareAnimation: 'scale' })
```

### Transition Duration Guidelines

| Type | Frames | Notes |
|------|--------|-------|
| Quick cut | 15-20 | Fast, punchy |
| Standard | 30-45 | Most common |
| Dramatic | 50-60 | Slow reveals |
| Glitch effects | 20-30 | Should feel sudden |
| Light leak | 45-60 | Needs time to sweep |

### Preview Transitions

Run the showcase gallery to see all transitions:

```bash
cd showcase/transitions && npm run studio
```

## Toolkit Best Practices

1. **Frame-based animations only** — Avoid CSS transitions/animations; they cause flickering during render
2. **Use fps from useVideoConfig()** — Make animations frame-rate independent
3. **Clamp interpolations** — Use `extrapolateRight: 'clamp'` to prevent runaway values
4. **Use OffthreadVideo** — Better performance than `<Video>` for complex compositions
5. **delayRender for async** — Always block rendering until data is ready
6. **staticFile for assets** — Reference files from `public/` folder correctly
7. **All projects use 30fps** — Timing: frames = seconds × 30
8. **playbackRate must be constant** — For variable/extreme speeds, pre-process with FFmpeg

## Project Timing Conventions

| Scene Type | Duration | Notes |
|------------|----------|-------|
| Title | 3-5s (90-150f) | Logo + headline |
| Overview | 10-20s | 3-5 bullet points |
| Demo | 10-30s | Adjust playbackRate to fit |
| Stats | 8-12s | 3-4 stat cards |
| Credits | 5-10s | Quick fade |

**Pacing:** ~150 words/minute for voiceover. Voiceover drives timing.

## Advanced API

For detailed API documentation on all hooks, components, renderer, Lambda, and Player APIs, see [reference.md](reference.md).

## License Note

Remotion has a special license. Companies may need to obtain a license for commercial use. Check https://remotion.dev/license

---

## Feedback & Contributions

If this skill is missing information or could be improved:

- **Missing a pattern?** Describe what you needed
- **Found an error?** Let me know what's wrong
- **Want to contribute?** I can help you:
  1. Update this skill with improvements
  2. Create a PR to github.com/digitalsamba/claude-code-video-toolkit

Just say "improve this skill" and I'll guide you through updating `.claude/skills/remotion/SKILL.md`.
---
name: elevenlabs
description: Generate AI voiceovers, sound effects, and music using ElevenLabs APIs. Use when creating audio content for videos, podcasts, or games. Triggers include generating voiceovers, narration, dialogue, sound effects from descriptions, background music, soundtrack generation, voice cloning, or any audio synthesis task.
---

# ElevenLabs Audio Generation

Requires `ELEVENLABS_API_KEY` in `.env`.

## Text-to-Speech

```python
from elevenlabs.client import ElevenLabs
from elevenlabs import save, VoiceSettings
import os

client = ElevenLabs(api_key=os.getenv("ELEVENLABS_API_KEY"))

audio = client.text_to_speech.convert(
    text="Welcome to my video!",
    voice_id="JBFqnCBsd6RMkjVDRZzb",
    model_id="eleven_multilingual_v2",
    voice_settings=VoiceSettings(
        stability=0.5,
        similarity_boost=0.75,
        style=0.5,
        speed=1.0
    )
)
save(audio, "voiceover.mp3")
```

### Models

| Model | Quality | SSML Support | Notes |
|-------|---------|--------------|-------|
| `eleven_multilingual_v2` | Highest consistency | None | Stable, production-ready, 29 languages |
| `eleven_flash_v2_5` | Good | `<break>`, `<phoneme>` | Fast, supports pause/pronunciation tags |
| `eleven_turbo_v2_5` | Good | `<break>`, `<phoneme>` | Fastest latency |
| `eleven_v3` | Most expressive | None | Alpha — unreliable, needs prompt engineering |

**Choose:** multilingual_v2 for reliability, flash/turbo for SSML control, v3 for maximum expressiveness (expect retakes).

### Voice Settings by Style

| Style | stability | similarity | style | speed |
|-------|-----------|------------|-------|-------|
| Natural/professional | 0.75-0.85 | 0.9 | 0.0-0.1 | 1.0 |
| Conversational | 0.5-0.6 | 0.85 | 0.3-0.4 | 0.9-1.0 |
| Energetic/YouTuber | 0.3-0.5 | 0.75 | 0.5-0.7 | 1.0-1.1 |

### Pauses Between Sections

**With flash/turbo models:** Use SSML break tags inline:
```
...end of section. <break time="1.5s" /> Start of next...
```
Max 3 seconds per break. Excessive breaks can cause speed artifacts.

**With multilingual_v2 / v3:** No SSML support. Options:
- Paragraph breaks (blank lines) — creates ~0.3-0.5s natural pause
- Post-process with ffmpeg: split audio and insert silence

**WARNING:** `...` (ellipsis) is NOT a reliable pause — it can be vocalized as a word/sound. Do not use ellipsis as a pause mechanism.

### Pronunciation Control

**Phonetic spelling (any model):** Write words as you want them pronounced:
- `Janus` → `Jan-us`
- `nginx` → `engine-x`
- Use dashes, capitals, apostrophes to guide pronunciation

**SSML phoneme tags (flash/turbo only):**
```
<phoneme alphabet="ipa" ph="ˈdʒeɪnəs">Janus</phoneme>
```

### Iterative Workflow

1. Generate → listen → identify pronunciation/pacing issues
2. Adjust: phonetic spellings, break tags, voice settings
3. Regenerate. If pauses aren't precise enough, add silence in post with ffmpeg rather than fighting the TTS engine.

## Voice Cloning

### Instant Voice Clone

```python
with open("sample.mp3", "rb") as f:
    voice = client.voices.ivc.create(
        name="My Voice",
        files=[f],
        remove_background_noise=True
    )
print(f"Voice ID: {voice.voice_id}")
```

- Use `client.voices.ivc.create()` (not `client.voices.clone()`)
- Pass file handles in binary mode (`"rb"`), not paths
- Convert m4a first: `ffmpeg -i input.m4a -codec:a libmp3lame -qscale:a 2 output.mp3`
- Multiple samples (2-3 clips) improve accuracy
- Save voice ID for reuse

**Professional Voice Clone:** Requires Creator plan+, 30+ min audio. See [reference.md](reference.md).

## Sound Effects

Max 22 seconds per generation.

```python
result = client.text_to_sound_effects.convert(
    text="Thunder rumbling followed by heavy rain",
    duration_seconds=10,
    prompt_influence=0.3
)
with open("thunder.mp3", "wb") as f:
    for chunk in result:
        f.write(chunk)
```

**Prompt tips:** Be specific — "Heavy footsteps on wooden floorboards, slow and deliberate, with creaking"

## Music Generation

10 seconds to 5 minutes. Use `client.music.compose()` (not `.generate()`).

```python
result = client.music.compose(
    prompt="Upbeat indie rock, catchy guitar riff, energetic drums, travel vlog",
    music_length_ms=60000,
    force_instrumental=True
)
with open("music.mp3", "wb") as f:
    for chunk in result:
        f.write(chunk)
```

**Prompt structure:** Genre, mood, instruments, tempo, use case. Add "no vocals" or use `force_instrumental=True` for background music.

## Remotion Integration

### Complete Workflow: Script to Synchronized Scene

```
VOICEOVER-SCRIPT.md → voiceover.py → public/audio/ → Remotion composition
        ↓                  ↓               ↓                 ↓
  Scene narration    Generate MP3    Audio files     <Audio> component
  with durations     per scene       with timing     synced to scenes
```

### Step 1: Generate Per-Scene Audio

Use the toolkit's voiceover tool to generate audio for each scene:

```bash
# Generate voiceover files for each scene
python tools/voiceover.py --scene-dir public/audio/scenes --json

# Output:
# public/audio/scenes/
#   ├── scene-01-title.mp3
#   ├── scene-02-problem.mp3
#   ├── scene-03-solution.mp3
#   └── manifest.json  (durations for each file)
```

The `manifest.json` contains timing info:
```json
{
  "scenes": [
    { "file": "scene-01-title.mp3", "duration": 4.2 },
    { "file": "scene-02-problem.mp3", "duration": 12.8 },
    { "file": "scene-03-solution.mp3", "duration": 15.3 }
  ],
  "totalDuration": 32.3
}
```

### Step 2: Use Audio in Remotion Composition

```tsx
// src/Composition.tsx
import { Audio, staticFile, Series, useVideoConfig } from 'remotion';

// Import scene components
import { TitleSlide } from './scenes/TitleSlide';
import { ProblemSlide } from './scenes/ProblemSlide';
import { SolutionSlide } from './scenes/SolutionSlide';

// Scene durations (from manifest.json, converted to frames at 30fps)
const SCENE_DURATIONS = {
  title: Math.ceil(4.2 * 30),      // 126 frames
  problem: Math.ceil(12.8 * 30),   // 384 frames
  solution: Math.ceil(15.3 * 30),  // 459 frames
};

export const MainComposition: React.FC = () => {
  return (
    <>
      {/* Scene sequence */}
      <Series>
        <Series.Sequence durationInFrames={SCENE_DURATIONS.title}>
          <TitleSlide />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE_DURATIONS.problem}>
          <ProblemSlide />
        </Series.Sequence>
        <Series.Sequence durationInFrames={SCENE_DURATIONS.solution}>
          <SolutionSlide />
        </Series.Sequence>
      </Series>

      {/* Audio track - plays continuously across all scenes */}
      <Audio src={staticFile('audio/voiceover.mp3')} volume={1} />

      {/* Optional: Background music at lower volume */}
      <Audio src={staticFile('audio/music.mp3')} volume={0.15} />
    </>
  );
};
```

### Step 3: Per-Scene Audio (Alternative)

For more control, add audio to each scene individually:

```tsx
// src/scenes/ProblemSlide.tsx
import { Audio, staticFile, useCurrentFrame } from 'remotion';

export const ProblemSlide: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <div style={{ /* slide styles */ }}>
      <h1>The Problem</h1>
      {/* Scene content */}

      {/* Audio starts when this scene starts (frame 0 of this sequence) */}
      <Audio src={staticFile('audio/scenes/scene-02-problem.mp3')} />
    </div>
  );
};
```

### Syncing Visuals to Voiceover

Calculate scene duration from audio, not the other way around:

```tsx
// src/config/timing.ts
import manifest from '../../public/audio/scenes/manifest.json';

const FPS = 30;

// Convert audio durations to frame counts
export const sceneDurations = manifest.scenes.reduce((acc, scene) => {
  const name = scene.file.replace(/^scene-\d+-/, '').replace('.mp3', '');
  acc[name] = Math.ceil(scene.duration * FPS);
  return acc;
}, {} as Record<string, number>);

// Usage in composition:
// <Series.Sequence durationInFrames={sceneDurations.title}>
```

### Audio Timing Patterns

```tsx
import { Audio, Sequence, interpolate, useCurrentFrame } from 'remotion';

// Fade in audio
export const FadeInAudio: React.FC<{ src: string; fadeFrames?: number }> = ({
  src,
  fadeFrames = 30
}) => {
  const frame = useCurrentFrame();
  const volume = interpolate(frame, [0, fadeFrames], [0, 1], {
    extrapolateRight: 'clamp',
  });
  return <Audio src={src} volume={volume} />;
};

// Delayed audio start
export const DelayedAudio: React.FC<{ src: string; delayFrames: number }> = ({
  src,
  delayFrames
}) => (
  <Sequence from={delayFrames}>
    <Audio src={src} />
  </Sequence>
);

// Usage:
// <FadeInAudio src={staticFile('audio/music.mp3')} fadeFrames={60} />
// <DelayedAudio src={staticFile('audio/sfx/whoosh.mp3')} delayFrames={45} />
```

### Voiceover + Demo Video Sync

When a scene has both voiceover and demo video:

```tsx
import { Audio, OffthreadVideo, staticFile, useVideoConfig } from 'remotion';

export const DemoScene: React.FC = () => {
  const { durationInFrames, fps } = useVideoConfig();

  // Calculate playback rate to fit demo into voiceover duration
  const demoDuration = 45; // seconds (original demo length)
  const sceneDuration = durationInFrames / fps; // seconds (from voiceover)
  const playbackRate = demoDuration / sceneDuration;

  return (
    <>
      <OffthreadVideo
        src={staticFile('demos/feature-demo.mp4')}
        playbackRate={playbackRate}
      />
      <Audio src={staticFile('audio/scenes/scene-04-demo.mp3')} />
    </>
  );
};
```

### Error Handling

```tsx
import { Audio, staticFile, delayRender, continueRender } from 'remotion';
import { useEffect, useState } from 'react';

export const SafeAudio: React.FC<{ src: string }> = ({ src }) => {
  const [handle] = useState(() => delayRender());
  const [audioReady, setAudioReady] = useState(false);

  useEffect(() => {
    const audio = new window.Audio(src);
    audio.oncanplaythrough = () => {
      setAudioReady(true);
      continueRender(handle);
    };
    audio.onerror = () => {
      console.error(`Failed to load audio: ${src}`);
      continueRender(handle); // Continue without audio rather than hang
    };
  }, [src, handle]);

  if (!audioReady) return null;
  return <Audio src={src} />;
};
```

### Toolkit Command: /generate-voiceover

The `/generate-voiceover` command handles the full workflow:

```
/generate-voiceover

1. Reads VOICEOVER-SCRIPT.md
2. Extracts narration for each scene
3. Generates audio via ElevenLabs API
4. Saves to public/audio/scenes/
5. Creates manifest.json with durations
6. Updates project.json with timing info
```

## Popular Voices

- George: `JBFqnCBsd6RMkjVDRZzb` (warm narrator)
- Rachel: `21m00Tcm4TlvDq8ikWAM` (clear female)
- Adam: `pNInz6obpgDQGcFmaJgB` (professional male)

List all: `client.voices.get_all()`

For full API docs, see [reference.md](reference.md).
---
name: playwright-recording
description: Record browser interactions as video using Playwright. Use for capturing demo videos, app walkthroughs, and UI flows for Remotion videos. Triggers include recording a demo, capturing browser video, screen recording a website, or creating walkthrough footage.
---

# Playwright Video Recording

Playwright can record browser interactions as video - perfect for demo footage in Remotion compositions.

## Quick Start

### Installation

```bash
# In your video project
npm init -y
npm install -D playwright @playwright/test
npx playwright install chromium
```

### Basic Recording Script

```typescript
// scripts/record-demo.ts
import { chromium } from 'playwright';

async function recordDemo() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: './recordings',
      size: { width: 1920, height: 1080 }
    }
  });

  const page = await context.newPage();

  // Your recording actions
  await page.goto('https://example.com');
  await page.waitForTimeout(2000);
  await page.click('button.demo');
  await page.waitForTimeout(3000);

  // Close to save video
  await context.close();
  await browser.close();

  console.log('Recording saved to ./recordings/');
}

recordDemo();
```

Run with:
```bash
npx ts-node scripts/record-demo.ts
# or
npx tsx scripts/record-demo.ts
```

## Recording Configuration

### Viewport Sizes

```typescript
// Standard 1080p (recommended for Remotion)
viewport: { width: 1920, height: 1080 }

// 720p (smaller files)
viewport: { width: 1280, height: 720 }

// Square (social media)
viewport: { width: 1080, height: 1080 }

// Mobile
viewport: { width: 390, height: 844 } // iPhone 14
```

### Video Quality Settings

```typescript
const context = await browser.newContext({
  viewport: { width: 1920, height: 1080 },
  recordVideo: {
    dir: './recordings',
    size: { width: 1920, height: 1080 } // Match viewport for crisp output
  },
  // Slow down for visibility
  // Note: slowMo is on browser launch, not context
});

// For slow motion, launch browser with slowMo
const browser = await chromium.launch({
  slowMo: 100 // 100ms delay between actions
});
```

## Recording Patterns

### Form Submission Demo

```typescript
import { chromium } from 'playwright';

async function recordFormDemo() {
  const browser = await chromium.launch({ slowMo: 50 });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: './recordings', size: { width: 1920, height: 1080 } }
  });
  const page = await context.newPage();

  await page.goto('https://myapp.com/form');
  await page.waitForTimeout(1000);

  // Type with realistic speed
  await page.fill('#name', 'John Smith', { timeout: 5000 });
  await page.waitForTimeout(500);

  await page.fill('#email', 'john@example.com');
  await page.waitForTimeout(500);

  // Click submit
  await page.click('button[type="submit"]');

  // Wait for result
  await page.waitForSelector('.success-message');
  await page.waitForTimeout(2000);

  await context.close();
  await browser.close();
}
```

### Multi-Page Navigation

```typescript
async function recordNavDemo() {
  const browser = await chromium.launch({ slowMo: 100 });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: './recordings', size: { width: 1920, height: 1080 } }
  });
  const page = await context.newPage();

  // Page 1
  await page.goto('https://myapp.com');
  await page.waitForTimeout(2000);

  // Navigate to page 2
  await page.click('nav a[href="/features"]');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  // Navigate to page 3
  await page.click('nav a[href="/pricing"]');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await context.close();
  await browser.close();
}
```

### Scroll Demo

```typescript
async function recordScrollDemo() {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: './recordings', size: { width: 1920, height: 1080 } }
  });
  const page = await context.newPage();

  await page.goto('https://myapp.com/long-page');
  await page.waitForTimeout(1000);

  // Smooth scroll
  await page.evaluate(async () => {
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < 10; i++) {
      window.scrollBy({ top: 200, behavior: 'smooth' });
      await delay(300);
    }
  });

  await page.waitForTimeout(1000);
  await context.close();
  await browser.close();
}
```

### Login Flow

```typescript
async function recordLoginDemo() {
  const browser = await chromium.launch({ slowMo: 75 });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: './recordings', size: { width: 1920, height: 1080 } }
  });
  const page = await context.newPage();

  await page.goto('https://myapp.com/login');
  await page.waitForTimeout(1000);

  await page.fill('#email', 'demo@example.com');
  await page.waitForTimeout(300);

  await page.fill('#password', '••••••••');
  await page.waitForTimeout(500);

  await page.click('button[type="submit"]');

  // Wait for dashboard
  await page.waitForURL('**/dashboard');
  await page.waitForTimeout(3000);

  await context.close();
  await browser.close();
}
```

## Cursor Highlighting

Playwright doesn't show cursor by default. Add visual indicators:

### CSS Cursor Highlight

```typescript
// Inject cursor visualization
await page.addStyleTag({
  content: `
    * { cursor: none !important; }
    .playwright-cursor {
      position: fixed;
      width: 24px;
      height: 24px;
      background: rgba(255, 100, 100, 0.5);
      border: 2px solid rgba(255, 50, 50, 0.8);
      border-radius: 50%;
      pointer-events: none;
      z-index: 999999;
      transform: translate(-50%, -50%);
      transition: transform 0.1s ease;
    }
    .playwright-cursor.clicking {
      transform: translate(-50%, -50%) scale(0.8);
      background: rgba(255, 50, 50, 0.8);
    }
  `
});

// Add cursor element
await page.evaluate(() => {
  const cursor = document.createElement('div');
  cursor.className = 'playwright-cursor';
  document.body.appendChild(cursor);

  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });

  document.addEventListener('mousedown', () => cursor.classList.add('clicking'));
  document.addEventListener('mouseup', () => cursor.classList.remove('clicking'));
});
```

### Click Ripple Effect

```typescript
// Add click ripple visualization
await page.addStyleTag({
  content: `
    .click-ripple {
      position: fixed;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(234, 88, 12, 0.4);
      pointer-events: none;
      z-index: 999998;
      transform: translate(-50%, -50%) scale(0);
      animation: ripple 0.4s ease-out forwards;
    }
    @keyframes ripple {
      to {
        transform: translate(-50%, -50%) scale(2);
        opacity: 0;
      }
    }
  `
});

// Custom click function with ripple
async function clickWithRipple(page, selector) {
  const element = await page.locator(selector);
  const box = await element.boundingBox();

  await page.evaluate(({ x, y }) => {
    const ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    document.body.appendChild(ripple);
    setTimeout(() => ripple.remove(), 400);
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });

  await element.click();
}
```

## Output for Remotion

### Move Recording to public/demos/

```typescript
import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

async function recordForRemotion(outputName: string) {
  const browser = await chromium.launch({ slowMo: 50 });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: { dir: './temp-recordings', size: { width: 1920, height: 1080 } }
  });
  const page = await context.newPage();

  // ... recording actions ...

  await context.close();

  // Get the video path
  const video = page.video();
  const videoPath = await video?.path();

  if (videoPath) {
    const destPath = `./public/demos/${outputName}.webm`;
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.renameSync(videoPath, destPath);
    console.log(`Recording saved to: ${destPath}`);

    // Get duration for config
    // Use ffprobe: ffprobe -v error -show_entries format=duration -of csv=p=0 file.webm
  }

  await browser.close();
}
```

### Convert WebM to MP4

Playwright outputs WebM. Convert for better Remotion compatibility:

```bash
ffmpeg -i recording.webm -c:v libx264 -crf 20 -preset medium -movflags faststart public/demos/demo.mp4
```

## Interactive Recording

For user-driven recordings where you manually perform actions:

```typescript
// Inject ESC key listener to stop recording
async function injectStopListener(page: Page): Promise<void> {
  await page.evaluate(() => {
    if ((window as any).__escListenerAdded) return;
    (window as any).__escListenerAdded = true;
    (window as any).__stopRecording = false;
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        (window as any).__stopRecording = true;
      }
    });
  });
}

// Poll for stop signal - handle navigation errors gracefully
while (!stopped) {
  try {
    const shouldStop = await page.evaluate(() => (window as any).__stopRecording === true);
    if (shouldStop) break;
  } catch {
    // Page navigating - continue recording
  }
  await new Promise(r => setTimeout(r, 200));
}
```

**Key insight:** `page.evaluate()` throws during navigation. Use try/catch and continue - don't treat errors as stop signals.

## Window Scaling for Laptops

Record at full 1080p while showing a smaller window:

```typescript
const scale = 0.75; // 75% window size
const context = await browser.newContext({
  viewport: { width: 1920 * scale, height: 1080 * scale },
  deviceScaleFactor: 1 / scale,
  recordVideo: { dir: './recordings', size: { width: 1920, height: 1080 } },
});
```

## Cookie Banner Dismissal

Comprehensive selector list for common consent platforms:

```typescript
const COOKIE_SELECTORS = [
  '#onetrust-accept-btn-handler',           // OneTrust
  '#CybotCookiebotDialogBodyButtonAccept',  // Cookiebot
  '.cc-btn.cc-dismiss',                      // Cookie Consent by Insites
  '[class*="cookie"] button[class*="accept"]',
  '[class*="consent"] button[class*="accept"]',
  'button:has-text("Accept all")',
  'button:has-text("Accept cookies")',
  'button:has-text("Got it")',
];

async function dismissCookieBanners(page: Page): Promise<void> {
  await page.waitForTimeout(500);
  for (const selector of COOKIE_SELECTORS) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 100 })) {
        await btn.click({ timeout: 500 });
        return;
      }
    } catch { /* try next */ }
  }
}
```

Call after `page.goto()` and on `page.on('load')` for navigation.

## Important: Injected Elements Appear in Video

**Warning:** Any DOM elements you inject (cursors, control panels, overlays) will be recorded. For UI-free recordings, use terminal-based controls only (Ctrl+C, max duration timer).

## Tips for Good Demo Recordings

1. **Use slowMo** - 50-100ms makes actions visible
2. **Add waitForTimeout** - Pause between actions for comprehension
3. **Wait for animations** - Use `waitForLoadState('networkidle')`
4. **Match Remotion dimensions** - 1920x1080 at 30fps typical
5. **Test without recording first** - Debug before final capture
6. **Clear browser state** - Use fresh context for clean demos
7. **Dismiss cookie banners** - Use comprehensive selector list above
8. **Re-inject on navigation** - Cursor/listeners reset on page load

---

## Feedback & Contributions

If this skill is missing information or could be improved:

- **Missing a pattern?** Describe what you needed
- **Found an error?** Let me know what's wrong
- **Want to contribute?** I can help you:
  1. Update this skill with improvements
  2. Create a PR to github.com/digitalsamba/claude-code-video-toolkit

Just say "improve this skill" and I'll guide you through updating `.claude/skills/playwright-recording/SKILL.md`.
