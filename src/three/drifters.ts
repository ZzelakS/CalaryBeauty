import * as THREE from 'three'

/**
 * Tiny ambient butterflies. No perching, no interaction, no raycasting — they
 * wander closed loops and exist only to make the air feel occupied. The one
 * that lands and startles stays in butterfly.ts.
 *
 * Wings and body are each a single shared geometry, so the cost is two draw
 * calls per drifter and no per-instance allocation.
 */

const drifterVertex = /* glsl */ `
  uniform float uFlap;
  uniform float uSpan;
  varying float vSpan;

  void main() {
    float side = sign(position.x);
    float lag = 0.5 + 0.5 * clamp(abs(position.x) / uSpan, 0.0, 1.0);
    float angle = uFlap * side * lag;

    vec3 p = position;
    p.x = position.x * cos(angle);
    p.z = position.z - position.x * sin(angle);

    vSpan = abs(position.x) / uSpan;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`

const drifterFragment = /* glsl */ `
  uniform vec3 uInner;
  uniform vec3 uEdge;
  uniform float uOpacity;
  varying float vSpan;

  void main() {
    // the dark outer margin is what stops a wing reading as a petal
    vec3 colour = mix(uInner, uEdge, smoothstep(0.25, 0.85, vSpan));
    gl_FragColor = vec4(colour, uOpacity * (0.94 - vSpan * 0.12));
  }
`

/** Forewing plus hindwing per side — the same silhouette as the big one. */
function wingShape(): THREE.BufferGeometry {
  const forewing = new THREE.Shape()
  forewing.moveTo(0.03, 0.16)
  forewing.bezierCurveTo(0.3, 0.62, 0.72, 0.7, 0.92, 0.48)
  forewing.bezierCurveTo(1.0, 0.38, 0.86, 0.2, 0.52, 0.02)
  forewing.bezierCurveTo(0.3, -0.09, 0.12, -0.04, 0.03, 0.16)

  const hindwing = new THREE.Shape()
  hindwing.moveTo(0.04, 0.0)
  hindwing.bezierCurveTo(0.32, -0.04, 0.58, -0.22, 0.5, -0.42)
  hindwing.bezierCurveTo(0.44, -0.56, 0.18, -0.44, 0.08, -0.26)
  hindwing.bezierCurveTo(0.04, -0.18, 0.02, -0.08, 0.04, 0.0)

  const parts: THREE.BufferGeometry[] = []
  for (const shape of [forewing, hindwing]) {
    const right = new THREE.ShapeGeometry(shape, 12)
    parts.push(right, right.clone().scale(-1, 1, 1))
  }

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
    if (part.index) {
      for (let i = 0; i < part.index.count; i++) indices.push(part.index.getX(i) + offset)
    }
    offset += attribute.count
    part.dispose()
  })

  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  if (indices.length) geometry.setIndex(indices)
  return geometry
}

interface Drifter {
  mesh: THREE.Mesh
  material: THREE.ShaderMaterial
  curve: THREE.CatmullRomCurve3
  speed: number
  phase: number
  flapRate: number
  wobble: number
}

export class Drifters {
  readonly group = new THREE.Group()

  private drifters: Drifter[] = []
  private geometry = wingShape()
  private bodyGeometry = new THREE.CapsuleGeometry(0.05, 0.42, 3, 6)
  private bodyMaterial = new THREE.MeshBasicMaterial({
    color: '#4A3113',
    transparent: true,
    opacity: 0,
  })
  private tmp = new THREE.Vector3()
  private tangent = new THREE.Vector3()

  constructor(
    count: number,
    private reducedMotion: boolean,
  ) {
    for (let i = 0; i < count; i++) {
      const material = new THREE.ShaderMaterial({
        vertexShader: drifterVertex,
        fragmentShader: drifterFragment,
        uniforms: {
          uFlap: { value: 0 },
          uSpan: { value: 0.95 },
          uInner: { value: new THREE.Color('#C6913C') },
          uEdge: { value: new THREE.Color('#5A3810') },
          uOpacity: { value: 0 },
        },
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      })

      const mesh = new THREE.Mesh(this.geometry, material)
      mesh.scale.setScalar(0.075 + Math.random() * 0.035)

      // the body rides inside the wing mesh, so it inherits the same transform
      const body = new THREE.Mesh(this.bodyGeometry, this.bodyMaterial)
      body.position.y = 0.02
      mesh.add(body)

      // A closed loop of jittered points, built in the wide framing. The group
      // transform in layout() adapts the whole set to narrow screens, so the
      // circuits never have to be rebuilt on resize.
      const points: THREE.Vector3[] = []
      const radius = 1.6 + Math.random() * 2.2
      const centre = new THREE.Vector3(
        -1 + Math.random() * 4,
        -0.6 + Math.random() * 2.4,
        -0.8 + Math.random() * 1.6,
      )
      for (let p = 0; p < 6; p++) {
        const angle = (p / 6) * Math.PI * 2
        points.push(
          new THREE.Vector3(
            centre.x + Math.cos(angle) * radius * (0.6 + Math.random() * 0.8),
            centre.y + Math.sin(angle) * radius * 0.45 * (0.5 + Math.random()),
            centre.z + (Math.random() - 0.5) * 1.4,
          ),
        )
      }

      this.drifters.push({
        mesh,
        material,
        curve: new THREE.CatmullRomCurve3(points, true, 'catmullrom', 0.5),
        speed: 0.018 + Math.random() * 0.022,
        phase: Math.random(),
        flapRate: 12 + Math.random() * 6,
        wobble: Math.random() * 10,
      })

      this.group.add(mesh)
    }
  }

  /**
   * The camera pulls back on narrow viewports, which would shrink these to
   * nothing and push half the circuits off-frame. Scaling the group by the same
   * factor keeps their apparent size, the horizontal squeeze keeps them inside
   * a portrait frame, and the lift follows the raised camera aim.
   */
  layout(aspect: number): void {
    const narrow = aspect < 1.2
    if (!narrow) {
      this.group.scale.set(1, 1, 1)
      this.group.position.set(0, 0, 0)
      return
    }

    const pullback = Math.pow(1.2 / aspect, 0.45)
    this.group.scale.set(pullback * 0.72, pullback, pullback)
    this.group.position.set(-0.3 * pullback, 0.55 * pullback, 0)
  }

  update(delta: number, elapsed: number, reveal: number): void {
    this.bodyMaterial.opacity = reveal * 0.8

    this.drifters.forEach((drifter) => {
      drifter.material.uniforms.uOpacity.value = reveal * 0.85

      if (this.reducedMotion) {
        drifter.material.uniforms.uFlap.value = 0.5
        return
      }

      drifter.phase = (drifter.phase + delta * drifter.speed) % 1
      drifter.curve.getPointAt(drifter.phase, this.tmp)
      // a little bob, so they do not trace a clean rail
      this.tmp.y += Math.sin(elapsed * 1.7 + drifter.wobble) * 0.07
      drifter.mesh.position.copy(this.tmp)

      drifter.curve.getTangentAt(drifter.phase, this.tangent)
      drifter.mesh.rotation.z = Math.atan2(this.tangent.y, this.tangent.x) - Math.PI / 2
      drifter.mesh.rotation.y = THREE.MathUtils.clamp(this.tangent.z * 0.8, -0.6, 0.6)

      drifter.material.uniforms.uFlap.value =
        0.2 + Math.sin(elapsed * drifter.flapRate + drifter.wobble) * 0.55 + 0.55
    })
  }

  dispose(): void {
    this.geometry.dispose()
    this.bodyGeometry.dispose()
    this.bodyMaterial.dispose()
    this.drifters.forEach((drifter) => drifter.material.dispose())
  }
}