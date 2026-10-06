import { Card } from "@/components/ui/card"

interface ComparisonBoxProps {
  title: string
  source?: string
  children: React.ReactNode
  variant?: "default" | "danger"
  className?: string
}

export default function ComparisonBox({ title, source, children, variant = "default", className = "" }: ComparisonBoxProps) {
  const border = variant === "danger" ? "border-danger-border" : "border-border"
  const bg = variant === "danger" ? "bg-danger-light" : "bg-surface-subtle"

  return (
    <Card className={`overflow-hidden border ${border} shadow-sm ${className}`}>
      <div className="border-b border-border bg-surface-alt px-4 py-2">
        <h4 className="text-body-sm font-semibold text-ink">{title}</h4>
        {source && <p className="text-xs text-ink-tertiary">{source}</p>}
      </div>
      <div className={`p-4 ${bg}`}>{children}</div>
    </Card>
  )
}