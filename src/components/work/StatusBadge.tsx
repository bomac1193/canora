import { cn } from '@/lib/utils'
import { WorkStatus } from '@prisma/client'

interface StatusBadgeProps {
  status: WorkStatus
  size?: 'sm' | 'md' | 'lg'
}

const statusConfig: Record<WorkStatus, { label: string; className: string }> = {
  JAM: {
    label: 'JAM',
    className: 'bg-jam text-[#F6F2EA]',
  },
  PLATE: {
    label: 'PLATE',
    className: 'bg-plate text-[#F6F2EA]',
  },
  CANON: {
    label: 'CANON',
    className: 'bg-canon text-[#F6F2EA]',
  },
}

const sizeConfig = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-3 py-1 text-xs',
  lg: 'px-4 py-1.5 text-sm',
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = statusConfig[status]

  return (
    <span
      className={cn(
        'inline-flex items-center font-mono font-medium tracking-wider',
        config.className,
        sizeConfig[size]
      )}
    >
      {config.label}
    </span>
  )
}
