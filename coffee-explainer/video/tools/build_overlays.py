"""Generates compositions/titles.html and compositions/captions.html from the timing tables below."""
import html, pathlib
ROOT = pathlib.Path(__file__).resolve().parent.parent

# ---------------- titles: (id, start, end, inner_html, kind)
T = [
 ("hook", 0.0, 3.27, '<div class="t-s">WHAT HAPPENS IN YOUR BODY</div><div class="t-l">WHEN YOU DRINK</div><div class="t-xl coffee">A COFFEE?</div>', "hook"),
 ("mg", 3.3, 6.37, '<div class="t-xxl blue">95 mg</div><div class="t-l">CAFFEINE</div><div class="t-m dim">IN ONE CUP &middot; C<sub>8</sub>H<sub>10</sub>N<sub>4</sub>O<sub>2</sub></div>', "pop"),
 ("gut", 6.4, 8.77, '<div class="chip">SMALL INTESTINE</div><div class="t-m">ABSORBED <span class="blue">FAST</span></div>', "chip"),
 ("graph", 8.8, 10.97, '<div class="chip">BLOODSTREAM</div><div class="t-l">CAFFEINE <span class="blue">&uarr;</span></div><svg class="graph" viewBox="0 0 1400 520"><path class="axis" d="M40 470 H1360"/><path id="graph-line" class="line" d="M40 460 C 200 440, 300 140, 470 90 S 760 110, 900 180 S 1200 300, 1360 340"/><circle id="graph-dot" cx="480" cy="90" r="22" class="dot"/></svg><div class="t-s dim">PEAK: 30&ndash;60 MIN</div>', "pop"),
 ("brain", 11.0, 13.02, '<div class="chip">BRAIN</div><div class="t-s dim">CROSSES THE BLOOD&ndash;BRAIN BARRIER</div>', "chip"),
 ("ado", 13.1, 15.65, '<div class="chip">ADENOSINE</div><div class="t-m">BUILDS UP <span class="orange">ALL DAY</span></div>', "chip"),
 ("sleepy", 15.7, 17.97, '<div class="t-m dim">ADENOSINE ON RECEPTORS</div><div class="t-xl orange">= SLEEPY</div>', "pop"),
 ("cmp", 18.0, 19.97, '<div class="t-m blue">CAFFEINE</div>', "pop"),
 ("blocked", 20.0, 22.97, '<div class="t-m">RECEPTORS</div><div class="t-xl blue">BLOCKED</div>', "slam"),
 ("alert", 23.3, 26.22, '<div class="t-xxl blue">ALERT</div><div class="t-m dim">FOCUSED &middot; AWAKE</div>', "slam"),
 ("heart", 26.25, 28.22, '<div class="t-l red">HEART RATE &uarr;</div>', "pop"),
 ("half", 28.35, 34.42, '<div class="chip">HALF-LIFE &asymp; 5 HOURS</div><div id="clock" class="t-xxl">4 PM</div><div class="t-m"><span id="pct" class="blue">100%</span> STILL IN YOU</div>', "chip"),
 ("crash1", 35.5, 38.5, '<div class="t-m dim">CAFFEINE WEARS OFF</div><div class="t-l orange">ADENOSINE</div><div class="t-m orange">FLOODS BACK IN</div>', "pop"),
 ("crash2", 38.5, 39.72, '<div class="t-xxl red">CRASH</div>', "slam"),
 ("safe", 39.9, 46.0, '<div class="t-m dim">UP TO</div><div class="t-xxl coffee">400 mg</div><div class="t-m">PER DAY &asymp; 4 CUPS</div><div class="t-s dim">FOR MOST HEALTHY ADULTS</div>', "end"),
 ("end2", 43.74, 46.0, '<div class="t-l blue">TIME IT RIGHT.</div>', "pop"),
 ("disc", 44.3, 46.0, '<div class="disc">Educational content. Caffeine per cup varies by brew, and half-life<br>varies by person (~2&ndash;10 h). Pregnancy guidance is lower (&le;200 mg/day).</div>', "fade"),
]
CUTS = [3.25, 6.35, 8.75, 10.95, 13.0, 17.95, 19.95, 22.95, 26.2, 28.2, 34.4, 39.7]

def titles():
    els, tw = [], []
    for i, (id_, a, b, inner, kind) in enumerate(T):
        top = {"disc": 1980, "end2": 1560}.get(id_, 470)
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
    tw.append('tl.fromTo("#graph-line",{strokeDashoffset:1700},{strokeDashoffset:0,duration:1.5,ease:"power2.inOut"},8.95);')
    tw.append('tl.fromTo("#graph-dot",{scale:0,transformOrigin:"50% 50%"},{scale:1,duration:0.25,ease:"back.out(3)"},9.6);')
    tw.append('const clk={h:0};tl.fromTo(clk,{h:0},{h:5,duration:5.0,ease:"none",onUpdate:()=>{const h=clk.h;document.getElementById("clock").textContent=(4+Math.round(h))+" PM";document.getElementById("pct").textContent=Math.round(100*Math.pow(0.5,h/5))+"%";}},28.6);')
    tw.append('tl.fromTo("#clock",{scale:1},{scale:1.12,duration:0.14,yoyo:true,repeat:1,ease:"power2.out"},33.6);')
    tw.append('tl.fromTo("#cmp-ado",{opacity:0,y:40},{opacity:1,y:0,duration:0.3,ease:"back.out(2)"},18.15);')
    tw.append('tl.fromTo("#cmp-same",{opacity:0,scale:0.8},{opacity:1,scale:1,duration:0.3,ease:"back.out(2)"},18.6);')
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
    .red {{ color: #ff3b3b; }} .amber {{ color: #ffb12e; }} .yellow {{ color: #ffd23f; }} .coffee {{ color: #e8a96a; }} .orange {{ color: #ffa64d; }}
    .blue {{ color: #7fe0ff; }} .green {{ color: #8dff63; }} .dim {{ color: rgba(255,255,255,.78); }}
    .chip {{ display: inline-block; font-size: 64px; font-weight: 700; letter-spacing: .3em; padding: 22px 46px 22px 62px;
            border: 4px solid rgba(255,255,255,.85); border-radius: 80px; margin-bottom: 36px; background: rgba(0,0,0,.35); }}
    .graph {{ width: 1400px; height: 520px; margin: 30px auto 10px; display: block; overflow: visible; }}
    .graph .axis {{ stroke: rgba(255,255,255,.5); stroke-width: 6; fill: none; }}
    .graph .line {{ stroke: #7fe0ff; stroke-width: 20; fill: none; stroke-linecap: round; stroke-dasharray: 1700; filter: drop-shadow(0 0 22px #1aa0ff); }}
    .graph .dot {{ fill: #fff; filter: drop-shadow(0 0 24px #7fe0ff); }}
    .disc {{ display: inline-block; font-size: 46px; font-weight: 400; line-height: 1.35; color: rgba(255,255,255,.88); background: rgba(0,0,0,.62); padding: 22px 40px; border-radius: 24px; }}
    #topshade {{ position: absolute; left: 0; top: 0; width: 2160px; height: 1500px; background: linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.35) 55%, rgba(0,0,0,0) 100%); }}
    #vignette {{ position: absolute; inset: 0; background: radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 55%, rgba(0,0,0,.55) 100%); }}
    #flash {{ position: absolute; inset: 0; background: #fff; opacity: 0; }}
  </style>
  <div id="root" data-composition-id="titles" data-width="2160" data-height="3840" data-duration="46" data-layout-allow-overlap>
    <div id="vignette" data-layout-ignore></div>
    <div id="topshade" data-layout-ignore></div>
    <div id="flash" data-layout-ignore></div>
    <div id="ti-cmpb" class="clip tbox" data-start="18.0" data-duration="1.97" data-track-index="4" style="top:2050px"><div class="tin"><div id="cmp-ado" class="t-m orange">ADENOSINE</div></div></div>
    <div id="ti-cmpm" class="clip tbox" data-start="18.0" data-duration="1.97" data-track-index="5" style="top:1500px"><div class="tin"><div id="cmp-same" class="t-s">SAME PURINE CORE &#x21C5;</div></div></div>
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
 (3.3, 3.75, "One cup."), (3.95, 6.0, "About *95 milligrams* of caffeine."),
 (6.45, 8.6, "It's absorbed through your gut into your *blood,*"), (8.85, 10.75, "peaking *30–60 minutes* later."),
 (11.05, 12.6, "Then it slips straight into your *brain.*"),
 (13.1, 15.35, "All day, your brain builds up *adenosine,*"), (15.65, 17.65, "the molecule that makes you feel *sleepy.*"),
 (18.05, 19.6, "Caffeine is shaped *just like it.*"), (19.95, 22.9, "It plugs adenosine's receptors, and *blocks the signal.*"),
 (23.3, 24.95, "Your brain stops hearing *“tired.”*"), (25.15, 25.95, "You feel *alert.*"), (26.25, 27.8, "Your heart beats a little *faster.*"),
 (28.35, 30.7, "But caffeine's *half-life* is about *5 hours.*"), (30.9, 34.0, "A *4 p.m.* coffee is still *half there at 9.*"),
 (34.55, 35.4, "When it wears off,"), (35.5, 38.2, "all that built-up *adenosine* finally gets through."), (38.5, 39.4, "That's *the crash.*"),
 (39.9, 43.4, "Up to *400 mg a day* is safe for most healthy adults."), (43.7, 44.7, "Just *time it right.*"),
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
