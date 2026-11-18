/**
 * Two passes over the same geometry.
 *
 * 1. WIRE — a cold scan front travels outward from the base of the branch and
 *    reveals the triangulated wireframe as it passes, leaving a faint ghost mesh
 *    behind it. A slow pulse keeps sweeping after the intro so the scene reads
 *    as still being surveyed.
 * 2. SURFACE — the solid branch materialises behind the same front, with a mint
 *    burn edge at the boundary and a warm rim light picked up from the palette.
 */

export const wireVertex = /* glsl */ `
  uniform vec3 uOrigin;
  uniform float uMaxDist;
  varying float vDist;
  varying float vDepth;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vDist = distance(world.xyz, uOrigin) / uMaxDist;
    vec4 view = viewMatrix * world;
    vDepth = -view.z;
    gl_Position = projectionMatrix * view;
  }
`

export const wireFragment = /* glsl */ `
  uniform float uScan;      // reveal front, 0 -> 1.05
  uniform float uTime;
  uniform float uGhost;     // opacity of the mesh left behind the front
  uniform float uOpacity;   // master fade
  uniform vec3 uScanColor;
  uniform vec3 uEdgeColor;
  varying float vDist;
  varying float vDepth;

  void main() {
    float revealed = step(vDist, uScan);
    if (revealed < 0.5) discard;

    // bright band immediately behind the travelling front
    float edge = smoothstep(0.075, 0.0, uScan - vDist);

    // ambient survey pulse that keeps looping after the intro
    float loop = fract(uTime * 0.085) * 1.25;
    float pulse = smoothstep(0.035, 0.0, abs(loop - vDist)) * 0.55;

    float alpha = (uGhost + edge * 0.9 + pulse) * uOpacity;
    alpha *= smoothstep(26.0, 7.0, vDepth);
    if (alpha < 0.004) discard;

    // on a light page the leading edge has to darken, not brighten, to read
    vec3 colour = mix(uScanColor, uEdgeColor, edge);
    gl_FragColor = vec4(colour, alpha);
  }
`

export const surfaceVertex = /* glsl */ `
  uniform vec3 uOrigin;
  uniform float uMaxDist;
  varying float vDist;
  varying float vDepth;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec2 vUv;

  void main() {
    vec4 world = modelMatrix * vec4(position, 1.0);
    vDist = distance(world.xyz, uOrigin) / uMaxDist;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vView = normalize(cameraPosition - world.xyz);
    // on a tube, uv.x runs the length of the limb and uv.y wraps around it
    vUv = uv;
    vec4 view = viewMatrix * world;
    vDepth = -view.z;
    gl_Position = projectionMatrix * view;
  }
`

export const surfaceFragment = /* glsl */ `
  uniform float uReveal;
  uniform float uBark;
  uniform float uTime;
  uniform vec3 uDark;
  uniform vec3 uLight;
  uniform vec3 uCopper;
  uniform vec3 uScanColor;
  uniform vec3 uFog;
  uniform vec3 uLightDir;
  varying float vDist;
  varying float vDepth;
  varying vec3 vNormal;
  varying vec3 vView;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      value += amp * noise(p);
      p *= 2.07;
      amp *= 0.5;
    }
    return value;
  }

  /**
   * Bark: noise stretched hard along the limb so it reads as fibre running with
   * the grain, plus a coarser break-up for the plates and a knot here and there.
   */
  float barkHeight(vec2 uv) {
    float fibre = fbm(vec2(uv.y * 34.0, uv.x * 4.0));
    float plates = fbm(vec2(uv.y * 9.0 + 11.3, uv.x * 1.6 + 4.7));
    float knots = smoothstep(0.74, 0.98, fbm(vec2(uv.y * 5.0, uv.x * 2.4) + 21.0));
    return fibre * 0.55 + plates * 0.45 - knots * 0.35;
  }

  void main() {
    float front = uReveal * 1.05;
    if (vDist > front) discard;

    vec3 n = normalize(vNormal);

    // sample the bark either side to fake a normal without a normal map
    float e = 0.006;
    float h = barkHeight(vUv);
    float hy = barkHeight(vUv + vec2(0.0, e));
    float hx = barkHeight(vUv + vec2(e, 0.0));
    float bump = ((h - hy) * 2.4 + (h - hx) * 0.8) * uBark;

    float key = clamp(dot(n, normalize(uLightDir)) * 0.5 + 0.5, 0.0, 1.0);
    key = clamp(pow(key, 0.85) + bump, 0.0, 1.0);
    float rim = pow(1.0 - clamp(dot(n, normalize(vView)), 0.0, 1.0), 2.6);

    vec3 colour = mix(uDark, uLight, key * key);

    // crevices hold the darker tone, raised fibre catches the light
    colour *= 1.0 - (0.5 - h) * 0.55 * uBark;
    colour += uLight * smoothstep(0.62, 0.9, h) * 0.16 * uBark;

    colour += uCopper * rim * 0.75;

    // mint burn at the materialising edge
    float edge = smoothstep(0.11, 0.0, front - vDist);
    colour = mix(colour, uScanColor, edge * 0.85);

    // the survey pulse reads on the surface too, very faintly
    float loop = fract(uTime * 0.085) * 1.25;
    colour += uScanColor * smoothstep(0.03, 0.0, abs(loop - vDist)) * 0.18;

    float fog = smoothstep(28.0, 6.0, vDepth);
    colour = mix(uFog, colour, fog);

    gl_FragColor = vec4(colour, 1.0);
  }
`
