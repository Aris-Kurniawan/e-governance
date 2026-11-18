import { Link } from "react-router-dom"

interface BreadcrumbItem {
  label: string
  to?: string
}

interface MobileBreadcrumbProps {
  items: BreadcrumbItem[]
}

/**
 * MobileBreadcrumb — tampil hanya di mobile (sm:hidden).
 * Gunakan bersama status bar desktop yang dibungkus hidden sm:block.
 *
 * Contoh:
 *   <MobileBreadcrumb items={[{ label: "Beranda", to: "/" }, { label: "Dashboard" }]} />
 */
export default function MobileBreadcrumb({ items }: MobileBreadcrumbProps) {
  return (
    <div className="block sm:hidden border-b border-slate-200/80 bg-white px-4 py-2.5 text-xs">
      <nav className="flex items-center gap-1.5 text-slate-400 flex-wrap">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-slate-300">/</span>}
            {item.to ? (
              <Link
                to={item.to}
                className="hover:text-slate-600 transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-medium text-slate-700">{item.label}</span>
            )}
          </span>
        ))}
      </nav>
    </div>
  )
}
