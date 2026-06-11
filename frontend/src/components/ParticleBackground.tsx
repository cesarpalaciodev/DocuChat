import { useEffect, useRef } from "react"

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
}

const PARTICLE_COUNT = 40
const CONNECTION_DISTANCE = 140
const MOUSE_REPEL_RADIUS = 120
const MOUSE_REPEL_FORCE = 0.6
const SPEED = 0.3

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const mediaQuery = window.matchMedia("(max-width: 1023px)")
    let reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let shouldRender = !mediaQuery.matches && !reducedMotion

    function handleMQ(e: MediaQueryListEvent) {
      shouldRender = !e.matches && !reducedMotion
    }
    function handleRM(e: MediaQueryListEvent) {
      reducedMotion = e.matches
      shouldRender = !mediaQuery.matches && !reducedMotion
    }

    mediaQuery.addEventListener("change", handleMQ)
    const reducedMQ = window.matchMedia("(prefers-reduced-motion: reduce)")
    reducedMQ.addEventListener("change", handleRM)

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let mouseX = -1000
    let mouseY = -1000
    let particles: Particle[] = []
    let animationId = 0

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }

    function init() {
      particles = Array.from({ length: PARTICLE_COUNT }, () => ({
        x: Math.random() * canvas!.width,
        y: Math.random() * canvas!.height,
        vx: (Math.random() - 0.5) * SPEED,
        vy: (Math.random() - 0.5) * SPEED,
        radius: Math.random() * 1.8 + 0.6,
      }))
    }

    function animate() {
      if (!shouldRender) {
        ctx!.clearRect(0, 0, canvas!.width, canvas!.height)
        animationId = requestAnimationFrame(animate)
        return
      }

      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy

        if (p.x < 0 || p.x > canvas!.width) p.vx *= -1
        if (p.y < 0 || p.y > canvas!.height) p.vy *= -1

        const dx = mouseX - p.x
        const dy = mouseY - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < MOUSE_REPEL_RADIUS && dist > 0) {
          const force = ((MOUSE_REPEL_RADIUS - dist) / MOUSE_REPEL_RADIUS) * MOUSE_REPEL_FORCE
          p.vx -= (dx / dist) * force
          p.vy -= (dy / dist) * force
        }
      }

      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < CONNECTION_DISTANCE) {
            const opacity = (1 - dist / CONNECTION_DISTANCE) * 0.03
            ctx!.beginPath()
            ctx!.strokeStyle = `rgba(52,211,153,${opacity})`
            ctx!.lineWidth = 0.5
            ctx!.moveTo(particles[i].x, particles[i].y)
            ctx!.lineTo(particles[j].x, particles[j].y)
            ctx!.stroke()
          }
        }
      }

      for (const p of particles) {
        ctx!.beginPath()
        ctx!.fillStyle = "rgba(52,211,153,0.04)"
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx!.fill()
      }

      animationId = requestAnimationFrame(animate)
    }

    function onMouseMove(e: MouseEvent) {
      mouseX = e.clientX
      mouseY = e.clientY
    }

    function onMouseLeave() {
      mouseX = -1000
      mouseY = -1000
    }

    resize()
    init()
    animationId = requestAnimationFrame(animate)

    window.addEventListener("resize", resize)
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseleave", onMouseLeave)

    return () => {
      mediaQuery.removeEventListener("change", handleMQ)
      reducedMQ.removeEventListener("change", handleRM)
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseleave", onMouseLeave)
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: -1 }}
      aria-hidden="true"
    />
  )
}
