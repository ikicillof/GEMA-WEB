import { ClearCartOnMount } from './ClearCartOnMount'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>
}) {
  const { order } = await searchParams
  return (
    <div className="px-4 py-10 md:px-10">
      <h1 className="mb-4 text-2xl font-semibold">¡Gracias por tu compra!</h1>
      <p className="mb-4">
        {order ? `Tu pedido #${order} fue confirmado.` : 'Tu pedido fue confirmado.'} Te vamos a
        mandar un email con los detalles.
      </p>
      <ClearCartOnMount />
    </div>
  )
}
