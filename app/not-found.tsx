import Link from 'next/link'

export default function NotFound() { return <div className="section"><div className="shell" style={{ textAlign:'center' }}><p className="section-kicker">Ups, este rincón está vacío</p><h1 className="section-title">No encontramos<br /><em>esa página.</em></h1><Link href="/tienda" className="button button--dark" style={{ marginTop:28 }}>Volver a la tienda</Link></div></div> }
