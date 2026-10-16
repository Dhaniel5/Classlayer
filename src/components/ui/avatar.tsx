import React from 'react'
import { cn } from '@/lib/utils'

export function Avatar({
  initials,
  color = '#334155',
  size = 36,
  className,
}: {
  initials: string
  color?: string
  size?: number
  className?: string
}) {
  return (
    <div
      className={cn('flex items-center justify-center rounded-full font-semibold text-white shrink-0', className)}
      style={{ backgroundColor: color, width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
}
