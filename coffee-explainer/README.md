# What happens in your body when you drink coffee? (46 s explainer)

Vertical 2160×3840, 30 fps, built with HyperFrames + a procedural Three.js world (same pipeline as `../coca-cola-30-days`).

## Script and fact sources

| Time | Line | Basis |
|---|---|---|
| 0:00 | What happens in your body when you drink a cup of coffee? | Hook |
| 0:03 | One cup. About 95 mg of caffeine. | USDA FoodData: brewed coffee ≈ 95 mg per 8 oz (varies widely by brew) |
| 0:06 | Absorbed through your gut into your blood, peaking 30–60 min later. | ~99% absorbed, mostly in the small intestine; peak plasma levels typically 30–60 min (range 15–120) |
| 0:11 | Then it slips straight into your brain. | Caffeine crosses the blood–brain barrier freely |
| 0:13 | Your brain builds up adenosine, the molecule that makes you feel sleepy. | Extracellular adenosine rises with time awake (sleep pressure) |
| 0:18 | Caffeine is shaped like it, plugs adenosine's receptors and blocks the signal. | Caffeine is a purine (like adenosine's adenine) and a competitive A1/A2A receptor antagonist |
| 0:23 | You feel alert; your heart beats a little faster. | Alertness from adenosine blockade; modest heart rate and adrenaline increases, especially in non-habitual users |
| 0:28 | Half-life about 5 hours; a 4 p.m. coffee is still half there at 9. | Average half-life ~5 h in healthy adults (range ~2–10 h) |
| 0:34 | When it wears off, built-up adenosine gets through: the crash. | Adenosine keeps accumulating while receptors are blocked |
| 0:39 | Up to 400 mg a day is safe for most healthy adults. | FDA / EFSA guidance (≤200 mg/day in pregnancy) |

The molecules on screen are drawn from real structures: caffeine (1,3,7-trimethylxanthine) and adenosine (adenine + ribose), both built on the purine double ring.

## Files
- `video/src/world.js`: the 3D scenes (mug, caffeine molecule, intestine, bloodstream, brain, synapse, molecule comparison, neurons, heart, half-life, end card). It is bundled to `video/assets/world.js` by `video/tools/bundle.sh`.
- `video/tools/build_overlays.py`: the timing tables that generate `compositions/titles.html` and `compositions/captions.html`.
- `video/index.html`: voiceover (Kokoro TTS `am_michael`, 1.2×) and sound effects (Pixabay-licensed, plus a synthesized heartbeat).

Render: `cd video && npx hyperframes render -o renders/coffee-explainer-4k.mp4`, then loudness-normalize with
`ffmpeg -i in.mp4 -c:v copy -af loudnorm=I=-14.5:TP=-1.5 -ar 44100 -c:a aac -b:a 192k out.mp4`.
