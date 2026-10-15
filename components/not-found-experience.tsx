'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { pageOrigin } from '@/lib/page-origin'
import { GemiSidekick } from './gemi-sidekick'

const NotFoundScene = dynamic(() => import('./not-found-scene'), { ssr: false })

export function NotFoundExperience() {
  const open = useRef(0) // 0 cerrada → 1 abierta; la lee la escena 3D en cada cuadro
  const run = useRef(0) // token: cada escena nueva invalida a la anterior
  const cfg = useRef({ reduced: false, mobile: false })
  const router = useRouter()
  const dolly = useRef(0) // 0 → 1: la cámara avanza y atraviesa la puerta (la lee la escena 3D)
  const leaving = useRef(false)
  const anchorRef = useRef<HTMLDivElement>(null)
  const flyRef = useRef<HTMLSpanElement>(null)
  const bodyRef = useRef<HTMLSpanElement>(null)
  const doorReady = useRef<{ promise: Promise<void>; resolve: () => void }>()
  if (!doorReady.current) { let resolve!: () => void; const promise = new Promise<void>(r => { resolve = r }); doorReady.current = { promise, resolve } }
  const [ready, setReady] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [reduced, setReduced] = useState(false)
  const [mood, setMood] = useState<'neutral' | 'surprised'>('neutral')
  const [bubble, setBubble] = useState(false)
  const [color, setColor] = useState('#FF4DA6')
  const onReady = useCallback(() => doorReady.current?.resolve(), [])

  const sleep = (ms: number, token: number) => new Promise<boolean>(resolve => setTimeout(() => resolve(run.current === token), ms))
  const tween = (to: number, ms: number, token: number) => new Promise<boolean>(resolve => {
    const from = open.current, t0 = performance.now()
    const step = (now: number) => {
      if (run.current !== token) return resolve(false)
      const t = Math.min(1, (now - t0) / ms), e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
      open.current = from + (to - from) * e
      if (t < 1) requestAnimationFrame(step); else resolve(true)
    }
    requestAnimationFrame(step)
  })
  const look = (x: number, y: number, tilt: number) => {
    const el = bodyRef.current
    if (!el) return
    el.style.setProperty('--look-x', `${x}px`); el.style.setProperty('--look-y', `${y}px`); el.style.setProperty('--tilt', `${tilt}deg`)
  }
  // Mira hacia adentro, después a un lado y al otro, confundido; recién ahí aparece el globito.
  const glances = async (token: number) => {
    setMood('surprised'); look(0, -3, 0)
    if (!await sleep(750, token)) return
    look(-3.5, 0, -9); if (!await sleep(650, token)) return
    look(3.5, 0, 9); if (!await sleep(700, token)) return
    if (!cfg.current.mobile) { look(-2.5, -1, -5); if (!await sleep(500, token)) return }
    look(0, -1, 0); if (!await sleep(350, token)) return
    setBubble(true)
  }
  const replay = async () => {
    if (cfg.current.reduced) return
    const token = ++run.current
    setBubble(false); setMood('neutral'); look(0, 0, 0)
    if (!await tween(0, 800, token) || !await sleep(350, token) || !await tween(1, 1200, token)) return
    await glances(token)
  }

  // Salida: Gemi salta adentro, la cámara avanza por el paso hacia el vacío y la pantalla queda en el grafito con el que
  // arranca el túnel de /tienda. Ese velo vive en <body> (no en React) para tapar el cambio de página hasta que el túnel
  // lo reemplaza, así no hay ningún destello entre una animación y la otra.
  const leave = async () => {
    if (leaving.current) return
    leaving.current = true
    const token = ++run.current
    setBubble(false)
    const veil = document.createElement('div')
    veil.style.cssText = 'position:fixed;inset:0;z-index:1090;background:#0F0F10;opacity:0;pointer-events:all'
    document.body.appendChild(veil)
    flyRef.current?.animate?.([{ transform: 'none', opacity: 1 }, { transform: `translateY(${cfg.current.mobile ? -50 : -80}px) scale(.3)`, opacity: 0 }], { duration: 480, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' })
    if (open.current < 0.95 && !await tween(1, 450, token)) return
    const ms = cfg.current.mobile ? 950 : 1150, t0 = performance.now()
    await new Promise<void>(resolve => {
      const step = (now: number) => {
        const t = Math.min(1, (now - t0) / ms)
        dolly.current = t * t * t // arranca despacio y se precipita hacia adentro
        veil.style.opacity = `${Math.min(1, Math.max(0, (t - 0.72) / 0.22))}`
        if (t < 1) requestAnimationFrame(step); else resolve()
      }
      requestAnimationFrame(step)
    })
    pageOrigin.from404 = true // el túnel de entrada a la tienda se muestra solo viniendo de acá
    router.push('/tienda')
    const until = performance.now() + 2500
    const wait = () => {
      if (document.querySelector('.tunnel-overlay') || performance.now() > until) {
        // Si no hubo túnel (no estaba precargado), el velo se retira suave.
        if (!document.querySelector('.tunnel-overlay')) { veil.style.transition = 'opacity .4s ease'; veil.style.opacity = '0'; window.setTimeout(() => veil.remove(), 450) } else veil.remove()
        return
      }
      requestAnimationFrame(wait)
    }
    requestAnimationFrame(wait)
  }

  useEffect(() => {
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches, isMobile = window.matchMedia('(max-width: 700px)').matches
    cfg.current = { reduced: isReduced, mobile: isMobile }
    setReduced(isReduced); setMobile(isMobile); setReady(true)
    const fly = flyRef.current, corner = document.querySelector<HTMLElement>('.gemi-global')
    const token = ++run.current
    let anim: Animation | undefined
    if (corner) { setColor(corner.style.getPropertyValue('--gemi-fill') || '#FF4DA6') }
    if (isReduced) {
      open.current = 1; setMood('surprised'); setBubble(true)
      if (fly) fly.style.opacity = '1'
      document.body.classList.add('nf-active')
      return () => { document.body.classList.remove('nf-active') }
    }
    // Gemi sale de su esquina (el Gemi fijo, que se esconde) y llega a pararse delante de la puerta.
    const flight = new Promise<void>(resolve => {
      if (!fly || !corner || typeof fly.animate !== 'function') { if (fly) fly.style.opacity = '1'; resolve(); return }
      const a = corner.getBoundingClientRect(), b = fly.getBoundingClientRect()
      const dx = a.left + a.width / 2 - (b.left + b.width / 2), dy = a.top + a.height / 2 - (b.top + b.height / 2), s0 = a.width / b.width
      const arc = isMobile ? 0 : -90
      fly.style.opacity = '1'
      anim = fly.animate([
        { transform: `translate(${dx}px, ${dy}px) scale(${s0}) rotate(0deg)`, offset: 0 },
        { transform: `translate(${dx * 0.42}px, ${dy * 0.42 + arc}px) scale(${(s0 + 1) / 2}) rotate(-12deg)`, offset: 0.55 },
        { transform: 'translate(0, 0) scale(1.06, .92) rotate(4deg)', offset: 0.86 },
        { transform: 'none', offset: 1 },
      ], { duration: isMobile ? 950 : 1250, easing: 'cubic-bezier(.3,.8,.4,1)', fill: 'both' })
      anim.finished.then(() => resolve(), () => resolve())
    })
    document.body.classList.add('nf-active')
    ;(async () => {
      await Promise.all([flight, doorReady.current!.promise])
      if (!await sleep(150, token) || !await tween(1, 1300, token)) return
      await glances(token)
    })()
    return () => { run.current++; anim?.cancel(); document.body.classList.remove('nf-active') }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <section className="nf">
    <div className="nf-fx">{ready && <NotFoundScene open={open} dolly={dolly} anchor={anchorRef} mobile={mobile} still={reduced} onReady={onReady} />}</div>
    <h1 className="nf-sr">Página no encontrada</h1>
    <div className="nf-stage">
      <div ref={anchorRef} className="nf-canvas" />
      <div className="nf-slot">
        <button type="button" className="nf-gemi" onClick={replay} aria-label="Gemi. Tocalo para repetir la escena">
          <span ref={flyRef} className="nf-gemi-fly"><span ref={bodyRef} className="nf-gemi-body"><GemiSidekick tone="pink" mood={mood} customColor={color} /></span></span>
        </button>
        {bubble && <span className="nf-bubble-wrap"><span className="nf-bubble" role="status">Este rincón todavía no existe</span></span>}
      </div>
    </div>
    <div className="nf-actions"><Link href="/tienda" className="button button--dark" onClick={event => { if (reduced || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return; event.preventDefault(); void leave() }}>Volver a la tienda</Link></div>
  </section>
}
