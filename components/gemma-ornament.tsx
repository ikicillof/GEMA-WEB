export function GemmaStar({ size = 16, className = '' }: { size?: number; className?: string }) {
  return <svg aria-hidden="true" className={className} width={size} height={size} viewBox="0 0 24 24" fill="none"><path d="M12 1.8c1.7 6 4.2 8.5 10.2 10.2-6 1.7-8.5 4.2-10.2 10.2C10.3 16.2 7.8 13.7 1.8 12 7.8 10.3 10.3 7.8 12 1.8Z" fill="currentColor"/><path d="M19.2 2.4c.35 1.25.95 1.85 2.2 2.2-1.25.35-1.85.95-2.2 2.2-.35-1.25-.95-1.85-2.2-2.2 1.25-.35 1.85-.95 2.2-2.2Z" fill="currentColor" opacity=".75"/></svg>
}
