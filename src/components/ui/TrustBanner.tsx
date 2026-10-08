import type { ReactNode } from 'react'

export type Tone = 'rest' | 'cool' | 'warm'

const toneClass: Record<Tone, string> = {
  rest: 'bg-rest text-bg',
  cool: 'bg-accent-cool text-bg',
  warm: 'bg-accent-warm text-bg',
}

export function TrustBanner({
  icon,
  label,
  tone,
}: {
  icon: ReactNode
  label: string
  tone: Tone
}) {
  return (
    <li
      className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-[var(--shadow-sticker)] ${toneClass[tone]}`}
    >
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </li>
  )
}
