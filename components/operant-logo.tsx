import Image from 'next/image'

type OperantLogoProps = {
  size?: number
  className?: string
}

export function OperantLogo({ size = 32, className }: OperantLogoProps) {
  return (
    <span
      className={`relative inline-flex shrink-0 overflow-hidden rounded-lg ${className ?? ''}`}
      style={{ width: size, height: size }}
    >
      <Image
        src="/operant-logo.png"
        alt="Operant"
        fill
        sizes={`${size}px`}
        className="object-contain"
        priority={size >= 40}
      />
    </span>
  )
}
