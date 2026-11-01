"""Generates compositions/titles.html and compositions/captions.html from the timing tables below."""
import html, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

# ---------------- titles: (id, start, end, inner_html, kind)
T = [
 ("hook", 0.0, 4.75, '<div class="t-s">WHAT HAPPENS IF YOU DRINK</div><div class="t-xl red">COCA-COLA</div><div class="t-l">EVERY DAY</div><div class="t-l">FOR <span class="amber">30 DAYS?</span></div>', "hook"),
 ("sugar", 5.45, 8.0, '<div class="t-xxl amber">35 g</div><div class="t-l">OF SUGAR</div><div class="t-m dim">&asymp; 9 TEASPOONS &middot; ONE CAN</div>', "pop"),
 ("lab-sto", 9.45, 14.35, '<div class="chip">STOMACH</div>', "chip"),
 ("ph", 10.0, 14.35, '<div class="t-m">COLA IS ACIDIC</div><div class="t-xl red">pH &asymp; 2.5</div>', "pop"),
 ("lab-int", 14.45, 17.35, '<div class="chip">SMALL INTESTINE</div><div class="t-m" style="margin-top:40px">SUGAR <span class="amber">ABSORBED</span></div>', "chip"),
 ("graph", 17.45, 20.25, '<div class="chip">BLOODSTREAM</div><div class="t-l">BLOOD SUGAR <span class="amber">&uarr;</span></div><svg class="graph" viewBox="0 0 1400 520"><path class="axis" d="M40 470 H1360"/><path id="graph-line" class="line" d="M40 420 C 260 420, 380 415, 480 380 S 640 60, 760 70 S 900 250, 1040 330 S 1260 380, 1360 390"/><circle id="graph-dot" cx="760" cy="70" r="22" class="dot"/></svg><div class="t-s dim">PEAKS ~30&ndash;60 MIN AFTER DRINKING</div>', "pop"),
 ("lab-pan", 20.35, 22.25, '<div class="chip">PANCREAS</div><div class="t-l red">ALARM</div>', "chip"),
 ("insulin", 22.3, 23.55, '<div class="chip">ISLETS OF LANGERHANS</div><div class="t-l blue">INSULIN RELEASED</div>', "pop"),
 ("intocells", 23.65, 25.4, '<div class="t-m">INSULIN UNLOCKS CELLS</div><div class="t-l"><span class="amber">SUGAR</span> &rarr; IN</div>', "pop"),
 ("fat", 25.45, 27.25, '<div class="t-m">THE EXCESS</div><div class="t-l">&rarr; STORED AS <span class="yellow">FAT</span></div>', "pop"),
 ("lab-tooth", 27.35, 30.7, '<div class="chip">TOOTH ENAMEL</div><div class="t-m">BACTERIA + SUGAR &rarr; <span class="green">ACID</span></div>', "chip"),
 ("erosion", 30.74, 32.25, '<div class="t-xl green">ACID EROSION</div>', "pop"),
 ("days", 32.35, 35.65, '<div class="t-m dim">DAY</div><div id="day-num" class="t-xxl">1</div><div id="kcal" class="t-l"><span class="amber">&asymp; 4,200</span> EXTRA kcal</div><div id="kcal-sub" class="t-s dim">30 CANS &times; ~140 kcal</div>', "days"),
 ("lt", 35.8, 38.25, '<div class="t-m dim">KEEP IT UP FOR YEARS</div><div class="t-l red">LONG-TERM RISKS</div>', "pop"),
 ("r1", 38.3, 39.22, '<div class="t-xl yellow">WEIGHT GAIN</div>', "slam"),
 ("r2", 39.25, 40.12, '<div class="t-xl yellow">FATTY LIVER</div>', "slam"),
 ("r3", 40.15, 41.32, '<div class="t-xl amber">TYPE 2</div><div class="t-xl amber">DIABETES</div>', "slam"),
 ("r4", 41.35, 42.58, '<div class="t-xl red">HEART DISEASE</div>', "slam"),
 ("end1", 42.8, 46.0, '<div class="t-l">YOUR BODY</div><div class="t-xl red">KEEPS SCORE.</div>', "end"),
 ("end2", 44.05, 46.0, '<div class="t-m">EVERY SINGLE CAN.</div>', "pop"),
 ("disc", 44.5, 46.0, '<div class="disc">Educational content. Risks reflect long-term, regular intake;<br>effects vary by person and overall diet. Sugar: 10.6 g/100 ml label value.</div>', "fade"),
]
CUTS = [7.9, 9.4, 14.4, 17.4, 20.3, 22.3, 23.6, 27.3, 32.3, 35.7, 38.3, 39.25, 40.15, 41.35, 42.6]

def titles():
    els, tw = [], []
    for i, (id_, a, b, inner, kind) in enumerate(T):
        top = {"disc": 1330, "end2": 1060, "ph": 760}.get(id_, 470)
        els.append(f'<div id="ti-{id_}" class="clip tbox" data-start="{a}" data-duration="{round(b-a,3)}" data-track-index="{1 + i % 3}" style="top:{top}px">'
                   f'<div id="tin-{id_}" class="tin">{inner}</div></div>')
        sel = f'"#tin-{id_}"'
        if kind == "hook":
            tw.append(f'tl.fromTo({sel},{{scale:1.06}},{{scale:1,duration:0.6,ease:"power3.out"}},0);')
            tw.append(f'tl.fromTo("#ti-hook .t-xl",{{scale:1}},{{scale:1.08,duration:0.18,ease:"power2.out",yoyo:true,repeat:1}},0.75);')
        elif kind == "chip":
            tw.append(f'tl.fromTo({sel},{{opacity:0,y:-40}},{{opacity:1,y:0,duration:0.3,ease:"power3.out"}},{a});')
        elif kind == "fade":
            tw.append(f'tl.fromTo({sel},{{opacity:0}},{{opacity:1,duration:0.4}},{a});')
        elif kind == "slam":
            tw.append(f'tl.fromTo({sel},{{opacity:0,scale:1.6}},{{opacity:1,scale:1,duration:0.16,ease:"power4.out"}},{a});')
            tw.append(f'tl.fromTo({sel},{{x:-14}},{{x:0,duration:0.2,ease:"elastic.out(1,0.3)"}},{a+0.16});')
        elif kind == "end":
            tw.append(f'tl.fromTo({sel},{{opacity:0,scale:0.9,filter:"blur(20px)"}},{{opacity:1,scale:1,filter:"blur(0px)",duration:0.5,ease:"power3.out"}},{a});')
        else:
            tw.append(f'tl.fromTo({sel},{{opacity:0,y:60,scale:0.92}},{{opacity:1,y:0,scale:1,duration:0.28,ease:"back.out(2)"}},{a});')
        if kind not in ("hook", "end", "fade") and b < 46:
            tw.append(f'tl.to({sel},{{opacity:0,duration:0.12}},{round(b-0.14,3)});')
    # special: graph line + day counter
    tw.append('tl.fromTo("#graph-line",{strokeDashoffset:1700},{strokeDashoffset:0,duration:1.6,ease:"power2.inOut"},17.6);')
    tw.append('tl.fromTo("#graph-dot",{scale:0,transformOrigin:"50% 50%"},{scale:1,duration:0.25,ease:"back.out(3)"},18.55);')
    tw.append('const day={v:1};tl.fromTo(day,{v:1},{v:30,duration:3.0,ease:"none",onUpdate:()=>{document.getElementById("day-num").textContent=String(Math.round(day.v));}},32.45);')
    tw.append('tl.fromTo("#kcal",{opacity:0,y:40},{opacity:1,y:0,duration:0.3,ease:"back.out(2)"},33.6);')
    tw.append('tl.fromTo("#kcal-sub",{opacity:0},{opacity:1,duration:0.3},33.9);')
    tw.append('tl.fromTo("#day-num",{scale:1},{scale:1.15,duration:0.12,yoyo:true,repeat:1,ease:"power2.out"},35.45);')
    for c in CUTS:
        tw.append(f'tl.set("#flash",{{opacity:0.55}},{c});tl.to("#flash",{{opacity:0,duration:0.2,ease:"power2.out"}},{c});')
    tw.append('tl.set("#flash",{opacity:0},0);')
    return f'''<template>
  <style>
    #root {{ position: absolute; inset: 0; font-family: "Inter", sans-serif; color: #fff; }}
    #root .clip {{ position: absolute; left: 0; width: 2160px; }}
    .tbox {{ height: 1500px; }}
    .tin {{ width: 100%; padding: 0 240px; text-align: center; transform-origin: 50% 30%;
           text-shadow: 0 8px 40px rgba(0,0,0,.85), 0 2px 6px rgba(0,0,0,.9); }}
    .t-s {{ font-size: 76px; font-weight: 700; letter-spacing: .08em; }}
    .t-m {{ font-size: 104px; font-weight: 900; letter-spacing: .02em; line-height: 1.1; }}
    .t-l {{ font-size: 150px; font-weight: 900; letter-spacing: -.01em; line-height: 1.02; }}
    .t-xl {{ font-size: 200px; font-weight: 900; letter-spacing: -.02em; line-height: .98; }}
    .t-xxl {{ font-size: 380px; font-weight: 900; letter-spacing: -.04em; line-height: .95; }}
    .red {{ color: #ff2b2b; }} .amber {{ color: #ffb12e; }} .yellow {{ color: #ffd23f; }}
    .blue {{ color: #72d3ff; }} .green {{ color: #8dff63; }} .dim {{ color: rgba(255,255,255,.78); }}
    .chip {{ display: inline-block; font-size: 64px; font-weight: 700; letter-spacing: .3em; padding: 22px 46px 22px 62px;
            border: 4px solid rgba(255,255,255,.85); border-radius: 80px; margin-bottom: 36px; background: rgba(0,0,0,.35); }}
    .graph {{ width: 1400px; height: 520px; margin: 30px auto 10px; display: block; overflow: visible; }}
    .graph .axis {{ stroke: rgba(255,255,255,.5); stroke-width: 6; fill: none; }}
    .graph .line {{ stroke: #ffb12e; stroke-width: 20; fill: none; stroke-linecap: round; stroke-dasharray: 1700; filter: drop-shadow(0 0 22px #ff9a00); }}
    .graph .dot {{ fill: #fff; filter: drop-shadow(0 0 24px #ffb12e); }}
    .disc {{ display: inline-block; font-size: 46px; font-weight: 400; line-height: 1.35; color: rgba(255,255,255,.88); background: rgba(0,0,0,.62); padding: 22px 40px; border-radius: 24px; }}
    #vignette {{ position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%); }}
    #flash {{ position: absolute; inset: 0; background: #fff; opacity: 0; }}
  </style>
  <div id="root" data-composition-id="titles" data-width="2160" data-height="3840" data-duration="46" data-layout-allow-overlap>
    <div id="vignette" data-layout-ignore></div>
    <div id="flash" data-layout-ignore></div>
    {chr(10).join("    " + e for e in els)}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    {chr(10).join("    " + t for t in tw)}
    window.__timelines["titles"] = tl;
  </script>
</template>
'''

# ---------------- captions: (start, end, text with *keyword* marks)
C = [
 (4.85, 5.4, "One can."), (5.5, 7.3, "About *35 grams* of sugar."), (7.45, 8.85, "Nearly *9 teaspoons.*"),
 (9.07, 9.85, "In your *stomach,*"), (9.9, 11.95, "the *acidic* fizz moves on fast."), (12.05, 14.15, "Liquid sugar doesn't wait to be digested."),
 (14.38, 15.35, "In the *small intestine,*"), (15.4, 17.2, "it floods into your *bloodstream.*"), (17.35, 18.55, "Within about *30 minutes,*"), (18.6, 20.1, "your *blood sugar spikes.*"),
 (20.32, 21.85, "Your *pancreas* sounds the alarm."), (22.2, 23.5, "It releases *insulin,*"), (23.6, 25.35, "pushing that *sugar* into your cells,"), (25.4, 27.1, "and storing the excess as *fat.*"),
 (27.29, 28.6, "Meanwhile, mouth *bacteria* feast"), (28.6, 30.5, "on the sugar and make *acid,*"), (30.6, 32.0, "which attacks your *enamel.*"), (32.35, 33.6, "And *30 cans* add over"), (33.6, 35.5, "*4,000 extra calories.*"),
 (35.75, 36.9, "Keep this habit for *years,*"), (36.9, 38.1, "and the *risks* climb."),
]
def captions():
    els, tw = [], []
    for i, (a, b, txt) in enumerate(C):
        parts = txt.split("*")
        inner = "".join(f'<span class="kw">{html.escape(p)}</span>' if k % 2 else html.escape(p) for k, p in enumerate(parts))
        cid = f"cap-{i:02d}"
        els.append(f'<div id="{cid}" class="clip cap" data-start="{a}" data-duration="{round(b-a,3)}" data-track-index="{i%2}"><div id="{cid}-in" class="cap-in">{inner}</div></div>')
        tw.append(f'tl.fromTo("#{cid}-in",{{opacity:0,y:30,scale:0.94}},{{opacity:1,y:0,scale:1,duration:0.14,ease:"power3.out"}},{a});')
    return f'''<template>
  <style>
    #root {{ position: absolute; inset: 0; font-family: "Inter", sans-serif; }}
    #root .cap {{ position: absolute; left: 0; top: 2330px; width: 2160px; height: 360px; }}
    .cap-in {{ padding: 0 260px; text-align: center; font-size: 104px; font-weight: 900; line-height: 1.12; color: #fff;
              text-shadow: 0 0 6px #000, 0 6px 28px rgba(0,0,0,.95), 0 0 2px #000; }}
    .kw {{ color: #ffcf33; }}
  </style>
  <div id="root" data-composition-id="captions" data-width="2160" data-height="3840" data-duration="46">
    {chr(10).join("    " + e for e in els)}
  </div>
  <script>
    const tl = gsap.timeline({{ paused: true }});
    {chr(10).join("    " + t for t in tw)}
    window.__timelines["captions"] = tl;
  </script>
</template>
'''
(ROOT / "compositions/titles.html").write_text(titles())
(ROOT / "compositions/captions.html").write_text(captions())
print("ok")
