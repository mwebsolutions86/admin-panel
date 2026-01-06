import * as React from 'react'
import { cn } from '@/lib/utils'

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>
}

export function TooltipTrigger({ children, className, ...props }: any) {
  return (
    <span className={cn('inline-block', className)} {...props}>
      {children}
    </span>
  )
}

export function TooltipContent({ children, className, ...props }: any) {
  return (
    <div role="tooltip" className={cn('p-2 rounded bg-gray-800 text-white text-xs', className)} {...props}>
      {children}
    </div>
  )
}

export const Tooltip = TooltipContent

export default Tooltip
