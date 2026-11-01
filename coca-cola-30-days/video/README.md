# HyperFrames build: "Coca-Cola every day for 30 days"

A 46-second vertical (2160×3840, 30 fps) 3D medical animation built with
[HyperFrames](https://hyperframes.heygen.com): HTML + GSAP + a procedural Three.js world, rendered to MP4.

| Layer | File | What it is |
|---|---|---|
| 3D world | `src/world.js` → bundled to `assets/world.js` | 14 procedural Three.js shots (can, esophagus, stomach, villi, bloodstream, pancreas, islet, cell, tooth, can tower, artery, fat, liver, heart). Every frame is a pure function of timeline time. |
| Mount | `compositions/world.html` | Canvas plus a GSAP clock tween that calls `world.render(t)` |
| Titles | `compositions/titles.html` | Hook, stats, chapter chips, blood-sugar graph, day counter, risk slams, end card |
| Captions | `compositions/captions.html` | Phrase-level burned-in captions with keyword highlights |
| Audio | `index.html` | 8 voiceover lines (Kokoro TTS `am_michael`, 1.2×) plus Pixabay-licensed SFX (`assets/sfx`) |

Titles and captions are generated from timing tables in `tools/build_overlays.py`.

## Rebuild & render

```bash
npm i three@0.170.0 gsap@3.15.0 hyperframes@0.8.225     # in any tools dir, e.g. /tmp/hf
THREE_DIR=/tmp/hf/node_modules/three ESBUILD=/tmp/hf/node_modules/.bin/esbuild tools/bundle.sh
python3 tools/build_overlays.py
npx hyperframes check
npx hyperframes render -o renders/coca-cola-30-days-4k.mp4
```

Notes:
- The 3D canvas draws at 1080×1920 and is scaled to the 4K frame, which keeps software-GPU render times practical. Text and captions render at native 4K. Raise `width`/`height` on the canvas in `compositions/world.html` for full-resolution 3D on a GPU machine.
- There is no music bed: no music source was available in this environment. Add one as an `<audio id="music" …>` in `index.html` at about 0.14 volume under the voice.
