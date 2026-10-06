import { Card } from "@/components/ui/card"

interface KpiCardProps {
  value: string | number
  label: string
  icon?: string
  className?: string
}

export default function KpiCard({ value, label, icon, className = "" }: KpiCardProps) {
  return (
    <Card className={`flex flex-col gap-2 p-6 shadow-sm ${className}`}>
      <div className="flex items-center gap-3">
        {icon && <span className="text-lg">{icon}</span>}
        <span className="text-display font-bold text-ink tabular-nums">{value}</span>
      </div>
      <span className="text-body-sm text-ink-secondary">{label}</span>
    </Card>
  )
}

export function KpiGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 md:grid-cols-4">{children}</div>
}