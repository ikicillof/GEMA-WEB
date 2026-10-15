import type { StoryArt } from '@/lib/about-data'

// Ilustraciones del costado derecho de la historia, una por globo. Formas redondeadas y colores del brand book; cuando no
// hay foto, se usan elementos del universo Gemma (estrellas, gotas, puertas).
const INK = '#171717'
const Star5 = ({ x, y, r, fill, rot = 0 }: { x: number; y: number; r: number; fill: string; rot?: number }) => {
  const pts = Array.from({ length: 10 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / 5, d = i % 2 ? r * 0.5 : r; return `${(x + Math.cos(a) * d).toFixed(1)},${(y + Math.sin(a) * d).toFixed(1)}` }).join(' ')
  return <polygon points={pts} fill={fill} stroke={INK} strokeWidth={3} strokeLinejoin="round" transform={`rotate(${rot} ${x} ${y})`} />
}
const Spark = ({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) => <path d={`M${x} ${y - s}Q${x + s * 0.12} ${y - s * 0.12} ${x + s} ${y}Q${x + s * 0.12} ${y + s * 0.12} ${x} ${y + s}Q${x - s * 0.12} ${y + s * 0.12} ${x - s} ${y}Q${x - s * 0.12} ${y - s * 0.12} ${x} ${y - s}Z`} fill={fill} />
const Drop = ({ x, y, s, fill }: { x: number; y: number; s: number; fill: string }) => <path d={`M${x} ${y - s}C${x + s * 0.2} ${y - s * 0.5} ${x + s * 0.6} ${y - s * 0.1} ${x + s * 0.6} ${y + s * 0.3}A${s * 0.6} ${s * 0.6} 0 0 1 ${x - s * 0.6} ${y + s * 0.3}C${x - s * 0.6} ${y - s * 0.1} ${x - s * 0.2} ${y - s * 0.5} ${x} ${y - s}Z`} fill={fill} stroke={INK} strokeWidth={3} strokeLinejoin="round" />

// a) Gemi, guardiana del color: manchas de la paleta con una estrella y gotas.
function Colores() {
  return <svg viewBox="0 0 400 400" role="img" aria-label="Manchas de colores con una estrella">
    <circle cx="150" cy="170" r="105" fill="#FF4DA6" /><circle cx="250" cy="150" r="95" fill="#FFD93D" /><circle cx="215" cy="255" r="100" fill="#00E6D2" /><circle cx="130" cy="265" r="62" fill="#6D28D9" /><circle cx="300" cy="260" r="48" fill="#FFB4D8" />
    <Star5 x={205} y={205} r={78} fill="#FFFFFF" rot={8} />
    <Drop x={85} y={80} s={34} fill="#00E6D2" /><Drop x={330} y={90} s={26} fill="#FF4DA6" /><Spark x={60} y={330} s={22} fill="#6D28D9" /><Spark x={345} y={340} s={28} fill="#FFD93D" /><Spark x={330} y={185} s={14} fill="#171717" />
  </svg>
}
// b) Un rincón apagado: la misma esquina sin color, con la estrella que le falta en trazo punteado.
function Rincon() {
  return <svg viewBox="0 0 400 400" role="img" aria-label="Un rincón gris, apagado">
    <polygon points="40,60 210,110 210,300 40,250" fill="#D8D2CD" /><polygon points="210,110 370,60 370,250 210,300" fill="#CBC4BF" /><polygon points="40,250 210,300 370,250 210,340" fill="#BDB6B1" />
    <rect x="255" y="150" width="62" height="74" rx="8" fill="#E7E2DE" stroke="#A59E99" strokeWidth="3" />
    <g fill="#A9A29D"><rect x="95" y="220" width="86" height="14" rx="7" /><rect x="128" y="150" width="14" height="72" rx="7" /><path d="M104 150h60l-14-40h-32z" /></g>
    <ellipse cx="294" cy="297" rx="48" ry="9" fill="#9C958F" opacity="0.5" />
    <g fill="#B4ADA8"><rect x="255" y="248" width="34" height="38" rx="8" /><circle cx="261" cy="236" r="14" /><circle cx="282" cy="232" r="12" /></g>
    <path d="M205 20 218 50 250 54 226 76 232 108 205 92 178 108 184 76 160 54 192 50Z" fill="none" stroke="#9C958F" strokeWidth="3" strokeDasharray="4 8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
}
// c) El comienzo (PROVISORIO en el texto): una puerta que se abre a la luz.
function Puerta() {
  return <svg viewBox="0 0 400 400" role="img" aria-label="Una puerta que se abre a la luz">
    <rect x="95" y="50" width="210" height="300" rx="22" fill="#FFB4D8" stroke={INK} strokeWidth="4" />
    <rect x="120" y="76" width="160" height="274" rx="14" fill="#FFF1D9" />
    <ellipse cx="200" cy="230" rx="62" ry="110" fill="#FFD8A8" opacity="0.8" />
    <path d="M120 76 80 100V372L120 350Z" fill="#FF4DA6" stroke={INK} strokeWidth="4" strokeLinejoin="round" /><path d="M280 76 320 100V372L280 350Z" fill="#FF4DA6" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
    <circle cx="100" cy="230" r="7" fill="#FFD93D" stroke={INK} strokeWidth="3" /><circle cx="300" cy="230" r="7" fill="#FFD93D" stroke={INK} strokeWidth="3" />
    <Spark x={200} y={170} s={26} fill="#FFFFFF" /><Spark x={170} y={250} s={14} fill="#FFD93D" /><Spark x={232} y={285} s={18} fill="#FFFFFF" />
    <Star5 x={335} y={95} r={26} fill="#FFD93D" rot={12} /><Drop x={55} y={300} s={28} fill="#00E6D2" />
  </svg>
}
// d) La impresora: marco rosa pastel, detalles violeta y un perro de hilo rosa a medio imprimir.
function Impresora() {
  return <svg viewBox="0 0 400 400" role="img" aria-label="Una impresora 3D imprimiendo un perro globo">
    <ellipse cx="200" cy="360" rx="150" ry="16" fill="#171717" opacity="0.14" />
    <rect x="70" y="300" width="260" height="52" rx="20" fill="#FFB4D8" stroke={INK} strokeWidth="4" /><rect x="205" y="318" width="95" height="14" rx="7" fill="#6D28D9" />
    <rect x="82" y="60" width="26" height="250" rx="12" fill="#FFB4D8" stroke={INK} strokeWidth="4" /><rect x="292" y="60" width="26" height="250" rx="12" fill="#FFB4D8" stroke={INK} strokeWidth="4" />
    <rect x="70" y="52" width="260" height="26" rx="13" fill="#6D28D9" stroke={INK} strokeWidth="4" />
    <rect x="150" y="78" width="70" height="42" rx="12" fill="#6D28D9" stroke={INK} strokeWidth="4" /><path d="M172 120h26l-13 26z" fill="#F4A15D" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
    <rect x="115" y="268" width="170" height="26" rx="12" fill="#FFF3E4" stroke={INK} strokeWidth="4" />
    <g fill="#FF4DA6" stroke={INK} strokeWidth="3.5" strokeLinejoin="round"><rect x="132" y="228" width="30" height="42" rx="14" /><rect x="236" y="228" width="30" height="42" rx="14" /><rect x="150" y="215" width="100" height="32" rx="16" /></g>
    <path d="M150 232h100M146 246h108M140 260h120" stroke="#FFE3F1" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
    <circle cx="62" cy="120" r="46" fill="#6D28D9" stroke={INK} strokeWidth="4" /><circle cx="62" cy="120" r="30" fill="#FF4DA6" /><circle cx="62" cy="120" r="9" fill="#FFB4D8" />
    <path d="M90 92C140 20 170 40 185 120" fill="none" stroke="#FF4DA6" strokeWidth="6" strokeLinecap="round" />
    <Spark x={330} y={140} s={20} fill="#FFD93D" /><Spark x={355} y={190} s={12} fill="#00E6D2" />
  </svg>
}
// e) "Eso es tan Gemma": fotos de piezas del catálogo en tarjetas apiladas, con estrellitas.
function Piezas() {
  const cards = [
    { src: '/productos/pdfimg-007.png', alt: 'Figura Perro Globo', style: { left: '2%', top: '14%', rotate: '-8deg', width: '46%' } },
    { src: '/productos/pdfimg-004.png', alt: 'Estante Goteo', style: { right: '0%', top: '4%', rotate: '6deg', width: '48%' } },
    { src: '/productos/pdfimg-013.png', alt: 'Lámpara Lumalee', style: { left: '28%', bottom: '2%', rotate: '-2deg', width: '46%' } },
  ]
  return <div className="story-photos" role="group" aria-label="Piezas de Gemma">
    {cards.map(c => <div key={c.src} className="story-photo" style={c.style}><img src={c.src} alt={c.alt} loading="lazy" draggable={false} /></div>)}
    <svg className="story-photos-stars" viewBox="0 0 400 400" aria-hidden="true"><Star5 x={52} y={60} r={24} fill="#FFD93D" rot={-10} /><Star5 x={352} y={330} r={20} fill="#FF4DA6" rot={14} /><Spark x={360} y={150} s={16} fill="#6D28D9" /><Spark x={36} y={330} s={18} fill="#00E6D2" /></svg>
  </div>
}

export function StoryIllustration({ art }: { art: StoryArt }) {
  switch (art) {
    case 'colores': return <Colores />
    case 'rincon': return <Rincon />
    case 'puerta': return <Puerta />
    case 'impresora': return <Impresora />
    case 'piezas': return <Piezas />
  }
}
