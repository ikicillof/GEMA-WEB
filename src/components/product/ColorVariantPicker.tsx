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
        <input
          key={color.name}
          type="radio"
          name="color"
          role="radio"
          checked={selected.name === color.name}
          aria-checked={selected.name === color.name}
          aria-label={color.available ? color.name : `${color.name} (no disponible)`}
          onChange={() => onSelect(color)}
          className={`h-8 w-8 appearance-none rounded-full border-2 ${
            selected.name === color.name ? 'border-primary' : 'border-text/30'
          } ${color.available ? '' : 'opacity-40'}`}
          style={{ backgroundColor: color.hex }}
        />
      ))}
    </div>
  )
}
