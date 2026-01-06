import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {}

export function Separator({ className, ...props }: SeparatorProps) {
  return <hr className={cn('my-4 border-t border-gray-200', className)} {...props} />
}

export default Separator
