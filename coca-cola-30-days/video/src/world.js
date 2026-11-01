// Procedural Three.js world for "Coca-Cola every day for 30 days".
// Every frame is a pure function of timeline time t (seconds): render(t).
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

// ---------------------------------------------------------------- utilities
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, k) => a + (b - a) * k;
const smooth = (a, b, x) => {
  const k = clamp((x - a) / (b - a));
  return k * k * (3 - 2 * k);
};
const easeOut = (k) => 1 - Math.pow(1 - clamp(k), 3);
const easeInOut = (k) => {
  k = clamp(k);
  return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
};
function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hash1 = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
function hash3(x, y, z) {
  let h = x * 374761393 + y * 668265263 + z * 2147483647;
  h = (h ^ (h >>> 13)) * 1274126177;
  h = h ^ (h >>> 16);
  return (h >>> 0) / 4294967296;
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let xf = x - xi, yf = y - yi, zf = z - zi;
  xf = xf * xf * (3 - 2 * xf);
  yf = yf * yf * (3 - 2 * yf);
  zf = zf * zf * (3 - 2 * zf);
  const c = (a, b, d) => hash3(xi + a, yi + b, zi + d);
  const x00 = lerp(c(0, 0, 0), c(1, 0, 0), xf), x10 = lerp(c(0, 1, 0), c(1, 1, 0), xf);
  const x01 = lerp(c(0, 0, 1), c(1, 0, 1), xf), x11 = lerp(c(0, 1, 1), c(1, 1, 1), xf);
  return lerp(lerp(x00, x10, yf), lerp(x01, x11, yf), zf);
}
function fbm(x, y, z, oct = 4) {
  let a = 0.5, s = 0, n = 0;
  for (let k = 0; k < oct; k++) {
    s += a * vnoise(x, y, z);
    n += a;
    x *= 2.03; y *= 2.03; z *= 2.03;
    a *= 0.5;
  }
  return s / n;
}

const GLSL_NOISE = /* glsl */ `
float hhash(vec3 p){ p=fract(p*0.3183099+.1); p*=17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vnoise3(vec3 x){ vec3 i=floor(x); vec3 f=fract(x); f=f*f*(3.-2.*f);
 return mix(mix(mix(hhash(i),hhash(i+vec3(1,0,0)),f.x),mix(hhash(i+vec3(0,1,0)),hhash(i+vec3(1,1,0)),f.x),f.y),
            mix(mix(hhash(i+vec3(0,0,1)),hhash(i+vec3(1,0,1)),f.x),mix(hhash(i+vec3(0,1,1)),hhash(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm3(vec3 p){ float a=0.5,s=0.; for(int k=0;k<4;k++){ s+=a*vnoise3(p); p*=2.03; a*=0.5;} return s/0.9375; }
`;

// Darken/tint a material where noise exceeds a threshold driven by a uniform (erosion, fat spots).
function patchSpots(mat, uniform, color, freq, roughTo) {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uSpot = uniform;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObjP;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvObjP = position;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nvarying vec3 vObjP; uniform float uSpot;\n" + GLSL_NOISE)
      .replace(
        "#include <color_fragment>",
        `#include <color_fragment>
         float sn = fbm3(vObjP*${freq.toFixed(2)});
         float sp = smoothstep(1.0-uSpot, 1.0-uSpot+0.07, sn);
         diffuseColor.rgb = mix(diffuseColor.rgb, vec3(${color.r.toFixed(3)},${color.g.toFixed(3)},${color.b.toFixed(3)}), sp*0.9);`,
      )
      .replace(
        "#include <roughnessmap_fragment>",
        `#include <roughnessmap_fragment>\n roughnessFactor = mix(roughnessFactor, ${roughTo.toFixed(2)}, sp);`,
      );
  };
  mat.customProgramCacheKey = () => "spots" + freq + roughTo + color.getHexString();
}

function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  draw(c.getContext("2d"), w, h);
  const tex = new THREE.CanvasTexture(c);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function glowTexture() {
  return canvasTex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, "rgba(255,255,255,1)");
    gr.addColorStop(0.18, "rgba(255,255,255,0.85)");
    gr.addColorStop(0.45, "rgba(255,255,255,0.22)");
    gr.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
  });
}

// Wet tissue: base blotches + capillary veins. Used as map and bump.
function tissueTexture(seed, base, dark, light, veins = true) {
  const rnd = mulberry32(seed);
  return canvasTex(1024, 1024, (g, w, h) => {
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2600; i++) {
      const x = rnd() * w, y = rnd() * h, r = 4 + rnd() * 38;
      g.fillStyle = rnd() < 0.5 ? dark : light;
      g.globalAlpha = 0.04 + rnd() * 0.08;
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    if (veins) {
      g.strokeStyle = dark;
      for (let v = 0; v < 70; v++) {
        let x = rnd() * w, y = rnd() * h, a = rnd() * Math.PI * 2;
        g.globalAlpha = 0.25 + rnd() * 0.35;
        g.lineWidth = 0.6 + rnd() * 2.6;
        g.beginPath();
        g.moveTo(x, y);
        for (let s = 0; s < 40; s++) {
          a += (rnd() - 0.5) * 0.9;
          x += Math.cos(a) * 9;
          y += Math.sin(a) * 9;
          g.lineTo(x, y);
        }
        g.stroke();
      }
    }
    g.globalAlpha = 1;
  });
}

// Displace a geometry along its normals by fn(x,y,z) (setup time only).
function displace(geo, fn) {
  geo = mergeVertices(geo.index ? geo : geo, 1e-4);
  geo.computeVertexNormals();
  const p = geo.attributes.position, n = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const d = fn(x, y, z);
    p.setXYZ(i, x + n.getX(i) * d, y + n.getY(i) * d, z + n.getZ(i) * d);
  }
  geo.computeVertexNormals();
  return geo;
}

// A tube whose radius follows radiusFn(u, angle). Keeps base data for per-frame deformation.
function makeTube(curve, tubular, radial, radiusFn) {
  const geo = new THREE.TubeGeometry(curve, tubular, 1, radial, false);
  const p = geo.attributes.position;
  const centers = [], dirs = [];
  for (let i = 0; i <= tubular; i++) {
    const u = i / tubular;
    const c = curve.getPointAt(u);
    for (let j = 0; j <= radial; j++) {
      const idx = i * (radial + 1) + j;
      const v = new THREE.Vector3(p.getX(idx), p.getY(idx), p.getZ(idx)).sub(c).normalize();
      centers.push(c);
      dirs.push(v);
      const r = radiusFn(u, (j / radial) * Math.PI * 2, c, v);
      p.setXYZ(idx, c.x + v.x * r, c.y + v.y * r, c.z + v.z * r);
    }
  }
  geo.computeVertexNormals();
  return {
    geo,
    deform(fn) {
      for (let i = 0; i <= tubular; i++) {
        const u = i / tubular;
        for (let j = 0; j <= radial; j++) {
          const idx = i * (radial + 1) + j;
          const c = centers[idx], v = dirs[idx];
          const r = fn(u, (j / radial) * Math.PI * 2, c, v);
          p.setXYZ(idx, c.x + v.x * r, c.y + v.y * r, c.z + v.z * r);
        }
      }
      p.needsUpdate = true;
      geo.computeVertexNormals();
    },
  };
}

// Frames along a curve for placing particles inside a tunnel.
function curveFrames(curve, n = 600) {
  const f = curve.computeFrenetFrames(n, false);
  const pts = [];
  for (let i = 0; i <= n; i++) pts.push(curve.getPointAt(i / n));
  return {
    at(u, ang, r, out) {
      const i = Math.round(clamp(u) * n);
      const c = pts[i], N = f.normals[i], B = f.binormals[i];
      out.set(
        c.x + (N.x * Math.cos(ang) + B.x * Math.sin(ang)) * r,
        c.y + (N.y * Math.cos(ang) + B.y * Math.sin(ang)) * r,
        c.z + (N.z * Math.cos(ang) + B.z * Math.sin(ang)) * r,
      );
      return out;
    },
    point: (u) => pts[Math.round(clamp(u) * n)],
    tangent: (u) => f.tangents[Math.round(clamp(u) * n)],
  };
}

function makePoints(count, color, size, tex, opacity = 1) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  const mat = new THREE.PointsMaterial({
    color,
    size,
    map: tex,
    transparent: true,
    opacity,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  return pts;
}
const HIDE = new THREE.Vector3(9999, 9999, 9999);

// ---------------------------------------------------------------- world
export function createWorld(canvas, W, H) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(1);
  renderer.setSize(W, H, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.localClippingEnabled = true;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const glow = glowTexture();
  const camera = new THREE.PerspectiveCamera(38, W / H, 0.01, 200);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3(), e3 = new THREE.Euler();
  const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();

  function newScene(bg, fogDensity, envIntensity = 0.6) {
    const s = new THREE.Scene();
    s.background = new THREE.Color(bg);
    if (fogDensity) s.fog = new THREE.FogExp2(bg, fogDensity);
    s.environment = env;
    s.environmentIntensity = envIntensity;
    return s;
  }
  function backdrop(scene, inner, outer, z = -30, size = 90) {
    const tex = canvasTex(512, 512, (g, w, h) => {
      const gr = g.createRadialGradient(w / 2, h * 0.45, 0, w / 2, h / 2, w * 0.7);
      gr.addColorStop(0, inner);
      gr.addColorStop(1, outer);
      g.fillStyle = gr;
      g.fillRect(0, 0, w, h);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 1.78), new THREE.MeshBasicMaterial({ map: tex, fog: false, depthWrite: false }));
    m.position.z = z;
    scene.add(m);
    return m;
  }
  const look = (px, py, pz, tx, ty, tz, roll = 0) => {
    camera.position.set(px, py, pz);
    camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    camera.lookAt(tx, ty, tz);
  };
  const setFov = (f) => {
    if (camera.fov !== f) {
      camera.fov = f;
      camera.updateProjectionMatrix();
    }
  };

  // ============================================================ CAN (shared)
  function buildCanGeometry() {
    const pts = [];
    const prof = [
      [0, -2.0], [0.55, -2.02], [0.8, -1.98], [0.95, -1.88], [1.0, -1.72],
    ];
    for (let i = 0; i < 30; i++) prof.push([1.0, -1.6 + (i / 29) * 3.05]);
    prof.push([0.97, 1.6], [0.9, 1.75], [0.84, 1.88], [0.84, 1.98], [0.865, 2.03], [0.84, 2.07], [0.79, 2.03], [0.77, 1.97]);
    for (const [r, y] of prof) pts.push(new THREE.Vector2(r, y));
    const g = new THREE.LatheGeometry(pts, 128);
    return { geo: g, n: prof.length };
  }
  const canG = buildCanGeometry();
  const vOf = (idx) => idx / (canG.n - 1);
  const canTex = canvasTex(2048, 1024, (g, w, h) => {
    const yOf = (v) => (1 - v) * h;
    g.fillStyle = "#b9bcc0";
    g.fillRect(0, 0, w, h);
    const top = yOf(vOf(34) + 0.004), bot = yOf(vOf(5) - 0.004);
    const gr = g.createLinearGradient(0, top, 0, bot);
    gr.addColorStop(0, "#c40f24");
    gr.addColorStop(0.5, "#d31227");
    gr.addColorStop(1, "#b30d20");
    g.fillStyle = gr;
    g.fillRect(0, top, w, bot - top);
    // white flowing ribbon (generic, no lettering)
    const mid = (top + bot) / 2 + 40;
    g.fillStyle = "#f6f4ef";
    g.beginPath();
    for (let x = 0; x <= w; x += 8) g.lineTo(x, mid + Math.sin((x / w) * Math.PI * 2) * 120 - 18 - Math.cos((x / w) * Math.PI * 4) * 10);
    for (let x = w; x >= 0; x -= 8) g.lineTo(x, mid + Math.sin((x / w) * Math.PI * 2 + 0.35) * 120 + 26 + Math.sin((x / w) * Math.PI * 6) * 8);
    g.closePath();
    g.fill();
    g.strokeStyle = "#f6f4ef";
    g.lineWidth = 7;
    g.beginPath();
    for (let x = 0; x <= w; x += 8) g.lineTo(x, mid + 70 + Math.sin((x / w) * Math.PI * 2 + 0.8) * 110);
    g.stroke();
    // fine brushed metal lines on the silver parts
    g.globalAlpha = 0.08;
    g.fillStyle = "#ffffff";
    for (let y = 0; y < top; y += 3) g.fillRect(0, y, w, 1);
    g.globalAlpha = 1;
  });
  const canMetal = canvasTex(
    256, 256,
    (g, w, h) => {
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, w, h);
      const top = (1 - vOf(34)) * h, bot = (1 - vOf(5)) * h;
      g.fillStyle = "#5a5a5a";
      g.fillRect(0, top, w, bot - top);
    },
    false,
  );
  const canMat = new THREE.MeshPhysicalMaterial({
    map: canTex, metalness: 1, metalnessMap: canMetal, roughness: 0.27, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.1, side: THREE.DoubleSide,
  });
  const silverMat = new THREE.MeshStandardMaterial({ color: "#c9ccd1", metalness: 1, roughness: 0.25 });
  const dropMat = new THREE.MeshPhysicalMaterial({ color: "#ffffff", roughness: 0.02, metalness: 0, transparent: true, opacity: 0.3, clearcoat: 1, envMapIntensity: 2.0 });

  function makeCan(withDetails) {
    const grp = new THREE.Group();
    const body = new THREE.Mesh(canG.geo, canMat);
    grp.add(body);
    if (!withDetails) return { grp };
    const lid = new THREE.Mesh(new THREE.CircleGeometry(0.775, 96), silverMat);
    lid.rotation.x = -Math.PI / 2;
    lid.position.y = 1.975;
    grp.add(lid);
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.2, 48), new THREE.MeshBasicMaterial({ color: "#070302" }));
    hole.rotation.x = -Math.PI / 2;
    hole.position.set(0, 1.98, 0.42);
    hole.scale.set(1.2, 0.8, 1);
    grp.add(hole);
    const tabPivot = new THREE.Group();
    tabPivot.position.set(0, 1.99, 0.05);
    const tab = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.025, 0.62), silverMat);
    tab.position.z = -0.18;
    tabPivot.add(tab);
    const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 24), silverMat);
    tabPivot.add(rivet);
    grp.add(tabPivot);
    // condensation droplets
    const rnd = mulberry32(7);
    const N = 900;
    const drops = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), dropMat, N);
    const dd = [];
    for (let i = 0; i < N; i++) dd.push({ a: rnd() * Math.PI * 2, y: -1.65 + rnd() * 3.2, s: 0.006 + Math.pow(rnd(), 3) * 0.022, slide: rnd() < 0.08 ? 0.15 + rnd() * 0.3 : 0 });
    grp.add(drops);
    return { grp, hole, tabPivot, drops, dd };
  }
  function updateCan(c, t, openAt) {
    const k = smooth(openAt, openAt + 0.25, t);
    c.tabPivot.rotation.x = -k * 1.15;
    c.hole.scale.set(1.2 * smooth(openAt + 0.05, openAt + 0.2, t) + 0.001, 0.8 * smooth(openAt + 0.05, openAt + 0.2, t) + 0.001, 1);
    for (let i = 0; i < c.dd.length; i++) {
      const d = c.dd[i];
      let y = d.y - d.slide * t;
      if (y < -1.65) y += 3.2;
      v3.set(Math.cos(d.a) * 1.003, y, Math.sin(d.a) * 1.003);
      s3.set(d.s * 0.7, d.s * (d.slide ? 1.6 : 1), d.s * 0.7);
      e3.set(0, -d.a, 0);
      q.setFromEuler(e3);
      m4.compose(v3, q, s3);
      c.drops.setMatrixAt(i, m4);
    }
    c.drops.instanceMatrix.needsUpdate = true;
  }

  // ============================================================ 1. CAN SCENE
  const sCan = newScene("#050203", 0, 0.7);
  backdrop(sCan, "#3a0508", "#040102", -14, 40);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(30, 64), new THREE.MeshStandardMaterial({ color: "#030202", roughness: 0.14, metalness: 0.9, envMapIntensity: 0.25 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.02;
  sCan.add(floor);
  const heroCan = makeCan(true);
  sCan.add(heroCan.grp);
  const key = new THREE.SpotLight("#ffe6cf", 260, 30, 0.55, 0.6);
  key.position.set(-4, 7, 5);
  sCan.add(key, key.target);
  const rimR = new THREE.PointLight("#ff2a2a", 90, 20);
  rimR.position.set(3.5, 2.5, -3);
  const rimT = new THREE.PointLight("#3fd0ff", 45, 20);
  rimT.position.set(-3.5, 1.5, -3);
  sCan.add(rimR, rimT, new THREE.AmbientLight("#ffffff", 0.05));
  // fizz + mist
  const FZ = 420;
  const fizz = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshPhysicalMaterial({ color: "#f4e7d6", roughness: 0.05, transparent: true, opacity: 0.7, clearcoat: 1 }), FZ);
  fizz.frustumCulled = false;
  sCan.add(fizz);
  const mist = makePoints(160, "#ffffff", 0.9, glow, 0.16);
  mist.material.blending = THREE.NormalBlending;
  sCan.add(mist);
  // sugar cubes
  const cubeMat = new THREE.MeshPhysicalMaterial({ color: "#f3f0e8", roughness: 0.75, sheen: 0.6, sheenColor: new THREE.Color("#ffffff"), bumpMap: tissueTexture(5, "#bbbbbb", "#777777", "#ffffff", false), bumpScale: 2 });
  const cubes = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.5, 0.5, 2, 2, 2), cubeMat, 9);
  cubes.frustumCulled = false;
  sCan.add(cubes);
  const cubeSlots = [];
  for (let i = 0; i < 4; i++) cubeSlots.push([(i % 2) * 0.53, -1.77, Math.floor(i / 2) * 0.53]);
  for (let i = 0; i < 3; i++) cubeSlots.push([[0.27, 0, 0.53][i], -1.24, [0.27, 0.53, 0][i] * 0.9]);
  cubeSlots.push([0.27, -0.71, 0.27], [0.15, -0.18, 0.2]);
  // pour stream (POV drink)
  const PS = 260;
  const pour = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshPhysicalMaterial({ color: "#2a1006", roughness: 0.04, clearcoat: 1, transparent: true, opacity: 0.92 }), PS);
  pour.frustumCulled = false;
  sCan.add(pour);

  function updateCanScene(t, final) {
    setFov(36);
    const openAt = final ? -10 : 0.75;
    updateCan(heroCan, t, openAt);
    // fizz particles burst after opening
    const lidWorld = tmp.set(0, 2.0, 0.42);
    heroCan.grp.localToWorld(lidWorld);
    for (let i = 0; i < FZ; i++) {
      const life = 0.5 + hash1(i) * 0.9;
      const birth = openAt + (i / FZ) * 3.2;
      const age = t - birth;
      const active = !final && age > 0 && age < life && t < 6.8;
      if (!active) {
        m4.compose(HIDE, q.identity(), s3.set(0, 0, 0));
      } else {
        const a = hash1(i + 3) * Math.PI * 2, sp = 0.15 + hash1(i + 9) * 0.5;
        const burst = Math.exp(-(birth - openAt) * 1.2);
        v3.set(lidWorld.x + Math.cos(a) * sp * age, lidWorld.y + age * (0.8 + 2.2 * burst) - 0.6 * age * age, lidWorld.z + Math.sin(a) * sp * age);
        const s = (0.008 + hash1(i + 5) * 0.03) * (1 - age / life);
        m4.compose(v3, q.identity(), s3.set(s, s, s));
      }
      fizz.setMatrixAt(i, m4);
    }
    fizz.instanceMatrix.needsUpdate = true;
    const mp = mist.geometry.attributes.position;
    for (let i = 0; i < 160; i++) {
      const age = t - openAt - hash1(i + 50) * 1.2;
      if (final || age < 0 || age > 2.2) {
        mp.setXYZ(i, HIDE.x, HIDE.y, HIDE.z);
        continue;
      }
      const a = hash1(i + 77) * Math.PI * 2;
      mp.setXYZ(i, lidWorld.x + Math.cos(a) * age * 0.35, lidWorld.y + age * 0.55, lidWorld.z + Math.sin(a) * age * 0.35);
    }
    mp.needsUpdate = true;
    mist.material.opacity = 0.14 * (1 - smooth(1.5, 3.5, t - openAt));

    // sugar cubes fall 5.4 -> 7.4
    for (let i = 0; i < 9; i++) {
      const tl = 5.45 + i * 0.2;
      const k = clamp((t - tl) / 0.45);
      const slot = cubeSlots[i];
      if (final || t < tl) {
        m4.compose(HIDE, q.identity(), s3.set(0, 0, 0));
      } else {
        const fall = 1 - easeOut(k);
        const bounce = k >= 1 ? Math.abs(Math.sin((t - tl - 0.45) * 14)) * Math.exp(-(t - tl - 0.45) * 9) * 0.12 : 0;
        v3.set(2.1 + slot[0], slot[1] + fall * 6 + bounce, 0.4 + slot[2]);
        e3.set(fall * 2.5 + i, fall * 1.7 + i * 0.4, 0);
        q.setFromEuler(e3);
        m4.compose(v3, q, s3.set(1, 1, 1));
      }
      cubes.setMatrixAt(i, m4);
    }
    cubes.instanceMatrix.needsUpdate = true;

    // tilt + pour toward camera 6.9 -> 7.9
    const tilt = final ? 0 : easeInOut(smooth(6.75, 7.6, t));
    heroCan.grp.rotation.set(tilt * 1.55, 0, 0);
    heroCan.grp.position.set(0, tilt * 1.2, tilt * 0.6);
    heroCan.grp.updateMatrixWorld();
    const mouth = tmp2.set(0, 2.05, 0.55);
    heroCan.grp.localToWorld(mouth);
    for (let i = 0; i < PS; i++) {
      const age = t - 7.05 - (i / PS) * 0.9;
      if (final || age < 0 || age > 0.7) {
        m4.compose(HIDE, q.identity(), s3.set(0, 0, 0));
      } else {
        const j = (hash1(i + 1) - 0.5) * 0.12;
        v3.set(mouth.x + j, mouth.y + j * 0.5 - age * age * 1.2, mouth.z + age * 7.0);
        const s = 0.05 + hash1(i + 2) * 0.09;
        m4.compose(v3, q.identity(), s3.set(s, s * 1.4, s));
      }
      pour.setMatrixAt(i, m4);
    }
    pour.instanceMatrix.needsUpdate = true;

    if (final) {
      // 42.6 -> 46 : the lone can, slow push
      const k = smooth(0, 3.4, t);
      key.intensity = 300;
      rimR.intensity = 120 + Math.sin(t * 2.2) * 15;
      rimT.intensity = 30;
      look(lerp(1.2, 0.4, k), lerp(1.4, 1.1, k), lerp(15.0, 13.5, k), 0, 2.1, 0);
      return;
    }
    key.intensity = 260;
    rimR.intensity = 90;
    rimT.intensity = 45;
    // camera: hero (0-4.6) -> wide with cubes (4.8-6.8) -> pov approach (6.8-7.9)
    const a = lerp(-0.25, 0.35, smooth(0, 4.6, t));
    const r0 = lerp(13.2, 11.4, smooth(0, 4.6, t));
    let px = Math.sin(a) * r0, pz = Math.cos(a) * r0, py = lerp(1.9, 1.4, smooth(0, 4.6, t));
    let tx = 0, ty = 1.7, tz = 0;
    const w = easeInOut(smooth(4.7, 5.6, t));
    px = lerp(px, 1.6, w); py = lerp(py, 1.2, w); pz = lerp(pz, 12.5, w); tx = lerp(tx, 1.2, w); ty = lerp(ty, 1.4, w);
    const pv = easeInOut(smooth(6.75, 7.9, t));
    px = lerp(px, 0.0, pv); py = lerp(py, 2.4, pv); pz = lerp(pz, 4.4, pv); tx = lerp(tx, 0, pv); ty = lerp(ty, 2.6, pv); tz = lerp(tz, 1.4, pv);
    look(px, py, pz, tx, ty, tz);
  }

  // ============================================================ 2. ESOPHAGUS
  const sEso = newScene("#120304", 0.12, 0.35);
  const esoCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 6, 0), new THREE.Vector3(0.4, 3, 0.3), new THREE.Vector3(-0.3, 0, -0.2), new THREE.Vector3(0.3, -3, 0.2), new THREE.Vector3(0, -6, 0), new THREE.Vector3(-0.4, -9, 0.3),
  ]);
  const esoTex = tissueTexture(11, "#b8545a", "#6e1b24", "#e59a98");
  esoTex.wrapS = esoTex.wrapT = THREE.RepeatWrapping;
  esoTex.repeat.set(2, 10);
  const esoMat = new THREE.MeshPhysicalMaterial({ color: "#e88f8f", map: esoTex, bumpMap: esoTex, bumpScale: 3, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.15, side: THREE.BackSide, sheen: 0.5, sheenColor: new THREE.Color("#ffb0b0") });
  const esoR = (u, ang, c, v) => 0.9 + 0.14 * fbm(c.x * 2 + v.x * 3, c.y * 2 + v.y * 3, c.z * 2 + v.z * 3) + 0.06 * Math.sin(ang * 7 + u * 40);
  const eso = makeTube(esoCurve, 260, 48, esoR);
  sEso.add(new THREE.Mesh(eso.geo, esoMat));
  const esoFr = curveFrames(esoCurve);
  const headlamp = new THREE.PointLight("#fff1e6", 25, 9, 1.6);
  sEso.add(headlamp, new THREE.AmbientLight("#ff8080", 0.15));
  const EB = 520;
  const esoBlob = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshPhysicalMaterial({ color: "#2b1107", roughness: 0.05, clearcoat: 1, transmission: 0, transparent: true, opacity: 0.9 }), EB);
  esoBlob.frustumCulled = false;
  sEso.add(esoBlob);
  const esoBub = makePoints(400, "#ffd9a8", 0.06, glow, 0.9);
  sEso.add(esoBub);
  function updateEso(lt) {
    setFov(70);
    eso.deform((u, ang, c, v) => esoR(u, ang, c, v) * (1 - 0.22 * Math.pow(Math.max(0, Math.sin(u * 22 - lt * 9)), 6)));
    const cu = 0.03 + easeInOut(lt / 1.6) * 0.62;
    const cp = esoFr.point(cu), ct = esoFr.point(cu + 0.04);
    look(cp.x, cp.y, cp.z, ct.x, ct.y, ct.z, lt * 0.5);
    headlamp.position.copy(cp);
    for (let i = 0; i < EB; i++) {
      const u = cu + 0.05 + ((hash1(i) * 0.5 + lt * 0.08) % 0.5);
      esoFr.at(u, hash1(i + 4) * Math.PI * 2, Math.sqrt(hash1(i + 8)) * 0.55, v3);
      const s = 0.025 + hash1(i + 6) * 0.07;
      m4.compose(v3, q.identity(), s3.set(s, s * 1.5, s));
      esoBlob.setMatrixAt(i, m4);
    }
    esoBlob.instanceMatrix.needsUpdate = true;
    const bp = esoBub.geometry.attributes.position;
    for (let i = 0; i < 400; i++) {
      const u = cu + 0.01 + ((hash1(i + 90) * 0.4 + lt * 0.12) % 0.4);
      esoFr.at(u, hash1(i + 91) * Math.PI * 2, Math.sqrt(hash1(i + 92)) * 0.7, v3);
      bp.setXYZ(i, v3.x, v3.y, v3.z);
    }
    bp.needsUpdate = true;
  }

  // ============================================================ 3. STOMACH
  const sSto = newScene("#07090d", 0.025, 0.8);
  backdrop(sSto, "#3b0d14", "#040507", -18, 60);
  const stoCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.6, 4.2, 0), new THREE.Vector3(0.2, 2.6, 0.1), new THREE.Vector3(-1.0, 1.6, 0), new THREE.Vector3(-1.4, 0.0, 0.1), new THREE.Vector3(-0.8, -1.6, 0),
    new THREE.Vector3(0.6, -2.1, 0), new THREE.Vector3(1.8, -1.2, 0), new THREE.Vector3(2.3, -0.2, 0), new THREE.Vector3(2.9, 0.1, 0.2), new THREE.Vector3(3.5, -0.6, 0.4), new THREE.Vector3(3.6, -2.4, 0.5),
  ]);
  const stoRadius = (u) => {
    const pts = [[0, 0.32], [0.1, 0.4], [0.22, 1.25], [0.36, 1.45], [0.5, 1.2], [0.64, 0.85], [0.74, 0.55], [0.79, 0.24], [0.83, 0.34], [1, 0.36]];
    for (let i = 1; i < pts.length; i++) if (u <= pts[i][0]) {
      const k = (u - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]);
      return lerp(pts[i - 1][1], pts[i][1], k * k * (3 - 2 * k));
    }
    return 0.36;
  };
  const stoTex = tissueTexture(21, "#d98a86", "#8f2f3a", "#f6c2b8");
  stoTex.wrapS = stoTex.wrapT = THREE.RepeatWrapping;
  stoTex.repeat.set(2, 4);
  const sto = makeTube(stoCurve, 240, 72, (u, ang, c, v) => stoRadius(u) * (1 + 0.06 * fbm(c.x * 3 + v.x * 2, c.y * 3 + v.y * 2, v.z * 4) + 0.025 * Math.sin(u * 140 + ang * 2)));
  const stoMat = new THREE.MeshPhysicalMaterial({ color: "#f0a3a0", map: stoTex, bumpMap: stoTex, bumpScale: 2.5, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.2, transparent: true, opacity: 0.42, depthWrite: false, side: THREE.DoubleSide, sheen: 0.8, sheenColor: new THREE.Color("#ffc4c4") });
  const stoMesh = new THREE.Mesh(sto.geo, stoMat);
  stoMesh.renderOrder = 2;
  sSto.add(stoMesh);
  const levelPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
  const liq = makeTube(stoCurve, 160, 48, (u) => stoRadius(u) * 0.86);
  const liqMat = new THREE.MeshPhysicalMaterial({ color: "#3a1608", roughness: 0.08, clearcoat: 1, transparent: true, opacity: 0.9, emissive: "#3a1200", emissiveIntensity: 0.4, clippingPlanes: [levelPlane], side: THREE.DoubleSide });
  const liqMesh = new THREE.Mesh(liq.geo, liqMat);
  liqMesh.renderOrder = 1;
  sSto.add(liqMesh);
  const stoFr = curveFrames(stoCurve);
  const stoBub = makePoints(500, "#ffcf8a", 0.07, glow, 0.9);
  sSto.add(stoBub);
  const stoFlow = makePoints(400, "#ffb347", 0.12, glow, 1);
  sSto.add(stoFlow);
  const stKey = new THREE.DirectionalLight("#ffe2d0", 2.4);
  stKey.position.set(-3, 5, 6);
  const stRim = new THREE.PointLight("#ff3b3b", 60, 20);
  stRim.position.set(3, 1, -3);
  const stRim2 = new THREE.PointLight("#4bd2ff", 30, 20);
  stRim2.position.set(-4, -2, -2);
  sSto.add(stKey, stRim, stRim2, new THREE.AmbientLight("#ffffff", 0.08));
  function updateSto(lt) {
    setFov(38);
    const level = lerp(-2.2, -0.4, smooth(0.2, 2.2, lt)) - smooth(2.8, 5.0, lt) * 1.0;
    levelPlane.constant = level;
    const a = lerp(-0.5, 0.45, smooth(0, 5, lt));
    const r = lerp(15, 12.5, smooth(0, 4, lt));
    let px = 0.9 + Math.sin(a) * r, py = 0.4 + lerp(1.0, -0.2, smooth(0, 5, lt)), pz = Math.cos(a) * r;
    let tx = 0.9, ty = 0.2, tz = 0;
    const z = easeInOut(smooth(4.2, 5.1, lt));
    px = lerp(px, 3.0, z); py = lerp(py, 0.1, z); pz = lerp(pz, 2.2, z); tx = lerp(tx, 3.5, z); ty = lerp(ty, -1.2, z);
    look(px, py, pz, tx, ty, tz);
    const bp = stoBub.geometry.attributes.position;
    for (let i = 0; i < 500; i++) {
      const u = 0.18 + hash1(i) * 0.5;
      const c = stoFr.point(u);
      const rr = stoRadius(u) * 0.75 * Math.sqrt(hash1(i + 1));
      const ang = hash1(i + 2) * Math.PI * 2;
      const rise = (hash1(i + 3) * 3 + lt * (0.4 + hash1(i + 4) * 0.6)) % 3;
      const y = c.y - 1.2 + rise;
      if (y > level || lt < 0.3) bp.setXYZ(i, HIDE.x, HIDE.y, HIDE.z);
      else bp.setXYZ(i, c.x + Math.cos(ang) * rr, y, c.z + Math.sin(ang) * rr);
    }
    bp.needsUpdate = true;
    const fp = stoFlow.geometry.attributes.position;
    for (let i = 0; i < 400; i++) {
      // inflow (u 0->0.25) early, outflow through pylorus (u 0.7->1) later
      let u, on;
      if (i < 150) {
        u = ((hash1(i + 20) + lt * 0.5) % 1) * 0.28;
        on = lt < 2.4;
      } else {
        u = 0.7 + ((hash1(i + 20) + lt * 0.35) % 1) * 0.3;
        on = lt > 1.9;
      }
      if (!on) {
        fp.setXYZ(i, HIDE.x, HIDE.y, HIDE.z);
        continue;
      }
      stoFr.at(u, hash1(i + 21) * 6.28, stoRadius(u) * 0.55 * Math.sqrt(hash1(i + 22)), v3);
      fp.setXYZ(i, v3.x, v3.y, v3.z);
    }
    fp.needsUpdate = true;
  }

  // ============================================================ 4. VILLI
  const sVil = newScene("#1a0508", 0.11, 0.5);
  const vilTex = tissueTexture(31, "#c9585e", "#7a1d2a", "#f0a0a0", false);
  const vilMat = new THREE.MeshPhysicalMaterial({ color: "#f39a9a", map: vilTex, roughness: 0.45, sheen: 1, sheenColor: new THREE.Color("#ffc0c0"), sheenRoughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.3, emissive: "#3a0508", emissiveIntensity: 0.3 });
  const VN = 1100;
  const villi = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.11, 0.9, 6, 14).translate(0, 0.55, 0), vilMat, VN);
  const vil = [];
  {
    const rnd = mulberry32(3);
    for (let i = 0; i < VN; i++) {
      const x = (rnd() - 0.5) * 9, z = -rnd() * 26 + 3;
      vil.push({ x, z, y: 0.25 * Math.sin(x * 0.7) + 0.2 * Math.sin(z * 0.5), s: 0.8 + rnd() * 0.5, ph: rnd() * 6.28 });
    }
  }
  sVil.add(villi);
  const vfloor = new THREE.Mesh(new THREE.PlaneGeometry(12, 32, 60, 120), vilMat);
  vfloor.rotation.x = -Math.PI / 2;
  vfloor.position.z = -10;
  {
    const p = vfloor.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      p.setZ(i, 0.25 * Math.sin(x * 0.7) + 0.2 * Math.sin(-y * 0.5 + 10 * 0.5) - 0.05);
    }
    vfloor.geometry.computeVertexNormals();
  }
  sVil.add(vfloor);
  const vilSugar = makePoints(900, "#ffb12e", 0.11, glow, 1);
  sVil.add(vilSugar);
  const vKey = new THREE.DirectionalLight("#ffd9c8", 2.0);
  vKey.position.set(-2, 6, 3);
  const vRim = new THREE.PointLight("#ff6a3a", 40, 12);
  sVil.add(vKey, vRim, new THREE.AmbientLight("#ff9090", 0.15));
  function updateVil(lt) {
    setFov(55);
    for (let i = 0; i < VN; i++) {
      const d = vil[i];
      e3.set(Math.sin(lt * 1.6 + d.ph) * 0.12, 0, Math.cos(lt * 1.3 + d.ph) * 0.12);
      q.setFromEuler(e3);
      m4.compose(v3.set(d.x, d.y, d.z), q, s3.set(d.s, d.s, d.s));
      villi.setMatrixAt(i, m4);
    }
    villi.instanceMatrix.needsUpdate = true;
    const k = easeInOut(lt / 3.0);
    const cz = lerp(3.5, -9, k);
    const dive = smooth(2.4, 3.0, lt);
    look(0.2, lerp(2.2, 1.6, k) - dive * 1.7, cz, 0, lerp(0.6, 0.4, k) - dive * 2.5, cz - 4);
    vRim.position.set(0, 2, cz - 3);
    const sp = vilSugar.geometry.attributes.position;
    for (let i = 0; i < 900; i++) {
      const x = (hash1(i) - 0.5) * 8, z = cz - 1 - hash1(i + 1) * 12;
      const fall = (hash1(i + 2) * 3 + lt * (0.7 + hash1(i + 3))) % 3;
      sp.setXYZ(i, x + Math.sin(lt + i) * 0.1, 3.1 - fall * 1.1, z);
    }
    sp.needsUpdate = true;
  }

  // ============================================================ 5. BLOOD VESSEL
  const sVes = newScene("#2a0204", 0.09, 0.05);
  const vesCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 10), new THREE.Vector3(0.8, 0.4, 3), new THREE.Vector3(-0.6, -0.3, -4), new THREE.Vector3(0.7, 0.5, -11), new THREE.Vector3(-0.4, 0, -18), new THREE.Vector3(0, 0.3, -25),
  ]);
  const vesTex = tissueTexture(41, "#8e1a20", "#4a060c", "#d0505a");
  vesTex.wrapS = vesTex.wrapT = THREE.RepeatWrapping;
  vesTex.repeat.set(2, 8);
  const vesMat = new THREE.MeshPhysicalMaterial({ color: "#c43a3f", map: vesTex, bumpMap: vesTex, bumpScale: 2, roughness: 0.45, clearcoat: 0.3, clearcoatRoughness: 0.4, envMapIntensity: 0.1, side: THREE.BackSide, emissive: "#3a0003", emissiveIntensity: 0.35 });
  const vesR = (u, ang, c, v) => 1.6 + 0.12 * fbm(c.x + v.x * 2, c.y + v.y * 2, c.z * 0.6);
  const ves = makeTube(vesCurve, 220, 48, vesR);
  sVes.add(new THREE.Mesh(ves.geo, vesMat));
  const vesFr = curveFrames(vesCurve);
  const rbcPts = [];
  for (let i = 0; i <= 24; i++) {
    const r = i / 24;
    const z = Math.sqrt(Math.max(0, 1 - r * r)) * (0.207 + 2.003 * r * r - 1.123 * r * r * r * r) * 0.5;
    rbcPts.push(new THREE.Vector2(r, z + 0.02));
  }
  for (let i = 24; i >= 0; i--) {
    const r = i / 24;
    const z = Math.sqrt(Math.max(0, 1 - r * r)) * (0.207 + 2.003 * r * r - 1.123 * r * r * r * r) * 0.5;
    rbcPts.push(new THREE.Vector2(r, -z - 0.02));
  }
  const rbcGeo = new THREE.LatheGeometry(rbcPts, 40);
  rbcGeo.computeVertexNormals();
  const rbcMat = new THREE.MeshPhysicalMaterial({ color: "#c0141c", roughness: 0.32, clearcoat: 0.7, clearcoatRoughness: 0.3, sheen: 0.6, sheenColor: new THREE.Color("#ff6060"), emissive: "#300003", emissiveIntensity: 0.5, side: THREE.DoubleSide });
  const RN = 340;
  const rbc = new THREE.InstancedMesh(rbcGeo, rbcMat, RN);
  rbc.frustumCulled = false;
  sVes.add(rbc);
  const vesSugar = makePoints(1600, "#ffb52e", 0.1, glow, 1);
  sVes.add(vesSugar);
  const vLamp = new THREE.PointLight("#ffe0d0", 3.5, 10, 1.5);
  sVes.add(vLamp, new THREE.AmbientLight("#ff5050", 0.15));
  function flowAlong(fr, mesh, n, lt, cu, speed, radius, scale, seed, plaqueMode) {
    for (let i = 0; i < n; i++) {
      const u = cu + 0.025 + ((hash1(i + seed) * 0.45 + lt * speed * (0.7 + hash1(i + seed + 1) * 0.6)) % 0.45);
      fr.at(u, hash1(i + seed + 2) * 6.28 + lt * 0.3, Math.sqrt(hash1(i + seed + 3)) * radius, v3);
      e3.set(hash1(i + seed + 4) * 6 + lt * 1.5, hash1(i + seed + 5) * 6 + lt, hash1(i + seed + 6) * 6);
      q.setFromEuler(e3);
      const s = scale * (0.85 + hash1(i + seed + 7) * 0.3);
      m4.compose(v3, q, s3.set(s, s, s));
      mesh.setMatrixAt(i, m4);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }
  function updateVes(lt) {
    setFov(62);
    const cu = 0.02 + lt * 0.11;
    const cp = vesFr.point(cu), ct = vesFr.point(cu + 0.05);
    look(cp.x, cp.y, cp.z, ct.x, ct.y, ct.z, Math.sin(lt * 0.8) * 0.2);
    vLamp.position.copy(cp);
    flowAlong(vesFr, rbc, RN, lt, cu, 0.035, 1.25, 0.33, 100);
    const sp = vesSugar.geometry.attributes.position;
    const dens = lerp(0.18, 1, smooth(0.3, 2.4, lt));
    for (let i = 0; i < 1600; i++) {
      if (i / 1600 > dens) {
        sp.setXYZ(i, HIDE.x, HIDE.y, HIDE.z);
        continue;
      }
      const u = cu + ((hash1(i + 500) * 0.4 + lt * 0.05) % 0.4);
      vesFr.at(u, hash1(i + 501) * 6.28 + lt * 0.4, Math.sqrt(hash1(i + 502)) * 1.4, v3);
      sp.setXYZ(i, v3.x, v3.y, v3.z);
    }
    sp.needsUpdate = true;
  }

  // ============================================================ 6. PANCREAS
  const sPan = newScene("#04090c", 0.03, 0.8);
  backdrop(sPan, "#0c3240", "#020405", -16, 60);
  const panCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.6, -1.2, 0.3), new THREE.Vector3(-2.2, -0.2, 0.2), new THREE.Vector3(-1.2, 0.3, 0), new THREE.Vector3(0.4, 0.5, -0.2), new THREE.Vector3(1.8, 0.9, -0.3), new THREE.Vector3(2.9, 1.5, -0.2),
  ]);
  const panR = (u) => lerp(0.85, 0.22, smooth(0.0, 1.0, u)) * (u < 0.15 ? 0.85 + u : 1);
  const pan = makeTube(panCurve, 200, 64, (u, ang, c, v) => {
    const lob = Math.abs(vnoise(c.x * 4 + v.x * 3, c.y * 4 + v.y * 3, c.z * 4 + v.z * 3) - 0.5);
    return panR(u) * (0.92 + 0.1 * fbm(c.x * 2 + v.x, c.y * 2 + v.y, c.z * 2 + v.z) - lob * 0.12);
  });
  const panTex = tissueTexture(51, "#e2a98c", "#a8644e", "#f6d2bb", false);
  const panMat = new THREE.MeshPhysicalMaterial({ color: "#f0b99e", map: panTex, bumpMap: panTex, bumpScale: 4, roughness: 0.5, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.7, sheenColor: new THREE.Color("#ffd8c8"), emissive: "#ff2020", emissiveIntensity: 0 });
  const panMesh = new THREE.Mesh(pan.geo, panMat);
  sPan.add(panMesh);
  const duoCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.4, 1.4, 0.4), new THREE.Vector3(-2.6, 1.1, 0.6), new THREE.Vector3(-3.6, -0.4, 0.6), new THREE.Vector3(-3.0, -2.2, 0.5), new THREE.Vector3(-1.2, -2.4, 0.4), new THREE.Vector3(0.2, -1.8, 0.4),
  ]);
  const duo = makeTube(duoCurve, 120, 40, (u, ang, c, v) => 0.42 + 0.05 * Math.sin(u * 60));
  sPan.add(new THREE.Mesh(duo.geo, new THREE.MeshPhysicalMaterial({ color: "#e48d77", map: stoTex, bumpMap: stoTex, bumpScale: 2, roughness: 0.35, clearcoat: 1 })));
  const artCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-3, 2.6, -0.6), new THREE.Vector3(-0.5, 1.4, 0.7), new THREE.Vector3(1.8, 1.7, 0.4), new THREE.Vector3(3.4, 2.2, 0.1)]);
  sPan.add(new THREE.Mesh(new THREE.TubeGeometry(artCurve, 80, 0.13, 16), new THREE.MeshPhysicalMaterial({ color: "#b3141e", roughness: 0.3, clearcoat: 1 })));
  const veinCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(-3, -0.2, -0.9), new THREE.Vector3(-0.5, -0.4, -0.8), new THREE.Vector3(1.8, 0.2, -0.8), new THREE.Vector3(3.4, 0.9, -0.7)]);
  sPan.add(new THREE.Mesh(new THREE.TubeGeometry(veinCurve, 80, 0.15, 16), new THREE.MeshPhysicalMaterial({ color: "#3b4fa8", roughness: 0.3, clearcoat: 1 })));
  const pKey = new THREE.DirectionalLight("#fff0e0", 2.6);
  pKey.position.set(-3, 5, 6);
  const pRim = new THREE.PointLight("#36d6ff", 70, 20);
  pRim.position.set(3, 3, -3);
  const pAlarm = new THREE.PointLight("#ff2020", 0, 14);
  pAlarm.position.set(0, 1, 2.5);
  sPan.add(pKey, pRim, pAlarm, new THREE.AmbientLight("#ffffff", 0.06));
  const panSugar = makePoints(600, "#ffb12e", 0.1, glow, 1);
  sPan.add(panSugar);
  function updatePan(lt) {
    setFov(38);
    const pulse = Math.pow(Math.max(0, Math.sin(lt * 7.5)), 4) * smooth(0, 0.3, lt);
    panMat.emissiveIntensity = pulse * 0.35;
    pAlarm.intensity = pulse * 80;
    const k = easeInOut(smooth(0, 2.0, lt));
    look(lerp(-1.0, 0.2, k), lerp(3.0, 1.4, k), lerp(16, 8.5, k), lerp(-0.3, 0.0, k), lerp(0.4, 0.1, k), 0);
    const sp = panSugar.geometry.attributes.position;
    for (let i = 0; i < 600; i++) {
      const u = (hash1(i + 3) + lt * 0.15) % 1;
      const p = artCurve.getPointAt(u);
      sp.setXYZ(i, p.x + (hash1(i) - 0.5) * 0.5, p.y + (hash1(i + 1) - 0.5) * 0.5, p.z + (hash1(i + 2) - 0.5) * 0.5);
    }
    sp.needsUpdate = true;
  }

  // ============================================================ 7. ISLET
  const sIsl = newScene("#03060c", 0.05, 0.6);
  backdrop(sIsl, "#0b2a4a", "#010205", -14, 50);
  const cellGeo = displace(new THREE.IcosahedronGeometry(1, 5), (x, y, z) => (fbm(x * 2, y * 2, z * 2) - 0.5) * 0.25);
  const acMat = new THREE.MeshPhysicalMaterial({ color: "#d88c7c", roughness: 0.4, clearcoat: 0.8, sheen: 0.8, sheenColor: new THREE.Color("#ffc8b8"), transparent: true, opacity: 0.92 });
  const betaMat = new THREE.MeshPhysicalMaterial({ color: "#9ec8ff", roughness: 0.25, clearcoat: 1, emissive: "#2a7dff", emissiveIntensity: 0.5, transparent: true, opacity: 0.9 });
  const AC = 90, BC = 70;
  const acini = new THREE.InstancedMesh(cellGeo, acMat, AC);
  const betas = new THREE.InstancedMesh(cellGeo, betaMat, BC);
  {
    const rnd = mulberry32(17);
    for (let i = 0; i < BC; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / BC), th = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 1.4 * Math.cbrt(rnd() * 0.6 + 0.4);
      m4.compose(v3.set(Math.sin(phi) * Math.cos(th) * r, Math.cos(phi) * r, Math.sin(phi) * Math.sin(th) * r), q.identity(), s3.setScalar(0.32 + rnd() * 0.08));
      betas.setMatrixAt(i, m4);
    }
    for (let i = 0; i < AC; i++) {
      const phi = Math.acos(1 - (2 * (i + 0.5)) / AC), th = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 3.0 + rnd() * 1.4;
      m4.compose(v3.set(Math.sin(phi) * Math.cos(th) * r, Math.cos(phi) * r, Math.sin(phi) * Math.sin(th) * r), q.identity(), s3.setScalar(0.3 + rnd() * 0.1));
      acini.setMatrixAt(i, m4);
    }
  }
  sIsl.add(acini, betas);
  const insulin = makePoints(1400, "#7fd0ff", 0.09, glow, 1);
  sIsl.add(insulin);
  const iKey = new THREE.DirectionalLight("#ffffff", 2.0);
  iKey.position.set(-3, 4, 6);
  const iCore = new THREE.PointLight("#3d8bff", 40, 10);
  sIsl.add(iKey, iCore, new THREE.AmbientLight("#9bbcff", 0.1));
  function updateIsl(lt) {
    setFov(42);
    const pulse = 0.5 + 0.5 * Math.sin(lt * 9);
    betaMat.emissiveIntensity = 0.4 + pulse * 0.9 * smooth(0, 0.3, lt);
    iCore.intensity = 30 + pulse * 40;
    const a = lt * 0.35 + 0.3;
    const r = lerp(9, 12, easeOut(lt / 1.4));
    look(Math.sin(a) * r, 1.2, Math.cos(a) * r, 0, 0, 0);
    const ip = insulin.geometry.attributes.position;
    for (let i = 0; i < 1400; i++) {
      const age = lt - hash1(i) * 0.9;
      if (age < 0) {
        ip.setXYZ(i, HIDE.x, HIDE.y, HIDE.z);
        continue;
      }
      const phi = Math.acos(2 * hash1(i + 1) - 1), th = hash1(i + 2) * 6.28;
      const rr = 1.0 + age * (2.5 + hash1(i + 3) * 3);
      ip.setXYZ(i, Math.sin(phi) * Math.cos(th) * rr, Math.cos(phi) * rr, Math.sin(phi) * Math.sin(th) * rr);
    }
    ip.needsUpdate = true;
  }

  // ============================================================ 8. CELL (insulin -> uptake -> fat) + diabetes variant
  const sCell = newScene("#05040a", 0.035, 0.6);
  backdrop(sCell, "#2a1036", "#030206", -16, 60);
  const memGeo = displace(new THREE.IcosahedronGeometry(2.6, 6), (x, y, z) => (fbm(x * 0.9, y * 0.9, z * 0.9) - 0.5) * 0.5);
  const memMat = new THREE.MeshPhysicalMaterial({ color: "#f2a37a", roughness: 0.25, clearcoat: 1, transparent: true, opacity: 0.38, depthWrite: false, side: THREE.DoubleSide, sheen: 1, sheenColor: new THREE.Color("#ffd2b0"), emissive: "#401000", emissiveIntensity: 0.3 });
  const mem = new THREE.Mesh(memGeo, memMat);
  mem.renderOrder = 3;
  sCell.add(mem);
  const nucleus = new THREE.Mesh(displace(new THREE.IcosahedronGeometry(0.9, 5), (x, y, z) => (fbm(x * 3, y * 3, z * 3) - 0.5) * 0.15), new THREE.MeshPhysicalMaterial({ color: "#7b3fa0", roughness: 0.3, clearcoat: 1, emissive: "#2a0a40", emissiveIntensity: 0.5 }));
  nucleus.position.set(-0.6, -0.3, -0.4);
  sCell.add(nucleus);
  const RC = 46;
  const recMat = new THREE.MeshPhysicalMaterial({ color: "#7ad0ff", roughness: 0.2, clearcoat: 1, emissive: "#1c78ff", emissiveIntensity: 0.2 });
  const receptors = new THREE.InstancedMesh(new THREE.TorusGeometry(0.16, 0.06, 12, 24), recMat, RC);
  const recPos = [];
  for (let i = 0; i < RC; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / RC), th = Math.PI * (1 + Math.sqrt(5)) * i;
    const p = new THREE.Vector3(Math.sin(phi) * Math.cos(th), Math.cos(phi), Math.sin(phi) * Math.sin(th)).multiplyScalar(2.62);
    recPos.push(p);
    q.setFromUnitVectors(new THREE.Vector3(0, 0, 1), p.clone().normalize());
    m4.compose(p, q, s3.setScalar(1));
    receptors.setMatrixAt(i, m4);
  }
  sCell.add(receptors);
  const fatMat = new THREE.MeshPhysicalMaterial({ color: "#ffd04a", roughness: 0.12, clearcoat: 1, emissive: "#a06000", emissiveIntensity: 0.45, transparent: true, opacity: 0.95 });
  const FD = 14;
  const fats = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 32, 24), fatMat, FD);
  fats.frustumCulled = false;
  sCell.add(fats);
  const cellIns = makePoints(RC * 4, "#86d6ff", 0.16, glow, 1);
  const cellSug = makePoints(900, "#ffb02a", 0.12, glow, 1);
  sCell.add(cellIns, cellSug);
  const cKey = new THREE.DirectionalLight("#ffffff", 2.2);
  cKey.position.set(-4, 5, 6);
  const cRim = new THREE.PointLight("#c050ff", 60, 20);
  cRim.position.set(4, 2, -4);
  const cIn = new THREE.PointLight("#ffb040", 0, 8);
  const cWarn = new THREE.PointLight("#ff1a1a", 0, 20);
  cWarn.position.set(0, 3, 5);
  sCell.add(cKey, cRim, cIn, cWarn, new THREE.AmbientLight("#ffffff", 0.06));
  function updateCell(lt, diab) {
    setFov(42);
    const dock = diab ? 1 : easeOut(smooth(0.0, 0.9, lt));
    recMat.emissiveIntensity = diab ? 0.05 : 0.2 + dock * 1.2;
    recMat.emissive.set(diab ? "#300000" : "#1c78ff");
    recMat.color.set(diab ? "#7a4a4a" : "#7ad0ff");
    cWarn.intensity = diab ? 60 + Math.sin(lt * 10) * 30 : 0;
    const ipp = cellIns.geometry.attributes.position;
    for (let i = 0; i < RC * 4; i++) {
      const rp = recPos[i % RC];
      const dir = tmp.copy(rp).normalize();
      const far = 4.2 + hash1(i) * 2;
      const kk = diab ? 0.85 + 0.15 * Math.sin(lt * 3 + i) : clamp(dock * 1.15 - hash1(i + 1) * 0.15);
      const rr = lerp(far, 2.78, kk);
      ipp.setXYZ(i, dir.x * rr + (hash1(i + 2) - 0.5) * 0.2 * (1 - kk), dir.y * rr + (hash1(i + 3) - 0.5) * 0.2 * (1 - kk), dir.z * rr);
    }
    ipp.needsUpdate = true;
    const sp = cellSug.geometry.attributes.position;
    for (let i = 0; i < 900; i++) {
      const rp = recPos[i % RC];
      const dir = tmp.copy(rp).normalize();
      const jit = tmp2.set(hash1(i + 7) - 0.5, hash1(i + 8) - 0.5, hash1(i + 9) - 0.5).multiplyScalar(0.7);
      let rr;
      if (diab) {
        // sugar piles up outside and bounces off: insulin resistance
        const ph = (hash1(i + 11) + lt * 0.9) % 1;
        rr = 2.9 + Math.abs(Math.sin(ph * Math.PI)) * (1.5 + hash1(i + 12) * 2.5);
      } else {
        const start = 0.4 + hash1(i + 10) * 2.2;
        const k2 = clamp((lt - start) / 0.9);
        rr = lerp(5.5 + hash1(i + 13) * 2.5, 0.6 + hash1(i + 14) * 1.6, easeInOut(k2));
        if (lt > 2.15 && k2 >= 1) rr = lerp(rr, 0.1, smooth(2.15, 3.6, lt) * 0.5);
      }
      sp.setXYZ(i, dir.x * rr + jit.x, dir.y * rr + jit.y, dir.z * rr + jit.z);
    }
    sp.needsUpdate = true;
    cellSug.material.opacity = 1;
    const fatK = diab ? 0.7 : smooth(2.15, 3.7, lt);
    for (let i = 0; i < FD; i++) {
      const a = i * 2.4, rr = 0.9 + hash1(i + 30) * 0.9;
      const s = fatK * (0.22 + hash1(i + 31) * 0.3) * (0.9 + 0.1 * Math.sin(lt * 2 + i));
      m4.compose(v3.set(Math.cos(a) * rr + 0.4, Math.sin(a * 1.7) * 0.9, Math.sin(a) * rr * 0.8 + 0.3), q.identity(), s3.setScalar(s + 0.0001));
      fats.setMatrixAt(i, m4);
    }
    fats.instanceMatrix.needsUpdate = true;
    cIn.intensity = fatK * 30;
    cIn.position.set(0.4, 0, 0.6);
    if (diab) {
      const a = 0.9 + lt * 0.3;
      look(Math.sin(a) * 9.5, 1.5, Math.cos(a) * 9.5, 0, 0, 0);
    } else {
      const a = -0.3 + lt * 0.18;
      const r = lerp(11, 7.0, easeInOut(smooth(0, 3.7, lt)));
      look(Math.sin(a) * r, lerp(2.0, 0.8, smooth(0, 3.7, lt)), Math.cos(a) * r, 0, 0, 0);
    }
  }

  // ============================================================ 9. TOOTH
  const sTooth = newScene("#060405", 0.02, 0.9);
  backdrop(sTooth, "#2b1a10", "#030202", -14, 50);
  const toothGeo = displace(new THREE.SphereGeometry(1, 220, 160), (x, y, z) => {
    let d = 0;
    if (y > 0) {
      for (const [cx, cz] of [[0.42, 0.4], [-0.42, 0.4], [0.42, -0.4], [-0.42, -0.4]]) d += 0.32 * Math.exp(-((x - cx) ** 2 + (z - cz) ** 2) / 0.09) * y;
      d -= 0.12 * Math.exp(-(x * x) / 0.006) * y + 0.1 * Math.exp(-(z * z) / 0.006) * y;
    }
    return d + (fbm(x * 6, y * 6, z * 6) - 0.5) * 0.03;
  });
  {
    const p = toothGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i);
      p.setY(i, y < 0 ? y * 1.6 : y * 0.85);
      p.setX(i, p.getX(i) * (y < 0 ? 1 + y * 0.12 : 1));
    }
    toothGeo.computeVertexNormals();
  }
  const erodeU = { value: 0 };
  const enamel = new THREE.MeshPhysicalMaterial({ color: "#e6dcc6", roughness: 0.16, clearcoat: 1, clearcoatRoughness: 0.08, sheen: 0.3, envMapIntensity: 1.2 });
  patchSpots(enamel, erodeU, new THREE.Color("#a88a5a"), 11.0, 0.75);
  const tooth = new THREE.Mesh(toothGeo, enamel);
  sTooth.add(tooth);
  const gum = new THREE.Mesh(displace(new THREE.TorusGeometry(1.25, 0.55, 48, 128), (x, y, z) => (fbm(x * 3, y * 3, z * 3) - 0.5) * 0.12), new THREE.MeshPhysicalMaterial({ color: "#d9606a", map: esoTex, roughness: 0.3, clearcoat: 1, sheen: 0.6 }));
  gum.rotation.x = Math.PI / 2;
  gum.position.y = -0.95;
  gum.scale.set(1, 1, 0.75);
  sTooth.add(gum);
  const BN = 360;
  const bact = new THREE.InstancedMesh(new THREE.CapsuleGeometry(0.014, 0.045, 4, 8), new THREE.MeshPhysicalMaterial({ color: "#7fdc5a", roughness: 0.35, clearcoat: 0.8, emissive: "#1f5a10", emissiveIntensity: 0.6 }), BN);
  bact.frustumCulled = false;
  sTooth.add(bact);
  const bactSpots = [];
  {
    const rnd = mulberry32(99);
    const p = toothGeo.attributes.position, n = toothGeo.attributes.normal;
    while (bactSpots.length < BN) {
      const i = Math.floor(rnd() * p.count);
      if (p.getY(i) < 0.15) continue;
      bactSpots.push({ p: new THREE.Vector3(p.getX(i), p.getY(i), p.getZ(i)), n: new THREE.Vector3(n.getX(i), n.getY(i), n.getZ(i)), ph: rnd() * 6.28, t0: rnd() * 1.2 });
    }
  }
  const acid = makePoints(700, "#9cff6a", 0.06, glow, 0.5);
  sTooth.add(acid);
  const wash = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshPhysicalMaterial({ color: "#2e1207", roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.85 }), 300);
  wash.frustumCulled = false;
  sTooth.add(wash);
  const tKey = new THREE.SpotLight("#fff2e0", 80, 20, 0.6, 0.5);
  tKey.position.set(-3, 5, 4);
  const tRim = new THREE.PointLight("#65ff8a", 0, 12);
  tRim.position.set(2.5, 2, -2);
  const tRim2 = new THREE.PointLight("#ff9a5a", 30, 12);
  tRim2.position.set(-3, 1, -2);
  sTooth.add(tKey, tKey.target, tRim, tRim2, new THREE.AmbientLight("#ffffff", 0.05));
  function updateTooth(lt) {
    setFov(36);
    erodeU.value = smooth(1.6, 4.4, lt) * 0.42;
    tRim.intensity = smooth(0.6, 2.0, lt) * 60;
    for (let i = 0; i < BN; i++) {
      const b = bactSpots[i];
      const on = smooth(0.4 + b.t0, 0.8 + b.t0, lt);
      v3.copy(b.p).addScaledVector(b.n, 0.03);
      v3.x += Math.sin(lt * 2 + b.ph) * 0.03;
      v3.z += Math.cos(lt * 2 + b.ph) * 0.03;
      q.setFromUnitVectors(tmp.set(0, 1, 0), tmp2.set(Math.cos(b.ph), 0.2, Math.sin(b.ph)).normalize());
      m4.compose(v3, q, s3.setScalar(on + 0.0001));
      bact.setMatrixAt(i, m4);
    }
    bact.instanceMatrix.needsUpdate = true;
    const ap = acid.geometry.attributes.position;
    for (let i = 0; i < 700; i++) {
      const b = bactSpots[i % BN];
      const age = ((hash1(i) * 1.5 + lt * 0.6) % 1.5);
      if (lt < 1.2) {
        ap.setXYZ(i, HIDE.x, HIDE.y, HIDE.z);
        continue;
      }
      ap.setXYZ(i, b.p.x + b.n.x * age * 0.5 + Math.sin(i + lt) * 0.05, b.p.y + age * 0.6, b.p.z + b.n.z * age * 0.5);
    }
    ap.needsUpdate = true;
    for (let i = 0; i < 300; i++) {
      const age = lt - (i / 300) * 0.9;
      if (age < 0 || age > 1.2) {
        m4.compose(HIDE, q.identity(), s3.setScalar(0));
      } else {
        const z = (hash1(i) - 0.5) * 1.8;
        v3.set(-2.4 + age * 4.5, 1.05 + Math.sin(age * 3 + i) * 0.08 - Math.abs(z) * 0.2, z);
        const s = 0.06 + hash1(i + 1) * 0.1;
        m4.compose(v3, q.identity(), s3.set(s * 1.6, s * 0.6, s));
      }
      wash.setMatrixAt(i, m4);
    }
    wash.instanceMatrix.needsUpdate = true;
    const a = -0.6 + lt * 0.2;
    const r = lerp(6.2, 4.6, easeInOut(lt / 5));
    look(Math.sin(a) * r, lerp(3.2, 2.4, lt / 5), Math.cos(a) * r, 0, 0.1, 0);
  }

  // ============================================================ 10. CAN TOWER (30 cans)
  const sTow = newScene("#03060a", 0, 0.7);
  backdrop(sTow, "#0d2236", "#020305", -16, 60);
  const tFloor = new THREE.Mesh(new THREE.CircleGeometry(40, 64), new THREE.MeshStandardMaterial({ color: "#05080b", roughness: 0.18, metalness: 0.6 }));
  tFloor.rotation.x = -Math.PI / 2;
  tFloor.position.y = -0.7;
  sTow.add(tFloor);
  const towCans = new THREE.InstancedMesh(canG.geo, canMat, 30);
  towCans.frustumCulled = false;
  sTow.add(towCans);
  const towSlots = [];
  {
    const rows = [8, 7, 6, 5, 4];
    let y = -0.7 + 2.02 * 0.35;
    for (const n of rows) {
      for (let i = 0; i < n; i++) towSlots.push([(i - (n - 1) / 2) * 0.72, y]);
      y += 4.1 * 0.35;
    }
  }
  const twKey = new THREE.SpotLight("#ffffff", 400, 40, 0.6, 0.5);
  twKey.position.set(-5, 10, 8);
  const twR = new THREE.PointLight("#ff2a2a", 120, 30);
  twR.position.set(5, 3, -4);
  const twB = new THREE.PointLight("#3fb8ff", 80, 30);
  twB.position.set(-5, 2, -4);
  sTow.add(twKey, twKey.target, twR, twB, new THREE.AmbientLight("#ffffff", 0.06));
  function updateTow(lt) {
    setFov(38);
    for (let i = 0; i < 30; i++) {
      const t0 = 0.1 + i * 0.085;
      const k = clamp((lt - t0) / 0.3);
      const [x, y] = towSlots[i];
      if (lt < t0) m4.compose(HIDE, q.identity(), s3.setScalar(0));
      else {
        e3.set(0, (1 - k) * 2 + i * 0.7, (1 - easeOut(k)) * 0.6);
        q.setFromEuler(e3);
        m4.compose(v3.set(x, y + (1 - easeOut(k)) * 3.2, 0), q, s3.setScalar(0.35));
      }
      towCans.setMatrixAt(i, m4);
    }
    towCans.instanceMatrix.needsUpdate = true;
    const a = lerp(-0.35, 0.3, lt / 3.4);
    const r = lerp(19, 17, lt / 3.4);
    look(Math.sin(a) * r, 3.0, Math.cos(a) * r, 0, 4.6, 0);
  }

  // ============================================================ 11. ARTERY with plaque
  const sArt = newScene("#1e0103", 0.08, 0.05);
  const artC = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 8), new THREE.Vector3(0.5, 0.3, 2), new THREE.Vector3(-0.4, -0.2, -4), new THREE.Vector3(0.3, 0.2, -10), new THREE.Vector3(0, 0, -16)]);
  const art = makeTube(artC, 200, 48, vesR);
  sArt.add(new THREE.Mesh(art.geo, vesMat));
  const artFr = curveFrames(artC);
  const PQ = 70;
  const plaque = new THREE.InstancedMesh(displace(new THREE.IcosahedronGeometry(1, 4), (x, y, z) => (fbm(x * 2.5, y * 2.5, z * 2.5) - 0.5) * 0.5), new THREE.MeshPhysicalMaterial({ color: "#f0c060", roughness: 0.45, clearcoat: 0.6, sheen: 0.8, sheenColor: new THREE.Color("#fff0a0"), emissive: "#402000", emissiveIntensity: 0.4 }), PQ);
  plaque.frustumCulled = false;
  sArt.add(plaque);
  const rbc2 = new THREE.InstancedMesh(rbcGeo, rbcMat, 160);
  rbc2.frustumCulled = false;
  sArt.add(rbc2);
  const aLamp = new THREE.PointLight("#ffd0c0", 3.5, 10, 1.5);
  const aWarn = new THREE.PointLight("#ff0000", 0, 20);
  sArt.add(aLamp, aWarn, new THREE.AmbientLight("#ff4040", 0.15));
  function updateArt(lt) {
    setFov(62);
    const cu = 0.04 + lt * 0.07;
    const cp = artFr.point(cu), ct = artFr.point(cu + 0.05);
    look(cp.x, cp.y, cp.z, ct.x, ct.y, ct.z, -lt * 0.15);
    aLamp.position.copy(cp);
    aWarn.position.copy(artFr.point(cu + 0.12));
    aWarn.intensity = (0.5 + 0.5 * Math.sin(lt * 6)) * 12 * smooth(0.5, 1.5, lt);
    const grow = smooth(0, 2.4, lt);
    for (let i = 0; i < PQ; i++) {
      const u = 0.12 + (i / PQ) * 0.6;
      artFr.at(u, hash1(i + 40) * 6.28, 1.55, v3);
      const s = (0.35 + hash1(i + 41) * 0.5) * (0.3 + grow * 0.9);
      m4.compose(v3, q.identity(), s3.set(s, s * 0.8, s * 1.4));
      plaque.setMatrixAt(i, m4);
    }
    plaque.instanceMatrix.needsUpdate = true;
    flowAlong(artFr, rbc2, 70, lt, cu, 0.02, 0.8, 0.2, 300);
  }

  // ============================================================ 12. FAT (weight gain)
  const sFat = newScene("#0a0702", 0.03, 0.7);
  backdrop(sFat, "#3a2606", "#030201", -14, 50);
  const FN = 46;
  const adipo = new THREE.InstancedMesh(displace(new THREE.IcosahedronGeometry(1, 5), (x, y, z) => (fbm(x * 1.5, y * 1.5, z * 1.5) - 0.5) * 0.12), new THREE.MeshPhysicalMaterial({ color: "#ffcd55", roughness: 0.15, clearcoat: 1, sheen: 0.8, sheenColor: new THREE.Color("#fff2b0"), emissive: "#5a3300", emissiveIntensity: 0.35, transparent: true, opacity: 0.93 }), FN);
  const adipoPos = [];
  {
    const rnd = mulberry32(55);
    for (let i = 0; i < FN; i++) adipoPos.push(new THREE.Vector3((rnd() - 0.5) * 6, (rnd() - 0.5) * 9, (rnd() - 0.5) * 4));
  }
  sFat.add(adipo);
  const fKey = new THREE.DirectionalLight("#fff4e0", 2.5);
  fKey.position.set(-3, 5, 6);
  const fRim = new THREE.PointLight("#ff8a20", 80, 20);
  fRim.position.set(3, 0, -3);
  sFat.add(fKey, fRim, new THREE.AmbientLight("#ffffff", 0.06));
  function updateFat(lt) {
    setFov(40);
    const g = lerp(0.85, 1.25, easeOut(lt / 1.0));
    for (let i = 0; i < FN; i++) {
      const s = (0.9 + hash1(i + 60) * 0.5) * g;
      m4.compose(adipoPos[i], q.identity(), s3.setScalar(s));
      adipo.setMatrixAt(i, m4);
    }
    adipo.instanceMatrix.needsUpdate = true;
    look(0.5, 0.3, lerp(15, 13, lt), 0, 0.6, 0, 0.1);
  }

  // ============================================================ 13. LIVER (fatty)
  const sLiv = newScene("#06030a", 0.03, 0.7);
  backdrop(sLiv, "#2a0d1e", "#030103", -14, 50);
  const livGeo = displace(new THREE.SphereGeometry(1, 160, 120), (x, y, z) => (fbm(x * 2, y * 2, z * 2) - 0.5) * 0.12);
  {
    const p = livGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      x *= 2.0;
      y *= 0.95;
      z *= 1.1;
      y += -0.32 * x;
      if (y < -0.5 - 0.3 * x) y = -0.5 - 0.3 * x + (y + 0.5 + 0.3 * x) * 0.3;
      y *= x > 0.6 ? 1 - (x - 0.6) * 0.35 : 1;
      p.setXYZ(i, x, y, z);
    }
    livGeo.computeVertexNormals();
  }
  const fatU = { value: 0 };
  const livMat = new THREE.MeshPhysicalMaterial({ color: "#7a2124", roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.1, sheen: 0.5, sheenColor: new THREE.Color("#ff9090") });
  patchSpots(livMat, fatU, new THREE.Color("#e2b45a"), 3.2, 0.55);
  const liver = new THREE.Mesh(livGeo, livMat);
  sLiv.add(liver);
  const lKey = new THREE.DirectionalLight("#fff0e0", 2.8);
  lKey.position.set(-3, 5, 6);
  const lRim = new THREE.PointLight("#ff5a8a", 70, 20);
  lRim.position.set(3, 2, -3);
  sLiv.add(lKey, lRim, new THREE.AmbientLight("#ffffff", 0.05));
  function updateLiv(lt) {
    setFov(40);
    fatU.value = lerp(0.1, 0.75, smooth(0, 0.85, lt));
    liver.rotation.set(0.25, -0.5 + lt * 0.35, 0);
    look(0, 0.4, lerp(8.8, 7.6, lt), 0, 0, 0);
  }

  // ============================================================ 14. HEART
  const sHeart = newScene("#090102", 0.03, 0.6);
  backdrop(sHeart, "#4a0408", "#040001", -14, 50);
  const heartGeo = displace(new THREE.SphereGeometry(1, 180, 140), (x, y, z) => (fbm(x * 4, y * 4, z * 4) - 0.5) * 0.06);
  {
    const p = heartGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      if (y < 0) {
        const k = 1 + y * 0.62;
        x *= k;
        z *= k;
        y *= 1.45;
      } else {
        y += 0.3 * Math.exp(-((x - 0.42) ** 2) / 0.08) * y + 0.24 * Math.exp(-((x + 0.38) ** 2) / 0.1) * y;
      }
      z *= 0.82;
      p.setXYZ(i, x, y, z);
    }
    heartGeo.computeVertexNormals();
  }
  const heartTex = tissueTexture(77, "#9e1d22", "#4d070c", "#d8585a");
  const heartMat = new THREE.MeshPhysicalMaterial({ color: "#c43a3a", map: heartTex, bumpMap: heartTex, bumpScale: 3, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.5, sheenColor: new THREE.Color("#ff8080") });
  const heartGrp = new THREE.Group();
  const heart = new THREE.Mesh(heartGeo, heartMat);
  heartGrp.add(heart);
  const aorta = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.1, 0.7, 0), new THREE.Vector3(0.15, 1.6, 0.05), new THREE.Vector3(-0.4, 2.0, 0), new THREE.Vector3(-0.9, 1.6, -0.1), new THREE.Vector3(-1.0, 0.9, -0.2)]), 60, 0.28, 24), new THREE.MeshPhysicalMaterial({ color: "#d0585a", roughness: 0.3, clearcoat: 1 }));
  const pulm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.3, 0.6, 0.3), new THREE.Vector3(-0.35, 1.4, 0.45), new THREE.Vector3(0.4, 1.6, 0.4)]), 40, 0.22, 20), new THREE.MeshPhysicalMaterial({ color: "#5a68b8", roughness: 0.3, clearcoat: 1 }));
  const coro = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0.0, 0.5, 0.75), new THREE.Vector3(0.25, -0.1, 0.78), new THREE.Vector3(0.15, -0.8, 0.55), new THREE.Vector3(0.0, -1.3, 0.2)]), 60, 0.045, 10), new THREE.MeshPhysicalMaterial({ color: "#e0b04a", roughness: 0.4, clearcoat: 0.5, emissive: "#402000", emissiveIntensity: 0.3 }));
  heartGrp.add(aorta, pulm, coro);
  heartGrp.rotation.z = -0.35;
  sHeart.add(heartGrp);
  const hKey = new THREE.DirectionalLight("#fff0e8", 2.6);
  hKey.position.set(-3, 5, 6);
  const hWarn = new THREE.PointLight("#ff1010", 60, 20);
  hWarn.position.set(3, 1, 2);
  const hRim = new THREE.PointLight("#40c0ff", 40, 20);
  hRim.position.set(-3, 1, -3);
  sHeart.add(hKey, hWarn, hRim, new THREE.AmbientLight("#ffffff", 0.05));
  function updateHeart(lt) {
    setFov(40);
    const beat = Math.exp(-((lt * 1.6) % 1) * 6) * 0.08 + Math.exp(-Math.pow(((lt * 1.6) % 1) - 0.25, 2) * 300) * 0.04;
    heartGrp.scale.setScalar(1 + beat);
    heartGrp.rotation.y = -0.4 + lt * 0.3;
    hWarn.intensity = 40 + beat * 900;
    look(0, 0.4, lerp(7.6, 6.6, lt / 1.3), 0, 0.3, 0);
  }

  // ============================================================ timeline
  const SEG = [
    [0, 7.9, (t) => (updateCanScene(t, false), sCan)],
    [7.9, 9.4, (t) => (updateEso(t - 7.9), sEso)],
    [9.4, 14.4, (t) => (updateSto(t - 9.4), sSto)],
    [14.4, 17.4, (t) => (updateVil(t - 14.4), sVil)],
    [17.4, 20.3, (t) => (updateVes(t - 17.4), sVes)],
    [20.3, 22.3, (t) => (updatePan(t - 20.3), sPan)],
    [22.3, 23.6, (t) => (updateIsl(t - 22.3), sIsl)],
    [23.6, 27.3, (t) => (updateCell(t - 23.6, false), sCell)],
    [27.3, 32.3, (t) => (updateTooth(t - 27.3), sTooth)],
    [32.3, 35.7, (t) => (updateTow(t - 32.3), sTow)],
    [35.7, 38.3, (t) => (updateArt(t - 35.7), sArt)],
    [38.3, 39.25, (t) => (updateFat(t - 38.3), sFat)],
    [39.25, 40.15, (t) => (updateLiv(t - 39.25), sLiv)],
    [40.15, 41.35, (t) => (updateCell(t - 40.15, true), sCell)],
    [41.35, 42.6, (t) => (updateHeart(t - 41.35), sHeart)],
    [42.6, 99, (t) => (updateCanScene(t - 42.6, true), sCan)],
  ];
  return {
    render(t) {
      for (const [a, b, fn] of SEG) {
        if (t >= a && t < b) {
          const scene = fn(t);
          renderer.render(scene, camera);
          return;
        }
      }
    },
  };
}
