# "Coca-Cola Every Day for 30 Days": 45-Second Medical Animation

**Format:** Vertical 9:16 · 2160×3840 (4K) · 24 fps · about 45 s · TikTok/Reels
**Style:** Ultra-realistic 3D anatomy, cinematic volumetric lighting, macro lenses, fast push-ins, medical-documentary grade
**Structure:** 6 scenes, 9 shots (each shot ≤ 8 s so one AI video generation covers it)

---

> **Built version:** the `video/` folder holds a HyperFrames + Three.js build of this storyboard. It renders to `video/renders/coca-cola-30-days-4k.mp4` (46 s, 2160×3840). See `video/README.md`. The sections below are the original brief for AI-video generators.

---

## 1. Voiceover script (113 words, about 44 s at a brisk, suspenseful pace)

| Time | Scene | Narration |
|---|---|---|
| 0:00–0:04 | 1 | **"What happens to your body if you drink Coca-Cola every day for 30 days?"** |
| 0:04–0:08 | 1 | "One can. About 35 grams of sugar. That's nearly nine teaspoons." |
| 0:08–0:13 | 2 | "In your stomach, the acidic fizz moves on fast, because liquid sugar doesn't wait to be digested." |
| 0:13–0:19 | 3 | "In the small intestine, it floods into your bloodstream. Within about thirty minutes, your blood sugar spikes." |
| 0:19–0:25 | 4 | "Your pancreas sounds the alarm, releasing insulin to push that sugar into your cells, and store the excess as fat." |
| 0:25–0:33 | 5 | "Meanwhile, mouth bacteria feast on the sugar and make acid, which attacks your enamel. And thirty cans add over four thousand extra calories." |
| 0:33–0:41 | 6 | "Keep this habit for years, and the risks climb: weight gain, fatty liver, type 2 diabetes, heart disease." |
| 0:41–0:45 | 6 | "Your body keeps score. Every single can." |

**Voice direction:** male or female, deep and close-mic, documentary-thriller tone. Speed up slightly through scenes 3–5, then slow down for the last line. Leave a 0.3 s silence before "Your body keeps score."

---

## 2. Scientific accuracy notes (fact-check sheet)

| Claim | Basis |
|---|---|
| ~35 g sugar per 330 ml can (~39 g per US 355 ml can) | Coca-Cola Classic nutrition labels (10.6 g/100 ml). 4 g ≈ 1 tsp, so 35 g ≈ 9 tsp. |
| ~140 kcal per can → 30 cans ≈ 4,200 kcal | Label values (139 kcal / 330 ml). On-screen text says "4,000+ extra calories." |
| Sugar is absorbed mainly in the **small intestine**, not the stomach | Sucrose and HFCS are split into glucose and fructose and taken up through intestinal transporters (SGLT1, GLUT5, GLUT2). The stomach only empties the liquid onward quickly. |
| Blood sugar peaks roughly 30–60 min after a sugary drink | Standard glycaemic response curves. |
| Insulin comes from **beta cells in the islets of Langerhans** | Basic physiology. Insulin drives glucose uptake into muscle, fat and liver cells and promotes fat storage. |
| Fructose processed in the liver can be turned into fat (de novo lipogenesis) | Established mechanism, linked to non-alcoholic fatty liver disease (NAFLD/MASLD). |
| Oral bacteria (*Streptococcus mutans*) ferment sugar into acid; the drink's phosphoric acid (pH ≈ 2.5) also erodes enamel | Dental research consensus (cavities plus erosion). |
| Daily sugary drinks are linked to higher risk of type 2 diabetes, weight gain, heart disease, fatty liver and gout | Large cohort studies and meta-analyses (e.g., Malik et al., *Diabetes Care* 2010: ~26% higher T2D risk at 1–2 servings/day). WHO advises keeping free sugars under 10% of energy, ideally under 5% (~25 g/day). |

**Things the video deliberately does NOT claim:** that 30 days alone *causes* diabetes, the viral "minute-by-minute dopamine/caffeine timeline" (not well supported), or that sugar is absorbed in the stomach. Long-term risks are presented as **risks from a long-term habit**.

Suggested on-screen disclaimer (last 2 s, small text): *"Educational content. Effects vary by person and overall diet."*

---

## 3. Shot list & ready-to-paste AI video prompts

Recommended generator: **Seedance 2.0** (std mode, 4K, 9:16) or **Kling 3.0** (4K mode). Generate silent (`generate_audio: false`) and add VO and SFX in the edit.
Prepend this **style lock** to every prompt so the shots stay consistent:

> *Ultra-realistic 3D medical animation, cinematic volumetric lighting, deep shadows with warm red and cold teal accents, macro lens, shallow depth of field, subsurface scattering on tissue, wet glossy organic textures, photoreal, medical documentary quality, vertical 9:16 composition, 4K, no text, no logos.*

> **Brand note:** most video models block or distort trademarks. Prompts describe "a classic red cola can with a white ribbon swoosh, no readable text." Add the real logo in post only if you have the rights to use it. The narration names the product, which is fine for editorial and educational commentary.

### Scene 1: The first sip (0:00–0:08)

**Shot 1A (4 s): Can opening, extreme macro**
> Extreme close-up of a frosty red aluminium cola can, condensation droplets sliding down, a finger pulls the tab, burst of fizz and cold mist erupts in slow motion, backlit droplets sparkle, camera pushes in fast toward the opening, dark moody background, dramatic rim light.

**Shot 1B (4 s): Into the mouth and down the esophagus**
> A young adult tilts the cold red can and drinks, camera dives through the lips into a photoreal x-ray-style cutaway of the mouth, dark fizzy cola washes over the teeth and tongue, then the camera follows the bubbling liquid down a glistening pink esophagus tunnel, peristaltic muscle waves ripple, fast forward-tracking motion, carbonation bubbles glowing.

**On-screen text:** `DAY 1` → `35 g SUGAR ≈ 9 TSP` (sugar cubes stack beside the can)

### Scene 2: The stomach (0:08–0:13)

**Shot 2 (5 s)**
> Cinematic orbit around a translucent, anatomically detailed human stomach suspended in darkness, dark cola pours in from the esophagus, fizzing against the folded rugae of the stomach lining, CO2 bubbles rise and the stomach gently expands, the liquid quickly streams out through the pyloric valve toward the small intestine, warm internal glow, slow-to-fast camera move.

**On-screen text:** `pH ≈ 2.5`

### Scene 3: Into the bloodstream (0:13–0:19)

**Shot 3 (6 s)**
> Macro journey inside the small intestine, camera glides between velvety villi, glowing amber sugar molecules (glucose and fructose, depicted as small luminous hexagonal particles) pass through the intestinal wall into a red capillary, camera follows them into a large blood vessel, red blood cells tumble past as the stream fills with thousands of glowing sugar particles, rising density, intense motion blur, dramatic red lighting.

**On-screen text:** `BLOOD SUGAR ↑` with a pulsing line graph spiking

### Scene 4: The pancreas responds (0:19–0:25)

**Shot 4 (6 s)**
> Dramatic reveal of a detailed 3D human pancreas nestled behind the stomach, camera rushes in to a cluster of islet cells (islets of Langerhans) glowing like a city at night, beta cells pulse and release streams of shimmering blue insulin particles into the blood, insulin molecules dock onto cell surfaces and open glowing channels that pull the amber sugar particles inside, then transition: excess particles flow to the liver and condense into yellow fat droplets.

**On-screen text:** `INSULIN RELEASED` → `EXCESS → STORED AS FAT`

### Scene 5: Daily-habit effects (0:25–0:33)

**Shot 5A (4 s): Teeth and enamel**
> Extreme macro of a human molar, cola washes over it, microscopic bacteria colonies feed on sugar and release a corrosive green acidic haze, the enamel surface pits and erodes in time-lapse, crystalline enamel micro-structure cracking, dramatic side lighting.

**Shot 5B (4 s): 30-day calorie stack**
> Time-lapse montage: a calendar flips from day 1 to day 30, empty red cans pile up into a tower beside a translucent 3D human silhouette, the silhouette's abdominal area subtly fills with glowing yellow fat tissue, cold blue lighting, camera slowly orbits.

**On-screen text:** `30 CANS = 4,000+ EXTRA CALORIES`

### Scene 6: Long-term risks (0:33–0:45)

**Shot 6A (5 s): Organ risk montage**
> Fast-cut cinematic montage inside the body: a liver turning pale yellow with fat deposits, a blood vessel wall stiffening with plaque buildup, the heart beating heavily under red warning light, pancreas islet cells dimming and flickering, each organ highlighted in dark space with dramatic rim light, rapid camera whip-pans between them.

**Shot 6B (5 s): Pull-back finale**
> Camera pulls back rapidly from inside the bloodstream, out through the skin, revealing the full translucent 3D human body glowing with internal organs, standing still in darkness, a single cold red cola can in hand, condensation dripping, lights fade to black except for the can.

**On-screen text (one at a time, punchy):** `WEIGHT GAIN` · `FATTY LIVER` · `TYPE 2 DIABETES` · `HEART DISEASE` → final card: `YOUR BODY KEEPS SCORE.`

**Shot total:** 4+4+5+6+6+4+4+5+5 = 43 s, plus about 2 s of end card = **45 s**

---

## 4. Sound design & edit notes

- **Music:** dark, pulsing hybrid-trailer bed at 100–110 BPM. Add a riser into scene 4 and a drop at "your pancreas sounds the alarm." Cut the music to silence for "Your body keeps score," then hit one deep boom.
- **SFX:** can crack and fizz (sync with frame 1), swallow gulp, wet organic whooshes on every camera dive, heartbeat thump under scenes 3–4, crystalline crackle on enamel erosion, calendar flicks.
- **Pacing:** hard cuts, or speed-ramped whip transitions, every 3–6 s. Hold no shot longer than 6 s.
- **Captions:** burn in large word-by-word captions (TikTok style, white with a red highlight on keywords: *sugar, insulin, fat, enamel, diabetes*). Keep them inside the 9:16 safe zone, about 15% up from the bottom.
- **Hook:** keep the first spoken line on screen as a text overlay too (many viewers watch muted).

---

## 5. Hashtags / caption (optional)

> What 30 days of daily soda really does inside you 🥤🧠 #health #science #sugar #nutrition #anatomy #3danimation #didyouknow
