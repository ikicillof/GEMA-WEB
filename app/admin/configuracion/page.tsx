'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { Save } from 'lucide-react'
import { Acceso, useAdmin } from '@/components/admin/admin-shell'
import { Campo } from '@/components/admin/campo'
import { Aviso } from '@/components/admin/ui'
import { CargaGemma } from '@/components/carga-gemma'

type Config = { descuentoTransferenciaPct: number; datosTransferencia: { alias: string; titular: string; banco: string }; whatsapp: string; emailAvisos: string; provisorio: boolean }
type Form = { descuento: string; alias: string; titular: string; banco: string; whatsapp: string; email: string }
type Errores = Partial<Record<keyof Form, string>>
const ORDEN: (keyof Form)[] = ['descuento', 'alias', 'titular', 'banco', 'whatsapp', 'email']
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/
const ALIAS_DE_EJEMPLO = 'gemma.tienda.ejemplo'

const aForm = (c: Config): Form => ({ descuento: String(c.descuentoTransferenciaPct).replace('.', ','), alias: c.datosTransferencia.alias, titular: c.datosTransferencia.titular, banco: c.datosTransferencia.banco, whatsapp: c.whatsapp, email: c.emailAvisos })

function validar(f: Form): Errores {
  const e: Errores = {}
  const d = Number(f.descuento.trim().replace(',', '.'))
  if (!f.descuento.trim() || !Number.isFinite(d) || d < 0 || d > 50) e.descuento = 'Ingresá un porcentaje entre 0 y 50.'
  if (!f.alias.trim() || f.alias.trim().length > 60) e.alias = 'Escribí el alias (máximo 60).'
  if (!f.titular.trim() || f.titular.trim().length > 80) e.titular = 'Escribí el nombre del titular.'
  if (!f.banco.trim() || f.banco.trim().length > 80) e.banco = 'Escribí el banco o la billetera.'
  if (!/^\d{10,15}$/.test(f.whatsapp.trim())) e.whatsapp = 'Solo números con código de país, por ejemplo 5491112345678.'
  if (!EMAIL.test(f.email.trim()) || f.email.trim().length > 120) e.email = 'Escribí un email válido.'
  return e
}

function Configuracion() {
  const { api, avisar } = useAdmin()
  const [f, setF] = useState<Form | null>(null)
  const [provisorio, setProvisorio] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errores, setErrores] = useState<Errores>({})
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let cancelado = false
    api<{ configuracion: Config }>('/api/admin/configuracion').then(r => {
      if (cancelado) return
      if (r.ok) { setF(aForm(r.cuerpo.configuracion)); setProvisorio(r.cuerpo.configuracion.provisorio) } else setError(r.cuerpo.error || 'No pudimos cargar la configuración.')
    })
    return () => { cancelado = true }
  }, [api])

  const poner = (k: keyof Form, valor: string) => { setF(p => p && { ...p, [k]: valor }); setErrores(p => (p[k] ? { ...p, [k]: undefined } : p)) }
  const enfocar = (k: string) => { const el = document.getElementById(`cf-${k}`); if (el) { el.scrollIntoView({ block: 'center' }); el.focus() } }

  async function guardar(ev: FormEvent) {
    ev.preventDefault()
    if (!f) return
    setError(null)
    const errs = validar(f)
    setErrores(errs)
    const primero = ORDEN.find(k => errs[k])
    if (primero) { enfocar(primero); return }
    setGuardando(true)
    const r = await api<{ ok: boolean; provisorio: boolean }>('/api/admin/configuracion', { method: 'PUT', body: JSON.stringify({
      descuentoTransferenciaPct: Number(f.descuento.trim().replace(',', '.')),
      datosTransferencia: { alias: f.alias.trim(), titular: f.titular.trim(), banco: f.banco.trim() },
      whatsapp: f.whatsapp.trim(),
      emailAvisos: f.email.trim().toLowerCase(),
    }) })
    setGuardando(false)
    if (!r.ok) { setError(r.cuerpo.error || 'No pudimos guardar la configuración.'); return }
    setProvisorio(r.cuerpo.provisorio)
    avisar(r.cuerpo.provisorio ? 'Guardado. Ojo: el alias sigue siendo el de ejemplo.' : 'Configuración guardada. Se ve en la tienda en menos de un minuto.', r.cuerpo.provisorio)
  }

  return <>
    <div className="adm-head"><div><p className="eyebrow">Panel</p><h1 className="adm-title">Configuración</h1><p className="adm-sub">Ajustes de la tienda: transferencia, WhatsApp y avisos.</p></div></div>
    {error && <Aviso tipo="error">{error}</Aviso>}
    {!f && !error && <CargaGemma mensaje="Abriendo la configuración…" compacta />}
    {f && <form onSubmit={guardar} noValidate>
      {provisorio && <Aviso><b>Datos de ejemplo.</b> Mientras el alias sea «{ALIAS_DE_EJEMPLO}», la página de transferencia les avisa a los clientes que son datos de ejemplo. Al guardar los datos reales el aviso se apaga solo.</Aviso>}

      <div className="adm-card">
        <h2>Transferencia</h2>
        <div className="adm-grid adm-grid--2">
          <Campo etiqueta="Descuento por transferencia (%)" error={errores.descuento} ayuda="Se descuenta del total si el cliente paga por transferencia.">
            <input id="cf-descuento" className="adm-input" inputMode="decimal" value={f.descuento} aria-invalid={!!errores.descuento} onChange={e => poner('descuento', e.target.value)} />
          </Campo>
          <Campo etiqueta="Alias" error={errores.alias}><input id="cf-alias" className="adm-input" autoComplete="off" value={f.alias} maxLength={60} aria-invalid={!!errores.alias} onChange={e => poner('alias', e.target.value)} /></Campo>
          <Campo etiqueta="Titular de la cuenta" error={errores.titular}><input id="cf-titular" className="adm-input" autoComplete="off" value={f.titular} maxLength={80} aria-invalid={!!errores.titular} onChange={e => poner('titular', e.target.value)} /></Campo>
          <Campo etiqueta="Banco o billetera" error={errores.banco}><input id="cf-banco" className="adm-input" autoComplete="off" value={f.banco} maxLength={80} aria-invalid={!!errores.banco} onChange={e => poner('banco', e.target.value)} /></Campo>
        </div>
      </div>

      <div className="adm-card">
        <h2>Contacto y avisos</h2>
        <div className="adm-grid adm-grid--2">
          <Campo etiqueta="WhatsApp" error={errores.whatsapp} ayuda="Para que el cliente mande el comprobante. Solo números, con código de país.">
            <input id="cf-whatsapp" className="adm-input" inputMode="numeric" autoComplete="off" value={f.whatsapp} aria-invalid={!!errores.whatsapp} onChange={e => poner('whatsapp', e.target.value.replace(/[^\d]/g, ''))} />
          </Campo>
          <Campo etiqueta="Email de avisos" error={errores.email} ayuda="Acá llega el aviso de cada venta nueva.">
            <input id="cf-email" className="adm-input" type="email" inputMode="email" autoComplete="off" value={f.email} aria-invalid={!!errores.email} onChange={e => poner('email', e.target.value)} />
          </Campo>
        </div>
      </div>

      <div className="adm-actions" style={{ marginTop: 16 }}>
        <button type="submit" className="button button--pink adm-btn" disabled={guardando}><Save size={16} aria-hidden="true" />{guardando ? 'Guardando…' : 'Guardar configuración'}</button>
      </div>
      <CargaGemma mensaje="Guardando la configuración…" activa={guardando} />
    </form>}
  </>
}

export default function ConfiguracionPage() {
  return <Acceso min="admin"><Configuracion /></Acceso>
}
