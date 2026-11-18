import * as THREE from 'three'

const pointerVertex = /* glsl */ `
  attribute float aLife;
  attribute float aSeed;
  uniform float uSize;
  uniform float uPixelRatio;
  varying float vLife;
  varying float vSeed;

  void main() {
    vLife = aLife;
    vSeed = aSeed;
    vec4 view = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * view;
    float grow = 0.35 + aLife * 0.65;
    gl_PointSize = uSize * uPixelRatio * grow * (1.0 / max(0.001, -view.z));
  }
`

const pointerFragment = /* glsl */ `
  uniform vec3 uNear;
  uniform vec3 uFar;
  varying float vLife;
  varying float vSeed;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.02, d);
    vec3 colour = mix(uFar, uNear, pow(vLife, 1.6) * (0.65 + 0.35 * vSeed));
    gl_FragColor = vec4(colour, soft * vLife * 0.7);
  }
`

const dustVertex = /* glsl */ `
  attribute float aSeed;
  uniform float uTime;
  uniform float uSize;
  uniform float uPixelRatio;
  varying float vSeed;

  void main() {
    vSeed = aSeed;
    vec3 p = position;
    p.x += sin(uTime * 0.14 + aSeed * 24.0) * 0.22;
    p.y += cos(uTime * 0.11 + aSeed * 17.0) * 0.18;
    vec4 view = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * view;
    gl_PointSize = uSize * uPixelRatio * (0.5 + aSeed) * (1.0 / max(0.001, -view.z));
  }
`

const dustFragment = /* glsl */ `
  uniform vec3 uColour;
  uniform float uOpacity;
  varying float vSeed;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, d);
    gl_FragColor = vec4(uColour, soft * uOpacity * (0.25 + vSeed * 0.75));
  }
`

const COUNT = 520

/** Mint motes that trail the pointer and drift upward as they fade. */
export class PointerParticles {
  readonly points: THREE.Points
  private material: THREE.ShaderMaterial
  private geometry: THREE.BufferGeometry
  private positions: Float32Array
  private velocities: Float32Array
  private lives: Float32Array
  private cursor = 0

  constructor(pixelRatio: number) {
    this.positions = new Float32Array(COUNT * 3)
    this.velocities = new Float32Array(COUNT * 3)
    this.lives = new Float32Array(COUNT)
    const seeds = new Float32Array(COUNT)
    for (let i = 0; i < COUNT; i++) seeds[i] = Math.random()

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3))
    this.geometry.setAttribute('aLife', new THREE.BufferAttribute(this.lives, 1))
    this.geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))
    this.geometry.setDrawRange(0, COUNT)
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 60)

    this.material = new THREE.ShaderMaterial({
      vertexShader: pointerVertex,
      fragmentShader: pointerFragment,
      uniforms: {
        uSize: { value: 190 },
        uPixelRatio: { value: pixelRatio },
        uNear: { value: new THREE.Color('#A9701F') },
        uFar: { value: new THREE.Color('#E8B45C') },
      },
      transparent: true,
      depthWrite: false,
      // normal blending: additive motes wash out to nothing on a cream page
      blending: THREE.NormalBlending,
    })

    this.points = new THREE.Points(this.geometry, this.material)
    this.points.frustumCulled = false
  }

  setPixelRatio(ratio: number): void {
    this.material.uniforms.uPixelRatio.value = ratio
  }

  spawn(at: THREE.Vector3, amount = 3, spread = 0.06, energy = 0.35): void {
    for (let n = 0; n < amount; n++) {
      const i = this.cursor
      this.cursor = (this.cursor + 1) % COUNT
      const i3 = i * 3
      this.positions[i3] = at.x + (Math.random() - 0.5) * spread
      this.positions[i3 + 1] = at.y + (Math.random() - 0.5) * spread
      this.positions[i3 + 2] = at.z + (Math.random() - 0.5) * spread
      this.velocities[i3] = (Math.random() - 0.5) * energy
      this.velocities[i3 + 1] = (Math.random() - 0.2) * energy
      this.velocities[i3 + 2] = (Math.random() - 0.5) * energy * 0.6
      this.lives[i] = 1
    }
  }

  update(delta: number): void {
    const drag = Math.pow(0.14, delta)
    for (let i = 0; i < COUNT; i++) {
      if (this.lives[i] <= 0) continue
      const i3 = i * 3
      this.positions[i3] += this.velocities[i3] * delta
      this.positions[i3 + 1] += this.velocities[i3 + 1] * delta + 0.06 * delta
      this.positions[i3 + 2] += this.velocities[i3 + 2] * delta
      this.velocities[i3] *= drag
      this.velocities[i3 + 1] *= drag
      this.velocities[i3 + 2] *= drag
      this.lives[i] = Math.max(0, this.lives[i] - delta * 0.62)
    }
    ;(this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true
    ;(this.geometry.attributes.aLife as THREE.BufferAttribute).needsUpdate = true
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}

/** Slow ambient motes that give the parallax something to bite on. */
export class DustField {
  readonly points: THREE.Points
  private material: THREE.ShaderMaterial
  private geometry: THREE.BufferGeometry

  constructor(count: number, radius: number, pixelRatio: number) {
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count)
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * radius * 2.4
      positions[i * 3 + 1] = (Math.random() - 0.5) * radius * 1.4
      positions[i * 3 + 2] = (Math.random() - 0.5) * radius
      seeds[i] = Math.random()
    }

    this.geometry = new THREE.BufferGeometry()
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    this.geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1))

    this.material = new THREE.ShaderMaterial({
      vertexShader: dustVertex,
      fragmentShader: dustFragment,
      uniforms: {
        uTime: { value: 0 },
        uSize: { value: 62 },
        uPixelRatio: { value: pixelRatio },
        uColour: { value: new THREE.Color('#B08A50') },
        uOpacity: { value: 0 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
    })

    this.points = new THREE.Points(this.geometry, this.material)
  }

  set opacity(value: number) {
    this.material.uniforms.uOpacity.value = value
  }

  setPixelRatio(ratio: number): void {
    this.material.uniforms.uPixelRatio.value = ratio
  }

  update(elapsed: number): void {
    this.material.uniforms.uTime.value = elapsed
  }

  dispose(): void {
    this.geometry.dispose()
    this.material.dispose()
  }
}
