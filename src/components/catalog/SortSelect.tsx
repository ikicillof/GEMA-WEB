import type { SortOption } from '@/lib/catalog-filters'

export function SortSelect({
  value,
  onChange,
}: {
  value: SortOption
  onChange: (value: SortOption) => void
}) {
  return (
    <select
      aria-label="Ordenar por"
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
      className="rounded-md bg-[#17171A] px-3 py-2 text-sm"
    >
      <option value="price-asc">Precio: menor a mayor</option>
      <option value="price-desc">Precio: mayor a menor</option>
      <option value="name-asc">Nombre: A-Z</option>
    </select>
  )
}
