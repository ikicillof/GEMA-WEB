import { Heart, Palette, Printer } from 'lucide-react'

const pillars = [
  { icon: Heart, title: 'Hecho a pedido', copy: 'Cada pieza empieza cuando la elegís. Así llega a tu casa con intención.' },
  { icon: Printer, title: 'Impreso en 3D', copy: 'Diseño, capas y mucho mimo para crear objetos que no parecen de catálogo.' },
  { icon: Palette, title: 'Elegís el color', copy: 'La paleta es tuya. Encontrá el tono que hace match con tu rincón.' },
]

export function HomeIntro() {
  return <section className="section" id="quienes-somos"><div className="shell"><div className="intro-layout"><div><p className="section-kicker">Qué hacemos</p><h2 className="section-title">Objetos que hacen<br /><em>hogar.</em></h2></div><p className="section-intro">Gemma nace para hacer que cada rincón brille. Diseñamos e imprimimos en 3D objetos con formas, colores y personalidad, pensados para transformar esos espacios cotidianos que mirás todos los días. Cada pieza se hace a pedido y podés elegir el color para que encuentre su lugar en tu casa, tu escritorio o ese rincón que pedía un poquito más de vos.</p></div><div className="pillars">{pillars.map(({ icon: Icon, title, copy }) => <div className="pillar" key={title}><div className="pillar-icon"><Icon size={20} /></div><h3>{title}</h3><p>{copy}</p></div>)}</div></div></section>
}
