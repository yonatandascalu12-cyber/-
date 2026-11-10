// Procedural Three.js world for "What happens when you drink coffee".
// Every frame is a pure function of timeline time t (seconds): render(t).
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { mergeVertices, mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";

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
  const vilSugar = makePoints(900, "#7fe0ff", 0.11, glow, 1);
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
  const vesSugar = makePoints(1600, "#7fe0ff", 0.1, glow, 1);
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


  // ============================================================ MOLECULES (real purine geometry)
  // Caffeine (1,3,7-trimethylxanthine) and adenosine (adenine + ribose) share the purine core.
  function purineCore() {
    const A = {};
    const hex = (deg) => new THREE.Vector3(1.4 * Math.cos((deg * Math.PI) / 180), 1.4 * Math.sin((deg * Math.PI) / 180), 0);
    A.N1 = hex(150); A.C2 = hex(-150); A.N3 = hex(-90); A.C4 = hex(-30); A.C5 = hex(30); A.C6 = hex(90);
    const pc = new THREE.Vector3(2.176, 0, 0), R = 1.191;
    const pent = (deg) => new THREE.Vector3(pc.x + R * Math.cos((deg * Math.PI) / 180), R * Math.sin((deg * Math.PI) / 180), 0);
    A.N7 = pent(72); A.C8 = pent(0); A.N9 = pent(-72);
    const bonds = [["N1", "C2"], ["C2", "N3"], ["N3", "C4"], ["C4", "C5"], ["C5", "C6"], ["C6", "N1"], ["C5", "N7"], ["N7", "C8"], ["C8", "N9"], ["N9", "C4"]];
    const hexC = new THREE.Vector3(0, 0, 0);
    const out = (name, center) => A[name].clone().sub(center).normalize();
    return { A, bonds, hexC, pc, out };
  }
  function buildCaffeine() {
    const { A, bonds, hexC, pc, out } = purineCore();
    const atoms = [], el = {};
    for (const k in A) { atoms.push([k, A[k]]); el[k] = k[0]; }
    const add = (name, e, pos, from, dbl) => { atoms.push([name, pos]); el[name] = e; bonds.push([from, name, dbl]); };
    add("O2", "O", A.C2.clone().addScaledVector(out("C2", hexC), 1.22), "C2", true);
    add("O6", "O", A.C6.clone().addScaledVector(out("C6", hexC), 1.22), "C6", true);
    add("Me1", "C", A.N1.clone().addScaledVector(out("N1", hexC), 1.47), "N1");
    add("Me3", "C", A.N3.clone().addScaledVector(out("N3", hexC), 1.47), "N3");
    add("Me7", "C", A.N7.clone().addScaledVector(out("N7", pc), 1.47), "N7");
    add("H8", "H", A.C8.clone().addScaledVector(out("C8", pc), 1.0), "C8");
    for (const m of ["Me1", "Me3", "Me7"]) {
      const c = atoms.find((a) => a[0] === m)[1];
      const d = c.clone().sub(m === "Me7" ? A.N7 : A[m.replace("Me", "N")]).normalize();
      const p1 = new THREE.Vector3(-d.y, d.x, 0), p2 = new THREE.Vector3(0, 0, 1);
      for (let k = 0; k < 3; k++) {
        const a = (k / 3) * Math.PI * 2;
        const h = c.clone().addScaledVector(d, 0.36).addScaledVector(p1, Math.cos(a) * 0.95).addScaledVector(p2, Math.sin(a) * 0.95);
        add(m + "H" + k, "H", h, m);
      }
    }
    return { atoms, el, bonds };
  }
  function buildAdenosine() {
    const { A, bonds, hexC, pc, out } = purineCore();
    const atoms = [], el = {};
    for (const k in A) { atoms.push([k, A[k]]); el[k] = k[0]; }
    const add = (name, e, pos, from) => { atoms.push([name, pos]); el[name] = e; bonds.push([from, name]); };
    add("N6", "N", A.C6.clone().addScaledVector(out("C6", hexC), 1.35), "C6");
    add("H2", "H", A.C2.clone().addScaledVector(out("C2", hexC), 1.0), "C2");
    add("H8", "H", A.C8.clone().addScaledVector(out("C8", pc), 1.0), "C8");
    const n6 = atoms.find((a) => a[0] === "N6")[1];
    add("H6a", "H", n6.clone().add(new THREE.Vector3(0.85, 0.5, 0)), "N6");
    add("H6b", "H", n6.clone().add(new THREE.Vector3(-0.85, 0.5, 0)), "N6");
    // ribose ring attached at N9, tilted out of plane
    const d = out("N9", pc);
    const c1 = A.N9.clone().addScaledVector(d, 1.47);
    add("C1r", "C", c1, "N9");
    const rc = c1.clone().addScaledVector(d, 1.0).add(new THREE.Vector3(0, 0, 0.5));
    const ring = ["O4r", "C4r", "C3r", "C2r"];
    const base = Math.atan2(c1.y - rc.y, c1.x - rc.x);
    let prev = "C1r";
    ring.forEach((n, k) => {
      const a = base + ((k + 1) / 5) * Math.PI * 2;
      add(n, n[0], new THREE.Vector3(rc.x + Math.cos(a) * 1.19, rc.y + Math.sin(a) * 1.19, rc.z + Math.sin(a * 2) * 0.35), prev);
      prev = n;
    });
    bonds.push(["C2r", "C1r"]);
    const p = (n) => atoms.find((a) => a[0] === n)[1];
    add("O2r", "O", p("C2r").clone().add(new THREE.Vector3(0.3, -0.9, 0.9)), "C2r");
    add("O3r", "O", p("C3r").clone().add(new THREE.Vector3(-0.5, -0.9, 0.8)), "C3r");
    add("C5r", "C", p("C4r").clone().add(new THREE.Vector3(-0.9, 0.6, 0.8)), "C4r");
    add("O5r", "O", p("C5r").clone().add(new THREE.Vector3(-1.2, 0.2, 0.2)), "C5r");
    return { atoms, el, bonds };
  }
  const RAD = { C: 0.36, N: 0.34, O: 0.34, H: 0.21 };
  const CPK = { C: "#3a3d42", N: "#3d6bff", O: "#ff3b30", H: "#f2f2f2" };
  const bondGeo = new THREE.CylinderGeometry(0.11, 0.11, 1, 14, 1);
  const atomGeo = new THREE.SphereGeometry(1, 32, 24);
  function moleculeGroup(mol, scale, tint) {
    const g = new THREE.Group();
    const mats = {};
    for (const e of "CNOH") mats[e] = new THREE.MeshPhysicalMaterial({ color: tint || CPK[e], roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.08, emissive: tint || CPK[e], emissiveIntensity: tint ? 0.5 : 0.08 });
    const bondMat = new THREE.MeshPhysicalMaterial({ color: tint || "#c9ccd2", roughness: 0.25, clearcoat: 1, metalness: 0.2, emissive: tint || "#000000", emissiveIntensity: tint ? 0.4 : 0 });
    const pos = Object.fromEntries(mol.atoms);
    let cx = new THREE.Vector3();
    for (const [, p] of mol.atoms) cx.add(p);
    cx.multiplyScalar(1 / mol.atoms.length);
    for (const [n, p] of mol.atoms) {
      const m = new THREE.Mesh(atomGeo, mats[mol.el[n]]);
      m.position.copy(p).sub(cx);
      m.scale.setScalar(RAD[mol.el[n]]);
      g.add(m);
    }
    const up = new THREE.Vector3(0, 1, 0);
    for (const [a, b, dbl] of mol.bonds) {
      const pa = pos[a].clone().sub(cx), pb = pos[b].clone().sub(cx);
      const offs = dbl ? [0.13, -0.13] : [0];
      for (const o of offs) {
        const dir = pb.clone().sub(pa);
        const side = new THREE.Vector3(-dir.y, dir.x, 0).normalize().multiplyScalar(o);
        const m = new THREE.Mesh(bondGeo, bondMat);
        m.position.copy(pa).add(pb).multiplyScalar(0.5).add(side);
        m.scale.set(dbl ? 0.75 : 1, dir.length(), dbl ? 0.75 : 1);
        m.quaternion.setFromUnitVectors(up, dir.normalize());
        g.add(m);
      }
    }
    g.scale.setScalar(scale);
    return g;
  }
  // merged single-mesh version for instancing
  function moleculeGeometry(mol) {
    const parts = [];
    let cx = new THREE.Vector3();
    for (const [, p] of mol.atoms) cx.add(p);
    cx.multiplyScalar(1 / mol.atoms.length);
    const pos = Object.fromEntries(mol.atoms);
    for (const [n, p] of mol.atoms) {
      const r = RAD[mol.el[n]];
      const g = new THREE.SphereGeometry(r, 12, 8);
      g.translate(p.x - cx.x, p.y - cx.y, p.z - cx.z);
      parts.push(g);
    }
    const up = new THREE.Vector3(0, 1, 0);
    for (const [a, b] of mol.bonds) {
      const pa = pos[a].clone().sub(cx), pb = pos[b].clone().sub(cx);
      const dir = pb.clone().sub(pa);
      const g = new THREE.CylinderGeometry(0.12, 0.12, dir.length(), 8, 1);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize()));
      g.translate((pa.x + pb.x) / 2, (pa.y + pb.y) / 2, (pa.z + pb.z) / 2);
      parts.push(g);
    }
    return mergeGeometries(parts.map((g) => g.toNonIndexed()));
  }
  const CAF = buildCaffeine(), ADO = buildAdenosine();
  const cafGeo = moleculeGeometry(CAF), adoGeo = moleculeGeometry(ADO);
  const cafMat = new THREE.MeshPhysicalMaterial({ color: "#8fe6ff", roughness: 0.2, clearcoat: 1, emissive: "#1a9fd6", emissiveIntensity: 0.9 });
  const adoMat = new THREE.MeshPhysicalMaterial({ color: "#ffb35c", roughness: 0.2, clearcoat: 1, emissive: "#d96a00", emissiveIntensity: 0.8 });

  // ============================================================ MUG + TABLE (factory)
  const woodTex = canvasTex(1024, 1024, (g, w, h) => {
    const rnd = mulberry32(12);
    g.fillStyle = "#3a2215";
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) {
      const v = 0.5 + 0.5 * Math.sin(y * 0.05 + Math.sin(y * 0.013) * 4);
      g.fillStyle = `rgba(${90 + v * 40},${55 + v * 25},${30 + v * 12},${0.35 + rnd() * 0.2})`;
      g.fillRect(0, y, w, 2);
    }
    for (let i = 0; i < 400; i++) {
      g.fillStyle = `rgba(20,10,5,${0.05 + rnd() * 0.1})`;
      g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 80, 1);
    }
  });
  woodTex.wrapS = woodTex.wrapT = THREE.RepeatWrapping;
  woodTex.repeat.set(3, 3);
  const cremaTex = canvasTex(512, 512, (g, w, h) => {
    const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    gr.addColorStop(0, "#2a140a");
    gr.addColorStop(0.55, "#3b1d0e");
    gr.addColorStop(0.82, "#8a5530");
    gr.addColorStop(0.96, "#c08a55");
    gr.addColorStop(1, "#7a4a28");
    g.fillStyle = gr;
    g.fillRect(0, 0, w, h);
    const rnd = mulberry32(4);
    for (let i = 0; i < 900; i++) {
      const a = rnd() * Math.PI * 2, r = (0.5 + rnd() * 0.45) * w * 0.5;
      g.fillStyle = `rgba(210,160,110,${rnd() * 0.18})`;
      g.beginPath();
      g.arc(w / 2 + Math.cos(a) * r, h / 2 + Math.sin(a) * r, 1 + rnd() * 5, 0, Math.PI * 2);
      g.fill();
    }
  });
  function makeMugSet(scene) {
    const grp = new THREE.Group();
    const prof = [[0, -1.0], [0.82, -1.0], [0.95, -0.96], [1.0, -0.85], [1.02, 0.0], [1.05, 0.85], [1.06, 0.98], [1.02, 1.03], [0.96, 1.0], [0.94, 0.85], [0.9, 0.0], [0.86, -0.82], [0, -0.85]];
    const mug = new THREE.Mesh(new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 128), new THREE.MeshPhysicalMaterial({ color: "#f3efe8", roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05, side: THREE.DoubleSide }));
    grp.add(mug);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.11, 24, 64, Math.PI * 1.15), mug.material);
    handle.rotation.z = -Math.PI * 0.575;
    handle.position.set(1.05, 0.05, 0);
    grp.add(handle);
    const coffee = new THREE.Mesh(new THREE.CircleGeometry(0.925, 96), new THREE.MeshPhysicalMaterial({ map: cremaTex, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.05 }));
    coffee.rotation.x = -Math.PI / 2;
    coffee.position.y = 0.72;
    grp.add(coffee);
    const saucerProf = [[0, -1.12], [1.5, -1.1], [1.75, -1.0], [1.8, -0.97], [1.55, -1.0], [0.9, -1.04], [0, -1.04]];
    const saucer = new THREE.Mesh(new THREE.LatheGeometry(saucerProf.map(([r, y]) => new THREE.Vector2(r, y)), 128), mug.material);
    grp.add(saucer);
    scene.add(grp);
    const table = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshPhysicalMaterial({ map: woodTex, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3 }));
    table.rotation.x = -Math.PI / 2;
    table.position.y = -1.12;
    scene.add(table);
    const steam = makePoints(260, "#ffffff", 0.55, glow, 0.07);
    steam.material.blending = THREE.NormalBlending;
    scene.add(steam);
    const key = new THREE.SpotLight("#ffd9ae", 260, 30, 0.55, 0.6);
    key.position.set(-4, 7, 4);
    const rim = new THREE.PointLight("#ff9a4a", 60, 20);
    rim.position.set(3, 2.5, -3);
    const fill = new THREE.PointLight("#5aa8ff", 18, 20);
    fill.position.set(-3, 1, -3);
    scene.add(key, key.target, rim, fill, new THREE.AmbientLight("#ffffff", 0.04));
    return {
      grp, key, rim, fill,
      steam(t, amount = 1) {
        const p = steam.geometry.attributes.position;
        for (let i = 0; i < 260; i++) {
          const life = 3.2;
          const age = (hash1(i) * life + t) % life;
          const k = age / life;
          const a = hash1(i + 1) * 6.28;
          const r = 0.5 * Math.sqrt(hash1(i + 2)) + k * 0.4;
          p.setXYZ(i, Math.cos(a) * r + Math.sin(k * 6 + i) * 0.25 * k, 0.8 + k * 4.2, Math.sin(a) * r + Math.cos(k * 5 + i) * 0.2 * k);
        }
        p.needsUpdate = true;
        steam.material.opacity = 0.075 * amount;
      },
    };
  }

  // ============================================================ C1. HOOK (mug)
  const sMug = newScene("#0b0705", 0, 0.5);
  backdrop(sMug, "#3a2010", "#060403", -16, 50);
  const mug1 = makeMugSet(sMug);
  function updateMug(lt) {
    setFov(36);
    mug1.steam(lt);
    const a = lerp(-0.5, 0.15, smooth(0, 3.3, lt));
    const r = lerp(10.5, 8.6, easeInOut(smooth(0, 3.3, lt)));
    look(Math.sin(a) * r, lerp(3.4, 2.2, smooth(0, 3.3, lt)), Math.cos(a) * r, 0, 1.0, 0);
  }

  // ============================================================ C2. HERO CAFFEINE MOLECULE
  const sMol = newScene("#07090c", 0, 0.9);
  backdrop(sMol, "#2a1a10", "#030304", -16, 50);
  const heroCaf = moleculeGroup(CAF, 0.42);
  sMol.add(heroCaf);
  const molSteam = makePoints(300, "#ffe2c0", 0.5, glow, 0.06);
  molSteam.material.blending = THREE.NormalBlending;
  sMol.add(molSteam);
  const mKey = new THREE.DirectionalLight("#fff3e6", 2.6);
  mKey.position.set(-3, 5, 6);
  const mRim = new THREE.PointLight("#ff9a4a", 60, 20);
  mRim.position.set(3, 2, -3);
  const mRim2 = new THREE.PointLight("#4ab8ff", 40, 20);
  mRim2.position.set(-3, -2, -2);
  sMol.add(mKey, mRim, mRim2, new THREE.AmbientLight("#ffffff", 0.08));
  function updateMol(lt) {
    setFov(38);
    const rise = easeOut(smooth(0, 0.9, lt));
    heroCaf.position.set(0, lerp(-5, -0.1, rise), 0);
    heroCaf.rotation.set(0.35 + Math.sin(lt * 0.7) * 0.15, -0.7 + lt * 0.55, 0.15);
    const p = molSteam.geometry.attributes.position;
    for (let i = 0; i < 300; i++) {
      const k = (hash1(i) * 4 + lt) % 4 / 4;
      p.setXYZ(i, (hash1(i + 1) - 0.5) * 7 + Math.sin(k * 5 + i) * 0.5, -5 + k * 10, -2 - hash1(i + 2) * 3);
    }
    p.needsUpdate = true;
    look(0, 0.4, lerp(10.5, 9.2, lt / 3), 0, 0.6, 0);
  }

  // ============================================================ C3. BRAIN
  const sBrain = newScene("#05060c", 0.02, 0.6);
  backdrop(sBrain, "#16224a", "#020205", -16, 60);
  const brainGeo = displace(new THREE.SphereGeometry(1, 220, 170), (x, y, z) => {
    const ridge = 1 - Math.abs(2 * fbm(x * 3.2 + 7, y * 3.2, z * 3.2, 3) - 1);
    const fissure = -0.22 * Math.exp(-(x * x) / 0.004) * (y > -0.2 ? 1 : 0.3);
    return 0.09 * ridge * ridge + fissure;
  });
  {
    const p = brainGeo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      let x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      x *= 1.15; z *= 1.45; y *= 1.0;
      if (y < -0.3) y = -0.3 + (y + 0.3) * 0.55;
      p.setXYZ(i, x, y, z);
    }
    brainGeo.computeVertexNormals();
  }
  const brainMat = new THREE.MeshPhysicalMaterial({ color: "#e3a9a8", roughness: 0.42, clearcoat: 0.6, clearcoatRoughness: 0.3, sheen: 0.8, sheenColor: new THREE.Color("#ffd0d0"), emissive: "#2a5aff", emissiveIntensity: 0 });
  const brain = new THREE.Mesh(brainGeo, brainMat);
  sBrain.add(brain);
  const cereb = new THREE.Mesh(displace(new THREE.SphereGeometry(0.55, 96, 64), (x, y, z) => 0.03 * Math.sin(y * 60)), brainMat);
  cereb.scale.set(1.3, 0.75, 0.9);
  cereb.position.set(0, -0.55, -0.95);
  sBrain.add(cereb);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.15, 1.6, 32), brainMat);
  stem.position.set(0, -1.15, -0.45);
  stem.rotation.x = 0.25;
  sBrain.add(stem);
  const brainCaf = makePoints(1400, "#7fe0ff", 0.07, glow, 1);
  sBrain.add(brainCaf);
  const bKey = new THREE.DirectionalLight("#fff0f0", 2.4);
  bKey.position.set(-3, 5, 5);
  const bRim = new THREE.PointLight("#4aa8ff", 70, 20);
  bRim.position.set(3, 2, -3);
  const bRim2 = new THREE.PointLight("#ff6ab0", 30, 20);
  bRim2.position.set(-3, -1, -3);
  sBrain.add(bKey, bRim, bRim2, new THREE.AmbientLight("#ffffff", 0.05));
  function updateBrain(lt) {
    setFov(40);
    brainMat.emissiveIntensity = smooth(0.6, 2.0, lt) * 0.25;
    const p = brainCaf.geometry.attributes.position;
    for (let i = 0; i < 1400; i++) {
      const k = (hash1(i) + lt * 0.55) % 1;
      const a = hash1(i + 1) * 6.28;
      // rise up the neck, then spread over the cortex
      if (k < 0.45) {
        const kk = k / 0.45;
        p.setXYZ(i, Math.cos(a) * 0.18, -3.2 + kk * 2.6, -0.45 + Math.sin(a) * 0.18);
      } else {
        const kk = (k - 0.45) / 0.55;
        const th = hash1(i + 2) * 6.28, ph = Math.acos(1 - hash1(i + 3) * 1.6);
        const r = lerp(0.2, 1.22, easeOut(kk));
        p.setXYZ(i, Math.sin(ph) * Math.cos(th) * r * 1.15, -0.6 + Math.cos(ph) * r + 0.6 * kk, Math.sin(ph) * Math.sin(th) * r * 1.45);
      }
    }
    p.needsUpdate = true;
    brain.rotation.y = cereb.rotation.y = 0;
    const a = 0.9 + lt * 0.35;
    const r = lerp(7.5, 5.2, easeInOut(lt / 2.1));
    look(Math.sin(a) * r, lerp(1.5, 0.9, lt / 2), Math.cos(a) * r, 0, -0.1, 0);
  }

  // ============================================================ C4. SYNAPSE (adenosine vs caffeine at receptors)
  const sSyn = newScene("#08040e", 0.035, 0.5);
  backdrop(sSyn, "#2a1450", "#030106", -18, 70);
  const memTex = tissueTexture(61, "#8a5aa8", "#4a2a6a", "#c8a0e0", false);
  memTex.wrapS = memTex.wrapT = THREE.RepeatWrapping;
  memTex.repeat.set(3, 3);
  const synMemMat = new THREE.MeshPhysicalMaterial({ color: "#b48ad8", map: memTex, bumpMap: memTex, bumpScale: 2, roughness: 0.35, clearcoat: 0.8, sheen: 0.8, sheenColor: new THREE.Color("#e0c0ff"), emissive: "#5a2a9a", emissiveIntensity: 0.25 });
  const synMem = new THREE.Mesh(new THREE.PlaneGeometry(26, 26, 160, 160), synMemMat);
  synMem.rotation.x = -Math.PI / 2;
  {
    const p = synMem.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i);
      p.setZ(i, -0.012 * (x * x + y * y) + 0.15 * fbm(x * 0.4, y * 0.4, 1));
    }
    synMem.geometry.computeVertexNormals();
  }
  sSyn.add(synMem);
  const RCN = 25;
  const recPosS = [];
  for (let i = 0; i < RCN; i++) {
    const gx = (i % 5) - 2, gz = Math.floor(i / 5) - 2;
    const x = gx * 1.7 + (hash1(i + 70) - 0.5) * 0.5, z = gz * 1.7 + (hash1(i + 71) - 0.5) * 0.5;
    recPosS.push(new THREE.Vector3(x, -0.012 * (x * x + z * z) + 0.15 * fbm(x * 0.4, -z * 0.4, 1) + 0.15, z));
  }
  const recGeo = new THREE.LatheGeometry([[0.0, 0], [0.42, 0.0], [0.5, 0.25], [0.45, 0.5], [0.3, 0.42], [0.22, 0.2], [0.0, 0.18]].map(([r, y]) => new THREE.Vector2(r, y)), 32);
  const synRecMat = new THREE.MeshPhysicalMaterial({ color: "#d8c8ff", roughness: 0.25, clearcoat: 1, emissive: "#6a4aff", emissiveIntensity: 0.3, side: THREE.DoubleSide });
  const synRec = new THREE.InstancedMesh(recGeo, synRecMat, RCN);
  for (let i = 0; i < RCN; i++) {
    m4.compose(recPosS[i], q.identity(), s3.setScalar(1));
    synRec.setMatrixAt(i, m4);
    synRec.setColorAt(i, new THREE.Color("#ffffff"));
  }
  sSyn.add(synRec);
  const AD_EXTRA = 45;
  const synAdo = new THREE.InstancedMesh(adoGeo, adoMat, RCN + AD_EXTRA);
  const synCaf = new THREE.InstancedMesh(cafGeo, cafMat, RCN);
  synAdo.frustumCulled = synCaf.frustumCulled = false;
  sSyn.add(synAdo, synCaf);
  const sKey = new THREE.DirectionalLight("#ffffff", 2.0);
  sKey.position.set(-3, 8, 5);
  const sGlow = new THREE.PointLight("#ff8a2a", 0, 18);
  sGlow.position.set(0, 2.5, 0);
  const sBlue = new THREE.PointLight("#40c8ff", 0, 18);
  sBlue.position.set(0, 2.5, 1);
  const sRim = new THREE.PointLight("#b070ff", 50, 30);
  sRim.position.set(4, 4, -6);
  sSyn.add(sKey, sGlow, sBlue, sRim, new THREE.AmbientLight("#c0a0ff", 0.12));
  const synCol = new THREE.Color();
  // docking schedule (global seconds)
  const tAdoIn = (i) => 13.4 + ((i * 7) % RCN) * 0.12;
  const tCafIn = (i) => 20.0 + ((i * 11) % RCN) * 0.09;
  const tCafOut = (i) => 34.6 + ((i * 3) % RCN) * 0.035;
  const tAdoBack = (i) => 35.5 + ((i * 13) % RCN) * 0.09;
  function molPose(mesh, idx, pos, rx, ry, s) {
    e3.set(rx, ry, 0);
    q.setFromEuler(e3);
    m4.compose(pos, q, s3.setScalar(s));
    mesh.setMatrixAt(idx, m4);
  }
  function updateSyn(t, cam) {
    setFov(44);
    let occA = 0, occC = 0;
    for (let i = 0; i < RCN; i++) {
      const rp = recPosS[i];
      const dock = tmp.set(rp.x, rp.y + 0.55, rp.z);
      const far = tmp2.set(rp.x + (hash1(i + 3) - 0.5) * 6, 5.5 + hash1(i + 4) * 3, rp.z + (hash1(i + 5) - 0.5) * 6);
      const hover = new THREE.Vector3(rp.x + Math.sin(t * 1.3 + i) * 0.6 + (hash1(i + 9) - 0.5) * 2, 2.0 + Math.sin(t * 2 + i * 1.7) * 0.3, rp.z + Math.cos(t * 1.1 + i) * 0.6);
      // adenosine i
      let ap, ad = false;
      const k1 = easeInOut(clamp((t - tAdoIn(i)) / 0.9));
      ap = far.clone().lerp(dock, k1);
      if (k1 >= 1) ad = true;
      const kOff = easeOut(clamp((t - (tCafIn(i) - 0.05)) / 0.45));
      if (t > tCafIn(i) - 0.05) { ap = dock.clone().lerp(hover, kOff); ad = false; }
      const kBack = easeInOut(clamp((t - tAdoBack(i)) / 0.8));
      if (t > tAdoBack(i)) { ap = hover.clone().lerp(dock, kBack); ad = kBack >= 1; }
      molPose(synAdo, i, ap, t * 0.8 + i, i * 0.7 + (ad ? 0 : t), ad ? 0.17 : 0.15);
      if (ad) occA++;
      // caffeine i
      let cp, cd = false, cs = 0.17;
      const cIn = easeOut(clamp((t - tCafIn(i) + 0.5) / 0.55));
      const cOut = easeIn2(clamp((t - tCafOut(i)) / 0.9));
      if (t < tCafIn(i) - 0.5) { cp = HIDE; cs = 0; }
      else if (t < tCafOut(i)) {
        const from = new THREE.Vector3(rp.x + (hash1(i + 20) - 0.5) * 3, 6.5, rp.z + 2);
        cp = from.lerp(dock, cIn);
        cd = cIn >= 1;
      } else {
        cp = dock.clone().add(new THREE.Vector3((hash1(i + 30) - 0.5) * 4 * cOut, cOut * 6, (hash1(i + 31) - 0.5) * 4 * cOut));
        cs = 0.17 * (1 - cOut * 0.85);
        if (cOut >= 1) { cp = HIDE; cs = 0; }
      }
      molPose(synCaf, i, cp, 0.2 + i, i * 0.9 + (cd ? 0 : t * 1.5), cs);
      if (cd) occC++;
      synCol.set(cd ? "#7fe0ff" : ad ? "#ffb060" : "#ffffff");
      synRec.setColorAt(i, synCol);
    }
    // ambient adenosine drifting (builds up during the day, floods at the crash)
    const amb = t < 30 ? smooth(13.0, 16.5, t) : smooth(35.0, 37.5, t);
    for (let j = 0; j < AD_EXTRA; j++) {
      const on = j / AD_EXTRA < amb;
      const pos = on ? v3.set((hash1(j + 100) - 0.5) * 12, 1.0 + ((hash1(j + 101) * 3 + t * 0.3) % 3), (hash1(j + 102) - 0.5) * 10) : HIDE;
      molPose(synAdo, RCN + j, pos, t + j, j, on ? 0.13 : 0);
    }
    synAdo.instanceMatrix.needsUpdate = synCaf.instanceMatrix.needsUpdate = true;
    synRec.instanceColor.needsUpdate = true;
    const sleepy = occA / RCN, alert = occC / RCN;
    sGlow.intensity = 30 * sleepy;
    sBlue.intensity = 40 * alert;
    synMemMat.emissiveIntensity = 0.12 + 0.5 * alert;
    synMemMat.emissive.set(alert > 0.3 ? "#2a7aff" : "#5a2a9a");
    sKey.intensity = 2.0 - 0.9 * sleepy + 0.4 * alert;
    sSyn.environmentIntensity = 0.5 - 0.3 * sleepy;
    cam(t);
  }
  const easeIn2 = (k) => k * k;
  const camSynA = (t) => {
    const lt = t - 13.0;
    const a = -0.3 + lt * 0.08;
    look(Math.sin(a) * 10, lerp(7.5, 5.5, smooth(0, 4.8, lt)), Math.cos(a) * 10, 0, 0, 0);
  };
  const camSynB = (t) => {
    const lt = t - 19.95;
    const a = 0.25 + lt * 0.09;
    look(Math.sin(a) * 8.5, lerp(5.2, 4.2, smooth(0, 2.9, lt)), Math.cos(a) * 8.5, 0, 0.3, 0);
  };
  const camSynC = (t) => {
    const lt = t - 34.4;
    const a = -0.1 - lt * 0.06;
    const drop = easeInOut(smooth(3.6, 5.1, lt));
    look(Math.sin(a) * lerp(9.5, 6.5, drop), lerp(6.5, 2.4, drop), Math.cos(a) * lerp(9.5, 6.5, drop), 0, lerp(0.5, 0.2, drop), 0, drop * 0.25);
  };

  // ============================================================ C5. COMPARE (caffeine vs adenosine)
  const sCmp = newScene("#06070b", 0, 0.9);
  backdrop(sCmp, "#1a1d2e", "#030304", -16, 50);
  const cmpCaf = moleculeGroup(CAF, 0.42);
  const cmpAdo = moleculeGroup(ADO, 0.42);
  sCmp.add(cmpCaf, cmpAdo);
  const coreHalo = new THREE.Group();
  for (const [gx, col] of [[-1, "#7fe0ff"], [1, "#ffb060"]]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.03, 12, 96), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.0 }));
    ring.userData.gx = gx;
    coreHalo.add(ring);
  }
  sCmp.add(coreHalo);
  const cKey2 = new THREE.DirectionalLight("#ffffff", 2.6);
  cKey2.position.set(-3, 5, 6);
  const cR1 = new THREE.PointLight("#40c8ff", 50, 20);
  cR1.position.set(-4, 1, -3);
  const cR2 = new THREE.PointLight("#ff9a3a", 50, 20);
  cR2.position.set(4, 1, -3);
  sCmp.add(cKey2, cR1, cR2, new THREE.AmbientLight("#ffffff", 0.08));
  function updateCmp(lt) {
    setFov(40);
    const sp = easeOut(smooth(0, 0.5, lt));
    cmpCaf.position.set(lerp(0, -0.05, sp), lerp(-0.2, 2.6, sp), 0);
    cmpAdo.position.set(lerp(0, 0.1, sp), lerp(-0.2, -2.3, sp), 0);
    cmpCaf.rotation.set(0.2, Math.sin(lt * 1.2) * 0.35, 0);
    cmpAdo.rotation.set(0.2, Math.sin(lt * 1.2) * 0.35, 0);
    look(0, 0.2, 12.5, 0, 0.15, 0);
  }

  // ============================================================ C6. NEURON NETWORK (alert)
  const sNet = newScene("#02040a", 0.05, 0.4);
  backdrop(sNet, "#0c2448", "#010205", -20, 70);
  const somaMat = new THREE.MeshPhysicalMaterial({ color: "#9fd4ff", roughness: 0.3, clearcoat: 1, emissive: "#2a7aff", emissiveIntensity: 0.6 });
  const dendMat = new THREE.MeshPhysicalMaterial({ color: "#7fb8ff", roughness: 0.4, clearcoat: 0.6, emissive: "#1a4aaa", emissiveIntensity: 0.5 });
  const nets = [], paths = [];
  {
    const rnd = mulberry32(81);
    for (let n = 0; n < 9; n++) {
      const c = new THREE.Vector3((rnd() - 0.5) * 9, (rnd() - 0.5) * 16, -rnd() * 8);
      nets.push(c);
      const soma = new THREE.Mesh(displace(new THREE.IcosahedronGeometry(0.55, 4), (x, y, z) => (fbm(x * 3 + n, y * 3, z * 3) - 0.5) * 0.3), somaMat);
      soma.position.copy(c);
      sNet.add(soma);
      for (let b = 0; b < 6; b++) {
        const pts = [c.clone()];
        let d = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, (rnd() - 0.5) * 0.5).normalize();
        let p = c.clone();
        for (let s = 0; s < 5; s++) {
          d.add(new THREE.Vector3((rnd() - 0.5) * 0.8, (rnd() - 0.5) * 0.8, (rnd() - 0.5) * 0.4)).normalize();
          p = p.clone().addScaledVector(d, 0.9 + rnd() * 0.8);
          pts.push(p);
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        sNet.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 40, 0.07 - b * 0.004, 8), dendMat));
        paths.push(curve);
      }
    }
  }
  const sparks = makePoints(paths.length * 6, "#e8fbff", 0.22, glow, 1);
  sNet.add(sparks);
  const nLight = new THREE.PointLight("#7fd0ff", 60, 30);
  sNet.add(nLight, new THREE.AmbientLight("#406090", 0.25));
  function updateNet(lt) {
    setFov(48);
    somaMat.emissiveIntensity = 0.6 + 0.6 * Math.pow(Math.max(0, Math.sin(lt * 9)), 6);
    const p = sparks.geometry.attributes.position;
    for (let i = 0; i < paths.length; i++) {
      for (let k = 0; k < 6; k++) {
        const u = (hash1(i * 6 + k) + lt * (0.9 + hash1(i) * 0.8)) % 1;
        const pt = paths[i].getPointAt(u);
        p.setXYZ(i * 6 + k, pt.x, pt.y, pt.z);
      }
    }
    p.needsUpdate = true;
    const y = lerp(7, -6, easeInOut(lt / 3.3));
    look(Math.sin(lt * 0.4) * 2, y, 10 - lt * 0.8, 0, y - 1.5, -3, lt * 0.08);
    nLight.position.set(0, y, 6);
  }

  // ============================================================ C7. HALF-LIFE (mug, afternoon -> night)
  const sHalf = newScene("#0b0705", 0, 0.5);
  const halfBack = backdrop(sHalf, "#3a2010", "#060403", -16, 50);
  const mug2 = makeMugSet(sHalf);
  const HN = 40;
  const halfMols = new THREE.InstancedMesh(cafGeo, cafMat, HN);
  halfMols.frustumCulled = false;
  sHalf.add(halfMols);
  const dayCol = new THREE.Color("#ffd9ae"), nightCol = new THREE.Color("#6f8cff");
  function updateHalf(lt, t) {
    setFov(38);
    mug2.steam(lt, 1 - smooth(0, 5, lt) * 0.7);
    const hours = clamp((t - 28.6) / 5.0) * 5; // 4 PM -> 9 PM
    const remaining = HN * Math.pow(0.5, hours / 5);
    for (let i = 0; i < HN; i++) {
      const fade = clamp(remaining - i);
      const a = hash1(i) * 6.28 + lt * (0.25 + hash1(i + 1) * 0.2);
      const r = 2.3 + hash1(i + 2) * 1.6;
      const y = 0.4 + hash1(i + 3) * 3.4 + Math.sin(lt + i) * 0.15;
      molPose(halfMols, i, v3.set(Math.cos(a) * r, y + (1 - fade) * 1.5, Math.sin(a) * r), lt + i, i, 0.12 * fade + 0.0001);
    }
    halfMols.instanceMatrix.needsUpdate = true;
    const k = smooth(0, 5.4, lt);
    mug2.key.color.copy(dayCol).lerp(nightCol, k);
    mug2.key.intensity = lerp(260, 140, k);
    mug2.rim.intensity = lerp(60, 15, k);
    mug2.fill.intensity = lerp(18, 60, k);
    const a = lerp(0.5, -0.2, lt / 6);
    look(Math.sin(a) * 11.5, 3.6, Math.cos(a) * 11.5, 0, 1.6, 0);
  }

  // ============================================================ C8. END (mug)
  const sEnd = newScene("#0b0705", 0, 0.5);
  backdrop(sEnd, "#3a2010", "#060403", -16, 50);
  const mug3 = makeMugSet(sEnd);
  function updateEnd(lt) {
    setFov(36);
    mug3.steam(lt + 3);
    const a = lerp(0.35, -0.1, smooth(0, 6, lt));
    const r = lerp(12.5, 10.8, smooth(0, 6, lt));
    look(Math.sin(a) * r, 2.6, Math.cos(a) * r, 0, 1.9, 0);
  }

  // ============================================================ timeline
  const SEG = [
    [0, 3.25, (t) => (updateMug(t), sMug)],
    [3.25, 6.35, (t) => (updateMol(t - 3.25), sMol)],
    [6.35, 8.75, (t) => (updateVil(t - 6.35 + 0.4), sVil)],
    [8.75, 10.95, (t) => (updateVes(t - 8.75 + 0.3), sVes)],
    [10.95, 13.0, (t) => (updateBrain(t - 10.95), sBrain)],
    [13.0, 17.95, (t) => (updateSyn(t, camSynA), sSyn)],
    [17.95, 19.95, (t) => (updateCmp(t - 17.95), sCmp)],
    [19.95, 22.95, (t) => (updateSyn(t, camSynB), sSyn)],
    [22.95, 26.2, (t) => (updateNet(t - 22.95), sNet)],
    [26.2, 28.2, (t) => (updateHeart(t - 26.2), sHeart)],
    [28.2, 34.4, (t) => (updateHalf(t - 28.2, t), sHalf)],
    [34.4, 39.7, (t) => (updateSyn(t, camSynC), sSyn)],
    [39.7, 99, (t) => (updateEnd(t - 39.7), sEnd)],
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
