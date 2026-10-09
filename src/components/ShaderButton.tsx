import {
  useCallback,
  useEffect,
  useRef,
  type ButtonHTMLAttributes,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react'

/**
 * A button with a live GLSL sheen behind the label.
 *
 * The WebGL context is created on first hover or focus and torn down shortly
 * after the pointer leaves, so a page full of these never holds more than one
 * or two contexts at a time. Coarse pointers and WebGL-less browsers fall back
 * to the CSS sweep in `.btn-fallback`, which looks close enough.
 */

const vertexSource = `
  attribute vec2 aPos;
  void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`

const fragmentSource = `
  precision highp float;
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uActive;
  uniform vec2 uMouse;
  uniform vec3 uWarm;
  uniform vec3 uCool;

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
      p *= 2.03;
      amp *= 0.5;
    }
    return value;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / uRes;
    float ratio = uRes.x / max(uRes.y, 1.0);
    vec2 p = vec2(uv.x * ratio, uv.y);

    // Liquid metal: warp the noise field with more noise so the flow curls
    // instead of drifting, then read it through a repeating ramp. The hard
    // edges of that ramp are what make it look poured rather than painted.
    float warp = fbm(p * 2.0 + vec2(uTime * 0.15, uTime * -0.06));
    float flow = fbm(p * 2.6 + warp * 1.9 + vec2(uTime * 0.09, 0.0));

    float bands = fract(flow * 2.6 + uTime * 0.04);
    float spec = smoothstep(0.40, 0.50, bands) - smoothstep(0.50, 0.63, bands);

    // a single highlight sweeping across the face
    float head = fract(uTime * 0.22) * 1.6 - 0.3;
    float sweep = exp(-pow((uv.x - head) * 3.2, 2.0));

    // bloom under the cursor, as if the metal catches the light there
    float glow = exp(-length((uv - uMouse) * vec2(ratio, 1.0)) * 4.6);

    // soften against the button edges
    float edge = min(min(uv.x, 1.0 - uv.x), min(uv.y, 1.0 - uv.y));
    float mask = smoothstep(0.0, 0.07, edge);

    // On a cream page the metal only reads if the troughs go dark, so the
    // ramp runs from bronze up to a hot highlight rather than gold-on-gold.
    // The chip underneath is near-black, so the ramp can run its full range:
    // bronze in the troughs, hot champagne on the crests.
    vec3 colour = mix(uWarm, uCool, smoothstep(0.14, 0.92, flow));
    colour += vec3(1.0, 0.9, 0.68) * spec * 1.05;
    colour += uCool * (sweep * 0.4 + glow * 0.7);

    float alpha = clamp(
      0.32 + flow * 0.3 + spec * 0.6 + sweep * 0.28 + glow * 0.42,
      0.0,
      0.96
    );

    // Quieten the band the label sits in. The veins stay strong top and bottom,
    // so the chip still reads as metal without competing with the words.
    float lane = exp(-pow((uv.y - 0.5) * 2.9, 2.0));
    alpha *= 1.0 - lane * 0.5;

    gl_FragColor = vec4(colour, alpha * mask * uActive);
  }
`

interface Ctx {
  gl: WebGLRenderingContext
  program: WebGLProgram
  buffer: WebGLBuffer
  uniforms: {
    uRes: WebGLUniformLocation | null
    uTime: WebGLUniformLocation | null
    uActive: WebGLUniformLocation | null
    uMouse: WebGLUniformLocation | null
    uWarm: WebGLUniformLocation | null
    uCool: WebGLUniformLocation | null
  }
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[ShaderButton] shader failed to compile', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export interface ShaderButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  tone?: 'gold' | 'quiet'
  full?: boolean
}

export function ShaderButton({
  children,
  tone = 'gold',
  full = false,
  className = '',
  ...rest
}: ShaderButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const ctxRef = useRef<Ctx | null>(null)
  const frameRef = useRef(0)
  const startRef = useRef(0)
  const activeRef = useRef(0)
  const targetRef = useRef(0)
  const mouseRef = useRef<[number, number]>([0.5, 0.5])
  const teardownRef = useRef(0)

  const destroy = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = 0
    const ctx = ctxRef.current
    if (!ctx) return
    ctx.gl.deleteBuffer(ctx.buffer)
    ctx.gl.deleteProgram(ctx.program)
    ctx.gl.getExtension('WEBGL_lose_context')?.loseContext()
    ctxRef.current = null
  }, [])

  const render = useCallback(() => {
    const ctx = ctxRef.current
    const canvas = canvasRef.current
    const button = buttonRef.current
    if (!ctx || !canvas || !button) return

    const { gl, uniforms } = ctx
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const width = Math.max(1, Math.round(button.clientWidth * dpr))
    const height = Math.max(1, Math.round(button.clientHeight * dpr))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
    gl.viewport(0, 0, width, height)

    activeRef.current += (targetRef.current - activeRef.current) * 0.12
    const time = (performance.now() - startRef.current) / 1000

    gl.uniform2f(uniforms.uRes, width, height)
    gl.uniform1f(uniforms.uTime, time)
    gl.uniform1f(uniforms.uActive, activeRef.current)
    gl.uniform2f(uniforms.uMouse, mouseRef.current[0], mouseRef.current[1])

    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLES, 0, 6)

    if (activeRef.current < 0.004 && targetRef.current === 0) {
      destroy()
      return
    }
    frameRef.current = requestAnimationFrame(render)
  }, [destroy])

  const activate = useCallback(() => {
    window.clearTimeout(teardownRef.current)
    targetRef.current = 1

    if (ctxRef.current) {
      if (!frameRef.current) frameRef.current = requestAnimationFrame(render)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    if (window.matchMedia('(hover: none)').matches) return

    const gl = canvas.getContext('webgl', {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    })
    if (!gl) return

    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource)
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource)
    const program = gl.createProgram()
    if (!vertex || !fragment || !program) return

    gl.attachShader(program, vertex)
    gl.attachShader(program, fragment)
    gl.linkProgram(program)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[ShaderButton] program failed to link', gl.getProgramInfoLog(program))
      return
    }

    gl.useProgram(program)

    const buffer = gl.createBuffer()
    if (!buffer) return
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW,
    )
    const location = gl.getAttribLocation(program, 'aPos')
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0)

    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    const uniforms = {
      uRes: gl.getUniformLocation(program, 'uRes'),
      uTime: gl.getUniformLocation(program, 'uTime'),
      uActive: gl.getUniformLocation(program, 'uActive'),
      uMouse: gl.getUniformLocation(program, 'uMouse'),
      uWarm: gl.getUniformLocation(program, 'uWarm'),
      uCool: gl.getUniformLocation(program, 'uCool'),
    }

    // on a cream page the sheen has to darken to be seen, so the "warm" colour
    // is the deep logo gold and the bloom under the cursor is the bright honey
    // deep gold in the troughs, the logo's highlight gold on the crests
    // troughs in bronze, crests in the logo's champagne gold
    const warm = tone === 'gold' ? [0.36, 0.21, 0.05] : [0.42, 0.35, 0.26]
    const cool = tone === 'gold' ? [0.96, 0.8, 0.46] : [0.88, 0.83, 0.74]
    gl.uniform3f(uniforms.uWarm, warm[0], warm[1], warm[2])
    gl.uniform3f(uniforms.uCool, cool[0], cool[1], cool[2])

    ctxRef.current = { gl, program, buffer, uniforms }
    startRef.current = performance.now()
    frameRef.current = requestAnimationFrame(render)
  }, [render, tone])

  const deactivate = useCallback(() => {
    targetRef.current = 0
    window.clearTimeout(teardownRef.current)
    teardownRef.current = window.setTimeout(destroy, 1400)
  }, [destroy])

  const trackPointer = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    mouseRef.current = [
      (event.clientX - rect.left) / rect.width,
      1 - (event.clientY - rect.top) / rect.height,
    ]
  }, [])

  useEffect(
    () => () => {
      window.clearTimeout(teardownRef.current)
      destroy()
    },
    [destroy],
  )

  const base =
    'group relative isolate overflow-hidden border px-7 py-3.5 hud transition-[border-color,color,transform] duration-700 ease-atelier active:translate-y-px'
  const toneClass =
    tone === 'gold'
      ? 'border-noir bg-noir text-porcelain hover:border-gold'
      : 'border-ink/20 text-ink/75 hover:border-ink/50 hover:text-ink'

  return (
    <button
      ref={buttonRef}
      className={`${base} ${toneClass} ${full ? 'w-full' : ''} btn-fallback ${className}`}
      onPointerEnter={activate}
      onPointerMove={trackPointer}
      onPointerLeave={deactivate}
      onFocus={activate}
      onBlur={deactivate}
      {...rest}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 h-full w-full"
      />
      <span
        className="relative z-10"
        style={tone === 'gold' ? { textShadow: '0 1px 6px rgba(26,21,17,0.85)' } : undefined}
      >
        {children}
      </span>
    </button>
  )
}
