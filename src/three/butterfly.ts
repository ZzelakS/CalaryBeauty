import * as THREE from 'three'

const wingVertex = /* glsl */ `
  uniform float uFlap;
  uniform float uSpan;
  varying vec2 vLocal;

  void main() {
    // The wing plane faces the camera and the beat rotates it out of that
    // plane, so the butterfly stays legible from the front instead of
    // disappearing edge-on. Outer span lags so the membrane bends.
    float side = sign(position.x);
    float lag = 0.5 + 0.5 * clamp(abs(position.x) / uSpan, 0.0, 1.0);
    float angle = uFlap * side * lag;

    vec3 p = position;
    p.x = position.x * cos(angle);
    p.z = position.z - position.x * sin(angle);

    vLocal = vec2(abs(position.x) / uSpan, position.y / uSpan);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const wingFragment = /* glsl */ `
  uniform vec3 uInner;
  uniform vec3 uOuter;
  uniform vec3 uEdge;
  uniform float uOpacity;
  varying vec2 vLocal;

  void main() {
    float span = clamp(vLocal.x, 0.0, 1.0);
    vec3 colour = mix(uInner, uOuter, pow(span, 0.7));
    // dark outer margin, the way the mark in the logo is drawn
    colour = mix(colour, uEdge, smoothstep(0.46, 1.0, span) * 0.85);
    float alpha = uOpacity * (0.96 - span * 0.12);
    gl_FragColor = vec4(colour, alpha);
  }
`

type Phase = 'approach' | 'perched' | 'flee' | 'waiting'

const SPAN = 0.34

function wingGeometry(): THREE.BufferGeometry {
  // Forewing and hindwing per side — a single lobe reads as a blob at this size.
  // forewing: swept up and out to a point, trailing edge cut back in
  const forewing = new THREE.Shape()
  forewing.moveTo(0.03, 0.16)
  forewing.bezierCurveTo(0.3, 0.62, 0.72, 0.7, 0.92, 0.48)
  forewing.bezierCurveTo(1.0, 0.38, 0.86, 0.2, 0.52, 0.02)
  forewing.bezierCurveTo(0.3, -0.09, 0.12, -0.04, 0.03, 0.16)

  // hindwing: shorter, rounded, tucked under the forewing
  const hindwing = new THREE.Shape()
  hindwing.moveTo(0.04, 0.0)
  hindwing.bezierCurveTo(0.32, -0.04, 0.58, -0.22, 0.5, -0.42)
  hindwing.bezierCurveTo(0.44, -0.56, 0.18, -0.44, 0.08, -0.26)
  hindwing.bezierCurveTo(0.04, -0.18, 0.02, -0.08, 0.04, 0.0)

  const parts: THREE.BufferGeometry[] = []
  for (const shape of [forewing, hindwing]) {
    const right = new THREE.ShapeGeometry(shape, 20)
    parts.push(right, right.clone().scale(-1, 1, 1))
  }

  const merged = mergeAll(parts)
  parts.forEach((part) => part.dispose())

  // the shape stays in XY: +y is the nose, +z faces the camera
  merged.scale(SPAN, SPAN, SPAN)
  return merged
}

/** Tiny local merge so this module doesn't need BufferGeometryUtils. */
function mergeAll(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  let total = 0
  parts.forEach((part) => {
    total += (part.attributes.position as THREE.BufferAttribute).count
  })

  const positions = new Float32Array(total * 3)
  const indices: number[] = []
  let offset = 0

  parts.forEach((part) => {
    const attribute = part.attributes.position as THREE.BufferAttribute
    positions.set(attribute.array as Float32Array, offset * 3)
    const index = part.index
    if (index) {
      for (let i = 0; i < index.count; i++) indices.push(index.getX(i) + offset)
    }
    offset += attribute.count
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  if (indices.length) geometry.setIndex(indices)
  return geometry
}

export class Butterfly {
  readonly group = new THREE.Group()

  private wings: THREE.Mesh
  private material: THREE.ShaderMaterial
  /** Body and antennae fade with the wings — otherwise they hang in mid-air. */
  private solids: THREE.Material[] = []
  private phase: Phase = 'approach'
  private curve: THREE.CatmullRomCurve3
  private travel = 0
  private duration = 6
  private timer = 0
  private perch: THREE.Vector3
  private flapClock = 0
  private readonly tips: THREE.Vector3[]
  private readonly heading = new THREE.Vector3(0, 1, 0)
  private tipIndex = 0
  private enabled = false

  constructor(tips: THREE.Vector3[], private reducedMotion: boolean) {
    // Prefer outer tips — a butterfly lands near the end of a branch — and keep
    // to the right of the frame so it never perches on top of the headline.
    const outer = tips.slice(Math.floor(tips.length * 0.45))
    const clear = outer.filter((tip) => tip.x > 0.2)
    this.tips = (clear.length ? clear : outer.length ? outer : [new THREE.Vector3()]).slice()
    this.perch = this.pickPerch()

    const geometry = wingGeometry()
    this.material = new THREE.ShaderMaterial({
      vertexShader: wingVertex,
      fragmentShader: wingFragment,
      uniforms: {
        uFlap: { value: 0 },
        uSpan: { value: SPAN * 0.95 },
        uInner: { value: new THREE.Color('#B4762A') },
        uOuter: { value: new THREE.Color('#E3A94F') },
        uEdge: { value: new THREE.Color('#5A3810') },
        uOpacity: { value: 0 },
      },
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
    })

    this.wings = new THREE.Mesh(geometry, this.material)
    this.group.add(this.wings)

    const bodyMaterial = new THREE.MeshBasicMaterial({
      color: '#4A3113',
      transparent: true,
      opacity: 0,
    })
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.013, 0.13, 3, 8), bodyMaterial)
    body.position.y = 0.01
    this.group.add(body)

    // antennae — small, but they are what makes the silhouette read
    const span = SPAN * 0.34
    const antennae = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute(
        'position',
        new THREE.BufferAttribute(
          new Float32Array([
            0, 0.07, 0, -span * 0.7, 0.07 + span, 0.01,
            0, 0.07, 0, span * 0.7, 0.07 + span, 0.01,
          ]),
          3,
        ),
      ),
      new THREE.LineBasicMaterial({ color: '#6E4512', transparent: true, opacity: 0 }),
    )
    this.group.add(antennae)
    this.solids = [bodyMaterial, antennae.material as THREE.Material]

    this.curve = this.approachCurve()

    if (reducedMotion) {
      this.enabled = true
      this.phase = 'perched'
      this.group.position.copy(this.perch)
      this.material.uniforms.uFlap.value = 0.5
      this.setOpacity(1)
    }
  }

  private pickPerch(): THREE.Vector3 {
    this.tipIndex = (this.tipIndex + 1 + Math.floor(Math.random() * 3)) % this.tips.length
    return this.tips[this.tipIndex].clone().add(new THREE.Vector3(-0.02, 0.04, 0.02))
  }

  private approachCurve(): THREE.CatmullRomCurve3 {
    const from = new THREE.Vector3(5.2 + Math.random() * 1.2, -1.2 + Math.random() * 2.4, 0.2)
    const mid1 = new THREE.Vector3(3.2, 0.9, 0.35)
    const mid2 = new THREE.Vector3(1.6, -0.5, -0.15)
    const near = this.perch.clone().add(new THREE.Vector3(0.55, 0.4, 0.25))
    return new THREE.CatmullRomCurve3([from, mid1, mid2, near, this.perch.clone()], false, 'catmullrom', 0.4)
  }

  private fleeCurve(): THREE.CatmullRomCurve3 {
    const from = this.group.position.clone()
    return new THREE.CatmullRomCurve3(
      [
        from,
        from.clone().add(new THREE.Vector3(0.45, 0.75, 0.35)),
        from.clone().add(new THREE.Vector3(-0.5, 1.6, 0.7)),
        from.clone().add(new THREE.Vector3(1.9, 2.6, 1.1)),
      ],
      false,
      'catmullrom',
      0.4,
    )
  }

  private setOpacity(value: number): void {
    const clamped = THREE.MathUtils.clamp(value, 0, 1)
    this.material.uniforms.uOpacity.value = clamped
    this.solids.forEach((material) => {
      material.opacity = clamped * 0.9
    })
  }

  /** Called once the branch has materialised — nothing flies during the scan. */
  enable(): void {
    this.enabled = true
  }

  /** Where the pointer needs to get to before the butterfly bolts. */
  get position(): THREE.Vector3 {
    return this.group.position
  }

  get isPerched(): boolean {
    return this.phase === 'perched'
  }

  get isFleeing(): boolean {
    return this.phase === 'flee'
  }

  startle(): void {
    if (this.reducedMotion || this.phase !== 'perched') return
    this.phase = 'flee'
    this.curve = this.fleeCurve()
    this.travel = 0
    this.duration = 2.6
  }

  update(delta: number, elapsed: number): void {
    if (!this.enabled) return
    const flapSpeed = this.phase === 'perched' ? 2.2 : this.phase === 'flee' ? 17 : 11
    const flapDepth = this.phase === 'perched' ? 0.5 : this.phase === 'flee' ? 1.15 : 0.95
    this.flapClock += delta * flapSpeed

    if (this.reducedMotion) {
      this.material.uniforms.uFlap.value = 0.5
      this.faceAlong(new THREE.Vector3(-0.28, 0.94, 0.2))
      return
    }

    this.material.uniforms.uFlap.value = 0.18 + Math.sin(this.flapClock) * flapDepth * 0.5 + flapDepth * 0.5

    switch (this.phase) {
      case 'approach': {
        this.travel = Math.min(1, this.travel + delta / this.duration)
        const eased = 1 - Math.pow(1 - this.travel, 2.2)
        this.curve.getPointAt(Math.min(0.999, eased), this.group.position)
        // flutter — a butterfly never holds a clean line
        this.group.position.x += Math.sin(elapsed * 5.1) * 0.045 * (1 - eased)
        this.group.position.y += Math.sin(elapsed * 6.7 + 1.3) * 0.055 * (1 - eased)
        this.curve.getTangentAt(Math.min(0.999, eased), this.heading)
        this.faceAlong(this.heading)
        this.setOpacity(Math.min(1, this.travel * 3))
        if (this.travel >= 1) {
          this.phase = 'perched'
          this.timer = 0
        }
        break
      }
      case 'perched': {
        this.timer += delta
        this.group.position.copy(this.perch)
        this.group.position.y += Math.sin(elapsed * 1.4) * 0.012
        this.faceAlong(new THREE.Vector3(-0.28, 0.94, 0.2))
        this.group.rotation.z += Math.sin(elapsed * 0.9) * 0.07
        break
      }
      case 'flee': {
        this.travel = Math.min(1, this.travel + delta / this.duration)
        const eased = Math.pow(this.travel, 0.72)
        this.curve.getPointAt(Math.min(0.999, eased), this.group.position)
        this.curve.getTangentAt(Math.min(0.999, eased), this.heading)
        this.faceAlong(this.heading)
        this.setOpacity(1 - Math.pow(this.travel, 3))
        if (this.travel >= 1) {
          this.phase = 'waiting'
          this.timer = 0
          this.setOpacity(0)
        }
        break
      }
      case 'waiting': {
        this.timer += delta
        if (this.timer > 2.4) {
          this.perch = this.pickPerch()
          this.curve = this.approachCurve()
          this.travel = 0
          this.duration = 5.4
          this.phase = 'approach'
        }
        break
      }
    }
  }

  private faceAlong(direction: THREE.Vector3): void {
    // roll the nose (+y) onto the direction of travel, and tilt a little on the
    // depth axis so the beat still reads in perspective
    this.group.rotation.set(0, 0, Math.atan2(direction.y, direction.x) - Math.PI / 2)
    this.group.rotation.y = THREE.MathUtils.clamp(direction.z * 0.6, -0.5, 0.5)
  }

  dispose(): void {
    this.wings.geometry.dispose()
    this.material.dispose()
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh && child !== this.wings) {
        child.geometry.dispose()
        ;(child.material as THREE.Material).dispose()
      }
    })
  }
}
