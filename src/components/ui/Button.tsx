import type { ButtonHTMLAttributes } from 'react'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: 'primary' | 'secondary'
}

export function Button({ variant, type = 'button', className = '', ...props }: ButtonProps) {
  const base =
    'rounded-full px-7 py-3.5 font-semibold transition-shadow disabled:opacity-40 disabled:cursor-not-allowed'
  const variantClass =
    variant === 'primary'
      ? 'bg-primary text-text hover:shadow-[var(--shadow-glow-primary)]'
      : 'bg-transparent border-2 border-secondary text-text'

  return <button type={type} className={`${base} ${variantClass} ${className}`} {...props} />
}
