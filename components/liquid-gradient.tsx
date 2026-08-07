'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  DEFAULT_THEME,
  getThemePreset,
  type ThemeId,
} from '@/lib/theme/color-presets'

const VERTEX_SHADER = `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

/**
 * Framer Liquid Gradient — motion uniforms + 5 palette color stops.
 */
const FRAGMENT_SHADER = `
precision highp float;

uniform vec2 u_res;
uniform float u_time;
uniform float u_scale;
uniform float u_seed;
uniform float u_speed;
uniform float u_amplitude;
uniform float u_frequency;
uniform float u_definition;
uniform float u_bands;
uniform float u_amount;
uniform float u_grain;
uniform vec2 u_mouse;
uniform vec3 u_dark1;
uniform vec3 u_dark2;
uniform vec3 u_light1;
uniform vec3 u_primary;
uniform vec3 u_light2;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = rot * p * 2.02 + 19.7;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  float invScale = mix(1.55, 0.55, clamp(u_scale, 0.0, 1.5));
  vec2 p = (frag * 2.0 - u_res) / min(u_res.x, u_res.y);
  p *= invScale;

  float t = u_time * u_speed * 0.35 + u_seed * 0.0017;

  if (u_mouse.x >= 0.0) {
    vec2 m = (u_mouse * 2.0 - 1.0);
    m.x *= u_res.x / u_res.y;
    m *= invScale;
    float d = length(p - m);
    p += normalize(p - m + 0.0001) * exp(-d * 2.4) * 0.22;
  }

  float freq = max(u_frequency, 0.02) * 8.0;
  float amp = u_amplitude * 4.5;

  vec2 flow = vec2(
    fbm(p * freq + vec2(t * 0.55, t * 0.22)),
    fbm(p * freq + vec2(4.8, 1.6) - vec2(t * 0.38, -t * 0.28))
  ) * amp;

  vec2 r = vec2(
    fbm(p * (freq * 1.35) + flow + vec2(t * 0.25, 0.0)),
    fbm(p * (freq * 1.35) + flow * 0.9 + vec2(2.9, -t * 0.2))
  );

  float field = fbm(p * freq * 0.85 + r * amp * 0.55 + flow * 0.4);

  float phase =
    dot(p + flow * 0.65, vec2(0.52, 0.81)) * u_bands
    + field * (1.2 + u_bands * 0.35)
    + t * (0.4 + u_speed * 0.5);
  float ribbon = abs(sin(phase));
  float defPow = mix(1.2, 6.0, clamp(u_definition / 12.0, 0.0, 1.0));
  float sheen = pow(1.0 - ribbon, defPow);

  float a = clamp(u_amount * 3.2, 0.0, 1.0);
  float f1 = smoothstep(0.05, 0.55, field + flow.x * 0.15);
  float f2 = smoothstep(0.35, 0.95, field);

  vec3 col = mix(u_dark1, u_dark2, f1);
  col = mix(col, u_light1, f2 * a);
  col = mix(col, u_primary, smoothstep(0.45, 1.0, field) * a * 0.9);
  col = mix(col, u_light2, sheen * a * 0.85);

  float g = hash(frag + floor(u_time * 60.0)) - 0.5;
  col += g * u_grain;

  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`

function compile(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn('[liquid] compile failed:', gl.getShaderInfoLog(shader))
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export type LiquidGradientProps = {
  className?: string
  /** Color / liquid palette — defaults to app theme (orange / Meteora). */
  palette?: ThemeId
  seed?: number
  speed?: number
  scale?: number
  amplitude?: number
  frequency?: number
  definition?: number
  bands?: number
  amount?: number
  grain?: number
  interactive?: boolean
  /** @deprecated */
  intensity?: number
}

export function LiquidGradient({
  className,
  palette = DEFAULT_THEME,
  seed,
  speed,
  scale,
  amplitude,
  frequency,
  definition,
  bands,
  amount,
  grain,
  interactive = false,
}: LiquidGradientProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef<{ x: number; y: number } | null>(null)
  const preset = getThemePreset(palette)
  const motion = preset.motion

  const sSeed = seed ?? motion.seed
  const sSpeed = speed ?? motion.speed
  const sScale = scale ?? motion.scale
  const sAmplitude = amplitude ?? motion.amplitude
  const sFrequency = frequency ?? motion.frequency
  const sDefinition = definition ?? motion.definition
  const sBands = bands ?? motion.bands
  const sAmount = amount ?? motion.amount
  const sGrain = grain ?? motion.grain

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const gl = canvas.getContext('webgl', {
      antialias: false,
      alpha: false,
      powerPreference: 'low-power',
    })
    if (!gl) return

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    if (!vs || !fs) return

    const program = gl.createProgram()
    if (!program) return
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[liquid] link failed:', gl.getProgramInfoLog(program))
      return
    }
    gl.useProgram(program)

    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    )
    const aPos = gl.getAttribLocation(program, 'a_pos')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

    const locs = {
      res: gl.getUniformLocation(program, 'u_res'),
      time: gl.getUniformLocation(program, 'u_time'),
      scale: gl.getUniformLocation(program, 'u_scale'),
      seed: gl.getUniformLocation(program, 'u_seed'),
      speed: gl.getUniformLocation(program, 'u_speed'),
      amplitude: gl.getUniformLocation(program, 'u_amplitude'),
      frequency: gl.getUniformLocation(program, 'u_frequency'),
      definition: gl.getUniformLocation(program, 'u_definition'),
      bands: gl.getUniformLocation(program, 'u_bands'),
      amount: gl.getUniformLocation(program, 'u_amount'),
      grain: gl.getUniformLocation(program, 'u_grain'),
      mouse: gl.getUniformLocation(program, 'u_mouse'),
      dark1: gl.getUniformLocation(program, 'u_dark1'),
      dark2: gl.getUniformLocation(program, 'u_dark2'),
      light1: gl.getUniformLocation(program, 'u_light1'),
      primary: gl.getUniformLocation(program, 'u_primary'),
      light2: gl.getUniformLocation(program, 'u_light2'),
    }

    const stops = preset.liquid
    gl.uniform1f(locs.scale, sScale)
    gl.uniform1f(locs.seed, sSeed)
    gl.uniform1f(locs.speed, sSpeed)
    gl.uniform1f(locs.amplitude, sAmplitude)
    gl.uniform1f(locs.frequency, sFrequency)
    gl.uniform1f(locs.definition, sDefinition)
    gl.uniform1f(locs.bands, sBands)
    gl.uniform1f(locs.amount, sAmount)
    gl.uniform1f(locs.grain, sGrain)
    const set3 = (loc: WebGLUniformLocation | null, v: readonly number[]) => {
      gl.uniform3f(loc, v[0], v[1], v[2])
    }
    set3(locs.dark1, stops.dark1)
    set3(locs.dark2, stops.dark2)
    set3(locs.light1, stops.light1)
    set3(locs.primary, stops.primary)
    set3(locs.light2, stops.light2)

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75) * 0.75
      const w = Math.max(1, Math.floor(canvas.clientWidth * dpr))
      const h = Math.max(1, Math.floor(canvas.clientHeight * dpr))
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w
        canvas.height = h
        gl.viewport(0, 0, w, h)
        gl.uniform2f(locs.res, w, h)
      }
    }

    let raf = 0
    let visible = true
    const start = performance.now()
    let smooth = { x: 0.5, y: 0.5 }

    const render = () => {
      resize()
      gl.uniform1f(
        locs.time,
        reduceMotion ? 0 : (performance.now() - start) / 1000,
      )

      if (interactive && mouseRef.current) {
        smooth.x += (mouseRef.current.x - smooth.x) * 0.08
        smooth.y += (mouseRef.current.y - smooth.y) * 0.08
        gl.uniform2f(locs.mouse, smooth.x, 1.0 - smooth.y)
      } else {
        gl.uniform2f(locs.mouse, -1, -1)
      }

      gl.drawArrays(gl.TRIANGLES, 0, 3)
      if (!reduceMotion && visible) raf = requestAnimationFrame(render)
    }
    render()

    const observer = new IntersectionObserver(
      ([entry]) => {
        const nowVisible = entry.isIntersecting
        if (nowVisible && !visible) {
          visible = true
          if (!reduceMotion) raf = requestAnimationFrame(render)
        } else if (!nowVisible) {
          visible = false
          cancelAnimationFrame(raf)
        }
      },
      { rootMargin: '120px' },
    )
    observer.observe(canvas)

    const host = canvas.parentElement ?? canvas
    const onPointer = (e: PointerEvent) => {
      if (!interactive) return
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: (e.clientX - rect.left) / Math.max(rect.width, 1),
        y: (e.clientY - rect.top) / Math.max(rect.height, 1),
      }
    }
    const onLeave = () => {
      mouseRef.current = null
    }
    if (interactive) {
      host.addEventListener('pointermove', onPointer)
      host.addEventListener('pointerleave', onLeave)
    }

    window.addEventListener('resize', resize)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
      window.removeEventListener('resize', resize)
      if (interactive) {
        host.removeEventListener('pointermove', onPointer)
        host.removeEventListener('pointerleave', onLeave)
      }
      gl.deleteProgram(program)
      gl.deleteShader(vs)
      gl.deleteShader(fs)
      gl.deleteBuffer(buffer)
    }
  }, [
    palette,
    sSeed,
    sSpeed,
    sScale,
    sAmplitude,
    sFrequency,
    sDefinition,
    sBands,
    sAmount,
    sGrain,
    interactive,
    palette,
  ])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn(
        'absolute inset-0 h-full w-full pointer-events-none',
        preset.liquidFallback,
        className,
      )}
    />
  )
}
