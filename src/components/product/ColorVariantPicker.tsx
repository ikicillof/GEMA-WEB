'use client'

import type { ColorVariant } from '@/types/product'

export function ColorVariantPicker({
  colors,
  selected,
  onSelect,
}: {
  colors: ColorVariant[]
  selected: ColorVariant
  onSelect: (color: ColorVariant) => void
}) {
  return (
    <div role="radiogroup" aria-label="Color" className="flex gap-2">
      {colors.map((color) => (
        <button
          key={color.name}
          type="button"
          role="radio"
          aria-checked={selected.name === color.name}
          aria-label={color.name}
          onClick={() => onSelect(color)}
          className={`h-8 w-8 rounded-full border-2 ${
            selected.name === color.name ? 'border-primary' : 'border-text/30'
          } ${color.available ? '' : 'opacity-40'}`}
          style={{ backgroundColor: color.hex }}
        />
      ))}
    </div>
  )
}
