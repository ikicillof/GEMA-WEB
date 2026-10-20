/** Campo de formulario del panel: etiqueta arriba, ayuda y error abajo. Envuelve UN solo control (la etiqueta lo nombra). */
export function Campo({ etiqueta, error, ayuda, children }: { etiqueta: string; error?: string; ayuda?: string; children: React.ReactNode }) {
  return <label className={`adm-campo${error ? ' adm-campo--error' : ''}`}>
    <span>{etiqueta}</span>
    {children}
    {ayuda && !error && <small>{ayuda}</small>}
    {error && <small role="alert" style={{ color: 'var(--error)', fontWeight: 600 }}>{error}</small>}
  </label>
}
