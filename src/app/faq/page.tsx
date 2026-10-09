const faqs = [
  {
    question: '¿Cómo sé si un producto tiene stock en el color que quiero?',
    answer:
      'En la ficha de producto, los colores que ya no tenés disponibles aparecen atenuados y no se pueden seleccionar.',
  },
  {
    question: '¿Puedo pagar en cuotas?',
    answer: 'Sí, con Mercado Pago podés pagar hasta en 12 cuotas con todas las tarjetas.',
  },
  {
    question: '¿Tengo que crear una cuenta para comprar?',
    answer:
      'No para navegar ni armar tu carrito. Te vamos a pedir que inicies sesión únicamente en el último paso, antes de pagar.',
  },
]

export default function Page() {
  return (
    <div className="px-4 py-10 md:px-10">
      <h1 className="mb-6 text-2xl font-semibold">Preguntas frecuentes</h1>
      <dl>
        {faqs.map((faq) => (
          <div key={faq.question} className="mb-4">
            <dt className="font-semibold">{faq.question}</dt>
            <dd className="text-text/80">{faq.answer}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
