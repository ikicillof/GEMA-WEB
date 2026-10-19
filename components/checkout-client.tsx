'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { Building2, Check, Home, MessageCircle, Truck } from 'lucide-react'
import {
  CP_REGEX, DATOS_ENVIO_VACIOS, PROVINCIAS, mensajeWhatsApp, plazoTexto,
  type DatosEnvio, type ItemPedido, type Modalidad, type OpcionEnvio, type ResumenCheckout, type Sucursal,
} from '@/lib/envio'
import { formatPrice } from '@/lib/products'
import { useAuth } from './auth-provider'
import { useCart } from './cart-context'
import { easeInOutSine, getLenis } from './smooth-scroll'

type Errores = Partial<Record<keyof DatosEnvio, string>>

// Cómo se nombra cada campo en el mensaje de "falta completar".
const ETIQUETAS: Record<keyof DatosEnvio, string> = { nombre: 'nombre y apellido', dni: 'DNI', telefono: 'teléfono', email: 'email', calle: 'calle', numero: 'número', piso: 'piso', localidad: 'localidad', provincia: 'provincia', cp: 'código postal' }

function validar(d: DatosEnvio): Errores {
  const e: Errores = {}
  if (d.nombre.trim().length < 2) e.nombre = 'Ingresá tu nombre completo'
  if (!/^\d{7,8}$/.test(d.dni)) e.dni = 'El DNI son 7 u 8 números, sin puntos'
  if (!/^[0-9+()\-\s]{8,20}$/.test(d.telefono)) e.telefono = 'Ingresá un teléfono válido'
  if (!/^\S+@\S+\.\S+$/.test(d.email.trim())) e.email = 'Ingresá un email válido'
  if (!d.calle.trim()) e.calle = 'Ingresá la calle'
  if (!/^[0-9A-Za-z\s/-]{1,10}$/.test(d.numero)) e.numero = 'Ingresá el número'
  if (d.localidad.trim().length < 2) e.localidad = 'Ingresá la localidad'
  if (!d.provincia) e.provincia = 'Elegí la provincia'
  if (!CP_REGEX.test(d.cp)) e.cp = 'El código postal son 4 números'
  return e
}

export function CheckoutClient() {
  const { sesion, cargando, abrirLogin, llamar } = useAuth()
  const { items } = useCart()
  const [datos, setDatos] = useState<DatosEnvio>(DATOS_ENVIO_VACIOS)
  const [intento, setIntento] = useState(false)
  const [opciones, setOpciones] = useState<OpcionEnvio[] | null>(null)
  const [cotizando, setCotizando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [simulado, setSimulado] = useState(false)
  const [modalidad, setModalidad] = useState<Modalidad | null>(null)
  const [sucursales, setSucursales] = useState<Sucursal[] | null>(null)
  const [sucursal, setSucursal] = useState<string | null>(null)
  const [resumen, setResumen] = useState<ResumenCheckout | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)
  const pidioLogin = useRef(false)

  const uid = sesion?.user.uid ?? null
  const pedido = useMemo<ItemPedido[]>(() => items.map(i => ({ slug: i.slug, color: i.color, cantidad: i.quantity })), [items])
  const clavePedido = JSON.stringify(pedido)
  const errores = validar(datos)
  const formValido = Object.keys(errores).length === 0
  const cpListo = CP_REGEX.test(datos.cp) && !!datos.provincia
  const envioElegido = !!resumen?.envio && (modalidad !== 'sucursal' || !!sucursal)
  const completo = formValido && envioElegido

  // --- Botón "Guardar y continuar": con datos incompletos rebota al tocarlo y marca lo que falta ---
  const botonRef = useRef<HTMLButtonElement>(null)
  const entorno = useRef({ reducido: false })

  useEffect(() => {
    entorno.current = { reducido: window.matchMedia('(prefers-reduced-motion: reduce)').matches }
    return () => { if (botonRef.current) gsap.killTweensOf(botonRef.current) }
  }, [])

  // Con todo completo el botón se queda quieto y funciona normal.
  useEffect(() => {
    if (!completo) return
    if (botonRef.current) { gsap.killTweensOf(botonRef.current); gsap.to(botonRef.current, { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, duration: 0.3 }) }
  }, [completo])

  // Los datos válidos se guardan solos en la cuenta (sin mensajes), así no se pierden aunque el envío tenga que coordinarse por WhatsApp.
  useEffect(() => {
    if (!uid || !formValido) return
    const t = setTimeout(() => { llamar('/api/cuenta/envio', { method: 'PUT', body: JSON.stringify(datos) }).catch(() => {}) }, 1500)
    return () => clearTimeout(t)
  }, [uid, formValido, datos, llamar])

  // Sin sesión: se abre el login (y al ingresar se vuelve acá con el carrito intacto).
  useEffect(() => {
    if (cargando || sesion || pidioLogin.current) return
    pidioLogin.current = true
    abrirLogin('ingresar', '/checkout')
  }, [cargando, sesion, abrirLogin])

  // Datos guardados en la cuenta (y email de la cuenta precargado).
  useEffect(() => {
    if (!uid) return
    let cancelado = false
    llamar('/api/cuenta/envio').then(r => (r.ok ? r.json() : null)).then((d: { datos: DatosEnvio | null; emailCuenta: string } | null) => {
      if (cancelado || !d) return
      setDatos({ ...DATOS_ENVIO_VACIOS, email: d.emailCuenta, nombre: sesion?.user.displayName ?? '', ...(d.datos ?? {}) })
    }).catch(() => {})
    return () => { cancelado = true }
  }, [uid, llamar]) // eslint-disable-line react-hooks/exhaustive-deps

  // Cotización al tener código postal y provincia. Cambiar de código o de carrito reinicia la elección.
  useEffect(() => {
    setOpciones(null); setModalidad(null); setSucursal(null); setSucursales(null); setErrorEnvio(null); setMensaje(null)
    if (!uid || !cpListo || !pedido.length) return
    let cancelado = false
    setCotizando(true)
    const t = setTimeout(async () => {
      try {
        const res = await llamar('/api/envio/cotizar', { method: 'POST', body: JSON.stringify({ cp: datos.cp, items: pedido }) })
        const cuerpo = await res.json().catch(() => ({}))
        if (cancelado) return
        if (res.ok) { setOpciones(cuerpo.opciones); setSimulado(!!cuerpo.simulado) }
        else setErrorEnvio(cuerpo.error || 'No pudimos cotizar el envío en este momento.')
      } catch {
        if (!cancelado) setErrorEnvio('No pudimos cotizar el envío en este momento.')
      }
      if (!cancelado) setCotizando(false)
    }, 450)
    return () => { cancelado = true; clearTimeout(t); setCotizando(false) }
  }, [uid, cpListo, datos.cp, datos.provincia, clavePedido, llamar]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sucursales cercanas, solo si eligió retirar en sucursal.
  useEffect(() => {
    if (modalidad !== 'sucursal' || !cpListo) return
    let cancelado = false
    setSucursales(null)
    llamar(`/api/envio/sucursales?provincia=${datos.provincia}&cp=${datos.cp}`).then(async r => {
      const cuerpo = await r.json().catch(() => ({}))
      if (cancelado) return
      if (r.ok) setSucursales(cuerpo.lista)
      else setErrorEnvio(cuerpo.error || 'No pudimos traer las sucursales.')
    }).catch(() => { if (!cancelado) setErrorEnvio('No pudimos traer las sucursales.') })
    return () => { cancelado = true }
  }, [modalidad, cpListo, datos.cp, datos.provincia, llamar])

  // Resumen: todos los montos los calcula el servidor cada vez que cambia algo.
  useEffect(() => {
    if (!uid || !pedido.length) { setResumen(null); return }
    let cancelado = false
    const envio = modalidad && cpListo ? { modalidad, cp: datos.cp, provincia: datos.provincia, ...(modalidad === 'sucursal' && sucursal ? { sucursal } : {}) } : undefined
    llamar('/api/checkout/resumen', { method: 'POST', body: JSON.stringify({ items: pedido, ...(envio ? { envio } : {}) }) })
      .then(r => (r.ok ? r.json() : null)).then((r: ResumenCheckout | null) => { if (!cancelado && r) setResumen(r) }).catch(() => {})
    return () => { cancelado = true }
  }, [uid, clavePedido, modalidad, sucursal, datos.cp, datos.provincia, cpListo, llamar]) // eslint-disable-line react-hooks/exhaustive-deps

  const cambiar = (campo: keyof DatosEnvio) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const valor = campo === 'cp' || campo === 'dni' ? e.target.value.replace(/\D/g, '').slice(0, campo === 'cp' ? 4 : 8) : e.target.value
    setDatos(d => ({ ...d, [campo]: valor }))
    setMensaje(null)
  }

  const faltantes = () => {
    const campos = Object.keys(errores) as (keyof DatosEnvio)[]
    const lista = campos.map(c => ETIQUETAS[c])
    if (!envioElegido) lista.push(modalidad === 'sucursal' && !sucursal ? 'la sucursal de retiro' : 'la modalidad de envío')
    return { campos, lista }
  }

  // Marca en rojo lo que falta, lo dice con palabras y lleva (scroll suave + foco) al primer campo.
  const marcarFaltantes = () => {
    const { campos, lista } = faltantes()
    setIntento(true)
    setMensaje({ ok: false, texto: `Falta completar: ${lista.join(', ')}.` })
    const destino = document.querySelector<HTMLElement>(campos.length ? `[data-campo="${campos[0]}"]` : '#checkout-envio')
    if (!destino) return
    const lenis = getLenis()
    if (lenis && !entorno.current.reducido) lenis.scrollTo(destino, { offset: -150, duration: 1.1, easing: easeInOutSine })
    else destino.scrollIntoView({ behavior: entorno.current.reducido ? 'auto' : 'smooth', block: 'center' })
    destino.querySelector<HTMLElement>('input, select')?.focus({ preventScroll: true })
  }

  // Rebote de gomita en su lugar (se aplasta, se estira y vuelve) más una sacudida corta. No se mueve de sitio.
  const rebotar = () => {
    const b = botonRef.current
    if (!b || entorno.current.reducido) return
    gsap.killTweensOf(b)
    gsap.timeline()
      .set(b, { x: 0, y: 0, rotation: 0 })
      .to(b, { scaleX: 1.2, scaleY: 0.8, duration: 0.09, ease: 'power2.out' })
      .to(b, { scaleX: 1, scaleY: 1, duration: 0.8, ease: 'elastic.out(1.1, 0.35)' })
      .to(b, { keyframes: [{ x: -10, rotation: -3, duration: 0.07 }, { x: 9, rotation: 3, duration: 0.07 }, { x: -7, rotation: -2, duration: 0.07 }, { x: 5, rotation: 1.5, duration: 0.07 }, { x: 0, rotation: 0, duration: 0.1 }] }, '<0.05')
  }

  const guardar = async () => {
    setGuardando(true)
    try {
      const res = await llamar('/api/cuenta/envio', { method: 'PUT', body: JSON.stringify(datos) })
      setMensaje(res.ok
        ? { ok: true, texto: 'Listo, guardamos tus datos. El pago (Mercado Pago o transferencia) se habilita en el próximo paso.' }
        : { ok: false, texto: 'No pudimos guardar tus datos. Probá de nuevo.' })
    } catch {
      setMensaje({ ok: false, texto: 'No pudimos guardar tus datos. Revisá tu conexión.' })
    }
    setGuardando(false)
  }

  // Click, toque, Enter o espacio. Incompleto: mouse/táctil rebota; teclado (detail 0) no se mueve y solo lleva el foco.
  const alTocar = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (completo) { void guardar(); return }
    if (e.detail > 0) rebotar()
    marcarFaltantes()
  }

  const campo = (nombre: keyof DatosEnvio, etiqueta: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label data-campo={nombre} className={`checkout-field ${intento && errores[nombre] ? 'checkout-field--error' : ''}`}>
      <span>{etiqueta}</span>
      <input value={datos[nombre]} onChange={cambiar(nombre)} maxLength={nombre === 'email' ? 254 : 80} aria-invalid={intento && !!errores[nombre]} {...extra} />
      {intento && errores[nombre] && <small role="alert">{errores[nombre]}</small>}
    </label>
  )

  if (cargando) return <section className="page-hero"><div className="shell"><p className="eyebrow">Finalizar compra</p><h1 className="page-title">Un momento…</h1></div></section>

  if (!sesion) return <section className="page-hero"><div className="shell">
    <p className="eyebrow">Finalizar compra</p><h1 className="page-title">Ingresá para continuar</h1>
    <p className="page-hero-copy">Necesitamos tu cuenta para guardar tus datos de envío. Tu carrito queda como está.</p>
    <button type="button" className="button button--pink" onClick={() => abrirLogin('ingresar', '/checkout')}>Ingresar</button>
  </div></section>

  if (!items.length) return <section className="page-hero"><div className="shell">
    <p className="eyebrow">Finalizar compra</p><h1 className="page-title">Tu carrito está vacío</h1>
    <Link href="/tienda" className="button button--pink">Ir a la tienda</Link>
  </div></section>

  const lineas = resumen?.lineas ?? items.map(i => ({ ...i }))
  const whatsapp = mensajeWhatsApp(datos.cp, lineas)

  return <section className="checkout">
    <div className="shell">
      <p className="eyebrow">Finalizar compra</p>
      <h1 className="page-title checkout-title">Tus datos y el envío</h1>
      <div className="checkout-grid">
        <div className="checkout-main">
          <div className="checkout-card">
            <h2>Datos de contacto</h2>
            <div className="checkout-fields">
              {campo('nombre', 'Nombre y apellido', { autoComplete: 'name' })}
              {campo('dni', 'DNI', { inputMode: 'numeric', autoComplete: 'off' })}
              {campo('telefono', 'Teléfono', { type: 'tel', autoComplete: 'tel' })}
              {campo('email', 'Email', { type: 'email', autoComplete: 'email' })}
            </div>
          </div>

          <div className="checkout-card">
            <h2>Dirección de entrega</h2>
            <div className="checkout-fields">
              {campo('calle', 'Calle', { autoComplete: 'address-line1' })}
              {campo('numero', 'Número', { autoComplete: 'off', maxLength: 10 })}
              {campo('piso', 'Piso / depto (opcional)', { autoComplete: 'address-line2', maxLength: 20 })}
              {campo('localidad', 'Localidad', { autoComplete: 'address-level2' })}
              <label data-campo="provincia" className={`checkout-field ${intento && errores.provincia ? 'checkout-field--error' : ''}`}>
                <span>Provincia</span>
                <select value={datos.provincia} onChange={cambiar('provincia')} aria-invalid={intento && !!errores.provincia}>
                  <option value="">Elegí una provincia</option>
                  {PROVINCIAS.map(p => <option key={p.codigo} value={p.codigo}>{p.nombre}</option>)}
                </select>
                {intento && errores.provincia && <small role="alert">{errores.provincia}</small>}
              </label>
              {campo('cp', 'Código postal', { inputMode: 'numeric', autoComplete: 'postal-code', maxLength: 4 })}
            </div>
          </div>

          <div id="checkout-envio" className={`checkout-card ${intento && !envioElegido ? 'checkout-card--error' : ''}`}>
            <h2>Envío con Correo Argentino</h2>
            {!cpListo && <p className="checkout-hint">Completá la provincia y el código postal para ver las opciones de envío.</p>}
            {cotizando && <p className="checkout-hint" role="status">Cotizando tu envío…</p>}
            {simulado && opciones && <p className="checkout-sim">Cotización de prueba: todavía no están cargadas las credenciales de Correo Argentino.</p>}
            {opciones && <div className="ship-options" role="radiogroup" aria-label="Modalidad de envío">
              {opciones.map(o => <label key={o.modalidad} className={`ship-option ${modalidad === o.modalidad ? 'ship-option--on' : ''}`}>
                <input type="radio" name="modalidad" checked={modalidad === o.modalidad} onChange={() => { setModalidad(o.modalidad); setSucursal(null) }} />
                <span className="ship-icon" aria-hidden="true">{o.modalidad === 'domicilio' ? <Home size={18} /> : <Building2 size={18} />}</span>
                <span className="ship-text"><b>{o.modalidad === 'domicilio' ? 'A domicilio' : 'A sucursal'}</b><small>{plazoTexto(o.plazoMin, o.plazoMax)}</small></span>
                <strong>{formatPrice(o.precio)}</strong>
              </label>)}
            </div>}
            {modalidad === 'sucursal' && <div className="branches">
              <h3>Sucursales cerca del {datos.cp}</h3>
              {!sucursales && !errorEnvio && <p className="checkout-hint" role="status">Buscando sucursales…</p>}
              {sucursales?.length === 0 && <p className="checkout-hint">No encontramos sucursales para ese código postal. Probá a domicilio o coordinemos por WhatsApp.</p>}
              {sucursales?.map(s => <label key={s.codigo} className={`branch ${sucursal === s.codigo ? 'branch--on' : ''}`}>
                <input type="radio" name="sucursal" checked={sucursal === s.codigo} onChange={() => setSucursal(s.codigo)} />
                <span><b>{s.nombre}</b><small>{s.direccion}{s.localidad ? ` · ${s.localidad}` : ''}{s.cp ? ` (CP ${s.cp})` : ''}</small></span>
              </label>)}
            </div>}
            {errorEnvio && <div className="checkout-fallback" role="alert">
              <p>{errorEnvio}</p>
              <a className="button button--dark" href={whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> Coordinar el envío por WhatsApp</a>
            </div>}
          </div>
        </div>

        <aside className="checkout-summary" aria-label="Resumen del pedido">
          <h2>Resumen</h2>
          <div className="summary-lines">
            {lineas.map(l => <div key={l.id} className="summary-line">
              <div className="summary-img">{l.image && <Image src={l.image} alt="" fill unoptimized sizes="56px" />}</div>
              <div><b>{l.name}</b><small>{l.color} · x{l.quantity}</small></div>
              <strong>{formatPrice(l.price * l.quantity)}</strong>
            </div>)}
          </div>
          <dl className="summary-totals">
            <div><dt>Subtotal</dt><dd>{resumen ? formatPrice(resumen.subtotal) : '…'}</dd></div>
            <div><dt><Truck size={14} /> Envío</dt><dd>{resumen?.envio ? formatPrice(resumen.envio.precio) : modalidad ? '…' : 'Elegí una opción'}</dd></div>
          </dl>
          {resumen && <div className="pay-compare">
            <div className="pay-card pay-card--transfer">
              <span className="pay-tag">{resumen.transferencia.descuentoPct}% OFF</span>
              <p>Transferencia</p>
              <strong>{formatPrice(resumen.transferencia.total)}</strong>
              <small>Ahorrás {formatPrice(resumen.transferencia.descuento)} en productos</small>
            </div>
            <div className="pay-card">
              <p>Mercado Pago</p>
              <strong>{formatPrice(resumen.mercadoPago.total)}</strong>
              <small>Tarjetas y otros medios</small>
            </div>
          </div>}
          <div className="save-zone">
            <button ref={botonRef} type="button" className="button button--pink checkout-save" onClick={alTocar} disabled={guardando}
              aria-label={completo ? undefined : 'Completá los datos obligatorios para continuar'}>
              {guardando ? 'Guardando…' : <>Guardar y continuar <Check size={16} /></>}
            </button>
          </div>
          {mensaje && <p className={mensaje.ok ? 'auth-ok' : 'auth-error'} role={mensaje.ok ? 'status' : 'alert'}>{mensaje.texto}</p>}
          <p className="drawer-note">Los montos se calculan en nuestro servidor con los precios vigentes.</p>
        </aside>
      </div>
    </div>
  </section>
}
