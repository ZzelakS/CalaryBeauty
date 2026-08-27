import * as THREE from 'three'
import { buildBranch } from './branch'
import { Butterfly } from './butterfly'
import { Drifters } from './drifters'
import { DustField, PointerParticles } from './particles'
import {
  surfaceFragment,
  surfaceVertex,
  wireFragment,
  wireVertex,
} from './shaders/branchShaders'

export interface HeroSceneOptions {
  canvas: HTMLCanvasElement
  container: HTMLElement
  reducedMotion?: boolean
  /** 0 → 1 progress of the opening field scan. */
  onProgress?: (progress: number) => void
  onIntroComplete?: () => void
}

const SCAN_DELAY = 0.3
const SCAN_DURATION = 2.1
const REVEAL_START = 1.05
const REVEAL_DURATION = 1.9

const PAGE = new THREE.Color('#FBF6EF')

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export class HeroScene {
  private renderer: THREE.WebGLRenderer
  private scene = new THREE.Scene()
  private camera: THREE.PerspectiveCamera
  private branchGroup = new THREE.Group()
  private dustGroup = new THREE.Group()

  private wire: THREE.LineSegments
  private surface: THREE.Mesh
  private wireMaterial: THREE.ShaderMaterial
  private surfaceMaterial: THREE.ShaderMaterial
  private butterfly: Butterfly
  private drifters: Drifters
  private pointerParticles: PointerParticles
  private dust: DustField

  private clock = new THREE.Clock()
  private frame = 0
  private elapsed = 0
  private introDone = false
  private running = true
  private visible = true

  private pointer = new THREE.Vector2(0, 0)      // normalised device coords
  private pointerInside = false
  private pointerWorld = new THREE.Vector3()
  private lastSpawn = new THREE.Vector3()
  private raycaster = new THREE.Raycaster()
  private spawnPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -0.35)
  private cameraBase = new THREE.Vector3(0.2, 0.05, 7.2)
  private cameraTarget = new THREE.Vector3()
  private lookAt = new THREE.Vector3(-0.15, 0.35, 0)
  private tmp = new THREE.Vector3()

  private resizeObserver: ResizeObserver
  private intersectionObserver: IntersectionObserver
  private readonly options: HeroSceneOptions
  private readonly reducedMotion: boolean

  constructor(options: HeroSceneOptions) {
    this.options = options
    this.reducedMotion = options.reducedMotion ?? false

    this.renderer = new THREE.WebGLRenderer({
      canvas: options.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    })
    this.renderer.setClearColor(PAGE, 0)
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    this.renderer.setPixelRatio(pixelRatio)

    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120)
    this.camera.position.copy(this.cameraBase)

    const branch = buildBranch()

    this.wireMaterial = new THREE.ShaderMaterial({
      vertexShader: wireVertex,
      fragmentShader: wireFragment,
      uniforms: {
        uOrigin: { value: branch.origin.clone() },
        uMaxDist: { value: branch.maxDist },
        uScan: { value: this.reducedMotion ? 1.1 : 0 },
        uTime: { value: 0 },
        uGhost: { value: this.reducedMotion ? 0.07 : 0.34 },
        uOpacity: { value: this.reducedMotion ? 0.4 : 1 },
        uScanColor: { value: new THREE.Color('#B98A3C') },
        uEdgeColor: { value: new THREE.Color('#4A3113') },
      },
      transparent: true,
      depthWrite: false,
    })

    this.surfaceMaterial = new THREE.ShaderMaterial({
      vertexShader: surfaceVertex,
      fragmentShader: surfaceFragment,
      uniforms: {
        uOrigin: { value: branch.origin.clone() },
        uMaxDist: { value: branch.maxDist },
        uReveal: { value: this.reducedMotion ? 1.1 : 0 },
        uBark: { value: 1 },
        uTime: { value: 0 },
        uDark: { value: new THREE.Color('#6E4818') },
        uLight: { value: new THREE.Color('#C99446') },
        uCopper: { value: new THREE.Color('#D9A24C') },
        uScanColor: { value: new THREE.Color('#F2D9A8') },
        uFog: { value: PAGE.clone() },
        uLightDir: { value: new THREE.Vector3(-0.45, 0.85, 0.5) },
      },
    })

    this.wire = new THREE.LineSegments(branch.wire, this.wireMaterial)
    this.surface = new THREE.Mesh(branch.solid, this.surfaceMaterial)
    this.branchGroup.add(this.surface, this.wire)

    this.butterfly = new Butterfly(branch.tips, this.reducedMotion)
    this.branchGroup.add(this.butterfly.group)

    // tiny ambient ones — no perching, no interaction, every viewport
    this.drifters = new Drifters(3, this.reducedMotion)
    this.branchGroup.add(this.drifters.group)

    this.pointerParticles = new PointerParticles(pixelRatio)
    this.branchGroup.add(this.pointerParticles.points)

    this.dust = new DustField(420, 11, pixelRatio)
    this.dustGroup.add(this.dust.points)
    if (this.reducedMotion) this.dust.opacity = 0.22

    this.scene.add(this.branchGroup, this.dustGroup)

    this.layout()
    this.resizeObserver = new ResizeObserver(() => this.layout())
    this.resizeObserver.observe(options.container)

    this.intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        this.visible = entry.isIntersecting
      },
      { threshold: 0 },
    )
    this.intersectionObserver.observe(options.container)

    window.addEventListener('pointermove', this.handlePointerMove, { passive: true })
    window.addEventListener('pointerdown', this.handlePointerDown, { passive: true })
    document.addEventListener('visibilitychange', this.handleVisibility)

    if (this.reducedMotion) {
      this.options.onProgress?.(1)
      this.introDone = true
      this.options.onIntroComplete?.()
    }

    this.frame = requestAnimationFrame(this.tick)
  }

  private layout = (): void => {
    const { clientWidth, clientHeight } = this.options.container
    const width = Math.max(1, clientWidth)
    const height = Math.max(1, clientHeight)
    const aspect = width / height

    this.renderer.setSize(width, height, false)
    this.camera.aspect = aspect
    // On narrow viewports, pull back enough to keep the branch readable and
    // raise the aim so it sits above the headline rather than behind it.
    const narrow = aspect < 1.2
    const pullback = narrow ? Math.pow(1.2 / aspect, 0.45) : 1
    this.cameraBase.set(narrow ? -0.1 : 0.2, narrow ? 0.5 : 0.05, 7.2 * pullback)
    this.lookAt.set(-0.15, narrow ? 0.9 : 0.35, 0)
    this.camera.updateProjectionMatrix()

    // runs once during construction, before the field is assigned
    this.drifters?.layout(aspect)
  }

  private handlePointerMove = (event: PointerEvent): void => {
    const rect = this.options.canvas.getBoundingClientRect()
    const inside =
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    this.pointerInside = inside
    if (!inside) return

    this.pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -(((event.clientY - rect.top) / rect.height) * 2 - 1),
    )
  }

  private handlePointerDown = (event: PointerEvent): void => {
    this.handlePointerMove(event)
    if (!this.pointerInside || this.reducedMotion) return
    this.pointerParticles.spawn(this.pointerWorld, 22, 0.12, 1.5)
  }

  private handleVisibility = (): void => {
    this.running = !document.hidden
    if (this.running) this.clock.getDelta() // discard the gap
  }

  private updateIntro(): void {
    if (this.reducedMotion) return

    const scan = THREE.MathUtils.clamp((this.elapsed - SCAN_DELAY) / SCAN_DURATION, 0, 1)
    const eased = easeOutCubic(scan)
    this.wireMaterial.uniforms.uScan.value = eased * 1.05

    const reveal = THREE.MathUtils.clamp((this.elapsed - REVEAL_START) / REVEAL_DURATION, 0, 1)
    this.surfaceMaterial.uniforms.uReveal.value = easeOutCubic(reveal)

    this.options.onProgress?.(scan)

    // once the surface is there, drop the wireframe back to a ghost
    const settle = THREE.MathUtils.clamp((this.elapsed - (REVEAL_START + REVEAL_DURATION)) / 1.3, 0, 1)
    this.wireMaterial.uniforms.uGhost.value = THREE.MathUtils.lerp(0.34, 0.05, settle)
    this.wireMaterial.uniforms.uOpacity.value = THREE.MathUtils.lerp(1, 0.45, settle)
    this.dust.opacity = THREE.MathUtils.clamp((this.elapsed - 1.2) / 1.8, 0, 1) * 0.34

    if (!this.introDone && reveal >= 1) {
      this.introDone = true
      this.butterfly.enable()
      this.options.onIntroComplete?.()
    }
  }

  private updatePointer(): void {
    this.raycaster.setFromCamera(this.pointer, this.camera)
    if (this.raycaster.ray.intersectPlane(this.spawnPlane, this.tmp)) {
      // spawn in branch-group local space so particles inherit the parallax
      this.branchGroup.worldToLocal(this.tmp)
      this.pointerWorld.copy(this.tmp)
    }

    if (this.reducedMotion || !this.pointerInside) return

    const travelled = this.pointerWorld.distanceTo(this.lastSpawn)
    if (travelled > 0.012) {
      const amount = THREE.MathUtils.clamp(Math.round(travelled * 26), 1, 6)
      this.pointerParticles.spawn(this.pointerWorld, amount, 0.05, 0.3 + travelled * 1.5)
      this.lastSpawn.copy(this.pointerWorld)
    }

    // startle the butterfly when the pointer ray passes close to it
    if (this.butterfly.isPerched) {
      this.butterfly.group.getWorldPosition(this.tmp)
      if (this.raycaster.ray.distanceToPoint(this.tmp) < 0.5) {
        this.butterfly.startle()
      }
    }

    if (this.butterfly.isFleeing) {
      this.pointerParticles.spawn(this.butterfly.position, 1, 0.03, 0.22)
    }
  }

  private updateParallax(delta: number): void {
    const damp = 1 - Math.pow(0.0015, delta)
    const px = this.reducedMotion ? 0 : this.pointer.x
    const py = this.reducedMotion ? 0 : this.pointer.y

    this.cameraTarget.set(
      this.cameraBase.x + px * 0.95,
      this.cameraBase.y + py * 0.55,
      this.cameraBase.z,
    )
    this.camera.position.lerp(this.cameraTarget, damp)
    this.camera.lookAt(this.lookAt)

    // counter-rotating the subject against the camera deepens the parallax
    this.branchGroup.rotation.y += (px * 0.14 - this.branchGroup.rotation.y) * damp
    this.branchGroup.rotation.x += (-py * 0.08 - this.branchGroup.rotation.x) * damp
    this.dustGroup.rotation.y = this.branchGroup.rotation.y * 2.4
    this.dustGroup.rotation.x = this.branchGroup.rotation.x * 2.4
  }

  private tick = (): void => {
    this.frame = requestAnimationFrame(this.tick)
    // generous cap: on a slow device the intro should still run close to real time
    const delta = Math.min(this.clock.getDelta(), 0.1)
    if (!this.running || !this.visible) return

    this.elapsed += delta

    this.wireMaterial.uniforms.uTime.value = this.elapsed
    this.surfaceMaterial.uniforms.uTime.value = this.elapsed

    this.updateIntro()
    this.updatePointer()
    this.updateParallax(delta)
    this.butterfly.update(delta, this.elapsed)
    this.drifters.update(delta, this.elapsed, this.surfaceMaterial.uniforms.uReveal.value)
    this.pointerParticles.update(delta)
    this.dust.update(this.elapsed)

    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    cancelAnimationFrame(this.frame)
    this.resizeObserver.disconnect()
    this.intersectionObserver.disconnect()
    window.removeEventListener('pointermove', this.handlePointerMove)
    window.removeEventListener('pointerdown', this.handlePointerDown)
    document.removeEventListener('visibilitychange', this.handleVisibility)

    this.wire.geometry.dispose()
    this.surface.geometry.dispose()
    this.wireMaterial.dispose()
    this.surfaceMaterial.dispose()
    this.butterfly.dispose()
    this.drifters.dispose()
    this.pointerParticles.dispose()
    this.dust.dispose()
    this.renderer.dispose()
  }
}