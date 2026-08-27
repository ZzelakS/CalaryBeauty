import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

export interface BranchResult {
  /** Merged, tapered tube mesh for every limb. */
  solid: THREE.BufferGeometry
  /** Triangulated wireframe of the same mesh — the scan pass draws this. */
  wire: THREE.BufferGeometry
  /** End point of every limb, sorted outward. Used as butterfly landing spots. */
  tips: THREE.Vector3[]
  /** Distance from the scan origin to the furthest vertex. */
  maxDist: number
  /** Where the scan starts from — the base of the trunk. */
  origin: THREE.Vector3
}

interface Limb {
  points: THREE.Vector3[]
  radius: number
}

/** Small deterministic PRNG so the branch is identical on every visit. */
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TUBULAR = 26
const RADIAL = 5

function grow(
  start: THREE.Vector3,
  dir: THREE.Vector3,
  length: number,
  radius: number,
  depth: number,
  rnd: () => number,
  limbs: Limb[],
  tips: THREE.Vector3[],
): void {
  const segments = Math.max(6, 13 - depth * 3)
  const points: THREE.Vector3[] = [start.clone()]
  const heading = dir.clone().normalize()
  // the trunk holds its line; the further out a limb is, the more it falls away
  const fall = depth === 0 ? 0.09 + rnd() * 0.1 : 0.16 + rnd() * 0.34
  const droop = new THREE.Vector3(
    (rnd() - 0.5) * 0.45,
    -fall,
    (rnd() - 0.5) * 0.4,
  ).multiplyScalar(1 / segments)

  let cursor = start.clone()
  const wobble = 0.5 / segments
  for (let i = 1; i <= segments; i++) {
    heading.add(droop)
    // a little wander per segment, otherwise limbs read as drawn rods
    heading.x += (rnd() - 0.5) * wobble
    heading.y += (rnd() - 0.5) * wobble * 0.7
    heading.z += (rnd() - 0.5) * wobble
    heading.normalize()
    cursor = cursor.clone().addScaledVector(heading, length / segments)
    points.push(cursor)
  }

  limbs.push({ points, radius })
  tips.push(points[points.length - 1].clone())

  if (depth >= 3 || radius < 0.014) return

  const children = depth === 0 ? 4 : rnd() > 0.4 ? 2 : 1
  for (let c = 0; c < children; c++) {
    // spread the offshoots along the parent rather than clustering at one node
    const t = depth === 0 ? 0.2 + (c + rnd() * 0.85) / (children + 0.1) * 0.78 : 0.3 + rnd() * 0.6
    const index = Math.max(1, Math.floor(t * (points.length - 1)))
    const base = points[index]
    const tangent = points[Math.min(index + 1, points.length - 1)]
      .clone()
      .sub(points[index - 1])
      .normalize()
    const axis = new THREE.Vector3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize()
    const childDir = tangent.clone().applyAxisAngle(axis, 0.5 + rnd() * 0.85)
    // bias every child outward and down — twigs hang, they do not reach upward
    childDir
      .lerp(new THREE.Vector3(0.35 + rnd() * 0.5, -0.75, (rnd() - 0.5) * 0.9).normalize(), 0.24)
      .normalize()
    grow(
      base.clone(),
      childDir,
      length * (0.42 + rnd() * 0.2),
      radius * 0.63,
      depth + 1,
      rnd,
      limbs,
      tips,
    )
  }
}

/** Tube a limb, then pull its rings inward so the branch thins toward the tip. */
function tubeLimb(limb: Limb): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(limb.points, false, 'catmullrom', 0.4)
  const geometry = new THREE.TubeGeometry(curve, TUBULAR, limb.radius, RADIAL, false)
  const position = geometry.attributes.position as THREE.BufferAttribute
  const centre = new THREE.Vector3()
  const vertex = new THREE.Vector3()

  for (let i = 0; i <= TUBULAR; i++) {
    const u = i / TUBULAR
    curve.getPointAt(u, centre)
    const taper = THREE.MathUtils.lerp(1, 0.17, Math.pow(u, 0.85))
    for (let j = 0; j <= RADIAL; j++) {
      const k = i * (RADIAL + 1) + j
      vertex.fromBufferAttribute(position, k)
      vertex.sub(centre).multiplyScalar(taper).add(centre)
      position.setXYZ(k, vertex.x, vertex.y, vertex.z)
    }
  }

  position.needsUpdate = true
  geometry.computeVertexNormals()
  return geometry
}

export function buildBranch(seed = 2401): BranchResult {
  const rnd = seeded(seed)
  const limbs: Limb[] = []
  const tips: THREE.Vector3[] = []
  const origin = new THREE.Vector3(-5.1, 2.05, -0.5)

  grow(origin.clone(), new THREE.Vector3(1, -0.03, 0.16), 5.1, 0.115, 0, rnd, limbs, tips)

  const parts = limbs.map(tubeLimb)
  const merged = mergeGeometries(parts, false)
  parts.forEach((p) => p.dispose())

  if (!merged) throw new Error('Branch geometry could not be merged')

  const position = merged.attributes.position as THREE.BufferAttribute
  const vertex = new THREE.Vector3()
  let maxDist = 0
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i)
    maxDist = Math.max(maxDist, vertex.distanceTo(origin))
  }

  tips.sort((a, b) => a.distanceTo(origin) - b.distanceTo(origin))

  return {
    solid: merged,
    wire: new THREE.WireframeGeometry(merged),
    tips,
    maxDist,
    origin,
  }
}
